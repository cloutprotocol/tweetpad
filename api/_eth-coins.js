// Ethereum mainnet coins launched through Launch Party's CustomLaunch (a team's own token and hook, one transaction): checking a
// sent launch, and the creator fees its hook holds. Building the launch is api/_eth-launch.js. Files starting with "_" are not routes.
// Unlike the solo launcher on Robinhood, BNB and Base there is no chain-wide hook, fee or split: every coin brings its own
// hook, pool fee and pair, so all of them are read per coin, from the launch itself and from CustomLaunch.launchOf.
// FEES: only the FeeHookV1 template has a known fee interface — feeBps of every swap kept in the hook as PoolManager claims,
// owed(currency) to read, and collect(currency) (anyone may call it) paying ALL of it to the hook's feeRecipient, in the
// pair (sells) and in the coin itself (buys). Any other hook is the team's own code: listed, but with no fees shown here.
const { createPublicClient, http, parseAbi, parseEventLogs, encodeFunctionData, encodeAbiParameters, keccak256, getAddress } = require('viem');

const ETH = {
  id: 1, name: 'Ethereum', symbol: 'ETH', rpc: process.env.ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com', explorer: 'https://etherscan.io',
  customLaunch: '0x3481909A7067F8DdDd4DD9b3e544256F58Ee7e76', poolManager: '0x000000000004444c5dc75cB358380D2e3dE08A90',
};
const NATIVE = '0x0000000000000000000000000000000000000000';
const TICK_SPACING = 60;              // CustomLaunch places every pool on this spacing
const DYNAMIC_FEE_FLAG = 0x800000;    // lpFee: the hook sets the pool fee
/* every ManagedHookProxy has this runtime (CustomLaunch.managedProxyCodehash(), read 2026-10-11) */
const MANAGED_PROXY_CODEHASH = '0x5b214afccf2c1ef0cf7edb62842387ba37a28ddeb86a62d9368694dddf8f6324';
/* FeeHookV1's runtime with its three immutables zeroed: the byte offsets are forge's immutableReferences for it
   (poolManager, feeRecipient, feeBps; 32 bytes each), and the hash matches Agent Inu's live hook masked the same way */
const FEE_HOOK_V1 = { maskedHash: '0xa27c7c9809ea41c3d04235838b9033ce92599295137df1a103186f88c2db3956', size: 2209,
  poolManager: [199, 357, 616, 1369, 1763], feeRecipient: [900, 1169], feeBps: [1242, 1887] };
/* TemplateToken has no immutables, so every instance has this runtime */
const TEMPLATE_TOKEN_CODEHASH = '0xf615915ba79af1c2c41819337997eb60ee927332803ee4ff677f3636266baa87';

const CL_ABI = parseAbi([
  'event SoloLaunched(address indexed token, address indexed team, address hook, bytes32 indexed poolId, bytes32 manifestHash)',
  'event PartyOpened(address indexed token, address indexed team, address hook, address indexed room, bytes32 manifestHash)',
  'event TeamShare(address indexed token, address indexed to, uint256 amount, address escrow, uint64 vest)',
  'function hookStatus(address) view returns (bool upgradeable, address implementation, address hookAdmin, bool unchanged)',
]);
const LAUNCH_OF_ABI = [{ type: 'function', name: 'launchOf', stateMutability: 'view', inputs: [{ name: 'token', type: 'address' }], outputs: [{ type: 'tuple', components: [
  { name: 'team', type: 'address' }, { name: 'hook', type: 'address' }, { name: 'hookCodehash', type: 'bytes32' }, { name: 'hookImpl', type: 'address' },
  { name: 'poolId', type: 'bytes32' }, { name: 'room', type: 'address' }, { name: 'escrow', type: 'address' }, { name: 'teamEscrow', type: 'address' },
  { name: 'launched', type: 'bool' }, { name: 'openedAt', type: 'uint64' },
  { name: 'terms', type: 'tuple', components: [
    { name: 'pair', type: 'address' }, { name: 'lpFee', type: 'uint24' }, { name: 'openingFdv', type: 'uint256' }, { name: 'crewBps', type: 'uint16' },
    { name: 'vestDuration', type: 'uint64' }, { name: 'probeIn', type: 'uint256' }, { name: 'hookImpl', type: 'address' }, { name: 'fee', type: 'uint256' },
    { name: 'manifestHash', type: 'bytes32' }, { name: 'teamBps', type: 'uint16' }, { name: 'teamVest', type: 'uint64' }, { name: 'teamTo', type: 'address' },
  ] },
] }] }];
const TOKEN_ABI = parseAbi([
  'function name() view returns (string)', 'function symbol() view returns (string)', 'function decimals() view returns (uint8)', 'function totalSupply() view returns (uint256)',
  'function tokenURI() view returns (string)', 'function socials() view returns (string)',
]);
const FEE_HOOK_ABI = parseAbi(['function owed(address currency) view returns (uint256)', 'function collect(address currency) returns (uint256 amount)']);
const PROXY_ABI = parseAbi(['function proxyImplementation() view returns (address)']);
const VEST_ABI = parseAbi(['function releasable(address who) view returns (uint256)', 'function release(address who) returns (uint256 amount)']);

