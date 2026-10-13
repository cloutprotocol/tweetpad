// tweetpad's games on Gamba (https://gamba.so), Solana's on-chain casino protocol: Pump or Dump (/games/pumpordump, call the next
// candle) and Mines (/games/mines, reveal tiles and cash out before a mine). The house is Gamba's public SOL pool (anyone can add
// to it and earns its edge); Gamba's program holds each bet and pays a win straight to the player; the result comes from Gamba's
// RNG, which commits to each seed (SHA-256) before the bet and reveals it when it settles, so every result can be recomputed in
// the browser. Each play names tweetpad as the creator, so it pays tweetpad's fee and is listed under tweetpad on Gamba's
// explorer (explorer.gamba.so/platform/<creator>). Plays are built here (every account derived here, the instruction encoded
// from Gamba's IDL), simulated, and decoded again by the page before anything signs.
// The player is the wallet itself (one approval a play) or its game balance: a key the page derives from one signature of the
// wallet (assets/gamba-kit.js), topped up from the wallet and withdrawn only back to it, which signs plays without pop-ups.
// GET ?game=<id>                                          → { live, creator, pool, fees, plays, stats, region, rules }
// POST { publicKey, seat: true }                          → { tx }  Gamba's player account, and with it the first committed seed
// POST { game: 'pumpordump', publicKey, wager, side, lev, clientSeed }          → { tx, game, bet, cost }
// POST { game: 'mines', publicKey, wager, mines, step, clientSeed }             → { tx, game, bet, cost }  one tile of a round
// POST { topup: <lamports>, publicKey: <wallet>, to: <game balance> }           → { tx }
// POST { withdraw: true, publicKey: <game balance>, to: <wallet> }              → { tx, amount }  everything, seat rent included
// POST { settled: <signature> }                                                 → { ok, play }  lists a settled play
const { PublicKey, TransactionMessage, VersionedTransaction, TransactionInstruction, ComputeBudgetProgram, SystemProgram } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync, NATIVE_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const { cors, readJson, isPubkey, signerKeys, redis, rpc, connection, rateLimit, fail } = require('./_lib');

const GAMBA = new PublicKey('Gamba2hK6KV3quKq854B3sQG1WMdq3zgQLPKqyK4qS18');   // pinned; never taken from an answer
/* tweetpad's wallet: named as the creator on every play and paid its fee. Without it the games are practice only. */
const CREATOR = (process.env.GAMBA_CREATOR || '').trim();
const SOL = 1e9;
/* each game's rules. Fees are on top of the wager: tweetpad's (Gamba allows up to 7%) and a jackpot ticket, beside Gamba's and
   the pool's own (read from chain). A Mines round is one play per tile, so its fees are kept low and charged on each tile. */
const GAMES = {
  pumpordump: { creatorBps: 100, jackpotBps: 10, maxWager: 0.1 * SOL, levs: [2, 3, 5] },
  mines: { creatorBps: 50, jackpotBps: 0, maxWager: 0.1 * SOL, maxPayout: 2 * SOL, cells: 25, mines: [3, 5, 10] },
};
const MAX_BALANCE = 1 * SOL;   // a game balance holds at most this much: it is a key in a browser
/* real-money play is refused where it is clearly not allowed (practice is open everywhere): Vercel's country header,
   GAMBA_BLOCKED (comma separated ISO codes) replaces the default list, and GAMBA_BLOCKED=none blocks nowhere */
const BLOCKED = (process.env.GAMBA_BLOCKED || 'US,GB,FR,NL,AU,ES,IT,BE,DE,SG,CU,IR,KP,SY').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
/* compute: a play is simulated with MAX_CU, then sent with what it used plus a margin (playGame used ~92k simulated on
   mainnet, more when it has to create token accounts the player or the creator doesn't have yet) */
const MAX_CU = 600000;
const CU_PRICE = 100000;    // micro-lamports per CU: about 0.00002 SOL priority fee at 200k
const LIST_MAX = 30;

const pda = (...seeds) => PublicKey.findProgramAddressSync(seeds.map(s => (typeof s === 'string' ? Buffer.from(s) : s.toBuffer())), GAMBA)[0];
const POOL = pda('POOL', NATIVE_MINT, SystemProgram.programId);   // the public SOL pool (no pool authority)
const STATE = pda('GAMBA_STATE');
const BONUS_MINT = pda('POOL_BONUS_MINT', POOL);
const POOL_TA = pda('POOL_ATA', POOL);
const JACKPOT_TA = pda('POOL_JACKPOT', POOL);
const playerOf = (user) => pda('PLAYER', user);
const gameOf = (user) => pda('GAME', user);

