/* What tweetpad's Bordrless pages share (/b/<mint>: assets/b.js; /bordrless: assets/bhub.js), and any token's page (/<chain>/<address>:
   assets/t.js): the element builder, the number helpers, the RPC and api/bordrless.js calls, and the wallet through the Wallet Standard
   (Phantom, Solflare, Backpack…), the way the games connect one. A page loads this first and reads window.bkit. */
(() => {
'use strict';
const $ = (id) => document.getElementById(id);
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : String(c));
  return el;
}
const MODE = document.documentElement.dataset.mode;
const RPC = 'https://solana-rpc.publicnode.com';
const CHAIN = 'solana:mainnet';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked in this frame */ } },
};
const errText = (e) => String((e && (e.message || e.reason)) || e).replace(/^Error:? /, '');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const short = (a) => a.slice(0, 4) + '…' + a.slice(-4);
const b64enc = (bytes) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
const b64dec = (str) => Uint8Array.from(atob(str), c => c.charCodeAt(0));
const usd = (n) => (n == null ? '—' : n >= 1e9 ? '$' + (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? '$' + (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? '$' + (n / 1e3).toFixed(1) + 'K' : n >= 1 ? '$' + n.toFixed(0) : '$' + n.toPrecision(2));
const qty = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n >= 1 ? n.toFixed(2).replace(/\.?0+$/, '') : n.toPrecision(3));
const pct = (bps) => bps / 100 + '%';
const ago = (t) => { const s = Math.max(1, Math.round((Date.now() - t) / 1000)); return s < 60 ? s + 's' : s < 3600 ? Math.round(s / 60) + 'm' : s < 86400 ? Math.round(s / 3600) + 'h' : Math.round(s / 86400) + 'd'; };
const imgSrc = (url, w) => { const m = /\/ipfs\/([A-Za-z0-9]+)/.exec(url || ''); return m ? '/api/image?cid=' + m[1] + '&w=' + w : url; };
/* decimal string ⇄ base units, never through floating point */
const toRaw = (s, d) => { const m = /^(\d+)(?:\.(\d*))?$/.exec(String(s).trim()); return m ? BigInt(m[1] + (m[2] || '').slice(0, d).padEnd(d, '0')) : null; };
const fromRaw = (n, d) => { const s = BigInt(n).toString().padStart(d + 1, '0'); return (s.slice(0, -d) + '.' + s.slice(-d)).replace(/\.?0+$/, ''); };
/* a Bordrless coin's rules in a few words each (the launch form and the pages say them the same way) */
/* a side's rate: both sides alike, one side only ("2% on sells"), or each its own */
const sides = (buy, sell) => (buy === sell ? pct(buy) : !buy ? pct(sell) + ' on sells' : !sell ? pct(buy) + ' on buys' : pct(buy) + ' buys, ' + pct(sell) + ' sells');
const ruleWords = (r) => [r.holderFeeBuyBps || r.holderFeeSellBps ? 'holder rewards ' + sides(r.holderFeeBuyBps, r.holderFeeSellBps) : null,
  r.burnBuyBps || r.burnSellBps ? 'burn ' + sides(r.burnBuyBps, r.burnSellBps) : null,
  r.maxWalletBps ? 'max wallet ' + pct(r.maxWalletBps) : null,
  r.creatorLockDays ? 'creator wallet locked ' + r.creatorLockDays + ' d' : null,
  r.earlyWindowSecs ? 'buys in the first ' + Math.round(r.earlyWindowSecs / 60) + ' min locked ' + Math.round(r.earlyLockSecs / 3600) + ' h' : null].filter(Boolean);

async function rpc(method, params) {
  const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const out = await r.json();
  if (out.error) throw new Error(out.error.message || 'RPC error');
  return out.result;
}
async function api(json) {
  const r = await fetch('/api/bordrless', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(json) });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(out.error || 'HTTP ' + r.status);
  return out;
}
async function get(query) {
  const r = await fetch('/api/bordrless?' + query);
  const out = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(out.error || 'HTTP ' + r.status);
  return out;
}

