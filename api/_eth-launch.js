// Ethereum mainnet launches, through Launch Party's CustomLaunch (0x3481…7e76). CustomLaunch only takes a launch that carries
// an EIP-712 permit from Launch Party's signer, so Launch Party's public review (party.studio custom/prepare) packs its
// "claus" template (a fixed-supply token and a fee hook: fixed, or behind a managed proxy its creator can repoint or freeze),
// reviews it, signs the permit (30 minutes) and returns the submission.
// The creator's browser asks for it (so every creator has Launch Party's per-IP limit to themselves, not tweetpad's servers);
// this file checks that what came back is exactly what was asked for, rebuilds launchSolo itself, estimates gas and checks the
// wallet can pay. Nothing here signs. Checked against mainnet 2026-10-11: ~2.62M gas, 0.001 ETH fee, and the 0.001 ETH sell-check
// buy sent with the launch is returned within it. Files starting with "_" are not routes.
const { encodeFunctionData, encodeAbiParameters, decodeAbiParameters, keccak256, getContractAddress, getAddress, parseEther, createPublicClient, http } = require('viem');

const API = 'https://party.studio/api/v1/chains/1/custom';
const RPC = process.env.ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com';
const CUSTOM_LAUNCH = '0x3481909A7067F8DdDd4DD9b3e544256F58Ee7e76';
const GRAPHS = '0x615B99Aa4C6EF7e36fF9F76541dA473DE2d42075';        // CustomLaunch.graphs(): where the contracts are CREATE2'd
const POOL_MANAGER = '0x000000000004444c5dc75cB358380D2e3dE08A90';  // Uniswap v4 on Ethereum
const NATIVE = '0x0000000000000000000000000000000000000000';
const MAX_FEE = parseEther('0.001');     // Launch Party's one-time fee today (GET templates → fee); a higher one is refused
const PROBE = parseEther('0.001');       // the sell check's test buy, sent with the launch and returned in it
const TX_GAS_CAP = 16777216n;            // EIP-7825 per-transaction cap
const HOOK_FLAGS = 68;                   // afterSwap | afterSwapReturnDelta, in the hook address's low bits
/* the claus template's creation code, without constructor args (Launch Party packages/core/src/customTemplateCode.ts,
   TEMPLATE_TOKEN_CODE and FEE_HOOK_V1_CODE): a review's contracts must be exactly these plus the args asked for */
const TOKEN_CODE = { bytes: 3699, hash: '0xff34f02e5b1c5ecdb8461e155751cc9e949ab4f8bb5ed0811e83ce03a356def8' };
const HOOK_CODE = { bytes: 2497, hash: '0x12e12ae5f9b326ca48236cc4773859092bd199d6f6e1f7da1bd4eff4e5248bd8' };
const PROXY_CODE = { bytes: 1647, hash: '0xcdea990d2c3288fa3821cf1a9e2252cfe085b27786fa9c116d03d011c3f65ca8' };   // ManagedHookProxy (admin, implementation)
const TOKEN_RUNTIME = '0xf615915ba79af1c2c41819337997eb60ee927332803ee4ff677f3636266baa87';   // every TemplateToken deploys this
const PROXY_RUNTIME = '0x5b214afccf2c1ef0cf7edb62842387ba37a28ddeb86a62d9368694dddf8f6324';   // and every ManagedHookProxy this

/* tweetpad's launch settings. The swap fee always goes to the creator's wallet. The launch form uses the defaults: a hook fixed
   forever and no team share. The custom page (/custom) may also ask for an upgradeable hook (the creator, as the proxy's admin,
   can point it at new logic or freeze it, in public) and a team share of supply that vests to the creator. */
const FEE_PCTS = [0, 1, 2, 3, 5];
const OPENING_ETH = ['2', '5', '10', '25'];
const TEAM_PCTS = [0, 5, 10, 20];           // Launch Party flags a share over 20%; tweetpad stops there
const TEAM_VEST_DAYS = [30, 60, 90, 120];   // Launch Party's limits on Ethereum: 30–120 days
const SUPPLY = 10n ** 27n;                   // the template's default: 1,000,000,000 tokens of 18 decimals
/* the token's socials, as Launch Party writes them (normalizedTokenLinks: each link through URL, website then twitter) */
const socialsOf = (s) => JSON.stringify({ ...(s.website ? { website: new URL(s.website).href } : {}), ...(s.twitter ? { twitter: new URL(s.twitter).href } : {}) });

