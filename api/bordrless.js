// Bordrless launches and trades: a coin on Bordrless's own token standard (not SPL, not Token-2022: tokens live in a program
// built for hooks), launched on its launchpad's curve, paired with bridged SOL, and traded on its DEX. Everything is built here
// with @bordrless/sdk, every program id and config read from the chain, and dry-run on mainnet before the wallet sees it; the
// wallet signs and pays. Nothing is paid to tweetpad (https://bordrless.app/docs/build). A Bordrless holding is not an SPL
// account, so wallets don't list these coins and Jupiter doesn't route them: balances, quotes and swaps all come through here.
// GET                                   → { curve, fees, presets, launchFeeSol } (the launch form: a fresh curve at today's price)
// GET ?hooks=1                         → { presets, workshop } Bordrless's rule presets, and the Workshop's hooks each checked on
//                                         chain with the SDK (who can upgrade the program; what its launch config holds)
// GET ?list=1                          → { tokens } every Bordrless token, highest market cap first (the Tokens page's Bordrless list)
// GET ?token=<mint>                     → the coin's own page (/b/<mint>): everything read with the SDK from the chain (the mint and
//                                         its authorities, the hook and its risk, the launch and its rules, the pool's price, the curve,
//                                         the fees taken), its metadata, and from Bordrless's indexer only what the chain can't
//                                         answer cheaply (candles, trades, holder count, 24h numbers)
// GET ?mint=<mint>                      → the coin as Bordrless reads it (price, cap, rules, fees, progress, holders)
// GET ?mint=<mint>&wallet=<wallet>      → { tokens, bridged, lamports, creatorFees, rewards } (the wallet's coin, bridged SOL and SOL,
//                                         and in lamports what it can claim: its creator fees, its holder rewards)
// GET ?mint=<mint>&side=buy|sell&amount → { expected } (base units; a buy spends SOL, a sell spends the coin)
// GET ?scan=<mint>                      → the scanner: who can change the token, its hook, its rules, its holders, a sell test
// POST { action: 'launch', publicKey, mint, name, symbol, uri, image, thumb, feeBps, preset, devBuy } → { tx, buyTx, expected }
// POST { action: 'trade', wallet, mint, side, amount, slippage }                                       → { tx, expected, minOut }
// POST { action: 'claim', wallet, mint, what: 'creator' | 'rewards' }                                  → { tx, amount }
const { PublicKey } = require('@solana/web3.js');
const { cors, readJson, isPubkey, signerKeys, redis, connection, cleanThumb, rateLimit, fail } = require('./_lib');

const SITE = 'https://bordrless.app';
const LAUNCH = '1jcBymHxBjniZDhNPy51Vgm5Nz7pLUdxa9UBHc4TavC';   // Bordrless's launchpad; pinned here, checked against the SDK's
const TABLE = '4vxVcYLdkqT1rMfGHjAu4kMa9XSEhUdQU5ThVfU5grGQ';    // the protocol lookup table every launch uses (checked by the SDK)
const PENDING_TTL = 60 * 60;   // seconds a built launch may wait to be signed and sent
const MAX_CU = 1400000;        // the dry run's limit; the real one is what it used plus 15%
const CU_PRICE = 100000n;      // micro-lamports per CU: a launch (~300k CU) pays about 0.00003 SOL to land
const MAX_DEV_BUY = 10;        // SOL, as the pump.fun form
const DEV_BUY_CU = 400000;     // the dev buy's limit: a launch-pool buy with the kit uses up to ~300k (the SDK's market maker falls back to 400k)
const FEES = [50, 100, 200];   // the creator fee the form offers (Bordrless's site offers the same three)
const PRESETS = ['plain', 'burn', 'paid-to-hold', 'diamond-hands'];   // Bordrless's rule presets (RULE_PRESETS in @bordrless/shared)

/* the SDK is ESM: imported natively (a require would be transpiled, and its Anchor import breaks), once per instance */
let mods = null;
async function load() {
  if (!mods) mods = await Promise.all([import('@bordrless/sdk'), import('@bordrless/shared')]);
  return mods;
}
const sdk = () => mods[0];
const shared = () => mods[1];
const err = (status, message) => Object.assign(new Error(message), { status });

/* Bordrless's own read API (its indexer: prices, holders, candles); it sends no CORS, so the page reads it through here */
async function bordr(path) {
  const r = await fetch(SITE + '/api' + path, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
  const out = await r.json().catch(() => null);
  if (!r.ok || !out) throw err(r.status === 404 ? 404 : 502, 'Bordrless: ' + ((out && out.error) || 'HTTP ' + r.status));
  return out;
}

/* every Bordrless token, highest market cap first, as the Tokens page and market data read them: Bordrless's own list, 100 a
   page, kept 15s so however many people have the list open it costs a few calls a minute */
const LIST_PAGES = 3;
async function bordrList() {
  try { const [hit] = await redis(['GET', 'bordr:list']); if (hit) return JSON.parse(hit); } catch { /* ask */ }
  const first = await bordr('/launches?sort=mcap&limit=100');
  const pages = Math.min(LIST_PAGES, Math.ceil((first.total || 0) / 100));
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => bordr('/launches?sort=mcap&limit=100&offset=' + (i + 1) * 100).catch(() => ({ launches: [] }))));
  const seen = new Set();
  const tokens = [first, ...rest].flatMap(p => p.launches || []).filter(l => isPubkey(l.mint) && !seen.has(l.mint) && seen.add(l.mint)).map(l => ({
    mint: l.mint, name: l.name, symbol: l.symbol, image: l.image || '', creator: l.creator, creatorKind: l.creatorKind, pool: l.pool, status: l.status,
    time: (l.createdAt || 0) * 1000, mcap: l.mcapUsd || null, price: l.priceUsd || null, priceNative: l.priceQuote || null, change24h: l.priceChange24h ?? null,
    volume24h: l.volume24hUsd || 0, liquidity: l.liquidityUsd || 0, holders: l.holders ?? null, progress: l.progress ?? null,
    feeBps: l.creatorFeeBps || 0, rules: l.rules || null, customHook: l.customHook || null, companion: !!l.companionTag }))
    .sort((a, b) => (b.mcap || 0) - (a.mcap || 0));
  const out = { tokens, total: first.total || tokens.length };
  redis(['SET', 'bordr:list', JSON.stringify(out), 'EX', 15]).catch(() => {});
  return out;
}

