/* tweetpad agent kit v1: the research browser. A small window of real tweetpad pages that the agent "reads" (its address typed in,
   a load bar, the page scrolled while its cursor moves), with what it finds listed underneath. Token pages come with findings read
   from /api/token (DexScreener, and Jupiter's audit on Solana). Styles are in /kit/v1/kit.css.
     import { createBrowser } from '/kit/v1/browser.js';
     const browser = createBrowser(document.body, { title: "Dot's browser", tour });
     const t = await browser.research({ token: address });   // jumps the queue; resolves with what it found (or null)
     browser.seeing                                           // one line about what's on screen, for the model
   A tour is a loop of tasks it reads while nobody asks for anything: { token } or { page, title, notes: [html] }. */
const TP = 'BctFsB2NaoKZcqXxhFFvDAJ4vdgxuunsg1g5m8CSEQDN';
export const KNOWN = { tp: TP, wif: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', bonk: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  pepe: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', cake: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82' };
export const TOUR = [{ token: TP }, { page: '/games?embed', title: 'Games', notes: ['🎲 <b>Pump or Dump</b> and <b>Mines</b>, on Gamba', '🔒 every result settled on chain'] },
  { token: KNOWN.wif }, { page: '/borderless?embed', title: 'Bordrless', notes: ['🧩 tokens with their own rules', '📜 fees, burns and rewards run in every trade'] },
  { token: KNOWN.pepe }, { token: KNOWN.bonk }];

export const usd = (n) => (n == null ? '—' : n >= 1e9 ? '$' + (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? '$' + (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? '$' + (n / 1e3).toFixed(1) + 'K' : '$' + n.toFixed(2));
export const num = (n) => (n == null ? '—' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n));
const pct = (n) => (n == null ? '' : `<span class="${n >= 0 ? 'up' : 'dn'}">${n >= 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(1)}%</span>`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* "research $WIF", "look up bonk", or any address in a message: the token to go and read, or null */
const ADDR = /\b(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})\b/;
export function tokenIn(text) {
  const a = ADDR.exec(text);
  if (a) return a[1];
  const sym = /\$([a-z]{2,10})\b/i.exec(text) || (/\b(research|look ?up|check|find)\b/i.test(text) && /\b(tp|wif|bonk|pepe|cake)\b/i.exec(text));
  return (sym && KNOWN[sym[1].toLowerCase()]) || null;
}

export function createBrowser(parent, { title = 'Browser', tour = TOUR, still = matchMedia('(prefers-reduced-motion: reduce)').matches } = {}) {
  const root = document.createElement('aside');
  root.className = 'kit-browser'; root.setAttribute('aria-label', title);
  root.innerHTML = `<div class="chrome"><i></i><i></i><i></i><b><span class="mini" aria-hidden="true"></span>${esc(title)}</b><span class="live">LIVE</span></div>
    <div class="url">tweetpad.io</div><div class="bar"><div></div></div>
    <div class="view"><div class="blank">opening…</div><span class="cursor" style="left:40%;top:40%"></span></div><div class="notes" aria-live="polite"></div>`;
  parent.append(root);
  const $ = (s) => root.querySelector(s);
  const bv = { url: $('.url'), bar: $('.bar div'), view: $('.view'), blank: $('.blank'), cur: $('.cursor'), notes: $('.notes') };
  const queue = [];
  let at = 0, shown = null;
  const api = { seeing: '', root };

  const note = (html) => { const p = document.createElement('p'); p.innerHTML = html; bv.notes.append(p); };
  const doing = (text) => { bv.notes.replaceChildren(Object.assign(document.createElement('div'), { className: 'doing', innerHTML: esc(text) + ' <span class="dots"><i></i><i></i><i></i></span>' })); };
  async function typeUrl(text) { bv.url.textContent = ''; for (const ch of text) { bv.url.textContent += ch; await wait(still ? 0 : 18); } }
  function wander() { bv.cur.style.left = (15 + Math.random() * 70) + '%'; bv.cur.style.top = (15 + Math.random() * 70) + '%'; }
  async function open(path) {
    bv.bar.style.width = '15%'; bv.blank.style.opacity = 1; bv.blank.textContent = 'loading…';
    const k = bv.view.clientWidth / 480;
    const next = Object.assign(document.createElement('iframe'), { src: path, title, tabIndex: -1 });
    next.style.transform = `scale(${k})`; next.style.height = (bv.view.clientHeight / k) + 'px';
    next.setAttribute('aria-hidden', 'true');
    const loaded = new Promise((r) => { next.addEventListener('load', r, { once: true }); setTimeout(r, 6000); });
    bv.view.append(next); bv.bar.style.width = '60%';
    await loaded; bv.bar.style.width = '100%'; bv.blank.style.opacity = 0;
    shown?.remove(); shown = next;
    setTimeout(() => { bv.bar.style.width = '0'; }, 400);
  }
  async function read(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      wander();
      try { shown.contentWindow.scrollBy({ top: 70, behavior: still ? 'auto' : 'smooth' }); } catch { /* not ours to scroll */ }
      await wait(1100);
    }
  }
  async function visit(task) {
    if (task.page) {
      doing('reading ' + task.title);
      await typeUrl('tweetpad.io' + task.page.replace('?embed', ''));
      await open(task.page);
      api.seeing = 'tweetpad ' + task.title + ' page';
      for (const n of task.notes) { await wait(700); note(n); }
      await read(5000);
      return null;
    }
    const address = task.token;
    doing('looking up ' + address.slice(0, 4) + '…' + address.slice(-4));
    let t = null;
    try {
      const f = await (await fetch('/api/token?find=' + address)).json();
      if (f.short) t = await (await fetch('/api/token?chain=' + f.short + '&address=' + address)).json();
    } catch { /* nothing found */ }
    if (!t || !t.market) {
      await typeUrl('tweetpad.io/t/' + address.slice(0, 6) + '…'); await open('/t/' + address + '?embed');
      api.seeing = 'no market found for ' + address + ' on tweetpad chains';
      note('🤔 no market for that on our chains'); await read(3000); return null;
    }
    doing('reading $' + t.symbol);
    await typeUrl('tweetpad.io/' + t.short + '/' + address.slice(0, 4) + '…' + address.slice(-4));
    await open('/' + t.short + '/' + address + '?embed');
    const m = t.market, a = t.audit || {};
    api.seeing = `$${t.symbol} on ${t.chainName}: ${usd(m.mcap)} market cap, ${m.change24h == null ? '' : (m.change24h >= 0 ? 'up ' : 'down ') + Math.abs(m.change24h).toFixed(1) + '% in 24h, '}`
      + `${usd(m.liquidity)} liquidity, ${usd(m.volume24h)} 24h volume${m.holders ? ', ' + num(m.holders) + ' holders' : ''}`
      + (a.mintOff != null ? `, mint ${a.mintOff ? 'off' : 'on'}, freeze ${a.freezeOff ? 'off' : 'on'}` : '') + ' (source: DexScreener via tweetpad)';
    await wait(500); note(`📈 <b>$${esc(t.symbol)}</b> on ${esc(t.chainName)} · ${usd(m.mcap)} mcap ${pct(m.change24h)}`);
    await wait(700); note(`💧 ${usd(m.liquidity)} liquidity · ${usd(m.volume24h)} 24h volume`);
    if (m.holders) { await wait(700); note(`👥 ${num(m.holders)} holders`); }
    if (a.mintOff != null) { await wait(700); note(`${a.mintOff && a.freezeOff ? '✅' : '⚠️'} mint ${a.mintOff ? 'off' : 'on'} · freeze ${a.freezeOff ? 'off' : 'on'}`); }
    await read(4500);
    return t;
  }
  (async function loop() {
    for (;;) {
      const task = queue.shift() || (tour.length ? tour[at++ % tour.length] : null);
      if (!task) { await wait(1000); continue; }
      const t = await visit(task).catch(() => null);
      if (task.done) task.done(t);
      await wait(800);
    }
  })();
  /* a visitor's ask goes next; it resolves once the browser has read the page */
  api.research = (task) => new Promise((done) => queue.unshift({ ...task, done }));
  return api;
}
