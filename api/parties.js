// The launch parties on Solana mainnet, for tweetpad.io/party: GET /api/parties → { open: [...], launched: [...], at }.
// party_pump is shared (Launch Party's integration guide §1): every app's rooms are listed, party.studio's too; what's unlisted is ours to
// decide, so test rooms are hidden here (HIDDEN, plus PARTY_HIDDEN in the environment). Rooms come from getProgramAccounts through the
// keyed RPC (SOLANA_RPC_URL), each coin's picture from its metadata (kept a month), launched coins' market data from their pump.fun curve.
// The whole answer is kept 20 s, so a busy page costs one read of the chain.
const { pathToFileURL } = require('node:url');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const { cors, redis, fail } = require('./_lib');

const UPSTREAM = process.env.SOLANA_RPC_URL || process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
/* party.studio's mainnet rehearsal rooms (hidden on party.studio too) */
const HIDDEN = new Set(['3UEyRyQ91RCy1Xm5ZXHdy1YBjnKqTsQEoz9aFdRbfYf1', '2uhedCx6g535zzF7sBw45fXHFr2SEgdtqHEa8Ct32mSc',
  ...String(process.env.PARTY_HIDDEN || '').split(',').map((s) => s.trim()).filter(Boolean)]);
const CURVE_COINS = 793_100_000n * 1_000_000n;

let sdk = null;
const party = async () => {   // an ES module bundle; loaded as CommonJS somewhere, its exports sit under `default`
  if (!sdk) { const m = await import(pathToFileURL(join(__dirname, '..', 'assets', 'vendor', 'party-sdk.js')).href); sdk = m.solanaContext ? m : m.default; }
  return sdk;
};
const gateway = (u) => String(u || '').replace(/^ipfs:\/\//, 'https://ipfs.io/ipfs/');

/* a coin's picture and description from its metadata JSON, kept a month (a coin's metadata never changes) */
async function meta(uri) {
  const key = 'pmeta:' + createHash('sha256').update(uri).digest('hex').slice(0, 24);
  try { const [hit] = await redis(['GET', key]); if (hit) return JSON.parse(hit); } catch { /* read it */ }
  let out = { image: '', description: '' };
  try {
    const j = await (await fetch(gateway(uri), { signal: AbortSignal.timeout(4000) })).json();
    out = { image: gateway(j.image).slice(0, 300), description: String(j.description || '').slice(0, 140) };
    await redis(['SET', key, JSON.stringify(out), 'EX', 60 * 60 * 24 * 30]).catch(() => {});
  } catch { /* no picture: the page draws the ticker's letter */ }
  return out;
}

async function list() {
  const s = await party(), ctx = s.solanaContext(792703809, { rpcUrl: UPSTREAM });
  const rooms = (await s.listPumpRooms(ctx)).filter((r) => !HIDDEN.has(r.address.toBase58()) && (r.state === s.PUMP_OPEN || r.state === s.PUMP_LAUNCHED));
  const open = rooms.filter((r) => r.state === s.PUMP_OPEN).slice(0, 60), launched = rooms.filter((r) => r.state === s.PUMP_LAUNCHED).sort((a, b) => b.launchedAt - a.launchedAt).slice(0, 30);
  const curves = await Promise.all(launched.map((r) => s.readCurve(ctx, r.mint).catch(() => null)));
  const metas = await Promise.all([...open, ...launched].map((r) => meta(r.uri)));
  const base = (r, i) => ({ room: r.address.toBase58(), name: r.name, symbol: r.symbol, ...metas[i], seatPrice: String(r.seatPrice), capacity: r.capacity, active: r.active,
    feeMode: r.feeMode, gated: r.gated, maxPerWallet: r.maxPerWallet, vest: r.vest, openedAt: r.openedAt, host: r.host.toBase58() });
  return {
    open: open.map((r, i) => base(r, i)).sort((a, b) => b.active / b.capacity - a.active / a.capacity || b.openedAt - a.openedAt),
    launched: launched.map((r, i) => {
      const c = curves[i];
      return { ...base(r, open.length + i), mint: r.mint.toBase58(), launchedAt: r.launchedAt, party: r.perSeat > 0n ? Number(r.bought / r.perSeat) : r.capacity, perSeat: String(r.perSeat),
        mcapSol: c ? Number(s.curveMarketCap(c)) / 1e9 : null, curvePct: c ? (c.complete ? 100 : Math.max(0, 100 - Number(c.realTokens * 10000n / CURVE_COINS) / 100)) : null, complete: !!(c && c.complete) };
    }),
    at: Date.now(),
  };
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET')) return;
  try {
    let out;
    try { const [hit] = await redis(['GET', 'parties:v1']); if (hit) out = JSON.parse(hit); } catch { /* list it */ }
    if (!out) { out = await list(); await redis(['SET', 'parties:v1', JSON.stringify(out), 'EX', 20]).catch(() => {}); }
    res.setHeader('cache-control', 'public, s-maxage=15, stale-while-revalidate=60');
    return res.status(200).json(out);
  } catch (e) {
    console.warn('parties', e);
    return fail(res, 502, 'Couldn’t read the parties right now.');
  }
};
