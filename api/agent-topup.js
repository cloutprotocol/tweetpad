// Topping up an agent: anyone can, in SOL or by burning $TP (spec: "Credits and compute", Top up).
//   GET  ?prices                                     → { solUsd, tpUsd, burnBonus, sol: bool, burn: bool, minUsd }
//   POST { action: 'build', name, payer, kind: 'sol' | 'burn', amount }  → { transaction } (base64, unsigned; the wallet signs it)
//        sol: a transfer to AGENT_TREASURY; burn: a real burn of $TP from the payer's own account. Either carries a memo,
//        "tweetpad agent <name>", which is what ties the payment to the agent.
//   POST { action: 'confirm', name, signature }      → { usd, credits } once the transaction is confirmed on chain
// The server reads the confirmed transaction itself (amount, memo, success) and credits each signature once. Burns count
// BURN_BONUS more than SOL, at the token's price at the time. Credits can't be moved or withdrawn (api/_agents.js).
const { PublicKey, TransactionMessage, VersionedTransaction, ComputeBudgetProgram, SystemProgram, TransactionInstruction } = require('@solana/web3.js');
const { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync, createBurnCheckedInstruction } = require('@solana/spl-token');
const { cors, readJson, isPubkey, redis, rpc, connection, rateLimit, fail } = require('./_lib');
const { loadAgent, credit, CREDIT } = require('./_agents');

const TREASURY = (process.env.AGENT_TREASURY || '').trim();
const TP_MINT = process.env.AGENT_BURN_MINT || 'BctFsB2NaoKZcqXxhFFvDAJ4vdgxuunsg1g5m8CSEQDN';
const TP_DECIMALS = 6;
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const MEMO = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
const BURN_BONUS = 1.2;
const MIN_USD = 1;
const memoOf = (name) => 'tweetpad agent ' + name;

/* a token's USD price from its most liquid Solana pair on DexScreener, kept 30 s */
async function priceUsd(mint) {
  const [kept] = await redis(['GET', 'px:' + mint]);
  if (kept) return Number(kept);
  const r = await fetch('https://api.dexscreener.com/tokens/v1/solana/' + mint, { signal: AbortSignal.timeout(8000) });
  const pairs = (await r.json().catch(() => [])) || [];
  const best = pairs.filter(p => p.baseToken && p.baseToken.address === mint && Number(p.priceUsd) > 0)
    .sort((a, b) => ((b.liquidity || {}).usd || 0) - ((a.liquidity || {}).usd || 0))[0];
  if (!best) throw new Error('no price for ' + mint.slice(0, 4) + '… right now');
  await redis(['SET', 'px:' + mint, best.priceUsd, 'EX', 30]);
  return Number(best.priceUsd);
}

async function build(b, res) {
  const name = String(b.name || '').toLowerCase(), payer = b.payer, kind = b.kind;
  if (!isPubkey(payer)) return fail(res, 400, 'invalid wallet');
  if (!await loadAgent(name)) return fail(res, 404, 'no such agent');
  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0) return fail(res, 400, 'enter an amount');
  const owner = new PublicKey(payer);
  let ix;
  if (kind === 'sol') {
    if (!TREASURY) return fail(res, 503, 'SOL top-ups are not open yet; burn $TP instead');
    if (amount * await priceUsd(SOL_MINT) < MIN_USD) return fail(res, 400, 'top up at least $' + MIN_USD);
    ix = SystemProgram.transfer({ fromPubkey: owner, toPubkey: new PublicKey(TREASURY), lamports: Math.round(amount * 1e9) });
  } else if (kind === 'burn') {
    if (amount * await priceUsd(TP_MINT) * BURN_BONUS < MIN_USD) return fail(res, 400, 'burn at least $' + MIN_USD + ' of $TP');
    const mint = new PublicKey(TP_MINT);
    const ata = getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID);
    ix = createBurnCheckedInstruction(ata, mint, owner, BigInt(Math.round(amount * 10 ** TP_DECIMALS)), TP_DECIMALS, [], TOKEN_2022_PROGRAM_ID);
  } else return fail(res, 400, 'kind is sol or burn');
  const memo = new TransactionInstruction({ programId: new PublicKey(MEMO), keys: [{ pubkey: owner, isSigner: true, isWritable: false }], data: Buffer.from(memoOf(name), 'utf8') });
  const { blockhash } = await connection().getLatestBlockhash('confirmed');
  const tx = new VersionedTransaction(new TransactionMessage({ payerKey: owner, recentBlockhash: blockhash,
    instructions: [ComputeBudgetProgram.setComputeUnitLimit({ units: 40000 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }), ix, memo] }).compileToV0Message());
  return res.status(200).json({ ok: true, transaction: Buffer.from(tx.serialize()).toString('base64') });
}

