// Share card for one coin: /c/<mint> (rewritten here by vercel.json). X reads these tags to build a player card
// with the coin's own name and image; the player opens the card straight to that coin's chart.
const { isCoinId, redis } = require('./_lib');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = async (req, res) => {
  const mint = String((req.query && req.query.mint) || '');
  const origin = 'https://' + (req.headers['x-forwarded-host'] || req.headers.host || 'www.tweetpad.io');
  let launch = null;
  if (isCoinId(mint)) {
    try { const [row] = await redis(['GET', 'launch:' + mint]); launch = row ? JSON.parse(row) : null; } catch { /* plain card */ }
  }
  const title = launch ? '$' + launch.symbol + ' · ' + launch.name + ' on tweetpad' : 'tweetpad';
  const description = launch ? 'Chart, live trades and launches, inside the post.' : 'Launch a token without leaving the tweet.';
  /* each coin gets its own card image (api/card-image): its picture, ticker, market cap and creator around X's play button */
  const image = launch ? origin + '/api/card-image?mint=' + mint : origin + '/preview.png';
  const player = origin + '/embed.html' + (launch ? '?coin=' + mint : '');

  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'public, s-maxage=300, stale-while-revalidate=86400');
  return res.status(200).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<link rel="icon" href="${esc(origin)}/assets/brand/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="${esc(origin)}/assets/brand/tweetpad-hash-180.png">
<meta name="twitter:card" content="player">
<meta name="twitter:site" content="@ordinalos">
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
  body { margin: 0; min-height: 100vh; background: #e6e6e6; display: grid; place-items: center; padding: 16px; box-sizing: border-box; }
  iframe { width: 100%; max-width: 480px; aspect-ratio: 1 / 1; border: 1px solid #c8c8c8; border-radius: 6px; display: block; background: #e6e6e6; }
</style>
</head>
<body><iframe src="${esc(player)}" title="${esc(title)}" allow="clipboard-write"></iframe></body>
</html>`);
};
