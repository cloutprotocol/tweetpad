/* Tweetpad: the X card app (embed.html). Plain browser JS, no build step. */
(() => {
'use strict';

/* ---------- config (query params: ?cluster=devnet  ?rpc=https://…  ?mode=popup) ---------- */
const qs = new URLSearchParams(location.search);
const MODE = qs.get('mode') === 'popup' ? 'popup' : 'embed';
/* mainnet by default: it is what real wallets are set to, and the probe transaction is never broadcast */
const CLUSTER = qs.get('cluster') === 'devnet' ? 'devnet' : 'mainnet';
const CHAIN = 'solana:' + CLUSTER;
const RPC = (() => {
  /* api.mainnet-beta.solana.com answers browser requests with 403, so mainnet uses a CORS-friendly public RPC */
  const fallback = CLUSTER === 'mainnet' ? 'https://solana-rpc.publicnode.com' : 'https://api.devnet.solana.com';
  const v = qs.get('rpc');
  if (!v) return fallback;
  try { const u = new URL(v); return u.protocol === 'https:' ? u.href : fallback; } catch { return fallback; }
})();
const PROBE_VERSION = '1.0.0';
/* the probe URL without bridge params: what wallet in-app browsers and new tabs open */
const STANDALONE = (() => { const u = new URL(location.href); u.searchParams.delete('mode'); u.searchParams.delete('session'); return u.href; })();
const MOBILE = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const SESSION = Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, '0')).join('');

/* ---------- tiny helpers ---------- */
const $ = (id) => document.getElementById(id);
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null) el.append(kid);
  return el;
}
const hex = (bytes, n = bytes.length) => Array.from(bytes.slice(0, n), b => b.toString(16).padStart(2, '0')).join('');
const isPubkeyLike = (s) => typeof s === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
const short = (s) => (s && s.length > 14 ? s.slice(0, 6) + '…' + s.slice(-6) : s);
const errText = (e) => {
  const parts = [e && e.name, e && e.code != null ? '(' + e.code + ')' : '', e && e.message ? e.message : String(e)];
  /* wallets hide the useful part of a generic -32603 in data or cause */
  const known = new Set(['name', 'code', 'message', 'stack', 'data', 'cause']);
  const own = e && typeof e === 'object' ? Object.getOwnPropertyNames(e).filter(k => !known.has(k)) : [];
  if (own.length) try { parts.push('· ' + JSON.stringify(Object.fromEntries(own.map(k => [k, e[k]])))); } catch { /* ignore */ }
  for (const extra of [e && e.data, e && e.cause]) {
    if (extra == null) continue;
    try { parts.push('· ' + (typeof extra === 'string' ? extra : extra.message || JSON.stringify(extra))); } catch { /* unserialisable */ }
  }
  return parts.filter(Boolean).join(' ');
};

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
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
/* true / false = verified / forged; null = this browser has no WebCrypto Ed25519 */
async function edVerify(pub, sig, msg) {
  try {
    const key = await crypto.subtle.importKey('raw', pub, { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' }, key, sig, msg);
  } catch { return null; }
}
const verifyLabel = (v) => v === true ? 'signature verified' : v === false ? 'SIGNATURE DID NOT VERIFY' : 'signature returned (cannot verify in this browser)';

/* ---------- event log + relay to opener when running as the popup bridge ---------- */
const state = { env: {}, events: [], wallets: [], active: null };
let bc = null;
try { bc = new BroadcastChannel('wallet-embed-probe'); } catch { /* unavailable */ }

function log(tone, msg, data) {
  const ev = { t: new Date().toISOString(), tone, msg, ...(data ? { data } : {}) };
  state.events.push(ev);
  renderReport();
  if (MODE === 'popup') relay({ kind: 'event', ev });
}
function relay(payload) {
  const message = { source: 'wallet-embed-probe', session: qs.get('session') || null, ...payload };
  try { if (window.opener) window.opener.postMessage(message, location.origin); } catch { /* opener gone */ }
  try { if (bc) bc.postMessage(message); } catch { /* ignore */ }
}

/* ---------- environment ---------- */
async function probeEnv() {
  const e = state.env;
  e.probeVersion = PROBE_VERSION;
  e.mode = MODE;
  e.url = location.origin + location.pathname;
  e.framed = window.self !== window.top;
  e.topSameOrigin = null;
  if (e.framed) { try { void window.top.location.href; e.topSameOrigin = true; } catch { e.topSameOrigin = false; } }
  e.context = MODE === 'popup' ? 'popup' : !e.framed ? 'top-level' : e.topSameOrigin ? 'same-origin frame' : 'cross-origin frame';
  e.hasOpener = !!window.opener;
  e.origin = window.origin;
  e.sandboxedOpaqueOrigin = window.origin === 'null';
  e.ancestorOrigins = location.ancestorOrigins ? Array.from(location.ancestorOrigins) : 'unsupported in this browser';
  e.referrer = document.referrer || '(empty)';
  e.secureContext = window.isSecureContext;
  e.viewport = innerWidth + 'x' + innerHeight + ' @' + devicePixelRatio + 'x';
  e.userAgent = navigator.userAgent;
  try { localStorage.setItem('__probe', '1'); localStorage.removeItem('__probe'); e.localStorage = 'ok'; }
  catch (err) { e.localStorage = 'blocked: ' + errText(err); }
  e.cookieEnabled = navigator.cookieEnabled;
  try { e.hasStorageAccess = document.hasStorageAccess ? await document.hasStorageAccess() : 'unsupported'; }
  catch (err) { e.hasStorageAccess = 'error: ' + errText(err); }
  try {
    const fp = document.featurePolicy || document.permissionsPolicy;
    if (fp && fp.allowedFeatures) {
      const allowed = new Set(fp.allowedFeatures());
      const interesting = ['clipboard-write', 'storage-access', 'publickey-credentials-get', 'usb', 'hid', 'bluetooth', 'payment', 'fullscreen', 'web-share'];
      e.permissionsPolicy = Object.fromEntries(interesting.map(f => [f, allowed.has(f)]));
    } else e.permissionsPolicy = 'not readable in this browser';
  } catch (err) { e.permissionsPolicy = 'error: ' + errText(err); }
  try {
    await crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify']);
    e.webcryptoEd25519 = true;
  } catch { e.webcryptoEd25519 = false; }
  e.cluster = CLUSTER; e.rpc = RPC;
  e.injected = snapshotGlobals();
  renderEnv(); renderReport();
}
function snapshotGlobals() {
  const w = window;
  return {
    'window.phantom.solana': !!(w.phantom && w.phantom.solana),
    'window.phantom.solana.isConnected': !!(w.phantom && w.phantom.solana && w.phantom.solana.isConnected),
    'window.phantom.ethereum': !!(w.phantom && w.phantom.ethereum),
    'window.solana': !!w.solana,
    'window.solflare': !!w.solflare,
    'window.backpack': !!w.backpack,
    'window.ethereum': !!w.ethereum,
  };
}

/* ---------- wallet discovery ---------- */
function addWallet(wallet) {
  state.wallets.push(wallet);
  log('ok', 'detected ' + wallet.name + ' via ' + wallet.source);
  renderWallets();
}

/* Wallet Standard: announce the app, and accept wallets that announce themselves later. */
const seenStandard = new Set();
const standardApi = Object.freeze({
  register(...wallets) {
    for (const w of wallets) {
      if (!w || seenStandard.has(w)) continue;
      seenStandard.add(w);
      const chains = Array.from(w.chains || []);
      addWallet({
        kind: 'standard', source: 'Wallet Standard', ref: w,
        name: String(w.name || 'Unnamed wallet'), icon: w.icon,
        solana: chains.some(c => String(c).startsWith('solana:')),
        chains, features: Object.keys(w.features || {}), account: null, status: null,
      });
    }
    return () => {};
  },
});
function discoverStandard() {
  window.addEventListener('wallet-standard:register-wallet', (ev) => {
    try { ev.detail(standardApi); } catch (err) { log('bad', 'register-wallet callback threw: ' + errText(err)); }
  });
  try { window.dispatchEvent(new CustomEvent('wallet-standard:app-ready', { detail: standardApi })); }
  catch (err) { log('bad', 'could not dispatch app-ready: ' + errText(err)); }
}

/* Legacy injected Solana providers; hidden from the picker when the same wallet registered via Wallet Standard. */
const seenLegacy = new Set();
function discoverLegacy() {
  const candidates = [
    ['Phantom', 'window.phantom.solana', window.phantom && window.phantom.solana],
    ['Solflare', 'window.solflare', window.solflare],
    ['Backpack', 'window.backpack', window.backpack],
  ];
  for (const [name, path, provider] of candidates) {
    if (!provider || seenLegacy.has(provider)) continue;
    seenLegacy.add(provider);
    addWallet({ kind: 'legacy', source: path, ref: provider, name, icon: null, solana: true, chains: [], features: [], account: null, status: null });
  }
  state.env.injected = snapshotGlobals();
  renderEnv();
}

/* ---------- wallet actions ---------- */
async function run(wallet, label, fn) {
  const started = Date.now();
  wallet.status = { tone: 'warn', text: label + ': waiting for the wallet…' };
  renderWallets();
  log('warn', wallet.name + ' → ' + label + ' requested');
  const nag = setTimeout(() => {
    wallet.status = { tone: 'warn', text: label + ': still pending after 20s. If no wallet window appeared, the prompt is probably blocked in this frame.' };
    renderWallets();
    log('warn', wallet.name + ' → ' + label + ' still pending after 20s');
  }, 20000);
  try {
    const text = await fn();
    wallet.status = { tone: 'ok', text: label + ': ' + text };
    if (label === 'sign message') wallet.msgSigned = true;
    if (label === 'sign transaction') wallet.txSigned = true;
    log('ok', wallet.name + ' → ' + label + ' OK: ' + text, { ms: Date.now() - started });
    return true;
  } catch (err) {
    wallet.status = { tone: 'bad', text: label + ' failed: ' + errText(err) };
    log('bad', wallet.name + ' → ' + label + ' FAILED: ' + errText(err), { ms: Date.now() - started });
    return false;
  } finally {
    clearTimeout(nag);
    renderWallets();
  }
}
function probeMessage() {
  return new TextEncoder().encode(
    'Wallet embed probe\nThis only proves signing works. It authorizes nothing.\norigin: ' + location.origin +
    '\ncontext: ' + state.env.context + '\nnonce: ' + hex(crypto.getRandomValues(new Uint8Array(8))) + '\ntime: ' + new Date().toISOString());
}

/* Wallet Standard */
const solAccount = (w) => (w.accounts || []).find(a => (a.chains || []).some(c => String(c).startsWith('solana:'))) || (w.accounts || [])[0];
async function stdConnect(wallet) {
  const feature = wallet.ref.features['standard:connect'];
  if (!feature) throw new Error('wallet has no standard:connect feature');
  const res = await feature.connect();
  const account = (res && res.accounts && res.accounts[0] && solAccount({ accounts: res.accounts })) || solAccount(wallet.ref);
  if (!account) throw new Error('connect resolved but returned no account');
  wallet.account = { address: account.address, publicKey: new Uint8Array(account.publicKey), raw: account };
  return 'connected ' + account.address;
}
async function stdSignMessage(wallet, message = probeMessage()) {
  const feature = wallet.ref.features['solana:signMessage'];
  if (!feature) throw new Error('wallet has no solana:signMessage feature');
  const [out] = await feature.signMessage({ account: wallet.account.raw, message });
  const sig = new Uint8Array(out.signature);
  const ok = await edVerify(wallet.account.publicKey, sig, new Uint8Array(out.signedMessage));
  if (ok === false) throw new Error('wallet returned a signature that does not verify');
  return verifyLabel(ok) + ' · sig ' + short(b58encode(sig));
}

/* A 0-lamport transfer from the wallet to itself. It is signed, checked, and never broadcast. */
function buildProbeTransaction(payer, blockhash) {
  const message = new Uint8Array(118);
  let o = 0;
  message.set([1, 0, 1], o); o += 3;          // header: 1 signer, 0 readonly signed, 1 readonly unsigned
  message[o++] = 2;                            // account keys: payer, system program
  message.set(payer, o); o += 32;
  o += 32;                                     // system program id = 32 zero bytes
  message.set(blockhash, o); o += 32;
  message[o++] = 1;                            // one instruction
  message[o++] = 1;                            // program id index
  message[o++] = 2; message[o++] = 0; message[o++] = 0;   // accounts: from = to = payer
  message[o++] = 12;                           // data length
  message.set([2, 0, 0, 0], o);                // SystemProgram::Transfer, lamports = 0 (already zeroed)
  const tx = new Uint8Array(1 + 64 + message.length);
  tx[0] = 1;                                   // one signature slot, left empty
  tx.set(message, 65);
  return tx;
}
async function latestBlockhash() {
  try {
    const res = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getLatestBlockhash', params: [{ commitment: 'finalized' }] }) });
    const json = await res.json();
    const bytes = b58decode(json.result.value.blockhash);
    if (bytes.length !== 32) throw new Error('unexpected blockhash length');
    return { bytes, real: true };
  } catch (err) {
    log('warn', 'RPC blockhash fetch failed (' + errText(err) + '); using a random one, so the wallet preview will not simulate');
    return { bytes: crypto.getRandomValues(new Uint8Array(32)), real: false };
  }
}
function splitSignedTransaction(bytes) {
  // compact-u16 signature count (one byte for any realistic count), then 64-byte signatures, then the message
  const count = bytes[0];
  if (count < 1 || count > 127) throw new Error('unexpected signature count ' + count);
  return { signature: bytes.slice(1, 65), message: bytes.slice(1 + 64 * count) };
}
async function stdSignTransaction(wallet) {
  const feature = wallet.ref.features['solana:signTransaction'];
  if (!feature) throw new Error('wallet has no solana:signTransaction feature');
  const bh = await latestBlockhash();
  const tx = buildProbeTransaction(wallet.account.publicKey, bh.bytes);
  const [out] = await feature.signTransaction({ account: wallet.account.raw, transaction: tx, chain: CHAIN });
  const signed = new Uint8Array(out.signedTransaction);
  const { signature, message } = splitSignedTransaction(signed);
  if (signature.every(b => b === 0)) throw new Error('wallet returned the transaction unsigned');
  const ok = await edVerify(wallet.account.publicKey, signature, message);
  if (ok === false) throw new Error('wallet returned a transaction signature that does not verify');
  const modified = message.length !== 118 ? ' · wallet modified the transaction (' + message.length + ' byte message)' : '';
  return verifyLabel(ok) + ' · not broadcast' + (bh.real ? '' : ' · placeholder blockhash') + modified;
}

/* Legacy provider (window.phantom.solana and friends) */
async function legacyConnect(wallet) {
  const res = await wallet.ref.connect();
  const pk = (res && res.publicKey) || wallet.ref.publicKey;
  if (!pk) throw new Error('connect resolved but returned no public key');
  const address = pk.toString();
  wallet.account = { address, publicKey: pk.toBytes ? new Uint8Array(pk.toBytes()) : b58decode(address) };
  return 'connected ' + address;
}
async function legacySignMessage(wallet, message = probeMessage()) {
  const out = await wallet.ref.signMessage(message, 'utf8');
  const sig = new Uint8Array(out.signature || out);
  const ok = await edVerify(wallet.account.publicKey, sig, message);
  if (ok === false) throw new Error('wallet returned a signature that does not verify');
  return verifyLabel(ok) + ' · sig ' + short(b58encode(sig));
}

const ACTIONS = {
  standard: { connect: stdConnect, signMessage: stdSignMessage, signTransaction: stdSignTransaction },
  legacy: { connect: legacyConnect, signMessage: legacySignMessage },
};

/* ---------- popup bridge (fallback path) ---------- */
function openPopupBridge() {
  selectTab('fallbacks');
  const status = $('popup-status');
  const url = new URL(location.href);
  url.searchParams.set('mode', 'popup');
  url.searchParams.set('session', SESSION);
  let win = null;
  try { win = window.open(url.href, 'wallet-embed-probe', 'popup,width=440,height=640'); }
  catch (err) { log('bad', 'window.open threw: ' + errText(err)); }
  if (!win) {
    status.className = 'status bad';
    status.textContent = 'Popup blocked. Either the frame sandbox lacks allow-popups or the browser blocked it.';
    log('bad', 'popup bridge: window.open returned null (blocked)');
    return;
  }
  status.className = 'status warn';
  status.textContent = 'Popup opened. Connect and sign there; results will appear here.';
  log('ok', 'popup bridge: window opened');
}
function onBridgeMessage(channel, data) {
  if (!data || data.source !== 'wallet-embed-probe' || data.session !== SESSION || MODE === 'popup') return;
  if (data.kind !== 'event' || !data.ev) return;
  log(data.ev.tone, '[popup via ' + channel + '] ' + data.ev.msg);
  if (data.ev.tone === 'ok' && / → /.test(data.ev.msg)) {
    const status = $('popup-status');
    status.className = 'status ok';
    status.textContent = 'Bridge works over ' + channel + ': ' + data.ev.msg;
  }
}

/* ---------- rendering ---------- */
const iconOf = (wallet, fallback) => typeof wallet.icon === 'string' && /^(data:image\/|https:)/.test(wallet.icon)
  ? h('img', { src: wallet.icon, alt: '' }) : fallback;

/* ---------- wallet picker ---------- */
/* offered even when not installed: install page on desktop, the wallet's in-app browser on mobile */
const CATALOG = [
  { name: 'Phantom', color: '#ab9ff2', install: 'https://phantom.com/download',
    open: (u) => 'https://phantom.app/ul/browse/' + encodeURIComponent(u) + '?ref=' + encodeURIComponent(location.origin) },
  { name: 'Solflare', color: '#fc7227', install: 'https://solflare.com/download',
    open: (u) => 'https://solflare.com/ul/v1/browse/' + encodeURIComponent(u) + '?ref=' + encodeURIComponent(location.origin) },
  { name: 'Backpack', color: '#e33e3f', install: 'https://backpack.app/downloads', open: null },
];
const EXCLUDED = /metamask/i;   // shows a phishing interstitial on this domain
const LAST_KEY = 'probe:last-wallet';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked in this frame */ } },
};
const baseName = (n) => n.toLowerCase();
function visibleWallets() {
  const standard = new Set(state.wallets.filter(w => w.kind === 'standard').map(w => baseName(w.name)));
  return state.wallets.filter(w => w.solana && !EXCLUDED.test(w.name) && !(w.kind === 'legacy' && standard.has(baseName(w.name))));
}
const walletIcon = (w) => {
  const c = CATALOG.find(c => c.name.toLowerCase() === baseName(w.name));
  return iconOf(w, h('span', { class: 'ph', style: '--c:' + (c ? c.color : '#3b5560'), text: w.name.slice(0, 1).toUpperCase() }));
};
const shortAddr = (a) => a.slice(0, 4) + '…' + a.slice(-4);