/* a Bordrless token not launched on tweetpad, as a launch record the coin page opens (api/launches.js ?mint=): its rules in the
   form tweetpad's own records keep, the locks from the times Bordrless reports */
async function launchRecord(mint) {
  const l = await bordr('/launches/' + mint);
  const r = l.rules || {}, at = l.createdAt || 0;
  return { venue: 'bordrless', external: true, mint: l.mint, name: l.name, symbol: l.symbol, image: l.image || '', thumb: '', uri: l.uri || '',
    creator: l.creator, devBuy: 0, quote: null, time: at * 1000, pool: l.pool, feeBps: l.creatorFeeBps || 0, customHook: l.customHook || null,
    rules: { holderFeeBuyBps: r.holderFeeBuyBps || 0, holderFeeSellBps: r.holderFeeSellBps || 0, burnBuyBps: r.burnBuyBps || 0, burnSellBps: r.burnSellBps || 0,
      maxWalletBps: r.maxWalletBps || 0, creatorLockSecs: r.creatorUnlockAt ? r.creatorUnlockAt - at : 0,
      earlyWindowSecs: r.earlyWindowEndsAt ? r.earlyWindowEndsAt - at : 0, earlyLockSecs: r.earlyUnlockAt ? r.earlyUnlockAt - at : 0 } };
}

/* SOL in dollars, from Bordrless's own prices (so a launch opens at the cap its site would give it), else Jupiter's; kept a minute */
async function solUsd() {
  try { const [hit] = await redis(['GET', 'bordr:solusd']); if (hit) return Number(hit); } catch { /* ask */ }
  let usd = null;
  try {
    const l = (await bordr('/launches?limit=1')).launches[0];
    if (l && l.priceUsd > 0 && l.priceQuote > 0) usd = l.priceUsd / l.priceQuote;
  } catch { /* Jupiter */ }
  if (!usd) {
    const r = await fetch('https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112', { signal: AbortSignal.timeout(8000) });
    const p = r.ok ? await r.json() : null;
    usd = p && p.So11111111111111111111111111111111111111112 && Number(p.So11111111111111111111111111111111111111112.usdPrice);
  }
  if (!(usd > 1 && usd < 100000)) throw err(502, 'no SOL price right now');
  redis(['SET', 'bordr:solusd', String(usd), 'EX', 60]).catch(() => {});
  return usd;
}

/* the protocol lookup table, only if it still holds the protocol's addresses where the SDK expects them */
let table = null;
async function lookupTable() {
  if (table && Date.now() - table.at < 600000) return table.value;
  const { value } = await connection().getAddressLookupTable(new PublicKey(TABLE), { commitment: 'confirmed' });
  const problem = value ? sdk().checkProtocolLookupTable(value) : 'missing';
  if (problem) throw err(502, 'Bordrless\'s lookup table changed (' + problem + '); not building');
  table = { value, at: Date.now() };
  return value;
}

/* the launchpad's config as the chain holds it now: treasury, quote, LP fee, curve, bounds */
async function launchConfig() {
  const s = sdk();
  if (s.LAUNCH_PROGRAM.toBase58() !== LAUNCH) throw err(502, 'the Bordrless SDK names another launchpad');
  const info = await connection().getAccountInfo(s.LAUNCH_CONFIG, 'confirmed');
  if (!info || info.owner.toBase58() !== LAUNCH) throw err(502, 'Bordrless\'s launchpad config cannot be read');
  const cfg = s.decodeLaunchConfig(info.data);
  if (cfg.paused) throw err(503, 'Bordrless\'s launchpad is paused');
  if (!cfg.quoteMint.equals(s.BRIDGED_SOL_MINT)) throw err(502, 'Bordrless\'s launchpad no longer quotes in bridged SOL');
  return cfg;
}

/* the opening curve at today's SOL price: what the launch passes, and what the form estimates a dev buy against */
function freshCurve(cfg, usd) {
  const { virtualQuoteForUsd, curveParams } = shared();
  let vq = virtualQuoteForUsd(usd);
  if (vq < cfg.minVirtualQuote) vq = cfg.minVirtualQuote;
  if (vq > cfg.maxVirtualQuote) vq = cfg.maxVirtualQuote;
  const p = curveParams(cfg.supply, BigInt(cfg.curveBps), vq);
  if (!p) throw err(502, 'Bordrless\'s curve settings are out of range');
  return { ...p, reserves: { baseReserve: p.curveTokens, quoteReserve: 0n, virtualBase: p.virtualBase, virtualQuote: vq } };
}

/* a preset's rules as the launchpad takes them, checked against the config's bounds */
function rulesOf(slug, cfg) {
  const { RULE_PRESETS } = shared();
  const p = RULE_PRESETS.find(x => x.slug === slug);
  if (!p || !PRESETS.includes(slug)) throw err(400, 'pick a rule preset');
  const r = p.rules, b = cfg.ruleBounds;
  if (Math.max(r.holderFeeBuyBps, r.holderFeeSellBps) > b.maxHolderFeeBps || Math.max(r.burnBuyBps, r.burnSellBps) > b.maxBurnBps
    || (r.maxWalletBps && (r.maxWalletBps < b.minMaxWalletBps || r.maxWalletBps > b.maxMaxWalletBps))) throw err(502, 'the ' + p.name + ' preset is outside Bordrless\'s bounds');
  return { input: r, data: sdk().launchRulesFromInput(r) };
}

/* a launch pool's quote, as the DEX and the launch hook run it (the SDK's market maker quotes the same way) */
function quoter(m, now = Math.floor(Date.now() / 1000)) {
  const { quoteLaunchSwap, sniperLpFee, KIT_MODULES } = shared();
  const l = m.launch, pool = m.pool;
  const rewards = !!m.kit && (l.modules & KIT_MODULES.HOLDER_REWARDS) !== 0;
  const params = { creatorFeeBps: l.creatorFeeBps, holderFeeBuyBps: l.rules.holderFeeBuyBps, holderFeeSellBps: l.rules.holderFeeSellBps,
    burnBuyBps: l.rules.burnBuyBps, burnSellBps: l.rules.burnSellBps, eligible: rewards ? m.kit.eligible : 0n, minEligible: rewards ? m.kit.minEligible : 0n };
  const lp = sniperLpFee(now, l.createdAt, l.sniperWindowSecs, l.sniperStartBps, l.lpFeeBps);
  const share = pool.feeModel === sdk().FEE_MODEL_SHARE ? pool.protocolShareBps : 0;
  const reserves = { baseReserve: pool.baseReserve, quoteReserve: pool.quoteReserve, virtualBase: pool.virtualBase, virtualQuote: pool.virtualQuote };
  return (side, amountIn) => {
    const q = quoteLaunchSwap(reserves, side, amountIn, lp, share, params);
    if (q.failure || q.delivered == null) throw err(400, q.failure === 'insufficient_liquidity' ? 'more than the curve holds' : 'too small to trade');
    return q.delivered;
  };
}

