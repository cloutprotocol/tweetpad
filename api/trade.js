// Solana trading: buy or sell a tweetpad coin on its pump.fun bonding curve, built here with pump.fun's own SDK (buy_exact_quote_in_v3
// / sell_v3), so the only fees are pump.fun's own and the network's. The user's wallet signs and pays. With `jito: true` the
// transaction carries a Jito tip (api/_jito.js) and the page sends it as a bundle: private, and first in the block it lands in.
// A coin that has left its curve (graduated to PumpSwap) answers { graduated: true }, and the page trades it through Jupiter.
// GET  ?mint&side=buy|sell&amount                               → { expected, quote: { symbol, decimals }, decimals }   (a live quote)
// POST { wallet, mint, side, amount, slippage (%), jito }        → { tx (unsigned, base64), expected, minimum, ... }
// Amounts are decimal strings: what you pay for a buy (SOL, or the pair coin), coins for a sell. Returned amounts are base units.
const { PublicKey, TransactionMessage, VersionedTransaction, ComputeBudgetProgram } = require('@solana/web3.js');
const { OnlinePumpSdk, PUMP_SDK, getBuyV3TokenAmountFromQuoteAmount, getSellSolAmountFromTokenAmount } = require('@pump-fun/pump-sdk');
const BN = require('bn.js');
const { tipInstruction } = require('./_jito');
const { cors, readJson, isPubkey, connection, rpc, redis, rateLimit, fail } = require('./_lib');

const TRADE_CU = 150000;   // a curve trade uses ~80k
const CU_PRICE = 200000;   // micro-lamports per CU: about 0.00003 SOL priority fee
const SOL_MINT = 'So11111111111111111111111111111111111111112';

/* "0.25" → base units, without going through floating point */
function toUnits(s, decimals) {
  const m = new RegExp('^(\\d{1,12})(?:\\.(\\d{1,' + decimals + '}))?$').exec(String(s || '').trim());
  return m ? new BN(m[1] + (m[2] || '').padEnd(decimals, '0')) : null;
}
const percentOff = (bn, pct) => bn.muln(10000 - Math.round(pct * 100)).divn(10000);

/* everything a trade on this coin needs to know, from one round of reads */
async function curveState(mint, user, side) {
  const conn = connection(), sdk = new OnlinePumpSdk(conn), mintPk = new PublicKey(mint);
  const info = await conn.getAccountInfo(mintPk);
  if (!info) throw Object.assign(new Error('coin not found'), { status: 404 });
  const tokenProgram = info.owner;
  const [global, feeConfig, state] = await Promise.all([sdk.fetchGlobal(), sdk.fetchFeeConfig(),
    (side === 'buy' ? sdk.fetchBuyState(mintPk, user, tokenProgram) : sdk.fetchSellState(mintPk, user, tokenProgram))
      .catch((err) => { throw Object.assign(new Error(/token account not found/i.test(err.message) ? 'you hold none of this coin' : 'this coin has no pump.fun curve'), { status: 400 }); })]);
  const quoteMint = state.bondingCurve.quoteMint && state.bondingCurve.quoteMint.toBase58();
  const sol = !quoteMint || quoteMint === SOL_MINT || quoteMint === PublicKey.default.toBase58();
  /* the pair: SOL, or a coin launched on tweetpad (crafting); pump coins have 6 decimals */
  let quote = { mint: null, symbol: 'SOL', decimals: 9 };
  if (!sol) {
    const [rec] = await redis(['GET', 'launch:' + quoteMint]).catch(() => [null]);
    quote = { mint: quoteMint, symbol: rec ? JSON.parse(rec).symbol : quoteMint.slice(0, 4), decimals: 6 };
  }
  return { mintPk, tokenProgram, global, feeConfig, state, quote };
}