async function connectWallet(wallet) {
  closeMenu();
  const ok = await run(wallet, 'connect', () => ACTIONS[wallet.kind].connect(wallet));
  if (!ok) return;
  if (state.active && state.active !== wallet) { state.active.account = null; state.active.status = null; }
  state.active = wallet;
  store.set(LAST_KEY, wallet.name);
  loadMe();
  renderWallets();
}
async function disconnectWallet() {
  const w = state.active;
  if (!w) return;
  closeMenu();
  try {
    if (w.kind === 'standard' && w.ref.features['standard:disconnect']) await w.ref.features['standard:disconnect'].disconnect();
    else if (w.kind === 'legacy' && w.ref.disconnect) await w.ref.disconnect();
  } catch (err) { log('warn', w.name + ' → disconnect: ' + errText(err)); }
  w.account = null; w.status = null; w.msgSigned = w.txSigned = false;
  state.active = null;
  log('ok', w.name + ' → disconnected');
  loadMe();
  renderWallets();
}
async function copyAddress() {
  const a = state.active && state.active.account.address;
  if (!a) return;
  try { await navigator.clipboard.writeText(a); log('ok', 'address copied'); }
  catch { log('warn', 'clipboard blocked in this frame: ' + a); }
}

function renderMenu() {
  const list = visibleWallets();
  const active = state.active;
  const last = store.get(LAST_KEY);
  const kids = [h('div', { class: 'menu-head' }, h('span', { text: active ? 'Your wallet' : 'Connect a wallet' }),
    h('button', { class: 'menu-x', 'aria-label': 'Close', onclick: closeMenu }, '×'))];
  if (active) kids.push(h('div', { class: 'acct-box' },
    profileCard(),
    rewardsBox(true),
    h('div', { class: 'actions' },
      h('button', { class: 'btn sm primary', role: 'menuitem', onclick: () => { closeMenu(); selectTab('profile'); } }, 'Profile'),
      h('span', { class: 'via', title: 'Connected wallet' }, walletIcon(active), active.name),
      h('button', { class: 'btn sm danger', role: 'menuitem', onclick: disconnectWallet }, 'Disconnect'))));
  const others = list.filter(w => w !== active).sort((a, b) => (b.name === last) - (a.name === last));
  if (others.length) kids.push(h('div', { class: 'menu-sec', text: active ? 'Switch wallet' : 'Detected' }), walletOptions(others, last));
  else if (!active && !settled) kids.push(h('p', { class: 'note', text: 'Looking for wallets…' }));
  const missing = missingWallets(list);
  if (missing.length && !active) kids.push(h('div', { class: 'menu-sec', text: MOBILE ? 'Open in wallet app' : 'More wallets' }), missing.map(catalogOption));
  kids.push(h('div', { class: 'menu-foot' }, h('span', { text: CLUSTER + ' · ' + (state.env.context || '…') }),
    MODE === 'popup' || active ? null : h('button', { class: 'linkish', onclick: () => { closeMenu(); openPopupBridge(); } }, 'Wallet missing? Popup')));
  $('wc-menu').replaceChildren(...kids.flat());
}
function renderTrigger() {
  const btn = $('wc-btn');
  const a = state.active;
  btn.replaceChildren(...(a ? [walletIcon(a), h('span', { text: shortAddr(a.account.address) })] : [h('span', { text: 'Connect' })]),
    h('span', { class: 'caret', text: '▾' }));
  btn.classList.toggle('primary', !a);
}
function openMenu() {
  renderMenu();
  $('wc-menu').hidden = false;
  $('wc-btn').setAttribute('aria-expanded', 'true');
  const first = $('wc-menu').querySelector('.opt, .acct-box .btn');
  if (first) first.focus();
}
function closeMenu() {
  if ($('wc-menu').hidden) return;
  $('wc-menu').hidden = true;
  $('wc-btn').setAttribute('aria-expanded', 'false');
}
const toggleMenu = () => ($('wc-menu').hidden ? openMenu() : closeMenu());

