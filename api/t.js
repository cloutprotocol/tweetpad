// Any token's own page on the chains tweetpad runs on: /<chain>/<address> (sol, rh, bnb, base, eth; rewritten here by vercel.json),
// its trading page and its X player card in one, the way a Bordrless token has /b/<mint>. X reads the tags to build a player card
// with the token's own name and picture and its chain on the card image; the player loads the same page with ?embed, where the token
// is bought and sold in the post (assets/t.js: Jupiter on Solana, KyberSwap through api/token.js on the EVM chains). The page carries
// the first read (api/token.js token()) so it draws at once, then keeps itself fresh.
// A coin launched on tweetpad opens its own coin card (/c/<address>) instead, and a Bordrless token its /b/<mint>.
// GET /api/t?chain&address         → the page (HTML)
// GET /api/t?chain&address&img=1   → its card image, a 1080×1080 PNG in the 2012 skin with the chain on it (/<chain>/<address>/card.png)
// GET /api/t?find=<address>        → /t/<address>: to the token's page on the chain it trades on (a Solana address is Solana's)
//                                    (nothing found: home, the Menu; a bare /t or /t/ goes to $TP's card, vercel.json)
const { isPubkey, isEvmAddress, redis, rateLimit } = require('./_lib');
const { token, findChain, chainOf, fitsChain, SHORT, NAME } = require('./token');

const SIZE = 1080;
const FRAME = "frame-ancestors 'self' https://x.com https://*.x.com https://twitter.com https://*.twitter.com";
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const usd = (n) => (n == null ? '—' : '$' + (n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n.toFixed(0)));
const count = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : Math.round(n).toLocaleString('en-US'));
const short = (a) => a.slice(0, 4) + '…' + a.slice(-4);
/* the chain's colours, as the app badges a coin with them (tweetpad.css .chain-badge), and its mark from the app's own logos */
const LOOK = {
  solana: { bg: '#000000', fg: '#ffffff', logo: 'solana.svg', own: true },
  robinhood: { bg: '#ccff00', fg: '#000000', logo: 'robinhood.png' },
  bnb: { bg: '#f0b90b', fg: '#ffffff', logo: 'bnb.svg' },
  base: { bg: '#0000ff', fg: '#ffffff', logo: 'base.svg' },
  ethereum: { bg: '#627eea', fg: '#ffffff', logo: 'ethereum.svg' },
};

/* ---------- the page ---------- */
function page(t, origin) {
  const url = origin + '/' + t.short + '/' + t.address;
  const title = '$' + t.symbol + ' · ' + t.name;
  const m = t.market || {};
  const description = (m.mcap ? usd(m.mcap) + ' market cap on ' + t.chainName : 'On ' + t.chainName) + '. Buy and sell it right inside this post.';
  /* the first read, for the script; "<" escaped so nothing in a name can close the tag */
  const data = JSON.stringify(t).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} on ${esc(t.chainName)} · tweetpad</title>
<link rel="icon" href="/assets/brand/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/assets/brand/tweetpad-hash-180.png">
<meta name="theme-color" content="#1da1f2">
<script>document.documentElement.dataset.mode = /[?&]embed\\b/.test(location.search) ? 'embed' : /[?&]popup\\b/.test(location.search) ? 'popup' : 'page';</script>