const GRAPH = { type: 'tuple', components: [
  { name: 'targets', type: 'tuple[]', components: [{ name: 'salt', type: 'bytes32' }, { name: 'initCode', type: 'bytes' }] },
  { name: 'inits', type: 'tuple[]', components: [{ name: 'target', type: 'uint8' }, { name: 'data', type: 'bytes' }] },
  { name: 'token', type: 'uint8' }, { name: 'hook', type: 'uint8' },
] };
const TERMS = { type: 'tuple', components: [
  { name: 'pair', type: 'address' }, { name: 'lpFee', type: 'uint24' }, { name: 'openingFdv', type: 'uint256' }, { name: 'crewBps', type: 'uint16' },
  { name: 'vestDuration', type: 'uint64' }, { name: 'probeIn', type: 'uint256' }, { name: 'hookImpl', type: 'address' }, { name: 'fee', type: 'uint256' },
  { name: 'manifestHash', type: 'bytes32' }, { name: 'teamBps', type: 'uint16' }, { name: 'teamVest', type: 'uint64' }, { name: 'teamTo', type: 'address' },
] };
const PERMIT = { type: 'tuple', components: [{ name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'codehashes', type: 'bytes32[]' }, { name: 'signature', type: 'bytes' }] };
const LAUNCH_ABI = [{ type: 'function', name: 'launchSolo', stateMutability: 'payable', inputs: [{ name: 'pm', ...PERMIT }, { name: 'g', ...GRAPH }, { name: 't', ...TERMS }],
  outputs: [{ name: 'token', type: 'address' }, { name: 'poolId', type: 'bytes32' }] }];

const bad = (msg, status = 400) => Object.assign(new Error(msg), { status });
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
let client;
const rpc = () => (client = client || createPublicClient({ transport: http(RPC, { timeout: 15000 }) }));

/* a launch's terms in one hash: what was approved here, compared with CustomLaunch's own record of the coin before it is listed */
const termsHash = (t) => keccak256(encodeAbiParameters([TERMS], [t]));

/* the launch's settings, checked: what the browser sends Launch Party, and what its answer must match */
function settings(a) {
  const account = getAddress(a.wallet);
  const name = String(a.name || '').trim(), symbol = String(a.symbol || '').trim();
  const feePct = typeof a.feePct === 'number' ? a.feePct : /^\d+$/.test(String(a.feePct ?? '')) ? Number(a.feePct) : NaN;   // never '' → 0
  const openingValue = String(a.openingValue || '');
  if (!name || name.length > 32) throw bad('name must be 1–32 characters');
  if (!/^[A-Z0-9]{2,10}$/.test(symbol)) throw bad('ticker must be 2–10 letters or numbers');
  if (!FEE_PCTS.includes(feePct)) throw bad('fee must be one of ' + FEE_PCTS.join(', ') + '%');
  if (!OPENING_ETH.includes(openingValue)) throw bad('starting value must be one of ' + OPENING_ETH.join(', ') + ' ETH');
  if (typeof a.uri !== 'string' || !/^https:\/\/[A-Za-z0-9.-]{1,64}\/ipfs\/[A-Za-z0-9]{46,100}$/.test(a.uri)) throw bad('metadata must be an IPFS link');
  const twitter = typeof a.twitter === 'string' && /^https:\/\/\S{3,200}$/.test(a.twitter) ? a.twitter : '';
  const website = typeof a.website === 'string' && /^https:\/\/\S{3,200}$/.test(a.website) ? a.website : '';
  const hook = a.hook == null ? 'fixed' : a.hook;
  if (hook !== 'fixed' && hook !== 'upgradeable') throw bad('hook must be fixed or upgradeable');
  const teamPct = a.teamPct == null ? 0 : Number(a.teamPct), teamVestDays = teamPct ? Number(a.teamVestDays) : 0;
  if (!TEAM_PCTS.includes(teamPct)) throw bad('team share must be one of ' + TEAM_PCTS.join(', ') + '%');
  if (teamPct && !TEAM_VEST_DAYS.includes(teamVestDays)) throw bad('team share vesting must be one of ' + TEAM_VEST_DAYS.join(', ') + ' days');
  return { account, name, symbol, feePct, openingValue, uri: a.uri, twitter, website, upgradeable: hook === 'upgradeable', teamPct, teamVestDays };
}