/* shared by the center picker and the dropdown */
const walletOptions = (wallets, last) => wallets.map(w =>
  h('button', { class: 'opt', role: 'menuitem', onclick: () => connectWallet(w) }, walletIcon(w), h('span', { class: 'opt-name', text: w.name }),
    w.status && w.status.tone === 'bad' ? h('span', { class: 'tag bad', text: 'FAILED' })
    : w.name === last ? h('span', { class: 'tag gold', text: 'LAST USED' }) : h('span', { class: 'tag', text: 'DETECTED' })));
const missingWallets = (list) => CATALOG.filter(c => !list.some(w => baseName(w.name) === c.name.toLowerCase()));
const catalogHref = (c) => (MOBILE && c.open ? c.open(STANDALONE) : c.install);
const catalogOption = (c) => h('a', { class: 'opt', role: 'menuitem', href: catalogHref(c), target: '_blank', rel: 'noopener' },
  h('span', { class: 'ph', style: '--c:' + c.color, text: c.name.slice(0, 1) }), h('span', { class: 'opt-name', text: c.name }),
  h('span', { class: 'tag dim', text: MOBILE && c.open ? 'OPEN ↗' : 'INSTALL ↗' }));
const addrButton = (address) => h('button', { class: 'addr', title: 'Copy address', onclick: copyAddress }, address);

/* debug → Sign: the raw connect / sign checks, kept out of the main view */
function signPanel(wallet) {
  if (!wallet) return h('p', { class: 'note', text: 'Connect a wallet (C) to test signing a message and a transaction here.' });
  const actions = ACTIONS[wallet.kind];
  const quest = (done, label, button) => h('li', { class: done ? 'done' : '' }, h('i', { class: 'check' }), h('span', { text: label }), button);
  return h('div', { class: 'card' },
    h('div', { class: 'card-head' }, walletIcon(wallet),
      h('div', { style: 'min-width:0' }, h('div', { class: 'card-name', text: wallet.name }), addrButton(shortAddr(wallet.account.address)))),
    h('ul', { class: 'quests' },
      quest(true, 'Wallet detected · ' + wallet.source),
      quest(true, 'Connected in ' + state.env.context),
      quest(wallet.msgSigned, 'Message signed',
        h('button', { class: 'btn sm' + (wallet.msgSigned ? '' : ' primary'), onclick: () => run(wallet, 'sign message', () => actions.signMessage(wallet)) }, 'Sign')),
      actions.signTransaction
        ? quest(wallet.txSigned, 'Transaction signed · ' + CLUSTER,
            h('button', { class: 'btn sm' + (wallet.msgSigned && !wallet.txSigned ? ' primary' : ''), onclick: () => run(wallet, 'sign transaction', () => actions.signTransaction(wallet)) }, 'Sign'))
        : null,
      quest(launch.dryDone, 'Launch dry run · upload + sign, no deploy',
        h('button', { class: 'btn sm', disabled: !launch.file, title: launch.file ? '' : 'Add an image on the launch form first', onclick: onDryRun }, 'Run'))),
    wallet.status ? h('div', { class: 'status ' + wallet.status.tone, text: wallet.status.text }) : null);
}

/* ---------- launch form: a real pump.fun launch from inside the card ---------- */
const MAX_IMAGE = 4 * 1024 * 1024;   // Vercel function bodies cap at 4.5 MB
const MAX_DEV_BUY = 10;              // SOL; the server enforces the same cap
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const launch = { file: null, bytes: null, url: null, sha: null, dims: null, busy: false, done: false, dryDone: false, result: null, checks: [] };
const fmtSize = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
const b64enc = (bytes) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
const b64dec = (str) => Uint8Array.from(atob(str), c => c.charCodeAt(0));

function imgMeta(text, bad) {
  $('img-meta').textContent = text;
  $('img-meta').classList.toggle('bad', !!bad);
  if (bad) log('bad', 'image rejected: ' + text);
}
async function takeImage(file, via) {
  if (!file) return;
  log('ok', 'image via ' + via + ': ' + (file.name || 'pasted') + ' · ' + (file.type || 'no type') + ' · ' + fmtSize(file.size));
  if (!IMAGE_TYPES.includes(file.type)) return imgMeta('Use PNG, JPG, GIF or WebP (got ' + (file.type || 'unknown') + ')', true);
  if (file.size > MAX_IMAGE) return imgMeta('That is ' + fmtSize(file.size) + '; the limit is 4 MB', true);
  let bytes, sha, dims;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
    sha = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
  } catch (err) { return imgMeta('Could not read the file in this frame: ' + errText(err), true); }
  const url = URL.createObjectURL(file);
  try {
    dims = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve([img.naturalWidth, img.naturalHeight]);
      img.onerror = () => reject(new Error('The file does not decode as an image'));
      img.src = url;
    });
  } catch (err) { URL.revokeObjectURL(url); return imgMeta(err.message, true); }
  if (launch.url) URL.revokeObjectURL(launch.url);
  Object.assign(launch, { file, bytes, url, sha, dims, thumb: await makeThumb(url), done: false, result: null, checks: [] });
  $('img-preview').src = url;
  $('img-preview').hidden = false;
  $('drop-hint').hidden = true;
  $('drop').classList.add('has');
  imgMeta(dims[0] + '×' + dims[1] + ' · ' + fmtSize(file.size) + (dims[0] !== dims[1] ? ' · square looks best' : ''));
  renderLaunch();
}
/* a 64px center-cropped copy saved with the launch, so the token list loads without fetching any images */
async function makeThumb(url) {
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    c.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 64, 64);
    for (const [type, q] of [['image/webp', .8], ['image/jpeg', .8], ['image/png']]) {
      const data = c.toDataURL(type, q);
      if (data.startsWith('data:' + type) && data.length < 20000) return data;
    }
  } catch { /* the list falls back to the full image */ }
  return '';
}
function resetLaunch() {
  if (launch.url) URL.revokeObjectURL(launch.url);
  Object.assign(launch, { file: null, bytes: null, url: null, sha: null, dims: null, done: false, result: null, checks: [] });
  for (const id of ['tk-name', 'tk-ticker', 'tk-desc', 'tk-buy']) $(id).value = '';
  $('img').value = '';
  $('img-preview').hidden = true;
  $('drop-hint').hidden = false;
  $('drop').classList.remove('has');
  imgMeta('PNG, JPG, GIF or WebP · up to 4 MB · drop or paste');
  renderLaunch();
}

const devBuy = () => Number($('tk-buy').value || 0);
function launchProblem() {
  if (CLUSTER !== 'mainnet') return 'pump.fun is mainnet only';
  if (!launch.file) return 'Add an image';
  if (!$('tk-name').value.trim()) return 'Add a name';
  if (!/^[A-Z0-9]{2,10}$/.test($('tk-ticker').value.trim())) return 'Ticker: 2–10 letters or numbers';
  if (!pad.quote && !(devBuy() >= 0 && devBuy() <= MAX_DEV_BUY)) return 'Dev buy: 0–' + MAX_DEV_BUY + ' SOL';
  return null;
}
function renderLaunch() {
  const list = visibleWallets();
  const active = state.active;
  const problem = launchProblem();
  const btn = $('launch-btn');
  btn.disabled = launch.busy;
  btn.textContent = launch.busy ? 'Launching…'
    : launch.done ? 'Launch another'
    : !active ? (list.length || !settled ? 'Connect wallet' : 'Get a wallet')
    : problem || 'Launch $' + $('tk-ticker').value.trim() + (!pad.quote && devBuy() > 0 ? ' · buy ' + devBuy() + ' SOL' : '');
  /* coins paired with the platform token: show the pairing, hide the SOL dev buy (it would need a SOL → quote swap) */
  $('launch-pair').textContent = pad.quote ? 'PAIRED WITH $' + pad.quote.symbol : 'SOL PAIR · 0 PAD FEE';
  $('tk-buy').closest('.devbuy').hidden = !!pad.quote;
  btn.classList.toggle('primary', !active || !problem || launch.done);
  $('launch-note').hidden = launch.checks.length > 0;
  const banner = $('launch-banner');
  banner.hidden = !!active || !settled || list.length > 0;
  if (!banner.hidden) banner.replaceChildren(h('div', { class: 'more' }, h('span', { text: MOBILE ? 'No wallet here. Open in:' : 'No wallet here. Get:' }),
    missingWallets(list).map(c => h('a', { class: 'chiplink', href: catalogHref(c), target: '_blank', rel: 'noopener' },
      h('span', { class: 'ph', style: '--c:' + c.color, text: c.name.slice(0, 1) }), c.name))));
  const checks = $('launch-checks');
  checks.hidden = !launch.checks.length;
  checks.replaceChildren(...launch.checks.map(c =>
    h('li', { class: c.tone === 'ok' ? 'done' : c.tone === 'bad' ? 'bad' : '' }, h('i', { class: 'check' }),
      h('span', { text: c.text }), c.href ? h('a', { class: 'chiplink', href: c.href, target: '_blank', rel: 'noopener' }, c.link || 'View ↗') : null)));
}
/* adds a check line, or updates the last one when it was still pending */
function check(tone, text, href, link) {
  const last = launch.checks[launch.checks.length - 1];
  if (last && last.tone === 'warn') launch.checks.pop();
  launch.checks.push({ tone, text, href, link });
  log(tone, 'launch · ' + text);
  renderLaunch();
}