/* a coin's launch, pool and kit, read from the chain; only launch pools without a hook of the creator's own trade here */
async function marketOf(mint) {
  const s = sdk(), conn = connection(), key = new PublicKey(mint);
  const info = await conn.getAccountInfo(s.launchAddress(key), 'confirmed');
  if (!info || info.owner.toBase58() !== LAUNCH) throw err(404, 'not a Bordrless launch');
  const launch = s.decodeLaunch(info.data);
  if (launch.customHook) throw err(400, 'this coin runs a hook of its creator\'s own: trade it on bordrless.app');
  const [poolInfo, kitInfo] = await conn.getMultipleAccountsInfo([launch.pool, s.kitConfigAddress(key)], 'confirmed');
  if (!poolInfo || !poolInfo.owner.equals(s.SWAP_PROGRAM)) throw err(502, 'the coin\'s pool cannot be read');
  const kit = launch.modules ? (kitInfo && kitInfo.owner.equals(s.KIT_PROGRAM) ? s.decodeKitConfig(kitInfo.data) : null) : null;
  if (launch.modules && !kit) throw err(502, 'the coin\'s rules cannot be read right now');
  return { key, launch, pool: s.decodePool(poolInfo.data), kit };
}

/* a wallet's two holdings (the coin and bridged SOL) and its SOL, in one round trip */
async function balances(mint, wallet) {
  const s = sdk(), owner = new PublicKey(wallet);
  const [infos, lamports] = await Promise.all([
    connection().getMultipleAccountsInfo([s.holdingAddress(new PublicKey(mint), owner), s.holdingAddress(s.BRIDGED_SOL_MINT, owner)], 'confirmed'),
    connection().getBalance(owner, 'confirmed')]);
  const amount = (i) => (infos[i] && infos[i].owner.equals(s.TOKEN_PROGRAM) ? s.decodeHolding(infos[i].data).amount : 0n);
  return { tokens: amount(0), bridged: amount(1), lamports: BigInt(lamports) };
}

/* what a wallet can claim on a coin, in lamports: the creator's fees (less any config author's share, claimed on Bordrless),
   and the holder rewards the kit owes it (the SDK's mirror of the kit's own sum) */
async function claimable(mint, wallet) {
  const s = sdk(), { rewardsClaimable } = shared(), conn = connection(), key = new PublicKey(mint), owner = new PublicKey(wallet);
  const info = await conn.getAccountInfo(s.launchAddress(key), 'confirmed');
  if (!info || info.owner.toBase58() !== LAUNCH) return { creatorFees: 0n, rewards: 0n, launch: null };
  const l = s.decodeLaunch(info.data);
  const creatorFees = l.creator.equals(owner) && !l.authorShareBps ? l.creatorFeesAccrued - l.creatorFeesClaimed : 0n;
  let rewards = 0n;
  if (l.rules.holderFeeBuyBps || l.rules.holderFeeSellBps) {
    const [kitInfo, vaultInfo, holdInfo] = await conn.getMultipleAccountsInfo([s.kitConfigAddress(key), l.holderVault, s.holdingAddress(key, owner)], 'confirmed');
    if (kitInfo && holdInfo && holdInfo.owner.equals(s.TOKEN_PROGRAM)) {
      const kit = s.decodeKitConfig(kitInfo.data), held = s.decodeHolding(holdInfo.data);
      const vault = vaultInfo && vaultInfo.owner.equals(s.TOKEN_PROGRAM) ? s.decodeHolding(vaultInfo.data).amount : 0n;
      const r = rewardsClaimable(s.kitRewardsOf(kit), vault, Math.floor(Date.now() / 1000), held.amount, s.kitHookDataOf(held), s.kitExcludes(kit, owner));
      rewards = r ? r.payable : 0n;
    }
  }
  return { creatorFees: creatorFees > 0n ? creatorFees : 0n, rewards, launch: l };
}

async function buildClaim(req, res) {
  if (!await rateLimit(req, res, 'trade', 60, 600)) return;
  const b = req.body;
  if (!isPubkey(b.wallet) || !isPubkey(b.mint) || !['creator', 'rewards'].includes(b.what)) return fail(res, 400, 'invalid wallet, mint or claim');
  try {
    const s = sdk(), owner = new PublicKey(b.wallet), key = new PublicKey(b.mint);
    const c = await claimable(b.mint, b.wallet);
    if (!c.launch) throw err(404, 'not a Bordrless launch');
    const amount = b.what === 'creator' ? c.creatorFees : c.rewards;
    if (amount <= 0n) throw err(400, 'nothing to claim yet');
    const { bridged } = await balances(b.mint, b.wallet);
    /* paid in bridged SOL into the wallet's own holding, then unwrapped to plain SOL; bridged SOL held before stays */
    const tx = await fitted(owner, [s.token.createHolding(owner, s.BRIDGED_SOL_MINT, owner),
      b.what === 'creator' ? s.launch.claimCreatorFees(owner, key, c.launch.quoteMint) : s.kit.claim(owner, key, c.launch.quoteMint),
      s.bridge.unwrapSolAbove(owner, bridged)]);
    if (signerKeys(tx).signers.length !== 1 || signerKeys(tx).signers[0] !== b.wallet) return fail(res, 502, 'built an unexpected transaction');
    return res.status(200).json({ ok: true, tx: tx.toString('base64'), amount: amount.toString() });
  } catch (e) {
    return fail(res, e.status || 502, e.message);
  }
}

