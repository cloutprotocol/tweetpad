// The pad's token list.
// GET: newest launches first.
// POST { signature, mint }: list a launch, but only after checking on chain that the transaction succeeded,
// is a pump.fun create for that mint, was paid by the wallet that built it here, and was built here (pending).
const { PUMP_PROGRAM, cors, readJson, isPubkey, redis, rpc, fail } = require('./_lib');

const LIST_LIMIT = 100;

async function list(res) {
  const [mints] = await redis(['ZREVRANGE', 'launches', 0, LIST_LIMIT - 1]);
  const rows = mints.length ? (await redis(['MGET', ...mints.map(m => 'launch:' + m)]))[0] : [];
  res.setHeader('cache-control', 'public, s-maxage=5, stale-while-revalidate=30');
  return res.status(200).json({ launches: rows.filter(Boolean).map(r => JSON.parse(r)) });
}

/* the transaction may still be propagating to the RPC node right after confirmation */
async function fetchTx(signature) {
  for (let i = 0; i < 6; i++) {
    const tx = await rpc('getTransaction', [signature, { encoding: 'json', commitment: 'confirmed', maxSupportedTransactionVersion: 1 }]);
    if (tx) return tx;
    await new Promise(r => setTimeout(r, 1500));
  }
  return null;
}

async function record(req, res) {
  const b = await readJson(req);
  const signature = b && b.signature;
  const mint = b && b.mint;
  if (!isPubkey(mint) || typeof signature !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(signature)) return fail(res, 400, 'invalid signature or mint');

  const [existing, pendingRaw] = await redis(['GET', 'launch:' + mint], ['GET', 'pending:' + mint]);
  if (existing) return res.status(200).json({ ok: true, launch: JSON.parse(existing) });
  if (!pendingRaw) return fail(res, 404, 'this mint was not built through the pad (or it expired)');
  const pending = JSON.parse(pendingRaw);

  const tx = await fetchTx(signature);
  if (!tx) return fail(res, 404, 'transaction not found yet; try again in a moment');
  if (tx.meta && tx.meta.err) return fail(res, 400, 'transaction failed on chain');
  const msg = tx.transaction.message;
  const keys = [...msg.accountKeys, ...((tx.meta && tx.meta.loadedAddresses && tx.meta.loadedAddresses.writable) || []),
    ...((tx.meta && tx.meta.loadedAddresses && tx.meta.loadedAddresses.readonly) || [])];
  const signers = msg.accountKeys.slice(0, msg.header.numRequiredSignatures);
  if (signers[0] !== pending.creator) return fail(res, 400, 'transaction was not paid by the launching wallet');
  if (!signers.includes(mint)) return fail(res, 400, 'transaction did not create this mint');
  if (!keys.includes(PUMP_PROGRAM)) return fail(res, 400, 'not a pump.fun transaction');

  const time = tx.blockTime ? tx.blockTime * 1000 : Date.now();
  const launch = { mint, name: pending.name, symbol: pending.symbol, image: pending.image, uri: pending.uri,
    creator: pending.creator, devBuy: pending.devBuy, signature, time };
  await redis(['SET', 'launch:' + mint, JSON.stringify(launch)], ['ZADD', 'launches', time, mint], ['DEL', 'pending:' + mint]);
  return res.status(200).json({ ok: true, launch });
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET, POST')) return;
  try {
    if (req.method === 'GET') return await list(res);
    if (req.method === 'POST') { res.setHeader('cache-control', 'no-store'); return await record(req, res); }
    return fail(res, 405, 'GET or POST');
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
};
