// Agents: claim a name by tweeting it, then shape it (spec: "Claim flow", "Profile").
//   GET  ?name=<name>                                   → { agent } when claimed, else { free, problem?, claiming? }
//   POST { action: 'reserve', name, wallet }            → a code and the message to sign; the name is held for that wallet 30 min
//   POST { action: 'verify', name, wallet, signature, tweet }
//        the wallet signs the claim message (proves the wallet), the tweet is read through X's public syndication endpoint (no API
//        key) and must contain the code and be from after the reservation; its author becomes the agent's @handle.
//   POST { action: 'session', wallet, issued, signature } → { token } for 24h, so the owner signs once to edit
//   POST { action: 'update', name, token, display?, bio?, links?, picture?, look?, persona?, cap?, paused? }
// Names follow api/_reserved.js. Credits, chat and top-ups are api/agent-chat.js and api/agent-topup.js.
const { randomBytes } = require('node:crypto');
const { cors, readJson, isPubkey, redis, signatureValid, readTweet, rateLimit, fail } = require('./_lib');
const { nameProblem } = require('./_reserved');
const { STARTER, PER_HANDLE, agentUrl, DEFAULT_LOOK, cleanLook, loadAgent, saveAgent, publicAgent } = require('./_agents');

const HOLD = 30 * 60;
const SESSION_TTL = 24 * 60 * 60;
const PERSONA_MAX = 6000;
const claimMessage = (name, wallet, code) => 'tweetpad agents\nClaim ' + name + ' with this wallet, by the tweet that has the code.\nname: ' + name + '\nwallet: ' + wallet + '\ncode: ' + code;
const sessionMessage = (wallet, issued) => 'tweetpad agents\nSign in to edit your agents. This is free and sends no transaction.\nwallet: ' + wallet + '\nissued: ' + issued;
const tweetText = (name, code) => 'Claiming my agent on @tweetpad_io ' + agentUrl(name) + ' ' + code;

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
  const name = String(b.name || '').toLowerCase(), wallet = b.wallet;
  if (!isPubkey(wallet)) return fail(res, 400, 'invalid wallet');
  const problem = nameProblem(name);
  if (problem) return fail(res, 400, problem);
  const [taken, held] = await redis(['EXISTS', 'agent:' + name], ['GET', 'claim:' + name]);
  if (taken) return fail(res, 409, 'that agent is already claimed');
  if (held && JSON.parse(held).wallet !== wallet) return fail(res, 409, 'someone is claiming that name right now; try again in 30 minutes');
  /* holding again keeps the same code, so a claim tweet already posted still counts */
  const prior = held && JSON.parse(held);
  const code = prior ? prior.code : 'tp-' + randomBytes(4).toString('hex'), at = prior ? prior.at : Date.now();
  if (!prior) await redis(['SET', 'claim:' + name, JSON.stringify({ wallet, code, at }), 'EX', HOLD]);
  const text = tweetText(name, code);
  return res.status(200).json({ ok: true, code, message: claimMessage(name, wallet, code), tweet: text,
    intent: 'https://x.com/intent/post?text=' + encodeURIComponent(text), until: at + HOLD * 1000 });
}

