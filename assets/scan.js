/* tweetpad's token scanner (/scan): one read of /api/bordrless?scan=<mint>, laid out as what a buyer should know first: the
   verdict, who can still change the token, the hook it runs, the rules it enforces, its market and holders, and a dry-run sell. */
(() => {
'use strict';
const $ = (id) => document.getElementById(id);
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) el.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : String(c));
  return el;
}
const mode = document.documentElement.dataset.mode;
const isPubkey = (s) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
const short = (a) => a.slice(0, 4) + '…' + a.slice(-4);
const usd = (n) => (n == null ? '—' : n >= 1e6 ? '$' + (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? '$' + (n / 1e3).toFixed(1) + 'k' : '$' + n.toFixed(n < 1 ? 4 : 0));
const pct = (bps) => bps / 100 + '%';
const days = (s) => (s >= 86400 ? Math.round(s / 86400) + ' d' : s >= 3600 ? Math.round(s / 3600) + ' h' : Math.round(s / 60) + ' min');
const solscan = (a) => 'https://solscan.io/account/' + a;
const imgSrc = (url) => { const m = /\/ipfs\/([A-Za-z0-9]+)/.exec(url || ''); return m ? '/api/image?cid=' + m[1] + '&w=128' : url; };
/* the app, in this same frame (the X card, the pop-out) or as the page */
const appUrl = (q) => '/embed.html?' + new URLSearchParams({ ...(mode === 'popup' && { mode: 'popup' }), ...q });
if (mode === 'embed' || mode === 'popup') document.querySelector('.head .home').href = appUrl({});

/* an address, linked to Solscan */
const addr = (a, label) => h('a', { class: 'sc-addr', href: solscan(a), target: '_blank', rel: 'noopener', title: a }, label || short(a));
const card = (fig, title, ...kids) => h('section', { class: 'sc-card' }, h('div', { class: 'sc-card-head' }, h('span', { class: 'sc-tag', text: fig }), h('b', { text: title })), ...kids);
const kv = (k, v, tone) => h('div', { class: 'sc-kv' + (tone ? ' ' + tone : '') }, h('span', { text: k }), h('b', null, v));

function render(d) {
  const out = $('sc-out');
  $('sc-intro').hidden = true;
  const bordr = d.standard === 'bordrless', a = d.authorities || {};
  /* 1. the verdict: the worst thing the code still allows, in its words */
  const verdict = h('section', { class: 'sc-verdict ' + d.risk.severity },
    h('div', { class: 'sc-who' },
      d.image ? h('img', { src: imgSrc(d.image), alt: '' }) : h('span', { class: 'sc-ph', text: (d.symbol || '?').slice(0, 1) }),
      h('div', null, h('b', { text: d.name ? d.name + (d.symbol ? ' · $' + d.symbol : '') : short(d.mint) }),
        h('small', null, h('span', { class: 'sc-std', text: bordr ? 'Bordrless' : d.standard === 'token-2022' ? 'Token-2022' : 'SPL Token' }), ' ', addr(d.mint)))),
    h('div', { class: 'sc-risk' }, h('span', { class: 'sc-level', text: { low: 'Low risk', medium: 'Medium risk', high: 'High risk' }[d.risk.severity] }), h('p', { text: d.risk.words })),
    d.risk.reasons.length > 1 ? h('ul', { class: 'sc-reasons' }, ...d.risk.reasons.slice(1).map(r => h('li', { class: r.severity, text: r.words }))) : null);

  /* 2. who can change it: each authority held or given up */
  const auth = (k, label, what) => kv(label, a[k] ? h('span', null, addr(a[k]), ' can ' + what) : 'Nobody', a[k] ? 'held' : 'gone');
  const authorities = card('A', 'Who can change it',
    auth('mint', 'Mint', 'mint more'), auth('freeze', 'Freeze', 'freeze holders'),
    bordr ? auth('hook', 'Hook', 'swap the hook') : null, bordr ? auth('metadata', 'Metadata', 'rename it') : null,
    d.supply ? kv('Supply', (Number(d.supply) / 10 ** d.decimals).toLocaleString('en-US', { maximumFractionDigits: 0 }) + (d.maxSupply && d.maxSupply !== '0' ? ' · capped at ' + (Number(d.maxSupply) / 10 ** d.decimals).toLocaleString('en-US') : '')) : null,
    d.transferFeeBps ? kv('Transfer tax', pct(d.transferFeeBps), 'held') : null,
    d.transferHook ? kv('Transfer hook', addr(d.transferHook), 'held') : null);

  /* 3. the hook: what runs on every transfer, and who can upgrade it */
  const hk = d.hook;
  const hook = bordr ? card('B', 'The hook', !hk ? h('p', { class: 'sc-note', text: 'No hook: transfers move exactly what is sent.' }) : [
    kv('Program', h('span', null, addr(hk.program), hk.kind === 'kit' ? ' · Bordrless\'s rules kit' : ' · a custom hook')),
    kv('Runs', hk.runs.join(', ') || 'never'),
    hk.risk ? kv('Who can upgrade it', hk.risk.words, hk.risk.severity === 'low' ? 'gone' : 'held') : null,
    hk.risk && hk.risk.callees ? kv('Calls out to', hk.risk.callees + ' other program' + (hk.risk.callees > 1 ? 's' : ''), 'held') : null]) : null;

  /* 4. the rules its launch enforces inside every trade */
  const l = d.launch;
  const r = l && l.rules, now = Date.now() / 1000;
  const rules = l ? card('C', 'Rules on every trade',
    kv('Creator fee', pct(l.creatorFeeBps) + ' of each trade, in SOL'),
    r.holderFeeBuyBps || r.holderFeeSellBps ? kv('Holder rewards', pct(r.holderFeeBuyBps) + ' of buys · ' + pct(r.holderFeeSellBps) + ' of sells') : null,
    r.burnBuyBps || r.burnSellBps ? kv('Burn', pct(r.burnBuyBps) + ' of buys · ' + pct(r.burnSellBps) + ' of sells') : null,
    r.maxWalletBps ? kv('Max wallet', pct(r.maxWalletBps) + ' of supply, until graduation') : null,
    l.creatorUnlockAt ? kv('Creator wallet', l.creatorUnlockAt > now ? 'locked ' + days(l.creatorUnlockAt - now) + ' more' : 'unlocked', l.creatorUnlockAt > now ? 'gone' : null) : null,
    l.earlyUnlockAt ? kv('Early buyers', l.earlyUnlockAt > now ? 'locked ' + days(l.earlyUnlockAt - now) + ' more' : 'unlocked') : null,
    kv('Pool fee', pct(l.lpFeeBps) + ' (Bordrless\'s)' + (d.market && d.market.buyFeeBps ? ' · all in, ' + pct(d.market.buyFeeBps) + ' a buy, ' + pct(d.market.sellFeeBps) + ' a sell' : '')),
    l.customHook ? kv('Creator\'s own hook', addr(l.customHook), 'held') : null) : null;

  /* 5. the market, from Bordrless's indexer */
  const m = d.market;
  const market = m ? card('D', l && l.status === 'curve' ? 'On its bonding curve' : 'Trading',
    h('div', { class: 'sc-stats' },
      h('div', null, h('span', { text: 'Market cap' }), h('b', { text: usd(m.mcapUsd) })),
      h('div', null, h('span', { text: 'Liquidity' }), h('b', { text: usd(m.liquidityUsd) })),
      h('div', null, h('span', { text: 'Volume 24h' }), h('b', { text: usd(m.volume24hUsd) })),
      h('div', null, h('span', { text: 'Holders' }), h('b', { text: m.holders != null ? String(m.holders) : '—' }))),
    l && l.status === 'curve' && m.progress != null ? h('div', { class: 'sc-bar', title: 'Graduates at 100%' }, h('i', { style: 'width:' + Math.min(100, m.progress * 100).toFixed(1) + '%' }),
      h('span', { text: (m.progress * 100).toFixed(1) + '% to graduation' })) : null,
    m.creatorKind === 'companion' ? h('p', { class: 'sc-note', text: 'Its creator is a program (a companion): its fees are spent by code' + (m.companion && m.companion.snowball ? ', trading its own pool (Snowball)' : '') + '.' }) : null) : null;

  /* 6. the holders: the biggest bags, the pool and the launch's reserve labelled */
  const holders = d.holders && d.holders.length ? card('E', 'Top holders', h('ol', { class: 'sc-holders' }, ...d.holders.slice(0, 10).map(x =>
    h('li', null, h('span', { class: 'sc-share' }, h('i', { style: 'width:' + Math.min(100, x.share * 100).toFixed(1) + '%' })),
      addr(x.owner, x.label ? { pool: 'The pool', launch: 'Launch reserve', creator: 'Creator' }[x.label] || x.label : null), h('b', { text: (x.share * 100).toFixed(2) + '%' }))))) : null;

  /* 7. the sell test */
  const st = d.sellTest;
  const sell = bordr && l ? card('F', 'Can a holder sell?', st ? h('p', { class: 'sc-test ' + (st.ok ? 'ok' : 'bad') }, h('b', { text: st.ok ? 'Yes. ' : 'No. ' }), st.words.replace(/^A holder can sell: /, ''))
    : h('p', { class: 'sc-note', text: 'No wallet to test a sell from yet.' })) : null;

  out.replaceChildren(...[verdict, h('div', { class: 'sc-actions', id: 'sc-actions' }), authorities, hook, rules, market, holders, sell].filter(Boolean));
  /* trade it here when it was launched on tweetpad; Bordrless's own page either way */
  const actions = $('sc-actions');
  if (bordr) actions.append(h('a', { class: 'btn', href: 'https://bordrless.app/token/' + d.mint, target: '_blank', rel: 'noopener' }, 'Bordrless ↗'));
  fetch('/api/launches?mint=' + d.mint).then(res => (res.ok ? res.json() : null)).then(o => {
    if (o && o.launch) actions.prepend(h('a', { class: 'btn primary', href: appUrl({ coin: d.mint }) }, 'Trade $' + o.launch.symbol + ' here'));
  }).catch(() => {});
}

async function scan(mint) {
  const out = $('sc-out'), go = $('sc-go');
  if (!isPubkey(mint)) { out.replaceChildren(h('p', { class: 'sc-err', text: 'That is not a Solana address.' })); return; }
  go.disabled = true; go.textContent = 'Scanning…';
  out.replaceChildren(h('p', { class: 'sc-note sc-wait', text: 'Reading the chain…' }));
  try {
    const res = await fetch('/api/bordrless?scan=' + mint);
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'HTTP ' + res.status);
    render(d);
    const u = new URL(location.href); u.searchParams.set('mint', mint); history.replaceState(null, '', u);
  } catch (err) {
    out.replaceChildren(h('p', { class: 'sc-err', text: String(err.message || err) }));
  } finally {
    go.disabled = false; go.textContent = 'Scan';
  }
}
$('sc-form').addEventListener('submit', (ev) => { ev.preventDefault(); scan($('sc-mint').value.trim()); });
const first = new URLSearchParams(location.search).get('mint');
if (first) { $('sc-mint').value = first; scan(first); }
})();
