// Test upload endpoint for the launch form. It proves an image can travel from inside the X card to our server:
// it checks the bytes really are an image, hashes them and stores nothing.
const { createHash } = require('node:crypto');

const MAX_BYTES = 4 * 1024 * 1024; // Vercel function request bodies cap at 4.5 MB

function sniff(b) {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 6 && b.toString('latin1', 0, 4) === 'GIF8') return 'image/gif';
  if (b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return res.status(405).json({ error: 'POST the image bytes' });
  }
  // Vercel's helpers buffer application/octet-stream into req.body; fall back to reading the stream
  let body = Buffer.isBuffer(req.body) ? req.body : null;
  if (!body) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BYTES) return res.status(413).json({ error: 'image is over 4 MB' });
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks);
  }
  if (body.length > MAX_BYTES) return res.status(413).json({ error: 'image is over 4 MB' });
  const detectedType = sniff(body);
  if (!detectedType) return res.status(415).json({ error: 'not a PNG, JPEG, GIF or WebP image' });
  return res.status(200).json({
    ok: true,
    bytes: body.length,
    sha256: createHash('sha256').update(body).digest('hex'),
    detectedType,
    declaredType: req.headers['x-file-type'] || null,
    stored: false,
  });
};
