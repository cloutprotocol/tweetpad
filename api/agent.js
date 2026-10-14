// Agents: claim a name by tweeting it, then shape it (spec: "Claim flow", "Profile"). No wallet is needed for any of it: the claim
// tweet's author owns the agent. A payout wallet is optional, pasted or connected and signed; it never goes in the tweet.
//   GET  ?name=<name>                                   → { agent } when claimed, else { free, problem?, claiming? }
//   POST { action: 'reserve', name, wallet?, hold? }    → { code, hold, tweet, intent, message? }: the name is held 30 min for this
//        browser (hold is its secret; send it back to keep the same code). With a wallet, message is what it may sign.
//   POST { action: 'verify', name, hold, tweet, signature? }
//        the tweet is read through X's public syndication endpoint (no API key) and must contain the code and be from after the
//        hold; its author becomes the agent's @handle. → { agent, key }: key is the owner's edit key, shown once, kept on the device.
//   Signing in to edit, any of: the edit key itself (key), or a session (token) from
//   POST { action: 'signin', name }                     → { nonce, code, tweet, intent }: tweet the code from the owner's account,
//   POST { action: 'signin-verify', nonce, tweet }      → { token } for 24h; or
//   POST { action: 'session', wallet, issued, signature } → { token } for 24h, for an owner whose wallet signed (at the claim, or
//        linked after it with 'link-wallet')
//   POST { action: 'link-wallet', name, key | token, wallet, issued, signature } → that wallet signs to become the agent's payout
//        wallet and a way to sign in
//   POST { action: 'update', name, key | token, display?, bio?, links?, picture?, look?, persona?, cap?, paused?, wallet? }
//   POST { action: 'mine', name, key | token }          → what only the owner sees (persona, cap, wallet, code and its review)
//   POST { action: 'newkey', name, key | token }        → { key }: a new edit key; the old one stops working
// Names follow api/_reserved.js. Credits, chat and top-ups are api/agent-chat.js and api/agent-topup.js; code is api/agent-code.js.
const { randomBytes } = require('node:crypto');
const { cors, readJson, isPubkey, redis, sha256, signatureValid, readTweet, rateLimit, fail } = require('./_lib');
const { nameProblem } = require('./_reserved');
const { STARTER, PER_HANDLE, agentUrl, DEFAULT_LOOK, cleanLook, loadAgent, saveAgent, publicAgent, isOwner } = require('./_agents');

const HOLD = 30 * 60;
const SESSION_TTL = 24 * 60 * 60;
const PERSONA_MAX = 6000;
const claimMessage = (name, wallet, code) => 'tweetpad agents\nClaim ' + name + ' with this wallet, by the tweet that has the code.\nname: ' + name + '\nwallet: ' + wallet + '\ncode: ' + code;
const sessionMessage = (wallet, issued) => 'tweetpad agents\nSign in to edit your agents. This is free and sends no transaction.\nwallet: ' + wallet + '\nissued: ' + issued;
const linkMessage = (name, wallet, issued) => 'tweetpad agents\nLink this wallet to ' + name + ': it can sign in to edit it and gets its payouts.\nname: ' + name + '\nwallet: ' + wallet + '\nissued: ' + issued;
const tweetText = (name, code) => 'Claiming my agent on @tweetpad_io ' + agentUrl(name) + ' ' + code;
const signinText = (name, code) => 'Signing in to my tweetpad agent ' + name + ' ' + code;
const intent = (text) => 'https://x.com/intent/post?text=' + encodeURIComponent(text);
const tweetId = (url) => (/^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/(?:[A-Za-z0-9_]{1,15}|i\/web)\/status\/(\d{1,25})/.exec(String(url || '').trim()) || [])[1];
const newKey = () => 'tpk_' + randomBytes(18).toString('base64url');

