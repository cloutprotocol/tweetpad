// Step 2 of a launch: build the pump.fun create transaction (unsigned), check it, and remember the launch as
// pending so only launches made through the pad can be listed later.
// The launcher picks the pair ("crafting"): `quote: 'sol'`, or the mint of any coin launched on tweetpad that pump.fun
// admits as a quote (checked by pairQuote). Without `quote`, QUOTE_MINT (env) decides, and unset means SOL.
// SOL pairs are built with PumpPortal's local transaction API, which also supports a dev buy; coin pairs are built
// here with pump.fun's SDK (create_v2 with the quote coin's curve accounts).
// Body JSON: { publicKey, mint, name, symbol, uri, image, thumb, devBuy, quote }
const { PublicKey, TransactionMessage, VersionedTransaction, ComputeBudgetProgram } = require('@solana/web3.js');
const { OnlinePumpSdk, PUMP_SDK } = require('@pump-fun/pump-sdk');
const { PUMP_PROGRAM, cors, readJson, isPubkey, signerKeys, redis, connection, quoteConfig, pairQuote, cleanThumb, rateLimit, fail } = require('./_lib');

const PENDING_TTL = 60 * 60; // seconds a built launch may wait to be signed and sent
const MAX_DEV_BUY = 10;      // SOL
const CREATE_CU = 250000;    // create_v2 with a pump-coin quote uses ~145k
const CU_PRICE = 400000;     // micro-lamports per CU, about 0.0001 SOL priority fee

async function viaPumpPortal({ publicKey, mint, name, symbol, uri, devBuy }) {
  const r = await fetch('https://pumpportal.fun/api/trade-local', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      publicKey, action: 'create', tokenMetadata: { name, symbol, uri }, mint,
      denominatedInSol: 'true', amount: devBuy, slippage: 10, priorityFee: 0.0005, pool: 'pump',
    }),
  });
  const tx = Buffer.from(await r.arrayBuffer());
  if (!r.ok) throw new Error(tx.toString('utf8').slice(0, 200) || 'HTTP ' + r.status);
  return tx;
}

async function viaSdkPaired({ publicKey, mint, name, symbol, uri }, quoteMint, resolved) {
  const conn = connection();
  const quote = resolved || await new OnlinePumpSdk(conn).resolveQuoteMint(new PublicKey(quoteMint));
  const payer = new PublicKey(publicKey);
  const ix = await PUMP_SDK.createV2Instruction({
    mint: new PublicKey(mint), name, symbol, uri, creator: payer, user: payer, mayhemMode: false,
    quoteMint: new PublicKey(quoteMint), quoteTokenProgram: quote.quoteTokenProgram,
    ...(quote.pumpQuote && { pumpQuote: quote.pumpQuote.accounts }),
  });
  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  const message = new TransactionMessage({
    payerKey: payer, recentBlockhash: blockhash,
    instructions: [ComputeBudgetProgram.setComputeUnitLimit({ units: CREATE_CU }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: CU_PRICE }), ix],
  }).compileToV0Message();
  return Buffer.from(new VersionedTransaction(message).serialize());
}

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if (cors(req, res, 'POST')) return;
  if (req.method !== 'POST') return fail(res, 405, 'POST launch details');
  if (!await rateLimit(req, res, 'create', 15, 600)) return;
  const b = await readJson(req);
  if (!b) return fail(res, 400, 'invalid JSON');
  const { publicKey, mint, uri, image } = b;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const symbol = b.symbol;
  const devBuy = Number(b.devBuy || 0);
  let quote = quoteConfig(), resolved = null;
  if (b.quote === 'sol') quote = { mint: null, symbol: 'SOL' };
  else if (b.quote != null) {
    if (!isPubkey(b.quote)) return fail(res, 400, 'invalid pair address');
    if (b.quote === mint) return fail(res, 400, 'a coin cannot be paired with itself');
    try { ({ resolved, ...quote } = await pairQuote(b.quote)); }
    catch (err) { return fail(res, err.status || 502, err.message); }
  }
  if (!isPubkey(publicKey) || !isPubkey(mint) || publicKey === mint) return fail(res, 400, 'invalid wallet or mint address');
  if (!name || name.length > 32) return fail(res, 400, 'name must be 1–32 characters');
  if (typeof symbol !== 'string' || !/^[A-Z0-9]{2,10}$/.test(symbol)) return fail(res, 400, 'ticker must be 2–10 letters or numbers');
  if (typeof uri !== 'string' || !uri.startsWith('https://')) return fail(res, 400, 'metadata URI must be https');
  if (!Number.isFinite(devBuy) || devBuy < 0 || devBuy > MAX_DEV_BUY) return fail(res, 400, 'dev buy must be between 0 and ' + MAX_DEV_BUY + ' SOL');
  if (quote.mint && devBuy > 0) return fail(res, 400, 'dev buy is not available yet for coins paired with $' + quote.symbol);
  const thumb = cleanThumb(b.thumb);
  /* the image is shown everywhere the coin is (lists, cards, feed): only a short IPFS link, nothing else */
  const imageUrl = typeof image === 'string' && /^https:\/\/[A-Za-z0-9.-]{1,64}\/ipfs\/[A-Za-z0-9]{46,100}$/.test(image) ? image : '';

  let tx;
  try {
    tx = quote.mint ? await viaSdkPaired({ publicKey, mint, name, symbol, uri }, quote.mint, resolved)
                    : await viaPumpPortal({ publicKey, mint, name, symbol, uri, devBuy });
  } catch (err) {
    return fail(res, 502, 'could not build the transaction: ' + err.message);
  }

  /* never hand the wallet something other than what was asked for */
  let parsed;
  try { parsed = signerKeys(tx); } catch { parsed = null; }
  if (!parsed || parsed.signers.length !== 2 || parsed.signers[0] !== publicKey || parsed.signers[1] !== mint || !parsed.keys.includes(PUMP_PROGRAM)) {
    return fail(res, 502, 'the builder returned an unexpected transaction');
  }

  try {
    const pending = { mint, creator: publicKey, name, symbol, uri, image: imageUrl, thumb,
      devBuy, quote: quote.mint ? { mint: quote.mint, symbol: quote.symbol } : null, at: Date.now() };
    /* NX: the first build for a mint holds it, so nobody can swap in their own metadata before it's listed */
    const [set] = await redis(['SET', 'pending:' + mint, JSON.stringify(pending), 'NX', 'EX', PENDING_TTL]);
    if (set !== 'OK') return fail(res, 409, 'this mint is already being launched; start over with a new one');
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
  return res.status(200).json({ ok: true, tx: tx.toString('base64') });
};