let client;
const rpc = () => client || (client = createPublicClient({ transport: http(ETH.rpc, { timeout: 15000 }) }));
const fail = (status, message) => Object.assign(new Error(message), { status });
const same = (a, b) => !!a && !!b && getAddress(a) === getAddress(b);

/* Uniswap v4's PoolId: keccak256(abi.encode(PoolKey)) */
const POOL_KEY = [{ type: 'address' }, { type: 'address' }, { type: 'uint24' }, { type: 'int24' }, { type: 'address' }];
function poolKeyOf(token, pair, lpFee, hook) {
  const tokenIs0 = BigInt(token) < BigInt(pair);
  return { currency0: tokenIs0 ? token : pair, currency1: tokenIs0 ? pair : token, fee: lpFee, tickSpacing: TICK_SPACING, hooks: hook };
}
const poolIdOf = (k) => keccak256(encodeAbiParameters(POOL_KEY, [k.currency0, k.currency1, k.fee, k.tickSpacing, k.hooks]));

/* Is this hook the FeeHookV1 template — directly, or as the logic behind a ManagedHookProxy? Its runtime with the immutables
   zeroed must hash to the template's; the immutables themselves (read from the code) are its pool manager, recipient and fee.
   A managed hook can be pointed at new logic at any time, so this is read again whenever fees are read, never cached. */
async function feeHookOf(hook) {
  const r = rpc();
  let code = await r.getCode({ address: hook });
  let implementation = null;
  if (code && keccak256(code) === MANAGED_PROXY_CODEHASH) {
    implementation = await r.readContract({ address: hook, abi: PROXY_ABI, functionName: 'proxyImplementation' });
    code = await r.getCode({ address: implementation });
  }
  const none = { template: null, managed: !!implementation, implementation };
  if (!code || (code.length - 2) / 2 !== FEE_HOOK_V1.size) return none;
  let hex = code.slice(2);
  const word = (o) => hex.slice(o * 2, o * 2 + 64);
  const values = { poolManager: word(FEE_HOOK_V1.poolManager[0]), feeRecipient: word(FEE_HOOK_V1.feeRecipient[0]), feeBps: word(FEE_HOOK_V1.feeBps[0]) };
  for (const key of ['poolManager', 'feeRecipient', 'feeBps']) for (const o of FEE_HOOK_V1[key]) {
    if (word(o) !== values[key]) return none;   // every copy of an immutable carries the same value
    hex = hex.slice(0, o * 2) + '0'.repeat(64) + hex.slice(o * 2 + 64);
  }
  if (keccak256('0x' + hex) !== FEE_HOOK_V1.maskedHash) return none;
  if (!same('0x' + values.poolManager.slice(24), ETH.poolManager)) return none;
  return { template: 'FeeHookV1', managed: !!implementation, implementation,
    feeRecipient: getAddress('0x' + values.feeRecipient.slice(24)), feeBps: Number(BigInt('0x' + values.feeBps)) };
}

