// Token images for the list. Public IPFS gateways rate-limit (ipfs.io answers 429) and are slow on first fetch,
// so this tries several gateways server side and lets Vercel's CDN keep the result: a CID's content never changes.
// GET /api/image?cid=<ipfs cid>[&w=64|128|256]: with w, a small WebP made with sharp (the list and the image modal
// never need the full-size original, which can be hundreds of KB).
const sharp = require('sharp');
const { MAX_IMAGE_BYTES, cors, sniffImage, fail } = require('./_lib');

const WIDTHS = [64, 128, 256];

const GATEWAYS = ['https://gateway.pinata.cloud/ipfs/', 'https://ipfs.io/ipfs/', 'https://dweb.link/ipfs/', 'https://w3s.link/ipfs/'];
const CID = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,100})$/;

async function fromGateway(base, cid) {
  const res = await fetch(base + cid, { redirect: 'follow', signal: AbortSignal.timeout(9000) });
  if (!res.ok) throw new Error(base + ' ' + res.status);
  const body = Buffer.from(await res.arrayBuffer());
  if (body.length > MAX_IMAGE_BYTES) throw new Error('image too large');
  const type = sniffImage(body);
  if (!type) throw new Error(base + ' did not return an image');
  return { body, type };
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET')) return;
  const cid = String((req.query && req.query.cid) || '');
  if (!CID.test(cid)) return fail(res, 400, 'invalid cid');
  const w = Number(req.query && req.query.w);
  if (req.query && req.query.w && !WIDTHS.includes(w)) return fail(res, 400, 'w must be one of ' + WIDTHS.join(', '));
  /* the first gateway to answer with a real image wins; slow ones are abandoned */
  try {
    let { body, type } = await Promise.any(GATEWAYS.map(g => fromGateway(g, cid)));
    if (w) {
      /* first frame only for GIFs; square crop for the small list sizes, aspect kept for the modal */
      body = await sharp(body, { animated: false })
        .resize(w, w, { fit: w < 256 ? 'cover' : 'inside', withoutEnlargement: w >= 256 })
        .webp({ quality: 72 }).toBuffer();
      type = 'image/webp';
    }
    res.setHeader('content-type', type);
    res.setHeader('cache-control', 'public, max-age=31536000, immutable');
    res.setHeader('x-content-type-options', 'nosniff');
    return res.status(200).send(body);
  } catch {
    res.setHeader('cache-control', 'public, s-maxage=60');
    return fail(res, 502, 'no gateway returned the image yet');
  }
};