<!-- posted on X, the token trades in the post: the player card loads ?embed. Every URL must be absolute HTTPS. -->
<meta name="twitter:card" content="player">
<meta name="twitter:site" content="@tweetpad_io">
<meta name="twitter:title" content="${esc(title)} · ${esc(t.chainName)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:player" content="${esc(url)}?embed">
<meta name="twitter:player:width" content="480">
<meta name="twitter:player:height" content="480">
<meta name="twitter:image" content="${esc(url)}/card.png">
<meta name="twitter:image:alt" content="${esc('$' + t.symbol + ' on ' + t.chainName + ': ' + description)}">
<meta property="og:title" content="${esc(title)} · ${esc(t.chainName)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(url)}/card.png">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600&display=swap">
<link rel="stylesheet" href="/assets/feature.css">
<link rel="stylesheet" href="/assets/t.css">
</head>
<body>
<a class="brand" href="/"><img src="/assets/brand/tweetpad-hash-180.png" alt="">tweetpad <span>· $${esc(t.symbol)} on ${esc(t.chainName)}</span></a>
<main class="frame">
  <div class="head">
    <a class="home" href="/" id="t-home" title="Back to tweetpad"><span class="back" aria-hidden="true">‹</span><img class="gem" src="/assets/brand/tweetpad-hash-180.png" alt=""><span class="word">tweetpad</span></a>
    <h1 class="title"><span class="t-net ${esc(t.short)}" title="${esc(t.chainName)}"><span class="t-mark ${esc(t.short)}" aria-hidden="true"></span></span>$${esc(t.symbol)}</h1>
  </div>
  <div class="scroll">
    <section class="t-coin" id="t-coin"></section>
    <section class="t-chart"><div class="t-tf" id="t-tf"></div><canvas id="t-chart" aria-label="Price chart"></canvas></section>
    <section class="t-trade" id="t-trade"></section>
    <div id="t-parts"></div>
    <p class="fine">Prices from DexScreener${t.chain === 'solana' ? ' and Jupiter' : ''}, the chart and trades from GeckoTerminal. Routed by
      ${t.chain === 'solana' ? 'Jupiter' : 'KyberSwap'}; your wallet signs every trade, and tweetpad takes nothing and holds nothing. Any token can be
      launched by anyone: check it before you buy.</p>
  </div>
</main>
<script id="t-data" type="application/json">${data}</script>
<script src="/assets/bkit.js"></script>
<script src="/assets/t.js"></script>
</body>
</html>`;
}
function missing(chain, address) {
  const where = chain ? NAME[chain] : 'the chains tweetpad runs on';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>No token here · tweetpad</title>
<script>document.documentElement.dataset.mode = /[?&]embed\\b/.test(location.search) ? 'embed' : 'page';</script>
<link rel="stylesheet" href="/assets/feature.css"></head>
<body><main class="frame"><div class="head"><a class="home" href="/"><span class="back">‹</span><span class="word">tweetpad</span></a></div>
<div class="scroll"><p class="lede">No token at <b>${esc(address)}</b> on ${esc(where)}. A link is <b>tweetpad.io/&lt;chain&gt;/&lt;token address&gt;</b>, the chain one of
sol, rh, bnb, base or eth (or <b>tweetpad.io/t/&lt;address&gt;</b> to find it).</p></div></main></body></html>`;
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
  try { fonts = await Promise.all([get('Fredoka', 600), get('Inter', 400), get('Inter', 700)]); }
  catch { fonts = []; }   // @vercel/og's built-in font still draws everything
  return fonts;
}
/* PNG data URIs, made with sharp (satori reads PNG and JPEG): the token's picture, the app icon and each chain's mark in its colours,
   the marks and the icon kept per instance; a slow picture leaves the letter in its place rather than stall the card */
