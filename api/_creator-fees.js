// Solana creator fees for one wallet, shared by the Claim button (api/rewards.js) and the auto-claim keeper.
// pump.fun pays a coin's creator fees into the creator's vault, but v3 curve trades (tweetpad's own trades are v3) and v2 pool
// trades leave them on the coin itself (BondingCurve.creatorFee, Pool.creator_fees) until a permissionless sweep moves them
// into the vault. So what a creator has is vault + buckets, and a claim is sweeps first, then the collects.
// Files starting with "_" are not routes.
const { PublicKey } = require('@solana/web3.js');
const { OnlinePumpSdk, PUMP_SDK, creatorVaultPda, bondingCurvePda, canonicalPumpPoolPdaWithQuote, normalizeQuoteMint, getPumpProgram, getPumpAmmProgram } = require('@pump-fun/pump-sdk');
const { coinCreatorVaultAuthorityPda, coinCreatorVaultAtaPda } = require('@pump-fun/pump-swap-sdk');
const { NATIVE_MINT, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } = require('@solana/spl-token');
const { isPubkey, quoteConfig, redis } = require('./_lib');

const MAX_SWEEPS = 6;   // sweeps per claim transaction, largest first; the rest go in the next claim

/* getMultipleAccountsInfo takes 100 keys a call */
async function accounts(conn, keys) {
  const out = [];
  for (let i = 0; i < keys.length; i += 100) out.push(...await conn.getMultipleAccountsInfo(keys.slice(i, i + 100)));
  return out;
}

/* the wallet's pump.fun coins here, newest 200; the search index has each coin's pair, full records fill its gaps */
async function launched(wallet) {
  const [mints] = await redis(['ZREVRANGE', 'creator:' + wallet, 0, 199]);
  const sol = mints.filter(isPubkey);
  if (!sol.length) return [];
  const slim = (await redis(['HMGET', 'launchidx', ...sol]))[0];
  const gaps = sol.filter((m, i) => !slim[i]);
  const full = gaps.length ? (await redis(['MGET', ...gaps.map(m => 'launch:' + m)]))[0] : [];
  /* pump.fun coins only: a Stonkfun coin's creator share is forwarded by Stonkfun, there is nothing here to claim */
  return [...slim, ...full].filter(Boolean).map(r => JSON.parse(r)).filter(l => (!l.chain || l.chain === 'solana') && l.venue !== 'stonk');
}

/* every quote this creator could hold fees in: the current pairing token and each of their coins' pairs (SOL is separate) */
function quotesOf(coins) {
  const quotes = new Map();
  const current = quoteConfig();
  if (current.mint) quotes.set(current.mint, current.symbol);
  for (const l of coins) if (l.quote && isPubkey(l.quote.mint) && !quotes.has(l.quote.mint)) quotes.set(l.quote.mint, l.quote.symbol || 'QUOTE');
  return [...quotes].map(([mint, symbol]) => ({ mint, symbol }));
}

/* the fees waiting on the wallet's coins themselves: one row per coin with a nonzero curve or pool bucket that pays this
   wallet (a coin whose fees go to a sharing config or holder rewards is not this wallet's to sweep) */
async function buckets(conn, wallet, coins) {
  const me = new PublicKey(wallet);
  const mints = coins.map(l => new PublicKey(l.mint));
  const curves = (await accounts(conn, mints.map(m => bondingCurvePda(m)))).map(a => a && PUMP_SDK.decodeBondingCurveNullable(a));
  const quoteOf = curves.map(c => normalizeQuoteMint(c ? c.quoteMint : NATIVE_MINT));
  const pools = await accounts(conn, mints.map((m, i) => canonicalPumpPoolPdaWithQuote(m, quoteOf[i])));
  const amm = getPumpAmmProgram(conn);
  /* the token program and decimals of each token quote (a mint's decimals sit at byte 44 under both token programs) */
  const tokenQuotes = [...new Set(quoteOf.filter(q => !q.equals(NATIVE_MINT)).map(q => q.toBase58()))];
  const quoteInfo = new Map((await accounts(conn, tokenQuotes.map(q => new PublicKey(q)))).map((a, i) => [tokenQuotes[i], a && { program: a.owner, decimals: a.data[44] }]));
  const out = [];
  mints.forEach((mint, i) => {
    const quote = quoteOf[i], sol = quote.equals(NATIVE_MINT), info = sol ? { program: TOKEN_PROGRAM_ID, decimals: 9 } : quoteInfo.get(quote.toBase58());
    if (!info) return;
    const c = curves[i];
    const curve = c && c.creator.equals(me) ? BigInt(c.creatorFee.toString()) : 0n;
    let pool = 0n;
    /* pools from before pump-amm's fee buckets are shorter and have none: they decode as nothing here */
    try { const p = pools[i] && amm.coder.accounts.decode('pool', pools[i].data); if (p && p.coinCreator.equals(me)) pool = BigInt(p.creatorFees.toString()); } catch { /* no bucket */ }
    if (curve > 0n || pool > 0n) out.push({ mint, quote, sol, program: info.program, decimals: info.decimals, curve, pool });
  });
  return out;
}