/* ---------- Borsh, as Gamba's IDL lays it out ---------- */
const DISC = {
  playerInitialize: [213, 160, 145, 88, 197, 68, 63, 150], playGame: [37, 88, 207, 85, 42, 144, 122, 197], playerClose: [26, 155, 61, 179, 53, 157, 80, 30],
  GameSettled: [63, 109, 128, 85, 229, 63, 167, 176], Game: [27, 90, 166, 125, 74, 100, 121, 18], Pool: [241, 154, 109, 4, 17, 177, 109, 188],
  GambaState: [142, 203, 14, 224, 153, 118, 52, 200],
};
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const str = (s) => Buffer.concat([u32(Buffer.byteLength(s)), Buffer.from(s)]);
function reader(buf, o = 8) {
  return {
    u8: () => buf[o++], bool: () => buf[o++] === 1, u32: () => { const v = buf.readUInt32LE(o); o += 4; return v; },
    u64: () => { const v = buf.readBigUInt64LE(o); o += 8; return v; }, key: () => { const v = new PublicKey(buf.subarray(o, o + 32)).toBase58(); o += 32; return v; },
    str() { const n = this.u32(); const v = buf.toString('utf8', o, o + n); o += n; return v; },
    vec32() { const n = this.u32(); return Array.from({ length: n }, () => this.u32()); }, skip: (n) => { o += n; },
  };
}
const isDisc = (buf, name) => buf.length >= 8 && DISC[name].every((b, i) => buf[i] === b);
function decodePool(buf) {
  if (!isDisc(buf, 'Pool')) throw new Error('not a Gamba pool');
  const r = reader(buf);
  r.skip(1 + 32 * 3); r.bool();
  const p = { minWager: r.u64(), plays: r.u64(), liquidityCheckpoint: r.u64() };
  r.bool(); r.u64();
  p.customPoolFee = r.bool(); p.customPoolFeeBps = r.u64(); p.customGambaFee = r.bool(); p.customGambaFeeBps = r.u64();
  p.customMaxPayout = r.bool(); p.customMaxPayoutBps = r.u64();
  return p;
}
function decodeState(buf) {
  if (!isDisc(buf, 'GambaState')) throw new Error('not Gamba\'s state');
  const r = reader(buf);
  r.skip(32); const rng = r.key(); r.skip(32);
  const s = { rng, antiSpamFee: r.u64(), gambaFeeBps: r.u64() };
  r.u64(); s.defaultPoolFee = r.u64(); r.skip(8 * 5); r.u64(); s.maxCreatorFeeBps = r.u64(); s.maxPayoutBps = r.u64(); r.u64();
  r.bool(); r.bool(); r.bool(); s.playingAllowed = r.bool();
  return s;
}
/* a player's Game account: its last play (a Mines tile may only ride what the tile before it won) */
function decodeGame(buf) {
  if (!isDisc(buf, 'Game')) throw new Error('not a Gamba game account');
  const r = reader(buf);
  r.u8();
  const g = { nonce: r.u64(), user: r.key(), tokenMint: r.key(), pool: r.key(), status: ['None', 'NotInitialized', 'Ready', 'ResultRequested'][r.u8()] };
  r.str(); r.str(); r.u64(); g.creator = r.key(); r.str();
  g.wager = r.u64(); r.skip(8 * 9);
  r.str(); g.bet = r.vec32(); g.result = Number(r.u64()); r.bool(); r.skip(32); g.metadata = r.str();
  return g;
}
/* GameSettled, the event the RNG's settle logs */
function decodeSettled(buf) {
  const r = reader(buf);
  const e = { user: r.key(), pool: r.key(), tokenMint: r.key(), creator: r.key() };
  for (const k of ['creatorFee', 'gambaFee', 'poolFee', 'jackpotFee', 'underlyingUsed', 'bonusUsed', 'wager', 'payout']) e[k] = r.u64();
  e.multiplierBps = r.u32();
  for (const k of ['payoutFromBonusPool', 'payoutFromNormalPool', 'jackpotProbabilityUbps', 'jackpotResult', 'nonce']) e[k] = r.u64();
  e.clientSeed = r.str(); e.resultIndex = r.u64(); e.bet = r.vec32(); e.jackpotPayoutToUser = r.u64(); e.poolLiquidity = r.u64();
  e.rngSeed = r.str(); e.nextRngSeedHashed = r.str(); e.metadata = r.str();
  return e;
}
const tokenAmount = (buf) => (buf && buf.length >= 72 ? buf.readBigUInt64LE(64) : 0n);

