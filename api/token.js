// Any token on the chains tweetpad runs on (Solana, Robinhood Chain, BNB Chain, Base, Ethereum), launched here or not: what its own
// page shows (/<chain>/<address>, api/t.js), and the EVM side of trading it. Its market is its most liquid pair on DexScreener
// (a Solana token's numbers, holders and authorities come from Jupiter's token list first); its decimals are read from the chain.
// Solana tokens are bought and sold through Jupiter, straight from the page. EVM tokens go through KyberSwap's aggregator, the route
// built here, checked to go to KyberSwap's own router and dry-run as the user's wallet before the wallet sees it.
// GET  ?chain&address                                         → the token (kept 15s)
// GET  ?chain&address&side=buy|sell&amount                    → { expected }   (EVM: a live quote)
// POST { chain, wallet, address, side, amount, slippageBps }   → { calls: [{ label, to, data, value }], expected, minimum }   (EVM)
// GET  ?find=<address>                                         → { chain }: where an address trades (its most liquid pair), for /t/<address>
// chain is solana, robinhood, bnb, base or ethereum (or their short names: sol, rh, bsc, eth). Amounts are decimal strings: the
// native coin to spend on a buy, tokens on a sell. Returned amounts are base units. tweetpad adds no fee.
const { cors, readJson, isPubkey, isEvmAddress, EVM_CHAINS, DEX_SLUG, redis, rpc, rateLimit, fail } = require('./_lib');

/* the chain names a link may use, and the short one each page's link is made with */
const CHAIN_OF = { sol: 'solana', solana: 'solana', rh: 'robinhood', robinhood: 'robinhood', bnb: 'bnb', bsc: 'bnb', base: 'base', eth: 'ethereum', ethereum: 'ethereum' };
const SHORT = { solana: 'sol', robinhood: 'rh', bnb: 'bnb', base: 'base', ethereum: 'eth' };
const NAME = { solana: 'Solana', robinhood: 'Robinhood Chain', bnb: 'BNB Chain', base: 'Base', ethereum: 'Ethereum' };
const NATIVE = { solana: 'SOL', robinhood: 'ETH', bnb: 'BNB', base: 'ETH', ethereum: 'ETH' };
const chainOf = (s) => (Object.prototype.hasOwnProperty.call(CHAIN_OF, s) ? CHAIN_OF[s] : null);
const fitsChain = (chain, address) => (chain === 'solana' ? isPubkey(address) : EVM_CHAINS.includes(chain) && isEvmAddress(address));
const err = (status, message) => Object.assign(new Error(message), { status });

/* KyberSwap's aggregator: its chain ids, and its router (MetaAggregationRouterV2, the same address on every chain) */
const KYBER = 'https://aggregator-api.kyberswap.com/';
const KYBER_CHAIN = { robinhood: 'robinhood', bnb: 'bsc', base: 'base', ethereum: 'ethereum' };
const KYBER_ROUTER = '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5';
const KYBER_NATIVE = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
async function kyber(chain, path, body) {
  const r = await fetch(KYBER + KYBER_CHAIN[chain] + path, { method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(10000),
    headers: { 'x-client-id': 'tweetpad', ...(body && { 'content-type': 'application/json' }) }, ...(body && { body: JSON.stringify(body) }) });
  const out = await r.json().catch(() => ({}));
  if (out.code !== 0 || !out.data) {
    /* 4008: no route; 4011: a token KyberSwap doesn't know; 4221/4222: the route came back short, usually a token taxing its transfers */
    throw err(400, out.code === 4008 || out.code === 4011 ? 'no route for this trade on ' + NAME[chain] + ' right now'
      : /tax|fee on transfer/i.test(out.message || '') ? 'this token taxes its transfers too heavily to route' : 'KyberSwap: ' + String(out.message || 'HTTP ' + r.status).slice(0, 120));
  }
  return out.data;
}

