// Robinhood Chain (EVM) launches through Launch Party's live solo launcher. Files starting with "_" are not routes.
// A solo launch goes through the launch GATEWAY (the factory refuses direct calls with OnlyGateway): createIn(module, request,
// asset) with kind 1 (solo), the factory's RoomTerms + price guard ABI-encoded in `config`, and the launch settings in
// `extensions`. Native ETH is asset 0x0.
// FEES: every tweetpad launch has a flat 1% trading fee (feeEndBps 100). Launch Party's hook takes 10% of it off the top for
// its platform wallet; the creator splits the rest between themselves and the coin's holders (holdersBps). Fees collect in
// the hook per pool (feesOwed) until anyone calls sweep(pool), which pays all three legs at once: that is the creator's
// "claim". Holders' ETH streams into the coin, where each holder claims it.
const { createPublicClient, http, encodeAbiParameters, decodeAbiParameters, encodeFunctionData, decodeFunctionData, parseAbi, parseEventLogs, isAddress, getAddress } = require('viem');

const CHAIN_ID = 4663;
const RPC = process.env.ROBINHOOD_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com';
const FACTORY = '0xDec25F5E4AaB73Ebc64601A0885E01Ae1203fc29';
const EXPLORER = 'https://robinhoodchain.blockscout.com';
const NATIVE = '0x0000000000000000000000000000000000000000';
const DEADLINE_SECONDS = 600n;

const TERMS = { name: 't', type: 'tuple', components: [
  { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'uri', type: 'string' }, { name: 'socials', type: 'string' },
  { name: 'seats', type: 'uint32' }, { name: 'seatPrice', type: 'uint256' }, { name: 'lockFloor', type: 'uint32' }, { name: 'lockWindow', type: 'uint40' },
  { name: 'floorDecay', type: 'uint32' }, { name: 'minFloor', type: 'uint32' }, { name: 'hostSeats', type: 'uint32' }, { name: 'crewBps', type: 'uint16' },
  { name: 'dividendBps', type: 'uint16' }, { name: 'feeEndBps', type: 'uint24' }, { name: 'vestDuration', type: 'uint64' }, { name: 'feeRecipient', type: 'address' },
] };
const GATEWAY_ABI = [{ type: 'function', name: 'createIn', stateMutability: 'payable', inputs: [{ name: 'id', type: 'bytes32' }, { name: 'r', type: 'tuple', components: [
  { name: 'kind', type: 'uint8' }, { name: 'quoteAmount', type: 'uint256' }, { name: 'nativeFee', type: 'uint256' }, { name: 'deadline', type: 'uint256' },
  { name: 'requiredCapabilities', type: 'uint256' }, { name: 'config', type: 'bytes' }, { name: 'extensions', type: 'bytes' },
] }, { name: 'asset', type: 'address' }], outputs: [{ name: 'result', type: 'address' }, { name: 'bought', type: 'uint256' }] }];
const FACTORY_ABI = parseAbi([
  'function soloLaunchFee() view returns (uint256)',
  'function supportsNoTax() view returns (bool)',
  'function gateway() view returns (address)',
  'function moduleId() view returns (bytes32)',
  'function launchConfiguration() view returns (uint256 supply, uint32 seats, uint64 revision)',
  'function paymentAssets(address) view returns ((bool enabled, uint8 decimals, uint256 minimumRaise, uint256 soloOpeningFdv))',
  'event SoloLaunched(address indexed coin, address indexed creator, address escrow, uint256 raised)',
]);
const ERC20_ABI = parseAbi(['function name() view returns (string)', 'function symbol() view returns (string)']);
const HOOK = '0x8E75298A4fD5dccFFf16A7404d4A1acc2CcAA8CC';
const HOOK_ABI = parseAbi([
  'function feesOwed(bytes32) view returns (uint256)',
  'function owed(address, address) view returns (uint256)',
  'function sweep(bytes32 poolId) returns (uint256)',
  'function claimOwed(address recipient, address token) returns (uint256)',
  'event PoolRegistered(bytes32 indexed poolId, address indexed coin, address indexed creator)',
]);
/* the holders' side of a coin launched with a holders' share: ETH streamed by balance × time, claimed by each holder */
const COIN_REWARDS_ABI = parseAbi(['function earned(address) view returns (uint256)', 'function claim() returns (uint256)']);
const FEE_BPS = 100;          // 1%, flat for the coin's life
const PLATFORM_BPS = 1000;    // Launch Party's cut of every fee
const BPS = 10000;

