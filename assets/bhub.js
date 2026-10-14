/* tweetpad's Bordrless section (/borderless, bordrless/index.html): three parts in Bordrless's look, every one on the SDK through
   api/bordrless.js.
   Tokens: every Bordrless token, highest market cap first (?list), each opening its own tradeable page, /b/<mint>.
   Launch: a Bordrless launch (image and metadata to IPFS through api/ipfs.js, then ?action=launch builds create_launch and the dev
   buy, dry-run on mainnet; the wallet signs both in one prompt, the new mint signs the launch; listed through api/launches.js).
   Hooks: the rules kit's presets, and the Workshop's hooks with their readings, each program's upgrade label and its launch
   config read on chain (?hooks). */
(() => {
'use strict';
const K = window.bkit;
const { $, h, MODE, errText, short, usd, pct, ago, imgSrc, ruleWords, api, get, wallet, discover, disconnect } = K;
const TABS = ['tokens', 'launch', 'hooks'];
const q0 = new URLSearchParams(location.search);
const view = { tab: TABS.includes(q0.get('tab')) ? q0.get('tab') : 'tokens' };
/* a coin's page and the app, in this same frame (the X card, the pop-out) or as pages */
const coinUrl = (mint) => '/b/' + mint + (MODE === 'embed' || MODE === 'popup' ? '?' + MODE : '');
/* ‹ goes back to the home, the Menu (index.html): assets/menu-home.js points it there for this mode */
const card = (fig, title, ...kids) => h('section', { class: 'sc-card' }, h('div', { class: 'sc-card-head' }, h('span', { class: 'sc-tag', text: fig }), h('b', { text: title })), ...kids);
const kv = (k, v, tone) => h('div', { class: 'sc-kv' + (tone ? ' ' + tone : '') }, h('span', { text: k }), h('b', null, v));
const addr = (a, label) => h('a', { class: 'sc-addr', href: 'https://solscan.io/account/' + a, target: '_blank', rel: 'noopener', title: a }, label || short(a));

function setTab(tab) {
  view.tab = tab;
  for (const b of document.querySelectorAll('.bh-tabs [data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  for (const t of TABS) $('bh-' + t).hidden = t !== tab;
  $('bh-scroll').scrollTop = 0;
  if (tab === 'tokens') loadTokens();
  if (tab === 'hooks') loadHooks();
  if (tab === 'launch') { loadInfo(); renderLaunch(); }
}

/* ---------- Tokens: every Bordrless token, highest market cap first ---------- */
const tokens = { list: [], loaded: false, loading: false, error: null, q: '' };
async function loadTokens(quiet) {
  if (tokens.loading) return;
  tokens.loading = true;
  if (!quiet) renderTokens();
  try { Object.assign(tokens, { list: (await get('list=1')).tokens, loaded: true, error: null }); }
  catch (err) { tokens.error = errText(err); }
  tokens.loading = false;
  renderTokens();
}
/* the search row is drawn once (typing keeps its focus); the count and the list are redrawn */
function tokensFrame() {
  const box = $('bh-tokens');
  if (box.firstChild) return box;
  box.append(h('div', { class: 'bh-search' }, h('input', { class: 'text', type: 'search', placeholder: 'Search a name, ticker or contract', 'aria-label': 'Search Bordrless tokens',
      oninput: (ev) => { tokens.q = ev.target.value; renderTokens(); } }), h('span', { class: 'sc-tag', id: 'bh-count' })),
    h('p', { class: 'sc-note', text: 'Highest market cap first. Each one opens its own page, and that link plays as a card you can trade in a post on X.' }),
    h('div', { id: 'bh-list' }));
  return box;
}
function renderTokens() {
  tokensFrame();
  const q = tokens.q.trim().toLowerCase().replace(/^\$/, '');
  const shown = tokens.list.filter(l => !q || (l.name + ' ' + l.symbol + ' ' + l.mint).toLowerCase().includes(q));
  const rows = shown.map((l) => h('li', null, h('a', { class: 'bh-row', href: coinUrl(l.mint), title: 'Trade $' + l.symbol + ' on its own page' },
    l.image ? h('img', { class: 'bh-pic', src: imgSrc(l.image, 64), alt: '', loading: 'lazy' }) : h('span', { class: 'bh-pic sc-ph', text: (l.symbol || '?').slice(0, 1) }),
    h('span', { class: 'bh-main' }, h('b', { text: l.name }), h('small', { text: '$' + l.symbol + ' · ' + ago(l.time) + (l.holders != null ? ' · ' + l.holders + ' holders' : '')
      + (l.status === 'graduated' ? ' · graduated' : l.progress != null ? ' · ' + Math.round(l.progress * 100) + '% curve' : '') })),
    h('span', { class: 'bh-rank', text: '#' + (tokens.list.indexOf(l) + 1) }),
    h('span', { class: 'bh-mkt' }, h('b', { text: usd(l.mcap) }), l.change24h != null ? h('small', { class: l.change24h >= 0 ? 'up' : 'dn', text: (l.change24h >= 0 ? '+' : '−') + Math.abs(l.change24h).toFixed(1) + '%' }) : null))));
  $('bh-count').textContent = tokens.loaded ? tokens.list.length + ' tokens' : '…';
  $('bh-list').replaceChildren(rows.length ? h('ol', { class: 'bh-list' }, ...rows)
    : h('p', { class: tokens.error ? 'sc-err' : 'sc-note sc-wait', text: tokens.error ? 'Could not load Bordrless: ' + tokens.error : tokens.loaded ? 'No Bordrless token matches “' + tokens.q.trim() + '”.' : 'Reading Bordrless…' }));
}

/* ---------- Launch ---------- */
const MAX_IMAGE = 4 * 1024 * 1024, TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const info = { fees: [50, 100, 200], presets: [], curve: null, launchFeeSol: 0.01, sniperSecs: 30, loading: false };
const form = { file: null, bytes: null, url: null, sha: null, thumb: '', name: '', symbol: '', desc: '', feeBps: 100, preset: 'plain', devBuy: '', busy: false, checks: [], done: null, imgNote: '' };
async function loadInfo() {
  if (info.curve || info.loading) return;
  info.loading = true;
  try { Object.assign(info, await get('')); if (!info.fees.includes(form.feeBps)) form.feeBps = info.fees[0]; } catch { /* the launch still builds */ }
  info.loading = false;
  renderLaunch();
}
const hex = (bytes) => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
async function takeImage(file) {
  if (!file) return;
  if (!TYPES.includes(file.type)) { form.imgNote = 'Use PNG, JPG, GIF or WebP'; return renderLaunch(); }
  if (file.size > MAX_IMAGE) { form.imgNote = 'Up to 4 MB'; return renderLaunch(); }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sha = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
  if (form.url) URL.revokeObjectURL(form.url);
  const url = URL.createObjectURL(file);
  Object.assign(form, { file, bytes, sha, url, thumb: await thumbOf(url), imgNote: '', done: null, checks: [] });
  renderLaunch();
}
/* a 64px centre crop kept with the launch, so lists load without the full image (as the launch form makes it) */
async function thumbOf(url) {
  try {
    const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    c.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 64, 64);
    for (const [type, qv] of [['image/webp', .8], ['image/jpeg', .8], ['image/png']]) { const d = c.toDataURL(type, qv); if (d.startsWith('data:' + type) && d.length < 20000) return d; }
  } catch { /* lists fall back to the image */ }
  return '';
}
const preset = () => info.presets.find(p => p.slug === form.preset) || { slug: 'plain', name: 'Plain', rules: {} };
const devBuy = () => Number(form.devBuy || 0);
/* what a dev buy gets on a fresh curve: the creator fee and holder rewards (a quarter more for Bordrless) and the LP fee off the
   top, constant product with the curve's virtual reserves, a buy's burn from what arrives (the server quotes it exactly) */
function estimate() {
  const c = info.curve, sol = devBuy();
  if (!c || !(sol > 0)) return null;
  const r = preset().rules || {};
  const feeBps = c.feeBps + Math.round((form.feeBps + (r.holderFeeBuyBps || 0)) * 1.25);
  const lamports = BigInt(Math.floor(sol * 1e9)), input = lamports * 10000n / BigInt(feeBps + 10000);
  let tokensOut = input * BigInt(c.virtualTokens) / (BigInt(c.virtualSol) + input);
  if (tokensOut > BigInt(c.realTokens)) tokensOut = BigInt(c.realTokens);
  const burn = 1 - (r.burnBuyBps || 0) / 10000;
  const pctOf = Number(tokensOut * 1000000n / BigInt(c.supply)) / 1e4 * burn;
  return { tokens: Number(tokensOut) / 10 ** c.decimals * burn, pct: pctOf, over: r.maxWalletBps && pctOf > r.maxWalletBps / 100 };
}
function problem() {
  if (!form.file) return 'Add an image';
  if (!form.name.trim()) return 'Add a name';
  if (new TextEncoder().encode(form.name.trim()).length > 32) return 'Name: up to 32 bytes';
  if (!/^[A-Z0-9]{2,10}$/.test(form.symbol)) return 'Ticker: 2–10 letters or numbers';
  if (!/^\d{0,2}(\.\d{0,9})?$/.test(form.devBuy) || !(devBuy() >= 0 && devBuy() <= 10)) return 'Dev buy: 0–10 SOL';
  const e = estimate();
  if (e && e.over) return 'Dev buy is over the max wallet';
  return null;
}
function check(tone, text, href, link) {
  if (form.checks.length && form.checks[form.checks.length - 1].tone === 'warn') form.checks.pop();
  form.checks.push({ tone, text, href, link });
  renderLaunch();
}
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
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58encode(bytes) {
  const digits = [];
  for (const b of bytes) { let carry = b; for (let i = 0; i < digits.length; i++) { carry += digits[i] << 8; digits[i] = carry % 58; carry = (carry / 58) | 0; } while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0; } }
  let out = ''; for (const b of bytes) { if (b === 0) out += '1'; else break; }
  for (let i = digits.length - 1; i >= 0; i--) out += B58[digits[i]];
  return out;
}
/* the signers of a serialized v0 / legacy transaction, and where its message starts */
function txParts(tx) {
  const sigCount = tx[0], message = tx.subarray(1 + 64 * sigCount), o = (message[0] & 0x80) ? 1 : 0, signers = [];
  for (let i = 0; i < message[o]; i++) signers.push(b58encode(message.subarray(o + 4 + 32 * i, o + 36 + 32 * i)));
  return { sigCount, message, signers };
}
async function runLaunch() {
  if (form.busy || problem()) return;
  if (!wallet.account) return pickWallet();
  Object.assign(form, { busy: true, checks: [], done: null });
  const me = wallet.account.address, meta = { name: form.name.trim(), symbol: form.symbol, description: form.desc.trim() };
  let signature = null;
  try {
    check('warn', 'Uploading image and metadata to IPFS…');
    const res = await fetch('/api/ipfs', { method: 'POST', body: form.bytes,
      headers: { 'content-type': 'application/octet-stream', 'x-file-type': form.file.type, 'x-meta': encodeURIComponent(JSON.stringify(meta)) } });
    const ipfs = await res.json();
    if (!res.ok) throw new Error(ipfs.error || 'IPFS upload failed');
    if (ipfs.sha256 !== form.sha) throw new Error('IPFS step hashed a different image');
    check('ok', 'Image and metadata on IPFS', ipfs.uri, 'JSON ↗');
    check('warn', 'Building the Bordrless launch…');
    const keys = await newKeypair(), mint = b58encode(keys.publicKey);
    const built = await api({ action: 'launch', publicKey: me, mint, ...meta, uri: ipfs.uri, image: ipfs.image, thumb: form.thumb,
      feeBps: form.feeBps, preset: form.preset, devBuy: devBuy() });
    check('ok', 'Built and dry-run on mainnet · mint ' + short(mint) + ' · ' + pct(form.feeBps) + ' creator fee' + (built.buyTx ? ' · dev buy ready' : ''));
    check('warn', 'Approve in ' + wallet.active.name + '…');
    const [tx, buy] = await K.sign([built.tx, built.buyTx].filter(Boolean));
    const parts = txParts(tx), mintSlot = parts.signers.indexOf(mint), meSlot = parts.signers.indexOf(me);
    if (mintSlot < 0 || meSlot < 0 || parts.sigCount !== parts.signers.length) throw new Error('the wallet returned a transaction with different signers');
    tx.set(await keys.sign(parts.message), 1 + 64 * mintSlot);
    check('ok', 'Signed by ' + wallet.active.name + ' and the new mint');
    check('warn', 'Sending to Solana…');
    signature = await K.send(tx);
    check('warn', 'Confirming…', 'https://solscan.io/tx/' + signature, 'Tx ↗');
    await K.confirm(signature);
    check('ok', 'Confirmed on mainnet', 'https://solscan.io/tx/' + signature, 'Tx ↗');
    /* listed on tweetpad only once the server has read the launch back from the chain */
    const rec = await fetch('/api/launches', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ signature, mint }) });
    if (!rec.ok) check('bad', 'Live on Bordrless; tweetpad couldn\'t list it yet: ' + ((await rec.json().catch(() => ({}))).error || 'HTTP ' + rec.status));
    else check('ok', '$' + meta.symbol + ' is live', coinUrl(mint), 'Its page ↗');
    if (buy) {
      try {
        check('warn', 'Sending the dev buy…');
        const buySig = await K.send(buy);
        await K.confirm(buySig);
        check('ok', 'Dev buy confirmed', 'https://solscan.io/tx/' + buySig, 'Tx ↗');
      } catch (err) { check('bad', 'Dev buy failed: ' + errText(err) + '. Buy on its page.'); }
    }
    form.done = { mint, symbol: meta.symbol };
  } catch (err) {
    const text = errText(err);
    check('bad', /reject|declin|denied|cancel/i.test(text) ? 'Cancelled in the wallet' : /insufficient|not enough SOL/i.test(text) ? 'Not enough SOL in this wallet' : 'Failed: ' + text,
      signature ? 'https://solscan.io/tx/' + signature : undefined, signature ? 'Tx ↗' : undefined);
  } finally {
    form.busy = false;
    renderLaunch();
  }
}
function pickWallet() {
  if (wallet.list.length === 1) return K.connect(wallet.list[0]).catch((err) => check('bad', errText(err)));
  wallet.picking = true; renderLaunch();
}
const chip = (label, on, onclick, title) => h('button', { type: 'button', 'aria-pressed': String(!!on), disabled: form.busy, onclick, title }, label);
function renderLaunch() {
  const box = $('bh-launch'), p = problem(), e = estimate(), words = ruleWords(preset().rules || {});
  if (form.done) {
    const link = location.origin + '/b/' + form.done.mint;
    return box.replaceChildren(card('✓', '$' + form.done.symbol + ' is live',
      h('p', { class: 'sc-note', text: 'Its page is its trading page, and its link plays as a card you can trade in a post on X.' }),
      h('div', { class: 'b-link' }, h('code', { text: link.replace(/^https?:\/\/(www\.)?/, '').replace(/\/b\/(.{4}).*(.{4})$/, '/b/$1…$2') }),
        h('button', { type: 'button', class: 'btn', onclick: () => navigator.clipboard.writeText(link).catch(() => {}) }, 'Copy'),
        h('a', { class: 'btn primary', target: '_blank', rel: 'noopener', href: 'https://x.com/intent/post?' + new URLSearchParams({ text: '$' + form.done.symbol + ' trades right inside this post', url: link }) }, 'Post on X')),
      h('div', { class: 'bh-actions' }, h('a', { class: 'btn primary', href: coinUrl(form.done.mint) }, 'Open its page'),
        h('button', { type: 'button', class: 'btn', onclick: () => { Object.assign(form, { file: null, bytes: null, url: null, name: '', symbol: '', desc: '', devBuy: '', checks: [], done: null }); renderLaunch(); } }, 'Launch another'))),
      checksList());
  }
  const fileIn = h('input', { type: 'file', accept: TYPES.join(','), hidden: true, onchange: (ev) => takeImage(ev.target.files[0]) });
  const drop = h('label', { class: 'bh-drop' + (form.url ? ' has' : ''), title: 'Click, drop or paste an image',
    ondragover: (ev) => ev.preventDefault(), ondrop: (ev) => { ev.preventDefault(); takeImage(ev.dataTransfer.files[0]); } },
    form.url ? h('img', { src: form.url, alt: '' }) : h('span', null, '+', h('br'), 'image'), fileIn);
  const field = (key, ph, max, transform) => h('input', { class: 'text', value: form[key], placeholder: ph, maxlength: max, disabled: form.busy, spellcheck: 'false',
    oninput: (ev) => { const v = transform ? transform(ev.target.value) : ev.target.value; if (v !== ev.target.value) ev.target.value = v; form[key] = v; renderButton(); renderEstimate(); } });
  let action;
  if (!wallet.account && wallet.picking && wallet.list.length > 1) action = h('div', { class: 'b-wallets' }, ...wallet.list.map(w => h('button', { type: 'button', class: 'btn', onclick: () => K.connect(w).catch((err) => check('bad', errText(err))) },
    w.icon ? h('img', { src: w.icon, alt: '' }) : null, w.name)));
  else action = h('button', { type: 'button', class: 'btn primary b-go', id: 'bh-go', onclick: runLaunch });
  box.replaceChildren(...[
    card('A', 'Your coin',
      h('div', { class: 'bh-coin' }, drop, h('div', { class: 'bh-fields' }, field('name', 'Name', 32), field('symbol', 'TICKER', 10, (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '')))),
      form.imgNote ? h('p', { class: 'sc-err', text: form.imgNote }) : null,
      h('textarea', { class: 'text bh-desc', placeholder: 'Description (optional)', maxlength: 140, disabled: form.busy, oninput: (ev) => { form.desc = ev.target.value; } }, form.desc)),
    card('B', 'Your fee, its rules',
      h('div', { class: 'bh-label' }, h('b', { text: 'Creator fee' }), h('span', { text: 'of every trade, to you in SOL' })),
      h('div', { class: 'b-chips bh-chips' }, ...info.fees.map(bps => chip(pct(bps), bps === form.feeBps, () => { form.feeBps = bps; renderLaunch(); }))),
      h('div', { class: 'bh-label' }, h('b', { text: 'Token rules' }), h('span', { text: 'run by the token itself, on every trade' })),
      h('div', { class: 'b-chips bh-chips' }, ...(info.presets.length ? info.presets : [preset()]).map(pr => chip(pr.name, pr.slug === form.preset, () => { form.preset = pr.slug; renderLaunch(); },
        ruleWords(pr.rules || {}).join(' · ') || 'No token rules'))),
      h('p', { class: 'sc-note' }, 'Each trade: ', h('b', { text: pct(form.feeBps) + ' to you' }), ' in SOL, claimed on its page',
        words.length ? h('span', null, ' · the token itself runs ', h('b', { text: words.join(', ') })) : ' · no token rules', '. Fixed at launch.')),
    card('C', 'Dev buy',
      h('div', { class: 'b-row' }, h('div', { class: 'b-chips' }, ...['0', '0.1', '0.5', '1'].map(v => chip(v === '0' ? 'None' : v, (form.devBuy || '0') === v, () => { form.devBuy = v === '0' ? '' : v; renderLaunch(); }))),
        h('label', { class: 'b-amt' }, field('devBuy', '0', 12, (v) => v.replace(',', '.').replace(/[^\d.]/g, '')), h('span', { text: 'SOL' }))),
      h('p', { class: 'sc-note', id: 'bh-est' })),
    h('section', { class: 'b-trade' },
      wallet.account ? h('div', { class: 'b-bal' }, h('span', null, 'Wallet ', h('b', { text: short(wallet.account.address) })),
        h('button', { type: 'button', class: 'linkish', onclick: disconnect }, 'Disconnect')) : null,
      action,
      h('p', { class: 'sc-note bh-cost', text: 'Launches on Bordrless, paired with SOL · ' + pct(form.feeBps) + ' fee to you · about ' + (info.launchFeeSol + 0.025).toFixed(3) + ' SOL · '
        + info.sniperSecs + ' s sniper fee · graduates at ~' + (info.curve ? Math.round(info.curve.graduationSol) : 105) + ' SOL' })),
    checksList(),
  ].filter(Boolean));
  renderButton(); renderEstimate();
}
function renderButton() {
  const b = $('bh-go');
  if (!b) return;
  const p = problem();
  b.disabled = form.busy || (!!wallet.account && !!p) || (!wallet.account && !wallet.list.length);
  b.textContent = form.busy ? 'Launching…' : !wallet.account ? (wallet.list.length ? 'Connect wallet' : 'No Solana wallet here: open in Phantom or Solflare')
    : p || 'Launch $' + form.symbol + ' on Bordrless' + (devBuy() > 0 ? ' · buy ' + devBuy() + ' SOL' : '');
}
function renderEstimate() {
  const n = $('bh-est');
  if (!n) return;
  const e = estimate();
  n.className = 'sc-note' + (e && e.over ? ' bad' : '');
  n.replaceChildren(...(!devBuy() ? ['No dev buy: you launch holding none of your coin.']
    : !e ? ['Buying ' + devBuy() + ' SOL of ' + (form.symbol ? '$' + form.symbol : 'your coin') + ' right after the launch.']
    : e.over ? ['Over the ' + pct(preset().rules.maxWalletBps) + ' max wallet this preset sets: buy less.']
    : ['You get ≈ ', h('b', { text: K.qty(e.tokens) + ' ' + (form.symbol ? '$' + form.symbol : 'tokens') }), ' · ' + e.pct.toFixed(2) + '% of supply · bought right after the launch, one approval']));
}
function checksList() {
  if (!form.checks.length) return null;
  return h('ul', { class: 'checks bh-checks' }, ...form.checks.map(c => h('li', { class: c.tone }, c.text, c.href ? h('a', { href: c.href, target: c.href.startsWith('/') ? null : '_blank', rel: 'noopener' }, c.link || '↗') : null)));
}
/* paste an image anywhere on the Launch tab */
window.addEventListener('paste', (ev) => { if (view.tab !== 'launch') return; const f = [...(ev.clipboardData ? ev.clipboardData.files : [])][0]; if (f) takeImage(f); });

