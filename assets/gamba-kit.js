/* What tweetpad's Gamba games share (/games/pumpordump, /games/mines; api/gamba.js): the wallet, the game balance, a play from
   build to settle, the checks before anything signs, the fairness check after, practice, sounds, and the parts of the page every
   game has (the Practice | Real SOL switch, the balance row, the seeds, the recent plays). A game script sets it up with
   kit.init({ id, ... }) and plays with kit.play(...) or kit.practice(...).
   The game balance: one signature of a fixed message by the wallet makes a key (its SHA-256 is the key's seed; Ed25519
   signatures are deterministic, so the same wallet always makes the same key, in any browser). The wallet tops it up; it signs
   plays here without pop-ups; it withdraws only to that wallet. It holds at most api/gamba.js MAX_BALANCE. */
const $ = (id) => document.getElementById(id);
const MODE = document.documentElement.dataset.mode;
const RPC = 'https://solana-rpc.publicnode.com';
const CHAIN = 'solana:mainnet';
const GAMBA = 'Gamba2hK6KV3quKq854B3sQG1WMdq3zgQLPKqyK4qS18';
const COMPUTE = 'ComputeBudget111111111111111111111111111111';
const SYSTEM = '11111111111111111111111111111111';
const EXPLORER = 'https://explorer.gamba.so';
const SITE = 'https://www.tweetpad.io';
const PRACTICE_START = 10;
const SEAT_RENT = 0.0097;   // Gamba's player and game accounts (refunded on withdraw)
const DISC = { playGame: [37, 88, 207, 85, 42, 144, 122, 197], playerInitialize: [213, 160, 145, 88, 197, 68, 63, 150], playerClose: [26, 155, 61, 179, 53, 157, 80, 30],
  Game: [27, 90, 166, 125, 74, 100, 121, 18] };
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked in this frame */ } },
};
const short = (a) => a.slice(0, 4) + '…' + a.slice(-4);
const errText = (e) => String((e && (e.message || e.reason)) || e).replace(/^Error:? /, '');
const sol = (n) => (Math.abs(n) >= 100 ? n.toFixed(0) : Math.abs(n) >= 1 ? n.toFixed(2) : n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '') || '0');
const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + sol(Math.abs(n));
const el = (tag, props, ...kids) => { const e = Object.assign(document.createElement(tag), props || {}); e.append(...kids.flat().filter(k => k != null)); return e; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const enc = (s) => new TextEncoder().encode(s);
const hex = (bytes) => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
const b64enc = (bytes) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
const b64dec = (str) => Uint8Array.from(atob(str), c => c.charCodeAt(0));
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58encode(bytes) {
  const digits = [];
  for (const b of bytes) {
    let carry = b;
    for (let i = 0; i < digits.length; i++) { carry += digits[i] << 8; digits[i] = carry % 58; carry = (carry / 58) | 0; }
    while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0; }
  }
  let out = '';
  for (const b of bytes) { if (b === 0) out += '1'; else break; }
  for (let i = digits.length - 1; i >= 0; i--) out += B58[digits[i]];
  return out;
}
function b58decode(str) {
  const bytes = [];
  for (const ch of str) {
    let carry = B58.indexOf(ch);
    if (carry < 0) throw new Error('invalid base58 character');
    for (let i = 0; i < bytes.length; i++) { carry += bytes[i] * 58; bytes[i] = carry & 0xff; carry >>= 8; }
    while (carry) { bytes.push(carry & 0xff); carry >>= 8; }
  }
  for (const ch of str) { if (ch === '1') bytes.push(0); else break; }
  return Uint8Array.from(bytes.reverse());
}
async function rpc(method, params) {
  const r = await (await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) })).json();
  if (r.error) throw new Error(r.error.message);
  return r.result;
}
async function api(json) {
  const r = await fetch('/api/gamba', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(json) });
  const out = await r.json().catch(() => null);
  if (!r.ok || !out) throw new Error((out && out.error) || 'HTTP ' + r.status);
  return out;
}
const sha256 = async (s) => hex(await crypto.subtle.digest('SHA-256', typeof s === 'string' ? enc(s) : s));
const randomSeed = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1e9);