async function confirm(b, res) {
  const name = String(b.name || '').toLowerCase(), signature = String(b.signature || '');
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(signature)) return fail(res, 400, 'invalid signature');
  if (!await loadAgent(name)) return fail(res, 404, 'no such agent');
  const tx = await rpc('getTransaction', [signature, { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }]);
  if (!tx) return fail(res, 404, 'not confirmed yet; try again in a few seconds');
  if (tx.meta && tx.meta.err) return fail(res, 400, 'that transaction failed on chain');
  const ixs = tx.transaction.message.instructions;
  if (!ixs.some(i => i.programId === MEMO && i.parsed === memoOf(name))) return fail(res, 400, 'that transaction is not a top-up for ' + name);
  let usd = 0, wallet = null, burned = 0n;
  for (const i of ixs) {
    const p = i.parsed;
    if (!p || typeof p !== 'object') continue;
    if (i.program === 'system' && p.type === 'transfer' && TREASURY && p.info.destination === TREASURY) {
      usd += p.info.lamports / 1e9 * await priceUsd(SOL_MINT); wallet = p.info.source;
    }
    if (/^spl-token/.test(i.program) && (p.type === 'burnChecked' || p.type === 'burn') && p.info.mint === TP_MINT) {
      const raw = BigInt(p.info.tokenAmount ? p.info.tokenAmount.amount : p.info.amount);
      burned += raw; usd += Number(raw) / 10 ** TP_DECIMALS * await priceUsd(TP_MINT) * BURN_BONUS; wallet = p.info.authority;
    }
  }
  if (!wallet || usd <= 0) return fail(res, 400, 'no SOL to the treasury or $TP burn in that transaction');
  const micro = Math.floor(usd * 1e6);
  if (!await credit(name, signature, wallet, micro, { burned: String(burned) })) return fail(res, 409, 'that top-up was already counted');
  if (burned) await redis(['INCRBY', 'burned:' + name, String(burned)]);
  const [left] = await redis(['GET', 'credits:' + name]);
  return res.status(200).json({ ok: true, usd, credits: Math.floor((Number(left) || 0) / CREDIT) });
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET, POST')) return;
  try {
    if (req.method === 'GET') {
      const [solUsd, tpUsd] = await Promise.all([priceUsd(SOL_MINT).catch(() => null), priceUsd(TP_MINT).catch(() => null)]);
      res.setHeader('cache-control', 'public, s-maxage=30');
      return res.status(200).json({ solUsd, tpUsd, burnBonus: BURN_BONUS, sol: !!TREASURY, burn: true, minUsd: MIN_USD, mint: TP_MINT });
    }
    if (req.method !== 'POST') return fail(res, 405, 'GET or POST');
    res.setHeader('cache-control', 'no-store');
    if (!await rateLimit(req, res, 'atopup', 30, 600)) return;
    const b = await readJson(req);
    if (!b) return fail(res, 400, 'invalid JSON');
    if (b.action === 'build') return await build(b, res);
    if (b.action === 'confirm') return await confirm(b, res);
    return fail(res, 400, 'unknown action');
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
};