let client = null;
const rpc = () => client || (client = createPublicClient({ transport: http(RPC, { timeout: 15000 }) }));

/* the factory's live settings: fee, opening valuation, gateway and module. Read once a minute per instance. */
let ctx = null;
async function launchContext() {
  if (ctx && Date.now() - ctx.at < 60000) return ctx;
  const read = (functionName, args) => rpc().readContract({ address: FACTORY, abi: FACTORY_ABI, functionName, args });
  const [fee, noTax, gateway, moduleId, settings, eth] = await Promise.all([
    read('soloLaunchFee'), read('supportsNoTax'), read('gateway'), read('moduleId'), read('launchConfiguration'), read('paymentAssets', [NATIVE]),
  ]);
  if (!noTax) throw Object.assign(new Error('Robinhood launches without a trading fee are not available right now'), { status: 503 });
  if (!eth.enabled) throw Object.assign(new Error('ETH launches are not enabled on the Robinhood factory'), { status: 503 });
  ctx = { at: Date.now(), fee, gateway, moduleId, supply: settings[0], revision: settings[2], openingFdv: eth.soloOpeningFdv };
  return ctx;
}

/* the factory's terms struct for a solo launch; the room-shaped fields are ignored on chain but must be legal */
const terms = ({ name, symbol, uri, socials, devBuy, holdersBps = 0 }) => ({
  name, symbol, uri, socials: socials || '', seats: 2, seatPrice: devBuy, lockFloor: 1, lockWindow: 3600, floorDecay: 0, minFloor: 1,
  hostSeats: 0, crewBps: 2500, dividendBps: holdersBps, feeEndBps: FEE_BPS, vestDuration: 259200n, feeRecipient: NATIVE,
});
function gatewayCall(c, t, minimum, deadline) {
  const request = {
    kind: 1, quoteAmount: t.seatPrice, nativeFee: c.fee, deadline, requiredCapabilities: 1n << 9n,
    config: encodeAbiParameters([TERMS, { type: 'uint256' }, { type: 'uint256' }], [t, minimum, c.openingFdv]),
    extensions: encodeAbiParameters([{ type: 'uint32' }, { type: 'uint64' }, { type: 'uint256' }], [1, c.revision, c.supply]),
  };
  return { address: c.gateway, abi: GATEWAY_ABI, functionName: 'createIn', args: [c.moduleId, request, NATIVE], value: c.fee + t.seatPrice };
}

/* a ready-to-sign launch: simulated as the launcher's own wallet, with the dev buy guarded at 99% of what it would get now */
async function buildLaunch({ wallet, name, symbol, uri, socials, devBuy, holdersBps = 0 }) {
  const c = await launchContext();
  const block = await rpc().getBlock();
  const deadline = block.timestamp + DEADLINE_SECONDS;
  const t = terms({ name, symbol, uri, socials, devBuy, holdersBps });
  let minimum = 0n, expected = 0n;
  if (devBuy > 0n) {
    /* first ask what the buy gets, with a balance conjured for the dry run; then commit to 99% of it */
    const probe = gatewayCall(c, t, 1n, deadline);
    const { result } = await rpc().simulateContract({ ...probe, account: wallet, stateOverride: [{ address: wallet, balance: probe.value + 10n ** 18n }] });
    expected = result[1];
    minimum = expected * 99n / 100n || 1n;
  }
  const call = gatewayCall(c, t, minimum, deadline);
  /* Robinhood's eth_call doesn't check the sender's balance, so check it here: the launch value plus room for gas */
  const [balance, gas, gasPrice] = await Promise.all([
    rpc().getBalance({ address: wallet }),
    rpc().estimateContractGas({ ...call, account: wallet, stateOverride: [{ address: wallet, balance: call.value + 10n ** 18n }] }).catch(() => 3000000n),
    rpc().getGasPrice(),
  ]);
  const gasCost = gas * gasPrice * 2n;
  if (balance < call.value + gasCost) {
    throw Object.assign(new Error('not enough ETH on Robinhood Chain: this launch needs about ' + (Number(call.value + gasCost) / 1e18).toFixed(4) + ' ETH' + (devBuy > 0n ? ' with the dev buy' : '') + ', including gas'), { status: 400 });
  }
  /* the real wallet: anything else that would fail on chain stops here instead of in the wallet */
  try { await rpc().simulateContract({ ...call, account: wallet }); }
  catch (err) { throw Object.assign(new Error('the launch would fail on chain: ' + String(err.shortMessage || err.message || '').slice(0, 160)), { status: 400 }); }
  return { to: call.address, data: encodeFunctionData(call), value: call.value, gas: gas * 12n / 10n, chainId: CHAIN_ID, fee: c.fee, expected, minimum, supply: c.supply, deadline };
}