/* ---------- Borsh, as Gamba's IDL lays it out ---------- */
function reader(bytes, o = 0) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    get at() { return o; }, u8: () => bytes[o++], u32() { const v = dv.getUint32(o, true); o += 4; return v; },
    u64() { const v = dv.getBigUint64(o, true); o += 8; return v; }, key() { const v = b58encode(bytes.subarray(o, o + 32)); o += 32; return v; },
    str() { const n = this.u32(); const v = new TextDecoder().decode(bytes.subarray(o, o + n)); o += n; return v; },
    vec32() { const n = this.u32(); return Array.from({ length: n }, () => this.u32()); }, rest: () => bytes.length - o,
    /* compact-u16, the lengths inside a transaction */
    cu16() { let v = 0, s = 0, b; do { b = bytes[o++]; v |= (b & 0x7f) << s; s += 7; } while (b & 0x80); return v; },
  };
}
const isDisc = (bytes, name) => bytes.length >= 8 && DISC[name].every((b, i) => bytes[i] === b);
/* a player's Game account: the committed seed, and once settled the revealed one and the result */
function decodeGame(bytes) {
  if (!isDisc(bytes, 'Game')) throw new Error('not a Gamba game account');
  const r = reader(bytes, 8);
  r.u8();
  const g = { nonce: r.u64(), user: r.key(), tokenMint: r.key(), pool: r.key(), status: ['None', 'NotInitialized', 'Ready', 'ResultRequested'][r.u8()] };
  g.nextRngSeedHashed = r.str(); g.rngSeed = r.str(); r.u64(); g.creator = r.key(); r.str();
  for (const k of ['wager', 'underlyingUsed', 'bonusUsed', 'creatorFee', 'gambaFee', 'poolFee', 'jackpotFee', 'jackpotResult', 'jackpotProbabilityUbps', 'jackpotPayout']) g[k] = r.u64();
  g.clientSeed = r.str(); g.bet = r.vec32(); g.result = Number(r.u64()); r.u8(); r.key(); g.metadata = r.str();
  return g;
}
async function readGame(addr) {
  const r = await rpc('getAccountInfo', [addr, { encoding: 'base64', commitment: 'confirmed' }]);
  return r && r.value ? decodeGame(b64dec(r.value.data[0])) : null;
}

/* ---------- a transaction from /api/gamba, read back before anything signs it ---------- */
function readTx(tx) {
  const r = reader(tx);
  const sigs = r.cu16();
  const m = reader(tx, r.at + 64 * sigs);
  const v0 = (tx[m.at] & 0x80) !== 0;
  if (v0) m.u8();
  const header = [m.u8(), m.u8(), m.u8()];
  const keys = Array.from({ length: m.cu16() }, () => m.key());
  m.key();   // recent blockhash
  const ixs = Array.from({ length: m.cu16() }, () => {
    const program = keys[m.u8()];
    const accounts = Array.from({ length: m.cu16() }, () => keys[m.u8()]);
    const n = m.cu16(), at = m.at;
    for (let i = 0; i < n; i++) m.u8();
    return { program, accounts, data: tx.subarray(at, at + n) };
  });
  return { sigs, signers: keys.slice(0, header[0]), ixs, lookups: v0 ? m.cu16() : 0, message: tx.subarray(1 + 64 * sigs) };
}
/* signed and paid by `me` alone; only the compute budget and the programs allowed; each instruction passes `check` */
function checkTx(tx, me, programs, check) {
  const t = readTx(tx);
  if (t.sigs !== 1 || t.signers.length !== 1 || t.signers[0] !== me) throw new Error('the transaction asks for other signers');
  if (t.lookups) throw new Error('the transaction uses an address table');
  for (const ix of t.ixs) {
    if (ix.program === COMPUTE) {
      const r = reader(ix.data, 1);
      if (ix.data[0] === 3 && r.u64() > 1000000n) throw new Error('the transaction sets a large priority fee');
      if (ix.data[0] === 2 && r.u32() > 400000) throw new Error('the transaction asks for too much compute');
    } else if (!programs.includes(ix.program)) throw new Error('the transaction calls other programs');
  }
  check(t.ixs.filter(ix => ix.program !== COMPUTE));
}
function checkPlay(ixs, me, want) {
  if (ixs.length !== 1 || ixs[0].program !== GAMBA || !isDisc(ixs[0].data, 'playGame')) throw new Error('not a Gamba play');
  const ix = ixs[0], r = reader(ix.data, 8);
  const got = { wager: r.u64(), bet: r.vec32(), clientSeed: r.str(), creatorBps: r.u32(), jackpotBps: r.u32(), metadata: r.str() };
  const f = kit.info.pool.fees;
  if (r.rest() !== 0) throw new Error('the play carries extra data');
  if (got.wager !== BigInt(want.wager)) throw new Error('the play bets a different amount');
  if (got.bet.join() !== want.bet.join()) throw new Error('the play has different odds');
  if (got.clientSeed !== want.clientSeed) throw new Error('the play uses a different seed');
  if (got.creatorBps !== f.creatorBps || got.jackpotBps !== f.jackpotBps) throw new Error('the play charges different fees');
  if (got.metadata !== want.metadata) throw new Error('the play is labelled differently');
  if (ix.accounts[0] !== me || ix.accounts[3] !== kit.info.pool.address || ix.accounts[7] !== kit.info.creator) throw new Error('the play uses other accounts');
}
/* a SystemProgram transfer of `lamports` from `from` to `to` */
function isTransfer(ix, from, to, lamports) {
  if (ix.program !== SYSTEM || ix.data.length !== 12 || ix.data[0] !== 2 || ix.data[1] || ix.data[2] || ix.data[3]) return false;
  return ix.accounts[0] === from && ix.accounts[1] === to && (lamports == null || reader(ix.data, 4).u64() === BigInt(lamports));
}