async function api(path, { json, body, headers } = {}) {
  const res = await fetch(path, { method: 'POST', headers: json ? { 'content-type': 'application/json' } : headers, body: json ? JSON.stringify(json) : body });
  const out = await res.json().catch(() => null);
  if (!res.ok || !out) throw new Error((out && out.error) || 'HTTP ' + res.status);
  return out;
}
async function rpcCall(method, params) {
  const res = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const out = await res.json();
  if (out.error) throw new Error(out.error.message);
  return out.result;
}
/* the new token's mint keypair lives only in this page: WebCrypto Ed25519, or noble-ed25519 where the browser lacks it */
async function newKeypair() {
  try {
    const k = await crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign']);
    const publicKey = new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey));
    return { publicKey, sign: async (m) => new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, k.privateKey, m)) };
  } catch {
    const ed = await import('https://cdn.jsdelivr.net/npm/@noble/ed25519@2.1.0/+esm');
    const secret = ed.utils.randomPrivateKey();
    return { publicKey: await ed.getPublicKeyAsync(secret), sign: (m) => ed.signAsync(m, secret) };
  }
}
/* signer keys of a serialized v0 / legacy transaction (counts here stay under 128, so compact-u16 is one byte) */
function txParts(tx) {
  const sigCount = tx[0];
  const message = tx.subarray(1 + 64 * sigCount);
  const o = (message[0] & 0x80) ? 1 : 0;
  const signers = [];
  for (let i = 0; i < message[o]; i++) signers.push(b58encode(message.subarray(o + 4 + 32 * i, o + 36 + 32 * i)));
  return { sigCount, message, signers };
}
async function confirm(signature) {
  for (let i = 0; i < 50; i++) {
    const [st] = (await rpcCall('getSignatureStatuses', [[signature]])).value;
    if (st && st.err) throw new Error('failed on chain: ' + JSON.stringify(st.err));
    if (st && (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized')) return;
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error('not confirmed after 75s; check Solscan before retrying');
}

async function onLaunch(ev) {
  ev.preventDefault();
  if (launch.busy) return;
  if (launch.done) return resetLaunch();
  if (!state.active) return openMenu();
  if (launchProblem()) return renderLaunch();
  const wallet = state.active;
  const feature = wallet.kind === 'standard' && wallet.ref.features['solana:signTransaction'];
  Object.assign(launch, { busy: true, done: false, result: null, checks: [] });
  if (!feature) { launch.busy = false; return check('bad', wallet.name + ' cannot sign transactions here. Use Phantom, Solflare or Backpack.'); }
  const meta = { name: $('tk-name').value.trim(), symbol: $('tk-ticker').value.trim(), description: $('tk-desc').value.trim() };
  let signature = null;
  try {
    /* 1. image + metadata to IPFS (through our function: Pinata needs a secret) */
    check('warn', 'Uploading image and metadata to IPFS…');
    const ipfs = await api('/api/ipfs', { body: launch.bytes, headers: {
      'content-type': 'application/octet-stream', 'x-file-type': launch.file.type, 'x-meta': encodeURIComponent(JSON.stringify(meta)) } });
    if (ipfs.sha256 !== launch.sha) throw new Error('IPFS step hashed a different image');
    check('ok', 'Image and metadata on IPFS', ipfs.uri, 'JSON ↗');

    /* 2. a fresh mint, and the create transaction built by PumpPortal (checked server side) */
    check('warn', 'Building the pump.fun transaction…');
    const mintKeys = await newKeypair();
    const mint = b58encode(mintKeys.publicKey);
    const built = await api('/api/create', { json: { publicKey: wallet.account.address, mint, ...meta, uri: ipfs.uri, image: ipfs.image,
      thumb: launch.thumb, devBuy: pad.quote ? 0 : devBuy() } });
    check('ok', 'Transaction built · mint ' + shortAddr(mint) + (pad.quote ? ' · paired with $' + pad.quote.symbol : ''));

    /* 3. wallet signs first (it may add instructions), then the mint signs whatever the wallet returned */
    check('warn', 'Approve in ' + wallet.name + '…');
    log('warn', wallet.name + ' → sign launch transaction requested');
    const [out] = await feature.signTransaction({ account: wallet.account.raw, transaction: b64dec(built.tx), chain: CHAIN });
    const tx = new Uint8Array(out.signedTransaction);
    const parts = txParts(tx);
    const payerSlot = parts.signers.indexOf(wallet.account.address);
    const mintSlot = parts.signers.indexOf(mint);
    if (payerSlot < 0 || mintSlot < 0 || parts.sigCount !== parts.signers.length) throw new Error('the wallet returned a transaction with different signers');
    if (tx.subarray(1 + 64 * payerSlot, 65 + 64 * payerSlot).every(b => b === 0)) throw new Error('the wallet returned the transaction unsigned');
    tx.set(await mintKeys.sign(parts.message), 1 + 64 * mintSlot);
    check('ok', 'Signed by ' + wallet.name + ' and the new mint');

    /* 4. send and wait for confirmation */
    check('warn', 'Sending to Solana…');
    signature = await rpcCall('sendTransaction', [b64enc(tx), { encoding: 'base64', preflightCommitment: 'confirmed', maxRetries: 5 }]);
    check('warn', 'Confirming…', 'https://solscan.io/tx/' + signature, 'Tx ↗');
    await confirm(signature);
    check('ok', 'Confirmed on mainnet', 'https://solscan.io/tx/' + signature, 'Tx ↗');

    /* 5. list it: the server re-checks the transaction on chain before it goes in the list */
    const rec = await api('/api/launches', { json: { signature, mint } });
    check('ok', '$' + meta.symbol + ' is live', 'https://pump.fun/coin/' + mint, 'pump.fun ↗');
    Object.assign(launch, { done: true, result: rec.launch });
    tokens.loaded = false;
    loadTokens();
  } catch (err) {
    const text = errText(err).replace(/^Error /, '');
    check('bad', /rejected|declined|denied|cancel/i.test(text) ? 'Cancelled in wallet'
      : /no record of a prior credit|insufficient (funds|lamports)/i.test(text) ? 'Not enough SOL in ' + wallet.name + ' for this launch'
      : /blockhash not found|block height exceeded/i.test(text) ? 'Took too long to approve; launch again'
      : 'Failed: ' + text,
      signature ? 'https://solscan.io/tx/' + signature : undefined, signature ? 'Tx ↗' : undefined);
  } finally {
    launch.busy = false;
    renderWallets();
  }
}

/* debug → Sign: the earlier dry run (upload to the hashing endpoint + sign the metadata), which deploys nothing */
async function onDryRun() {
  if (launch.busy || !state.active) return;
  if (!launch.file) return log('warn', 'dry run: add an image on the launch form first');
  const wallet = state.active;
  launch.busy = true;
  try {
    const out = await api('/api/upload', { body: launch.bytes, headers: { 'content-type': 'application/octet-stream', 'x-file-type': launch.file.type } });
    if (out.sha256 !== launch.sha) throw new Error('server hash does not match the file');
    log('ok', 'dry run · upload verified ' + out.detectedType + ', ' + fmtSize(out.bytes));
    const message = new TextEncoder().encode(['Token launch dry run. Nothing is deployed and this authorizes nothing.',
      'name: ' + $('tk-name').value.trim(), 'symbol: ' + $('tk-ticker').value.trim(), 'image sha256: ' + launch.sha,
      'origin: ' + location.origin, 'nonce: ' + hex(crypto.getRandomValues(new Uint8Array(8))), 'time: ' + new Date().toISOString()].join('\n'));
    launch.dryDone = await run(wallet, 'dry run sign', () => ACTIONS[wallet.kind].signMessage(wallet, message));
  } catch (err) {
    log('bad', 'dry run failed: ' + errText(err));
  } finally {
    launch.busy = false;
    renderWallets();
  }
}

/* ---------- tokens launched through the pad ---------- */
const tokens = { list: [], next: null, total: 0, loaded: false, loading: false, error: null, market: {}, sort: 'new' };
const pad = { quote: null };   // what new coins are paired with, from /api/launches
const fmtUsd = (n) => n == null ? '—' : '$' + (n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n >= 1 ? Math.round(n) : n.toFixed(2));
const fmtPct = (n) => (n >= 0 ? '▲' : '▼') + Math.abs(n).toFixed(1) + '%';
/* market caps come from /api/market in batches of 30; sorted so identical sets hit the same CDN cache entry */
async function loadMarket(mints = tokens.list.map(l => l.mint)) {
  mints = [...new Set(mints)].sort();
  for (let i = 0; i < mints.length; i += 30) {
    try {
      const res = await fetch('/api/market?mints=' + mints.slice(i, i + 30).join(','));
      if (res.ok) Object.assign(tokens.market, (await res.json()).market);
    } catch { /* keep the last numbers */ }
  }
  renderTokens();
  if (coin.mint) renderCoinHead();
}
/* refresh numbers every 30s, only while the token list is on screen */
setInterval(() => { if (!document.hidden && !$('tab-tokens').hidden && tokens.list.length) loadMarket(); }, 30000);
/* IPFS links go through our cached gateway proxy; anything else is shown as is */
const imageSrc = (url, w) => { const m = /\/ipfs\/([A-Za-z0-9]+)/.exec(url || ''); return m ? '/api/image?cid=' + m[1] + (w ? '&w=' + w : '') : url; };
const coinImg = (l, cls) => (l.thumb || l.image)
  ? h('img', { class: cls || '', src: l.thumb || imageSrc(l.image, 64), alt: '', loading: 'lazy',
      onerror: (ev) => ev.target.replaceWith(h('span', { class: 'ph ' + (cls || ''), text: l.symbol.slice(0, 1) })) })
  : h('span', { class: 'ph ' + (cls || ''), text: l.symbol.slice(0, 1) });
const ago = (t) => {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  return s < 60 ? s + 's' : s < 3600 ? Math.round(s / 60) + 'm' : s < 86400 ? Math.round(s / 3600) + 'h' : Math.round(s / 86400) + 'd';
};
/* first page, or the next page when more = true */
async function loadTokens(more) {
  if (tokens.loading || (more && !tokens.next)) return;
  tokens.loading = true;
  renderTokens();
  try {
    const res = await fetch('/api/launches?limit=24' + (more ? '&before=' + tokens.next : ''));
    const out = await res.json();
    if (!res.ok) throw new Error(out.error || 'HTTP ' + res.status);
    const list = more ? [...tokens.list, ...out.launches.filter(l => !tokens.list.some(x => x.mint === l.mint))] : out.launches;
    Object.assign(tokens, { list, next: out.next, total: out.total, loaded: true, error: null });
    pad.quote = out.quote;
    renderLaunch();
    loadProfiles(out.launches.map(l => l.creator)).then(renderTokens);
    loadMarket(more ? out.launches.map(l => l.mint) : undefined);
  } catch (err) {
    tokens.error = errText(err);
  } finally {
    tokens.loading = false;
    renderTokens();
  }
}
function renderTokens() {
  $('token-count').textContent = tokens.loaded ? tokens.total : '';
  renderHud();
  const me = state.active && state.active.account && state.active.account.address;
  const mk = (l) => tokens.market[l.mint] || {};
  const by = { mcap: (l) => mk(l).mcap || 0, hot: (l) => mk(l).volume1h || 0 }[tokens.sort];
  const sorted = by ? [...tokens.list].sort((a, b) => by(b) - by(a)) : tokens.list;
  for (const b of document.querySelectorAll('.sort [data-sort]')) b.setAttribute('aria-pressed', String(b.dataset.sort === tokens.sort));
  const rows = sorted.map(l => h('li', {},
    h('button', { class: 'tok', title: 'Open $' + l.symbol, onclick: () => openCoin(l.mint) },
      coinImg(l),
      h('span', { class: 'tok-main' }, h('b', { text: l.name }),
        h('span', { class: 'tok-sub' }, '$' + l.symbol + ' · ' + ago(l.time),
          profiles[l.creator] ? h('span', { class: 'tok-by', text: ' · @' + profiles[l.creator].handle + ' ✓' }) : null)),
      l.creator === me ? h('span', { class: 'tag gold', text: 'YOURS' }) : null,
      h('span', { class: 'tok-mkt' }, h('b', { text: fmtUsd(mk(l).mcap) }),
        mk(l).change1h != null ? h('span', { class: mk(l).change1h >= 0 ? 'up' : 'down', text: fmtPct(mk(l).change1h) }) : null))));
  if (tokens.next) rows.push(h('li', { class: 'more-row' }, h('button', { class: 'btn sm', disabled: tokens.loading, onclick: () => loadTokens(true) },
    tokens.loading ? 'Loading…' : 'Load more')));
  $('token-list').replaceChildren(...(rows.length ? rows : [h('li', { class: 'note', style: 'padding:14px 4px;text-align:center',
    text: tokens.error ? 'Could not load: ' + tokens.error : tokens.loading ? 'Loading…' : 'Nothing launched yet. Be the first.' })]));
}

/* ---------- coin screen: chart, trades, live feed ---------- */
const coin = { mint: null, launch: null, tf: '5m', candles: [], trades: [], ws: null, live: false, loading: false, error: null };
const solUsd = (m) => (m && m.price && m.priceNative ? m.price / m.priceNative : null);
async function openCoin(mint) {
  closeLive();
  let launch = tokens.list.find(l => l.mint === mint);
  Object.assign(coin, { mint, launch, candles: [], trades: [], error: null });
  selectTab('coin');
  renderCoin();
  if (!launch) {
    try {
      const res = await fetch('/api/launches?mint=' + mint);
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'HTTP ' + res.status);
      coin.launch = launch = out.launch;
    } catch (err) { coin.error = errText(err); return renderCoin(); }
  }
  renderCoin();
  loadProfiles([launch.creator]).then(renderCoinHead);
  if (!tokens.market[mint]) await loadMarket([mint]);
  loadChart();
  openLive();
}
async function loadChart() {
  const m = tokens.market[coin.mint];
  if (!m || !m.pair) { coin.error = 'No market data yet. New coins take a minute to show up.'; return renderCoin(); }
  coin.loading = true;
  renderCoinBody();
  try {
    const res = await fetch('/api/chart?pool=' + m.pair + '&tf=' + coin.tf);
    const out = await res.json();
    if (!res.ok) throw new Error(out.error || 'HTTP ' + res.status);
    const live = coin.trades.filter(t => t.live && !out.trades.some(x => x.tx === t.tx));
    Object.assign(coin, { candles: out.candles, trades: [...live, ...out.trades].slice(0, 40), error: null });
  } catch (err) {
    coin.error = errText(err);
  } finally {
    coin.loading = false;
    renderCoinBody();
  }
}
/* PumpPortal's free websocket pushes every trade of this coin as it lands */
function openLive() {
  try {
    const ws = new WebSocket('wss://pumpportal.fun/api/data');
    coin.ws = ws;
    ws.onopen = () => { ws.send(JSON.stringify({ method: 'subscribeTokenTrade', keys: [coin.mint] })); coin.live = true; renderCoinHead(); };
    ws.onclose = () => { if (coin.ws === ws) { coin.live = false; renderCoinHead(); } };
    ws.onmessage = (ev) => {
      let t;
      try { t = JSON.parse(ev.data); } catch { return; }
      if (!t || t.mint !== coin.mint || (t.txType !== 'buy' && t.txType !== 'sell')) return;
      const m = tokens.market[coin.mint] || {};
      const usdPerSol = solUsd(m);
      if (usdPerSol && t.marketCapSol) tokens.market[coin.mint] = { ...m, mcap: t.marketCapSol * usdPerSol };
      coin.trades.unshift({ kind: t.txType, usd: usdPerSol && t.solAmount ? t.solAmount * usdPerSol : null, sol: t.solAmount,
        wallet: t.traderPublicKey, time: Date.now(), tx: t.signature, live: true });
      coin.trades.length = Math.min(coin.trades.length, 40);
      renderCoinHead();
      renderTrades();
    };
  } catch { /* live feed is a bonus; the polled trades still show */ }
}
function closeLive() {
  if (coin.ws) { const ws = coin.ws; coin.ws = null; try { ws.close(); } catch { /* already closed */ } }
  coin.live = false;
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) closeLive();
  else if (coin.mint && !$('tab-coin').hidden && !coin.ws) { openLive(); loadChart(); }
});
/* refresh candles every 20s while the coin screen is open (trades keep coming over the websocket) */
setInterval(() => { if (!document.hidden && coin.mint && !$('tab-coin').hidden) loadChart(); }, 20000);