/* a launch that happened: sent to the gateway, succeeded, and the factory logged the coin and its creator */
async function verifyLaunch(hash) {
  const receipt = await rpc().waitForTransactionReceipt({ hash, timeout: 30000 }).catch(() => null);
  if (!receipt) throw Object.assign(new Error('transaction not found yet; try again in a moment'), { status: 404 });
  if (receipt.status !== 'success') throw Object.assign(new Error('the launch transaction failed on chain'), { status: 400 });
  const c = await launchContext();
  if (!receipt.to || getAddress(receipt.to) !== getAddress(c.gateway)) throw Object.assign(new Error('not a launch through the Robinhood launch gateway'), { status: 400 });
  const [log] = parseEventLogs({ abi: FACTORY_ABI, eventName: 'SoloLaunched', logs: receipt.logs.filter(l => getAddress(l.address) === FACTORY) });
  if (!log) throw Object.assign(new Error('no launch found in that transaction'), { status: 400 });
  const tx = await rpc().getTransaction({ hash });
  const { args } = decodeFunctionData({ abi: GATEWAY_ABI, data: tx.input });
  const [t] = decodeAbiParameters([TERMS, { type: 'uint256' }, { type: 'uint256' }], args[1].config);
  const block = await rpc().getBlock({ blockNumber: receipt.blockNumber });
  /* the pool the hook registered for this coin: where its fees collect */
  const [reg] = parseEventLogs({ abi: HOOK_ABI, eventName: 'PoolRegistered', logs: receipt.logs.filter(l => getAddress(l.address) === HOOK) });
  return { coin: getAddress(log.args.coin), creator: getAddress(log.args.creator), name: t.name, symbol: t.symbol, uri: t.uri,
    devBuy: Number(t.seatPrice) / 1e18, time: Number(block.timestamp) * 1000, poolId: reg ? reg.args.poolId : null,
    feeBps: Number(t.feeEndBps), holdersBps: Number(t.dividendBps) };
}

/* a creator's fees across their coins: what each pool holds for them now, plus anything a failed payout still owes */
async function creatorFees(wallet, coins) {
  const pools = coins.filter(c => c.poolId && c.feeBps);
  const owedPools = pools.length ? await rpc().multicall({ contracts: pools.map(c => ({ address: HOOK, abi: HOOK_ABI, functionName: 'feesOwed', args: [c.poolId] })), allowFailure: true }) : [];
  const owed = await rpc().readContract({ address: HOOK, abi: HOOK_ABI, functionName: 'owed', args: [wallet, NATIVE] }).catch(() => 0n);
  let total = owed;
  const perCoin = pools.map((c, i) => {
    const pending = owedPools[i] && owedPools[i].status === 'success' ? owedPools[i].result : 0n;
    const mine = (pending - pending * BigInt(PLATFORM_BPS) / BigInt(BPS)) * BigInt(BPS - c.holdersBps) / BigInt(BPS);
    total += mine;
    return { mint: c.mint, symbol: c.symbol, poolId: c.poolId, pending, mine };
  });
  return { total, owed, perCoin };
}
/* the claim: one sweep per coin that holds fees (all three legs pay out), then any stuck payout */
function claimCalls(wallet, fees) {
  const calls = fees.perCoin.filter(c => c.pending > 0n).map(c => ({ to: HOOK, data: encodeFunctionData({ abi: HOOK_ABI, functionName: 'sweep', args: [c.poolId] }), label: '$' + c.symbol }));
  if (fees.owed > 0n) calls.push({ to: HOOK, data: encodeFunctionData({ abi: HOOK_ABI, functionName: 'claimOwed', args: [wallet, NATIVE] }), label: 'held payout' });
  return calls;
}
/* a holder's ETH rewards in one coin, and the call that claims them */
async function holderRewards(coin, wallet) {
  const earned = await rpc().readContract({ address: coin, abi: COIN_REWARDS_ABI, functionName: 'earned', args: [wallet] }).catch(() => 0n);
  return { earned, claim: { to: coin, data: encodeFunctionData({ abi: COIN_REWARDS_ABI, functionName: 'claim', args: [] }) } };
}