/* dry-run at the most compute, then rebuild at what it used plus 15%; a refusal comes back in Bordrless's own words */
async function fitted(payer, ixs) {
  const s = sdk(), tables = [await lookupTable()];
  const { blockhash } = await connection().getLatestBlockhash('confirmed');
  const build = (units) => s.buildV0Transaction(payer, [s.setComputeUnitLimit(units), s.setComputeUnitPrice(CU_PRICE), ...ixs], blockhash, tables);
  const probe = build(MAX_CU);
  if (probe.serialize().length > 1232) throw err(400, 'the transaction is too large');
  const sim = await connection().simulateTransaction(probe, { sigVerify: false, replaceRecentBlockhash: true, commitment: 'confirmed' });
  if (sim.value.err) throw err(400, failure(sim.value.logs || [], sim.value.err));
  const used = sim.value.unitsConsumed || 0;
  return Buffer.from(build(used ? Math.min(MAX_CU, Math.ceil(used * 1.15) + 5000) : 400000).serialize());
}
function failure(logs, e) {
  if (logs.some(l => /insufficient lamports|insufficient funds/i.test(l)) || /InsufficientFunds|AccountNotFound/.test(JSON.stringify(e))) return 'not enough SOL in this wallet';
  const said = sdk().explainFailure(logs, e);
  if (said && said.explanation) return said.explanation;
  const hint = [...logs].reverse().find(l => /error|failed/i.test(l));
  return 'it would fail on chain' + (hint ? ': ' + hint.replace(/^Program log: /, '').slice(0, 160) : '');
}

/* decimal string → base units, never through floating point */
const toRaw = (s, d) => { const m = /^(\d{1,12})(?:\.(\d*))?$/.exec(String(s == null ? '' : s).trim()); return m ? BigInt(m[1] + (m[2] || '').slice(0, d).padEnd(d, '0')) : null; };

/* ---------- the launch ---------- */
async function buildLaunch(req, res) {
  if (!await rateLimit(req, res, 'create', 15, 600)) return;
  const b = await readJson(req);
  if (!b) return fail(res, 400, 'invalid JSON');
  const { publicKey, mint, uri, image } = b;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const symbol = b.symbol;
  if (!isPubkey(publicKey) || !isPubkey(mint) || publicKey === mint) return fail(res, 400, 'invalid wallet or mint address');
  if (!name || Buffer.byteLength(name) > 32) return fail(res, 400, 'name must be 1–32 characters');
  if (typeof symbol !== 'string' || !/^[A-Z0-9]{2,10}$/.test(symbol)) return fail(res, 400, 'ticker must be 2–10 letters or numbers');
  if (typeof uri !== 'string' || !uri.startsWith('https://') || uri.length > 200) return fail(res, 400, 'metadata URI must be https');
  const feeBps = Number(b.feeBps);
  if (!FEES.includes(feeBps)) return fail(res, 400, 'creator fee must be 0.5%, 1% or 2%');
  const devBuy = b.devBuy == null ? 0 : Number(b.devBuy);
  if (!(devBuy >= 0 && devBuy <= MAX_DEV_BUY)) return fail(res, 400, 'dev buy must be 0–' + MAX_DEV_BUY + ' SOL');
  const thumb = cleanThumb(b.thumb);
  const imageUrl = typeof image === 'string' && /^https:\/\/[A-Za-z0-9.-]{1,64}\/ipfs\/[A-Za-z0-9]{46,100}$/.test(image) ? image : '';

  let tx, buyTx = null, expected = 0n, rules, curve;
  try {
    const s = sdk(), { quoteLaunchSwap, LAUNCH_PROTOCOL_SHARE_BPS } = shared();
    const cfg = await launchConfig();
    if (feeBps > cfg.maxCreatorFeeBps) throw err(400, 'Bordrless takes a creator fee of at most ' + cfg.maxCreatorFeeBps / 100 + '%');
    rules = rulesOf(b.preset || 'plain', cfg);
    curve = freshCurve(cfg, await solUsd());
    const creator = new PublicKey(publicKey), key = new PublicKey(mint);
    const ixs = [s.launch.createLaunch(creator, key, cfg.treasury, cfg.quoteMint, cfg.lpFeeBps,
      { name, symbol, uri, creatorFeeBps: feeBps, virtualQuote: curve.virtualQuote, rules: rules.data })];
    tx = await fitted(creator, ixs);
    /* the dev buy: its own transaction (with the create it passes Solana's size limit), approved with the launch and sent
       once the launch lands. It can't be dry-run before the pool exists, so it takes a fixed limit; the creator's own first
       buy takes the normal LP fee inside the sniper window, and its minimum leaves room for buys that land between */
    const lamports = BigInt(Math.round(devBuy * 1e9));
    if (lamports > 0n) {
      const r = rules.input;
      const q = quoteLaunchSwap(curve.reserves, 'buy', lamports, cfg.lpFeeBps, LAUNCH_PROTOCOL_SHARE_BPS, { creatorFeeBps: feeBps,
        holderFeeBuyBps: r.holderFeeBuyBps, holderFeeSellBps: r.holderFeeSellBps, burnBuyBps: r.burnBuyBps, burnSellBps: r.burnSellBps, eligible: 0n, minEligible: 0n });
      if (q.failure || !q.delivered) throw err(400, 'the dev buy is ' + (q.failure === 'insufficient_liquidity' ? 'more than the curve holds' : 'too small'));
      if (r.maxWalletBps && q.delivered * 10000n > cfg.supply * BigInt(r.maxWalletBps)) throw err(400, 'the dev buy is over the ' + r.maxWalletBps / 100 + '% max wallet');
      expected = q.delivered;
      const { blockhash } = await connection().getLatestBlockhash('confirmed');
      buyTx = Buffer.from(s.buildV0Transaction(creator, [s.setComputeUnitLimit(DEV_BUY_CU), s.setComputeUnitPrice(CU_PRICE),
        s.token.createHolding(creator, s.BRIDGED_SOL_MINT, creator), s.bridge.wrapSol(creator, lamports), s.token.createHolding(creator, key, creator),
        s.launch.swap(s.launchKeys(key, cfg.quoteMint, cfg.lpFeeBps, rules.data), creator, creator, 1, lamports, expected * 85n / 100n)], blockhash, [await lookupTable()]).serialize());
    }
  } catch (e) {
    return fail(res, e.status || 502, e.status === 400 ? e.message : 'could not build the transaction: ' + e.message);
  }
  const parsed = signerKeys(tx);
  if (parsed.signers.length !== 2 || parsed.signers[0] !== publicKey || parsed.signers[1] !== mint || !parsed.keys.includes(LAUNCH)) return fail(res, 502, 'built an unexpected transaction');

  try {
    const pending = { venue: 'bordrless', mint, creator: publicKey, name, symbol, uri, image: imageUrl, thumb, devBuy, quote: null,
      feeBps, preset: b.preset || 'plain', rules: rules.input, at: Date.now() };
    /* NX: the first build for a mint holds it, so nobody can swap in their own metadata before it's listed */
    const [set] = await redis(['SET', 'pending:' + mint, JSON.stringify(pending), 'NX', 'EX', PENDING_TTL]);
    if (set !== 'OK') return fail(res, 409, 'this mint is already being launched; start over with a new one');
  } catch (e) {
    return fail(res, e.status || 502, e.message);
  }
  if (buyTx && (signerKeys(buyTx).signers.length !== 1 || signerKeys(buyTx).signers[0] !== publicKey)) return fail(res, 502, 'built an unexpected transaction');
  return res.status(200).json({ ok: true, tx: tx.toString('base64'), buyTx: buyTx && buyTx.toString('base64'), expected: expected.toString() });
}

