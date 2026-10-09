// Coin screen data in one cached call: candles + recent trades from GeckoTerminal (free; open CORS, but
// rate-limited per IP, so going through here with a short CDN cache keeps every viewer under the limit).
// GET /api/chart?pool=<pair address>&tf=1m|5m|15m|1h[&net=robinhood|bnb|base]   (net: the chain of a v4 pool id)
// GET /api/chart?pool=<pair address>&spark=1   → { points }: the last day's 15-minute closes, for the token list's row charts
const { cors, isPubkey, redis, DEX_SLUG, fail } = require('./_lib');
const SPARK_TTL = 300;   // seconds a row chart is reused, from Redis, across every region and viewer

/* Solana pools are base58 accounts; EVM pools are Uniswap v4 pool ids (0x + 64 hex), on the chain named by ?net= (Robinhood if absent) */
const isV4Pool = (s) => /^0x[0-9a-fA-F]{64}$/.test(s);
const baseFor = (pool, net) => 'https://api.geckoterminal.com/api/v2/networks/' + (isV4Pool(pool) ? DEX_SLUG[net] || 'robinhood' : 'solana') + '/pools/';
const TIMEFRAMES = { '1m': ['minute', 1], '5m': ['minute', 5], '15m': ['minute', 15], '1h': ['hour', 1] };

async function gecko(path, net) {
  const r = await fetch(baseFor(path.split('/')[0], net) + path, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('GeckoTerminal ' + r.status);
  return r.json();
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET')) return;
  const q = req.query || {};
  const pool = String(q.pool || '');
  const tf = TIMEFRAMES[q.tf] ? q.tf : '5m';
  const net = String(q.net || 'robinhood');   // which EVM chain a v4 pool id is on
  if (!isPubkey(pool) && !isV4Pool(pool)) return fail(res, 400, 'invalid pool');
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