const isEvmAddress = (s) => typeof s === 'string' && isAddress(s, { strict: false });

/* ---------- trading: buy and sell a launched coin in its Uniswap v4 pool, through Uniswap's own Universal Router ----------
   Every tweetpad coin trades against native ETH, so the pool key is (ETH, coin, fee 0, spacing 60, the hook): the zero address
   sorts first, ETH is currency0 and a buy is zeroForOne. The 1% fee is the hook's, taken inside the swap; there is no other.
   A buy sends ETH as the call's value. A sell needs the coin approved to Permit2 and Permit2 to the router (exactly the amount
   sold, for an hour); the calls listed are only the ones still missing, and the wallet sends them in order. */
const V4 = { router: '0x8876789976decbfcbbbe364623c63652db8c0904', quoter: '0xe202BB8dd524eE9C5E679e5B5809f7A373a982Ef', permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3' };
const POOL_KEY = { type: 'tuple', components: [
  { name: 'currency0', type: 'address' }, { name: 'currency1', type: 'address' }, { name: 'fee', type: 'uint24' }, { name: 'tickSpacing', type: 'int24' }, { name: 'hooks', type: 'address' },
] };
const QUOTER_ABI = [{ type: 'function', name: 'quoteExactInputSingle', stateMutability: 'nonpayable', inputs: [{ name: 'params', type: 'tuple', components: [
  { name: 'poolKey', ...POOL_KEY }, { name: 'zeroForOne', type: 'bool' }, { name: 'exactAmount', type: 'uint128' }, { name: 'hookData', type: 'bytes' },
] }], outputs: [{ name: 'amountOut', type: 'uint256' }, { name: 'gasEstimate', type: 'uint256' }] }];
const TRADE_ABI = parseAbi([
  'function execute(bytes commands, bytes[] inputs, uint256 deadline) payable',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);
const PERMIT2_ABI = parseAbi([
  'function allowance(address user, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)',
  'function approve(address token, address spender, uint160 amount, uint48 expiration)',
]);
const poolKeyOf = (coin) => ({ currency0: NATIVE, currency1: getAddress(coin), fee: 0, tickSpacing: 60, hooks: HOOK });

/* what amountIn (wei of ETH to buy, or of the coin to sell) gets right now, the hook's fee included */
async function quoteTrade(coin, side, amountIn) {
  const { result } = await rpc().simulateContract({ address: V4.quoter, abi: QUOTER_ABI, functionName: 'quoteExactInputSingle',
    args: [{ poolKey: poolKeyOf(coin), zeroForOne: side === 'buy', exactAmount: amountIn, hookData: '0x' }] });
  return result[0];
}

/* Universal Router: one V4_SWAP command (0x10) with SWAP_EXACT_IN_SINGLE, SETTLE_ALL, TAKE_ALL. The deployed router predates
   the removal of sqrtPriceLimitX96 from ExactInputSingleParams, so it stays in (0 = no limit; minOut is the bound). */
function swapCall(coin, side, amountIn, minOut, deadline) {
  const key = poolKeyOf(coin), zeroForOne = side === 'buy';
  const [tokIn, tokOut] = zeroForOne ? [key.currency0, key.currency1] : [key.currency1, key.currency0];
  const swap = encodeAbiParameters([{ type: 'tuple', components: [
    { name: 'poolKey', ...POOL_KEY }, { name: 'zeroForOne', type: 'bool' }, { name: 'amountIn', type: 'uint128' }, { name: 'amountOutMinimum', type: 'uint128' },
    { name: 'sqrtPriceLimitX96', type: 'uint160' }, { name: 'hookData', type: 'bytes' },
  ] }], [{ poolKey: key, zeroForOne, amountIn, amountOutMinimum: minOut, sqrtPriceLimitX96: 0n, hookData: '0x' }]);
  const pair = [{ type: 'address' }, { type: 'uint256' }];
  const input = encodeAbiParameters([{ type: 'bytes' }, { type: 'bytes[]' }],
    ['0x060c0f', [swap, encodeAbiParameters(pair, [tokIn, amountIn]), encodeAbiParameters(pair, [tokOut, minOut])]]);
  return { to: V4.router, data: encodeFunctionData({ abi: TRADE_ABI, functionName: 'execute', args: ['0x10', [input], deadline] }),
    value: zeroForOne ? amountIn : 0n };
}

/* the calls for one trade, in order, after checking the wallet has what it spends; slippageBps bounds the minimum received */
async function buildTrade({ wallet, coin, side, amountIn, slippageBps }) {
  const c = rpc();
  coin = getAddress(coin);
  const [expected, have] = await Promise.all([
    quoteTrade(coin, side, amountIn).catch(() => { throw Object.assign(new Error('this coin has no pool to trade in yet'), { status: 400 }); }),
    side === 'buy' ? c.getBalance({ address: wallet }) : c.readContract({ address: coin, abi: TRADE_ABI, functionName: 'balanceOf', args: [wallet] }),
  ]);
  if (have < amountIn) throw Object.assign(new Error(side === 'buy' ? 'not enough ETH in this wallet' : 'you hold less than that'), { status: 400 });
  if (expected === 0n) throw Object.assign(new Error('too small to trade'), { status: 400 });
  const minimum = expected * BigInt(10000 - slippageBps) / 10000n;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const calls = [];
  if (side === 'sell') {
    const [toPermit2, [allowed, expiration]] = await Promise.all([
      c.readContract({ address: coin, abi: TRADE_ABI, functionName: 'allowance', args: [wallet, V4.permit2] }),
      c.readContract({ address: V4.permit2, abi: PERMIT2_ABI, functionName: 'allowance', args: [wallet, coin, V4.router] }),
    ]);
    if (toPermit2 < amountIn) calls.push({ label: 'allow Permit2', to: coin, data: encodeFunctionData({ abi: TRADE_ABI, functionName: 'approve', args: [V4.permit2, amountIn] }), value: 0n });
    if (allowed < amountIn || BigInt(expiration) <= now + 60n) {
      calls.push({ label: 'allow the router', to: V4.permit2, data: encodeFunctionData({ abi: PERMIT2_ABI, functionName: 'approve', args: [coin, V4.router, amountIn, Number(now + 3600n)] }), value: 0n });
    }
  }
  const swap = swapCall(coin, side, amountIn, minimum, now + DEADLINE_SECONDS);
  /* a buy (or a sell with nothing left to approve) is dry-run first, so a swap that would revert never reaches the wallet */
  if (!calls.length) {
    try { await c.call({ account: wallet, to: swap.to, data: swap.data, value: swap.value }); }
    catch (err) { throw Object.assign(new Error('the swap would fail: ' + ((err.shortMessage || err.message || '').split('\n')[0]).slice(0, 140)), { status: 400 }); }
  }
  calls.push({ label: side, ...swap });
  return { calls, expected, minimum };
}

module.exports = { CHAIN_ID, RPC, FACTORY, HOOK, EXPLORER, FEE_BPS, PLATFORM_BPS, launchContext, buildLaunch, verifyLaunch, creatorFees, claimCalls, holderRewards,
  quoteTrade, buildTrade, isEvmAddress, getAddress };
