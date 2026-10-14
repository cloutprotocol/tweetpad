// Coin screen data in one cached call: candles + recent trades from GeckoTerminal (free; open CORS, but
// rate-limited per IP, so going through here with a short CDN cache keeps every viewer under the limit).
// GET /api/chart?pool=<pair address>&tf=1m|5m|15m|1h[&net=robinhood|bnb|base|ethereum]   (net: the chain of an EVM pool: a v4 pool id, or
//     a v2/v3 pair's address, as any token's own page (api/t.js) charts it)
// GET /api/chart?pool=<pair address>&spark=1   → { points }: the last day's 15-minute closes, for the token list's row charts
// &venue=bordrless&mint=<mint>: a Bordrless coin, from Bordrless's own indexer (GeckoTerminal doesn't see its DEX); its candles
// are 5-minute ones, so 1m shows 5m and 15m/1h are put together here
const { cors, isPubkey, redis, DEX_SLUG, fail } = require('./_lib');
const SPARK_TTL = 300;   // seconds a row chart is reused, from Redis, across every region and viewer

/* Solana pools are base58 accounts; EVM pools are Uniswap v4 pool ids (0x + 64 hex) or pair contracts (0x + 40 hex), on the chain
   named by ?net= (Robinhood if absent) */
const isEvmPool = (s) => /^0x([0-9a-fA-F]{64}|[0-9a-fA-F]{40})$/.test(s);
const GECKO = { ...DEX_SLUG, ethereum: 'eth' };   // GeckoTerminal's ids are DexScreener's, but for Ethereum
const baseFor = (pool, net) => 'https://api.geckoterminal.com/api/v2/networks/' + (isEvmPool(pool) ? GECKO[net] || 'robinhood' : 'solana') + '/pools/';
const TIMEFRAMES = { '1m': ['minute', 1], '5m': ['minute', 5], '15m': ['minute', 15], '1h': ['hour', 1] };

async function gecko(path, net) {
  const r = await fetch(baseFor(path.split('/')[0], net) + path, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('GeckoTerminal ' + r.status);
  return r.json();
}

/* 5-minute candles put together n at a time, [time, open, high, low, close, volume], oldest first */
function regroup(candles, n) {
  const out = [];
  for (const k of candles) {
    const t = Math.floor(k.t / (300 * n)) * 300 * n, last = out[out.length - 1];
    if (last && last[0] === t) { last[2] = Math.max(last[2], k.h); last[3] = Math.min(last[3], k.l); last[4] = k.c; last[5] += k.v; }
    else out.push([t, k.o, k.h, k.l, k.c, k.v]);
  }
  return out;
}
async function bordrChart(mint, tf, spark, res) {
  const { bordr } = require('./bordrless');
  if (spark) {
    let points = null;
    try { const [hit] = await redis(['GET', 'spark:' + mint]); points = hit ? JSON.parse(hit) : null; } catch { /* go upstream */ }
    if (!points) {
      points = regroup((await bordr('/launches/' + mint + '/candles?limit=288')).candles || [], 3).map(c => c[4]);
      redis(['SET', 'spark:' + mint, JSON.stringify(points), 'EX', SPARK_TTL]).catch(() => {});
    }
    res.setHeader('cache-control', 'public, s-maxage=300, stale-while-revalidate=900');
    return res.status(200).json({ points });
  }
  const n = { '1m': 1, '5m': 1, '15m': 3, '1h': 12 }[tf];
  const [c, t] = await Promise.all([bordr('/launches/' + mint + '/candles?limit=' + 80 * n), bordr('/launches/' + mint + '/trades')]);
  const trades = ((t && t.trades) || []).slice(0, 40).map(x => ({ kind: x.side, usd: x.priceQuote ? (Number(x.quoteAmount) / 1e9) * (x.priceUsd / x.priceQuote) : null,
    sol: Number(x.quoteAmount) / 1e9, wallet: x.trader, time: x.ts * 1000, tx: x.signature }));
  res.setHeader('cache-control', 'public, s-maxage=5, stale-while-revalidate=20');
  return res.status(200).json({ tf, candles: regroup((c && c.candles) || [], n).slice(-80), trades });
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET')) return;
  const q = req.query || {};
  const pool = String(q.pool || '');
  const tf = TIMEFRAMES[q.tf] ? q.tf : '5m';
  const net = String(q.net || 'robinhood');   // which EVM chain an EVM pool is on
  if (q.venue === 'bordrless') {
    if (!isPubkey(String(q.mint || ''))) return fail(res, 400, 'invalid mint');
    try { return await bordrChart(String(q.mint), tf, !!q.spark, res); }
    catch (err) { res.setHeader('cache-control', 'public, s-maxage=5'); return fail(res, 502, err.message); }
  }
  if (!isPubkey(pool) && !isEvmPool(pool)) return fail(res, 400, 'invalid pool');
  const [period, aggregate] = TIMEFRAMES[tf];
  if (q.spark) {
    try {
      let points = null;
      try { const [hit] = await redis(['GET', 'spark:' + pool]); points = hit ? JSON.parse(hit) : null; } catch { /* go upstream */ }
      if (!points) {
        const ohlcv = await gecko(pool + '/ohlcv/minute?aggregate=15&limit=96&currency=usd', net);
        points = ((ohlcv.data && ohlcv.data.attributes && ohlcv.data.attributes.ohlcv_list) || [])
          .map(c => [Number(c[0]), Number(c[4])]).sort((a, b) => a[0] - b[0]).map(c => c[1]);
        redis(['SET', 'spark:' + pool, JSON.stringify(points), 'EX', SPARK_TTL]).catch(() => {});
      }
      /* a row chart moves slowly: hold it at the CDN for 5 minutes so the whole list costs a handful of upstream calls */
      res.setHeader('cache-control', 'public, s-maxage=300, stale-while-revalidate=900');
      return res.status(200).json({ points });
    } catch (err) {
      res.setHeader('cache-control', 'public, s-maxage=30');
      return fail(res, 502, err.message);
    }
  }
  try {
    const [ohlcv, trades] = await Promise.all([
      gecko(pool + '/ohlcv/' + period + '?aggregate=' + aggregate + '&limit=80&currency=usd', net),
      gecko(pool + '/trades', net),
    ]);
    /* [time, open, high, low, close, volume], oldest first */
    const candles = ((ohlcv.data && ohlcv.data.attributes && ohlcv.data.attributes.ohlcv_list) || [])
      .map(c => c.map(Number)).sort((a, b) => a[0] - b[0]);
    const list = ((trades && trades.data) || []).slice(0, 40).map(t => {
      const a = t.attributes;
      return { kind: a.kind, usd: Number(a.volume_in_usd), wallet: a.tx_from_address, time: Date.parse(a.block_timestamp), tx: a.tx_hash };
    });
    res.setHeader('cache-control', 'public, s-maxage=10, stale-while-revalidate=30');
    return res.status(200).json({ tf, candles, trades: list });
  } catch (err) {
    res.setHeader('cache-control', 'public, s-maxage=5');
    return fail(res, 502, err.message);
  }
};
