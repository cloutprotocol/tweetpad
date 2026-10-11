// EVM chains (an 0x wallet: Robinhood Chain, BNB Chain, Base): creator fees are what Launch Party's hook on each chain holds
// for the creator's coins there; the claim is one sweep per coin (paid out to the creator, the holders and the platform at
// once), so POST returns a list of calls to send, for one chain at a time.
//   GET  ?wallet=0x…                       → { evm: true, wallet, chains: [{ chain, symbol, amount, perCoin }] }   (chains with coins)
// Ethereum coins (Launch Party CustomLaunch, api/_eth-coins.js) have their own fee hook, paying in ETH and in the coin (coinAmount).
//   POST { wallet: 0x…, chain }            → { calls: [{ to, data, label }] }
//   GET  ?coin=0x…&holder=0x…&chain        → { earned, claim: { to, data } }   a holder's rewards in one coin (native coin)
// Creator rewards: the fees pump.fun has set aside for a coin creator, per quote token: SOL, the current pairing token,
// and any token the creator's own launches were paired with (coins launched before a pairing change keep earning in it).
// GET ?wallet=<w>            → claimable amounts
// POST { wallet }            → an unsigned claim transaction for the wallet to sign and send; it only includes the
//                              quotes that hold fees (collecting from a quote vault that does not exist fails).
const { PublicKey, TransactionMessage, VersionedTransaction, ComputeBudgetProgram } = require('@solana/web3.js');
const { cors, readJson, isPubkey, isEvmAddress, EVM_CHAINS, connection, redis, rateLimit, fail } = require('./_lib');
const { balances, claimIxs } = require('./_creator-fees');

/* an EVM creator's coins, with the chain, pool and split each was launched with */
async function evmCoins(wallet) {
  const [mints] = await redis(['ZREVRANGE', 'creator:' + wallet, 0, 199]);
  const rows = mints.length ? (await redis(['MGET', ...mints.map(m => 'launch:' + m)]))[0] : [];
  return rows.filter(Boolean).map(r => JSON.parse(r)).filter(l => EVM_CHAINS.includes(l.chain));
}
async function evmRoute(req, res) {
  const evm = require('./_evm');
  const q = req.query || {};
  if (req.method === 'GET' && q.coin) {
    const chain = q.chain || 'robinhood';
    if (!isEvmAddress(q.coin) || !isEvmAddress(q.holder) || !EVM_CHAINS.includes(chain)) return fail(res, 400, 'invalid coin, holder or chain');
    if (chain === 'ethereum') return res.status(200).json({ earned: 0, claim: null });   // Ethereum coins have no holder share
    const r = await evm.holderRewards(chain, evm.getAddress(q.coin), evm.getAddress(q.holder));
    return res.status(200).json({ earned: (Number(r.earned) / 1e18), claim: r.claim });
  }
  const b = req.method === 'GET' ? q : (req.body || await readJson(req) || {});
  if (!isEvmAddress(b.wallet)) return fail(res, 400, 'invalid wallet');
  const wallet = evm.getAddress(b.wallet), coins = await evmCoins(wallet);
  /* Ethereum coins carry their own fee hook (api/_eth-coins.js): fees in ETH and in the coin itself, collected per currency */
  const eth = require('./_eth-coins');
  const feesOf = (chain, list) => chain === 'ethereum' ? eth.creatorFeesEth(wallet, list) : evm.creatorFees(chain, wallet, list);
  if (req.method === 'GET') {
    /* every chain the creator has coins on, read in parallel; a chain whose RPC is down shows as unavailable, not as zero */
    const chains = [...new Set(coins.map(l => l.chain))];
    const out = await Promise.all(chains.map(chain => feesOf(chain, coins.filter(l => l.chain === chain)).then(
      fees => ({ chain, symbol: evm.NETS[chain].symbol, amount: Number(fees.total) / 1e18, perCoin: fees.perCoin.map(c => ({ mint: c.mint, symbol: c.symbol, amount: Number(c.mine) / 1e18,
        ...(c.mineCoin ? { coinAmount: Number(c.mineCoin) / 1e18 } : {}) })) }),   // coinAmount: an Ethereum hook's fees in the coin itself
      () => ({ chain, symbol: evm.NETS[chain].symbol, amount: null, perCoin: [] }))));
    return res.status(200).json({ evm: true, wallet, chains: out });
  }
  const chain = b.chain || 'robinhood';
  if (!EVM_CHAINS.includes(chain)) return fail(res, 400, 'unknown chain');
  const fees = await feesOf(chain, coins.filter(l => l.chain === chain));
  const calls = chain === 'ethereum' ? eth.claimCallsEth(wallet, fees) : evm.claimCalls(chain, wallet, fees);
  return calls.length ? res.status(200).json({ ok: true, calls }) : fail(res, 400, 'nothing to claim yet');
}

/* the claim: sweeps, then collects (api/_creator-fees.js). Simulated first when it sweeps: if pump.fun refuses a sweep, the
   claim goes out with the collects alone, as before the sweeps existed, and the creator never pays for a failed transaction. */
async function claimTx(wallet) {
  const conn = connection();
  const me = new PublicKey(wallet);
  const { sweeps, collects } = await claimIxs(conn, wallet);
  if (!sweeps.length && !collects.length) return null;
  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  const build = (ixs) => new VersionedTransaction(new TransactionMessage({ payerKey: me, recentBlockhash: blockhash,
    instructions: [ComputeBudgetProgram.setComputeUnitLimit({ units: 300000 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200000 }), ...ixs] }).compileToV0Message());
  let tx = build([...sweeps, ...collects]);
  if (sweeps.length) {
    const sim = await conn.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true }).catch(() => null);
    if (!sim || sim.value.err) { if (!collects.length) return null; tx = build(collects); }
  }
  return Buffer.from(tx.serialize()).toString('base64');
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET, POST')) return;
  res.setHeader('cache-control', 'no-store');
  try {
    /* EVM chains: 0x wallets and coins */
    const q = req.query || {};
    if (isEvmAddress(q.wallet) || isEvmAddress(q.coin)) return await evmRoute(req, res);
    if (req.method === 'POST') {
      const peek = await readJson(req);
      if (peek && isEvmAddress(peek.wallet)) { if (!await rateLimit(req, res, 'claim', 20, 600)) return; req.body = peek; return await evmRoute(req, res); }
      req.body = peek;
    }
    if (req.method === 'GET') {
      const wallet = String((req.query && req.query.wallet) || '');
      if (!isPubkey(wallet)) return fail(res, 400, 'invalid wallet');
      const { held, ...out } = await balances(connection(), wallet);   // held: per-coin detail for the claim, not for the page
      return res.status(200).json(out);
    }
    if (req.method !== 'POST') return fail(res, 405, 'GET or POST');
    if (!await rateLimit(req, res, 'claim', 20, 600)) return;
    const b = await readJson(req);
    if (!b || !isPubkey(b.wallet)) return fail(res, 400, 'invalid wallet');
    const tx = await claimTx(b.wallet);
    return tx ? res.status(200).json({ ok: true, tx }) : fail(res, 400, 'nothing to claim yet');
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
};