/* the pool as a player meets it: the fees the program charges on top of a wager, the largest payout, the jackpot */
async function poolInfo() {
  const infos = await connection().getMultipleAccountsInfo([POOL, STATE, POOL_TA, JACKPOT_TA]);
  if (!infos[0] || !infos[1]) throw Object.assign(new Error('Gamba\'s SOL pool is not readable right now'), { status: 502 });
  const p = decodePool(infos[0].data), s = decodeState(infos[1].data);
  const maxPayoutBps = Number(p.customMaxPayout ? p.customMaxPayoutBps : s.maxPayoutBps);
  return {
    address: POOL.toBase58(), liquidity: Number(tokenAmount(infos[2] && infos[2].data)), minWager: Number(p.minWager), plays: Number(p.plays),
    maxPayout: Math.floor(Number(p.liquidityCheckpoint) * maxPayoutBps / 10000), jackpot: Number(tokenAmount(infos[3] && infos[3].data)),
    playing: s.playingAllowed, rng: s.rng,
    gambaBps: Number(p.customGambaFee ? p.customGambaFeeBps : s.gambaFeeBps), poolBps: Number(p.customPoolFee ? p.customPoolFeeBps : s.defaultPoolFee),
  };
}
const feesOf = (game, pool) => ({ creatorBps: GAMES[game].creatorBps, gambaBps: pool.gambaBps, poolBps: pool.poolBps, jackpotBps: GAMES[game].jackpotBps });

const countryOf = (req) => String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
const region = (req) => { const c = countryOf(req); return { country: c || null, blocked: BLOCKED.includes(c) }; };

/* ---------- the bets ---------- */
/* Pump or Dump: the wager times `lev` on one outcome in `lev`, nothing on the rest. Pump is the first, Dump the last. */
const flipBet = (side, lev) => Array.from({ length: lev }, (_, i) => (i === (side === 'pump' ? 0 : lev - 1) ? lev * 10000 : 0));
/* Mines: a tile with `step` tiles already safe. Of the cells left, `mines` lose and the rest pay cells/safe (rounded down, so
   the bet never favours the player, which Gamba refuses). Each tile is its own draw at the true odds; where the other mines
   lie is only drawn for show when a round ends. */
function minesBet(cells, mines, step) {
  const left = cells - step, safe = left - mines;
  const pay = Math.floor(left * 10000 / safe);
  return Array.from({ length: left }, (_, i) => (i < mines ? 0 : pay));
}
function playIx(user, wager, bet, clientSeed, metadata, creatorBps, jackpotBps) {
  const creator = new PublicKey(CREATOR), player = playerOf(user);
  const ata = (owner, offCurve) => getAssociatedTokenAddressSync(NATIVE_MINT, owner, offCurve);
  const w = (pubkey) => ({ pubkey, isSigner: false, isWritable: true }), ro = (pubkey) => ({ pubkey, isSigner: false, isWritable: false });
  return new TransactionInstruction({ programId: GAMBA, keys: [
    { pubkey: user, isSigner: true, isWritable: true }, w(player), w(gameOf(user)), w(POOL), ro(NATIVE_MINT), ro(BONUS_MINT), w(ata(user)),
    ro(creator), w(ata(creator)), w(ata(player, true)), ro(GAMBA), ro(GAMBA),   // no bonus tokens: Anchor's "none" for the two optional accounts
    w(STATE), w(JACKPOT_TA), ro(SystemProgram.programId), ro(TOKEN_PROGRAM_ID), ro(ASSOCIATED_TOKEN_PROGRAM_ID)],
    data: Buffer.concat([Buffer.from(DISC.playGame), u64(wager), u32(bet.length), ...bet.map(u32), str(clientSeed), u32(creatorBps), u32(jackpotBps), str(metadata)]) });
}
const seatKeys = (user) => [{ pubkey: playerOf(user), isSigner: false, isWritable: true }, { pubkey: gameOf(user), isSigner: false, isWritable: true }];
const seatIx = (user) => new TransactionInstruction({ programId: GAMBA, data: Buffer.from(DISC.playerInitialize), keys: [
  ...seatKeys(user), { pubkey: user, isSigner: true, isWritable: true }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }] });