const kept = {};
const dataUri = (png) => 'data:image/png;base64,' + png.toString('base64');
async function fetched(src, max = 8 * 1024 * 1024) {
  const r = await fetch(src, { signal: AbortSignal.timeout(5000) });
  const body = r.ok ? Buffer.from(await r.arrayBuffer()) : null;
  return body && body.length <= max ? body : null;
}
async function picture(image) {
  if (typeof image !== 'string' || !/^https:\/\//.test(image)) return null;
  try {
    const body = await fetched(image);
    return body ? dataUri(await require('sharp')(body, { animated: false }).resize(256, 256, { fit: 'cover' }).png().toBuffer()) : null;
  } catch { return null; }
}
async function chainMark(origin, chain) {
  if (kept[chain]) return kept[chain];
  const look = LOOK[chain], sharp = require('sharp');
  try {
    let body = await fetched(origin + '/assets/' + look.logo, 256 * 1024);
    if (!body) return null;
    /* the app's marks are one-colour masks: drawn here in the chain's foreground (Solana's keeps its own gradient) */
    if (/\.svg$/.test(look.logo)) body = await sharp(look.own ? body : Buffer.from(body.toString('utf8').replace('<svg ', '<svg fill="' + look.fg + '" ')), { density: 300 })
      .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    else body = await sharp({ create: { width: 128, height: 128, channels: 4, background: look.fg } })
      .composite([{ input: await sharp(body).resize(128, 128).png().toBuffer(), blend: 'dest-in' }]).png().toBuffer();
    return (kept[chain] = dataUri(body));
  } catch { return null; }
}
async function appIcon(origin) {
  if (kept.icon) return kept.icon;
  try { const body = await fetched(origin + '/assets/brand/tweetpad-hash-256.png'); return body ? (kept.icon = dataUri(body)) : null; } catch { return null; }
}
const el = (type, style, ...children) => ({ type, props: { style: { display: 'flex', ...style }, children: children.flat().filter(c => c != null && c !== false) } });
const img = (src, style) => ({ type: 'img', props: { src, style } });
async function card(t, origin) {
  const [list, pic, mark, icon] = await Promise.all([loadFonts(), picture(t.image), chainMark(origin, t.chain), appIcon(origin)]);
  const sans = list.length ? 'Inter' : undefined, round = list.length ? 'Fredoka' : sans;
  const look = LOOK[t.chain], m = t.market || {};
  const change = m.change1h != null ? m.change1h : m.change24h, changeLabel = m.change1h != null ? '1h' : '24h';
  /* the chain, as a pill in its colours: on the bar, and again by the token's name */
  const pill = (size) => el('div', { alignItems: 'center', backgroundColor: look.bg, color: look.fg, borderRadius: size, padding: Math.round(size * .28) + 'px ' + Math.round(size * .6) + 'px ' + Math.round(size * .28) + 'px ' + Math.round(size * .34) + 'px',
      boxShadow: '0 2px 6px rgba(0,0,0,.25)', border: t.chain === 'solana' ? '2px solid #333' : '2px solid rgba(0,0,0,.12)' },
    mark ? img(mark, { width: size, height: size }) : null,
    el('div', { marginLeft: Math.round(size * .3), fontSize: Math.round(size * .78), fontWeight: 700, letterSpacing: 0.5 }, t.chainName));
  const tree = el('div', { width: SIZE, height: SIZE, position: 'relative', flexDirection: 'column', alignItems: 'center', fontFamily: sans,
      backgroundImage: 'radial-gradient(circle at 50% 50%, #ffffff 0px, #f3f6f8 260px, #dfe4e8 760px)' },
    /* the app's blue bar: tweetpad, and the chain it trades on */
    el('div', { position: 'absolute', top: 0, left: 0, right: 0, height: 104, alignItems: 'center', justifyContent: 'space-between', padding: '0 44px',
        backgroundImage: 'linear-gradient(#63b8ee, #3c9ad9 50%, #2b86cc)', borderBottom: '3px solid #1d6aa5' },
      el('div', { alignItems: 'center' }, icon ? img(icon, { width: 62, height: 62 }) : null,
        el('div', { marginLeft: 14, fontSize: 48, color: '#fff', fontFamily: round, fontWeight: 600 }, 'tweetpad')),
      pill(46)),
    /* the token, above X's play button */
    el('div', { position: 'absolute', top: 170, left: 0, right: 0, flexDirection: 'column', alignItems: 'center' },
      el('div', { alignItems: 'center' },
        el('div', { position: 'relative', width: 184, height: 184 },
          pic ? img(pic, { width: 184, height: 184, borderRadius: 34, objectFit: 'cover', boxShadow: '0 6px 16px rgba(0,0,0,.25)' })
            : el('div', { width: 184, height: 184, borderRadius: 34, backgroundColor: '#2b86cc', color: '#fff', fontSize: 96, fontWeight: 700,
                alignItems: 'center', justifyContent: 'center' }, t.symbol.slice(0, 1).toUpperCase()),
          /* the chain's badge on the picture's corner, as the app badges every coin */
          el('div', { position: 'absolute', right: -14, bottom: -14, width: 70, height: 70, borderRadius: 35, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center',
              border: '5px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,.3)' }, mark ? img(mark, { width: t.chain === 'base' ? 30 : 40, height: t.chain === 'base' ? 30 : 40 }) : null)),
        el('div', { flexDirection: 'column', marginLeft: 44, maxWidth: 640 },
          el('div', { fontSize: t.symbol.length > 8 ? 84 : 104, fontWeight: 700, color: '#2f2f2f', letterSpacing: -2, lineHeight: 1 }, '$' + t.symbol),
          el('div', { fontSize: 42, color: '#777', marginTop: 10, lineHeight: 1.1 }, t.name.length > 24 ? t.name.slice(0, 23) + '…' : t.name),
          el('div', { fontSize: 28, color: '#999', marginTop: 12 }, short(t.address))))),
    /* the numbers, as a 2012 tweet card, below it */
    el('div', { position: 'absolute', left: 100, right: 100, top: 750, alignItems: 'center', padding: '26px 34px', backgroundColor: '#fff',
        border: '2px solid #c8c8c8', borderRadius: 14, boxShadow: '0 4px 10px rgba(0,0,0,.12)' },
      el('div', { flexDirection: 'column', flexGrow: 1, flexShrink: 1, minWidth: 0 },
        el('div', { alignItems: 'baseline' },
          el('div', { fontSize: 56, fontWeight: 700, color: '#333' }, usd(m.mcap)),
          change != null ? el('div', { fontSize: 36, fontWeight: 700, marginLeft: 18, color: change >= 0 ? '#2e9e4f' : '#d0343a' },
            (change >= 0 ? '▲ ' : '▼ ') + Math.abs(change).toFixed(1) + '% ' + changeLabel) : null),
        el('div', { fontSize: 28, color: '#999', marginTop: 8 }, ['market cap', m.liquidity ? usd(m.liquidity) + (m.holders ? ' liq' : ' liquidity') : null,
          m.holders ? count(m.holders) + ' holders' : null].filter(Boolean).join(' · '))),
      el('div', { flexDirection: 'column', alignItems: 'center', flexShrink: 0, marginLeft: 20, padding: '12px 18px', borderRadius: 12,
          backgroundImage: 'linear-gradient(#33bcef, #019ad2)', border: '2px solid #057ed0' },
        el('div', { fontSize: 26, fontWeight: 700, color: '#fff' }, 'TRADE IN'),
        el('div', { fontSize: 26, fontWeight: 700, color: '#fff' }, 'THIS POST'))));
  const { ImageResponse } = await import('@vercel/og');
  return Buffer.from(await new ImageResponse(tree, { width: SIZE, height: SIZE, fonts: list.length ? list : undefined }).arrayBuffer());
}

/* a coin launched here has its own coin card, a Bordrless token its own page: the same frame (?embed, ?popup) goes along */
function elsewhere(req, res, to) {
  res.setHeader('cache-control', 'public, s-maxage=60');
  return res.redirect(302, to);
}

module.exports = async (req, res) => {
  const q = req.query || {};
  const origin = (req.headers['x-forwarded-proto'] || 'https').split(',')[0] + '://' + (req.headers['x-forwarded-host'] || req.headers.host || 'www.tweetpad.io');
  const frame = q.embed != null ? 'embed' : q.popup != null ? 'popup' : '';
  /* /t/<address>: find its chain, then its page. The link gets posted (and X links a bare or mistyped one too), so one that finds
     nothing goes home to the Menu, which plays as a card, rather than to an error */
  if (q.find != null) {
    const address = String(q.find);
    let chain = null;
    if (isPubkey(address) || isEvmAddress(address)) chain = await findChain(address).catch(() => null);
    if (!chain) return elsewhere(req, res, frame ? '/?' + frame : '/');
    return elsewhere(req, res, '/' + SHORT[chain] + '/' + address + (frame ? '?' + frame : ''));
  }
  const chain = chainOf(String(q.chain || ''));
  let address = String(q.address || '');
  if (!chain || !fitsChain(chain, address)) { res.setHeader('content-type', 'text/html; charset=utf-8'); return res.status(404).send(missing(chain, address)); }
  if (chain !== 'solana') address = require('./_evm').getAddress(address);
  if (q.img == null) {
    let listed = null;
    try { [listed] = await redis(['GET', 'launch:' + address]); } catch { /* treat it as any token */ }
    if (listed) return elsewhere(req, res, frame ? '/embed.html?' + new URLSearchParams({ ...(frame === 'popup' && { mode: 'popup' }), coin: address }) : '/c/' + address);
  }
  let t = null;
  try { t = await token(chain, address); } catch { /* the chain or DexScreener is busy */ }
  /* not an SPL mint: a Bordrless token, maybe */
  if (!t && chain === 'solana' && q.img == null) {
    const bordr = await require('./bordrless').launchRecord(address).catch(() => null);
    if (bordr) return elsewhere(req, res, '/b/' + address + (frame ? '?' + frame : ''));
  }
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
  if (!t) { res.setHeader('cache-control', 'public, s-maxage=30'); return res.status(404).send(missing(chain, address)); }
  res.setHeader('cache-control', 'public, s-maxage=30, stale-while-revalidate=300');
  return res.status(200).send(page(t, origin));
};
module.exports.LOOK = LOOK;
module.exports.chainMark = chainMark;
