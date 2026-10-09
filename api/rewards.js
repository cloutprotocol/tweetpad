// EVM chains (an 0x wallet: Robinhood Chain, BNB Chain, Base): creator fees are what Launch Party's hook on each chain holds
// for the creator's coins there; the claim is one sweep per coin (paid out to the creator, the holders and the platform at
// once), so POST returns a list of calls to send, for one chain at a time.
//   GET  ?wallet=0x…                       → { evm: true, wallet, chains: [{ chain, symbol, amount, perCoin }] }   (chains with coins)
//   POST { wallet: 0x…, chain }            → { calls: [{ to, data, label }] }
//   GET  ?coin=0x…&holder=0x…&chain        → { earned, claim: { to, data } }   a holder's rewards in one coin (native coin)
// Creator rewards: the fees pump.fun has set aside for a coin creator, per quote token: SOL, the current pairing token,
// and any token the creator's own launches were paired with (coins launched before a pairing change keep earning in it).
// GET ?wallet=<w>            → claimable amounts
// POST { wallet }            → an unsigned claim transaction for the wallet to sign and send; it only includes the
//                              quotes that hold fees (collecting from a quote vault that does not exist fails).
const { PublicKey, TransactionMessage, VersionedTransaction, ComputeBudgetProgram } = require('@solana/web3.js');
const { OnlinePumpSdk, creatorVaultPda } = require('@pump-fun/pump-sdk');
const { NATIVE_MINT, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } = require('@solana/spl-token');
const { cors, readJson, isPubkey, isEvmAddress, EVM_CHAINS, connection, quoteConfig, redis, rateLimit, fail } = require('./_lib');

/* an EVM creator's coins, with the chain, pool and split each was launched with */
async function evmCoins(wallet) {
  const [mints] = await redis(['ZREVRANGE', 'creator:' + wallet, 0, 199]);
  const rows = mints.length ? (await redis(['MGET', ...mints.map(m => 'launch:' + m)]))[0] : [];
  return rows.filter(Boolean).map(r => JSON.parse(r)).filter(l => EVM_CHAINS.includes(l.chain));
}
async function evmRoute(req, res) {
  const evm = require('./_evm');
  const q = req.query || {};
  if (req.method === 'GET' && q.coin) {
    const chain = q.chain || 'robinhood';
    if (!isEvmAddress(q.coin) || !isEvmAddress(q.holder) || !EVM_CHAINS.includes(chain)) return fail(res, 400, 'invalid coin, holder or chain');
    const r = await evm.holderRewards(chain, evm.getAddress(q.coin), evm.getAddress(q.holder));
    return res.status(200).json({ earned: (Number(r.earned) / 1e18), claim: r.claim });
  }
  const b = req.method === 'GET' ? q : (req.body || await readJson(req) || {});
  if (!isEvmAddress(b.wallet)) return fail(res, 400, 'invalid wallet');
  const wallet = evm.getAddress(b.wallet), coins = await evmCoins(wallet);
  if (req.method === 'GET') {
    /* every chain the creator has coins on, read in parallel; a chain whose RPC is down shows as unavailable, not as zero */
    const chains = [...new Set(coins.map(l => l.chain))];
    const out = await Promise.all(chains.map(chain => evm.creatorFees(chain, wallet, coins.filter(l => l.chain === chain)).then(
      fees => ({ chain, symbol: evm.NETS[chain].symbol, amount: Number(fees.total) / 1e18, perCoin: fees.perCoin.map(c => ({ mint: c.mint, symbol: c.symbol, amount: Number(c.mine) / 1e18 })) }),
      () => ({ chain, symbol: evm.NETS[chain].symbol, amount: null, perCoin: [] }))));
    return res.status(200).json({ evm: true, wallet, chains: out });
  }
  const chain = b.chain || 'robinhood';
  if (!EVM_CHAINS.includes(chain)) return fail(res, 400, 'unknown chain');
  const calls = evm.claimCalls(chain, wallet, await evm.creatorFees(chain, wallet, coins.filter(l => l.chain === chain)));
  return calls.length ? res.status(200).json({ ok: true, calls }) : fail(res, 400, 'nothing to claim yet');
}