/* the body for party.studio's custom/prepare (the browser sends it, then hands the answer to buildEthLaunch) */
function prepareRequest(s) {
  return { template: 'claus', account: s.account,
    params: { name: s.name, symbol: s.symbol, uri: s.uri, feePct: s.feePct, feeRecipient: s.account, upgradeable: s.upgradeable,
      ...(s.website ? { website: s.website } : {}), ...(s.twitter ? { twitter: s.twitter } : {}) },
    launch: { kind: 'solo', pair: 'native', openingValue: s.openingValue,
      ...(s.teamPct ? { team: { pct: s.teamPct, vestDays: s.teamVestDays, to: s.account } } : {}) } };
}

/* a template's creation code followed by exactly one set of constructor args: the args, or null if the code is anything else */
function argsAfter(initCode, code, types) {
  const T = types.map((type) => ({ type }));
  if (typeof initCode !== 'string' || initCode.length < 2 + code.bytes * 2 || keccak256(initCode.slice(0, 2 + code.bytes * 2)) !== code.hash) return null;
  const tail = '0x' + initCode.slice(2 + code.bytes * 2);
  try { const v = decodeAbiParameters(T, tail); return encodeAbiParameters(T, v) === tail ? v : null; } catch { return null; }
}
const predict = (launchId, t) => getContractAddress({ opcode: 'CREATE2', from: GRAPHS,
  salt: keccak256(encodeAbiParameters([{ type: 'bytes32' }, { type: 'bytes32' }], [launchId, t.salt])), bytecodeHash: keccak256(t.initCode) });

/**
 * Launch Party's answer, checked against the settings, rebuilt into the transaction for the creator's wallet.
 * @returns { to, data, value, gas, chainId, token, hook, expiresAt, findings }   (value and gas bigint)
 */
