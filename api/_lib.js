// Shared helpers for the API functions. Files starting with "_" are not deployed as routes.
const { createHash } = require('node:crypto');

const PUMP_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const RPC_URL = process.env.RPC_URL || 'https://solana-rpc.publicnode.com';
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // Vercel function request bodies cap at 4.5 MB

/* the card frame is sandboxed with an opaque ("null") origin, so even our own page calls cross-origin */
function cors(req, res, methods) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', methods + ', OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type, x-file-type, x-meta');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}

function sniffImage(b) {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 6 && b.toString('latin1', 0, 4) === 'GIF8') return 'image/gif';
  if (b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/* raw request body as a Buffer: Vercel's helpers buffer application/octet-stream into req.body */
async function readBody(req, limit) {
  if (Buffer.isBuffer(req.body)) return req.body.length > limit ? null : req.body;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = await readBody(req, 64 * 1024);
  try { return raw ? JSON.parse(raw.toString('utf8')) : null; } catch { return null; }
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58encode(bytes) {
  const digits = [];
  for (const b of bytes) {
    let carry = b;
    for (let i = 0; i < digits.length; i++) { carry += digits[i] << 8; digits[i] = carry % 58; carry = (carry / 58) | 0; }
    while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0; }
  }
  let out = '';
  for (const b of bytes) { if (b === 0) out += '1'; else break; }
  for (let i = digits.length - 1; i >= 0; i--) out += B58[digits[i]];
  return out;
}
function b58decode(str) {
  const bytes = [];
  for (const ch of str) {
    let carry = B58.indexOf(ch);
    if (carry < 0) return null;
    for (let i = 0; i < bytes.length; i++) { carry += bytes[i] * 58; bytes[i] = carry & 0xff; carry >>= 8; }
    while (carry) { bytes.push(carry & 0xff); carry >>= 8; }
  }
  for (const ch of str) { if (ch === '1') bytes.push(0); else break; }
  return Uint8Array.from(bytes.reverse());
}
const isPubkey = (s) => typeof s === 'string' && s.length >= 32 && s.length <= 44 && (b58decode(s) || []).length === 32;

/* signer keys of a serialized (legacy or v0) transaction; key counts here stay under 128, so compact-u16 is one byte */
function signerKeys(tx) {
  const sigCount = tx[0];
  const msg = tx.subarray(1 + 64 * sigCount);
  const o = (msg[0] & 0x80) ? 1 : 0;
  const required = msg[o];
  const keyCount = msg[o + 3];
  const keys = [];
  for (let i = 0; i < keyCount; i++) keys.push(b58encode(msg.subarray(o + 4 + 32 * i, o + 36 + 32 * i)));
  return { sigCount, signers: keys.slice(0, required), keys };
}

/* Upstash Redis over REST (provisioned through the Vercel Marketplace) */
async function redis(...commands) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw Object.assign(new Error('launch registry is not configured'), { status: 503 });
  const res = await fetch(url + '/pipeline', {
    method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error('registry error ' + res.status);
  const out = await res.json();
  for (const r of out) if (r.error) throw new Error('registry: ' + r.error);
  return out.map(r => r.result);
}

async function rpc(method, params) {
  const res = await fetch(RPC_URL, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const out = await res.json();
  if (out.error) throw new Error('rpc ' + method + ': ' + out.error.message);
  return out.result;
}

/* what new coins are paired with: plain SOL by default, until the platform token exists;
   QUOTE_MINT=<pump coin mint> (+ QUOTE_SYMBOL) pairs every new coin with that coin instead */
const SOL_QUOTE = { mint: null, symbol: 'SOL' };
function quoteConfig() {
  const env = (process.env.QUOTE_MINT || '').trim();
  if (isPubkey(env)) return { mint: env, symbol: (process.env.QUOTE_SYMBOL || '').trim() || 'QUOTE' };
  return SOL_QUOTE;
}

/* "crafting": a new coin can be paired with any coin launched on tweetpad, if pump.fun admits it as a quote.
   Resolves the coin's quote accounts for create_v2, or throws an error a person can read. */
const PAIR_ERRORS = {
  CurveDepthExceededError: (s) => '$' + s + ' is itself paired with a coin, and pump.fun only allows one level of pairing',
  QuoteBondingCurveNotEligibleError: (s) => '$' + s + ' cannot be a pair on pump.fun (mayhem mode)',
  QuoteCurveAwaitingMigrationError: (s) => '$' + s + ' finished its curve and is moving to PumpSwap; try again in a few minutes',
  QuotePoolNotFoundError: (s) => '$' + s + ' graduated but has no PumpSwap pool to price it',
  QuoteReservesOutOfRangeError: (s) => '$' + s + ' is priced outside what pump.fun accepts for a pair right now',
  UnsupportedQuoteMintError: (s) => '$' + s + ' is not accepted as a pair by pump.fun',
};
async function pairQuote(mint) {
  if (!isPubkey(mint)) throw Object.assign(new Error('invalid pair address'), { status: 400 });
  const [row] = await redis(['GET', 'launch:' + mint]);
  if (!row) throw Object.assign(new Error('only coins launched on tweetpad can be paired with'), { status: 400 });
  const launch = JSON.parse(row);
  const { PublicKey } = require('@solana/web3.js');
  const { OnlinePumpSdk } = require('@pump-fun/pump-sdk');
  try {
    const resolved = await new OnlinePumpSdk(connection()).resolveQuoteMint(new PublicKey(mint));
    return { mint, symbol: launch.symbol, name: launch.name, resolved };
  } catch (err) {
    const why = PAIR_ERRORS[err && err.name];
    throw Object.assign(new Error(why ? why(launch.symbol) : 'cannot pair with $' + launch.symbol + ': ' + err.message), { status: why ? 400 : 502 });
  }
}

/* DexScreener market data for up to 30 mints (the most liquid pair per coin). Each market cap seen is also kept in
   Redis (hash mcaps), so the pair picker and the hotbar can rank every coin by market cap without a call per coin. */
async function marketData(mints) {
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
      priceNative: p.priceNative ? Number(p.priceNative) : null,
      change1h: p.priceChange ? p.priceChange.h1 ?? null : null,
      change24h: p.priceChange ? p.priceChange.h24 ?? null : null,
      buys1h: p.txns && p.txns.h1 ? p.txns.h1.buys : 0,
      sells1h: p.txns && p.txns.h1 ? p.txns.h1.sells : 0,
      volume1h: p.volume ? p.volume.h1 ?? 0 : 0,
      volume24h: p.volume ? p.volume.h24 ?? 0 : 0,
      liquidity: liq,
      dex: p.dexId, pair: p.pairAddress,
    };
  }
  /* only coins launched here are kept, so the hash can't be grown with arbitrary mints */
  try {
    const known = Object.keys(market).filter(k => market[k].mcap);
    const [listed] = known.length ? await redis(['HMGET', 'launchidx', ...known]) : [[]];
    const caps = known.filter((k, i) => listed[i]).flatMap(k => [k, String(market[k].mcap)]);
    if (caps.length) await redis(['HSET', 'mcaps', ...caps]);
  } catch { /* a bonus: never fail market data over it */ }
  return market;
}

/* a feed post or reply by id (msg:<id>). Posts made before posts were kept by id are found in the feed list once,
   then stored by id and put on their author's timeline, so they can be liked, retweeted and replied to too. */
async function loadPost(id) {
  const [raw] = await redis(['GET', 'msg:' + id]);
  if (raw) return JSON.parse(raw);
  const [rows] = await redis(['LRANGE', 'chat:feed', 0, -1]);
  const hit = rows.map(r => JSON.parse(r)).find(m => String(m.id) === String(id));
  if (!hit) return null;
  await redis(['SET', 'msg:' + id, JSON.stringify(hit)], ['ZADD', 'user:posts:' + hit.wallet, hit.t, 'p:' + id]);
  return hit;
}

let conn = null;
function connection() {
  const { Connection } = require('@solana/web3.js');
  if (!conn) conn = new Connection(RPC_URL, 'confirmed');
  return conn;
}

/* a small thumbnail the browser makes at launch, so the list needs no image requests */
const MAX_THUMB_BYTES = 16 * 1024;
function cleanThumb(v) {
  const m = /^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(typeof v === 'string' ? v : '');
  if (!m) return '';
  const bytes = Buffer.from(m[2], 'base64');
  return bytes.length <= MAX_THUMB_BYTES && sniffImage(bytes) ? v : '';
}

/* fixed-window rate limit per client IP, kept in Redis: `limit` requests per `windowSec` for each bucket.
   Returns true when the request may go ahead; otherwise it has already answered 429. */
async function rateLimit(req, res, bucket, limit, windowSec) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const key = 'rl:' + bucket + ':' + ip + ':' + Math.floor(Date.now() / 1000 / windowSec);
  try {
    const [count] = await redis(['INCR', key], ['EXPIRE', key, windowSec]);
    if (count <= limit) return true;
  } catch { return true; } // never block launches because the limiter itself is down
  res.setHeader('retry-after', String(windowSec));
  fail(res, 429, 'slow down: too many requests, try again in a minute');
  return false;
}

function fail(res, status, error) {
  return res.status(status).json({ error });
}

module.exports = {
  PUMP_PROGRAM, MAX_IMAGE_BYTES, cors, sniffImage, readBody, readJson, sha256,
  b58decode, isPubkey, signerKeys, redis, rpc, connection, quoteConfig, pairQuote, marketData, loadPost, cleanThumb, rateLimit, fail,
};