/* what the wallet can claim: { wallet, sol, quotes: [{ mint, symbol, amount, exists }] }, buckets included */
async function balances(conn, wallet) {
  const creator = new PublicKey(wallet);
  const coins = await launched(wallet).catch(() => []);   // the registry is down: the vaults still show
  const [vault, held] = await Promise.all([new OnlinePumpSdk(conn).getCreatorVaultBalanceBothPrograms(creator), buckets(conn, wallet, coins).catch(() => [])]);
  const solBuckets = held.filter(b => b.sol).reduce((s, b) => s + b.curve + b.pool, 0n);
  const out = { wallet, sol: (Math.max(0, vault.toNumber()) + Number(solBuckets)) / 1e9, quotes: [] };
  const quotes = quotesOf(coins);
  for (const b of held.filter(b => !b.sol)) if (!quotes.some(q => q.mint === b.quote.toBase58())) quotes.push({ mint: b.quote.toBase58(), symbol: 'QUOTE' });
  for (const quote of quotes) {
    const ata = getAssociatedTokenAddressSync(new PublicKey(quote.mint), creatorVaultPda(creator), true, TOKEN_2022_PROGRAM_ID);
    const bal = await conn.getTokenAccountBalance(ata).then(r => r.value).catch(() => null);
    const extra = held.filter(b => !b.sol && b.quote.toBase58() === quote.mint).reduce((s, b) => s + Number(b.curve + b.pool) / 10 ** b.decimals, 0);
    out.quotes.push({ mint: quote.mint, symbol: quote.symbol, amount: (bal ? Number(bal.uiAmountString) : 0) + extra, exists: !!bal || extra > 0 });
  }
  out.held = held;   // for claimIxs; not sent to the page
  return out;
}

/* the claim's instructions, sent in this order: the biggest sweeps (up to MAX_SWEEPS), then the collects for SOL and each
   quote holding fees. `payer` signs and pays the network fee and any rent; the fees themselves only ever go to the creator. */
async function claimIxs(conn, wallet, payer = wallet) {
  const sdk = new OnlinePumpSdk(conn);
  const me = new PublicKey(wallet), fee = new PublicKey(payer);
  const b = await balances(conn, wallet);
  const sweeps = b.held.flatMap(h => [
    h.curve > 0n && { size: h.curve, ix: () => PUMP_SDK.sweepCreatorFeeInstruction({ payer: fee, mint: h.mint, creator: me, quoteMint: h.quote, quoteTokenProgram: h.program }) },
    h.pool > 0n && { size: h.pool, ix: () => PUMP_SDK.sweepPoolCreatorFeeInstruction({ payer: fee, mint: h.mint, coinCreator: me, quoteMint: h.quote, quoteTokenProgram: h.program }) },
  ].filter(Boolean)).sort((x, y) => (y.size > x.size ? 1 : y.size < x.size ? -1 : 0));
  const swept = await Promise.all(sweeps.slice(0, MAX_SWEEPS).map(s => s.ix()));
  const ixs = [];
  if (b.sol > 0) ixs.push(...await sdk.collectCoinCreatorFeeV2Instructions(me, NATIVE_MINT, TOKEN_PROGRAM_ID, fee));
  for (const q of b.quotes.filter(q => q.exists && q.amount > 0)) {
    const mint = new PublicKey(q.mint);
    ixs.push(createAssociatedTokenAccountIdempotentInstruction(fee, getAssociatedTokenAddressSync(mint, me, false, TOKEN_2022_PROGRAM_ID), me, mint, TOKEN_2022_PROGRAM_ID));
    ixs.push(...await sdk.collectCoinCreatorFeeV2Instructions(me, mint, TOKEN_2022_PROGRAM_ID, fee));
  }
  return { sweeps: swept, collects: ixs, balances: b, more: sweeps.length > MAX_SWEEPS };
}

/* auto-claim, signed and paid by the keeper instead of the creator: SOL only, and paid out as SOL. The creator is not there
   to sign the close of a wrapped-SOL account, so the AMM vault's fees go through pump's own vault first
   (transfer_creator_fees_to_pump, permissionless; it skips a vault below the token account rent), and only pump's lamport
   vault is collected. Everything here is permissionless: the keeper pays the network fee, the creator receives the fees.
   Token-quote fees stay for the Claim button. */
async function autoClaimIxs(conn, wallet, keeper) {
  const me = new PublicKey(wallet), fee = new PublicKey(keeper);
  const b = await balances(conn, wallet);
  if (!(b.sol > 0)) return { ixs: [], sol: 0 };
  const swept = b.held.filter(h => h.sol).flatMap(h => [
    h.curve > 0n && { pool: false, ix: PUMP_SDK.sweepCreatorFeeInstruction({ payer: fee, mint: h.mint, creator: me, quoteMint: h.quote, quoteTokenProgram: h.program }) },
    h.pool > 0n && { pool: true, ix: PUMP_SDK.sweepPoolCreatorFeeInstruction({ payer: fee, mint: h.mint, coinCreator: me, quoteMint: h.quote, quoteTokenProgram: h.program }) },
  ].filter(Boolean)).slice(0, MAX_SWEEPS);
  /* the AMM vault's fees move over only when that vault exists: it already did, or a pool sweep in front creates it */
  const ammVault = coinCreatorVaultAtaPda(coinCreatorVaultAuthorityPda(me), NATIVE_MINT, TOKEN_PROGRAM_ID);
  const pooled = swept.some(s => s.pool) || await conn.getAccountInfo(ammVault).then(a => !!a);
  const ixs = await Promise.all(swept.map(s => s.ix));
  if (pooled) ixs.push(await getPumpAmmProgram(conn).methods.transferCreatorFeesToPump()
    .accountsPartial({ wsolMint: NATIVE_MINT, tokenProgram: TOKEN_PROGRAM_ID, coinCreator: me }).instruction());
  ixs.push(await getPumpProgram(conn).methods.collectCreatorFeeV2()
    .accountsPartial({ creator: me, quoteMint: NATIVE_MINT, quoteTokenProgram: TOKEN_PROGRAM_ID, creatorVault: creatorVaultPda(me) }).instruction());
  return { ixs, sol: b.sol };
}

module.exports = { balances, claimIxs, autoClaimIxs };