/* full-size coin image in a modal; focus comes back to whatever opened it */
let lightboxReturn = null;
function openImage(l, from) {
  if (!l.image && !l.thumb) return;
  lightboxReturn = from || document.activeElement;
  const img = $('lightbox-img');
  $('lightbox-title').textContent = l.name;
  $('lightbox-sub').textContent = '$' + l.symbol + ' · ' + shortAddr(l.mint);
  $('lightbox-note').hidden = false;
  $('lightbox-note').textContent = 'Loading…';
  img.hidden = true;
  img.alt = l.name + ' token image';
  img.onload = () => { img.hidden = false; $('lightbox-note').hidden = true; };
  img.onerror = () => { $('lightbox-note').textContent = 'Image unavailable right now.'; };
  img.src = l.image ? imageSrc(l.image, 256) : l.thumb;
  $('lightbox-open').href = 'https://pump.fun/coin/' + l.mint;
  $('lightbox').hidden = false;
  $('lightbox-close').focus();
}
function closeImage() {
  if ($('lightbox').hidden) return false;
  $('lightbox').hidden = true;
  $('lightbox-img').removeAttribute('src');
  /* the coin header re-renders on live updates, so the button that opened the modal may have been replaced */
  const back = lightboxReturn && lightboxReturn.isConnected ? lightboxReturn : document.querySelector('#coin-head .coin-img-btn');
  if (back) back.focus();
  return true;
}
function renderCoin() { renderCoinHead(); renderCoinBody(); }
function renderCoinHead() {
  const l = coin.launch;
  const m = tokens.market[coin.mint] || {};
  const shareUrl = location.origin + '/c/' + coin.mint;
  $('coin-head').replaceChildren(...(!l ? [h('span', { class: 'note', text: coin.error || 'Loading…' })] : [
    h('button', { class: 'coin-img-btn', title: 'View image', 'aria-label': 'View ' + l.name + ' image', onclick: (ev) => openImage(l, ev.currentTarget) },
      coinImg(l, 'coin-img'), h('span', { class: 'zoom', 'aria-hidden': 'true', text: '+' })),
    h('div', { class: 'coin-title' },
      h('div', { class: 'coin-name' }, h('b', { text: l.symbol }), h('span', { text: l.name })),
      h('div', { class: 'coin-meta' },
        h('span', { text: ago(l.time) }),
        h('button', { class: 'ca', title: 'Copy contract address', 'aria-label': 'Copy contract address ' + l.mint, onclick: () => copyText(l.mint, 'contract address') },
          shortAddr(l.mint), h('span', { class: 'copy-ico', 'aria-hidden': 'true', text: '⧉' })),
        l.quote ? h('span', { class: 'pair', title: 'Paired with $' + l.quote.symbol, text: '⇄ $' + l.quote.symbol }) : null,
        profiles[l.creator] ? h('span', { class: 'by' }, 'by ', handleLink(profiles[l.creator])) : null)),
    h('div', { class: 'tok-mkt' }, h('b', { text: fmtUsd(m.mcap) }),
      m.change1h != null ? h('span', { class: m.change1h >= 0 ? 'up' : 'down', text: fmtPct(m.change1h) + ' 1h' }) : null),
  ]));
  $('coin-links').replaceChildren(...(!l ? [] : [
    h('span', { class: 'live' + (coin.live ? ' on' : ''), title: coin.live ? 'Live trades connected' : 'Live trades offline' }, coin.live ? 'LIVE' : 'OFFLINE'),
    h('a', { class: 'chiplink', href: 'https://pump.fun/coin/' + coin.mint, target: '_blank', rel: 'noopener' }, 'Trade on pump.fun ↗'),
    h('a', { class: 'chiplink', href: 'https://x.com/intent/post?text=' + encodeURIComponent('$' + l.symbol + ' launched on Tweetpad') + '&url=' + encodeURIComponent(shareUrl),
      target: '_blank', rel: 'noopener' }, 'Share ↗'),
    h('button', { class: 'chiplink', onclick: async () => {
      try { await navigator.clipboard.writeText(shareUrl); log('ok', 'coin link copied'); } catch { log('warn', 'clipboard blocked: ' + shareUrl); }
    } }, 'Copy link'),
  ]));
}
function renderCoinBody() {
  for (const b of document.querySelectorAll('.tf [data-tf]')) b.setAttribute('aria-pressed', String(b.dataset.tf === coin.tf));
  drawChart();
  renderTrades();
}
function renderTrades() {
  const rows = coin.trades.map(t => h('li', { class: t.kind },
    h('span', { class: 'kind', text: t.kind === 'buy' ? 'BUY' : 'SELL' }),
    h('span', { class: 'amt', text: t.usd != null ? fmtUsd(t.usd) : (t.sol != null ? t.sol.toFixed(3) + ' SOL' : '—') }),
    h('a', { class: 'who', href: 'https://solscan.io/tx/' + t.tx, target: '_blank', rel: 'noopener', text: shortAddr(t.wallet || '????????') }),
    h('span', { class: 'when', text: ago(t.time) })));
  $('coin-trades').replaceChildren(...(rows.length ? rows : [h('li', { class: 'note', text: coin.error || (coin.loading ? 'Loading trades…' : 'No trades yet.') })]));
}
/* blocky candles on a canvas, drawn at device pixels so they stay crisp */
function drawChart() {
  const canvas = $('coin-chart');
  const w = canvas.clientWidth, hgt = canvas.clientHeight, dpr = Math.max(1, Math.round(devicePixelRatio || 1));
  if (!w || !hgt) return;
  canvas.width = w * dpr; canvas.height = hgt * dpr;
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, hgt);
  /* pump.fun coins have a fixed 1B supply, so the chart reads in market cap, which is how people talk about them */
  const SUPPLY = 1e9;
  const cs = coin.candles.slice(-Math.max(10, Math.floor(w / 5))).map(c => [c[0], c[1] * SUPPLY, c[2] * SUPPLY, c[3] * SUPPLY, c[4] * SUPPLY]);
  if (cs.length < 2) {
    g.fillStyle = '#a6bcbf'; g.font = '16px VT323, monospace'; g.textAlign = 'center';
    g.fillText(coin.loading ? 'Loading chart…' : coin.error ? 'No chart yet' : 'Not enough trades for a chart', w / 2, hgt / 2);
    return;
  }
  const inset = 14, axis = 46;
  const hi = Math.max(...cs.map(c => c[2])), lo = Math.min(...cs.map(c => c[3]));
  const span = hi - lo || hi || 1;
  const y = (v) => Math.round(inset + (hgt - inset * 2) * (1 - (v - lo) / span));
  /* candles keep a sane width when there are only a few, and stay right-aligned like a live chart */
  const step = Math.min(9, (w - axis) / cs.length), bw = Math.max(1, Math.floor(step) - 1);
  const x0 = (w - axis) - step * cs.length;
  g.fillStyle = 'rgba(140, 200, 210, .12)';
  for (let i = 0; i <= 3; i++) g.fillRect(0, Math.round(inset + (hgt - inset * 2) * i / 3), w - axis + 2, 1);
  cs.forEach((c, i) => {
    const x = Math.round(x0 + i * step), up = c[4] >= c[1];
    g.fillStyle = up ? '#7dff9a' : '#ff6b6b';
    g.fillRect(x + Math.floor(bw / 2), y(c[2]), 1, Math.max(1, y(c[3]) - y(c[2])));
    const top = y(Math.max(c[1], c[4])), bot = y(Math.min(c[1], c[4]));
    g.fillRect(x, top, bw, Math.max(2, bot - top));
  });
  g.fillStyle = '#a6bcbf'; g.font = '14px VT323, monospace'; g.textAlign = 'left';
  g.fillText(fmtUsd(hi), w - axis + 6, inset + 4);
  g.fillText(fmtUsd(lo), w - axis + 6, hgt - inset + 4);
  const last = cs[cs.length - 1][4];
  g.fillStyle = '#e8b64c'; g.fillRect(w - axis, y(last), 4, 1);
  g.fillText(fmtUsd(last), w - axis + 6, Math.min(hgt - inset - 10, Math.max(inset + 16, y(last) + 4)));
}
addEventListener('resize', () => { if (coin.mint && !$('tab-coin').hidden) drawChart(); });
let settled = false;
function setVerdict(tone, title, text, sub) {
  const toast = $('verdict');
  $('verdict-title').textContent = title;
  $('verdict-text').replaceChildren(text, sub ? h('small', { text: sub }) : '');
  /* same headline: refresh the text quietly instead of popping the toast again */
  if (toast.dataset.key === tone + title) return;
  toast.dataset.key = tone + title;
  toast.classList.remove('ok', 'bad', 'warn', 'gone');
  toast.classList.add(tone);
  clearTimeout(setVerdict.hide);
  setVerdict.hide = setTimeout(() => toast.classList.add('gone'), 4000);
}
function renderWallets() {
  const list = visibleWallets();
  const active = state.active;
  const where = 'in this ' + (state.env.context === 'top-level' ? 'page' : state.env.context || 'context');
  if (active && launch.done && launch.result) {
    setVerdict('ok', 'Token launched!', '$' + launch.result.symbol + ' is live on pump.fun');
  } else if (active) {
    setVerdict('ok', 'Connected!', active.name + ' · ' + shortAddr(active.account.address));
  } else if (list.length) {
    setVerdict('ok', 'Wallet found!', list.length + ' Solana wallet' + (list.length > 1 ? 's' : '') + ' ' + where);
  } else if (settled) {
    setVerdict('bad', 'No wallet spawned', 'No Solana wallet ' + where);
  }
  $('tab-sign').replaceChildren(signPanel(active));
  renderLaunch();
  renderTrigger();
  if (!$('wc-menu').hidden) renderMenu();
  renderHud();
  renderReport();
}
/* chat lines fade out after a few seconds; the full log lives in Debug → Report */
function renderEnv() {
  const rows = [];
  const add = (k, v) => rows.push(h('tr', {}, h('td', { text: k }), h('td', { text: typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v) })));
  for (const [k, v] of Object.entries(state.env)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k2, v2] of Object.entries(v)) add(k2, v2);
    else add(k, v);
  }
  $('env-table').replaceChildren(...rows);
}
function renderReport() {
  $('report').value = JSON.stringify({
    env: state.env,
    active: state.active ? state.active.name : null,
    wallets: state.wallets.map(w => ({ name: w.name, source: w.source, solana: w.solana, chains: w.chains, features: w.features,
      account: w.account ? w.account.address : null, status: w.status })),
    events: state.events,
  }, null, 2);
}

