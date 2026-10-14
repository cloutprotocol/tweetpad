// A Bordrless token's own page: /b/<mint> (rewritten here by vercel.json), its trading page and its X player card in one. X reads
// the tags to build a player card with the coin's own name and picture; the player loads the same page with ?embed, where the
// coin is bought and sold in the post (assets/b.js, through api/bordrless.js). Every number is read with the SDK from the chain
// (api/bordrless.js token()); the page carries the first read so it draws at once, then keeps itself fresh.
// GET /api/b?mint=<mint>         → the page (HTML)
// GET /api/b?mint=<mint>&img=1   → its card image, a 1080×1080 PNG in Bordrless's look (/b/<mint>/card.png), held 5 minutes at the CDN
const { isPubkey, rateLimit } = require('./_lib');

const SIZE = 1080;
const FRAME = "frame-ancestors 'self' https://x.com https://*.x.com https://twitter.com https://*.twitter.com";
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const usd = (n) => (n == null ? '—' : '$' + (n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n.toFixed(0)));
const pct = (bps) => bps / 100 + '%';
/* the rules a coin runs, in a few words each (the page and the card say them the same way) */
function ruleWords(t) {
  const l = t.launch;
  if (!l) return [];
  const r = l.rules;
  return [pct(l.feeBps) + ' creator fee',
    r.holderFeeBuyBps || r.holderFeeSellBps ? pct(Math.max(r.holderFeeBuyBps, r.holderFeeSellBps)) + ' to holders' : null,
    r.burnBuyBps || r.burnSellBps ? pct(Math.max(r.burnBuyBps, r.burnSellBps)) + ' burned' : null,
    r.maxWalletBps ? 'max wallet ' + pct(r.maxWalletBps) : null,
    r.creatorLockDays ? 'creator locked ' + r.creatorLockDays + ' d' : null].filter(Boolean);
}

/* ---------- the page ---------- */
function page(t, origin) {
  const url = origin + '/b/' + t.mint;
  const title = '$' + t.symbol + ' · ' + t.name;
  const description = (t.mcapUsd ? usd(t.mcapUsd) + ' market cap · ' : '') + ruleWords(t).join(' · ') + '. Buy and sell it right inside this post, on Bordrless.';
  /* the first read, for the script; "<" escaped so nothing in a name can close the tag */
  const data = JSON.stringify(t).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · tweetpad</title>
<link rel="icon" href="/assets/brand/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/assets/brand/tweetpad-hash-180.png">
<meta name="theme-color" content="#111111">
<script>document.documentElement.dataset.mode = /[?&]embed\\b/.test(location.search) ? 'embed' : /[?&]popup\\b/.test(location.search) ? 'popup' : 'page';</script>

<!-- posted on X, the coin trades in the post: the player card loads ?embed. Every URL must be absolute HTTPS. -->
<meta name="twitter:card" content="player">
<meta name="twitter:site" content="@tweetpad_io">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:player" content="${esc(url)}?embed">
<meta name="twitter:player:width" content="480">
<meta name="twitter:player:height" content="480">
<meta name="twitter:image" content="${esc(url)}/card.png">
<meta name="twitter:image:alt" content="${esc('$' + t.symbol + ' on Bordrless: ' + description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(url)}/card.png">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=JetBrains+Mono:wght@400;700&family=Space+Grotesk:wght@400;500;700&display=swap">
<link rel="stylesheet" href="/assets/feature.css">
<link rel="stylesheet" href="/assets/scan.css">
<link rel="stylesheet" href="/assets/b.css">
</head>
<body>
<a class="brand" href="/"><img src="/assets/brand/tweetpad-hash-180.png" alt="">tweetpad <span>· $${esc(t.symbol)}</span></a>
<main class="frame tall">
  <div class="head">
    <a class="home" href="/" id="b-home" title="Back to tweetpad"><span class="back" aria-hidden="true">‹</span><img class="gem" src="/assets/brand/tweetpad-hash-180.png" alt=""><span class="word">tweetpad</span></a>
    <h1 class="title"><span class="sc-dot" aria-hidden="true"></span>$${esc(t.symbol)}</h1>
  </div>
  <div class="scroll">
    <section class="b-coin" id="b-coin"></section>
    <canvas class="b-chart" id="b-chart" aria-label="Price, the last eight hours"></canvas>
    <section class="b-trade" id="b-trade"></section>
    <div id="b-parts"></div>
    <p class="fine">Read from the chain with Bordrless's SDK; candles and trades from <a href="https://bordrless.app" target="_blank" rel="noopener">Bordrless</a>'s
      indexer. Your wallet signs every trade; tweetpad takes nothing and holds nothing. A Bordrless holding isn't an SPL account: your wallet's
      token list won't show it, this page does.</p>
  </div>
</main>
<script id="b-data" type="application/json">${data}</script>
<script src="/assets/bkit.js"></script>
<script src="/assets/b.js"></script>
</body>
</html>`;
}
function missing(mint) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not a Bordrless token · tweetpad</title>
<link rel="stylesheet" href="/assets/feature.css"><link rel="stylesheet" href="/assets/scan.css"></head>
<body><main class="frame"><div class="head"><a class="home" href="/"><span class="back">‹</span><span class="word">tweetpad</span></a></div>
<div class="scroll"><p class="sc-err">${esc(mint)} is not a Bordrless token.</p><a class="btn" href="/scan?mint=${esc(mint)}">Scan it</a></div></main></body></html>`;
}

