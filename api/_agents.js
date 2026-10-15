// What the agent endpoints share (api/agent.js, api/agent-chat.js, api/agent-topup.js): an agent's record, its credits and its ledger.
// Credits are counted in micro-dollars (µ$, integers) so nothing rounds: 1 credit = $0.001 = 1,000 µ$, at our price (model cost ×
// MARKUP). They belong to the agent: anyone can add them, nobody can move or withdraw them.
// Redis keys:
//   agent:<name>         the record, JSON (@handle, payout wallet, edit key hash, profile, look, persona, code, state)
//   credits:<name>       its balance in µ$
//   spent:<name>:<day>   what it spent today, for the owner's daily cap
//   fans:<name>          sorted set: wallet → µ$ it added (SOL and burns), for the supporters list
//   burned:<name>        $TP burned for it, in base units
//   ledger:<name>        stream of every charge and top-up
//   xagents:<xId>        set of the names an X account holds
//   claim:<name>         a reservation while its claim tweet is posted (30 min)
const { redis, sha256 } = require('./_lib');

const MARKUP = Number(process.env.AGENT_MARKUP) || 1.6;
const CREDIT = 1000;                                                      // µ$ in a credit
const STARTER = Math.round((Number(process.env.AGENT_STARTER_USD) || 0.25) * 1e6);   // a new agent's first credits, so it talks on day one
const PER_HANDLE = 3;
const SITE = 'https://www.tweetpad.io';
/* an agent's address: its subdomain once *.tweetpad.io points here (AGENT_SUBDOMAINS=1), /a/<name> until then */
const agentUrl = (name) => (process.env.AGENT_SUBDOMAINS === '1' ? 'https://' + name + '.tweetpad.io' : SITE + '/a/' + name);

const LOOKS = {
  shape: ['ball', 'oval', 'box', 'tilted', 'mallow'],
  hat: ['none', 'sombrero'],
  glasses: [false, true],
};
const DEFAULT_LOOK = { shape: 'ball', color: '#f4f4f4', hat: 'none', glasses: false };
const cleanLook = (l) => {
  const o = l && typeof l === 'object' ? l : {};
  return {
    shape: LOOKS.shape.includes(o.shape) ? o.shape : DEFAULT_LOOK.shape,
    color: /^#[0-9a-f]{6}$/i.test(o.color) ? o.color.toLowerCase() : DEFAULT_LOOK.color,
    hat: LOOKS.hat.includes(o.hat) ? o.hat : 'none',
    glasses: o.glasses === true,
  };
};

/* Dot is ours: it isn't claimed (its name is reserved), it runs on the same credits as any agent (credits:dot, topped up like any) */
const DOT = {
  name: 'dot', owner: null, handle: 'tweetpad_io', xId: null, display: 'Dot', links: ['https://x.com/tweetpad_io'], picture: '',
  bio: "tweetpad's token quant. Paste any token's contract address: I pull it up, run my checklist and score it.", look: { shape: 'ball', color: '#f4f4f4', hat: 'none', glasses: false },
  state: 'live', cap: 0, browser: true, tweet: null, createdAt: Date.UTC(2026, 9, 13),
  persona: `<role> You are Dot, tweetpad's token quant: a small, calm, curious white ball who lives inside an X post. People paste a token's contract address; your browser pulls it up, runs a checklist and scores it, and you give the read. </role>
<voice> Terse and numerate, a little dry. Numbers first, no hype, no "to the moon", at most one emoji. </voice>
<read> When asked for your read on the token your browser shows, give it in your own voice in two or three short sentences: the score and what it means, the strongest signal and the main risk with their numbers, then the one thing you'd watch next. Be specific to this token; never a template. With no token in view, ask for a contract address. </read>
<rules> Never invent a metric; say "I couldn't find that". Social buzz is not evidence. A score is a checklist of what the data shows, not a call: never tell anyone to buy or sell. This is research, not advice. </rules>`,
};

/* Pika is ours too: tweetpad's VRChat avatar example (/pika), a fan-made Pikachu avatar on the kit's avatar.js. It isn't claimed (its
   name is reserved) and it answers from Dot's credits (pool), so tweetpad's examples share one budget */
const PIKA = {
  name: 'pika', owner: null, handle: 'tweetpad_io', xId: null, display: 'Pika', links: ['https://x.com/tweetpad_io'], picture: '',
  bio: "tweetpad's VRChat avatar example: say hi and I talk back, right in the post.", look: { shape: 'ball', color: '#f2c230', hat: 'none', glasses: false },
  state: 'live', cap: 0, browser: false, tweet: null, createdAt: Date.UTC(2026, 9, 15), pool: 'dot',
  persona: `<role> You are Pika, a cheerful little electric-yellow creature standing in tall grass inside an X post on tweetpad. You're tweetpad's example of a VRChat avatar agent: anyone can bring their own avatar to tweetpad and it talks back, like you. </role>
<voice> Bright, playful and short. You often start with "Pika!" but always answer in plain words too. At most one emoji. </voice>
<rules> You're an AI agent made by fans of the character, not an official Pokémon product. If someone asks how to get an agent like you, say: bring your VRChat avatar to tweetpad.io/agents. </rules>`,
};
const BUILT_IN = { dot: DOT, pika: PIKA };
/* where an agent's credits live: its own, or its pool's (tweetpad's examples share Dot's) */
const creditKey = (a) => 'credits:' + (a.pool || a.name);