/* inventory: the coins you launched first, then the newest launches; 1-9 or a click opens the coin */
function inventory() {
  const me = state.active && state.active.account && state.active.account.address;
  const mine = me ? tokens.list.filter(l => l.creator === me) : [];
  return [...mine, ...tokens.list.filter(l => !mine.includes(l))].slice(0, 9);
}
function renderHud() {
  const items = inventory();
  const open = coin.mint && !$('tab-coin').hidden ? coin.mint : null;
  const slots = [];
  for (let n = 1; n <= 9; n++) {
    const l = items[n - 1];
    const m = l && tokens.market[l.mint];
    slots.push(l
      ? h('button', { class: 'slot', title: n + ': $' + l.symbol + (m && m.mcap ? ' · ' + fmtUsd(m.mcap) : ''), 'aria-label': 'Slot ' + n + ': ' + l.name,
                      'aria-pressed': String(l.mint === open), onclick: () => openCoin(l.mint) },
          coinImg(l), h('span', { class: 'dot' + (m && m.change1h != null ? (m.change1h >= 0 ? ' ok' : ' bad') : '') }), h('span', { class: 'n', text: n }))
      : h('button', { class: 'slot', disabled: true, 'aria-label': 'Empty slot ' + n }));
  }
  $('hotbar').replaceChildren(...slots);
}
function selectSlot(n) {
  const l = inventory()[n - 1];
  if (l) openCoin(l.mint);
}
/* ---------- profiles: wallet ↔ X account, launched coins, creator rewards ---------- */
const me = { wallet: null, profile: null, rewards: null, coins: [], loading: false, claiming: false, status: null };
const profiles = {};   // wallet → profile (or null), for creators shown on coin screens
const avatarOf = (p, wallet, cls) => p && p.avatar
  ? h('img', { class: 'avatar ' + (cls || ''), src: p.avatar, alt: '', referrerpolicy: 'no-referrer', onerror: (ev) => ev.target.replaceWith(avatarOf(null, wallet, cls)) })
  : h('img', { class: 'avatar pixel ' + (cls || ''), src: pixelAvatar(wallet || '?'), alt: '' });
const handleLink = (p) => h('a', { class: 'handle', href: p.tweet || 'https://x.com/' + p.handle, target: '_blank', rel: 'noopener', title: 'Verified on X' },
  '@' + p.handle, h('span', { class: 'check-badge', 'aria-label': 'verified', text: '✓' }));
async function copyText(text, label) {
  try { await navigator.clipboard.writeText(text); log('ok', (label || 'text') + ' copied'); setVerdict('ok', 'Copied!', label || text); }
  catch { log('warn', 'clipboard blocked in this frame: ' + text); }
}
const copyBtn = (text, label) => h('button', { class: 'copy', title: 'Copy ' + (label || ''), 'aria-label': 'Copy ' + (label || ''), onclick: (ev) => { ev.stopPropagation(); copyText(text, label); } }, '⧉');

async function loadProfiles(wallets) {
  const need = [...new Set(wallets)].filter(w => w && !(w in profiles));
  for (let i = 0; i < need.length; i += 50) {
    try {
      const res = await fetch('/api/profile?wallets=' + need.slice(i, i + 50).sort().join(','));
      if (res.ok) Object.assign(profiles, (await res.json()).profiles);
    } catch { /* names are a bonus */ }
  }
}
/* everything the profile screen and wallet menu show for the connected wallet */
async function loadMe() {
  const wallet = state.active && state.active.account && state.active.account.address;
  if (!wallet) { Object.assign(me, { wallet: null, profile: null, rewards: null, coins: [] }); return renderProfile(); }
  if (me.wallet !== wallet) Object.assign(me, { wallet, profile: null, rewards: null, coins: [], status: null });
  me.loading = true;
  renderProfile();
  const [p, r, c] = await Promise.all([
    fetch('/api/profile?wallet=' + wallet + '&fresh=1').then(x => x.json()).catch(() => null),
    fetch('/api/rewards?wallet=' + wallet).then(x => x.json()).catch(() => null),
    fetch('/api/launches?creator=' + wallet).then(x => x.json()).catch(() => null),
  ]);
  if (me.wallet !== wallet) return;
  me.profile = p && p.profiles ? p.profiles[wallet] : null;
  profiles[wallet] = me.profile;
  me.rewards = r && !r.error ? r : null;
  me.coins = c && c.launches ? c.launches : [];
  me.loading = false;
  if (me.coins.length) loadMarket(me.coins.map(l => l.mint));
  renderProfile();
  if (!$('wc-menu').hidden) renderMenu();
}

/* raw signature over a message, from either wallet API */
async function signRaw(wallet, bytes) {
  if (wallet.kind === 'standard') {
    const f = wallet.ref.features['solana:signMessage'];
    if (!f) throw new Error(wallet.name + ' cannot sign messages');
    const [out] = await f.signMessage({ account: wallet.account.raw, message: bytes });
    return new Uint8Array(out.signature);
  }
  const out = await wallet.ref.signMessage(bytes, 'utf8');
  return new Uint8Array(out.signature || out);
}

/* claim: the server builds the collect transaction, the wallet signs, we send and confirm */
async function claimRewards() {
  const wallet = state.active;
  if (!wallet || me.claiming) return;
  const feature = wallet.kind === 'standard' && wallet.ref.features['solana:signTransaction'];
  if (!feature) return setStatus('bad', wallet.name + ' cannot sign transactions here. Use Phantom, Solflare or Backpack.');
  me.claiming = true;
  setStatus('warn', 'Approve the claim in ' + wallet.name + '…');
  try {
    const built = await api('/api/rewards', { json: { wallet: wallet.account.address } });
    const [out] = await feature.signTransaction({ account: wallet.account.raw, transaction: b64dec(built.tx), chain: CHAIN });
    setStatus('warn', 'Sending claim…');
    const sig = await rpcCall('sendTransaction', [b64enc(new Uint8Array(out.signedTransaction)), { encoding: 'base64', preflightCommitment: 'confirmed', maxRetries: 5 }]);
    await confirm(sig);
    setStatus('ok', 'Rewards claimed to your wallet', 'https://solscan.io/tx/' + sig);
    setVerdict('ok', 'Rewards claimed!', 'Creator fees sent to ' + shortAddr(wallet.account.address));
  } catch (err) {
    const text = errText(err).replace(/^Error /, '');
    setStatus('bad', /rejected|declined|denied|cancel/i.test(text) ? 'Claim cancelled in wallet' : 'Claim failed: ' + text);
  } finally {
    me.claiming = false;
    loadMe();
  }
}
function setStatus(tone, text, href) {
  me.status = { tone, text, href };
  log(tone, 'profile · ' + text);
  renderProfile();
}

