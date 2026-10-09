// The pad's token list.
// GET ?before=<ms>&limit=<n>: newest launches first, a page at a time (cursor = time of the last row shown).
// GET ?mint=<mint>: one launch (share links open straight to a coin).
// GET ?creator=<wallet>: the coins a wallet launched here (profiles).
// POST { signature, mint }: list a launch, but only after checking on chain that the transaction succeeded,
// is a pump.fun create for that mint, was paid by the wallet that built it here, and was built here (pending).
const { PUMP_PROGRAM, cors, readJson, isPubkey, redis, rpc, quoteConfig, rateLimit, fail } = require('./_lib');

const PAGE = 24;

async function list(req, res) {
  const q = req.query || {};
  res.setHeader('cache-control', 'public, s-maxage=5, stale-while-revalidate=30');
  if (q.mint) {
    if (!isPubkey(q.mint)) return fail(res, 400, 'invalid mint');
    const [row] = await redis(['GET', 'launch:' + q.mint]);
    return row ? res.status(200).json({ launch: JSON.parse(row) }) : fail(res, 404, 'not launched on Tweetpad');
  }
  if (q.creator) {
    if (!isPubkey(q.creator)) return fail(res, 400, 'invalid creator');
    const [mints] = await redis(['ZREVRANGE', 'creator:' + q.creator, 0, 49]);
    const rows = mints.length ? (await redis(['MGET', ...mints.map(m => 'launch:' + m)]))[0] : [];
    return res.status(200).json({ launches: rows.filter(Boolean).map(r => JSON.parse(r)) });
  }
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || PAGE, 1), 50);
  const before = Number(q.before) > 0 ? '(' + Number(q.before) : '+inf';
  const [mints, total] = await redis(['ZREVRANGEBYSCORE', 'launches', before, '-inf', 'LIMIT', 0, limit], ['ZCARD', 'launches']);
  const rows = mints.length ? (await redis(['MGET', ...mints.map(m => 'launch:' + m)]))[0] : [];
  const launches = rows.filter(Boolean).map(r => JSON.parse(r));
  const quote = quoteConfig();
  return res.status(200).json({
    launches, total,
    next: launches.length === limit ? launches[launches.length - 1].time : null,
    quote: quote.mint ? { mint: quote.mint, symbol: quote.symbol } : null,
  });
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
  const loaded = (tx.meta && tx.meta.loadedAddresses) || {};
  const keys = [...msg.accountKeys, ...(loaded.writable || []), ...(loaded.readonly || [])];
  const signers = msg.accountKeys.slice(0, msg.header.numRequiredSignatures);
  if (signers[0] !== pending.creator) return fail(res, 400, 'transaction was not paid by the launching wallet');
  if (!signers.includes(mint)) return fail(res, 400, 'transaction did not create this mint');
  if (!keys.includes(PUMP_PROGRAM)) return fail(res, 400, 'not a pump.fun transaction');
  if (pending.quote && !keys.includes(pending.quote.mint)) return fail(res, 400, 'transaction is not paired with $' + pending.quote.symbol);

  const time = tx.blockTime ? tx.blockTime * 1000 : Date.now();
  const launch = { mint, name: pending.name, symbol: pending.symbol, image: pending.image, thumb: pending.thumb || '', uri: pending.uri,
    creator: pending.creator, devBuy: pending.devBuy, quote: pending.quote || null, signature, time };
  await redis(['SET', 'launch:' + mint, JSON.stringify(launch)], ['ZADD', 'launches', time, mint], ['ZADD', 'creator:' + pending.creator, time, mint],
    ['DEL', 'pending:' + mint]);
  return res.status(200).json({ ok: true, launch });
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET, POST')) return;
  try {
    if (req.method === 'GET') return await list(req, res);
    if (req.method === 'POST') {
      res.setHeader('cache-control', 'no-store');
      if (!await rateLimit(req, res, 'record', 30, 600)) return;
      return await record(req, res);
    }
    return fail(res, 405, 'GET or POST');
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
};