/* a launch that happened: sent straight to CustomLaunch, succeeded, and CustomLaunch itself logged the solo launch, sent by
   the team it names; the record CustomLaunch keeps for the coin must agree with the event */
async function verifyEthLaunch(hash) {
  const r = rpc();
  const receipt = await r.waitForTransactionReceipt({ hash, timeout: 30000 }).catch(() => null);
  if (!receipt) throw fail(404, 'transaction not found yet; try again in a moment');
  if (receipt.status !== 'success') throw fail(400, 'the launch transaction failed on chain');
  if (!same(receipt.to, ETH.customLaunch)) throw fail(400, 'not a launch through Launch Party\'s CustomLaunch on Ethereum');
  const ours = receipt.logs.filter(l => same(l.address, ETH.customLaunch));
  const [log] = parseEventLogs({ abi: CL_ABI, eventName: 'SoloLaunched', logs: ours });
  if (!log) {
    const [party] = parseEventLogs({ abi: CL_ABI, eventName: 'PartyOpened', logs: ours });
    throw fail(400, party ? 'that transaction opened a party; it lists once the party launches' : 'no launch found in that transaction');
  }
  const mint = getAddress(log.args.token), creator = getAddress(log.args.team), hook = getAddress(log.args.hook);
  if (!same(creator, receipt.from)) throw fail(400, 'the launch was not sent by the team it names');
  const read = (functionName, address = mint) => r.readContract({ address, abi: TOKEN_ABI, functionName }).catch(() => null);
  const [L, status, block, name, symbol, decimals, supply, tokenURI, socials, tokenCode, fees] = await Promise.all([
    r.readContract({ address: ETH.customLaunch, abi: LAUNCH_OF_ABI, functionName: 'launchOf', args: [mint] }),
    r.readContract({ address: ETH.customLaunch, abi: CL_ABI, functionName: 'hookStatus', args: [mint] }),
    r.getBlock({ blockNumber: receipt.blockNumber }),
    read('name'), read('symbol'), read('decimals'), read('totalSupply'), read('tokenURI'), read('socials'),
    r.getCode({ address: mint }), feeHookOf(hook),
  ]);
  if (!L.launched || !same(L.team, creator) || !same(L.hook, hook) || L.poolId !== log.args.poolId) throw fail(400, 'CustomLaunch has no matching record for this coin');
  const t = L.terms;
  const key = poolKeyOf(mint, t.pair, t.lpFee, hook);
  if (poolIdOf(key) !== L.poolId) throw fail(400, 'the pool on record is not this coin\'s');
  if (typeof name !== 'string' || typeof symbol !== 'string') throw fail(400, 'the coin has no ERC-20 name or symbol');
  const [share] = parseEventLogs({ abi: CL_ABI, eventName: 'TeamShare', logs: ours }).filter(e => same(e.args.token, mint));
  let socialLinks = null;
  try { socialLinks = socials ? JSON.parse(socials) : null; } catch { /* free text: kept as is in `socials` */ }
  return {
    mint, coin: mint, creator, hook, poolId: L.poolId, poolKey: key, pair: getAddress(t.pair), lpFee: Number(t.lpFee), dynamicFee: Number(t.lpFee) === DYNAMIC_FEE_FLAG,
    name, symbol, decimals: decimals == null ? 18 : Number(decimals), supply: supply == null ? null : supply.toString(),
    uri: tokenURI || '', socials: socials || '', socialLinks, templateToken: !!tokenCode && keccak256(tokenCode) === TEMPLATE_TOKEN_CODEHASH,
    teamBps: Number(t.teamBps), teamVest: Number(t.teamVest), teamTo: share ? getAddress(share.args.to) : null, teamEscrow: L.teamEscrow === NATIVE ? null : getAddress(L.teamEscrow),
    upgradeable: status[0], hookImpl: status[0] ? getAddress(status[1]) : null, hookAdmin: status[0] ? getAddress(status[2]) : null, hookUnchanged: status[3],
    hookTemplate: fees.template, feeBps: fees.template ? fees.feeBps : null, feeRecipient: fees.template ? fees.feeRecipient : null,
    manifestHash: log.args.manifestHash, openingFdv: t.openingFdv.toString(), launchFee: t.fee.toString(), termsHash: require('./_eth-launch').termsHash(t),
    devBuy: 0, time: Number(block.timestamp) * 1000, block: Number(receipt.blockNumber),
  };
}