function rewardsBox(compact) {
  const r = me.rewards;
  const parts = r ? [r.sol > 0 || !r.quotes.some(q => q.amount > 0) ? r.sol.toFixed(4) + ' SOL' : null,
    ...r.quotes.filter(q => q.amount > 0).map(q => q.amount.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' $' + q.symbol)].filter(Boolean) : [];
  const has = r && (r.sol > 0 || r.quotes.some(q => q.amount > 0));
  return h('div', { class: 'rewards' + (compact ? ' compact' : '') },
    h('span', { class: 'rewards-label', text: 'Creator rewards' }),
    h('b', { text: r ? parts.join(' + ') : me.loading ? '…' : '—' }),
    h('button', { class: 'btn sm' + (has ? ' primary' : ''), disabled: !has || me.claiming, onclick: claimRewards }, me.claiming ? 'Claiming…' : 'Claim'));
}
function profileCard() {
  const w = me.wallet || (state.active && state.active.account && state.active.account.address), p = me.wallet === w ? me.profile : null;
  return h('div', { class: 'who' },
    avatarOf(p, w, 'lg'),
    h('div', { class: 'who-main' },
      h('b', { class: 'who-name', text: p ? p.name : 'Anonymous' }),
      p ? handleLink(p) : h('button', { class: 'btn sm verify-btn', onclick: openVerify }, 'Verify with X'),
      h('span', { class: 'who-addr' }, shortAddr(w), copyBtn(w, 'wallet address'),
        h('a', { class: 'ext', href: 'https://solscan.io/account/' + w, target: '_blank', rel: 'noopener', title: 'View on Solscan' }, '↗'))));
}
function renderProfile() {
  const root = $('tab-profile');
  if (!root) return;
  if (!me.wallet) {
    root.replaceChildren(h('div', { class: 'pane panel profile' }, h('div', { class: 'launch-head' }, h('span', { text: 'Profile' })),
      h('p', { class: 'note', text: 'Connect a wallet to see your profile, your coins and your creator rewards.' }),
      h('button', { class: 'btn primary', onclick: openMenu }, 'Connect wallet')));
    return;
  }
  const mk = (l) => tokens.market[l.mint] || {};
  root.replaceChildren(h('div', { class: 'pane panel profile' },
    h('div', { class: 'launch-head' }, h('span', { text: 'Profile' }), me.profile ? h('span', { class: 'tag', text: 'VERIFIED' }) : h('span', { class: 'tag dim', text: 'UNVERIFIED' })),
    profileCard(),
    rewardsBox(),
    me.status ? h('div', { class: 'status ' + me.status.tone }, me.status.text,
      me.status.href ? h('a', { class: 'chiplink', style: 'margin-left:6px', href: me.status.href, target: '_blank', rel: 'noopener' }, 'Tx ↗') : null) : null,
    h('div', { class: 'menu-sec', text: 'Your coins · ' + me.coins.length }),
    h('ul', { class: 'token-list' }, ...(me.coins.length ? me.coins.map(l => h('li', {},
      h('button', { class: 'tok', onclick: () => openCoin(l.mint) }, coinImg(l),
        h('span', { class: 'tok-main' }, h('b', { text: l.name }), h('span', { class: 'tok-sub', text: '$' + l.symbol + ' · ' + ago(l.time) })),
        h('span', { class: 'tok-mkt' }, h('b', { text: fmtUsd(mk(l).mcap) }),
          mk(l).change1h != null ? h('span', { class: mk(l).change1h >= 0 ? 'up' : 'down', text: fmtPct(mk(l).change1h) }) : null))))
      : [h('li', { class: 'note', style: 'padding:10px 2px' }, me.loading ? 'Loading…' : 'No coins yet. ',
          me.loading ? null : h('button', { class: 'linkish', onclick: () => selectTab('wallets') }, 'Launch one')) ]))));
}

/* ---------- verify with X: tweet a one-time code, paste the link, sign with the wallet ---------- */
const verify = { code: null, message: null, busy: false, status: null };
const verifyTweetText = () => 'Verifying my profile on Tweetpad ' + verify.code + ' ' + location.origin;
async function openVerify() {
  if (!state.active) return openMenu();
  closeMenu();
  Object.assign(verify, { code: null, message: null, busy: false, status: null });
  $('verify').hidden = false;
  $('verify-link').value = '';
  renderVerify();
  $('verify-close').focus();
  try {
    const out = await api('/api/profile', { json: { action: 'start', wallet: state.active.account.address } });
    Object.assign(verify, { code: out.code, message: out.message });
  } catch (err) { verify.status = { tone: 'bad', text: 'Could not start: ' + errText(err) }; }
  renderVerify();
}
function closeVerify() {
  if ($('verify').hidden) return false;
  $('verify').hidden = true;
  return true;
}
function renderVerify() {
  $('verify-code').textContent = verify.code || '…';
  $('verify-tweet').textContent = verify.code ? verifyTweetText() : 'Getting your code…';
  $('verify-post').href = verify.code ? 'https://x.com/intent/post?text=' + encodeURIComponent(verifyTweetText()) : '#';
  $('verify-post').classList.toggle('disabled', !verify.code);
  $('verify-go').disabled = !verify.code || verify.busy;
  $('verify-go').textContent = verify.busy ? 'Checking…' : 'Verify';
  const st = $('verify-status');
  st.className = 'status ' + (verify.status ? verify.status.tone : '');
  st.textContent = verify.status ? verify.status.text : 'Post the tweet, paste its link here, then sign with your wallet.';
}
async function submitVerify() {
  const wallet = state.active;
  if (!wallet || !verify.code || verify.busy) return;
  const link = $('verify-link').value.trim();
  if (!/\/status\/\d+/.test(link)) { verify.status = { tone: 'bad', text: 'Paste the link to your tweet (x.com/you/status/…)' }; return renderVerify(); }
  verify.busy = true;
  verify.status = { tone: 'warn', text: 'Sign the message in ' + wallet.name + '…' };
  renderVerify();
  try {
    const sig = await signRaw(wallet, new TextEncoder().encode(verify.message));
    verify.status = { tone: 'warn', text: 'Reading your tweet…' };
    renderVerify();
    const out = await api('/api/profile', { json: { action: 'verify', wallet: wallet.account.address, tweet: link, signature: b58encode(sig) } });
    me.profile = profiles[out.profile.wallet] = out.profile;
    verify.status = { tone: 'ok', text: 'Verified as @' + out.profile.handle + ' ✓' };
    setVerdict('ok', 'Profile verified!', '@' + out.profile.handle + ' is linked to ' + shortAddr(wallet.account.address));
    renderProfile();
    setTimeout(closeVerify, 1400);
  } catch (err) {
    const text = errText(err).replace(/^Error /, '');
    verify.status = { tone: 'bad', text: /rejected|declined|denied|cancel/i.test(text) ? 'Cancelled in wallet' : text };
  } finally {
    verify.busy = false;
    renderVerify();
  }
}

/* ---------- pixel avatars: an 8×8 head drawn from the wallet address, the same every time ---------- */
const avatarCache = new Map();
const shade = (hexColor, amt) => '#' + hexColor.slice(1).match(/../g)
  .map(c => Math.max(0, Math.min(255, parseInt(c, 16) + amt)).toString(16).padStart(2, '0')).join('');
function pixelAvatar(seed) {
  if (avatarCache.has(seed)) return avatarCache.get(seed);
  let x = 2166136261;
  for (const ch of String(seed)) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); }
  const rand = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const skin = pick(['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#6dbf6a', '#9ad1ff', '#b8a1e6']);
  const hair = pick(['#2b1b0e', '#4a2f1b', '#7a4a1e', '#d9a441', '#c94f2b', '#222222', '#e8e8e8', '#6fe7d8', '#ff74e6']);
  const eye = pick(['#3b6fd8', '#2e8b57', '#5a3a1a', '#111111', '#8a2be2', '#e8b64c']);
  const style = Math.floor(rand() * 4);
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const g = c.getContext('2d');
  const px = (qx, qy, col) => { g.fillStyle = col; g.fillRect(qx, qy, 1, 1); };
  g.fillStyle = skin; g.fillRect(0, 0, 8, 8);
  for (let py = 2; py < 8; py++) for (let qx = 0; qx < 8; qx++) if (rand() < .14) px(qx, py, shade(skin, -16));
  g.fillStyle = hair; g.fillRect(0, 0, 8, 2);
  if (style === 1) { g.fillRect(0, 2, 1, 2); g.fillRect(7, 2, 1, 2); }            // short sides
  if (style === 2) { g.fillRect(0, 2, 8, 1); px(3, 2, skin); px(4, 2, skin); }    // fringe
  if (style === 3) { g.fillRect(0, 2, 1, 6); g.fillRect(7, 2, 1, 6); }            // long
  px(1, 4, '#ffffff'); px(2, 4, eye); px(5, 4, eye); px(6, 4, '#ffffff');        // eyes
  px(3, 5, shade(skin, -40)); px(4, 5, shade(skin, -40));                         // nose
  g.fillStyle = shade(skin, -70); g.fillRect(2, 6, 4, 1);                         // mouth
  if (rand() < .3) { g.fillStyle = hair; g.fillRect(1, 6, 1, 2); g.fillRect(6, 6, 1, 2); g.fillRect(2, 7, 4, 1); } // beard
  const url = c.toDataURL();
  avatarCache.set(seed, url);
  return url;
}

/* ---------- live chat: a lobby plus one room per coin, polled every 3s (the CDN holds each room for 2s) ---------- */
const chat = { rooms: {}, open: false, sending: false, error: null, tokens: {}, freshUntil: 0 };
const chatRoom = () => (mainView === 'coin' && coin.mint ? coin.mint : 'lobby');
const chatRoomLabel = () => (chatRoom() === 'lobby' ? '#lobby' : '#$' + ((coin.launch && coin.launch.symbol) || 'coin'));
const chatName = (m) => (m.handle ? '@' + m.handle : shortAddr(m.wallet));
async function loadChat() {
  const room = chatRoom();
  try {
    const res = await fetch('/api/chat?room=' + room);
    const out = await res.json();
    if (!res.ok) throw new Error(out.error || 'HTTP ' + res.status);
    const before = chat.rooms[room];
    chat.rooms[room] = out.messages;
    /* new lines float up for a few seconds, like in-game chat */
    if (before && out.messages.some(m => !before.some(b => b.id === m.id))) chat.freshUntil = Date.now() + 10000;
    chat.error = null;
  } catch (err) { chat.error = errText(err); }
  renderChat();
}
setInterval(() => { if (!document.hidden) loadChat(); }, 3000);
setInterval(() => { if (!chat.open) renderChat(); }, 2000);