/* a launch built here, re-read from the chain (api/launches.js): its launch account must hold what was built */
async function verifyLaunch(mint, pending) {
  const [s] = await load();
  const info = await connection().getAccountInfo(s.launchAddress(new PublicKey(mint)), 'confirmed');
  if (!info || info.owner.toBase58() !== LAUNCH) throw err(400, 'no Bordrless launch for this mint');
  const l = s.decodeLaunch(info.data), r = pending.rules || {};
  const same = l.creator.toBase58() === pending.creator && l.creatorFeeBps === pending.feeBps && !l.customHook
    && ['holderFeeBuyBps', 'holderFeeSellBps', 'burnBuyBps', 'burnSellBps', 'maxWalletBps', 'earlyWindowSecs', 'earlyLockSecs'].every(k => l.rules[k] === r[k])
    && l.rules.creatorLockSecs === (r.creatorLockDays || 0) * 86400;
  if (!same) throw err(400, 'this launch is not the one built here');
  return { pool: l.pool.toBase58(), feeBps: l.creatorFeeBps, preset: pending.preset, rules: r };
}

/* ---------- trades ---------- */
async function quote(q, res) {
  const side = q.side === 'sell' ? 'sell' : 'buy';
  const raw = toRaw(q.amount, side === 'buy' ? 9 : 6);
  if (!raw) return fail(res, 400, 'invalid amount');
  const m = await marketOf(q.mint);
  res.setHeader('cache-control', 'public, s-maxage=2');
  return res.status(200).json({ expected: quoter(m)(side, raw).toString(), graduated: m.launch.status !== 0 });
}

async function buildTrade(req, res) {
  if (!await rateLimit(req, res, 'trade', 60, 600)) return;
  const b = await readJson(req);
  if (!b || !isPubkey(b.wallet) || !isPubkey(b.mint)) return fail(res, 400, 'invalid wallet or mint');
  const side = b.side === 'sell' ? 'sell' : 'buy', slip = Number(b.slippage);
  if (!(slip > 0 && slip <= 50)) return fail(res, 400, 'slippage must be 0–50%');
  const amountIn = toRaw(b.amount, side === 'buy' ? 9 : 6);
  if (!amountIn) return fail(res, 400, 'invalid amount');
  try {
    const s = sdk(), [m, held] = await Promise.all([marketOf(b.mint), balances(b.mint, b.wallet)]), owner = new PublicKey(b.wallet);
    if (side === 'sell' && amountIn > held.tokens) throw err(400, 'you hold less than that');
    const expected = quoter(m)(side, amountIn);
    const minOut = expected * BigInt(10000 - Math.round(slip * 100)) / 10000n;
    const keys = s.launchKeysOf(m.launch);
    const ixs = [s.token.createHolding(owner, s.BRIDGED_SOL_MINT, owner)];
    if (side === 'buy') {
      /* plain SOL is wrapped one for one into bridged SOL inside the trade; any bridged SOL already held is spent first */
      const wrap = amountIn > held.bridged ? amountIn - held.bridged : 0n;
      if (wrap > 0n) ixs.push(s.bridge.wrapSol(owner, wrap));
      ixs.push(s.token.createHolding(owner, m.key, owner), s.launch.swap(keys, owner, owner, 1, amountIn, minOut));
    } else {
      /* ...and a sell's proceeds are unwrapped back to plain SOL, leaving whatever bridged SOL was held before */
      ixs.push(s.launch.swap(keys, owner, owner, 0, amountIn, minOut), s.bridge.unwrapSolAbove(owner, held.bridged));
    }
    const tx = await fitted(owner, ixs);
    const parsed = signerKeys(tx);
    if (parsed.signers.length !== 1 || parsed.signers[0] !== b.wallet) return fail(res, 502, 'built an unexpected transaction');
    return res.status(200).json({ ok: true, tx: tx.toString('base64'), expected: expected.toString(), minOut: minOut.toString() });
  } catch (e) {
    return fail(res, e.status || 502, e.message);
  }
}

