// The auto-claim keeper, run by Vercel Cron (vercel.json "crons"): for every wallet that turned auto-claim on (api/autoclaim.js)
// with at least MIN_SOL of creator fees waiting, it sends pump.fun's permissionless sweeps and collect, signed and paid by the
// keeper wallet. The fees go to the creator; the keeper only pays the network fee (5,000 lamports a claim, plus a small
// priority fee). Each claim is simulated first, so a claim pump.fun would refuse never costs a fee.
// Env: KEEPER_SECRET (the keeper's secret key, base58, 64 bytes; fund it with a little SOL), CRON_SECRET (Vercel sends it).
// GET with Authorization: Bearer <CRON_SECRET> → { ok, checked, claimed: [{ wallet, sol, sig }], skipped, keeperSol }
const { Keypair, PublicKey, TransactionMessage, VersionedTransaction, ComputeBudgetProgram } = require('@solana/web3.js');
const { b58decode, connection, redis, fail } = require('./_lib');
const { autoClaimIxs } = require('./_creator-fees');
const { MIN_SOL } = require('./autoclaim');

const PER_RUN = 25;              // wallets checked per run, in turn, so a long list never runs past the function's time
const KEEPER_FLOOR = 0.002;      // below this the keeper stops sending (and says so) rather than fail on fees
const CU_PRICE = 20000;          // micro-lamports per CU: about 0.000002 SOL on a 100k-CU claim

function keeper() {
  const raw = b58decode(String(process.env.KEEPER_SECRET || '').trim());
  if (!raw || raw.length !== 64) throw Object.assign(new Error('keeper not configured (KEEPER_SECRET)'), { status: 503 });
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

/* one creator: build, simulate, send, confirm, record. Returns the claim, or null when there was nothing (or not enough) to claim */
async function claimFor(conn, k, wallet) {
  const { ixs, sol } = await autoClaimIxs(conn, wallet, k.publicKey.toBase58());
  if (!ixs.length || sol < MIN_SOL) return null;
  const latest = await conn.getLatestBlockhash('confirmed');
  const build = (units) => new VersionedTransaction(new TransactionMessage({ payerKey: k.publicKey, recentBlockhash: latest.blockhash,
    instructions: [ComputeBudgetProgram.setComputeUnitLimit({ units }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: CU_PRICE }), ...ixs] }).compileToV0Message());
  const before = await conn.getBalance(new PublicKey(wallet), 'confirmed');
  const sim = await conn.simulateTransaction(build(400000), { sigVerify: false, accounts: { encoding: 'base64', addresses: [wallet] } });
  if (sim.value.err) throw new Error('simulation: ' + JSON.stringify(sim.value.err));
  const got = sim.value.accounts && sim.value.accounts[0] ? sim.value.accounts[0].lamports - before : 0;
  if (got <= 0) return null;
  const tx = build(Math.ceil(sim.value.unitsConsumed * 1.2) + 5000);   // the units it used, with room: the priority fee is per unit asked for
  tx.sign([k]);
  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: true, maxRetries: 5 });
  const done = await conn.confirmTransaction({ signature: sig, ...latest }, 'confirmed');
  if (done.value.err) throw new Error('claim failed on chain: ' + JSON.stringify(done.value.err));
  const at = Date.now();
  await redis(
    ['HINCRBY', 'autoclaim:' + wallet, 'claims', 1], ['HINCRBY', 'autoclaim:' + wallet, 'lamports', got],
    ['HSET', 'autoclaim:' + wallet, 'lastAt', String(at), 'lastLamports', String(got), 'lastSig', sig],
    ['HINCRBY', 'autoclaim:total', 'claims', 1], ['HINCRBY', 'autoclaim:total', 'lamports', got],
    ['LPUSH', 'autoclaim:log', JSON.stringify({ wallet, sol: got / 1e9, sig, at })], ['LTRIM', 'autoclaim:log', 0, 49]);
  return { wallet, sol: got / 1e9, sig };
}

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if (!process.env.CRON_SECRET || req.headers.authorization !== 'Bearer ' + process.env.CRON_SECRET) return fail(res, 401, 'unauthorized');
  try {
    const k = keeper();
    const conn = connection();
    /* one run at a time: a slow run and the next cron tick never claim the same wallet twice */
    const [lock] = await redis(['SET', 'keeper:lock', '1', 'NX', 'EX', 240]);
    if (!lock) return res.status(200).json({ ok: true, busy: true });
    try {
      const keeperSol = await conn.getBalance(k.publicKey, 'confirmed') / 1e9;
      if (keeperSol < KEEPER_FLOOR) return res.status(200).json({ ok: false, error: 'keeper wallet needs SOL', keeper: k.publicKey.toBase58(), keeperSol });
      /* every wallet gets its turn: a cursor walks the sorted list PER_RUN at a time */
      const [wallets, cursor] = await redis(['SMEMBERS', 'autoclaim'], ['GET', 'keeper:cursor']);
      wallets.sort();
      const from = Number(cursor) || 0;
      const turn = wallets.length <= PER_RUN ? wallets : [...wallets, ...wallets].slice(from % wallets.length, from % wallets.length + PER_RUN);
      await redis(['SET', 'keeper:cursor', String((from + turn.length) % Math.max(1, wallets.length))]);
      const claimed = [], skipped = [];
      for (const wallet of turn) {
        try { const c = await claimFor(conn, k, wallet); if (c) claimed.push(c); }
        catch (err) { skipped.push({ wallet, error: String(err.message).slice(0, 160) }); }
      }
      return res.status(200).json({ ok: true, checked: turn.length, claimed, skipped, keeperSol });
    } finally {
      await redis(['DEL', 'keeper:lock']);
    }
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
};