function quoteOf({ global, feeConfig, state }, side, amount) {
  const bondingCurve = state.bondingCurve, mintSupply = bondingCurve.tokenTotalSupply;
  return side === 'buy'
    ? getBuyV3TokenAmountFromQuoteAmount({ global, feeConfig, mintSupply, bondingCurve, amount, curveBaseTokenBalance: state.curveBaseTokenBalance })
    : getSellSolAmountFromTokenAmount({ global, feeConfig, mintSupply, bondingCurve, amount });
}

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if (cors(req, res, 'GET, POST')) return;
  if (!await rateLimit(req, res, 'trade', 120, 600)) return;
  const b = req.method === 'POST' ? await readJson(req) : req.query;
  if (!b) return fail(res, 400, 'invalid JSON');
  if (!isPubkey(b.mint)) return fail(res, 400, 'invalid coin address');
  if (b.side !== 'buy' && b.side !== 'sell') return fail(res, 400, 'side must be buy or sell');
  const post = req.method === 'POST';
  if (post && !isPubkey(b.wallet)) return fail(res, 400, 'connect a Solana wallet');
  const user = new PublicKey(post ? b.wallet : '11111111111111111111111111111111');

  try {
    const s = await curveState(b.mint, user, b.side);
    if (s.state.bondingCurve.complete) return res.status(200).json({ graduated: true });
    const amount = toUnits(b.amount, b.side === 'buy' ? s.quote.decimals : 6);
    if (!amount || amount.isZero()) return fail(res, 400, 'enter an amount');
    const expected = quoteOf(s, b.side, amount);
    if (expected.isZero()) return fail(res, 400, 'too small to trade');
    const out = { expected: expected.toString(), decimals: 6, quote: { symbol: s.quote.symbol, decimals: s.quote.decimals } };
    if (!post) return res.status(200).json(out);

    const slippage = Number(b.slippage);
    if (!(slippage >= 0.1 && slippage <= 50)) return fail(res, 400, 'slippage must be 0.1–50%');
    const common = { bondingCurve: s.state.bondingCurve, mint: s.mintPk, user, slippage, tokenProgram: s.tokenProgram, quoteTokenProgram: s.state.quoteTokenProgram };
    const ixs = b.side === 'buy'
      ? await PUMP_SDK.buyExactQuoteInV3Instructions({ ...common, associatedUserAccountInfo: s.state.associatedUserAccountInfo, quoteAmount: amount, amount: expected })
      : await PUMP_SDK.sellV3Instructions({ ...common, amount, quoteAmount: expected });
    const { blockhash } = await connection().getLatestBlockhash('confirmed');
    const message = new TransactionMessage({ payerKey: user, recentBlockhash: blockhash, instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: TRADE_CU }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: CU_PRICE }),
      ...ixs, ...(b.jito === true ? [tipInstruction(b.wallet)] : []),
    ] }).compileToV0Message();
    const tx = Buffer.from(new VersionedTransaction(message).serialize());

    /* a trade that would fail on chain never reaches the wallet (Phantom warns about dApps whose transactions fail) */
    const sim = await rpc('simulateTransaction', [tx.toString('base64'), { encoding: 'base64', sigVerify: false, replaceRecentBlockhash: true, commitment: 'confirmed' }]).catch(() => null);
    const v = sim && sim.value;
    if (v && v.err) {
      const logs = (v.logs || []).join('\n');
      /* pump.fun's errors: 6023 (0x1787) NotEnoughTokensToSell, 6002/6003 (0x1772/0x1773) slippage, 6021 (0x1785) NotEnoughTokensToBuy */
      return fail(res, 400, /insufficient lamports|insufficient funds|0x1\b/i.test(logs) ? (b.side === 'buy' ? 'not enough ' + s.quote.symbol + ' in this wallet' : 'you hold less than that')
        : /0x1787\b|NotEnoughTokensToSell/.test(logs) ? 'you hold less than that'
        : /0x1785\b|NotEnoughTokensToBuy/.test(logs) ? 'the curve is almost sold out; try a smaller buy'
        : /0x177[23]\b|TooMuch|TooLittle/i.test(logs) ? 'the price moved; try again or raise slippage'
        : 'the trade would fail on chain: ' + ((v.logs || []).reverse().find(l => /error|failed/i.test(l)) || JSON.stringify(v.err)).replace(/^Program log: /, '').slice(0, 140));
    }
    return res.status(200).json({ ...out, tx: tx.toString('base64'), minimum: percentOff(expected, slippage).toString() });
  } catch (err) {
    return fail(res, err.status || 502, err.status ? err.message : 'could not build the trade: ' + (err.message || '').slice(0, 140));
  }
};