/* a creator's hook fees across their Ethereum coins: what each FeeHookV1 holds now, in the pair and in the coin. Only fees
   whose recipient is this wallet count as theirs (`mine`, in the pair's raw units — ETH for every live coin); a hook paying
   someone else still shows what it holds (`pending`), with `recipient`. Plus the team share's vested coins, if any. */
async function creatorFeesEth(wallet, coins) {
  const r = rpc();
  wallet = getAddress(wallet);
  const rows = await Promise.all(coins.filter(c => c.chain === 'ethereum' && c.hook).map(async (c) => {
    const pair = c.pair || NATIVE;
    const hook = await feeHookOf(c.hook).catch(() => ({ template: null }));
    const owed = (currency) => r.readContract({ address: c.hook, abi: FEE_HOOK_ABI, functionName: 'owed', args: [currency] }).catch(() => 0n);
    const [pending, pendingCoin, vested] = await Promise.all([
      hook.template ? owed(pair) : 0n, hook.template ? owed(c.mint) : 0n,
      c.teamEscrow && same(c.teamTo, wallet) ? r.readContract({ address: c.teamEscrow, abi: VEST_ABI, functionName: 'releasable', args: [wallet] }).catch(() => 0n) : 0n,
    ]);
    const ours = !!hook.template && same(hook.feeRecipient, wallet);
    return { mint: c.mint, symbol: c.symbol, poolId: c.poolId, hook: c.hook, pair, template: hook.template, recipient: hook.feeRecipient || null, feeBps: hook.feeBps ?? null,
      pending, pendingCoin, mine: ours ? pending : 0n, mineCoin: ours ? pendingCoin : 0n, teamEscrow: c.teamEscrow || null, vested };
  }));
  /* the profile shows one native total per chain: coins paired with a token count in perCoin only */
  const total = rows.reduce((s, c) => s + (c.pair === NATIVE ? c.mine : 0n), 0n);
  return { total, owed: 0n, perCoin: rows };
}

/* the claim: collect(currency) per currency a hook holds — permissionless, paid to the hook's recipient — then the team share's
   vested coins. By default only for hooks that pay this wallet (so "sent to your wallet" stays true); anyRecipient: true also
   collects for hooks paying someone else (labelled with whom). Same shape as claimCalls: [{ to, data, label }]. */
function claimCallsEth(wallet, fees, { anyRecipient = false } = {}) {
  const calls = [];
  const short = (a) => a.slice(0, 6) + '…' + a.slice(-4);
  for (const c of fees.perCoin) {
    if (!c.template || !(anyRecipient || same(c.recipient, wallet))) continue;
    const to = same(c.recipient, wallet) ? '' : ' → ' + short(c.recipient);
    if (c.pending > 0n) calls.push({ to: c.hook, data: encodeFunctionData({ abi: FEE_HOOK_ABI, functionName: 'collect', args: [c.pair] }), label: '$' + c.symbol + ' fees in ' + (c.pair === NATIVE ? 'ETH' : 'the pair') + to });
    if (c.pendingCoin > 0n) calls.push({ to: c.hook, data: encodeFunctionData({ abi: FEE_HOOK_ABI, functionName: 'collect', args: [c.mint] }), label: '$' + c.symbol + ' fees in $' + c.symbol + to });
  }
  for (const c of fees.perCoin) {
    if (c.vested > 0n) calls.push({ to: c.teamEscrow, data: encodeFunctionData({ abi: VEST_ABI, functionName: 'release', args: [getAddress(wallet)] }), label: '$' + c.symbol + ' team share (vested)' });
  }
  return calls;
}

module.exports = { ETH, NATIVE, verifyEthLaunch, feeHookOf, creatorFeesEth, claimCallsEth, poolKeyOf, poolIdOf, rpc };