async function verify(b, res) {
  const name = String(b.name || '').toLowerCase(), wallet = b.wallet;
  if (!isPubkey(wallet)) return fail(res, 400, 'invalid wallet');
  const m = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/(?:[A-Za-z0-9_]{1,15}|i\/web)\/status\/(\d{1,25})/.exec(String(b.tweet || '').trim());
  if (!m) return fail(res, 400, 'paste the link to your tweet (x.com/you/status/…)');
  const [held] = await redis(['GET', 'claim:' + name]);
  if (!held) return fail(res, 400, 'your hold on that name ran out; start again');
  const claim = JSON.parse(held);
  if (claim.wallet !== wallet) return fail(res, 409, 'that name is held by another wallet');
  if (!signatureValid(wallet, claimMessage(name, wallet, claim.code), b.signature)) return fail(res, 400, 'wallet signature does not match');

  const t = await readTweet(m[1]);
  if (!t.text.includes(claim.code)) return fail(res, 400, 'that tweet does not contain your code ' + claim.code);
  if (Date.parse(t.created_at) < claim.at - 60000) return fail(res, 400, 'that tweet is older than your code');
  const u = t.user;
  const [count, taken] = await redis(['SCARD', 'xagents:' + u.id_str], ['EXISTS', 'agent:' + name]);
  if (taken) return fail(res, 409, 'that agent is already claimed');
  if (count >= PER_HANDLE) return fail(res, 403, '@' + u.screen_name + ' already holds ' + PER_HANDLE + ' agents');

  const a = {
    name, owner: wallet, handle: u.screen_name, xId: u.id_str, display: name, bio: '', links: [], picture: '',
    look: { ...DEFAULT_LOOK }, persona: '', state: 'live', cap: 0, tweet: 'https://x.com/' + u.screen_name + '/status/' + m[1], createdAt: Date.now(),
  };
  const [ok] = await redis(['SET', 'agent:' + name, JSON.stringify(a), 'NX']);
  if (ok !== 'OK') return fail(res, 409, 'that agent is already claimed');
  await redis(['SET', 'credits:' + name, STARTER], ['SADD', 'xagents:' + u.id_str, name], ['DEL', 'claim:' + name],
    ['XADD', 'ledger:' + name, 'MAXLEN', '~', '5000', '*', 'kind', 'starter', 'usd', String(STARTER / 1e6)]);
  return res.status(200).json({ ok: true, agent: publicAgent({ ...a, balance: STARTER }) });
}

async function session(b, res) {
  const { wallet, issued, signature } = b;
  if (!isPubkey(wallet)) return fail(res, 400, 'invalid wallet');
  if (!Number.isFinite(issued) || Math.abs(Date.now() - issued) > 5 * 60 * 1000) return fail(res, 400, 'sign-in expired; try again');
  if (!signatureValid(wallet, sessionMessage(wallet, issued), signature)) return fail(res, 400, 'wallet signature does not match');
  const token = randomBytes(24).toString('hex');
  await redis(['SET', 'agentsess:' + token, wallet, 'EX', SESSION_TTL]);
  return res.status(200).json({ ok: true, token, message: sessionMessage(wallet, issued), expires: Date.now() + SESSION_TTL * 1000 });
}

async function update(b, res) {
  const name = String(b.name || '').toLowerCase();
  const [wallet] = await redis(['GET', 'agentsess:' + String(b.token || '')]);
  if (!wallet) return fail(res, 401, 'sign in again to edit');
  const a = await loadAgent(name);
  if (!a) return fail(res, 404, 'no such agent');
  if (a.owner !== wallet) return fail(res, 403, 'only its owner can edit this agent');
  if (b.display != null) a.display = line(b.display, 32) || name;
  if (b.bio != null) a.bio = line(b.bio, 160);
  if (b.links != null) a.links = cleanLinks(b.links);
  if (b.picture != null) a.picture = cleanPicture(b.picture);
  if (b.look != null) a.look = cleanLook(b.look);
  if (b.cap != null) a.cap = Math.max(0, Math.min(1e6, Math.floor(Number(b.cap) || 0)));
  if (b.paused != null) a.state = b.paused ? 'paused' : 'live';
  if (b.persona != null) {
    const persona = String(b.persona).replace(CONTROL, ' ').trim();
    if (persona.length > PERSONA_MAX) return fail(res, 400, 'keep the persona under ' + PERSONA_MAX + ' characters');
    if (OVERRIDE.test(persona)) return fail(res, 400, 'the persona can’t tell the agent to set aside tweetpad’s rules or ask for keys');
    a.persona = persona;
  }
  await redis(saveAgent(a));
  return res.status(200).json({ ok: true, agent: publicAgent(a), persona: a.persona, cap: a.cap });
}

/* the owner's own view: persona and cap are not public */
async function mine(b, res) {
  const [wallet] = await redis(['GET', 'agentsess:' + String(b.token || '')]);
  if (!wallet) return fail(res, 401, 'sign in again to edit');
  const a = await loadAgent(String(b.name || '').toLowerCase());
  if (!a || a.owner !== wallet) return fail(res, 403, 'only its owner can see this');
  return res.status(200).json({ ok: true, persona: a.persona, cap: a.cap });
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
    if (b.action === 'reserve') return await reserve(b, res);
    if (b.action === 'verify') return await verify(b, res);
    if (b.action === 'session') return await session(b, res);
    if (b.action === 'update') return await update(b, res);
    if (b.action === 'mine') return await mine(b, res);
    return fail(res, 400, 'unknown action');
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
};