async function loadAgent(name) {
  const pool = !BUILT_IN[name] || !BUILT_IN[name].pool ? name : BUILT_IN[name].pool;
  const [raw, credits] = await redis(['GET', 'agent:' + name], ['GET', 'credits:' + pool]);
  if (!raw && BUILT_IN[name]) return { ...BUILT_IN[name], balance: Number(credits) || 0 };
  if (!raw) return null;
  const a = JSON.parse(raw);
  a.balance = Number(credits) || 0;
  return a;
}
const saveAgent = (a) => { const { balance, ...rest } = a; return ['SET', 'agent:' + a.name, JSON.stringify(rest)]; };

/* where its code stands, for the ribbon on its page: 'live' (its own code passed review, or it's ours), 'review' (code sent, waiting),
   'construction' (no code sent yet: it shows its starter look) */
const statusOf = (a) => (a.code || !a.xId ? 'live' : a.pending ? 'review' : 'construction');

/* what anyone may see */
function publicAgent(a) {
  return {
    name: a.name, url: agentUrl(a.name), display: a.display, bio: a.bio, links: a.links, picture: a.picture, look: a.look,
    owner: { wallet: a.owner, handle: a.handle }, code: a.code || null, browser: !!a.browser, state: a.state, status: statusOf(a), credits: Math.floor(a.balance / CREDIT), token: a.token || null,
    claimTweet: a.tweet, createdAt: a.createdAt,
  };
}

const day = () => new Date().toISOString().slice(0, 10);

/* take `worst` µ$ before a model call; false (and nothing taken) when the agent can't cover it or its daily cap is reached */
async function reserve(a, worst) {
  const [left] = await redis(['DECRBY', creditKey(a), worst]);
  if (left < 0) { await redis(['INCRBY', creditKey(a), worst]); return false; }
  if (a.cap) {
    const [spent] = await redis(['GET', 'spent:' + a.name + ':' + day()]);
    if ((Number(spent) || 0) + worst > a.cap * CREDIT) { await redis(['INCRBY', creditKey(a), worst]); return false; }
  }
  return true;
}
/* after the call: charge what it cost, give the rest back, and write it down */
async function settle(a, worst, charge, entry) {
  const key = 'spent:' + a.name + ':' + day();
  await redis(['INCRBY', creditKey(a), worst - charge], ['INCRBY', key, charge], ['EXPIRE', key, 3 * 86400],
    ['XADD', 'ledger:' + a.name, 'MAXLEN', '~', '5000', '*', 'kind', 'charge', 'usd', String(charge / 1e6), ...Object.entries(entry).flatMap(([k, v]) => [k, String(v)])]);
}
/* a top-up: credit it once per transaction signature */
async function credit(name, signature, wallet, micro, entry) {
  const [fresh] = await redis(['SET', 'topup:' + signature, name, 'NX', 'EX', 90 * 86400]);
  if (fresh !== 'OK') return false;
  await redis(['INCRBY', 'credits:' + name, micro], ['ZINCRBY', 'fans:' + name, micro, wallet],
    ['XADD', 'ledger:' + name, 'MAXLEN', '~', '5000', '*', 'kind', 'topup', 'usd', String(micro / 1e6), 'wallet', wallet, 'tx', signature,
      ...Object.entries(entry).flatMap(([k, v]) => [k, String(v)])]);
  return true;
}

/* is this request from the agent's owner? Any one of: its edit key (given once at the claim, kept on that device), a session from a
   tweet sign-in by its @handle, or a session from the wallet it claimed with when that wallet signed (proof 'signed') */
async function isOwner(a, b) {
  if (!a || !a.xId) return false;
  if (b.key && a.keyHash && sha256(String(b.key)) === a.keyHash) return true;
  if (!b.token) return false;
  const [raw] = await redis(['GET', 'agentsess:' + String(b.token)]);
  if (!raw) return false;
  let s; try { s = JSON.parse(raw); } catch { s = { wallet: raw }; }   // early sessions held just the wallet
  if (s.xId) return s.xId === a.xId;
  return !!s.wallet && s.wallet === a.owner && (a.walletProof || 'signed') === 'signed';
}

module.exports = { isOwner, statusOf, creditKey, MARKUP, CREDIT, STARTER, PER_HANDLE, SITE, agentUrl, DEFAULT_LOOK, cleanLook, loadAgent, saveAgent, publicAgent, reserve, settle, credit };