/* ---------- the token ---------- */
/* every pair DexScreener sees for the token, most liquid first; only pairs where it is the base token carry its price */
async function dexPairs(chain, address) {
  const r = await fetch('https://api.dexscreener.com/token-pairs/v1/' + DEX_SLUG[chain] + '/' + address, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw err(502, 'DexScreener ' + r.status);
  const out = await r.json(), same = (a) => (chain === 'solana' ? a === address : String(a).toLowerCase() === address.toLowerCase());
  return (Array.isArray(out) ? out : []).filter(p => p.baseToken && same(p.baseToken.address)).sort((a, b) => ((b.liquidity || {}).usd || 0) - ((a.liquidity || {}).usd || 0));
}
/* Jupiter's entry for a Solana token: name, picture, decimals, holders, its price and supply, and what it has audited */
async function jupToken(mint) {
  const r = await fetch('https://lite-api.jup.ag/tokens/v2/search?query=' + mint, { signal: AbortSignal.timeout(8000) });
  const out = r.ok ? await r.json() : [];
  return (Array.isArray(out) ? out : []).find(t => t.id === mint) || null;
}
const num = (v) => (v == null || v === '' || !isFinite(Number(v)) ? null : Number(v));
const safeUrl = (u) => (typeof u === 'string' && /^https:\/\//.test(u) ? u : null);

/* the token as its page draws it; null when the address isn't a token on that chain */
async function token(chain, address) {
  const key = 'tok:' + chain + ':' + address;
  try { const [hit] = await redis(['GET', key]); if (hit) return JSON.parse(hit); } catch { /* read it */ }
  const sol = chain === 'solana';
  const [pairs, meta, jup] = await Promise.all([
    dexPairs(chain, address).catch(() => []),
    /* the mint account itself (getTokenSupply is an indexed read public RPCs now refuse); a Bordrless token isn't one */
    sol ? rpc('getAccountInfo', [address, { encoding: 'jsonParsed', commitment: 'confirmed' }])
      .then(a => { const p = a && a.value && a.value.data && a.value.data.parsed; return p && p.type === 'mint' ? { decimals: p.info.decimals } : null; }).catch(() => null)
      : require('./_evm').readToken(chain, address),
    sol ? jupToken(address).catch(() => null) : null,
  ]);
  if (!meta) return null;
  const p = pairs[0], info = (p && p.info) || {}, socials = info.socials || [];
  const link = (type) => safeUrl((socials.find(s => s.type === type) || {}).url);
  const s24 = (jup && jup.stats24h) || {}, s1 = (jup && jup.stats1h) || {};
  const t = {
    chain, short: SHORT[chain], chainName: NAME[chain], native: NATIVE[chain], address,
    name: (jup && jup.name) || (p && p.baseToken.name) || meta.name || 'Unknown token',
    symbol: String((jup && jup.symbol) || (p && p.baseToken.symbol) || meta.symbol || '???').replace(/^\$/, '').slice(0, 16),
    image: safeUrl(jup && jup.icon) || safeUrl(info.imageUrl), decimals: meta.decimals,
    market: p || jup ? {
      mcap: num(jup && (jup.mcap || jup.fdv)) ?? num(p && (p.marketCap || p.fdv)),
      price: num(jup && jup.usdPrice) ?? num(p && p.priceUsd),
      priceNative: num(p && p.priceNative),
      change1h: num(s1.priceChange) ?? num(p && p.priceChange && p.priceChange.h1),
      change24h: num(s24.priceChange) ?? num(p && p.priceChange && p.priceChange.h24),
      volume24h: jup && (s24.buyVolume != null) ? s24.buyVolume + (s24.sellVolume || 0) : num(p && p.volume && p.volume.h24),
      trades24h: jup && s24.numBuys != null ? s24.numBuys + (s24.numSells || 0) : p && p.txns && p.txns.h24 ? p.txns.h24.buys + p.txns.h24.sells : null,
      liquidity: num(jup && jup.liquidity) ?? num(p && p.liquidity && p.liquidity.usd),
      holders: num(jup && jup.holderCount),
    } : null,
    /* the pool its chart and trades are read from (GeckoTerminal), and where it trades */
    pair: p ? { address: p.pairAddress, dex: p.dexId, labels: p.labels || [], quote: p.quoteToken.symbol, createdAt: p.pairCreatedAt || null } : null,
    pairs: pairs.length,
    audit: jup ? { verified: !!jup.isVerified, mintOff: jup.audit ? !!jup.audit.mintAuthorityDisabled : null, freezeOff: jup.audit ? !!jup.audit.freezeAuthorityDisabled : null,
      top10: num(jup.audit && jup.audit.topHoldersPercentage), organic: jup.organicScoreLabel || null, program: jup.tokenProgram || null } : null,
    links: { website: safeUrl(((info.websites || [])[0] || {}).url), twitter: link('twitter'), telegram: link('telegram') },
    at: Date.now(),
  };
  redis(['SET', key, JSON.stringify(t), 'EX', 15]).catch(() => {});
  return t;
}

/* where an EVM address trades: the most liquid pair on any chain here (DexScreener's search across chains) */
async function findChain(address) {
  if (isPubkey(address)) return 'solana';
  const r = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + address, { signal: AbortSignal.timeout(8000) });
  const pairs = ((r.ok ? await r.json() : {}).pairs || []).filter(p => p.baseToken && String(p.baseToken.address).toLowerCase() === address.toLowerCase());
  const ours = Object.fromEntries(Object.entries(DEX_SLUG).map(([k, v]) => [v, k]));
  const best = pairs.filter(p => ours[p.chainId]).sort((a, b) => ((b.liquidity || {}).usd || 0) - ((a.liquidity || {}).usd || 0))[0];
  return best ? ours[best.chainId] : null;
}

/* ---------- EVM trades, through KyberSwap ---------- */
/* "0.25" → base units, without going through floating point */
function toUnits(s, decimals) {
  const m = new RegExp('^(\\d{1,15})(?:\\.(\\d{1,' + Math.max(1, decimals) + '}))?$').exec(String(s || '').trim());
  return m ? BigInt(m[1]) * 10n ** BigInt(decimals) + BigInt((m[2] || '').padEnd(decimals, '0').slice(0, decimals) || 0) : null;
}
async function route(chain, address, side, amountIn) {
  const [tokenIn, tokenOut] = side === 'buy' ? [KYBER_NATIVE, address] : [address, KYBER_NATIVE];
  return kyber(chain, '/api/v1/routes?' + new URLSearchParams({ tokenIn, tokenOut, amountIn: amountIn.toString(), gasInclude: 'true' }));
}
async function buildSwap({ chain, wallet, address, side, amountIn, slippageBps }) {
  const evm = require('./_evm'), c = evm.rpc(chain), n = evm.NETS[chain];
  const [r, have] = await Promise.all([route(chain, address, side, amountIn),
    side === 'buy' ? c.getBalance({ address: wallet }) : c.readContract({ address, abi: ERC20_CALLS, functionName: 'balanceOf', args: [wallet] })]);
  if (have < amountIn) throw err(400, side === 'buy' ? 'not enough ' + n.symbol + ' in this wallet' : 'you hold less than that');
  const built = await kyber(chain, '/api/v1/route/build', { routeSummary: r.routeSummary, sender: wallet, recipient: wallet, slippageTolerance: slippageBps,
    deadline: Math.floor(Date.now() / 1000) + 600, source: 'tweetpad' });
  /* the swap must go to KyberSwap's router, spending exactly what was asked; anything else never reaches the wallet */
  if (evm.getAddress(built.routerAddress || r.routerAddress) !== KYBER_ROUTER) throw err(502, 'KyberSwap answered with an unknown router');
  const value = side === 'buy' ? amountIn : 0n;
  if (BigInt(built.transactionValue || 0) !== value || BigInt(built.amountIn) !== amountIn) throw err(502, 'KyberSwap\'s route does not match the trade asked for');
  const { encodeFunctionData } = require('viem');
  const calls = [];
  if (side === 'sell') {
    const allowed = await c.readContract({ address, abi: ERC20_CALLS, functionName: 'allowance', args: [wallet, KYBER_ROUTER] });
    if (allowed < amountIn) calls.push({ label: 'allow KyberSwap', to: address, data: encodeFunctionData({ abi: ERC20_CALLS, functionName: 'approve', args: [KYBER_ROUTER, amountIn] }), value: 0n });
  }
  const swap = { label: side, to: KYBER_ROUTER, data: built.data, value };
  /* dry-run the swap as the wallet (a sell still waiting on its approval can't be, until that lands) */
  if (!calls.length) {
    try { await c.call({ account: wallet, to: swap.to, data: swap.data, value: swap.value }); }
    catch (e) { throw err(400, 'the swap would fail: ' + ((e.shortMessage || e.message || '').split('\n')[0]).slice(0, 140)); }
  }
  calls.push(swap);
  const expected = BigInt(built.amountOut);
  return { calls, expected, minimum: expected * BigInt(10000 - slippageBps) / 10000n };
}
const ERC20_CALLS = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ type: 'address' }, { type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }] },
];

