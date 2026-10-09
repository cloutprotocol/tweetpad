// The X card image for one coin: /api/card-image?mint=<mint>, a 1080×1080 PNG in the 2012 skin. X draws its play button
// over the middle, so the coin sits above the middle and the numbers card below it; where there's no play button
// (other sites, chats) the two read as one balanced poster. Rendered with @vercel/og (satori + resvg, its own font handling, so no system fonts are needed) and held
// at the CDN for 5 minutes, so the market cap is fresh when a post is first shared without rendering per view.
const { isPubkey, redis, marketData, rateLimit } = require('./_lib');

const SIZE = 1080;
/* the app icon from the hash kit, fetched from our own assets once per instance and inlined */
let appIcon = null;
async function appIconUri(origin) {
  if (appIcon) return appIcon;
  try {
    const r = await fetch(origin + '/assets/brand/tweetpad-hash-256.png', { signal: AbortSignal.timeout(5000) });
    if (r.ok) appIcon = 'data:image/png;base64,' + Buffer.from(await r.arrayBuffer()).toString('base64');
  } catch { /* the bird stands in */ }
  return appIcon;
}
const BIRD = 'M250 87.974c-7.358 3.264-15.267 5.469-23.566 6.461 8.471-5.078 14.978-13.119 18.041-22.701-7.929 4.703-16.71 8.117-26.057 9.957-7.484-7.975-18.148-12.957-29.95-12.957-22.66 0-41.033 18.371-41.033 41.031 0 3.216.363 6.348 1.062 9.351-34.102-1.711-64.336-18.047-84.574-42.872-3.532 6.06-5.556 13.108-5.556 20.628 0 14.236 7.244 26.795 18.254 34.153-6.726-.213-13.053-2.059-18.585-5.132-.004.171-.004.343-.004.516 0 19.88 14.144 36.464 32.915 40.234-3.443.938-7.068 1.439-10.81 1.439-2.644 0-5.214-.258-7.72-.736 5.222 16.301 20.375 28.165 38.331 28.495-14.043 11.006-31.735 17.565-50.96 17.565-3.312 0-6.578-.194-9.788-.574 18.159 11.643 39.727 18.437 62.899 18.437 75.473 0 116.746-62.524 116.746-116.747 0-1.779-.04-3.548-.119-5.309 8.017-5.784 14.973-13.011 20.474-21.239z';
const birdUri = 'data:image/svg+xml;base64,' + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><path fill="#fff" d="${BIRD}"/></svg>`).toString('base64');

/* fonts: Google serves TTF to clients that don't ask for woff2, which is what satori reads; fetched once per instance */
let fonts = null;
async function loadFonts() {
  if (fonts) return fonts;
  const get = async (family, weight) => {
    const css = await (await fetch('https://fonts.googleapis.com/css2?family=' + family + ':wght@' + weight, { signal: AbortSignal.timeout(5000) })).text();
    const url = /src: url\((https:[^)]+)\)/.exec(css)[1];
    return { name: family.replace(/\+/g, ' '), weight, style: 'normal', data: await (await fetch(url, { signal: AbortSignal.timeout(5000) })).arrayBuffer() };
  };
  try { fonts = await Promise.all([get('Fredoka', 600), get('Inter', 400), get('Inter', 700)]); }
  catch { fonts = []; }   // @vercel/og's built-in font still draws everything
  return fonts;
}

/* the coin's image as a PNG data URI (IPFS through our cached proxy, which serves WebP; satori reads PNG/JPEG),
   so a slow gateway can't stall the render */
async function imageUri(origin, image) {
  const cid = /\/ipfs\/([A-Za-z0-9]+)/.exec(image || '');
  if (!cid) return null;
  try {
    const r = await fetch(origin + '/api/image?cid=' + cid[1] + '&w=256', { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const png = await require('sharp')(Buffer.from(await r.arrayBuffer())).resize(256, 256, { fit: 'cover' }).png().toBuffer();
    return 'data:image/png;base64,' + png.toString('base64');
  } catch { return null; }
}

const usd = (n) => n == null ? '—' : '$' + (n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : Math.round(n));
/* a tiny element builder: satori takes React-shaped objects, no JSX needed */
const el = (type, style, ...children) => ({ type, props: { style: { display: 'flex', ...style }, children: children.flat().filter(c => c != null && c !== false) } });
const img = (src, style) => ({ type: 'img', props: { src, style } });

module.exports = async (req, res) => {
  const mint = String((req.query && req.query.mint) || '');
  /* one URL per coin: anything else redirects to it, so random query strings can't skip the CDN cache */
  if (Object.keys(req.query || {}).some(k => k !== 'mint')) {
    res.setHeader('cache-control', 'public, s-maxage=3600');
    return res.redirect(301, '/api/card-image?mint=' + encodeURIComponent(mint));
  }
  if (!await rateLimit(req, res, 'cardimg', 200, 600)) return;
  const origin = (req.headers['x-forwarded-proto'] || 'https').split(',')[0] + '://' + (req.headers['x-forwarded-host'] || req.headers.host || 'www.tweetpad.io');
  let launch = null;
  if (isPubkey(mint)) {
    try { const [row] = await redis(['GET', 'launch:' + mint]); launch = row ? JSON.parse(row) : null; } catch { /* fall back below */ }
  }
  if (!launch) { res.setHeader('cache-control', 'public, s-maxage=60'); return res.redirect(302, origin + '/preview.png'); }

  const [market, profileRaw, picture, fontList, icon] = await Promise.all([
    marketData([mint]).then(m => m[mint] || {}).catch(() => ({})),
    redis(['GET', 'profile:' + launch.creator]).then(([p]) => p).catch(() => null),
    imageUri(origin, launch.image),
    loadFonts(),
    appIconUri(origin),
  ]);
  const profile = profileRaw ? JSON.parse(profileRaw) : null;
  const change = market.change1h != null ? market.change1h : market.change24h;
  const changeLabel = market.change1h != null ? '1h' : '24h';
  const by = profile ? '@' + profile.handle : launch.creator.slice(0, 4) + '…' + launch.creator.slice(-4);
  const sans = fontList.length ? 'Inter' : undefined;

  const tree = el('div', { width: SIZE, height: SIZE, position: 'relative', flexDirection: 'column', alignItems: 'center', fontFamily: sans,
      backgroundImage: 'radial-gradient(circle at 50% 50%, #ffffff 0px, #f3f6f8 260px, #dfe4e8 760px)' },
    /* top: the coin */
    el('div', { position: 'absolute', top: 130, left: 0, right: 0, flexDirection: 'column', alignItems: 'center' },
      el('div', { alignItems: 'center' },
        picture ? img(picture, { width: 168, height: 168, borderRadius: 30, objectFit: 'cover', boxShadow: '0 6px 16px rgba(0,0,0,.25)' })
          : el('div', { width: 168, height: 168, borderRadius: 30, backgroundColor: '#2b86cc', color: '#fff', fontSize: 90, fontWeight: 700,
              alignItems: 'center', justifyContent: 'center' }, launch.symbol.slice(0, 1)),
        el('div', { flexDirection: 'column', marginLeft: 36, maxWidth: 640 },
          el('div', { fontSize: 104, fontWeight: 700, color: '#2f2f2f', letterSpacing: -2, lineHeight: 1 }, '$' + launch.symbol),
          el('div', { fontSize: 44, color: '#777', marginTop: 10, lineHeight: 1.1 }, launch.name.length > 24 ? launch.name.slice(0, 23) + '…' : launch.name)))),
    /* bottom: the numbers, as a 2012 tweet card */
    el('div', { position: 'absolute', left: 120, right: 120, top: 760, alignItems: 'center', padding: '26px 34px', backgroundColor: '#fff',
        border: '2px solid #c8c8c8', borderRadius: 14, boxShadow: '0 4px 10px rgba(0,0,0,.12)' },
      el('div', { flexDirection: 'column', flexGrow: 1 },
        el('div', { alignItems: 'baseline' },
          el('div', { fontSize: 54, fontWeight: 700, color: '#333' }, usd(market.mcap)),
          change != null ? el('div', { fontSize: 36, fontWeight: 700, marginLeft: 18, color: change >= 0 ? '#2e9e4f' : '#d0343a' },
            (change >= 0 ? '▲ ' : '▼ ') + Math.abs(change).toFixed(1) + '% ' + changeLabel) : null),
        el('div', { fontSize: 32, color: '#999', marginTop: 8 }, 'market cap · by ' + by + (launch.quote ? ' · paired with $' + launch.quote.symbol : ''))),
      el('div', { flexDirection: 'column', alignItems: 'center', marginLeft: 24 },
        icon ? img(icon, { width: 92, height: 92 })
          : el('div', { width: 88, height: 88, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
              backgroundImage: 'linear-gradient(#63b8ee, #2b86cc)', boxShadow: '0 2px 4px rgba(0,0,0,.25)' },
            img(birdUri, { width: 64, height: 64 })),
        el('div', { fontSize: 30, marginTop: 8, color: '#2f2f2f', fontFamily: fontList.length ? 'Fredoka' : sans, fontWeight: 600 }, 'tweetpad'))));

  try {
    const { ImageResponse } = await import('@vercel/og');
    const png = Buffer.from(await new ImageResponse(tree, { width: SIZE, height: SIZE, fonts: fontList.length ? fontList : undefined }).arrayBuffer());
    res.setHeader('content-type', 'image/png');
    res.setHeader('cache-control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return res.status(200).send(png);
  } catch (err) {
    res.setHeader('cache-control', 'public, s-maxage=30');
    return res.redirect(302, origin + '/preview.png');
  }
};