/* ---------- provably fair: Gamba's own formula (gamba-core-v2 getResultNumber) ---------- */
async function resultOf(rngSeed, clientSeed, nonce, outcomes) {
  const key = await crypto.subtle.importKey('raw', enc(rngSeed), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = hex(await crypto.subtle.sign('HMAC', key, enc(clientSeed + '-' + nonce)));
  const number = parseInt(mac.slice(0, 5), 16);
  return { number, index: number % outcomes };
}

/* ---------- Ed25519 for the game balance: noble-ed25519 (MIT), pinned ---------- */
let edLib = null;
const ed = async () => (edLib = edLib || await import('https://cdn.jsdelivr.net/npm/@noble/ed25519@2.1.0/+esm'));
/* a player's Game account address: Gamba's PDA ["GAME", player], found as Solana does (the first bump off the curve) */
const gameAddrs = {};
async function gameAddrOf(player) {
  if (gameAddrs[player]) return gameAddrs[player];
  const e = await ed(), parts = [enc('GAME'), b58decode(player)], program = b58decode(GAMBA), tag = enc('ProgramDerivedAddress');
  for (let bump = 255; bump >= 0; bump--) {
    const buf = new Uint8Array([...parts.flatMap(p => [...p]), bump, ...program, ...tag]);
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
    try { e.ExtendedPoint.fromHex(h); } catch { return (gameAddrs[player] = b58encode(h)); }
  }
  throw new Error('no game address');
}

/* ---------- sound: a few synthesized blips, made on the first tap (browsers allow audio after one) ---------- */
let ac = null;
const soundOn = () => store.get('gk:sound') !== '0';
function tone(freq, dur, type, vol, to) {
  if (!soundOn()) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol || .03, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + .02);
  } catch { /* no audio here */ }
}
const sfx = {
  tick: (i) => tone(220 + i * 18, .045, 'square', .018),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, .16, 'triangle', .05), i * 75)),
  gem: (i) => { tone(880 + i * 60, .09, 'triangle', .05); setTimeout(() => tone(1320 + i * 80, .12, 'triangle', .04), 60); },
  jackpot: () => [523, 784, 1047, 1319, 1568, 2093, 1568, 2093].forEach((f, i) => setTimeout(() => tone(f, .2, 'triangle', .06), i * 90)),
  lose: () => { tone(330, .55, 'sawtooth', .035, 70); setTimeout(() => tone(165, .4, 'square', .02, 60), 120); },
  boom: () => { tone(120, .6, 'sawtooth', .06, 30); tone(60, .7, 'square', .04, 25); },
  call: () => tone(880, .05, 'square', .025),
};
const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch { /* no haptics */ } };

/* ---------- the shared screen effects: the stamp and the flash ---------- */
function stamp(kind, title, sub) {
  const s = $('gk-stamp');
  s.className = 'gk-stamp ' + kind;
  s.querySelector('b').textContent = title;
  s.querySelector('span').textContent = sub;
  s.hidden = false;
  void s.offsetWidth; s.classList.add('show');
  clearTimeout(stamp.t);
  stamp.t = setTimeout(() => { s.hidden = true; }, 2600);
}
function flash(kind) {
  const s = $('gk-screen');
  s.classList.remove('flash-win', 'flash-lose', 'flash-jack');
  void s.offsetWidth; s.classList.add('flash-' + kind);
}
function say(tone, text) { $('gk-status').textContent = text; $('gk-status').className = 'gk-status ' + (tone || ''); }

