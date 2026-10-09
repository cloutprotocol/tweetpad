// Profiles: a wallet linked to an X account.
// Linking needs both halves, so nobody can claim someone else's wallet or someone else's handle:
//   1. POST { action: 'start', wallet }                → a one-time code for that wallet (1h)
//   2. the user tweets the code from their X account
//   3. POST { action: 'verify', wallet, tweet, signature } → the wallet signs a message with the code (proves the
//      wallet), the tweet is read through X's public syndication endpoint (no API key) and must contain the code,
//      be from after step 1, and its author becomes the wallet's verified @handle.
// GET ?wallet=<w> or ?wallets=<w>,<w>,…  → profiles (null where none).
const { createPublicKey, verify: edVerify, randomBytes } = require('node:crypto');
const { cors, readJson, isPubkey, b58decode, redis, rateLimit, fail } = require('./_lib');

const CODE_TTL = 60 * 60;
const MAX_BATCH = 50;
const ED25519_SPKI = Buffer.from('302a300506032b6570032100', 'hex');

const challengeMessage = (wallet, code) => 'tweetpad profile\nLink this wallet to the X account that tweets the code.\nwallet: ' + wallet + '\ncode: ' + code;

function signatureValid(wallet, message, signatureB58) {
  const sig = b58decode(String(signatureB58 || ''));
  if (!sig || sig.length !== 64) return false;
  try {
    const key = createPublicKey({ key: Buffer.concat([ED25519_SPKI, Buffer.from(b58decode(wallet))]), format: 'der', type: 'spki' });
    return edVerify(null, Buffer.from(message, 'utf8'), key, Buffer.from(sig));
  } catch { return false; }
}

/* X's embed endpoint; the token is the one its widget derives from the id */
async function readTweet(id) {
  const token = ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
  const r = await fetch('https://cdn.syndication.twimg.com/tweet-result?id=' + id + '&token=' + token, { signal: AbortSignal.timeout(8000) });
  if (r.status === 404) throw Object.assign(new Error('tweet not found (is it public, and not deleted?)'), { status: 404 });
  if (!r.ok) throw new Error('could not read the tweet (' + r.status + ')');
  const t = await r.json();
  if (!t || !t.user || !t.text) throw Object.assign(new Error('tweet not found (is it public?)'), { status: 404 });
  return t;
}

async function start(b, res) {
  const wallet = b.wallet;
  if (!isPubkey(wallet)) return fail(res, 400, 'invalid wallet');
  const code = 'tp-' + randomBytes(5).toString('hex');
  await redis(['SET', 'challenge:' + wallet, JSON.stringify({ code, at: Date.now() }), 'EX', CODE_TTL]);
  return res.status(200).json({ ok: true, code, message: challengeMessage(wallet, code) });
}

async function verify(b, res) {
  const wallet = b.wallet;
  if (!isPubkey(wallet)) return fail(res, 400, 'invalid wallet');
  const m = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/(?:[A-Za-z0-9_]{1,15}|i\/web)\/status\/(\d{1,25})/.exec(String(b.tweet || '').trim());
  if (!m) return fail(res, 400, 'paste the link to your tweet (x.com/you/status/…)');
  const [raw] = await redis(['GET', 'challenge:' + wallet]);
  if (!raw) return fail(res, 400, 'your code expired; start again');
  const challenge = JSON.parse(raw);
  if (!signatureValid(wallet, challengeMessage(wallet, challenge.code), b.signature)) return fail(res, 400, 'wallet signature does not match');

  const t = await readTweet(m[1]);
  if (!t.text.includes(challenge.code)) return fail(res, 400, 'that tweet does not contain your code ' + challenge.code);
  if (Date.parse(t.created_at) < challenge.at - 60000) return fail(res, 400, 'that tweet is older than your code');

  const u = t.user;
  const profile = {
    wallet, handle: u.screen_name, name: u.name, xId: u.id_str,
    avatar: (u.profile_image_url_https || '').replace('_normal.', '_bigger.'),
    tweet: 'https://x.com/' + u.screen_name + '/status/' + m[1], verifiedAt: Date.now(),
  };
  /* one wallet per X account: re-verifying from a new wallet moves the link */
  const [previous] = await redis(['GET', 'xwallet:' + profile.xId]);
  const cmds = [['SET', 'profile:' + wallet, JSON.stringify(profile)], ['SET', 'xwallet:' + profile.xId, wallet], ['DEL', 'challenge:' + wallet]];
  if (previous && previous !== wallet) cmds.push(['DEL', 'profile:' + previous]);
  await redis(...cmds);
  return res.status(200).json({ ok: true, profile });
}

async function get(req, res) {
  const q = req.query || {};
  const wallets = String(q.wallets || q.wallet || '').split(',').filter(Boolean);
  if (!wallets.length || wallets.length > MAX_BATCH || !wallets.every(isPubkey)) return fail(res, 400, 'pass 1–' + MAX_BATCH + ' wallets');
  const [rows] = await redis(['MGET', ...wallets.map(w => 'profile:' + w)]);
  const profiles = Object.fromEntries(wallets.map((w, i) => [w, rows[i] ? JSON.parse(rows[i]) : null]));
  res.setHeader('cache-control', q.fresh ? 'no-store' : 'public, s-maxage=30, stale-while-revalidate=300');
  return res.status(200).json({ profiles });
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET, POST')) return;
  try {
    if (req.method === 'GET') return await get(req, res);
    if (req.method !== 'POST') return fail(res, 405, 'GET or POST');
    res.setHeader('cache-control', 'no-store');
    if (!await rateLimit(req, res, 'profile', 20, 600)) return;
    const b = await readJson(req);
    if (!b) return fail(res, 400, 'invalid JSON');
    if (b.action === 'start') return await start(b, res);
    if (b.action === 'verify') return await verify(b, res);
    return fail(res, 400, 'unknown action');
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
};