const closeIx = (user) => new TransactionInstruction({ programId: GAMBA, data: Buffer.from(DISC.playerClose), keys: [
  { pubkey: user, isSigner: true, isWritable: true }, ...seatKeys(user)] });

/* a transaction that would fail on chain never reaches the signer (Phantom flags dApps whose transactions fail); the
   simulation also says how much compute it used */
async function simulate(tx) {
  let sim;
  try {
    sim = await rpc('simulateTransaction', [tx.toString('base64'), { encoding: 'base64', sigVerify: false, replaceRecentBlockhash: true, commitment: 'confirmed' }]);
  } catch { return { error: null, units: null }; }
  const v = sim && sim.value;
  if (!v) return { error: null, units: null };
  if (!v.err) return { error: null, units: v.unitsConsumed || null };
  const logs = v.logs || [];
  if (logs.some(l => /insufficient lamports|insufficient funds/i.test(l)) || /InsufficientFunds|AccountNotFound/.test(JSON.stringify(v.err))) return { error: 'not enough SOL for the bet and fees' };
  const hint = [...logs].reverse().find(l => /Error Message|error|failed/i.test(l));
  return { error: 'Gamba would refuse this' + (hint ? ': ' + hint.replace(/^Program log: (AnchorError.*Error Message: )?/, '').slice(0, 160) : '') };
}
async function txOf(user, cu, ixs) {
  const { blockhash } = await connection().getLatestBlockhash('confirmed');
  const budget = cu ? [ComputeBudgetProgram.setComputeUnitLimit({ units: cu }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: CU_PRICE })] : [];
  const message = new TransactionMessage({ payerKey: user, recentBlockhash: blockhash, instructions: [...budget, ...ixs] }).compileToV0Message();
  return Buffer.from(new VersionedTransaction(message).serialize());
}
/* a Gamba transaction: simulated at MAX_CU, then built again with the compute it used plus 20% */
async function fitted(res, user, ixs, extra) {
  const { error, units } = await simulate(await txOf(user, MAX_CU, ixs));
  if (error) return fail(res, 400, error);
  const cu = units ? Math.min(MAX_CU, Math.ceil(units * 1.2) + 5000) : MAX_CU;
  return finish(res, await txOf(user, cu, ixs), user.toBase58(), extra, true);
}
const isWallet = (s) => isPubkey(s) && PublicKey.isOnCurve(new PublicKey(s).toBytes());
async function finish(res, tx, signer, extra, simulated) {
  if (!simulated) { const { error } = await simulate(tx); if (error) return fail(res, 400, error); }
  const parsed = signerKeys(tx);
  if (parsed.signers.length !== 1 || parsed.signers[0] !== signer) return fail(res, 502, 'built an unexpected transaction');
  return res.status(200).json({ ok: true, tx: tx.toString('base64'), ...extra });
}

