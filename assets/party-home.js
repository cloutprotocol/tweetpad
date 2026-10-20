/* tweetpad.io/party: the parties open now and the ones that launched (api/parties.js, Solana mainnet), and the way in (/party/new).
   In X's card (?embed) it's the open parties and a button to throw one; every link opens a new tab, since the card can't sign. */
const $ = (id) => document.getElementById(id);
const MODE = document.documentElement.dataset.mode, SITE = 'https://www.tweetpad.io';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sol = (n) => (n >= 100 ? n.toFixed(0) : n >= 1 ? n.toFixed(2) : n.toFixed(n >= 0.1 ? 3 : 4)).replace(/\.?0+$/, '');
const usd = (n) => (n >= 1e6 ? '$' + (n / 1e6).toFixed(1) + 'M' : n >= 1000 ? '$' + (n / 1000).toFixed(n >= 1e4 ? 0 : 1) + 'K' : '$' + n.toFixed(0));
const ago = (t) => { const s = Math.max(0, Math.floor(Date.now() / 1000) - t); return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + ' min ago' : s < 86400 ? Math.floor(s / 3600) + ' h ago' : Math.floor(s / 86400) + ' d ago'; };
const TARGET = MODE === 'embed' ? ' target="_blank" rel="noopener"' : '';
let solUsd = 0, data = null;

if (MODE === 'embed') for (const a of document.querySelectorAll('a[href^="/"]')) { a.href = SITE + a.getAttribute('href'); a.target = '_blank'; a.rel = 'noopener'; }

/* a coin's face: its picture, or its ticker's letter on a colour of its own */
const face = (p) => {
  const hue = [...p.room].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 360, 7);
  return `<span class="lface" style="--h:${hue}">${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<em>${esc((p.symbol || '?')[0])}</em></span>`;
};
const who = (p) => (p.gated ? 'Whitelist' : p.maxPerWallet ? `Up to ${p.maxPerWallet} a wallet` : 'Anyone can join');

function render() {
  if (!data) return;
  const { open, launched } = data, max = MODE === 'embed' ? 3 : 60;
  $('live').hidden = !open.length; $('live').lastElementChild.textContent = `${open.length} open now`;
  $('open-n').textContent = open.length ? `${open.length} ${open.length === 1 ? 'party' : 'parties'}` : '';
  $('open-list').innerHTML = open.length ? open.slice(0, max).map((p) => {
    const price = Number(p.seatPrice) / 1e9, fill = (p.active * 100) / p.capacity;
    return `<li><a href="/p/${p.room}"${TARGET}>${face(p)}<span class="lname"><b>${esc(p.name)}</b><small>$${esc(p.symbol)} · ${sol(price)} SOL a seat${solUsd ? ` (≈ ${usd(price * solUsd)})` : ''} · ${who(p)}</small></span>`
      + `<span class="lseats"><b>${p.active}<small>/${p.capacity}</small></b><i><u style="width:${fill}%"></u></i></span></a></li>`;
  }).join('') : `<li class="empty"><span class="empty-seats" aria-hidden="true">${'<i></i>'.repeat(5)}</span><span>No parties are open right now.</span><a class="ghost" href="${MODE === 'embed' ? SITE : ''}/party/new"${TARGET}>Throw a party</a></li>`;
  $('launched').hidden = !launched.length || (MODE === 'embed' && open.length >= 2);
  $('launched-n').textContent = launched.length ? `${launched.length} ${launched.length === 1 ? 'coin' : 'coins'}` : '';
  $('launched-list').innerHTML = launched.slice(0, MODE === 'embed' ? Math.max(1, 3 - open.length) : 30).map((p) => {
    const mcap = p.mcapSol === null ? '' : solUsd ? usd(p.mcapSol * solUsd) : sol(p.mcapSol) + ' SOL';
    return `<li><a href="/p/${p.room}"${TARGET}>${face(p)}<span class="lname"><b>${esc(p.name)}</b><small>$${esc(p.symbol)} · a party of ${p.party} · ${ago(p.launchedAt)}</small></span>`
      + `<span class="lmcap"><b>${mcap || '—'}</b><small>${p.complete ? 'Graduated' : p.curvePct === null ? '' : `${p.curvePct >= 10 ? p.curvePct.toFixed(0) : p.curvePct.toFixed(1)}% of the curve`}</small></span></a></li>`;
  }).join('');
}

async function load() {
  try { const r = await fetch('/api/parties'); if (r.ok) { data = await r.json(); render(); } else throw new Error(); }
  catch { if (!data) $('open-list').innerHTML = '<li class="empty">Couldn’t load the parties. Refresh in a moment.</li>'; }
}
fetch('/api/agent-topup?prices').then((r) => r.json()).then((j) => { solUsd = Number(j.solUsd) || 0; render(); }).catch(() => {});

/* tweets tag @pumpfun rather than write pump.fun, so the post's card is this page's */
$('share').onclick = () => window.open('https://x.com/intent/post?text=' + encodeURIComponent('Launch Party on tweetpad: launch a coin on @pumpfun with your friends. Seats at one price, refundable until launch. Powered by @launchpartyV4\n' + SITE + '/party'), '_blank', 'noopener');
setInterval(() => { if (!document.hidden) load(); }, 20000);
load();
