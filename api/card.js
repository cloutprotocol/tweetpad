// Share card for one coin: /c/<mint> (rewritten here by vercel.json). X reads these tags to build a player card
// with the coin's own name and image; the player opens the card straight to that coin's chart.
const { isPubkey, redis } = require('./_lib');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = async (req, res) => {
  const mint = String((req.query && req.query.mint) || '');
  const origin = 'https://' + (req.headers['x-forwarded-host'] || req.headers.host || 'twitterpad.vercel.app');
  let launch = null;
  if (isPubkey(mint)) {
    try { const [row] = await redis(['GET', 'launch:' + mint]); launch = row ? JSON.parse(row) : null; } catch { /* plain card */ }
  }
  const cid = launch && /\/ipfs\/([A-Za-z0-9]+)/.exec(launch.image || '');
  const title = launch ? '$' + launch.symbol + ' · ' + launch.name + ' on Tweetpad' : 'Tweetpad';
  const description = launch ? 'Chart, live trades and launches, inside the post.' : 'Launch a pump.fun token without leaving the post.';
  const image = cid ? origin + '/api/image?cid=' + cid[1] : origin + '/preview.png';
  const player = origin + '/embed.html' + (launch ? '?coin=' + mint : '');

  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'public, s-maxage=300, stale-while-revalidate=86400');
  return res.status(200).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="twitter:card" content="player">
<meta name="twitter:site" content="@Prawnsfamily">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:player" content="${esc(player)}">
<meta name="twitter:player:width" content="480">
<meta name="twitter:player:height" content="480">
<meta name="twitter:image" content="${esc(image)}">
<meta name="twitter:image:alt" content="${esc(title)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<style>
  body { margin: 0; min-height: 100vh; background: #0b1210; display: grid; place-items: center; padding: 16px; box-sizing: border-box; }
  iframe { width: 100%; max-width: 480px; aspect-ratio: 1 / 1; border: 2px solid #071013; border-radius: 16px; display: block; }
</style>
</head>
<body><iframe src="${esc(player)}" title="${esc(title)}" allow="clipboard-write"></iframe></body>
</html>`);
};