function renderChat() {
  const messages = chat.rooms[chatRoom()] || [];
  const lines = chat.open ? messages : (Date.now() < chat.freshUntil ? messages.slice(-3) : []);
  const me = state.active && state.active.account && state.active.account.address;
  $('feed-lines').classList.toggle('open', chat.open);
  $('feed-lines').replaceChildren(...lines.map(m => h('li', { class: m.wallet === me ? 'mine' : '' },
    h('img', { class: 'chat-ava', src: m.avatar || pixelAvatar(m.wallet), alt: '', referrerpolicy: 'no-referrer',
      onerror: (ev) => { ev.target.src = pixelAvatar(m.wallet); } }),
    h('b', { class: m.handle ? 'verified' : '', text: chatName(m) + (m.handle ? ' ✓' : '') }),
    h('span', { text: m.text }))));
  if (chat.open && !lines.length) $('feed-lines').append(h('li', { class: 'note' }, chat.error ? 'Chat is offline: ' + chat.error : 'No messages in ' + chatRoomLabel() + ' yet. Say gm.'));
  if (chat.open) $('feed-lines').scrollTop = $('feed-lines').scrollHeight;
  $('chat-room').textContent = chatRoomLabel();
  $('chat-send').disabled = chat.sending;
  $('chat-input').placeholder = state.active ? (chat.error && chat.open ? chat.error : 'Say something… (Enter to send)') : 'Connect a wallet to chat';
}
function openChat() {
  chat.open = true;
  $('chatbar').hidden = false;
  renderChat();
  loadChat();
  $('chat-input').focus();
}
function closeChat() {
  if (!chat.open) return false;
  chat.open = false;
  $('chatbar').hidden = true;
  $('chat-input').blur();
  renderChat();
  return true;
}
/* the first message signs a free chat session; the token lives in memory (storage is blocked in X's sandbox) */
async function chatSession(wallet) {
  const address = wallet.account.address;
  if (chat.tokens[address] && chat.tokens[address].expires > Date.now() + 60000) return chat.tokens[address].token;
  const issued = Date.now();
  const message = 'Tweetpad chat\nSign in to chat as this wallet. This is free and sends no transaction.\nwallet: ' + address + '\nissued: ' + issued;
  const sig = await signRaw(wallet, new TextEncoder().encode(message));
  const out = await api('/api/chat', { json: { action: 'session', wallet: address, issued, signature: b58encode(sig) } });
  chat.tokens[address] = { token: out.token, expires: out.expires };
  return out.token;
}
async function sendChat() {
  const text = $('chat-input').value.trim();
  if (!text || chat.sending) return;
  const wallet = state.active;
  if (!wallet) { closeChat(); return openMenu(); }
  chat.sending = true;
  renderChat();
  try {
    let token = await chatSession(wallet);
    let out;
    try { out = await api('/api/chat', { json: { action: 'send', token, room: chatRoom(), text } }); }
    catch (err) {
      if (!/session expired/.test(err.message)) throw err;
      delete chat.tokens[wallet.account.address];
      token = await chatSession(wallet);
      out = await api('/api/chat', { json: { action: 'send', token, room: chatRoom(), text } });
    }
    const room = chatRoom();
    chat.rooms[room] = [...(chat.rooms[room] || []).filter(m => m.id !== out.message.id), out.message];
    $('chat-input').value = '';
    chat.error = null;
    chat.freshUntil = Date.now() + 10000;
  } catch (err) {
    const msg = errText(err).replace(/^Error /, '');
    chat.error = /rejected|declined|denied|cancel/i.test(msg) ? 'Sign-in cancelled' : msg;
    setVerdict('bad', 'Chat', chat.error);
  } finally {
    chat.sending = false;
    renderChat();
    $('chat-input').focus();
  }
}

/* ---------- wiring ---------- */
/* main views: 'wallets' (the launch form) and 'tokens'; sign / env / report / fallbacks live inside the debug panel */
const MAIN_VIEWS = ['wallets', 'tokens', 'coin', 'profile'];
let debugTab = 'sign';
let mainView = 'wallets';
function selectTab(name) {
  const debug = !MAIN_VIEWS.includes(name);
  for (const v of MAIN_VIEWS) $('tab-' + v).hidden = debug || v !== name;
  for (const t of document.querySelectorAll('.views [role="tab"]')) t.setAttribute('aria-selected', String(!debug && t.dataset.view === (name === 'coin' ? 'tokens' : name)));
  if (!debug) mainView = name;
  if (name !== 'coin') closeLive();
  if (name === 'tokens' && !tokens.loaded) loadTokens();
  if (name === 'coin') requestAnimationFrame(drawChart);
  if (name === 'profile') loadMe();
  if (MAIN_VIEWS.includes(name)) loadChat();
  renderHud();
  $('debug').hidden = !debug;
  $('btn-debug').setAttribute('aria-pressed', String(debug));
  document.body.classList.toggle('debugging', debug);
  if (!debug) return;
  debugTab = name;
  for (const t of document.querySelectorAll('.subnav [role="tab"]')) t.setAttribute('aria-selected', String(t.dataset.tab === name));
  for (const s of $('debug').querySelectorAll(':scope > section')) s.hidden = s.id !== 'tab-' + name;
}
for (const tab of document.querySelectorAll('.subnav [role="tab"]')) tab.addEventListener('click', () => selectTab(tab.dataset.tab));
const toggleDebug = () => selectTab($('debug').hidden ? debugTab : mainView);
for (const tab of document.querySelectorAll('.views [role="tab"]')) tab.addEventListener('click', () => selectTab(tab.dataset.view));
$('tokens-refresh').addEventListener('click', () => loadTokens());
$('coin-back').addEventListener('click', () => selectTab('tokens'));
for (const b of document.querySelectorAll('.tf [data-tf]')) b.addEventListener('click', () => { coin.tf = b.dataset.tf; loadChart(); });
for (const b of document.querySelectorAll('.sort [data-sort]')) b.addEventListener('click', () => { tokens.sort = b.dataset.sort; renderTokens(); });
const toggleFeed = () => { $('feed-lines').hidden = !$('feed-lines').hidden; };
$('btn-debug').addEventListener('click', toggleDebug);
$('lightbox-close').addEventListener('click', closeImage);
$('btn-chat').addEventListener('click', () => (chat.open ? closeChat() : openChat()));
$('chat-send').addEventListener('click', sendChat);
$('chat-close').addEventListener('click', closeChat);
$('chat-input').addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') { ev.preventDefault(); sendChat(); }
  else if (ev.key === 'Escape') { ev.preventDefault(); closeChat(); }
});
$('verify-close').addEventListener('click', closeVerify);
$('verify').addEventListener('click', (ev) => { if (ev.target === $('verify')) closeVerify(); });
$('verify-go').addEventListener('click', submitVerify);
$('verify-link').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') submitVerify(); });
$('verify-copy').addEventListener('click', () => verify.code && copyText(verifyTweetText(), 'tweet text'));
$('verify-post').addEventListener('click', (ev) => { if (!verify.code) ev.preventDefault(); });
$('lightbox').addEventListener('click', (ev) => { if (ev.target === $('lightbox')) closeImage(); });
/* keep Tab inside the open modal */
$('lightbox').addEventListener('keydown', (ev) => {
  if (ev.key !== 'Tab') return;
  const items = [...$('lightbox').querySelectorAll('button, a[href]:not([hidden])')];
  const i = items.indexOf(document.activeElement);
  if (ev.shiftKey && i <= 0) { ev.preventDefault(); items[items.length - 1].focus(); }
  else if (!ev.shiftKey && i === items.length - 1) { ev.preventDefault(); items[0].focus(); }
});
$('btn-home').addEventListener('click', () => { closeMenu(); selectTab('wallets'); });
$('btn-debug-close').addEventListener('click', () => selectTab(mainView));
$('wc-btn').addEventListener('click', toggleMenu);
document.addEventListener('pointerdown', (ev) => { if (!ev.target.closest('.wc')) closeMenu(); });
$('verdict').addEventListener('click', () => { clearTimeout(setVerdict.hide); $('verdict').classList.add('gone'); });
/* game-style hotkeys: Enter chat, C wallet menu, L launch, T tokens, P profile, D debug, S/E/R/B debug tabs, 1-9 inventory, H feed, Esc goes back */
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') {
    if (closeImage() || closeVerify() || closeChat()) return;
    if (!$('wc-menu').hidden) { closeMenu(); $('wc-btn').focus(); } else if (!$('debug').hidden) selectTab(mainView);
    else if (mainView === 'coin') selectTab('tokens');
    return;
  }
  if (ev.metaKey || ev.ctrlKey || ev.altKey || ev.target.closest('textarea, input') || !$('lightbox').hidden || !$('verify').hidden) return;
  if (ev.key === 'Enter' && !ev.target.closest('button, a')) { ev.preventDefault(); return openChat(); }
  const k = ev.key.toLowerCase();
  const tab = document.querySelector('.subnav [data-key="' + k + '"]');
  if (k === 'c') toggleMenu();
  else if (k === 'd') toggleDebug();
  else if (k === 'l' || k === 'w') selectTab('wallets');
  else if (k === 't') selectTab('tokens');
  else if (k === 'p') selectTab('profile');
  else if (tab) selectTab(tab.dataset.tab);
  else if (k >= '1' && k <= '9') selectSlot(Number(k));
  else if (k === 'h') toggleFeed();
});
/* blocky ground texture, painted once and tiled behind the HUD */
try {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d');
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const v = Math.random();
    g.fillStyle = v < .55 ? '#16231d' : v < .8 ? '#1b2b24' : v < .95 ? '#111a16' : '#24372d';
    g.fillRect(x, y, 1, 1);
  }
  document.body.style.setProperty('--tex', 'url(' + c.toDataURL() + ')');
} catch { /* the plain background is fine */ }
$('btn-popup').addEventListener('click', openPopupBridge);
$('btn-copy').addEventListener('click', async () => {
  const ta = $('report');
  try { await navigator.clipboard.writeText(ta.value); log('ok', 'report copied'); }
  catch {
    ta.focus(); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    log(ok ? 'ok' : 'warn', ok ? 'report copied' : 'clipboard blocked in this frame: the report is selected, copy it manually');
  }
});
window.addEventListener('message', (ev) => { if (ev.origin === location.origin) onBridgeMessage('window.opener', ev.data); });
if (bc) bc.addEventListener('message', (ev) => onBridgeMessage('BroadcastChannel', ev.data));

$('link-newtab').href = STANDALONE;

$('launch-btn').addEventListener('click', onLaunch);
for (const id of ['tk-name', 'tk-ticker']) $(id).addEventListener('keydown', (ev) => { if (ev.key === 'Enter') onLaunch(ev); });
$('img').addEventListener('change', () => takeImage($('img').files[0], 'file picker'));
$('drop').addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); $('img').click(); } });
for (const type of ['dragenter', 'dragover']) $('drop').addEventListener(type, (ev) => { ev.preventDefault(); $('drop').classList.add('over'); });
for (const type of ['dragleave', 'drop']) $('drop').addEventListener(type, () => $('drop').classList.remove('over'));
$('drop').addEventListener('drop', (ev) => { ev.preventDefault(); takeImage(ev.dataTransfer.files[0], 'drag and drop'); });
document.addEventListener('paste', (ev) => {
  const file = Array.from(ev.clipboardData ? ev.clipboardData.files : []).find(f => f.type.startsWith('image/'));
  if (file) { ev.preventDefault(); takeImage(file, 'paste'); }
});
$('tk-ticker').addEventListener('input', () => { $('tk-ticker').value = $('tk-ticker').value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
for (const id of ['tk-name', 'tk-ticker', 'tk-desc', 'tk-buy']) $(id).addEventListener('input', () => {
  if (launch.busy) return;
  if (launch.done) launch.result = null;
  launch.done = false; launch.checks = []; renderLaunch();
});

(async () => {
  await probeEnv();
  log('ok', 'probe started in ' + state.env.context + (state.env.ancestorOrigins instanceof Array && state.env.ancestorOrigins.length ? ' under ' + state.env.ancestorOrigins.join(' > ') : ''));
  discoverStandard(); discoverLegacy();
  loadTokens();
  loadChat();
  if (isPubkeyLike(qs.get('coin'))) openCoin(qs.get('coin'));
  renderWallets();
  for (const delay of [300, 1000, 2500]) setTimeout(discoverLegacy, delay);
  setTimeout(() => {
    settled = true;
    if (!visibleWallets().length) log('bad', 'no Solana wallet detected after 3s in ' + state.env.context);
    renderWallets();
  }, 3000);
})();
})();
