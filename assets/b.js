/* A Bordrless token's own page (/b/<mint>, api/b.js): the coin, its chart, a buy and sell box, its rules, its curve, what the
   connected wallet can claim, who can still change it, and its last trades. The first read comes in the page; it is read again
   every 15 seconds (api/bordrless.js ?token). Trades are built and dry-run by api/bordrless.js; the wallet signs; the page sends
   them. Inside X's player (?embed) the whole thing plays in the post. */
(() => {
'use strict';
const { $, h, MODE, store, errText, short, usd, qty, pct, ago, imgSrc, toRaw, fromRaw, api, wallet, discover, disconnect } = window.bkit;

let t = JSON.parse($('b-data').textContent);
const MINT = t.mint;
const SHARE = location.origin + '/b/' + MINT;
/* back to the app's Bordrless list in a frame (the X card, the pop-out), else tweetpad's own page */
if (MODE === 'embed' || MODE === 'popup') $('b-home').href = '/embed.html?' + new URLSearchParams({ ...(MODE === 'popup' && { mode: 'popup' }), tab: 'tokens', list: 'bordrless' });

/* ---------- the wallet (assets/bkit.js): connecting, and every send, report here ---------- */
const connect = (w) => window.bkit.connect(w).catch((err) => say('bad', errText(err)));
const signAndSend = (b64) => window.bkit.signAndSend(b64, (sig) => say('warn', 'Confirming…', sig));
/* a wallet connected or gone: its position follows */
function walletChanged() {
  const a = wallet.account && wallet.account.address;
  if (!a) wallet.pos = null;
  else if (!wallet.pos || wallet.pos.owner !== a) loadPosition();
  renderTrade(); renderParts();
}
/* the wallet's coin, its SOL (bridged SOL counts: a buy spends it first) and what it can claim */
async function loadPosition() {
  const a = wallet.account && wallet.account.address;
  if (!a) return;
  try {
    const r = await fetch('/api/bordrless?mint=' + MINT + '&wallet=' + a);
    const out = await r.json();
    if (r.ok && wallet.account && wallet.account.address === a) wallet.pos = { ...out, owner: a };
  } catch { /* keep the last */ }
  renderTrade(); renderParts();
}

/* ---------- trading ---------- */
const SLIPS = [1, 3, 5, 10, 20];
const trade = { side: 'buy', amount: '', raw: null, quote: null, quoting: false, seq: 0, timer: null, busy: false, status: null, slip: Number(store.get('tweetpad:slip')) || 5 };
const decimals = () => (trade.side === 'buy' ? 9 : t.decimals);
const amountRaw = () => (trade.raw != null ? trade.raw : toRaw(trade.amount, decimals()));
const amountText = () => (trade.raw != null ? fromRaw(trade.raw, decimals()) : trade.amount.trim());
function say(tone, text, sig) { trade.status = { tone, text, sig }; renderTrade(); }
function setAmount(amount, raw = null) { Object.assign(trade, { amount, raw, status: null }); requestQuote(); }
function requestQuote() {
  clearTimeout(trade.timer);
  const seq = ++trade.seq;
  trade.quote = null;
  if (!amountRaw()) { trade.quoting = false; return renderTrade(); }
  trade.quoting = true; renderTrade();
  trade.timer = setTimeout(async () => {
    try {
      const r = await fetch('/api/bordrless?' + new URLSearchParams({ mint: MINT, side: trade.side, amount: amountText() }));
      const out = await r.json();
      if (!r.ok) throw new Error(out.error || 'HTTP ' + r.status);
      if (seq === trade.seq) trade.quote = { out: BigInt(out.expected) };
    } catch (err) { if (seq === trade.seq) trade.quote = { error: errText(err) }; }
    if (seq === trade.seq) { trade.quoting = false; renderTrade(); }
  }, 300);
}
async function runTrade() {
  if (trade.busy || !wallet.account) return;
  trade.busy = true;
  const side = trade.side;
  try {
    say('warn', 'Getting the price…');
    const built = await api({ action: 'trade', wallet: wallet.account.address, mint: MINT, side, amount: amountText(), slippage: trade.slip });
    say('warn', 'Approve in ' + wallet.active.name + '…');
    const sig = await signAndSend(built.tx);
    const got = Number(built.expected) / 10 ** (side === 'buy' ? t.decimals : 9);
    say('ok', side === 'buy' ? 'Bought ≈ ' + qty(got) + ' $' + t.symbol : 'Sold for ≈ ' + qty(got) + ' SOL', sig);
    Object.assign(trade, { amount: '', raw: null, quote: null });
    refresh();
  } catch (err) {
    const text = errText(err);
    say('bad', /reject|declin|denied|cancel/i.test(text) ? 'Cancelled in the wallet' : /blockhash not found|block height exceeded/i.test(text) ? 'Took too long to approve; try again' : text, err.sig);
  } finally {
    trade.busy = false;
    renderTrade();
    setTimeout(loadPosition, 1500);
  }
}
async function claim(what) {
  if (trade.busy || !wallet.account) return;
  trade.busy = true;
  try {
    const built = await api({ action: 'claim', wallet: wallet.account.address, mint: MINT, what });
    say('warn', 'Approve the claim in ' + wallet.active.name + '…');
    const sig = await signAndSend(built.tx);
    say('ok', 'Claimed ' + (Number(built.amount) / 1e9).toFixed(4) + ' SOL', sig);
  } catch (err) {
    const text = errText(err);
    say('bad', /reject|declin|denied|cancel/i.test(text) ? 'Cancelled in the wallet' : text, err.sig);
  } finally {
    trade.busy = false;
    renderTrade();
    setTimeout(loadPosition, 1500);
  }
}

/* ---------- drawing ---------- */
function renderCoin() {
  const m = t.market || {}, ch = m.change24h;
  $('b-coin').replaceChildren(
    t.image ? h('img', { class: 'b-pic', src: imgSrc(t.image, 128), alt: '' }) : h('span', { class: 'b-pic sc-ph', text: t.symbol.slice(0, 1) }),
    h('div', { class: 'b-name' }, h('b', { text: t.name }),
      h('small', null, h('span', { class: 'sc-std', text: 'Bordrless' }), ' ',
        h('button', { class: 'b-ca', type: 'button', title: 'Copy the contract address', onclick: () => copy(MINT, 'Contract address copied') }, short(MINT) + ' ⧉'))),
    h('div', { class: 'b-cap' }, h('b', { text: usd(t.mcapUsd) }),
      ch != null ? h('span', { class: ch >= 0 ? 'up' : 'dn', text: (ch >= 0 ? '+' : '−') + Math.abs(ch).toFixed(1) + '% 24h' }) : h('span', { text: 'market cap' })));
}
/* the last eight hours of 5-minute closes, ink on paper */
function renderChart() {
  const cv = $('b-chart'), dpr = window.devicePixelRatio || 1, w = cv.clientWidth, hgt = cv.clientHeight;
  if (!w) return;
  cv.width = w * dpr; cv.height = hgt * dpr;
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  g.clearRect(0, 0, w, hgt);
  const pts = (t.candles || []).map(c => c[4]).filter(v => v > 0);
  if (pts.length < 2) { g.fillStyle = '#6b6b66'; g.font = '11px "JetBrains Mono", monospace'; g.fillText('No trades to chart yet', 10, hgt / 2); return; }
  const lo = Math.min(...pts), hi = Math.max(...pts), span = hi - lo || hi || 1, pad = 8;
  const x = (i) => pad + (i / (pts.length - 1)) * (w - pad * 2 - 46), y = (v) => pad + (1 - (v - lo) / span) * (hgt - pad * 2);
  g.beginPath(); pts.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v))));
  g.lineTo(x(pts.length - 1), hgt); g.lineTo(x(0), hgt); g.closePath();
  g.fillStyle = pts[pts.length - 1] >= pts[0] ? 'rgba(31, 157, 71, .12)' : 'rgba(217, 45, 45, .1)'; g.fill();
  g.beginPath(); pts.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v))));
  g.strokeStyle = '#111'; g.lineWidth = 2; g.stroke();
  /* the last price, at the right edge */
  const last = pts[pts.length - 1], ly = y(last);
  g.fillStyle = '#111'; g.fillRect(w - pad - 44, ly - 8, 44, 16);
  g.fillStyle = '#fff'; g.font = 'bold 10px "JetBrains Mono", monospace'; g.textAlign = 'center';
  g.fillText(last < 0.0001 ? last.toExponential(1) : last.toPrecision(2), w - pad - 22, ly + 3.5);
}
function renderTrade() {
  const box = $('b-trade'), buy = trade.side === 'buy', pos = wallet.pos;
  if (!t.tradeable) {
    box.replaceChildren(h('p', { class: 'sc-note', text: t.launch && t.launch.customHook ? 'This coin runs a hook of its creator\'s own: trade it on Bordrless.' : 'No pool to trade on yet.' }),
      h('a', { class: 'btn primary', href: 'https://bordrless.app/token/' + MINT, target: '_blank', rel: 'noopener' }, 'Trade on Bordrless ↗'));
    return;
  }
  const solHeld = pos ? (BigInt(pos.lamports) + BigInt(pos.bridged)) : null, tokHeld = pos ? BigInt(pos.tokens) : null;
  const maxBuy = solHeld != null ? solHeld - 15000000n : null;   // kept back: fees and rent for the holdings
  const raw = amountRaw();
  const tooMuch = raw && (buy ? maxBuy != null && raw > maxBuy + 15000000n : tokHeld != null && raw > tokHeld);
  const chip = (label, pressed, onclick, disabled) => h('button', { type: 'button', 'aria-pressed': String(!!pressed), disabled: trade.busy || disabled, onclick }, label);
  const chips = buy ? [...['0.05', '0.1', '0.5'].map(v => chip(v, trade.raw == null && trade.amount === v, () => setAmount(v))),
      chip('Max', maxBuy != null && trade.raw === maxBuy, () => setAmount(fromRaw(maxBuy, 9), maxBuy), !(maxBuy > 0n))]
    : [25, 50, 100].map(p => chip(p + '%', tokHeld && trade.raw === tokHeld * BigInt(p) / 100n, () => { const r = tokHeld * BigInt(p) / 100n; setAmount(fromRaw(r, t.decimals), r); }, !tokHeld));
  const input = h('input', { class: 'text', type: 'text', inputmode: 'decimal', placeholder: '0', value: trade.raw != null ? fromRaw(trade.raw, decimals()) : trade.amount, disabled: trade.busy,
    'aria-label': buy ? 'SOL to spend' : '$' + t.symbol + ' to sell',
    oninput: (ev) => { const v = ev.target.value.replace(',', '.'); if (/^\d*\.?\d*$/.test(v)) setAmount(v); else ev.target.value = trade.amount; } });
  const out = trade.quote && trade.quote.out != null ? Number(trade.quote.out) / 10 ** (buy ? t.decimals : 9) : null;
  const est = trade.quoting ? h('span', { class: 'dim', text: 'Quoting…' })
    : trade.quote && trade.quote.error ? h('span', { class: 'bad', text: trade.quote.error })
    : out != null ? h('span', null, '≈ ', h('b', { text: qty(out) + (buy ? ' $' + t.symbol : ' SOL') }), h('span', { class: 'dim', text: ' · min ' + qty(out * (1 - trade.slip / 100)) }))
    : h('span', { class: 'dim', text: feeLine() });
  let action;
  if (!wallet.account) {
    action = wallet.picking && wallet.list.length > 1 ? h('div', { class: 'b-wallets' }, ...wallet.list.map(w => h('button', { type: 'button', class: 'btn', onclick: () => connect(w) },
        w.icon ? h('img', { src: w.icon, alt: '' }) : null, w.name)))
      : h('button', { type: 'button', class: 'btn primary b-go', disabled: !wallet.list.length,
          onclick: () => { if (wallet.list.length === 1) connect(wallet.list[0]); else { wallet.picking = true; renderTrade(); } } },
        wallet.list.length ? 'Connect wallet to trade' : 'No Solana wallet here: open in Phantom or Solflare');
    /* X's frame on some browsers has no wallet: the same page in its own tab has */
    if (!wallet.list.length && MODE !== 'page') action = h('a', { class: 'btn primary b-go', href: SHARE, target: '_blank', rel: 'noopener' }, 'Open to trade ↗');
  } else {
    action = h('button', { type: 'button', class: 'btn primary b-go' + (buy ? '' : ' sell'), disabled: trade.busy || !raw || tooMuch || !!(trade.quote && trade.quote.error), onclick: runTrade },
      trade.busy ? 'Working…' : tooMuch ? (buy ? 'Not enough SOL' : 'You hold less than that') : (buy ? 'Buy $' : 'Sell $') + t.symbol);
  }
  box.replaceChildren(...[
    h('div', { class: 'b-top' },
      h('div', { class: 'b-side', role: 'tablist' }, ...['buy', 'sell'].map(s => h('button', { type: 'button', role: 'tab', class: s, 'aria-selected': String(trade.side === s), disabled: trade.busy,
        onclick: () => { if (trade.side !== s) { Object.assign(trade, { side: s, amount: '', raw: null, status: null }); requestQuote(); } } }, s === 'buy' ? 'Buy' : 'Sell'))),
      h('button', { type: 'button', class: 'b-slip', title: 'The most the price may move against you before the trade cancels', disabled: trade.busy,
        onclick: () => { trade.slip = SLIPS[(SLIPS.indexOf(trade.slip) + 1) % SLIPS.length]; store.set('tweetpad:slip', String(trade.slip)); requestQuote(); } }, 'Slippage ' + trade.slip + '%')),
    h('div', { class: 'b-row' }, h('label', { class: 'b-amt' }, input, h('span', { text: buy ? 'SOL' : '$' + t.symbol })), h('div', { class: 'b-chips' }, ...chips)),
    h('div', { class: 'b-est', 'aria-live': 'polite' }, est),
    action,
    wallet.account ? h('div', { class: 'b-bal' }, h('span', null, buy ? 'Balance ' : 'You hold ',
        h('b', { text: !pos ? '…' : buy ? qty(Number(solHeld) / 1e9) + ' SOL' : qty(Number(tokHeld) / 10 ** t.decimals) + ' $' + t.symbol })),
      h('button', { type: 'button', class: 'linkish', onclick: disconnect, title: 'Disconnect ' + wallet.active.name }, short(wallet.account.address) + ' ×')) : null,
    trade.status ? h('div', { class: 'b-status ' + trade.status.tone }, trade.status.text,
      trade.status.sig ? h('a', { href: 'https://solscan.io/tx/' + trade.status.sig, target: '_blank', rel: 'noopener', text: ' Tx ↗' }) : null) : null,
  ].filter(Boolean));
}
function feeLine() {
  const l = t.launch;
  if (!l) return '';
  const now = Date.now() / 1000;
  return [pct(l.feeBps) + ' to its creator', l.rules.holderFeeBuyBps || l.rules.holderFeeSellBps ? 'holder rewards' : null, l.rules.burnBuyBps || l.rules.burnSellBps ? 'a burn' : null,
    'Bordrless\'s ' + pct(l.lpFeeBps) + ' LP fee', now < l.sniperEndsAt ? 'sniper fee for ' + Math.ceil(l.sniperEndsAt - now) + ' s more' : null].filter(Boolean).join(', ') + ' · tweetpad takes nothing';
}
const card = (fig, title, ...kids) => h('section', { class: 'sc-card' }, h('div', { class: 'sc-card-head' }, h('span', { class: 'sc-tag', text: fig }), h('b', { text: title })), ...kids);
const kv = (k, v, tone) => h('div', { class: 'sc-kv' + (tone ? ' ' + tone : '') }, h('span', { text: k }), h('b', null, v));
const addr = (a, label) => h('a', { class: 'sc-addr', href: 'https://solscan.io/account/' + a, target: '_blank', rel: 'noopener', title: a }, label || short(a));
function renderParts() {
  const l = t.launch, now = Date.now() / 1000, pos = wallet.pos, parts = [];
  /* what the connected wallet can claim, in SOL */
  if (pos && (BigInt(pos.creatorFees || 0) > 0n || BigInt(pos.rewards || 0) > 0n)) {
    const row = (what, label, raw) => (BigInt(raw || 0) > 0n ? h('div', { class: 'b-claim' }, h('span', { text: label }), h('b', { text: (Number(raw) / 1e9).toFixed(4) + ' SOL' }),
      h('button', { type: 'button', class: 'btn primary', disabled: trade.busy, onclick: () => claim(what) }, 'Claim')) : null);
    parts.push(card('$', 'Yours to claim', row('creator', 'Creator fees', pos.creatorFees), row('rewards', 'Holder rewards', pos.rewards)));
  }
  if (l) {
    const r = l.rules;
    parts.push(card('A', 'Rules on every trade',
      kv('Creator fee', pct(l.feeBps) + ' of each trade, in SOL'),
      r.holderFeeBuyBps || r.holderFeeSellBps ? kv('Holder rewards', pct(r.holderFeeBuyBps) + ' of buys · ' + pct(r.holderFeeSellBps) + ' of sells') : null,
      r.burnBuyBps || r.burnSellBps ? kv('Burn', pct(r.burnBuyBps) + ' of buys · ' + pct(r.burnSellBps) + ' of sells') : null,
      r.maxWalletBps ? kv('Max wallet', pct(r.maxWalletBps) + ' of supply, until graduation') : null,
      l.creatorUnlockAt ? kv('Creator wallet', l.creatorUnlockAt > now ? 'locked ' + Math.ceil((l.creatorUnlockAt - now) / 86400) + ' d more' : 'unlocked', l.creatorUnlockAt > now ? 'gone' : null) : null,
      l.earlyUnlockAt && l.earlyUnlockAt > now ? kv('Early buyers', 'locked ' + Math.ceil((l.earlyUnlockAt - now) / 3600) + ' h more') : null,
      kv('Pool fee', pct(l.lpFeeBps) + ' (Bordrless\'s)' + (t.market && t.market.buyFeeBps ? ' · all in ' + pct(t.market.buyFeeBps) + ' a buy, ' + pct(t.market.sellFeeBps) + ' a sell' : '')),
      kv('Paid so far', (l.creatorFeesSol).toFixed(2) + ' SOL to its creator' + (l.holderFeesSol ? ' · ' + l.holderFeesSol.toFixed(2) + ' SOL to holders' : '')
        + (l.burned ? ' · ' + qty(l.burned) + ' burned' : ''))));
    parts.push(card('B', l.status === 'curve' ? 'On its bonding curve' : 'Graduated',
      l.status === 'curve' && l.progress != null ? h('div', { class: 'sc-bar' }, h('i', { style: 'width:' + Math.min(100, l.progress * 100).toFixed(1) + '%' }),
        h('span', { text: (l.raisedSol || 0).toFixed(1) + ' / ' + l.graduationSol.toFixed(0) + ' SOL · ' + (l.progress * 100).toFixed(1) + '%' })) : null,
      h('p', { class: 'sc-note', text: l.status === 'curve' ? 'At ' + l.graduationSol.toFixed(0) + ' SOL raised it graduates into the same pool: nothing to migrate, the rules keep running.'
        : 'Graduated ' + ago(l.graduatedAt * 1000) + ' ago. It trades on the same pool, its liquidity locked for ever.' }),
      kv('Liquidity', t.pool ? t.pool.liquiditySol.toFixed(2) + ' SOL' + (t.liquidityUsd ? ' · ' + usd(t.liquidityUsd) : '') : '—'),
      t.market ? kv('24h', usd(t.market.volume24hUsd) + ' volume · ' + t.market.trades24h + ' trades · ' + (t.market.holders ?? '—') + ' holders') : null));
  }
  const a = t.authorities;
  parts.push(card('C', 'Who can change it',
    h('div', { class: 'sc-risk b-risk ' + t.risk.severity }, h('span', { class: 'sc-level', text: { low: 'Low risk', medium: 'Medium risk', high: 'High risk' }[t.risk.severity] }), h('p', { text: t.risk.words })),
    ...[['mint', 'Mint', 'mint more'], ['freeze', 'Freeze', 'freeze holders'], ['hook', 'Hook', 'swap the hook'], ['metadata', 'Metadata', 'rename it']]
      .map(([k, label, what]) => kv(label, a[k] ? h('span', null, addr(a[k]), ' can ' + what) : 'Nobody', a[k] ? 'held' : 'gone')),
    t.hook ? kv('Hook program', h('span', null, addr(t.hook.program), t.hook.kind === 'kit' ? ' · Bordrless\'s rules kit' : ' · a custom hook')) : null,
    h('a', { class: 'btn b-scan', href: '/scan?mint=' + MINT + (MODE === 'page' ? '' : '&' + MODE) }, 'Full scan, holders and a sell test')));
  if (t.trades && t.trades.length) parts.push(card('D', 'Last trades', h('ol', { class: 'b-trades' }, ...t.trades.slice(0, 8).map(x =>
    h('li', null, h('b', { class: x.side === 'buy' ? 'up' : 'dn', text: x.side.toUpperCase() }), h('span', { text: x.sol.toFixed(3) + ' SOL' }),
      addr(x.wallet), h('a', { class: 'b-ago', href: 'https://solscan.io/tx/' + x.tx, target: '_blank', rel: 'noopener', text: ago(x.time) }))))));
  /* sharing: the link plays as this very card on X */
  const links = t.links || {};
  parts.push(h('section', { class: 'b-share' },
    h('div', { class: 'b-link' }, h('code', { text: SHARE.replace(/^https?:\/\/(www\.)?/, '').replace(/\/b\/(.{4}).*(.{4})$/, '/b/$1…$2') }),
      h('button', { type: 'button', class: 'btn', onclick: () => copy(SHARE, 'Link copied: it plays as this card on X') }, 'Copy'),
      h('a', { class: 'btn primary', target: '_blank', rel: 'noopener',
        href: 'https://x.com/intent/post?' + new URLSearchParams({ text: '$' + t.symbol + ' trades right inside this post', url: SHARE }) }, 'Post on X')),
    h('div', { class: 'b-out' },
      h('a', { href: 'https://bordrless.app/token/' + MINT, target: '_blank', rel: 'noopener' }, 'Bordrless ↗'),
      links.twitter ? h('a', { href: links.twitter, target: '_blank', rel: 'noopener' }, 'X ↗') : null,
      links.telegram ? h('a', { href: links.telegram, target: '_blank', rel: 'noopener' }, 'Telegram ↗') : null,
      links.website && !/bordrless\.app\/token\//.test(links.website) ? h('a', { href: links.website, target: '_blank', rel: 'noopener' }, 'Website ↗') : null,
      h('a', { href: 'https://solscan.io/token/' + MINT, target: '_blank', rel: 'noopener' }, 'Solscan ↗'))));
  $('b-parts').replaceChildren(...parts);
}
async function copy(text, done) {
  try { await navigator.clipboard.writeText(text); say('ok', done); } catch { say('warn', text); }
}
function render() { renderCoin(); renderChart(); renderTrade(); renderParts(); }

/* read again every 15 seconds while the page is in view */
async function refresh() {
  try {
    const r = await fetch('/api/bordrless?token=' + MINT);
    if (r.ok) { t = await r.json(); renderCoin(); renderChart(); renderParts(); if (!trade.busy) renderTrade(); }
  } catch { /* keep the last */ }
}
setInterval(() => { if (!document.hidden) { refresh(); if (amountRaw() && !trade.busy && !trade.quoting) requestQuote(); } }, 15000);
window.addEventListener('resize', renderChart);
render();
discover(walletChanged);
})();