module.exports = async (req, res) => {
  if (cors(req, res, 'GET, POST')) return;
  const post = req.method === 'POST';
  const b = post ? await readJson(req) : req.query || {};
  if (!b) return fail(res, 400, 'invalid JSON');
  try {
    if (!post && b.find) {
      if (!isPubkey(b.find) && !isEvmAddress(b.find)) return fail(res, 400, 'invalid address');
      const chain = await findChain(String(b.find));
      res.setHeader('cache-control', 'public, s-maxage=300');
      return chain ? res.status(200).json({ chain, short: SHORT[chain] }) : fail(res, 404, 'no market for this address on any chain here');
    }
    const chain = chainOf(String(b.chain || ''));
    let address = String(b.address || '');
    if (!chain || !fitsChain(chain, address)) return fail(res, 400, 'pass a chain (sol, rh, bnb, base, eth) and a token address on it');
    if (chain !== 'solana') address = require('./_evm').getAddress(address);
    if (!post && !b.side) {
      const t = await token(chain, address);
      res.setHeader('cache-control', 'public, s-maxage=10, stale-while-revalidate=30');
      return t ? res.status(200).json(t) : fail(res, 404, 'not a token on ' + NAME[chain]);
    }
    /* a trade: EVM only (a Solana token's page asks Jupiter itself) */
    res.setHeader('cache-control', 'no-store');
    if (chain === 'solana') return fail(res, 400, 'Solana tokens trade through Jupiter from the page');
    if (!await rateLimit(req, res, 'token-trade', 120, 600)) return;
    if (b.side !== 'buy' && b.side !== 'sell') return fail(res, 400, 'side must be buy or sell');
    const meta = await require('./_evm').readToken(chain, address);
    if (!meta) return fail(res, 404, 'not a token on ' + NAME[chain]);
    const amountIn = toUnits(b.amount, b.side === 'buy' ? 18 : meta.decimals);
    if (!amountIn) return fail(res, 400, 'enter an amount');
    if (b.side === 'buy' && amountIn > 10n * 10n ** 18n) return fail(res, 400, 'buy at most 10 ' + NATIVE[chain] + ' at a time');
    if (!post) return res.status(200).json({ expected: (await route(chain, address, b.side, amountIn)).routeSummary.amountOut });
    if (!isEvmAddress(b.wallet)) return fail(res, 400, 'connect an EVM wallet');
    const slippageBps = Number(b.slippageBps);
    if (!Number.isInteger(slippageBps) || slippageBps < 10 || slippageBps > 5000) return fail(res, 400, 'slippage must be 0.1–50%');
    const t = await buildSwap({ chain, wallet: require('./_evm').getAddress(b.wallet), address, side: b.side, amountIn, slippageBps });
    const hex = (n) => '0x' + n.toString(16);
    return res.status(200).json({ calls: t.calls.map(c => ({ label: c.label, to: c.to, data: c.data, value: hex(c.value) })),
      expected: t.expected.toString(), minimum: t.minimum.toString() });
  } catch (e) {
    return fail(res, e.status || 502, e.status ? e.message : 'could not read it: ' + String(e.shortMessage || e.message || '').split('\n')[0].slice(0, 140));
  }
};
module.exports.token = token;
module.exports.findChain = findChain;
module.exports.chainOf = chainOf;
module.exports.fitsChain = fitsChain;
module.exports.SHORT = SHORT;
module.exports.NAME = NAME;
