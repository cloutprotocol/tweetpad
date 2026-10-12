// Stonkfun launches: a coin paired with a tokenized stock (TSLAx, NVDAx, SPYx…) or USDC, on Raydium's LaunchLab curve, under
// Stonkfun's platform id. Stonkfun reads every pool carrying its platform id each minute and adopts the ones shaped exactly as
// its own builder makes them (https://www.stonkfun.xyz/docs, "Building it yourself"): its chart, its fee ledger, and the
// creator's share of the 1% curve fee forwarded to the creator's wallet. So the create is built here, every number from
// Stonkfun's pricing call, every account derived here and checked against it, and the wallet signs; nothing is paid to
// Stonkfun or tweetpad. Three fee setups, each its own Stonkfun platform:
//   standard:  no transfer tax; the creator's share of the curve fee is forwarded to them
//   reward:    a Token-2022 transfer tax (1% or 3%, Stonkfun's tiers) that Stonkfun collects and pays to holders, in the pair
//   community: a reward coin whose payouts go a third (communityMode.shareBps) to holders of the pair token (stocks only)
// A taxed mint must be exactly Stonkfun's shape, or its tax is withheld for nobody: its rate and withdraw authority are read
// back from the chain before it is listed (api/launches.js).
// GET                → { pairs: [{ mint, symbol, name, image, decimals, community }], tiers: [bps], shareBps }
// GET ?rewards=<mint> → { mode, quote, rewards, pending } (Stonkfun's holder-reward totals for a coin)
// POST { publicKey, mint, name, symbol, uri, image, thumb, quote, mode, taxBps } → { tx (unsigned, base64), pool, startUsd, graduationUsd }
const { PublicKey, TransactionMessage, VersionedTransaction, ComputeBudgetProgram } = require('@solana/web3.js');
const { TOKEN_2022_PROGRAM_ID } = require('@solana/spl-token');
const BN = require('bn.js');
const { cors, readJson, isPubkey, signerKeys, redis, rpc, connection, cleanThumb, rateLimit, fail } = require('./_lib');

const API = 'https://www.stonkfun.xyz/api/public/v1';
const SITE = 'https://www.stonkfun.xyz';
const LAUNCHLAB = 'LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj';   // Raydium LaunchLab; pinned here, never taken from an answer
const PENDING_TTL = 60 * 60;   // seconds a built launch may wait to be signed and sent
const CREATE_CU = 200000;      // initialize_with_token2022 uses ~105k (simulated on mainnet)
const CU_PRICE = 200000;       // micro-lamports per CU: about 0.00004 SOL priority fee at the limit
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const MODES = ['standard', 'reward', 'community'];
/* what tweetpad offers to pair with: SOL, the tokenized stocks, and USDC */
const offered = (p) => p.category === 'xstock' || p.mint === SOL_MINT || p.mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