/* ---------- the card image ---------- */
let fonts = null;
async function loadFonts() {
  if (fonts) return fonts;
  const get = async (family, weight) => {
    const css = await (await fetch('https://fonts.googleapis.com/css2?family=' + family + ':wght@' + weight, { signal: AbortSignal.timeout(5000) })).text();
    const src = /src: url\((https:[^)]+)\)/.exec(css)[1];
    return { name: family.replace(/\+/g, ' '), weight, style: 'normal', data: await (await fetch(src, { signal: AbortSignal.timeout(5000) })).arrayBuffer() };
  };
  try { fonts = await Promise.all([get('Anton', 400), get('JetBrains+Mono', 700), get('Space+Grotesk', 500)]); }
  catch { fonts = []; }
  return fonts;
}
/* the coin's picture as a PNG data URI: from its own https link (Bordrless's pictures sit on a fast gateway), else through our
   cached IPFS proxy; a slow one leaves the letter in its place rather than stall the card */
async function picture(origin, image) {
  if (typeof image !== 'string') return null;
  const cid = /\/ipfs\/([A-Za-z0-9]+)/.exec(image);
  const tries = [/^https:\/\//.test(image) ? image : null, cid ? origin + '/api/image?cid=' + cid[1] + '&w=256' : null].filter(Boolean);
  for (const src of tries) {
    try {
      const r = await fetch(src, { signal: AbortSignal.timeout(5000) });
      const body = r.ok ? Buffer.from(await r.arrayBuffer()) : null;
      if (!body || body.length > 8 * 1024 * 1024) continue;
      const png = await require('sharp')(body, { animated: false }).resize(256, 256, { fit: 'cover' }).png().toBuffer();
      return 'data:image/png;base64,' + png.toString('base64');
    } catch { /* the next */ }
  }
  return null;
}
const el = (type, style, ...children) => ({ type, props: { style: { display: 'flex', ...style }, children: children.flat().filter(c => c != null && c !== false) } });
const img = (src, style) => ({ type: 'img', props: { src, style } });
async function card(t, origin) {
  const [list, pic] = await Promise.all([loadFonts(), picture(origin, t.image)]);
  const has = (n) => list.some(f => f.name === n);
  const head = has('Anton') ? 'Anton' : undefined, mono = has('JetBrains Mono') ? 'JetBrains Mono' : undefined, sans = has('Space Grotesk') ? 'Space Grotesk' : undefined;
  const ink = '#111', paper = '#e3e3df', card = '#f4f4f2';
  const change = t.market && t.market.change24h;
  const l = t.launch, curve = l && l.status === 'curve' && l.progress != null;
  const stat = (label, value, color) => el('div', { flexDirection: 'column', marginRight: 46 },
    el('div', { fontFamily: mono, fontSize: 24, color: '#6b6b66' }, label), el('div', { fontFamily: mono, fontSize: 46, color: color || ink, marginTop: 6 }, value));
  /* the coin above X's play button, its numbers and rules in a ruled card below it */
  const tree = el('div', { width: SIZE, height: SIZE, position: 'relative', flexDirection: 'column', backgroundColor: paper, fontFamily: sans },
    el('div', { position: 'absolute', top: 0, left: 0, right: 0, height: 92, backgroundColor: ink, alignItems: 'center', justifyContent: 'space-between', padding: '0 56px' },
      el('div', { fontFamily: head, fontSize: 46, color: '#fff' }, 'tweetpad'),
      el('div', { alignItems: 'center', backgroundColor: '#f2c230', padding: '10px 18px', fontFamily: mono, fontSize: 24, color: ink },
        el('div', { width: 14, height: 14, backgroundColor: ink, marginRight: 12 }), 'TRADE IN THIS POST')),
    el('div', { position: 'absolute', top: 150, left: 70, right: 70, alignItems: 'center' },
      pic ? img(pic, { width: 200, height: 200, border: '6px solid ' + ink, boxShadow: '12px 12px 0 ' + ink, objectFit: 'cover' })
        : el('div', { width: 200, height: 200, border: '6px solid ' + ink, boxShadow: '12px 12px 0 ' + ink, backgroundColor: '#cfcfca', alignItems: 'center', justifyContent: 'center',
            fontFamily: head, fontSize: 110, color: ink }, t.symbol.slice(0, 1)),
      el('div', { flexDirection: 'column', marginLeft: 50, maxWidth: 680 },
        el('div', { fontFamily: head, fontSize: t.symbol.length > 7 ? 104 : 136, color: ink, lineHeight: 1 }, '$' + t.symbol),
        el('div', { fontSize: 40, color: '#3b3b38', marginTop: 12 }, t.name.length > 26 ? t.name.slice(0, 25) + '…' : t.name),
        el('div', { marginTop: 18, alignItems: 'center' },
          el('div', { backgroundColor: ink, color: '#fff', fontFamily: mono, fontSize: 22, padding: '6px 10px' }, 'BORDRLESS'),
          el('div', { fontFamily: mono, fontSize: 24, color: '#6b6b66', marginLeft: 14 }, t.mint.slice(0, 4) + '…' + t.mint.slice(-4))))),
    el('div', { position: 'absolute', left: 70, right: 70, top: 690, flexDirection: 'column', padding: '28px 36px', backgroundColor: card, border: '5px solid ' + ink, boxShadow: '14px 14px 0 ' + ink },
      el('div', { alignItems: 'flex-end' },
        stat('MARKET CAP', usd(t.mcapUsd)),
        change != null ? stat('24H', (change >= 0 ? '+' : '−') + Math.abs(change).toFixed(1) + '%', change >= 0 ? '#1f9d47' : '#d92d2d') : null,
        t.market && t.market.holders != null ? stat('HOLDERS', String(t.market.holders)) : null),
      curve ? el('div', { marginTop: 20, height: 30, border: '4px solid ' + ink, backgroundColor: '#d4d4cf', position: 'relative' },
        el('div', { width: Math.max(2, Math.round(l.progress * 100)) + '%', height: '100%', backgroundColor: ink }),
        el('div', { position: 'absolute', right: 10, top: -2, fontFamily: mono, fontSize: 20, color: l.progress > .8 ? '#fff' : ink }, Math.round(l.progress * 100) + '% TO GRADUATION')) : null,
      el('div', { marginTop: 22, flexWrap: 'wrap' }, ...ruleWords(t).slice(0, 4).map(w => el('div', { fontFamily: mono, fontSize: 22, color: ink, backgroundColor: '#cfcfca',
        padding: '6px 10px', marginRight: 12, marginBottom: 6 }, w.toUpperCase())))));
  const { ImageResponse } = await import('@vercel/og');
  return Buffer.from(await new ImageResponse(tree, { width: SIZE, height: SIZE, fonts: list.length ? list : undefined }).arrayBuffer());
}

module.exports = async (req, res) => {
  const q = req.query || {};
  const mint = String(q.mint || '');
  const origin = (req.headers['x-forwarded-proto'] || 'https').split(',')[0] + '://' + (req.headers['x-forwarded-host'] || req.headers.host || 'www.tweetpad.io');
  if (!isPubkey(mint)) { res.setHeader('content-type', 'text/html; charset=utf-8'); return res.status(404).send(missing(mint)); }
  let t = null;
  try { t = await require('./bordrless').token(mint); } catch { /* not a Bordrless token, or the chain is busy */ }
  if (q.img != null) {
    if (!t) return res.redirect(302, origin + '/preview.png');
    if (!await rateLimit(req, res, 'cardimg', 200, 600)) return;
    try {
      const png = await card(t, origin);
      res.setHeader('content-type', 'image/png');
      res.setHeader('cache-control', 'public, s-maxage=300, stale-while-revalidate=3600');
      return res.status(200).send(png);
    } catch {
      res.setHeader('cache-control', 'public, s-maxage=30');
      return res.redirect(302, origin + '/preview.png');
    }
  }
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('content-security-policy', FRAME);
  if (!t) { res.setHeader('cache-control', 'public, s-maxage=30'); return res.status(404).send(missing(mint)); }
  res.setHeader('cache-control', 'public, s-maxage=30, stale-while-revalidate=300');
  return res.status(200).send(page(t, origin));
};