/* ---------- the wallet ---------- */
const wallet = { list: [], active: null, account: null, picking: false, tried: false, listeners: [] };
const changed = () => { for (const f of wallet.listeners) f(); };
function discover(onChange) {
  if (onChange) wallet.listeners.push(onChange);
  const seen = new Set();
  const standardApi = Object.freeze({
    register(...ws) {
      for (const w of ws) {
        if (!w || seen.has(w)) continue;
        seen.add(w);
        const solana = Array.from(w.chains || []).some(c => String(c).startsWith('solana:'));
        if (solana && w.features && w.features['solana:signTransaction'] && w.features['standard:connect'] && !/metamask/i.test(w.name)) wallet.list.push(w);
      }
      changed();
      reconnect();
      return () => {};
    },
  });
  window.addEventListener('wallet-standard:register-wallet', (ev) => { try { ev.detail(standardApi); } catch { /* a wallet's own error */ } });
  try { window.dispatchEvent(new CustomEvent('wallet-standard:app-ready', { detail: standardApi })); } catch { /* no wallets */ }
}
/* connects, or throws in words (a declined prompt included) */
async function connect(w, silent) {
  const solAccount = (accounts) => (accounts || []).find(a => (a.chains || []).some(c => String(c).startsWith('solana:'))) || (accounts || [])[0];
  try {
    const res = await w.features['standard:connect'].connect(silent ? { silent: true } : undefined);
    const account = solAccount(res && res.accounts) || solAccount(w.accounts);
    if (!account) throw new Error(w.name + ' returned no account');
    Object.assign(wallet, { active: w, account, picking: false });
    store.set('tweetpad:bwallet', w.name);
  } catch (err) {
    if (!silent) throw new Error(/reject|declin|denied|cancel/i.test(errText(err)) ? 'Connection declined in the wallet' : errText(err));
  } finally { changed(); }
}
/* the wallet used last time, without a prompt */
function reconnect() {
  if (wallet.tried || wallet.account) return;
  const w = wallet.list.find(x => x.name === store.get('tweetpad:bwallet'));
  if (w) { wallet.tried = true; connect(w, true); }
}
async function disconnect() {
  const w = wallet.active;
  try { if (w && w.features['standard:disconnect']) await w.features['standard:disconnect'].disconnect(); } catch { /* already gone */ }
  Object.assign(wallet, { active: null, account: null });
  store.set('tweetpad:bwallet', '');
  changed();
}
/* the wallet signs one or more transactions in one prompt; their bytes come back */
async function sign(b64s) {
  const out = await wallet.active.features['solana:signTransaction'].signTransaction(...b64s.map(b => ({ account: wallet.account, transaction: b64dec(b), chain: CHAIN })));
  return out.map(o => new Uint8Array(o.signedTransaction));
}
async function send(bytes) { return rpc('sendTransaction', [b64enc(bytes), { encoding: 'base64', preflightCommitment: 'confirmed', maxRetries: 5 }]); }
async function confirm(sig) {
  for (let i = 0; i < 60; i++) {
    const [st] = (await rpc('getSignatureStatuses', [[sig]])).value;
    if (st && st.err) throw Object.assign(new Error('failed on chain'), { sig });
    if (st && (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized')) return sig;
    await sleep(700);
  }
  throw Object.assign(new Error('not confirmed yet: check the transaction'), { sig });
}
/* the usual one: sign one transaction, send it, wait for it */
async function signAndSend(b64, onSent) {
  const [bytes] = await sign([b64]);
  const sig = await send(bytes);
  if (onSent) onSent(sig);
  return confirm(sig);
}

window.bkit = { $, h, MODE, store, errText, sleep, short, b64enc, b64dec, usd, qty, pct, ago, imgSrc, toRaw, fromRaw, ruleWords,
  rpc, api, get, wallet, discover, connect, disconnect, sign, send, confirm, signAndSend };
})();