async function stonk(path) {
  const r = await fetch(API + path, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
  const out = await r.json().catch(() => null);
  if (!r.ok || !out || !out.data) throw Object.assign(new Error('Stonkfun: ' + ((out && out.error && out.error.message) || 'HTTP ' + r.status)), { status: 502 });
  return out.data;
}

/* the pairs a launch can use right now: launchable on Stonkfun and with a LaunchLab config on chain (kept a few minutes) */
async function pairs() {
  try { const [hit] = await redis(['GET', 'stonk:pairs:v2']); if (hit) return JSON.parse(hit); } catch { /* ask Stonkfun */ }
  const list = (await stonk('/pairs?launchable=true&launchLabReady=true')).pairs.filter(p => offered(p) && p.launchable && p.launchLabReady && isPubkey(p.mint) && isPubkey(p.tokenProgram))
    .map(p => ({ mint: p.mint, symbol: p.mint === SOL_MINT ? 'SOL' : p.symbol.replace(/X$/, 'x'), name: p.mint === SOL_MINT ? 'Solana' : p.name,
      image: /^\//.test(p.logoUrl || '') ? SITE + p.logoUrl : '', decimals: p.decimals, tokenProgram: p.tokenProgram, community: p.communityMode === true }))
    /* SOL first, then the stocks as Stonkfun lists them, USDC last */
    .sort((a, b) => (b.mint === SOL_MINT) - (a.mint === SOL_MINT) || (a.symbol === 'USDC') - (b.symbol === 'USDC'));
  /* the tax tiers and Community Mode's share are the same on every pair: read once, from the first stock's pricing */
  const p = await stonk('/launchlab/pricing?quoteMint=' + (list.find(x => x.community) || list[0]).mint);
  const out = { pairs: list, tiers: ((p.modes || {}).reward || {}).transferFeeBps || [], shareBps: (p.communityMode || {}).shareBps || 0 };
  redis(['SET', 'stonk:pairs:v2', JSON.stringify(out), 'EX', 300]).catch(() => {});
  return out;
}

/* a coin's holder-reward totals and what is still to be paid, from Stonkfun's v2 reads (server side: v2 sends no CORS) */
async function rewards(mint) {
  const get = async (path) => {
    const r = await fetch(SITE + '/api/v2/tokens/' + mint + path, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw Object.assign(new Error('Stonkfun: HTTP ' + r.status), { status: r.status === 404 ? 404 : 502 });
    return r.json();
  };
  const [total, pending] = await Promise.all([get('/rewards'), get('/rewards/pending')]);
  return { mode: total.mode, quote: total.quote, basis: total.basis, rewards: total.rewards, base: total.base, pending: pending.pending };
}

/* the create instruction, as Stonkfun's guide builds it, with every account derived here and checked against its pricing */
async function createIx({ wallet, mint, name, symbol, uri, mode, taxBps }, pair) {
  const sdk = require('@raydium-io/raydium-sdk-v2');
  const p = await stonk('/launchlab/pricing?quoteMint=' + pair.mint);
  const reward = (p.modes || {}).reward || {};
  if (mode !== 'standard') {
    if (!(reward.transferFeeBps || []).includes(taxBps)) throw Object.assign(new Error('Stonkfun does not offer a ' + taxBps / 100 + '% tax'), { status: 400 });
    if (!isPubkey(reward.withdrawWithheldAuthority) || reward.baseTokenProgram !== TOKEN_2022_PROGRAM_ID.toBase58()) throw new Error('Stonkfun\'s reward shape changed; not launching');
    if (mode === 'community' && !((p.communityMode || {}).quotes || []).includes(pair.mint)) throw Object.assign(new Error('Community Mode is not offered on $' + pair.symbol), { status: 400 });
  }
  const c = p.curve || {};
  /* the shape Stonkfun adopts, from its own answer; anything else and the pool would trade unrecorded, its fees unforwarded */
  if (c.programId !== LAUNCHLAB || c.curveType !== 'ConstantCurve' || c.migrateType !== 'cpmm' || c.baseDecimals !== 6) throw new Error('Stonkfun\'s launch shape changed; not launching');
  if (!/^\d{1,20}$/.test(c.supply || '') || !/^\d{1,20}$/.test(c.totalSellA || '') || !/^\d{1,20}$/.test((p.raise || {}).raw || '') || p.raise.raw === '0') throw new Error('Stonkfun\'s pricing is incomplete');
  if (BigInt(c.totalSellA) >= BigInt(c.supply)) throw new Error('Stonkfun\'s pricing is out of range');
  if (!p.platform || !isPubkey(p.platform[mode]) || !p.allowConfig || !p.curveRule) throw new Error('Stonkfun\'s pricing has no ' + mode + ' platform');
  const program = new PublicKey(LAUNCHLAB), quote = new PublicKey(pair.mint), platform = new PublicKey(p.platform[mode]);
  const config = sdk.getPdaLaunchpadConfigId(program, quote, 0, 0).publicKey;
  const allow = sdk.getPdaPlatformAllowConfig(program, platform, config).publicKey;
  const rule = sdk.getPdaPlatformCurveRule(program, platform, config).publicKey;
  if (config.toBase58() !== c.configId || allow.toBase58() !== p.allowConfig[mode] || rule.toBase58() !== p.curveRule[mode]) throw new Error('Stonkfun\'s accounts differ from the ones derived here');
  /* the platform id must be a LaunchLab platform, not any account an answer names */
  const info = await connection().getAccountInfo(platform);
  if (!info || info.owner.toBase58() !== LAUNCHLAB) throw new Error('Stonkfun\'s platform is not a LaunchLab platform');
  const creator = new PublicKey(wallet), base = new PublicKey(mint);
  const pool = sdk.getPdaLaunchpadPoolId(program, base, quote).publicKey;
  const ix = sdk.initializeWithToken2022(program, creator, creator, config, platform, sdk.getPdaLaunchpadAuth(program).publicKey, pool, base, quote,
    sdk.getPdaLaunchpadVaultId(program, pool, base).publicKey, sdk.getPdaLaunchpadVaultId(program, pool, quote).publicKey,
    new PublicKey(pair.tokenProgram), 6, name, symbol, uri,
    { type: 'ConstantCurve', supply: new BN(c.supply), totalSellA: new BN(c.totalSellA), totalFundRaisingB: new BN(p.raise.raw), migrateType: 'cpmm' },
    new BN(0), new BN(0), new BN(0), Number(c.cpmmCreatorFeeOn) || 0,
    /* a taxed launch: both keys exactly as the SDK declares them ("maxinumFee" included), or it writes a zero rate */
    mode === 'standard' ? undefined : { transferFeeBasePoints: taxBps, maxinumFee: new BN('1000000000000000') });
  /* the base token program, then the quote's: a reshuffled SDK layout stops here, not on chain */
  if (!ix.keys[10].pubkey.equals(TOKEN_2022_PROGRAM_ID) || ix.keys[11].pubkey.toBase58() !== pair.tokenProgram || ix.keys.length !== 15) throw new Error('the LaunchLab instruction layout changed');
  /* the allow-config, then the curve-rule account, read-only and last: valid whether Stonkfun's allowlist is on or off */
  ix.keys.push({ pubkey: allow, isSigner: false, isWritable: false }, { pubkey: rule, isSigner: false, isWritable: false });
  return { ix, pool: pool.toBase58(), platform: platform.toBase58(), market: p.marketCap || {},
    withholder: mode === 'standard' ? null : reward.withdrawWithheldAuthority, shareBps: mode === 'community' ? (p.communityMode || {}).shareBps || 0 : 0 };
}

/* a build that would fail on chain never reaches the wallet (Phantom flags dApps whose transactions fail) */
async function simulationError(tx) {
  let sim;
  try {
    sim = await rpc('simulateTransaction', [tx.toString('base64'), { encoding: 'base64', sigVerify: false, replaceRecentBlockhash: true, commitment: 'confirmed' }]);
  } catch { return null; }
  const v = sim && sim.value;
  if (!v || !v.err) return null;
  const logs = v.logs || [];
  if (logs.some(l => /insufficient lamports|insufficient funds/i.test(l)) || /InsufficientFunds|AccountNotFound/.test(JSON.stringify(v.err))) return 'not enough SOL in this wallet for the launch and fees';
  const hint = [...logs].reverse().find(l => /error|failed/i.test(l));
  return 'the launch would fail on chain' + (hint ? ': ' + hint.replace(/^Program log: /, '').slice(0, 160) : '');
}

async function build(req, res) {
  if (!await rateLimit(req, res, 'create', 15, 600)) return;
  const b = await readJson(req);
  if (!b) return fail(res, 400, 'invalid JSON');
  const { publicKey, mint, uri, image } = b;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const symbol = b.symbol;
  if (!isPubkey(publicKey) || !isPubkey(mint) || publicKey === mint) return fail(res, 400, 'invalid wallet or mint address');
  if (!name || name.length > 32) return fail(res, 400, 'name must be 1–32 characters');
  if (typeof symbol !== 'string' || !/^[A-Z0-9]{2,10}$/.test(symbol)) return fail(res, 400, 'ticker must be 2–10 letters or numbers');
  if (typeof uri !== 'string' || !uri.startsWith('https://') || uri.length > 200) return fail(res, 400, 'metadata URI must be https');
  const pair = (await pairs()).pairs.find(p => p.mint === b.quote);
  if (!pair) return fail(res, 400, 'Stonkfun does not take that pair right now');
  const mode = b.mode == null ? 'standard' : b.mode;
  const taxBps = mode === 'standard' ? 0 : Number(b.taxBps);
  if (!MODES.includes(mode)) return fail(res, 400, 'mode must be standard, reward or community');
  if (mode !== 'standard' && !Number.isInteger(taxBps)) return fail(res, 400, 'pick a holder-reward tax');
  const thumb = cleanThumb(b.thumb);
  const imageUrl = typeof image === 'string' && /^https:\/\/[A-Za-z0-9.-]{1,64}\/ipfs\/[A-Za-z0-9]{46,100}$/.test(image) ? image : '';

  let built, tx;
  try {
    built = await createIx({ wallet: publicKey, mint, name, symbol, uri, mode, taxBps }, pair);
    const payer = new PublicKey(publicKey);
    const { blockhash } = await connection().getLatestBlockhash('confirmed');
    const message = new TransactionMessage({ payerKey: payer, recentBlockhash: blockhash, instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: CREATE_CU }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: CU_PRICE }), built.ix] }).compileToV0Message();
    tx = Buffer.from(new VersionedTransaction(message).serialize());
  } catch (err) {
    return fail(res, err.status || 502, 'could not build the transaction: ' + err.message);
  }

  const simErr = await simulationError(tx);
  if (simErr) return fail(res, 400, simErr);
  const parsed = signerKeys(tx);
  if (parsed.signers.length !== 2 || parsed.signers[0] !== publicKey || parsed.signers[1] !== mint || !parsed.keys.includes(LAUNCHLAB)) return fail(res, 502, 'built an unexpected transaction');

  try {
    const pending = { venue: 'stonk', mint, creator: publicKey, name, symbol, uri, image: imageUrl, thumb, devBuy: 0,
      quote: { mint: pair.mint, symbol: pair.symbol, image: pair.image }, pool: built.pool, platform: built.platform,
      mode, taxBps, withholder: built.withholder, shareBps: built.shareBps, at: Date.now() };
    /* NX: the first build for a mint holds it, so nobody can swap in their own metadata before it's listed */
    const [set] = await redis(['SET', 'pending:' + mint, JSON.stringify(pending), 'NX', 'EX', PENDING_TTL]);
    if (set !== 'OK') return fail(res, 409, 'this mint is already being launched; start over with a new one');
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
  return res.status(200).json({ ok: true, tx: tx.toString('base64'), pool: built.pool,
    startUsd: Number(built.market.startUsd) || null, graduationUsd: Number(built.market.graduationUsd) || null });
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET, POST')) return;
  try {
    if (req.method === 'GET') {
      const q = req.query || {};
      if (q.rewards != null) {
        if (!isPubkey(q.rewards)) return fail(res, 400, 'invalid mint');
        res.setHeader('cache-control', 'public, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json(await rewards(q.rewards));
      }
      res.setHeader('cache-control', 'public, s-maxage=120, stale-while-revalidate=600');
      const { pairs: list, tiers, shareBps } = await pairs();
      return res.status(200).json({ pairs: list.map(({ tokenProgram, ...p }) => p), tiers, shareBps });
    }
    res.setHeader('cache-control', 'no-store');
    if (req.method === 'POST') return await build(req, res);
    return fail(res, 405, 'GET or POST');
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
};
module.exports.LAUNCHLAB = LAUNCHLAB;
module.exports.SITE = SITE;