/* ---------- Hooks: the kit's presets, and the Workshop's hooks read on chain ---------- */
const hooks = { data: null, error: null, loading: false };
async function loadHooks() {
  if (hooks.data || hooks.loading) return renderHooks();
  hooks.loading = true; renderHooks();
  try { hooks.data = await get('hooks=1'); hooks.error = null; } catch (err) { hooks.error = errText(err); }
  hooks.loading = false; renderHooks();
}
const VERDICT = { pass: ['ok', 'Reads clean'], warn: ['warn', 'Read with notes'], fail: ['bad', 'Read with problems'] };
function renderHooks() {
  const box = $('bh-hooks'), d = hooks.data;
  if (!d) return box.replaceChildren(h('p', { class: hooks.error ? 'sc-err' : 'sc-note sc-wait', text: hooks.error ? 'Could not read the hooks: ' + hooks.error : 'Reading the hooks from the chain…' }));
  box.replaceChildren(
    h('p', { class: 'sc-note' }, 'A Bordrless token runs a ', h('b', { text: 'hook' }), ' on every transfer, mint and burn: it can take a cut, refuse a move, and remember 64 bytes in every holding. Launches here use Bordrless\'s rules kit; the Workshop\'s hooks are written by anyone.'),
    card('A', 'The rules kit', ...d.presets.map(pr => h('div', { class: 'bh-hook' },
      h('div', { class: 'bh-hook-head' }, h('b', { text: pr.name }),
        h('button', { type: 'button', class: 'btn', onclick: () => { form.preset = pr.slug; setTab('launch'); } }, 'Launch with it')),
      h('p', { class: 'sc-note', text: ruleWords(pr.rules).length ? 'The token runs ' + ruleWords(pr.rules).join(', ') + '.' : 'No token rules: the creator fee and the sniper fee every launch has.' })))),
    card('B', 'Workshop hooks', h('p', { class: 'sc-note', text: 'Written by anyone, built and trading-tested by Bordrless, deployed under its key. Each one re-read on chain here: who can change it, and what its launch config holds.' }),
      ...d.workshop.map(w => {
        const v = VERDICT[w.verdict] || null;
        return h('div', { class: 'bh-hook' },
          h('div', { class: 'bh-hook-head' }, h('b', { text: w.name }), h('span', { class: 'sc-tag', text: w.kind === 'pair' ? 'hook + script' : 'hook' }),
            v ? h('span', { class: 'bh-verdict ' + v[0], text: v[1] }) : null),
          w.title ? h('div', { class: 'bh-title', text: w.title }) : null,
          w.does ? h('p', { class: 'sc-note', text: w.does }) : null,
          kv('Most it takes', w.total || (w.measuredCutBps ? 'up to ' + pct(w.measuredCutBps) + ' of a transfer' : 'nothing from transfers')),
          w.risk ? kv('Who can change it', w.risk.words, w.risk.severity === 'low' ? 'gone' : 'held') : null,
          w.config ? kv('Launch config', h('span', null, addr(w.config.address), ' · ' + pct(w.config.creatorFeeBps) + ' creator fee'
            + (w.config.authorShareBps ? ' · ' + pct(w.config.authorShareBps) + ' of it to the author' : ''))) : null,
          kv('Program', h('span', null, addr(w.program), ' · ' + w.launches + ' launch' + (w.launches === 1 ? '' : 'es'))),
          w.watch.length ? h('ul', { class: 'bh-watch' }, ...w.watch.map(x => h('li', { text: x }))) : null,
          h('div', { class: 'bh-actions' }, h('a', { class: 'btn', href: 'https://bordrless.app/workshop', target: '_blank', rel: 'noopener' }, 'Launch with it on Bordrless ↗'),
            h('a', { class: 'btn', href: '/scan?mint=' + w.program + (MODE === 'page' ? '' : '&' + MODE) }, 'Scan')));
      })),
    card('C', 'Write your own', h('p', { class: 'sc-note', text: 'A hook is an ordinary Solana program against Bordrless\'s hook interface; the SDK builds every instruction, resolves a hook\'s accounts and decodes every account.' }),
      h('div', { class: 'bh-actions' }, h('a', { class: 'btn', href: 'https://bordrless.app/sdk/build', target: '_blank', rel: 'noopener' }, 'The SDK and the briefs ↗'),
        h('a', { class: 'btn', href: 'https://www.npmjs.com/package/@bordrless/sdk', target: '_blank', rel: 'noopener' }, '@bordrless/sdk ↗'))));
}

/* ---------- start ---------- */
for (const b of document.querySelectorAll('.bh-tabs [data-tab]')) b.addEventListener('click', () => setTab(b.dataset.tab));
discover(() => { if (view.tab === 'launch') renderLaunch(); });
setTab(view.tab);
setInterval(() => { if (!document.hidden && view.tab === 'tokens') loadTokens(true); }, 20000);
})();
