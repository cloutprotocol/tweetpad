/* /autoclaim: the keeper's live numbers (api/autoclaim.js) and the way into tweetpad's profile, where it is turned on */
const $ = (id) => document.getElementById(id);
const short = (w) => w.slice(0, 4) + '…' + w.slice(-4);
const sol = (n) => !n ? '0' : n >= 100 ? n.toFixed(0) : n >= 1 ? n.toFixed(2) : n.toFixed(4);
const ago = (t) => { const s = Math.max(1, (Date.now() - t) / 1000 | 0); return s < 60 ? s + 's' : s < 3600 ? (s / 60 | 0) + 'm' : s < 86400 ? (s / 3600 | 0) + 'h' : (s / 86400 | 0) + 'd'; };

async function load() {
  try {
    const r = await (await fetch('/api/autoclaim')).json();
    if (r.error) throw new Error(r.error);
    $('ac-sol').textContent = sol(r.sol);
    $('ac-claims').textContent = r.claims.toLocaleString();
    $('ac-wallets').textContent = r.wallets.toLocaleString();
    $('ac-min').textContent = r.minSol;
    const feed = $('ac-feed');
    feed.replaceChildren(...(r.recent.length ? r.recent.map(c => {
      const li = document.createElement('li');
      const who = Object.assign(document.createElement('span'), { className: 'who', textContent: short(c.wallet) });
      const when = Object.assign(document.createElement('span'), { textContent: ago(c.at) + ' ago' });
      const amt = Object.assign(document.createElement('a'), { className: 'amt', href: 'https://solscan.io/tx/' + c.sig, target: '_blank', rel: 'noopener', textContent: '+' + sol(c.sol) + ' SOL ↗' });
      li.append(who, when, amt);
      return li;
    }) : [Object.assign(document.createElement('li'), { className: 'empty', textContent: 'No claims yet. Turn it on and yours is the first.' })]));
  } catch {
    for (const id of ['ac-sol', 'ac-claims', 'ac-wallets']) $(id).textContent = '—';
    $('ac-feed').replaceChildren(Object.assign(document.createElement('li'), { className: 'empty', textContent: 'Could not load the numbers just now.' }));
  }
}

/* tweetpad opens on its profile tab in a pop-out window, as the wallet pop-ups do; a blocked pop-up opens a tab instead */
$('ac-open').addEventListener('click', () => {
  const url = '/embed.html?tab=profile';
  const w = window.open(url, 'tweetpad', 'popup,width=440,height=640');
  if (w) w.focus(); else window.open(url, '_blank', 'noopener');
});

if (document.documentElement.dataset.mode !== 'card') { load(); setInterval(load, 30000); }

