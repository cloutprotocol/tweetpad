// Auto-claim: a creator turns it on once, with a signed message (free, no transaction), and tweetpad's keeper (api/keeper.js)
// claims their Solana creator fees to their own wallet from then on, paying the network fee itself. The keeper can only ever
// pay the creator: every instruction it sends is pump.fun's permissionless sweep / collect, whose recipient is the creator.
//   GET                                     → { wallets, claims, sol, minSol, recent: [{ wallet, sol, sig, at }] }   the page's numbers
//   GET  ?wallet=<w>                        → { wallet, on, since, claims, sol, last: { at, sol, sig } | null, minSol }
//   POST { action: 'prepare', wallet, on }  → { issued, message }   the exact text for the wallet to sign
//   POST { wallet, on, issued, signature }  → turns it on or off (the signature is good for 5 minutes, once)
const { createPublicKey, verify: edVerify } = require('node:crypto');
const { cors, readJson, isPubkey, b58decode, redis, rateLimit, fail } = require('./_lib');

const ED25519_SPKI = Buffer.from('302a300506032b6570032100', 'hex');
const MIN_SOL = Number(process.env.AUTOCLAIM_MIN_SOL) || 0.005;   // the keeper claims once fees reach this (keeps its own costs sane)
const message = (wallet, on, issued) => 'tweetpad auto-claim\n' + (on
  ? 'Turn auto-claim on. tweetpad claims this wallet\'s pump.fun creator fees to this wallet and pays the network fee. Free, no transaction.'
  : 'Turn auto-claim off for this wallet. Free, no transaction.') + '\nwallet: ' + wallet + '\nissued: ' + issued;

function signatureValid(wallet, text, signatureB58) {
  const sig = b58decode(String(signatureB58 || ''));
  if (!sig || sig.length !== 64) return false;
  try {
    const key = createPublicKey({ key: Buffer.concat([ED25519_SPKI, Buffer.from(b58decode(wallet))]), format: 'der', type: 'spki' });
    return edVerify(null, Buffer.from(text, 'utf8'), key, Buffer.from(sig));
  } catch { return false; }
}

async function stats(res) {
  res.setHeader('cache-control', 'public, s-maxage=15, stale-while-revalidate=60');
  const [wallets, total, recent] = await redis(['SCARD', 'autoclaim'], ['HMGET', 'autoclaim:total', 'claims', 'lamports'], ['LRANGE', 'autoclaim:log', 0, 19]);
  return res.status(200).json({ wallets, claims: Number(total[0]) || 0, sol: (Number(total[1]) || 0) / 1e9, minSol: MIN_SOL,
    recent: recent.map(r => JSON.parse(r)) });
}

async function status(wallet, res) {
  res.setHeader('cache-control', 'no-store');
  const [on, h] = await redis(['SISMEMBER', 'autoclaim', wallet], ['HGETALL', 'autoclaim:' + wallet]);
  const f = {};
  for (let i = 0; i < h.length; i += 2) f[h[i]] = h[i + 1];
  return res.status(200).json({ wallet, on: !!on, since: Number(f.since) || null, claims: Number(f.claims) || 0, sol: (Number(f.lamports) || 0) / 1e9,
    last: f.lastAt ? { at: Number(f.lastAt), sol: Number(f.lastLamports) / 1e9, sig: f.lastSig } : null, minSol: MIN_SOL });
}

async function toggle(b, res) {
  const { wallet, issued, signature } = b;
  const on = b.on === true;
  if (!isPubkey(wallet)) return fail(res, 400, 'invalid wallet');
  if (!Number.isFinite(issued) || Math.abs(Date.now() - issued) > 5 * 60 * 1000) return fail(res, 400, 'signature expired; try again');
  if (!signatureValid(wallet, message(wallet, on, issued), signature)) return fail(res, 400, 'wallet signature does not match');
  /* each signature works once, so an old "on" can't be replayed after an "off" */
  const [fresh] = await redis(['SET', 'autoclaim:sig:' + signature, '1', 'NX', 'EX', 600]);
  if (!fresh) return fail(res, 400, 'that signature was already used; try again');
  if (on) await redis(['SADD', 'autoclaim', wallet], ['HSETNX', 'autoclaim:' + wallet, 'since', String(Date.now())]);
  else await redis(['SREM', 'autoclaim', wallet]);
  return status(wallet, res);
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET, POST')) return;
  try {
    if (req.method === 'GET') {
      const wallet = req.query && req.query.wallet;
      if (wallet == null) return await stats(res);
      if (!isPubkey(String(wallet))) return fail(res, 400, 'invalid wallet');
      return await status(String(wallet), res);
    }
    if (req.method !== 'POST') return fail(res, 405, 'GET or POST');
    if (!await rateLimit(req, res, 'autoclaim', 20, 600)) return;
    const b = await readJson(req);
    if (!b) return fail(res, 400, 'invalid request');
    if (b.action === 'prepare') {
      if (!isPubkey(b.wallet)) return fail(res, 400, 'invalid wallet');
      const issued = Date.now();
      return res.status(200).json({ issued, message: message(b.wallet, b.on === true, issued) });
    }
    return await toggle(b, res);
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
};

module.exports.MIN_SOL = MIN_SOL;
