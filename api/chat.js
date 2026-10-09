// Live chat with persistence: a lobby plus one room per coin, the last 200 messages each, kept in Redis.
// "Live" is polling: GET is cached at the CDN for 2s, so a room costs about the same for 1 viewer or 10,000.
// Writing needs a session: the wallet signs one message (free, no transaction) and gets a token for 24h.
//   POST { action: 'session', wallet, issued, signature } → { token }
//   POST { action: 'send', token, room, text }            → { message }
//   GET  ?room=lobby|<mint>                               → { messages } (oldest first)
const { createPublicKey, verify: edVerify, randomBytes } = require('node:crypto');
const { cors, readJson, isPubkey, b58decode, redis, rateLimit, fail } = require('./_lib');

const KEEP = 200;            // messages stored per room
const SHOW = 60;             // messages returned per poll
const MAX_LEN = 200;
const SESSION_TTL = 24 * 60 * 60;
const ED25519_SPKI = Buffer.from('302a300506032b6570032100', 'hex');
/* a short, deliberately small filter; real moderation is on the checklist */
const BLOCKED = /\b(n[i1]gg(?:er|a)|f[a@]gg?[o0]t|k[i1]ke|retard)s?\b/i;

const sessionMessage = (wallet, issued) => 'Tweetpad chat\nSign in to chat as this wallet. This is free and sends no transaction.\nwallet: ' + wallet + '\nissued: ' + issued;
const validRoom = (room) => room === 'lobby' || isPubkey(room);

function signatureValid(wallet, message, signatureB58) {
  const sig = b58decode(String(signatureB58 || ''));
  if (!sig || sig.length !== 64) return false;
  try {
    const key = createPublicKey({ key: Buffer.concat([ED25519_SPKI, Buffer.from(b58decode(wallet))]), format: 'der', type: 'spki' });
    return edVerify(null, Buffer.from(message, 'utf8'), key, Buffer.from(sig));
  } catch { return false; }
}

/* one line of plain text: no control characters, collapsed whitespace */
const CONTROL = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e]', 'g');
const clean = (text) => String(text || '').replace(CONTROL, ' ').replace(/\s+/g, ' ').trim();

async function session(b, res) {
  const { wallet, issued, signature } = b;
  if (!isPubkey(wallet)) return fail(res, 400, 'invalid wallet');
  if (!Number.isFinite(issued) || Math.abs(Date.now() - issued) > 5 * 60 * 1000) return fail(res, 400, 'sign-in expired; try again');
  if (!signatureValid(wallet, sessionMessage(wallet, issued), signature)) return fail(res, 400, 'wallet signature does not match');
  const token = randomBytes(24).toString('hex');
  await redis(['SET', 'chatsess:' + token, wallet, 'EX', SESSION_TTL]);
  return res.status(200).json({ ok: true, token, expires: Date.now() + SESSION_TTL * 1000 });
}

async function send(b, res) {
  const room = String(b.room || '');
  const text = clean(b.text);
  if (!validRoom(room)) return fail(res, 400, 'unknown room');
  if (!text) return fail(res, 400, 'say something');
  if (text.length > MAX_LEN) return fail(res, 400, 'keep it under ' + MAX_LEN + ' characters');
  if (BLOCKED.test(text)) return fail(res, 400, 'that message is not allowed');
  const [wallet] = await redis(['GET', 'chatsess:' + String(b.token || '')]);
  if (!wallet) return fail(res, 401, 'chat session expired; sign in again');
  /* one message every 2 seconds per wallet */
  const [slot] = await redis(['SET', 'chatslow:' + wallet, '1', 'NX', 'EX', 2]);
  if (slot !== 'OK') return fail(res, 429, 'slow down a little');
  const [profileRaw, id] = await redis(['GET', 'profile:' + wallet], ['INCR', 'chat:seq']);
  const profile = profileRaw ? JSON.parse(profileRaw) : null;
  const message = { id, room, wallet, handle: profile ? profile.handle : null, avatar: profile ? profile.avatar : null, text, t: Date.now() };
  await redis(['LPUSH', 'chat:' + room, JSON.stringify(message)], ['LTRIM', 'chat:' + room, 0, KEEP - 1]);
  return res.status(200).json({ ok: true, message });
}

async function list(req, res) {
  const room = String((req.query && req.query.room) || 'lobby');
  if (!validRoom(room)) return fail(res, 400, 'unknown room');
  const [rows] = await redis(['LRANGE', 'chat:' + room, 0, SHOW - 1]);
  res.setHeader('cache-control', 'public, s-maxage=2, stale-while-revalidate=5');
  return res.status(200).json({ room, messages: rows.map(r => JSON.parse(r)).reverse() });
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET, POST')) return;
  try {
    if (req.method === 'GET') return await list(req, res);
    if (req.method !== 'POST') return fail(res, 405, 'GET or POST');
    res.setHeader('cache-control', 'no-store');
    if (!await rateLimit(req, res, 'chat', 120, 600)) return;
    const b = await readJson(req);
    if (!b) return fail(res, 400, 'invalid JSON');
    if (b.action === 'session') return await session(b, res);
    if (b.action === 'send') return await send(b, res);
    return fail(res, 400, 'unknown action');
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
};