/* every non-SOL quote this creator could hold fees in */
async function creatorQuotes(wallet) {
  const quotes = new Map();
  const current = quoteConfig();
  if (current.mint) quotes.set(current.mint, current.symbol);
  try {
    const [mints] = await redis(['ZREVRANGE', 'creator:' + wallet, 0, 199]);
    /* the slim search index (see launches.js) has each coin's pair without its thumbnail; fall back to full records if a coin isn't in it */
    const slim = mints.length ? (await redis(['HMGET', 'launchidx', ...mints]))[0] : [];
    const gaps = mints.filter((m, i) => !slim[i]);
    const full = gaps.length ? (await redis(['MGET', ...gaps.map(m => 'launch:' + m)]))[0] : [];
    for (const row of [...slim, ...full].filter(Boolean)) {
      const q = JSON.parse(row).quote;
      if (q && isPubkey(q.mint) && !quotes.has(q.mint)) quotes.set(q.mint, q.symbol || 'QUOTE');
    }
  } catch { /* the registry is down: the current quote still shows */ }
  return [...quotes].map(([mint, symbol]) => ({ mint, symbol }));
}

async function balances(wallet) {
  const conn = connection();
  const creator = new PublicKey(wallet);
  const sol = await new OnlinePumpSdk(conn).getCreatorVaultBalanceBothPrograms(creator);
  const out = { wallet, sol: Math.max(0, sol.toNumber()) / 1e9, quotes: [] };
  for (const quote of await creatorQuotes(wallet)) {
    const ata = getAssociatedTokenAddressSync(new PublicKey(quote.mint), creatorVaultPda(creator), true, TOKEN_2022_PROGRAM_ID);
    const bal = await conn.getTokenAccountBalance(ata).then(r => r.value).catch(() => null);
    out.quotes.push({ mint: quote.mint, symbol: quote.symbol, amount: bal ? Number(bal.uiAmountString) : 0, exists: !!bal });
  }
  return out;
}

async function claimTx(wallet) {
  const conn = connection();
  const sdk = new OnlinePumpSdk(conn);
  const me = new PublicKey(wallet);
  const b = await balances(wallet);
  const ixs = [];
  if (b.sol > 0) ixs.push(...await sdk.collectCoinCreatorFeeV2Instructions(me, NATIVE_MINT, TOKEN_PROGRAM_ID, me));
  for (const q of b.quotes.filter(q => q.exists && q.amount > 0)) {
    const mint = new PublicKey(q.mint);
    ixs.push(createAssociatedTokenAccountIdempotentInstruction(me, getAssociatedTokenAddressSync(mint, me, false, TOKEN_2022_PROGRAM_ID), me, mint, TOKEN_2022_PROGRAM_ID));
    ixs.push(...await sdk.collectCoinCreatorFeeV2Instructions(me, mint, TOKEN_2022_PROGRAM_ID, me));
  }
  if (!ixs.length) return null;
  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  const message = new TransactionMessage({ payerKey: me, recentBlockhash: blockhash,
    instructions: [ComputeBudgetProgram.setComputeUnitLimit({ units: 300000 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200000 }), ...ixs] }).compileToV0Message();
  return Buffer.from(new VersionedTransaction(message).serialize()).toString('base64');
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET, POST')) return;
  res.setHeader('cache-control', 'no-store');
  try {
    /* EVM chains: 0x wallets and coins */
    const q = req.query || {};
    if (isEvmAddress(q.wallet) || isEvmAddress(q.coin)) return await evmRoute(req, res);
    if (req.method === 'POST') {
      const peek = await readJson(req);
      if (peek && isEvmAddress(peek.wallet)) { if (!await rateLimit(req, res, 'claim', 20, 600)) return; req.body = peek; return await evmRoute(req, res); }
      req.body = peek;
    }
    if (req.method === 'GET') {
      const wallet = String((req.query && req.query.wallet) || '');
      if (!isPubkey(wallet)) return fail(res, 400, 'invalid wallet');
      return res.status(200).json(await balances(wallet));
    }
    if (req.method !== 'POST') return fail(res, 405, 'GET or POST');
    if (!await rateLimit(req, res, 'claim', 20, 600)) return;
    const b = await readJson(req);
    if (!b || !isPubkey(b.wallet)) return fail(res, 400, 'invalid wallet');
    const tx = await claimTx(b.wallet);
    return tx ? res.status(200).json({ ok: true, tx }) : fail(res, 400, 'nothing to claim yet');
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
};