/* ---------- a coin's own page (/b/<mint>) ---------- */
/* the metadata its uri points to (https only, small, quick): picture, description, links */
async function metadataOf(uri) {
  if (typeof uri !== 'string' || !/^https:\/\//.test(uri)) return {};
  try {
    const r = await fetch(uri, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(5000) });
    const text = r.ok ? await r.text() : '';
    if (!text || text.length > 65536) return {};
    const j = JSON.parse(text), x = j.extensions || {};
    const url = (v) => (typeof v === 'string' && /^https:\/\/[^\s"<>]{1,200}$/.test(v) ? v : null);
    return { image: url(j.image), description: typeof j.description === 'string' ? j.description.slice(0, 280) : '',
      twitter: url(j.twitter || x.twitter), telegram: url(j.telegram || x.telegram), website: url(j.website || x.website) };
  } catch { return {}; }
}
/* holders' share of 24h, candles and trades from the indexer: the page still stands without them */
async function indexed(mint) {
  const [l, c, tr, ho] = await Promise.all([bordr('/launches/' + mint), bordr('/launches/' + mint + '/candles?limit=96'),
    bordr('/launches/' + mint + '/trades'), bordr('/launches/' + mint + '/holders')].map(p => p.catch(() => null)));
  return {
    market: l && { change24h: l.priceChange24h ?? null, volume24hUsd: l.volume24hUsd || 0, trades24h: l.trades24h || 0, holders: l.holders ?? null, creatorKind: l.creatorKind || null,
      buyFeeBps: l.buyFeeBps || null, sellFeeBps: l.sellFeeBps || null, image: l.image || null },
    candles: ((c && c.candles) || []).map(k => [k.t, k.o, k.h, k.l, k.c, k.v]),
    trades: ((tr && tr.trades) || []).slice(0, 20).map(x => ({ side: x.side, sol: Number(x.quoteAmount) / 1e9, tokens: Number(x.baseAmount) / 1e6, wallet: x.trader, time: x.ts * 1000, tx: x.signature })),
    holders: ((ho && ho.holders) || []).slice(0, 8).map(h => ({ owner: h.owner, share: h.share, label: h.label || null })),
  };
}
async function token(mint) {
  const s = sdk(), conn = connection(), key = new PublicKey(mint);
  const [mintInfo, launchInfo] = await conn.getMultipleAccountsInfo([key, s.launchAddress(key)], 'confirmed');
  if (!mintInfo || !mintInfo.owner.equals(s.TOKEN_PROGRAM)) throw err(404, 'not a Bordrless token');
  const t = s.decodeMint(mintInfo.data);
  const l = launchInfo && launchInfo.owner.toBase58() === LAUNCH ? s.decodeLaunch(launchInfo.data) : null;
  const [poolInfo] = l ? await conn.getMultipleAccountsInfo([l.pool], 'confirmed') : [null];
  const pool = poolInfo && poolInfo.owner.equals(s.SWAP_PROGRAM) ? s.decodePool(poolInfo.data) : null;
  const [hook, meta, usd, ix] = await Promise.all([
    t.hookProgram ? s.hookRiskLabel(conn, t.hookProgram, { mint: key, hash: 'never' }).catch(() => null) : null,
    metadataOf(t.uri), solUsd().catch(() => null), indexed(mint)]);
  const risk = s.mintRiskOf(t, hook);
  /* the price is the pool's own: its reserves with the curve's virtual ones, SOL (9 decimals) per token (its decimals) */
  const priceSol = pool ? Number(pool.quoteReserve + pool.virtualQuote) / Number(pool.baseReserve + pool.virtualBase) * 10 ** (t.decimals - 9) : null;
  const supply = Number(t.supply) / 10 ** t.decimals;
  return {
    mint, name: t.name, symbol: t.symbol, uri: t.uri, decimals: t.decimals, supply: str(t.supply), maxSupply: str(t.maxSupply), createdAt: t.createdAt,
    image: meta.image || (ix.market && ix.market.image) || null, description: meta.description || '', links: { twitter: meta.twitter || null, telegram: meta.telegram || null, website: meta.website || null },
    authorities: { mint: str(t.mintAuthority), freeze: str(t.freezeAuthority), hook: str(t.hookAuthority), metadata: str(t.metadataAuthority) },
    hook: t.hookProgram ? { program: str(t.hookProgram), kind: t.hookProgram.equals(s.KIT_PROGRAM) ? 'kit' : 'custom',
      runs: Object.entries(HOOK_CALLS).filter(([bit]) => t.hookFlags & Number(bit)).map(([, w]) => w), words: hook ? hook.words : null } : null,
    risk: { severity: risk.severity, words: risk.words },
    launch: l && { status: l.status === 0 ? 'curve' : 'graduated', creator: str(l.creator), createdAt: l.createdAt, graduatedAt: l.graduatedAt || null,
      feeBps: l.creatorFeeBps, lpFeeBps: l.lpFeeBps, rules: s.launchRulesInputOf(l.rules), sniperEndsAt: l.createdAt + l.sniperWindowSecs, sniperStartBps: l.sniperStartBps,
      creatorUnlockAt: l.creatorUnlockAt || null, earlyUnlockAt: l.earlyUnlockAt || null, customHook: str(l.customHook),
      creatorFeesSol: Number(l.creatorFeesAccrued) / 1e9, holderFeesSol: Number(l.holderFeesAccrued) / 1e9, burned: Number(l.burnedOnTrades) / 10 ** t.decimals,
      graduationSol: Number(l.graduationQuote) / 1e9, raisedSol: pool ? Number(pool.quoteReserve) / 1e9 : null,
      progress: l.status !== 0 ? 1 : pool && l.graduationQuote > 0n ? Math.min(1, Number(pool.quoteReserve) / Number(l.graduationQuote)) : null },
    pool: pool && { address: str(l.pool), liquiditySol: Number(pool.quoteReserve) / 1e9, priceSol },
    solUsd: usd, priceUsd: priceSol != null && usd ? priceSol * usd : null, mcapUsd: priceSol != null && usd ? priceSol * usd * supply : null,
    liquidityUsd: pool && usd ? Number(pool.quoteReserve) / 1e9 * usd * 2 : null,
    tradeable: !!(l && pool && !l.customHook),
    ...ix,
  };
}

/* ---------- hooks: the kit's presets and the Workshop's hooks (the /bordrless section's Hooks) ---------- */
/* the Workshop's approved hooks from Bordrless's API, each read again on chain: the program's upgrade label (hookRiskLabel) and
   its launch config (decodeLaunchConfigAccount); kept a minute */
async function hooks() {
  try { const [hit] = await redis(['GET', 'bordr:hooks']); if (hit) return JSON.parse(hit); } catch { /* ask */ }
  const s = sdk(), conn = connection();
  const items = ((await bordr('/workshop').catch(() => ({ items: [] }))).items || []).filter(i => i.status === 'approved' && i.deployed && isPubkey(i.program)).slice(0, 24);
  const configs = await conn.getMultipleAccountsInfo(items.map(i => (isPubkey(i.config) ? new PublicKey(i.config) : s.LAUNCH_CONFIG)), 'confirmed');
  const workshop = await Promise.all(items.map(async (i, n) => {
    const risk = await s.hookRiskLabel(conn, new PublicKey(i.program), { hash: 'never' }).catch(() => null);
    const info = isPubkey(i.config) ? configs[n] : null;
    let config = null;
    if (info && info.owner.toBase58() === LAUNCH) {
      try {
        const c = s.decodeLaunchConfigAccount(info.data);
        config = { address: i.config, creatorFeeBps: c.creatorFeeBps, authorShareBps: c.authorShareBps, label: c.label, hook: str(c.customHook) };
      } catch { /* not a config this SDK reads */ }
    }
    const r = i.reading || {};
    return { name: i.name, kind: i.kind, program: i.program, author: i.author, launches: i.launches || 0, measuredCutBps: i.measuredCutBps || 0,
      title: r.title || null, does: r.does || null, total: (r.total && r.total.text) || null, verdict: r.verdict || null,
      rules: (r.rules || []).slice(0, 6).map(x => ({ on: x.on, when: x.when, text: x.text })), watch: (r.watch || []).slice(0, 3).map(w => w.text),
      risk: risk && { class: risk.class, severity: risk.severity, words: risk.words, studio: !!(risk.studio && risk.studio.current) },
      config: config && config.hook === i.program ? config : null, script: i.scriptProgram || null };
  }));
  const out = { presets: shared().RULE_PRESETS.filter(p => PRESETS.includes(p.slug)).map(p => ({ slug: p.slug, name: p.name, description: p.description, rules: p.rules })), workshop };
  redis(['SET', 'bordr:hooks', JSON.stringify(out), 'EX', 60]).catch(() => {});
  return out;
}

/* ---------- the scanner ---------- */
const HOOK_CALLS = { 1: 'before transfers', 2: 'after transfers', 4: 'before mints', 8: 'after mints', 16: 'before burns', 32: 'after burns' };
/* the SDK carries its own copy of web3.js, so its keys aren't this file's PublicKey: anything with toBase58 is a key */
const str = (v) => (v == null ? null : typeof v === 'bigint' ? v.toString() : typeof v.toBase58 === 'function' ? v.toBase58() : v);
async function scan(mint) {
  const s = sdk(), conn = connection(), key = new PublicKey(mint);
  const info = await conn.getAccountInfo(key, 'confirmed');
  if (!info) throw err(404, 'nothing at this address');
  const owner = info.owner.toBase58();
  if (owner !== s.TOKEN_PROGRAM.toBase58()) return splScan(mint, info);
  const t = s.decodeMint(info.data);
  const [hook, launchInfo, market, holders] = await Promise.all([
    t.hookProgram ? s.hookRiskLabel(conn, t.hookProgram, { mint: key, hash: 'never' }).catch(() => null) : null,
    conn.getAccountInfo(s.launchAddress(key), 'confirmed'),
    bordr('/launches/' + mint).catch(() => null),
    bordr('/launches/' + mint + '/holders').catch(() => null)]);
  const risk = s.mintRiskOf(t, hook);
  const out = {
    standard: 'bordrless', mint, name: t.name, symbol: t.symbol, uri: t.uri, decimals: t.decimals, supply: str(t.supply), maxSupply: str(t.maxSupply),
    createdAt: t.createdAt, creator: str(t.creator), image: (market && market.image) || null,
    authorities: { mint: str(t.mintAuthority), freeze: str(t.freezeAuthority), hook: str(t.hookAuthority), metadata: str(t.metadataAuthority) },
    hook: t.hookProgram ? { program: str(t.hookProgram), runs: Object.entries(HOOK_CALLS).filter(([bit]) => t.hookFlags & Number(bit)).map(([, w]) => w),
      kind: t.hookProgram.equals(s.KIT_PROGRAM) ? 'kit' : 'custom', risk: hook && { class: hook.class, severity: hook.severity, words: hook.words, audited: hook.audited,
        blocked: hook.blocked, delaySecs: hook.delaySecs, callees: (hook.callees || []).length } } : null,
    risk: { severity: risk.severity, words: risk.words, reasons: risk.reasons.map(r => ({ severity: r.severity, words: r.words })) },
    launch: null, market: null, holders: [], sellTest: null,
  };
  if (launchInfo && launchInfo.owner.toBase58() === LAUNCH) {
    const l = s.decodeLaunch(launchInfo.data);
    out.launch = { pool: str(l.pool), status: l.status === 0 ? 'curve' : 'graduated', creator: str(l.creator), creatorFeeBps: l.creatorFeeBps, lpFeeBps: l.lpFeeBps,
      rules: l.rules, createdAt: l.createdAt, graduatedAt: l.graduatedAt || null, creatorUnlockAt: l.creatorUnlockAt || null, earlyUnlockAt: l.earlyUnlockAt || null,
      customHook: str(l.customHook), creatorFees: { accrued: str(l.creatorFeesAccrued), claimed: str(l.creatorFeesClaimed) },
      holderFees: str(l.holderFeesAccrued), burned: str(l.burnedOnTrades), progress: l.status === 0 ? null : 1 };
  }
  if (market) {
    out.market = { priceUsd: market.priceUsd, mcapUsd: market.mcapUsd, liquidityUsd: market.liquidityUsd, volume24hUsd: market.volume24hUsd, trades24h: market.trades24h,
      change24h: market.priceChange24h, holders: market.holders, progress: market.progress, buyFeeBps: market.buyFeeBps, sellFeeBps: market.sellFeeBps,
      creatorShare: market.creatorShare, creatorKind: market.creatorKind, companion: market.companionTag || null };
    if (out.launch) out.launch.progress = market.progress;
  }
  if (holders && Array.isArray(holders.holders)) {
    out.holders = holders.holders.slice(0, 12).map(h => ({ owner: h.owner, share: h.share, label: h.label || null, amount: h.amount }));
  }
  /* the honeypot test: a tenth of the biggest wallet's bag, sold on its pool in a dry run (no signature is needed to simulate) */
  if (out.launch && !out.launch.customHook) {
    const seller = out.holders.find(h => !h.label || h.label === 'creator');
    if (seller) out.sellTest = await sellTest(mint, seller.owner).catch(e => ({ ok: false, words: e.message }));
  }
  return out;
}
async function sellTest(mint, wallet) {
  const s = sdk(), m = await marketOf(mint), owner = new PublicKey(wallet);
  const held = await balances(mint, wallet);
  const amountIn = held.tokens / 10n;
  if (amountIn <= 0n) return null;
  const expected = quoter(m)('sell', amountIn);
  const ixs = [s.token.createHolding(owner, s.BRIDGED_SOL_MINT, owner), s.launch.swap(s.launchKeysOf(m.launch), owner, owner, 0, amountIn, expected * 95n / 100n)];
  try {
    await fitted(owner, ixs);
    return { ok: true, wallet, sold: amountIn.toString(), got: expected.toString(), words: 'A holder can sell: a tenth of the biggest bag sells for ' + (Number(expected) / 1e9).toFixed(4) + ' SOL in a dry run' };
  } catch (e) {
    /* a wallet out of SOL can't pay the fee: that says nothing about the coin */
    if (/not enough SOL/.test(e.message)) return null;
    return { ok: false, wallet, words: 'A dry-run sell was refused: ' + e.message };
  }
}
/* not a Bordrless token: an SPL or Token-2022 mint's authorities, which is what can still change under its holders */
async function splScan(mint, info) {
  const spl = require('@solana/spl-token');
  const program = info.owner.equals(spl.TOKEN_PROGRAM_ID) ? 'spl' : info.owner.equals(spl.TOKEN_2022_PROGRAM_ID) ? 'token-2022' : null;
  if (!program) throw err(400, 'not a token mint: this address belongs to ' + info.owner.toBase58());
  const m = spl.unpackMint(new PublicKey(mint), info, info.owner);
  const reasons = [];
  if (m.freezeAuthority) reasons.push({ severity: 'high', words: 'Someone can freeze any holder\'s tokens.' });
  if (m.mintAuthority) reasons.push({ severity: 'high', words: 'Someone can mint more of it, without limit.' });
  let fee = null, hook = null;
  if (program === 'token-2022') {
    const tf = spl.getTransferFeeConfig(m), th = spl.getTransferHook(m);
    if (tf) { fee = tf.newerTransferFee.transferFeeBasisPoints; if (fee) reasons.push({ severity: 'medium', words: 'Every transfer is taxed ' + fee / 100 + '%.' }); }
    if (th && !th.programId.equals(PublicKey.default)) { hook = th.programId.toBase58(); reasons.push({ severity: 'medium', words: 'A transfer hook can refuse transfers; it cannot change amounts.' }); }
  }
  const order = { high: 2, medium: 1, low: 0 };
  const top = reasons.sort((a, b) => order[b.severity] - order[a.severity])[0];
  return { standard: program, mint, decimals: m.decimals, supply: m.supply.toString(),
    authorities: { mint: str(m.mintAuthority), freeze: str(m.freezeAuthority) }, transferFeeBps: fee, transferHook: hook,
    risk: { severity: top ? top.severity : 'low', words: top ? top.words : 'Fixed: nobody can mint more or freeze it.', reasons } };
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET, POST')) return;
  try {
    await load();
    if (req.method === 'GET') {
      const q = req.query || {};
      if (q.scan != null) {
        if (!isPubkey(q.scan)) return fail(res, 400, 'invalid address');
        if (!await rateLimit(req, res, 'scan', 60, 600)) return;
        res.setHeader('cache-control', 'public, s-maxage=20, stale-while-revalidate=60');
        return res.status(200).json(await scan(q.scan));
      }
      if (q.token != null) {
        if (!isPubkey(q.token)) return fail(res, 400, 'invalid mint');
        res.setHeader('cache-control', 'public, s-maxage=5, stale-while-revalidate=30');
        return res.status(200).json(await token(q.token));
      }
      if (q.hooks != null) {
        res.setHeader('cache-control', 'public, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json(await hooks());
      }
      if (q.list != null) {
        res.setHeader('cache-control', 'public, s-maxage=15, stale-while-revalidate=60');
        return res.status(200).json(await bordrList());
      }
      if (q.mint != null) {
        if (!isPubkey(q.mint)) return fail(res, 400, 'invalid mint');
        if (q.wallet != null) {
          if (!isPubkey(q.wallet)) return fail(res, 400, 'invalid wallet');
          res.setHeader('cache-control', 'no-store');
          const [b, c] = await Promise.all([balances(q.mint, q.wallet), claimable(q.mint, q.wallet).catch(() => ({ creatorFees: 0n, rewards: 0n }))]);
          return res.status(200).json({ tokens: b.tokens.toString(), bridged: b.bridged.toString(), lamports: b.lamports.toString(),
            creatorFees: c.creatorFees.toString(), rewards: c.rewards.toString() });
        }
        if (q.side != null) return await quote(q, res);
        res.setHeader('cache-control', 'public, s-maxage=5, stale-while-revalidate=30');
        return res.status(200).json(await bordr('/launches/' + q.mint));
      }
      const cfg = await launchConfig(), c = freshCurve(cfg, await solUsd());
      res.setHeader('cache-control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.status(200).json({
        /* the shape of api/launches?curve=new, so the form's dev-buy estimate reads either: the fee is the creator fee and the LP fee */
        curve: { virtualSol: c.virtualQuote.toString(), virtualTokens: (c.curveTokens + c.virtualBase).toString(), realTokens: c.curveTokens.toString(),
          supply: cfg.supply.toString(), feeBps: cfg.lpFeeBps, decimals: cfg.decimals, graduationSol: Number(c.graduationQuote) / 1e9 },
        fees: FEES.filter(f => f <= cfg.maxCreatorFeeBps), launchFeeSol: Number(cfg.launchFeeLamports) / 1e9, sniperSecs: cfg.sniperWindowSecs, sniperStartBps: cfg.sniperStartBps,
        presets: shared().RULE_PRESETS.filter(p => PRESETS.includes(p.slug)).map(p => ({ slug: p.slug, name: p.name, description: p.description, rules: p.rules })),
      });
    }
    res.setHeader('cache-control', 'no-store');
    if (req.method === 'POST') {
      const b = await readJson(req);
      req.body = b;   // read once; the builders read it again from here
      if (b && b.action === 'launch') return await buildLaunch(req, res);
      if (b && b.action === 'trade') return await buildTrade(req, res);
      if (b && b.action === 'claim') return await buildClaim(req, res);
      return fail(res, 400, 'action must be launch, trade or claim');
    }
    return fail(res, 405, 'GET or POST');
  } catch (e) {
    return fail(res, e.status || 502, e.message);
  }
};
module.exports.LAUNCH = LAUNCH;
module.exports.SITE = SITE;
module.exports.verifyLaunch = verifyLaunch;
module.exports.bordr = bordr;
module.exports.bordrList = bordrList;
module.exports.launchRecord = launchRecord;
/* the page and its card read the same coin (api/b.js), the SDK loaded first */
module.exports.token = async (mint) => { await load(); return token(mint); };