async function build(req, res) {
  if (!await rateLimit(req, res, 'gamba', 400, 600)) return;
  const b = await readJson(req);
  if (!b) return fail(res, 400, 'invalid JSON');
  if (b.settled != null) return record(req, res, b.settled);
  if (!CREATOR) return fail(res, 503, 'real plays are not switched on yet: practice for now');
  if (!isWallet(b.publicKey)) return fail(res, 400, 'invalid wallet address');
  const user = new PublicKey(b.publicKey);
  /* withdrawing is never refused by region: it only moves a player's own SOL back to their wallet */
  if (b.withdraw) return withdraw(res, user, b.to);
  if (region(req).blocked) return fail(res, 451, 'real-money play is not offered in your region; practice is');
  if (b.topup != null) return topup(res, user, b.to, b.topup);

  if (b.seat) {
    if (await connection().getAccountInfo(gameOf(user))) return fail(res, 409, 'this wallet already has its Gamba seat');
    return fitted(res, user, [seatIx(user)], { game: gameOf(user).toBase58() });
  }

  const id = b.game == null ? 'pumpordump' : b.game, rules = GAMES[id];
  if (!rules) return fail(res, 400, 'unknown game');
  const wager = Number(b.wager), clientSeed = b.clientSeed;
  if (typeof clientSeed !== 'string' || !/^[A-Za-z0-9]{1,32}$/.test(clientSeed)) return fail(res, 400, 'your seed: 1–32 letters or numbers');
  if (!Number.isSafeInteger(wager) || wager <= 0) return fail(res, 400, 'invalid wager');
  const pool = await poolInfo();
  if (!pool.playing) return fail(res, 503, 'Gamba has paused play for now');
  if (wager < pool.minWager) return fail(res, 400, 'the smallest bet is ' + pool.minWager / SOL + ' SOL');

  let bet, metadata;
  if (id === 'pumpordump') {
    const lev = Number(b.lev), side = b.side;
    if (!rules.levs.includes(lev)) return fail(res, 400, 'leverage must be ' + rules.levs.join(', ') + '×');
    if (side !== 'pump' && side !== 'dump') return fail(res, 400, 'side must be pump or dump');
    if (wager > rules.maxWager) return fail(res, 400, 'the largest bet here is ' + rules.maxWager / SOL + ' SOL');
    bet = flipBet(side, lev); metadata = '0:pumpordump:' + side + ':' + lev;
  } else {
    const mines = Number(b.mines), step = Number(b.step);
    if (!rules.mines.includes(mines)) return fail(res, 400, 'mines must be ' + rules.mines.join(', '));
    if (!Number.isInteger(step) || step < 0 || step >= rules.cells - mines) return fail(res, 400, 'invalid tile');
    if (step === 0 && wager > rules.maxWager) return fail(res, 400, 'the largest bet here is ' + rules.maxWager / SOL + ' SOL');
    if (step > 0) {
      /* a later tile rides only what the tile before it won, in the same round: read back from the player's Game account */
      const info = await connection().getAccountInfo(gameOf(user));
      const g = info && decodeGame(info.data);
      if (!g || g.status !== 'Ready' || g.creator !== CREATOR || g.metadata !== '0:mines:' + mines + ':' + (step - 1)) return fail(res, 409, 'that round is over: start a new one');
      const won = BigInt(g.bet[g.result] || 0);
      if (!won) return fail(res, 409, 'that round hit a mine: start a new one');
      if (BigInt(wager) > g.wager * won / 10000n) return fail(res, 400, 'a tile can only ride what the last one won');
    }
    bet = minesBet(rules.cells, mines, step); metadata = '0:mines:' + mines + ':' + step;
  }
  const top = Math.max(...bet);
  const cap = Math.min(pool.maxPayout, rules.maxPayout || Infinity);
  if (wager * top / 10000 > cap) return fail(res, 400, 'that would pay more than ' + (cap / SOL).toFixed(2) + ' SOL: cash out');

  const f = feesOf(id, pool), feeBps = f.creatorBps + f.gambaBps + f.poolBps + f.jackpotBps;
  return fitted(res, user, [playIx(user, wager, bet, clientSeed, metadata, rules.creatorBps, rules.jackpotBps)],
    { game: gameOf(user).toBase58(), bet, cost: wager + Math.ceil(wager * feeBps / 10000) });
}

/* ---------- the game balance: a top-up from the wallet, and everything back to it ---------- */
async function topup(res, wallet, to, amount) {
  if (!isWallet(to) || to === wallet.toBase58()) return fail(res, 400, 'invalid game balance address');
  if (!Number.isSafeInteger(amount) || amount < 0.01 * SOL) return fail(res, 400, 'top up at least 0.01 SOL');
  const held = await connection().getBalance(new PublicKey(to), 'confirmed');
  if (held + amount > MAX_BALANCE) return fail(res, 400, 'a game balance holds at most ' + MAX_BALANCE / SOL + ' SOL (it has ' + (held / SOL).toFixed(3) + ')');
  const ix = SystemProgram.transfer({ fromPubkey: wallet, toPubkey: new PublicKey(to), lamports: amount });
  return finish(res, await txOf(wallet, 0, [ix]), wallet.toBase58(), {});
}
async function withdraw(res, session, to) {
  if (!isWallet(to) || to === session.toBase58()) return fail(res, 400, 'invalid wallet address');
  const [acct, game, player] = await connection().getMultipleAccountsInfo([session, gameOf(session), playerOf(session)], 'confirmed');
  const ixs = [];
  let refund = 0;
  /* the Gamba seat's rent comes back too, unless a play is still settling */
  if (game && player) {
    const g = decodeGame(game.data);
    if (g.status === 'ResultRequested') return fail(res, 409, 'a play is still settling; withdraw in a moment');
    ixs.push(closeIx(session)); refund = game.lamports + player.lamports;
  }
  const amount = (acct ? acct.lamports : 0) + refund - 5000;   // one signature, no priority fee
  if (amount <= 0) return fail(res, 400, 'nothing to withdraw');
  ixs.push(SystemProgram.transfer({ fromPubkey: session, toPubkey: new PublicKey(to), lamports: amount }));
  return finish(res, await txOf(session, 0, ixs), session.toBase58(), { amount });
}