const CONTROL = new RegExp('[\\u0000-\\u0008\\u000b-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e]', 'g');
const line = (s, max) => String(s || '').replace(CONTROL, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanLinks = (links) => (Array.isArray(links) ? links : []).map(u => String(u || '').trim()).filter(u => u.length <= 200 && /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(u)).slice(0, 4);
/* the agent's square picture: an IPFS link made by api/ipfs.js, as coin images are */
const cleanPicture = (u) => (typeof u === 'string' && /^https:\/\/[A-Za-z0-9.-]{1,64}\/ipfs\/[A-Za-z0-9]{46,100}$/.test(u) ? u : '');
/* the persona is the owner's; the platform rules go before it in every request (api/agent-chat.js), whatever it says. This only
   turns away the obvious attempts to talk past them, so the owner hears why. */
const OVERRIDE = /\b(ignore|disregard|forget|override)\b[^.]{0,40}\b(rules|instructions|system|platform|above|previous)\b|\bseed phrase\b|\bprivate key\b/i;

async function get(req, res) {
  const name = String((req.query || {}).name || '').toLowerCase();
  if (!/^[a-z0-9-]{1,20}$/.test(name)) return res.status(200).json({ free: false, problem: nameProblem(name) });
  const a = await loadAgent(name);
  const problem = !a && nameProblem(name);
  if (problem) return res.status(200).json({ free: false, problem });
  if (a) {
    const [fans, burned] = await redis(['ZREVRANGE', 'fans:' + name, 0, 4, 'WITHSCORES'], ['GET', 'burned:' + name]);
    const top = [];
    for (let i = 0; i < fans.length; i += 2) top.push({ wallet: fans[i], usd: Number(fans[i + 1]) / 1e6 });
    res.setHeader('cache-control', 'public, s-maxage=5, stale-while-revalidate=30');
    return res.status(200).json({ agent: { ...publicAgent(a), fans: top, burned: Number(burned) || 0 } });
  }
  const [held] = await redis(['GET', 'claim:' + name]);
  res.setHeader('cache-control', 'no-store');
  return res.status(200).json({ free: !held, claiming: held ? { until: JSON.parse(held).at + HOLD * 1000 } : null });
}

async function reserve(b, res) {
  const name = String(b.name || '').toLowerCase();
  const wallet = b.wallet ? String(b.wallet).trim() : null;
  if (wallet && !isPubkey(wallet)) return fail(res, 400, 'that isn’t a Solana wallet address');
  const problem = nameProblem(name);
  if (problem) return fail(res, 400, problem);
  const [taken, held] = await redis(['EXISTS', 'agent:' + name], ['GET', 'claim:' + name]);
  if (taken) return fail(res, 409, 'that agent is already claimed');
  const prior = held && JSON.parse(held);
  /* holding again from the same browser keeps the same code, so a claim tweet already posted still counts */
  const mine = prior && b.hold && prior.holdHash === sha256(String(b.hold));
  if (prior && !mine && !(prior.wallet && prior.wallet === wallet && !prior.holdHash)) return fail(res, 409, 'someone is claiming that name right now; try again in 30 minutes');
  const hold = mine ? String(b.hold) : randomBytes(18).toString('base64url');
  const code = prior ? prior.code : 'tp-' + randomBytes(4).toString('hex'), at = prior ? prior.at : Date.now();
  const w = wallet || (prior && prior.wallet) || null;
  await redis(['SET', 'claim:' + name, JSON.stringify({ holdHash: sha256(hold), wallet: w, code, at }), 'EX', Math.max(60, HOLD - Math.floor((Date.now() - at) / 1000))]);
  const text = tweetText(name, code);
  return res.status(200).json({ ok: true, code, hold, tweet: text, intent: intent(text), until: at + HOLD * 1000, ...(w && { wallet: w, message: claimMessage(name, w, code) }) });
}

async function verify(b, res) {
  const name = String(b.name || '').toLowerCase();
  const id = tweetId(b.tweet);
  if (!id) return fail(res, 400, 'paste the link to your tweet (x.com/you/status/…)');
  const [held] = await redis(['GET', 'claim:' + name]);
  if (!held) return fail(res, 400, 'your hold on that name ran out; start again');
  const claim = JSON.parse(held);
  /* the hold proves this is the browser that started the claim (early holds were made with a wallet signature instead) */
  const signed = !!claim.wallet && signatureValid(claim.wallet, claimMessage(name, claim.wallet, claim.code), b.signature);
  if (!(b.hold && claim.holdHash === sha256(String(b.hold))) && !(signed && !claim.holdHash)) return fail(res, 409, 'start the claim again from this browser');

  const t = await readTweet(id);
  if (!t.text.includes(claim.code)) return fail(res, 400, 'that tweet does not contain your code ' + claim.code);
  if (Date.parse(t.created_at) < claim.at - 60000) return fail(res, 400, 'that tweet is older than your code');
  const u = t.user;
  const [count, taken] = await redis(['SCARD', 'xagents:' + u.id_str], ['EXISTS', 'agent:' + name]);
  if (taken) return fail(res, 409, 'that agent is already claimed');
  if (count >= PER_HANDLE) return fail(res, 403, '@' + u.screen_name + ' already holds ' + PER_HANDLE + ' agents');

  const key = newKey();
  const a = {
    name, owner: claim.wallet || null, walletProof: claim.wallet ? (signed ? 'signed' : 'declared') : null,
    handle: u.screen_name, xId: u.id_str, keyHash: sha256(key), display: name, bio: '', links: [], picture: '',
    look: { ...DEFAULT_LOOK }, persona: '', state: 'live', cap: 0, code: null, pending: null, review: null,
    tweet: 'https://x.com/' + u.screen_name + '/status/' + id, createdAt: Date.now(),
  };
  const [ok] = await redis(['SET', 'agent:' + name, JSON.stringify(a), 'NX']);
  if (ok !== 'OK') return fail(res, 409, 'that agent is already claimed');
  await redis(['SET', 'credits:' + name, STARTER], ['SADD', 'xagents:' + u.id_str, name], ['DEL', 'claim:' + name],
    ['XADD', 'ledger:' + name, 'MAXLEN', '~', '5000', '*', 'kind', 'starter', 'usd', String(STARTER / 1e6)]);
  return res.status(200).json({ ok: true, agent: publicAgent({ ...a, balance: STARTER }), key });
}

async function signin(b, res) {
  const name = String(b.name || '').toLowerCase();
  const a = await loadAgent(name);
  if (!a || !a.xId) return fail(res, 404, 'no such agent');
  const nonce = randomBytes(18).toString('base64url'), code = 'tp-' + randomBytes(4).toString('hex');
  await redis(['SET', 'signin:' + nonce, JSON.stringify({ name, code, at: Date.now() }), 'EX', HOLD]);
  const text = signinText(name, code);
  return res.status(200).json({ ok: true, nonce, code, tweet: text, intent: intent(text), handle: a.handle });
}

async function signinVerify(b, res) {
  const id = tweetId(b.tweet);
  if (!id) return fail(res, 400, 'paste the link to your tweet (x.com/you/status/…)');
  const [raw] = await redis(['GET', 'signin:' + String(b.nonce || '')]);
  if (!raw) return fail(res, 400, 'that sign-in ran out; start again');
  const s = JSON.parse(raw);
  const a = await loadAgent(s.name);
  if (!a) return fail(res, 404, 'no such agent');
  const t = await readTweet(id);
  if (t.user.id_str !== a.xId) return fail(res, 403, 'that tweet isn’t from @' + a.handle + ', who owns ' + s.name);
  if (!t.text.includes(s.code)) return fail(res, 400, 'that tweet does not contain your code ' + s.code);
  if (Date.parse(t.created_at) < s.at - 60000) return fail(res, 400, 'that tweet is older than your code');
  const token = randomBytes(24).toString('hex');
  await redis(['SET', 'agentsess:' + token, JSON.stringify({ xId: a.xId, handle: a.handle }), 'EX', SESSION_TTL], ['DEL', 'signin:' + b.nonce]);
  return res.status(200).json({ ok: true, token, expires: Date.now() + SESSION_TTL * 1000 });
}

async function session(b, res) {
  const { wallet, issued, signature } = b;
  if (!isPubkey(wallet)) return fail(res, 400, 'invalid wallet');
  if (!Number.isFinite(issued) || Math.abs(Date.now() - issued) > 5 * 60 * 1000) return fail(res, 400, 'sign-in expired; try again');
  if (!signatureValid(wallet, sessionMessage(wallet, issued), signature)) return fail(res, 400, 'wallet signature does not match');
  const token = randomBytes(24).toString('hex');
  await redis(['SET', 'agentsess:' + token, JSON.stringify({ wallet }), 'EX', SESSION_TTL]);
  return res.status(200).json({ ok: true, token, expires: Date.now() + SESSION_TTL * 1000 });
}

/* the agent, when this request is from its owner; otherwise answers and returns null */
async function owned(b, res) {
  const a = await loadAgent(String(b.name || '').toLowerCase());
  if (!a) { fail(res, 404, 'no such agent'); return null; }
  if (!await isOwner(a, b)) { fail(res, 401, 'sign in as its owner to do that'); return null; }
  return a;
}
const ownerView = (a) => ({ persona: a.persona, cap: a.cap, wallet: a.owner, walletProof: a.owner ? a.walletProof || 'signed' : null,
  code: a.code || null, pending: a.pending || null, review: a.review || null });

async function update(b, res) {
  const a = await owned(b, res);
  if (!a) return;
  if (b.display != null) a.display = line(b.display, 32) || a.name;
  if (b.bio != null) a.bio = line(b.bio, 160);
  if (b.links != null) a.links = cleanLinks(b.links);
  if (b.picture != null) a.picture = cleanPicture(b.picture);
  if (b.look != null) a.look = cleanLook(b.look);
  if (b.cap != null) a.cap = Math.max(0, Math.min(1e6, Math.floor(Number(b.cap) || 0)));
  if (b.paused != null) a.state = b.paused ? 'paused' : 'live';
  if (b.wallet != null && b.wallet !== a.owner) {
    const w = String(b.wallet).trim();
    if (w && !isPubkey(w)) return fail(res, 400, 'that isn’t a Solana wallet address');
    a.owner = w || null; a.walletProof = w ? 'declared' : null;
  }
  if (b.persona != null) {
    const persona = String(b.persona).replace(CONTROL, ' ').trim();
    if (persona.length > PERSONA_MAX) return fail(res, 400, 'keep the persona under ' + PERSONA_MAX + ' characters');
    if (OVERRIDE.test(persona)) return fail(res, 400, 'the persona can’t tell the agent to set aside tweetpad’s rules or ask for keys');
    a.persona = persona;
  }
  await redis(saveAgent(a));
  return res.status(200).json({ ok: true, agent: publicAgent(a), ...ownerView(a) });
}

async function linkWallet(b, res) {
  const a = await owned(b, res);
  if (!a) return;
  const { wallet, issued, signature } = b;
  if (!isPubkey(wallet)) return fail(res, 400, 'invalid wallet');
  if (!Number.isFinite(issued) || Math.abs(Date.now() - issued) > 5 * 60 * 1000) return fail(res, 400, 'that signature expired; try again');
  if (!signatureValid(wallet, linkMessage(a.name, wallet, issued), signature)) return fail(res, 400, 'wallet signature does not match');
  a.owner = wallet; a.walletProof = 'signed';
  await redis(saveAgent(a));
  return res.status(200).json({ ok: true, agent: publicAgent(a), ...ownerView(a) });
}

async function mine(b, res) {
  const a = await owned(b, res);
  if (a) return res.status(200).json({ ok: true, ...ownerView(a) });
}

async function rekey(b, res) {
  const a = await owned(b, res);
  if (!a) return;
  const key = newKey();
  a.keyHash = sha256(key);
  await redis(saveAgent(a));
  return res.status(200).json({ ok: true, key });
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET, POST')) return;
  try {
    if (req.method === 'GET') return await get(req, res);
    if (req.method !== 'POST') return fail(res, 405, 'GET or POST');
    res.setHeader('cache-control', 'no-store');
    if (!await rateLimit(req, res, 'agent', 40, 600)) return;
    const b = await readJson(req);
    if (!b) return fail(res, 400, 'invalid JSON');
    const run = { reserve, verify, signin, 'signin-verify': signinVerify, session, 'link-wallet': linkWallet, update, mine, newkey: rekey }[b.action];
    if (!run) return fail(res, 400, 'unknown action');
    return await run(b, res);
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
};