async function buildEthLaunch(s, j) {
  if (!j || typeof j !== 'object') throw bad('Launch Party\'s review did not answer');
  const blocks = (j.findings || []).filter((f) => f && f.level === 'block');
  if (!j.ok || !j.permit || !j.submission) throw bad(blocks.map((f) => f.message).join(' ') || j.error || 'the launch did not pass Launch Party\'s review', 422);
  const sub = j.submission, t = sub.terms, g = sub.graph;
  if (!t || !g || !Array.isArray(g.targets) || !Array.isArray(g.inits) || g.targets.some((x) => !x || typeof x.salt !== 'string' || typeof x.initCode !== 'string'))
    throw bad('Launch Party\'s review came back malformed', 502);
  let terms, permit;
  try {
    terms = { ...t, openingFdv: BigInt(t.openingFdv), vestDuration: BigInt(t.vestDuration), probeIn: BigInt(t.probeIn), fee: BigInt(t.fee), teamVest: BigInt(t.teamVest) };
    permit = { nonce: BigInt(j.permit.nonce), deadline: BigInt(j.permit.deadline), codehashes: j.permit.codehashes, signature: j.permit.signature };
  } catch { throw bad('Launch Party\'s review came back malformed', 502); }

  /* exactly what was asked: the permit binds the creator to it */
  const wrong = [];
  if (sub.kind !== 'solo' || !same(sub.team, s.account)) wrong.push('wallet or launch type');
  if (terms.pair !== NATIVE || terms.lpFee !== 0 || terms.crewBps !== 0) wrong.push('pool');
  if (terms.openingFdv !== parseEther(s.openingValue)) wrong.push('starting value');
  if (terms.fee > MAX_FEE || terms.probeIn !== PROBE) wrong.push('fee or test buy');
  const teamBps = s.teamPct * 100, teamVest = BigInt(s.teamVestDays * 86400);
  if (terms.teamBps !== teamBps || terms.teamVest !== teamVest || !same(terms.teamTo, teamBps ? s.account : NATIVE)) wrong.push('team share');
  /* a fixed hook is two contracts, the token and the hook; an upgradeable one adds the managed proxy in front of the hook's
     logic, and the proxy is the pool's hook. Nothing runs after them. */
  const n = s.upgradeable ? 3 : 2;
  if (permit.nonce !== BigInt(sub.nonce) || g.targets.length !== n || g.inits.length !== 0 || g.token !== 0 || g.hook !== n - 1 || sub.hookFlags !== HOOK_FLAGS)
    throw bad('Launch Party\'s review came back with other contracts than asked; nothing to sign', 502);
  /* the template token (name, symbol, supply, to, uri, socials) and the FeeHookV1 (pool manager, recipient, fee), and nothing else */
  const tok = argsAfter(g.targets[0].initCode, TOKEN_CODE, ['string', 'string', 'uint256', 'address', 'string', 'string']);
  if (!tok || tok[0] !== s.name || tok[1] !== s.symbol || tok[2] !== SUPPLY || !same(tok[3], CUSTOM_LAUNCH) || tok[4] !== s.uri || tok[5] !== socialsOf(s)) wrong.push('token');
  const hk = argsAfter(g.targets[1].initCode, HOOK_CODE, ['address', 'address', 'uint16']);
  if (!hk || !same(hk[0], POOL_MANAGER) || !same(hk[1], s.account) || hk[2] !== Math.round(s.feePct * 100)) wrong.push('fee hook');
  if (!Array.isArray(permit.codehashes) || permit.codehashes.length !== n || permit.codehashes[0] !== TOKEN_RUNTIME
    || (s.upgradeable && permit.codehashes[2] !== PROXY_RUNTIME)) wrong.push('approved code');
  const launchId = keccak256(encodeAbiParameters([{ type: 'uint256' }, { type: 'address' }, { type: 'uint256' }], [1n, s.account, permit.nonce]));
  const token = predict(launchId, g.targets[0]), logic = predict(launchId, g.targets[1]), hook = predict(launchId, g.targets[n - 1]);
  if (s.upgradeable) {
    /* the proxy: the creator is its admin, and it points at exactly the logic deployed beside it, which the terms name too */
    const px = argsAfter(g.targets[2].initCode, PROXY_CODE, ['address', 'address']);
    if (!px || !same(px[0], s.account) || !same(px[1], logic) || !same(terms.hookImpl, logic)) wrong.push('hook operator');
  } else if (!same(terms.hookImpl, NATIVE)) wrong.push('hook operator');
  if (!same(token, j.token) || !same(hook, j.hook) || (BigInt(hook) & 0x3fffn) !== BigInt(HOOK_FLAGS)) wrong.push('addresses');
  if (wrong.length) throw bad('Launch Party\'s review came back with other ' + wrong.join(', ') + ' than asked; nothing to sign', 502);
  if (Number(permit.deadline) * 1000 < Date.now() + 60000) throw bad('Launch Party\'s approval has expired; launch again', 400);

  /* the transaction, as Launch Party's own planCustomSolo builds it; gas estimated from the creator's wallet, which must cover it */
  const value = terms.fee + terms.probeIn;
  const data = encodeFunctionData({ abi: LAUNCH_ABI, functionName: 'launchSolo', args: [permit, g, terms] });
  const c = rpc();
  let est;
  try { est = await c.estimateGas({ account: s.account, to: CUSTOM_LAUNCH, data, value }); }
  catch (err) { throw bad('the launch would fail on chain: ' + String(err.shortMessage || err.message).slice(0, 160), 400); }
  const [balance, gasPrice] = await Promise.all([c.getBalance({ address: s.account }), c.getGasPrice()]);
  let gas = est * 12n / 10n;
  if (gas > TX_GAS_CAP) gas = TX_GAS_CAP;
  const need = value + gas * gasPrice;
  if (balance < need) throw bad('not enough ETH: this launch needs about ' + (Number(need) / 1e18).toFixed(4) + ' ETH with gas (0.001 of it comes back in the launch)');
  return { to: CUSTOM_LAUNCH, data, value, gas, chainId: 1, token: getAddress(j.token), hook: getAddress(j.hook), fee: terms.fee,
    termsHash: termsHash(terms), upgradeable: s.upgradeable, teamPct: s.teamPct, expiresAt: Number(permit.deadline) * 1000, findings: j.findings || [] };
}

module.exports = { settings, prepareRequest, buildEthLaunch, termsHash, CUSTOM_LAUNCH, FEE_PCTS, OPENING_ETH, TEAM_PCTS, TEAM_VEST_DAYS, API };
