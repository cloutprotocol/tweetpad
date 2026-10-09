// Market data for the token list: one DexScreener call for up to 30 mints, cached at the CDN for 15s,
// so the upstream load stays flat however many people have the card open.
// GET /api/market?mints=<mint>,<mint>,...   (the client sorts the list so equal sets share a cache entry)
const { cors, isPubkey, marketData, fail } = require('./_lib');

const MAX_MINTS = 30;

module.exports = async (req, res) => {
  if (cors(req, res, 'GET')) return;
  const mints = String((req.query && req.query.mints) || '').split(',').filter(Boolean);
  if (!mints.length || mints.length > MAX_MINTS || !mints.every(isPubkey)) return fail(res, 400, 'pass 1–' + MAX_MINTS + ' mint addresses');
  try {
    const market = await marketData(mints);
    res.setHeader('cache-control', 'public, s-maxage=5, stale-while-revalidate=30');
    return res.status(200).json({ market, at: Date.now() });
  } catch (err) {
    res.setHeader('cache-control', 'public, s-maxage=5');
    return fail(res, 502, err.message);
  }
};
