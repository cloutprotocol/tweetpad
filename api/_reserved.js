// Agent names: what a name may be, and the names nobody can claim (spec: "Names: name.tweetpad.io").
// A name is a DNS label as well as a path (/a/<name>, and <name>.tweetpad.io once the wildcard domain is on): 3–20 of a–z, 0–9 and
// single hyphens, not at either end. Before the reserved check a name is normalized (hyphens out, 0→o 1→l 3→e 4→a 5→s 7→t), so
// e1on, grok-ai and spacex-ai are caught too. We hold these names so nobody impersonates them; we don't use them.

/* X and the Musk companies: blocked anywhere in the name (grokbot, elonagent), so the list stays short */
const CONTAINS = ['twitter', 'grok', 'xai', 'elon', 'musk', 'spacex', 'starlink', 'tesla', 'neuralink', 'doge'];
const EXACT = [
  // X and Musk companies, short forms the contains rule would over-match
  'x', 'si', 'xsi', 'boring', 'thex', 'xcorp', 'xapp', 'xpay', 'xmoney',
  // AI labs and products
  'openai', 'chatgpt', 'gpt', 'anthropic', 'claude', 'gemini', 'google', 'deepmind', 'meta', 'llama', 'perplexity', 'mistral', 'copilot', 'microsoft', 'apple', 'nvidia',
  // crypto brands
  'solana', 'phantom', 'pump', 'pumpfun', 'pumpswap', 'coinbase', 'binance', 'jupiter', 'jup', 'raydium', 'metamask', 'uniswap', 'gamba', 'dexscreener', 'bitcoin', 'btc', 'ethereum', 'vitalik', 'satoshi', 'trump', 'melania',
  // our own
  'tweetpad', 'tweetpadio', 'tp', 'dot', 'pika', 'agent', 'agents', 'a', 'games', 'scan', 'bordrless', 'borderless', 'custom', 'autoclaim', 'kit', 'official', 'team', 'staff', 'mod', 'mods', 'moderator',
  // chains we route
  'sol', 'eth', 'base', 'bnb', 'bsc', 'rh', 'robinhood',
  // infrastructure
  'www', 'api', 'app', 'admin', 'root', 'mail', 'email', 'smtp', 'imap', 'pop', 'mx', 'ns', 'ns1', 'ns2', 'dns', 'cdn', 'static', 'assets', 'img', 'images', 'media', 'docs', 'status',
  'dev', 'staging', 'stage', 'preview', 'beta', 'test', 'auth', 'login', 'signin', 'signup', 'account', 'wallet', 'pay', 'payments', 'billing', 'support', 'help', 'blog', 'news', 'security', 'abuse',
];
const EXACT_SET = new Set(EXACT);

const normal = (name) => name.replace(/-/g, '').replace(/[013457]/g, (c) => ({ 0: 'o', 1: 'l', 3: 'e', 4: 'a', 5: 's', 7: 't' }[c] || c));

/* why a name can't be claimed, or null when it can */
function nameProblem(raw) {
  const name = String(raw || '');
  if (!/^[a-z0-9](?:[a-z0-9]|-(?!-)){1,18}[a-z0-9]$/.test(name)) return 'names are 3–20 letters, numbers and single hyphens';
  const n = normal(name);
  if (EXACT_SET.has(name) || EXACT_SET.has(n) || CONTAINS.some(w => n.includes(w))) return 'that name is reserved';
  return null;
}

module.exports = { nameProblem };
