// A coin's picture or metadata kept by tweetpad: /m/<id>.<png|jpeg|gif|webp|json>, written by api/ipfs.js when pump.fun's IPFS and
// Pinata are unavailable. They never change, so they're cached for good.
const { redis, fail } = require('./_lib');

module.exports = async (req, res) => {
  const f = String(req.query.f || '');
  if (!/^[0-9a-f]{24}\.(png|jpeg|gif|webp|json)$/.test(f)) return fail(res, 404, 'not found');
  const [raw] = await redis(['GET', 'media:' + f]);
  if (!raw) return fail(res, 404, 'not found');
  const item = JSON.parse(raw);
  res.setHeader('content-type', item.type);
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('cache-control', 'public, max-age=31536000, immutable');
  return res.status(200).send(item.b64 ? Buffer.from(item.b64, 'base64') : item.text);
};
