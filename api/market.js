// Market data for the token list: one DexScreener call for up to 30 mints, cached at the CDN for 15s,
// so the upstream load stays flat however many people have the card open.
// GET /api/market?mints=<mint>,<mint>,...   (the client sorts the list so equal sets share a cache entry)
const { cors, isPubkey, fail } = require('./_lib');

const MAX_MINTS = 30;

module.exports = async (req, res) => {
  if (cors(req, res, 'GET')) return;
  const mints = String((req.query && req.query.mints) || '').split(',').filter(Boolean);
  if (!mints.length || mints.length > MAX_MINTS || !mints.every(isPubkey)) return fail(res, 400, 'pass 1–' + MAX_MINTS + ' mint addresses');
  try {
    const r = await fetch('https://api.dexscreener.com/tokens/v1/solana/' + mints.join(','), { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error('DexScreener ' + r.status);
    const pairs = await r.json();
    const market = {};
    /* a coin can have several pairs (curve, then PumpSwap after migration): keep the most liquid one */
    for (const p of Array.isArray(pairs) ? pairs : []) {
      const mint = p.baseToken && p.baseToken.address;
      if (!mints.includes(mint)) continue;
      const liq = (p.liquidity && p.liquidity.usd) || 0;
      if (market[mint] && market[mint].liquidity >= liq) continue;
      market[mint] = {
        mcap: p.marketCap || p.fdv || null,
        price: p.priceUsd ? Number(p.priceUsd) : null,
        change1h: p.priceChange ? p.priceChange.h1 ?? null : null,
        change24h: p.priceChange ? p.priceChange.h24 ?? null : null,
        buys1h: p.txns && p.txns.h1 ? p.txns.h1.buys : 0,
        sells1h: p.txns && p.txns.h1 ? p.txns.h1.sells : 0,
        volume24h: p.volume ? p.volume.h24 ?? 0 : 0,
        liquidity: liq,
        dex: p.dexId, pair: p.pairAddress,
      };
    }
    res.setHeader('cache-control', 'public, s-maxage=15, stale-while-revalidate=60');
    return res.status(200).json({ market, at: Date.now() });
  } catch (err) {
    res.setHeader('cache-control', 'public, s-maxage=5');
    return fail(res, 502, err.message);
  }
};
