// Dry-run upload for Debug: proves an image can travel from inside the X card to our server.
// It checks the bytes really are an image, hashes them and stores nothing.
const { MAX_IMAGE_BYTES, cors, sniffImage, readBody, sha256, fail } = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if (cors(req, res, 'POST')) return;
  if (req.method !== 'POST') return fail(res, 405, 'POST the image bytes');
  const body = await readBody(req, MAX_IMAGE_BYTES);
  if (!body) return fail(res, 413, 'image is over 4 MB');
  const detectedType = sniffImage(body);
  if (!detectedType) return fail(res, 415, 'not a PNG, JPEG, GIF or WebP image');
  return res.status(200).json({
    ok: true, bytes: body.length, sha256: sha256(body), detectedType, declaredType: req.headers['x-file-type'] || null, stored: false,
  });
};
