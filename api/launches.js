// The pad's token list.
// GET ?before=<ms>&limit=<n>: newest launches first, a page at a time (cursor = time of the last row shown).
// GET ?mint=<mint>: one launch (share links open straight to a coin).
// GET ?creator=<wallet>: the coins a wallet launched here (profiles).
// GET ?q=<text>: search every coin launched here by name, ticker or contract, highest market cap first (the pair picker;
//                empty q = every coin, which is also the hotbar's top 9).
// GET ?pair=<mint>: whether a new coin can be paired with this one ({ ok, symbol } or { error }), before building.
// GET ?curve=new: a fresh SOL curve's reserves and buy fee, so the form can estimate what a dev buy gets.
// POST { signature, mint }: list a launch, but only after checking on chain that the transaction succeeded,
// is a pump.fun create for that mint, was paid by the wallet that built it here, and was built here (pending).
const { PUMP_PROGRAM, cors, readJson, isPubkey, redis, rpc, connection, quoteConfig, pairQuote, marketData, rateLimit, fail } = require('./_lib');

const PAGE = 24;

async function list(req, res) {
  const q = req.query || {};
  res.setHeader('cache-control', 'public, s-maxage=5, stale-while-revalidate=30');
  if (q.mint) {
    if (!isPubkey(q.mint)) return fail(res, 400, 'invalid mint');
    const [row] = await redis(['GET', 'launch:' + q.mint]);
    return row ? res.status(200).json({ launch: JSON.parse(row) }) : fail(res, 404, 'not launched on tweetpad');
  }
  if (q.pair != null) {
    res.setHeader('cache-control', 'public, s-maxage=15');
    try { const p = await pairQuote(String(q.pair)); return res.status(200).json({ ok: true, mint: p.mint, symbol: p.symbol }); }
    catch (err) { return fail(res, err.status || 502, err.message); }
  }
  if (q.q != null) return search(String(q.q), res);
  if (q.curve === 'new') return newCurve(res);
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

/* a brand-new SOL curve as pump.fun would create it now, with the fee a first buy pays (amounts in base units, as strings) */
async function newCurve(res) {
  const { OnlinePumpSdk, newBondingCurve, computeFeesBps } = require('@pump-fun/pump-sdk');
  const sdk = new OnlinePumpSdk(connection());
  const [global, feeConfig] = await Promise.all([sdk.fetchGlobal(), sdk.fetchFeeConfig().catch(() => null)]);
  const curve = newBondingCurve(global);
  const fees = computeFeesBps({ global, feeConfig, mintSupply: global.tokenTotalSupply, virtualQuoteReserves: curve.virtualQuoteReserves,
    virtualTokenReserves: curve.virtualTokenReserves, quoteMint: curve.quoteMint, creatorFeeBps: curve.creatorFeeBps });
  res.setHeader('cache-control', 'public, s-maxage=600, stale-while-revalidate=3600');
  return res.status(200).json({
    virtualSol: curve.virtualQuoteReserves.toString(), virtualTokens: curve.virtualTokenReserves.toString(),
    realTokens: curve.realTokenReserves.toString(), supply: global.tokenTotalSupply.toString(),
    feeBps: fees.protocolFeeBps.add(fees.creatorFeeBps).toNumber(), decimals: 6,
  });
}

/* the registry is small, so search scans the newest SEARCH_SCAN launches; a contract address is a direct lookup */
/* search reads a slim index (launchidx: mint → name, ticker, image link, pair, time), never the full records with their
   thumbnails, so it stays a few hundred bytes per coin however many launch; results are capped and carry no thumbs */
const SEARCH_SHOW = 48;
const slim = (l) => ({ mint: l.mint, name: l.name, symbol: l.symbol, image: l.image || '', quote: l.quote || null, time: l.time });
async function searchIndex() {
  const [raw, count] = await redis(['HGETALL', 'launchidx'], ['ZCARD', 'launches']);
  const idx = {};
  for (let i = 0; i < raw.length; i += 2) idx[raw[i]] = JSON.parse(raw[i + 1]);
  /* launches listed before the index existed: fill it in once, 100 records at a time */
  if (Object.keys(idx).length < count) {
    const [mints] = await redis(['ZRANGE', 'launches', 0, -1]);
    const missing = mints.filter(m => !idx[m]);
    for (let i = 0; i < missing.length; i += 100) {
      const chunk = missing.slice(i, i + 100);
      const [rows] = await redis(['MGET', ...chunk.map(m => 'launch:' + m)]);
      const add = [];
      rows.forEach((r, j) => { if (r) { idx[chunk[j]] = slim(JSON.parse(r)); add.push(chunk[j], JSON.stringify(idx[chunk[j]])); } });
      if (add.length) await redis(['HSET', 'launchidx', ...add]);
    }
  }
  return Object.values(idx);
}
async function search(text, res) {
  const raw = text.trim();
  const needle = raw.replace(/^\$/, '').toLowerCase().slice(0, 64);
  if (isPubkey(raw)) {
    const [row] = await redis(['GET', 'launch:' + raw]);
    return res.status(200).json({ launches: row ? [slim(JSON.parse(row))] : [], total: row ? 1 : 0 });
  }
  const hits = (await searchIndex())
    .filter(l => !needle || [l.name, l.symbol, l.mint].some(v => String(v || '').toLowerCase().includes(needle)));
  /* rank by market cap: caps come from the mcaps hash every market lookup fills; the newest coins without one yet get a
     DexScreener call (30 at most) so a fresh launch can still climb */
  const [capRows] = await redis(['HGETALL', 'mcaps']);
  const caps = {};
  for (let i = 0; i < capRows.length; i += 2) caps[capRows[i]] = Number(capRows[i + 1]);
  /* ...and the current leaders are re-checked too, so a coin that has since dumped can't hold a top spot on an old cap */
  const unknown = hits.filter(l => !(l.mint in caps)).sort((a, b) => b.time - a.time).slice(0, 30).map(l => l.mint);
  const leaders = hits.filter(l => l.mint in caps).sort((a, b) => caps[b.mint] - caps[a.mint]).slice(0, 30).map(l => l.mint);
  for (const batch of [unknown, leaders].filter(b => b.length)) {
    try { for (const [mint, m] of Object.entries(await marketData(batch))) if (m.mcap) caps[mint] = m.mcap; }
    catch { /* rank what we know */ }
  }
  for (const l of hits) l.mcap = caps[l.mint] || null;
  hits.sort((a, b) => (b.mcap || 0) - (a.mcap || 0) || b.time - a.time);
  return res.status(200).json({ launches: hits.slice(0, SEARCH_SHOW), total: hits.length });
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
    ['HSET', 'launchidx', mint, JSON.stringify(slim(launch))], ['DEL', 'pending:' + mint]);
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