/* ---------- the lists: a settled play, read back from the chain. Only a GameSettled event Gamba's program itself logged counts
   (a "Program data:" line inside Gamba's own invocation), naming tweetpad as the creator and one of these games. ---------- */
function gambaEvents(logs) {
  const stack = [], out = [];
  for (const l of logs) {
    let m;
    if ((m = /^Program (\w+) invoke \[\d+\]$/.exec(l))) stack.push(m[1]);
    else if (/^Program \w+ (success|failed)/.test(l)) stack.pop();
    else if ((m = /^Program data: (.+)$/.exec(l)) && stack[stack.length - 1] === GAMBA.toBase58()) {
      const buf = Buffer.from(m[1], 'base64');
      if (isDisc(buf, 'GameSettled')) out.push(decodeSettled(buf));
    }
  }
  return out;
}
/* what a play's metadata says: '0:pumpordump:<side>:<lev>' or '0:mines:<mines>:<step>' */
function parseMeta(meta) {
  const [v, id, a, b] = meta.split(':');
  if (v !== '0' || !GAMES[id]) return null;
  if (id === 'pumpordump') return a === 'pump' || a === 'dump' ? { id, side: a, lev: Number(b) } : null;
  return /^\d+$/.test(a) && /^\d+$/.test(b) ? { id, mines: Number(a), step: Number(b) } : null;
}
async function record(req, res, signature) {
  if (typeof signature !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(signature)) return fail(res, 400, 'invalid signature');
  if (!CREATOR) return fail(res, 503, 'practice mode');
  const tx = await rpc('getTransaction', [signature, { encoding: 'json', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }]);
  if (!tx) return fail(res, 404, 'not found yet');
  if (tx.meta.err) return fail(res, 400, 'that transaction failed');
  let e = null, meta = null;
  for (const x of gambaEvents(tx.meta.logMessages || [])) if (x.creator === CREATOR && (meta = parseMeta(x.metadata))) { e = x; break; }
  if (!e) return fail(res, 400, 'not a tweetpad game play');
  const play = { sig: signature, user: e.user, ...meta, wager: Number(e.wager), payout: Number(e.payout), jackpot: Number(e.jackpotPayoutToUser),
    fees: Number(e.creatorFee + e.gambaFee + e.poolFee + e.jackpotFee), at: (tx.blockTime || Date.now() / 1000) * 1000 };
  const key = 'gamba:' + meta.id;
  const [fresh] = await redis(['SET', 'gamba:seen:' + signature, '1', 'NX', 'EX', 7 * 86400]);
  if (fresh === 'OK') await redis(['LPUSH', key + ':plays', JSON.stringify(play)], ['LTRIM', key + ':plays', 0, LIST_MAX - 1],
    ['HINCRBY', key + ':stats', 'plays', 1], ['HINCRBY', key + ':stats', 'volume', play.wager], ['HINCRBY', key + ':stats', 'paid', play.payout + play.jackpot]);
  return res.status(200).json({ ok: true, play });
}

async function overview(req) {
  const id = GAMES[(req.query || {}).game] ? req.query.game : 'pumpordump', key = 'gamba:' + id;
  const [pool, lists] = await Promise.all([poolInfo(), redis(['LRANGE', key + ':plays', 0, LIST_MAX - 1], ['HGETALL', key + ':stats']).catch(() => [[], []])]);
  const [rows, flat] = lists;
  const stats = {};
  for (let i = 0; i + 1 < (flat || []).length; i += 2) stats[flat[i]] = Number(flat[i + 1]);
  const { gambaBps, poolBps, ...rest } = pool;
  return { game: id, live: !!CREATOR, creator: CREATOR || null, program: GAMBA.toBase58(), pool: { ...rest, fees: feesOf(id, pool) }, rules: GAMES[id],
    maxBalance: MAX_BALANCE, plays: (rows || []).map(r => JSON.parse(r)), stats: { plays: stats.plays || 0, volume: stats.volume || 0, paid: stats.paid || 0 }, region: region(req) };
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET, POST')) return;
  try {
    if (req.method === 'GET') {
      res.setHeader('cache-control', 'private, max-age=5');   // private: the answer carries the visitor's region
      return res.status(200).json(await overview(req));
    }
    res.setHeader('cache-control', 'no-store');
    if (req.method === 'POST') return await build(req, res);
    return fail(res, 405, 'GET or POST');
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
};
module.exports.GAMBA = GAMBA;
