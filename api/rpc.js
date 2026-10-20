// Solana mainnet RPC for launch parties (/api/rpc): the party SDK in the browser reads and sends through here, so the keyed RPC's
// URL stays on the server (Launch Party's integration guide §3: "never ship an RPC key in browser code"). It forwards only the
// methods the SDK uses, and getProgramAccounts only for the party program (rooms and seats). The key is SOLANA_RPC_URL; without
// one it falls back to Solana's own public RPC, which works but is rate-limited.
const { cors, readJson, rateLimit, fail } = require('./_lib');

const UPSTREAM = process.env.SOLANA_RPC_URL || process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const PARTY_PUMP = '8hXVfRTobBpfhFHajEktYM7cVhpfmacKmBhC2tjtwDjC';   // party_pump on mainnet
const METHODS = new Set(['getAccountInfo', 'getMultipleAccounts', 'getBalance', 'getLatestBlockhash', 'getMinimumBalanceForRentExemption', 'getSignatureStatuses',
  'getTokenAccountBalance', 'getTransaction', 'sendTransaction', 'simulateTransaction', 'getRecentPrioritizationFees', 'getFeeForMessage', 'getSlot', 'getBlockHeight',
  'isBlockhashValid', 'getEpochInfo', 'getVersion', 'getGenesisHash', 'getProgramAccounts']);
const allowed = (c) => c && c.jsonrpc === '2.0' && METHODS.has(c.method) && (c.method !== 'getProgramAccounts' || (Array.isArray(c.params) && c.params[0] === PARTY_PUMP));

module.exports = async (req, res) => {
  if (cors(req, res, 'POST')) return;
  if (req.method !== 'POST') return fail(res, 405, 'POST');
  if (!(await rateLimit(req, res, 'rpc', 300, 60))) return;
  const body = await readJson(req);
  const calls = Array.isArray(body) ? body : [body];
  if (!calls.length || calls.length > 20 || !calls.every(allowed)) return fail(res, 400, 'not a call this RPC forwards');
  try {
    const r = await fetch(UPSTREAM, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(25000) });
    res.setHeader('cache-control', 'no-store');
    res.setHeader('content-type', 'application/json');
    return res.status(r.status).send(await r.text());
  } catch {
    return fail(res, 502, 'Solana RPC unavailable');
  }
};
