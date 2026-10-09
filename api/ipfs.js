// Step 1 of a launch: put the image and the token metadata JSON on IPFS and return the metadata URI.
// pump.fun's own IPFS endpoint answers servers but not browsers (no CORS), so the upload goes through here.
// Pinata (PINATA_JWT) is a fallback in case pump.fun's endpoint fails or goes away.
// Body: the raw image bytes. Header x-meta: URI-encoded JSON { name, symbol, description, twitter, website }.
const { MAX_IMAGE_BYTES, cors, sniffImage, readBody, sha256, fail } = require('./_lib');

const GATEWAY = 'https://ipfs.io/ipfs/';

async function viaPump(meta, blob, filename) {
  const form = new FormData();
  form.append('file', blob, filename);
  for (const k of ['name', 'symbol', 'description', 'twitter', 'website']) if (meta[k]) form.append(k, meta[k]);
  form.append('showName', 'true');
  const res = await fetch('https://pump.fun/api/ipfs', { method: 'POST', body: form });
  const out = await res.json().catch(() => null);
  if (!res.ok || !out || !out.metadataUri || !out.metadata) throw new Error('pump.fun IPFS failed (' + res.status + ')');
  return { uri: out.metadataUri, image: out.metadata.image, metadata: out.metadata, via: 'pump.fun' };
}

async function viaPinata(jwt, meta, blob, filename) {
  const image = await pin(jwt, blob, filename);
  const metadata = {
    name: meta.name, symbol: meta.symbol, description: meta.description, image, showName: true,
    createdOn: 'https://twitterpad.vercel.app',
    ...(meta.twitter && { twitter: meta.twitter }), ...(meta.website && { website: meta.website }),
  };
  const uri = await pin(jwt, new Blob([JSON.stringify(metadata)], { type: 'application/json' }), meta.symbol.toLowerCase() + '.json');
  return { uri, image, metadata, via: 'pinata' };
}

async function pin(jwt, blob, filename) {
  const form = new FormData();
  form.append('network', 'public');
  form.append('name', filename);
  form.append('file', blob, filename);
  const res = await fetch('https://uploads.pinata.cloud/v3/files', { method: 'POST', headers: { authorization: 'Bearer ' + jwt }, body: form });
  const out = await res.json().catch(() => null);
  if (!res.ok || !out || !out.data || !out.data.cid) throw new Error('IPFS upload failed (' + res.status + ')');
  return GATEWAY + out.data.cid;
}

function cleanMeta(raw) {
  let m;
  try { m = JSON.parse(decodeURIComponent(raw || '')); } catch { return { error: 'missing token details' }; }
  const name = String(m.name || '').trim();
  const symbol = String(m.symbol || '').trim();
  const description = String(m.description || '').trim();
  const link = (v) => { try { const u = new URL(String(v || '').trim()); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
  if (!name || name.length > 32) return { error: 'name must be 1–32 characters' };
  if (!/^[A-Z0-9]{2,10}$/.test(symbol)) return { error: 'ticker must be 2–10 letters or numbers' };
  if (description.length > 500) return { error: 'description is over 500 characters' };
  return { name, symbol, description, twitter: link(m.twitter), website: link(m.website) };
}

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if (cors(req, res, 'POST')) return;
  if (req.method !== 'POST') return fail(res, 405, 'POST the image bytes');
  const meta = cleanMeta(req.headers['x-meta']);
  if (meta.error) return fail(res, 400, meta.error);
  const body = await readBody(req, MAX_IMAGE_BYTES);
  if (!body) return fail(res, 413, 'image is over 4 MB');
  const type = sniffImage(body);
  if (!type) return fail(res, 415, 'not a PNG, JPEG, GIF or WebP image');

  const blob = new Blob([body], { type });
  const filename = meta.symbol.toLowerCase() + '.' + type.split('/')[1];
  try {
    const out = await viaPump(meta, blob, filename);
    return res.status(200).json({ ok: true, ...out, sha256: sha256(body) });
  } catch (err) {
    if (!process.env.PINATA_JWT) return fail(res, 502, err.message);
    try {
      const out = await viaPinata(process.env.PINATA_JWT, meta, blob, filename);
      return res.status(200).json({ ok: true, ...out, sha256: sha256(body) });
    } catch (err2) {
      return fail(res, 502, err.message + '; Pinata fallback: ' + err2.message);
    }
  }
};