const kit = {
  id: null, opts: null, info: null, busy: false, checks: [], plays: 0,
  mode: store.get('gk:mode') === 'real' ? 'real' : 'practice',
  wallet: { list: [], active: null, account: null, balance: null },
  session: null,      // { owner, seed, address, balance } once unlocked
  game: null,         // the signer's Game account, as last read
  sess: null,         // this game's numbers per mode, kept in this browser

  /* ---------- setup: the game's id, its own render, and how a recent play reads ---------- */
  init(opts) {
    this.id = opts.id; this.opts = opts;
    const load = (mode) => {
      try { const v = JSON.parse(store.get('gk:' + opts.id + ':' + mode)); if (v && typeof v.net === 'number') return v; } catch { /* fresh */ }
      return { net: 0, a: 0, b: 0 };
    };
    this.sess = { practice: load('practice'), real: load('real') };
    this.practiceBank = (() => { try { const v = JSON.parse(store.get('gk:practice')); if (v && typeof v.balance === 'number') return v; } catch { /* fresh */ } return { balance: PRACTICE_START, nonce: 0 }; })();
    this.practiceBank.seed = this.practiceBank.seed || hex(crypto.getRandomValues(new Uint8Array(32)));
    for (const b of document.querySelectorAll('[data-play]')) b.addEventListener('click', () => this.setMode(b.dataset.play));
    $('gk-seed').value = store.get('gk:seed') || randomSeed();
    $('gk-seed').addEventListener('input', () => { if (this.seed()) store.set('gk:seed', this.seed()); });
    $('gk-reseed').addEventListener('click', () => { $('gk-seed').value = randomSeed(); store.set('gk:seed', $('gk-seed').value); });
    $('gk-age').checked = store.get('gk:age') === '1';
    $('gk-age').addEventListener('change', () => { store.set('gk:age', $('gk-age').checked ? '1' : '0'); this.render(); });
    const sb = $('gk-sound');
    const renderSound = () => { sb.setAttribute('aria-pressed', String(soundOn())); sb.textContent = soundOn() ? '♪' : '×'; sb.title = soundOn() ? 'Sound on' : 'Sound off'; };
    sb.addEventListener('click', () => { store.set('gk:sound', soundOn() ? '0' : '1'); renderSound(); });
    renderSound();
    this.discover();
    this.render(); this.renderFair();
    if (MODE !== 'card') { this.loadInfo(); setInterval(() => { if (!document.hidden && !this.busy) this.loadInfo(); }, 20000); }
    /* the bar's way back: the games list (the app's own Games tab in its frame) */
    const home = document.querySelector('.head .home');
    if (home) home.href = MODE === 'popup' ? '/embed.html?tab=games' : MODE === 'embed' ? '/games?embed' : '/games';
  },
  saveSess() { for (const m of ['practice', 'real']) store.set('gk:' + this.id + ':' + m, JSON.stringify(this.sess[m])); store.set('gk:practice', JSON.stringify(this.practiceBank)); },
  get my() { return this.sess[this.mode]; },
  seed() { const v = $('gk-seed').value.trim(); return /^[A-Za-z0-9]{1,32}$/.test(v) ? v : null; },
  setMode(mode) {
    if (this.busy || mode === this.mode) return;
    this.mode = mode; store.set('gk:mode', mode);
    this.setChecks([]); say('', this.opts.idle);
    if (mode === 'real') this.reconnect();
    this.render(); this.renderFair();
    if (this.opts.onMode) this.opts.onMode();
  },
  /* who signs a real play: the game balance once unlocked, else the wallet itself */
  get signer() { return this.session ? this.session.address : this.wallet.account && this.wallet.account.address; },

  /* ---------- wallets: the Wallet Standard (Phantom, Solflare, Backpack…), as on the launch form ---------- */
  discover() {
    const seen = new Set(), self = this;
    const standardApi = Object.freeze({
      register(...ws) {
        for (const w of ws) {
          if (!w || seen.has(w)) continue;
          seen.add(w);
          const solana = Array.from(w.chains || []).some(c => String(c).startsWith('solana:'));
          if (solana && w.features && w.features['solana:signTransaction'] && w.features['standard:connect'] && !/metamask/i.test(w.name)) self.wallet.list.push(w);
        }
        self.render();
        self.reconnect();
        return () => {};
      },
    });
    window.addEventListener('wallet-standard:register-wallet', (ev) => { try { ev.detail(standardApi); } catch { /* a wallet's own error */ } });
    try { window.dispatchEvent(new CustomEvent('wallet-standard:app-ready', { detail: standardApi })); } catch { /* no wallets */ }
  },
  async connect(w, silent) {
    const solAccount = (accounts) => (accounts || []).find(a => (a.chains || []).some(c => String(c).startsWith('solana:'))) || (accounts || [])[0];
    try {
      const res = await w.features['standard:connect'].connect(silent ? { silent: true } : undefined);
      const account = solAccount(res && res.accounts) || solAccount(w.accounts);
      if (!account) { if (!silent) say('bad', w.name + ' returned no account'); return; }
      Object.assign(this.wallet, { active: w, account });
      store.set('gk:wallet', w.name);
      this.session = null; this.game = null;
      await this.restoreSession();
      this.refresh();
    } catch (err) { if (!silent) say('bad', /reject|declin|denied|cancel/i.test(errText(err)) ? 'Connection declined in the wallet' : errText(err)); }
    this.render();
  },
  /* the wallet used last time, without a prompt (wallets that support a silent connect) */
  reconnect() {
    if (this.tried || this.mode !== 'real' || this.wallet.account) return;
    const w = this.wallet.list.find(x => x.name === store.get('gk:wallet'));
    if (w) { this.tried = true; this.connect(w, true); }
  },
  async disconnect() {
    const w = this.wallet.active;
    try { if (w && w.features['standard:disconnect']) await w.features['standard:disconnect'].disconnect(); } catch { /* already gone */ }
    Object.assign(this.wallet, { active: null, account: null, balance: null });
    this.session = null; this.game = null;
    store.set('gk:wallet', '');
    this.render(); this.renderFair();
  },
  /* balances, and the signer's Game account (its committed seed) */
  async refresh() {
    const a = this.wallet.account;
    if (!a) return;
    try {
      const addrs = [a.address, ...(this.session ? [this.session.address] : [])];
      const r = await rpc('getMultipleAccounts', [addrs, { commitment: 'confirmed', dataSlice: { offset: 0, length: 0 } }]);
      this.wallet.balance = r.value[0] ? r.value[0].lamports / 1e9 : 0;
      if (this.session) this.session.balance = r.value[1] ? r.value[1].lamports / 1e9 : 0;
    } catch { /* keep the last */ }
    try { this.game = await readGame(await gameAddrOf(this.signer)); } catch { /* keep the last */ }
    this.render(); this.renderFair();
  },
  async walletSign(b64) {
    const w = this.wallet.active;
    const [out] = await w.features['solana:signTransaction'].signTransaction({ account: this.wallet.account, transaction: b64dec(b64), chain: CHAIN });
    return new Uint8Array(out.signedTransaction);
  },
  async send(bytes) { return rpc('sendTransaction', [b64enc(bytes), { encoding: 'base64', preflightCommitment: 'confirmed', maxRetries: 5 }]); },
  async confirmed(signature) {
    for (let i = 0; i < 60; i++) {
      const [st] = (await rpc('getSignatureStatuses', [[signature]])).value;
      if (st && st.err) throw new Error('failed on chain');
      if (st && (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized')) return;
      await sleep(700);
    }
    throw new Error('not confirmed yet');
  },

  /* ---------- the game balance ---------- */
  sessionMessage(owner) {
    return enc('tweetpad game balance\n\nSign to open your game balance for tweetpad\'s games. This makes a key only this wallet can make. '
      + 'Sign this text only on tweetpad.io.\n\nIt is free and approves no transaction.\n\nWallet: ' + owner + '\nVersion: 1');
  },
  async keysFrom(seed) { const e = await ed(); return { seed, address: b58encode(await e.getPublicKeyAsync(seed)) }; },
  /* a key this browser opened before for this wallet (the signature makes the same one again anywhere) */
  async restoreSession() {
    const owner = this.wallet.account.address;
    try {
      const saved = JSON.parse(store.get('gk:keys') || '{}')[owner];
      if (saved) this.session = { owner, ...(await this.keysFrom(b64dec(saved))), balance: null };
    } catch { /* unlock again */ }
  },
  async unlock() {
    const w = this.wallet.active, owner = this.wallet.account.address;
    const f = w.features['solana:signMessage'];
    if (!f) return say('bad', w.name + ' can\'t sign messages: play with wallet approvals');
    try {
      const message = this.sessionMessage(owner);
      const [out] = await f.signMessage({ account: this.wallet.account, message });
      const sig = new Uint8Array(out.signature);
      const e = await ed();
      if (!await e.verifyAsync(sig, message, this.wallet.account.publicKey)) throw new Error('the wallet returned a signature that doesn\'t verify');
      const seed = new Uint8Array(await crypto.subtle.digest('SHA-256', sig));
      this.session = { owner, ...(await this.keysFrom(seed)), balance: null };
      const keys = (() => { try { return JSON.parse(store.get('gk:keys') || '{}'); } catch { return {}; } })();
      keys[owner] = b64enc(seed); store.set('gk:keys', JSON.stringify(keys));
      this.game = null;
      say('ok', 'Game balance open: top it up to play without pop-ups');
      this.refresh();
    } catch (err) { say('bad', /reject|declin|denied|cancel/i.test(errText(err)) ? 'Cancelled in the wallet' : errText(err)); }
    this.render();
  },
  /* forget the key in this browser (the wallet's signature opens it again; the SOL stays where it is) */
  lock() {
    const keys = (() => { try { return JSON.parse(store.get('gk:keys') || '{}'); } catch { return {}; } })();
    delete keys[this.session.owner]; store.set('gk:keys', JSON.stringify(keys));
    this.session = null; this.game = null;
    this.refresh();
  },
  async sessionSign(b64) {
    const tx = b64dec(b64), t = readTx(tx), e = await ed();
    tx.set(await e.signAsync(t.message, this.session.seed), 1);
    return tx;
  },
  async topup(amount) {
    if (this.busy) return;
    const me = this.wallet.account.address, to = this.session.address, lamports = Math.round(amount * 1e9);
    this.busy = true; this.render();
    try {
      const built = await api({ topup: lamports, publicKey: me, to });
      checkTx(b64dec(built.tx), me, [SYSTEM], (ixs) => { if (ixs.length !== 1 || !isTransfer(ixs[0], me, to, lamports)) throw new Error('not the top-up asked for'); });
      say('', 'Approve the top-up in ' + this.wallet.active.name + '…');
      const sig = await this.send(await this.walletSign(built.tx));
      say('', 'Topping up…');
      await this.confirmed(sig);
      say('ok', 'Game balance topped up: plays need no pop-ups now');
      this.topupOpen = false;
    } catch (err) { say('bad', /reject|declin|denied|cancel/i.test(errText(err)) ? 'Cancelled in the wallet' : errText(err)); }
    finally { this.busy = false; await this.refresh(); }
  },
  async withdraw() {
    if (this.busy) return;
    const me = this.session.address, to = this.session.owner;
    this.busy = true; this.render();
    try {
      const built = await api({ withdraw: true, publicKey: me, to });
      checkTx(b64dec(built.tx), me, [SYSTEM, GAMBA], (ixs) => {
        const last = ixs[ixs.length - 1];
        if (!isTransfer(last, me, to, built.amount)) throw new Error('not a withdrawal to your wallet');
        for (const ix of ixs.slice(0, -1)) if (ix.program !== GAMBA || !isDisc(ix.data, 'playerClose') || ix.accounts[0] !== me) throw new Error('the withdrawal does something else');
      });
      say('', 'Withdrawing…');
      const sig = await this.send(await this.sessionSign(built.tx));
      await this.confirmed(sig);
      say('ok', 'Withdrew ' + sol(built.amount / 1e9) + ' SOL to ' + short(to));
      this.game = null;
    } catch (err) { say('bad', errText(err)); }
    finally { this.busy = false; await this.refresh(); }
  },

  /* ---------- a real play: build, check, sign, send, wait for Gamba, recompute ----------
     body: the game's own fields for /api/gamba; want: { wager, bet, metadata } as the page asked; onSent starts the show */
  async play(body, want, onSent) {
    const me = this.signer, viaBalance = !!this.session, clientSeed = this.seed(), id = ++this.plays;
    this.setChecks([]);
    let sig = null;
    try {
      say('', 'Building your play…');
      let built = await api({ ...body, game: this.id, publicKey: me, clientSeed });
      if (built.game !== await gameAddrOf(me)) throw new Error('the play names another game account');
      let before = await readGame(built.game);
      if (viaBalance) {
        const need = built.cost / 1e9 + (before ? 0 : SEAT_RENT) + 0.0001;
        if ((this.session.balance || 0) < need) throw new Error('Your game balance is short: top it up (needs ' + sol(need) + ' SOL)');
      }
      /* a first play: Gamba's seat for this player, so its first seed is committed before the bet */
      if (!before) {
        say('', viaBalance ? 'Taking your Gamba seat…' : 'First play: approve your Gamba seat in ' + this.wallet.active.name);
        const seat = await api({ publicKey: me, seat: true });
        checkTx(b64dec(seat.tx), me, [GAMBA], (ixs) => { if (ixs.length !== 1 || !isDisc(ixs[0].data, 'playerInitialize') || ixs[0].accounts[2] !== me) throw new Error('not a Gamba seat'); });
        await this.confirmed(await this.send(viaBalance ? await this.sessionSign(seat.tx) : await this.walletSign(seat.tx)));
        say('', 'Waiting for Gamba to commit your first seed…');
        for (let i = 0; i < 40 && !(before && before.nextRngSeedHashed); i++) { await sleep(500); before = await readGame(built.game); }
        if (!before) throw new Error('the seat did not appear');
        built = await api({ ...body, game: this.id, publicKey: me, clientSeed });
      }
      if (before.status === 'ResultRequested') throw new Error('your last play is still settling; try again in a moment');
      const committed = before.nextRngSeedHashed;
      checkTx(b64dec(built.tx), me, [GAMBA], (ixs) => checkPlay(ixs, me, { ...want, clientSeed }));
      this.addCheck('ok', 'Checked here: only Gamba\'s play, ' + sol(want.wager / 1e9) + ' SOL, your seed, ' + (this.info.pool.fees.creatorBps / 100) + '% to tweetpad');
      if (!viaBalance) say('', 'Approve in ' + this.wallet.active.name + '…');
      const signedTx = viaBalance ? await this.sessionSign(built.tx) : await this.walletSign(built.tx);
      sig = await this.send(signedTx);
      if (onSent) onSent();
      say('', 'Gamba is rolling…');
      const started = Date.now();
      let g = null;
      for (let i = 0; i < 150; i++) {
        await sleep(i < 10 ? 250 : 400);
        if (i % 6 === 5) {
          const [st] = (await rpc('getSignatureStatuses', [[sig]])).value;
          if (st && st.err) throw new Error('the play failed on chain');
        }
        g = await readGame(built.game).catch(() => null);
        if (g && g.nonce === before.nonce + 1n && g.status !== 'ResultRequested') break;
        g = null;
      }
      if (!g) throw Object.assign(new Error('Gamba hasn\'t settled yet: the result will show in your balance'), { pending: true });
      if (this.opts.suspense) await sleep(Math.max(0, this.opts.suspense - (Date.now() - started)));
      /* the result, recomputed here */
      const r = await resultOf(g.rngSeed, g.clientSeed, (g.nonce - 1n).toString(), g.bet.length);
      const commitOk = committed ? (await sha256(g.rngSeed)) === committed : null;
      this.addCheck(commitOk ? 'ok' : commitOk === false ? 'bad' : 'warn', commitOk ? 'Seed revealed; its SHA-256 matches what Gamba committed before you played'
        : commitOk === false ? 'The revealed seed does NOT match the committed hash' : 'Seed revealed (no hash was committed before this play)');
      this.addCheck(r.index === g.result ? 'ok' : 'bad', 'HMAC-SHA256(seed, "' + g.clientSeed + '-' + (g.nonce - 1n) + '") → ' + r.number + ' → outcome ' + (r.index + 1) + ' of ' + g.bet.length
        + (r.index === g.result ? ', as Gamba settled' : ', but Gamba settled ' + (g.result + 1)));
      this.game = g;
      const mult = g.bet[g.result] / 10000;
      this.listPlay(built.game, sig, id);
      return { win: mult > 0, index: g.result, outcomes: g.bet.length, mult, wager: Number(g.wager) / 1e9, payout: Number(g.wager) * mult / 1e9,
        cost: Number(g.wager + g.creatorFee + g.gambaFee + g.poolFee + g.jackpotFee) / 1e9, jackpot: Number(g.jackpotPayout) / 1e9 };
    } catch (err) {
      const msg = errText(err);
      say('bad', /reject|declin|denied|cancel/i.test(msg) ? 'Cancelled in the wallet' : msg);
      if (sig) this.addCheck(err.pending ? 'warn' : 'bad', 'Your play', 'https://solscan.io/tx/' + sig, 'Tx ↗');
      return null;
    } finally { this.refresh(); }
  },
  /* practice: the same formula, with a seed this browser commits to and reveals; the money is pretend */
  async practice(wager, bet, feeBps) {
    const bank = this.practiceBank, clientSeed = this.seed();
    const cost = wager * (1 + feeBps / 10000);
    if (bank.balance < cost - 1e-9) { say('bad', 'Out of practice SOL: press Refill'); return null; }
    bank.balance -= cost;
    this.render();
    const r = await resultOf(bank.seed, clientSeed, bank.nonce, bet.length);
    const mult = bet[r.index] / 10000;
    this.setChecks([
      { tone: 'ok', text: 'Practice seed revealed; its SHA-256 matches the one shown before the play' },
      { tone: 'ok', text: 'HMAC-SHA256(seed, "' + clientSeed + '-' + bank.nonce + '") → ' + r.number + ' → outcome ' + (r.index + 1) + ' of ' + bet.length },
    ]);
    bank.nonce += 1;
    bank.seed = hex(crypto.getRandomValues(new Uint8Array(32)));
    bank.balance += wager * mult;
    this.saveSess();
    return { win: mult > 0, index: r.index, outcomes: bet.length, mult, wager, payout: wager * mult, cost, jackpot: 0 };
  },
  /* the settle transaction (Gamba's RNG sends it): its link, and the play listed here */
  async listPlay(gameAddr, playSig, id) {
    for (let i = 0; i < 6; i++) {
      await sleep(1200);
      try {
        const list = await rpc('getSignaturesForAddress', [gameAddr, { limit: 3, commitment: 'confirmed' }]);
        const hit = list.find(x => x.signature !== playSig && !x.err);
        if (!hit) continue;
        if (id === this.plays) this.addCheck('ok', 'Settled on chain', EXPLORER + '/tx/' + hit.signature, 'Gamba explorer ↗');   // not once a newer play began
        await api({ settled: hit.signature }).catch(() => null);
        return this.loadInfo();
      } catch { /* the RPC catches up */ }
    }
  },
  /* may a real play go ahead? (says why not) */
  ready() {
    if (!this.info) return say('bad', 'Still loading the pool…'), false;
    if (!this.info.live) return say('bad', 'Real plays aren’t switched on yet: practice for now'), false;
    if (this.info.region.blocked) return say('bad', 'Real-money play isn’t offered in your region: practice is'), false;
    if (!this.wallet.account) {
      if (this.wallet.list.length === 1) this.connect(this.wallet.list[0]);
      $('gk-wallets').classList.add('nudge'); setTimeout(() => $('gk-wallets').classList.remove('nudge'), 700);
      return say('', 'Connect a wallet to play with SOL'), false;
    }
    if (!$('gk-age').checked) { $('gk-gate').classList.add('nudge'); setTimeout(() => $('gk-gate').classList.remove('nudge'), 700); return say('bad', 'Tick the 18+ box first'), false; }
    if (!this.seed()) return say('bad', 'Your seed: 1–32 letters or numbers'), false;
    return true;
  },

  /* ---------- the page's shared parts ---------- */
  setChecks(list) { this.checks = list; this.renderChecks(); },
  addCheck(tone, text, href, link) { this.checks.push({ tone, text, href, link }); this.renderChecks(); },
  renderChecks() {
    $('gk-checks').replaceChildren(...this.checks.map(c => {
      const li = el('li', { className: c.tone, textContent: c.text });
      if (c.href) li.append(el('a', { href: c.href, target: '_blank', rel: 'noopener', textContent: c.link || '↗' }));
      return li;
    }));
  },
  feeBps() { const f = this.info ? this.info.pool.fees : this.opts.fees; return f.creatorBps + f.gambaBps + f.poolBps + f.jackpotBps; },
  render() {
    const real = this.mode === 'real', info = this.info, off = !!(info && (!info.live || info.region.blocked));
    for (const b of document.querySelectorAll('[data-play]')) { b.setAttribute('aria-pressed', String(b.dataset.play === this.mode)); b.disabled = this.busy; }
    const link = (text, onclick) => el('button', { type: 'button', className: 'linkish', textContent: text, onclick });
    /* who plays: practice money, the game balance, or the wallet */
    const line = $('gk-wallet'), bank = $('gk-bank');
    let bankKids = [];
    if (!real) line.replaceChildren(el('span', { textContent: sol(this.practiceBank.balance) + ' SOL practice' }), ' ',
      link('Refill', () => { this.practiceBank.balance = PRACTICE_START; this.saveSess(); this.render(); }));
    else if (this.wallet.account) {
      line.replaceChildren(el('span', { textContent: short(this.wallet.account.address) + (this.wallet.balance != null ? ' · ' + sol(this.wallet.balance) + ' SOL' : '') }), ' ', link('Disconnect', () => this.disconnect()));
      if (off) bankKids = [];
      else if (!this.session) bankKids = [el('span', { className: 'grow', textContent: 'Each play asks your wallet.' }), el('button', { type: 'button', className: 'btn primary', textContent: '⚡ Instant play', title: 'One free signature opens a game balance: plays need no pop-ups', onclick: () => this.unlock(), disabled: this.busy })];
      else {
        const s = this.session;
        bankKids = [el('span', { className: 'grow' }, '⚡ Game balance ', el('b', { textContent: s.balance == null ? '…' : sol(s.balance) + ' SOL' })),
          link('Top up', () => { this.topupOpen = !this.topupOpen; this.render(); }), link('Withdraw', () => this.withdraw()), link('Lock', () => this.lock())];
        if (this.topupOpen) {
          const room = (info ? info.maxBalance / 1e9 : 1) - (s.balance || 0);
          bankKids.push(el('div', { className: 'gk-topup' }, el('span', { textContent: 'From your wallet:' }),
            ...[0.05, 0.1, 0.25, 0.5].map(v => el('button', { type: 'button', className: 'btn', textContent: v + ' SOL', disabled: this.busy || v > room + 1e-9, onclick: () => this.topup(v) }))));
        }
      }
    } else line.replaceChildren();
    bank.hidden = !bankKids.length;
    bank.replaceChildren(...bankKids);
    const offer = real && !this.wallet.account && !off;
    $('gk-wallets').hidden = !offer;
    if (offer) {
      const mobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent), page = SITE + location.pathname;
      const found = this.wallet.list.map(w => el('button', { type: 'button', className: 'btn', onclick: () => this.connect(w) }, w.icon ? el('img', { src: w.icon, alt: '', width: 16, height: 16 }) : null, w.name));
      const catalog = [['Phantom', 'https://phantom.com/download', (u) => 'https://phantom.app/ul/browse/' + encodeURIComponent(u) + '?ref=' + encodeURIComponent(location.origin)],
        ['Solflare', 'https://solflare.com/download', (u) => 'https://solflare.com/ul/v1/browse/' + encodeURIComponent(u) + '?ref=' + encodeURIComponent(location.origin)]];
      const missing = catalog.filter(([n]) => !this.wallet.list.some(w => w.name.toLowerCase() === n.toLowerCase()))
        .map(([n, install, open]) => el('a', { className: 'btn', href: mobile ? open(page) : install, target: '_blank', rel: 'noopener', textContent: (mobile ? 'Open in ' : 'Get ') + n }));
      $('gk-wallets').replaceChildren(...found, ...(found.length ? [] : missing));
    }
    $('gk-gate').hidden = !real || $('gk-age').checked || off;
    let text = this.opts.costLine ? this.opts.costLine(this.feeBps()) : '';
    if (real && info && !info.live) text = 'Real plays aren’t switched on yet: practice for now';
    else if (real && info && info.region.blocked) text = 'Real-money play isn’t offered in your region: practice is';
    else if (!real) text = 'Practice, no money · ' + text;
    $('gk-line').textContent = text;
    if (this.opts.render) this.opts.render();
  },
  async renderFair() {
    const next = $('gk-next');
    if (this.mode === 'practice') next.textContent = await sha256(this.practiceBank.seed) + ' (practice)';
    else if (this.game && this.game.nextRngSeedHashed) next.textContent = this.game.nextRngSeedHashed;
    else next.textContent = this.wallet.account ? 'shown after your first play here' : 'connect to see yours';
    $('gk-explorer').href = this.mode === 'real' && this.signer ? EXPLORER + '/player/' + this.signer : this.info && this.info.creator ? EXPLORER + '/platform/' + this.info.creator : EXPLORER;
  },
  renderInfo() {
    const info = this.info;
    if (!info) return;
    if ($('gk-jackpot')) $('gk-jackpot').textContent = sol(info.pool.jackpot / 1e9) + ' SOL';
    const st = info.stats;
    $('gk-totals').textContent = st.plays ? st.plays.toLocaleString() + ' plays · ' + sol(st.volume / 1e9) + ' SOL' : '';
    const ago = (t) => { const s = Math.max(1, (Date.now() - t) / 1000 | 0); return s < 60 ? s + 's' : s < 3600 ? (s / 60 | 0) + 'm' : s < 86400 ? (s / 3600 | 0) + 'h' : (s / 86400 | 0) + 'd'; };
    $('gk-feed').replaceChildren(...(info.plays.length ? info.plays.map(p => {
      const win = p.payout + p.jackpot > 0;
      return el('li', {}, el('span', { className: 'who', textContent: short(p.user) }), this.opts.feedCall(p), el('span', { textContent: sol(p.wager / 1e9) + ' · ' + ago(p.at) }),
        el('a', { className: 'amt' + (win ? '' : ' lost'), href: EXPLORER + '/tx/' + p.sig, target: '_blank', rel: 'noopener', textContent: (win ? '+' + sol((p.payout + p.jackpot) / 1e9) : 'lost') + ' ↗' }));
    }) : [el('li', { className: 'empty', textContent: info.live ? 'No plays yet. Yours is the first.' : 'Real plays open soon. Practice meanwhile.' })]));
    const f = info.pool.fees;
    $('gk-fees').textContent = 'Each play costs your bet plus fees (' + f.creatorBps / 100 + '% tweetpad, ' + f.gambaBps / 100 + '% Gamba, ' + f.poolBps / 100 + '% the pool'
      + (f.jackpotBps ? ', ' + f.jackpotBps / 100 + '% the jackpot' : '') + ').';
  },
  async loadInfo() {
    try {
      const r = await fetch('/api/gamba?game=' + this.id);
      const out = await r.json();
      if (!r.ok) throw new Error(out.error);
      this.info = out;
    } catch { if (!this.info) $('gk-feed').replaceChildren(el('li', { className: 'empty', textContent: 'Could not reach Gamba just now.' })); }
    this.renderInfo(); this.render(); this.renderFair();
  },
};
