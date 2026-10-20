// Step 1 of a launch: put the image and the token metadata JSON on IPFS and return the metadata URI.
// pump.fun's own IPFS endpoint answers servers but not browsers (no CORS), so the upload goes through here.
// Filebase (FILEBASE_KEY, FILEBASE_SECRET, FILEBASE_BUCKET; FILEBASE_GATEWAY for the links) and Pinata (PINATA_JWT) are the fallbacks in
// case pump.fun's endpoint fails or goes away, and the last fallback is tweetpad itself: the picture and the metadata JSON kept in Redis
// and served from tweetpad.io/m/<id> (api/m.js), forever, so a coin's link still works (not IPFS: a party on mainnet wants IPFS).
// Body: the raw image bytes. Header x-meta: URI-encoded JSON { name, symbol, description, twitter, telegram, website }.
const { createHash, createHmac } = require('node:crypto');
const { MAX_IMAGE_BYTES, cors, sniffImage, readBody, sha256, rateLimit, fail, redis } = require('./_lib');

const GATEWAY = 'https://ipfs.io/ipfs/';

async function viaPump(meta, blob, filename) {
  const form = new FormData();
  form.append('file', blob, filename);
  for (const k of ['name', 'symbol', 'description', 'twitter', 'telegram', 'website']) if (meta[k]) form.append(k, meta[k]);
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
    createdOn: 'https://www.tweetpad.io',
    ...(meta.twitter && { twitter: meta.twitter }), ...(meta.telegram && { telegram: meta.telegram }), ...(meta.website && { website: meta.website }),
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

/* Filebase: IPFS pinning through its S3-compatible API, as party.studio pins (launchpartyV4 server/tokenUpload.ts). A PUT pins the
   bytes; a HEAD reads the CID back (x-amz-meta-cid), retried because Filebase can take a moment to show it; then the gateway must serve
   the metadata before its link is handed out, since a dead link shows an empty coin on pump.fun */
const FB = 's3.filebase.io';
const hmac = (key, msg) => createHmac('sha256', key).update(msg).digest();
function signV4({ method, path, payloadHash, headers = {} }) {   // AWS Signature V4, just a PUT or HEAD to one bucket
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''), date = amzDate.slice(0, 8), scope = `${date}/auto/s3/aws4_request`;
  const all = { host: FB, 'x-amz-date': amzDate, 'x-amz-content-sha256': payloadHash, ...headers };
  const names = Object.keys(all).sort(), signed = names.join(';');
  const canonical = [method, path, '', names.map((n) => `${n}:${String(all[n]).trim()}\n`).join(''), signed, payloadHash].join('\n');
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, createHash('sha256').update(canonical).digest('hex')].join('\n');
  const key = ['auto', 's3', 'aws4_request'].reduce((k, part) => hmac(k, part), hmac('AWS4' + process.env.FILEBASE_SECRET.trim(), date));
  return { ...all, authorization: `AWS4-HMAC-SHA256 Credential=${process.env.FILEBASE_KEY.trim()}/${scope}, SignedHeaders=${signed}, Signature=${hmac(key, toSign).toString('hex')}` };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function filebasePin(bytes, type, ext) {
  const hash = createHash('sha256').update(bytes).digest('hex'), path = `/${process.env.FILEBASE_BUCKET.trim()}/tweetpad/${hash}.${ext}`;
  for (let round = 0; round < 3; round++) {
    if (round) await sleep(round * 1500);
    const put = await fetch('https://' + FB + path, { method: 'PUT', headers: signV4({ method: 'PUT', path, payloadHash: hash, headers: { 'content-type': type } }), body: bytes, signal: AbortSignal.timeout(15000) }).catch(() => null);
    if (put && (put.status === 401 || put.status === 403 || put.status === 400)) throw new Error('Filebase refused the upload (' + put.status + ')');
    if (!put || !put.ok) continue;
    for (let look = 0; look < 4; look++) {
      if (look) await sleep(700);
      const head = await fetch('https://' + FB + path, { method: 'HEAD', headers: signV4({ method: 'HEAD', path, payloadHash: createHash('sha256').update('').digest('hex') }), signal: AbortSignal.timeout(15000) }).catch(() => null);
      const cid = head && head.ok && head.headers.get('x-amz-meta-cid');
      if (cid && /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,120})$/.test(cid)) return cid;
    }
  }
  throw new Error('Filebase didn’t confirm the pin');
}
async function viaFilebase(meta, body, type) {
  const gateway = (process.env.FILEBASE_GATEWAY || 'https://ipfs.filebase.io/ipfs').trim().replace(/\/+$/, '').replace(/(\/ipfs)?$/, '/ipfs/');
  const image = gateway + await filebasePin(body, type, type.split('/')[1]);
  const metadata = { name: meta.name, symbol: meta.symbol, description: meta.description, image, showName: true, createdOn: 'https://www.tweetpad.io',
    ...(meta.twitter && { twitter: meta.twitter }), ...(meta.telegram && { telegram: meta.telegram }), ...(meta.website && { website: meta.website }) };
  const json = Buffer.from(JSON.stringify(metadata));
  const uri = gateway + await filebasePin(json, 'application/json', 'json');
  if (Buffer.byteLength(uri) > 200) throw new Error('the metadata link is over 200 bytes');   // party_pump's limit for a coin's URI
  /* the gateway takes seconds to serve a fresh CID: wait for it (about 40 s at most), and check it serves these bytes */
  for (const wait of [0, 2000, 3000, 5000, 8000, 10000, 12000]) {
    await sleep(wait);
    const r = await fetch(uri, { signal: AbortSignal.timeout(10000) }).catch(() => null);
    if (r && r.ok) { if (Buffer.from(await r.arrayBuffer()).equals(json)) return { uri, image, metadata, via: 'filebase' }; throw new Error('the gateway served different bytes'); }
  }
  throw new Error('pinned, but the gateway isn’t serving it yet');
}

/* the last fallback: keep the picture and the metadata ourselves (Redis), served from tweetpad.io/m/<id>.<ext> and /m/<id>.json.
   A value has to fit one Redis request, so the picture is capped (the party form shrinks pictures before sending them) */
const SELF_MAX = 700 * 1024;
async function viaTweetpad(meta, body, type) {
  if (body.length > SELF_MAX) throw new Error('the picture is over 700 KB; use a smaller one');
  const id = sha256(Buffer.concat([body, Buffer.from(JSON.stringify(meta))])).slice(0, 24), ext = type.split('/')[1];
  const image = 'https://www.tweetpad.io/m/' + id + '.' + ext;
  const metadata = { name: meta.name, symbol: meta.symbol, description: meta.description, image, showName: true, createdOn: 'https://www.tweetpad.io',
    ...(meta.twitter && { twitter: meta.twitter }), ...(meta.telegram && { telegram: meta.telegram }), ...(meta.website && { website: meta.website }) };
  await redis(['SET', 'media:' + id + '.' + ext, JSON.stringify({ type, b64: body.toString('base64') })], ['SET', 'media:' + id + '.json', JSON.stringify({ type: 'application/json', text: JSON.stringify(metadata) })]);
  return { uri: 'https://www.tweetpad.io/m/' + id + '.json', image, metadata, via: 'tweetpad' };
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
  if (description.length > 140) return { error: 'description is over 140 characters' };
  return { name, symbol, description, twitter: link(m.twitter), telegram: link(m.telegram), website: link(m.website) };
}

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if (cors(req, res, 'POST')) return;
  if (req.method !== 'POST') return fail(res, 405, 'POST the image bytes');
  if (!await rateLimit(req, res, 'ipfs', 10, 600)) return;
  const meta = cleanMeta(req.headers['x-meta']);
  if (meta.error) return fail(res, 400, meta.error);
  const body = await readBody(req, MAX_IMAGE_BYTES);
  if (!body) return fail(res, 413, 'image is over 4 MB');
  const type = sniffImage(body);
  if (!type) return fail(res, 415, 'not a PNG, JPEG, GIF or WebP image');

  const blob = new Blob([body], { type });
  const filename = meta.symbol.toLowerCase() + '.' + type.split('/')[1];
  /* pump.fun's IPFS, then Filebase and Pinata (when configured), then tweetpad itself */
  const filebase = process.env.FILEBASE_KEY && process.env.FILEBASE_SECRET && process.env.FILEBASE_BUCKET;
  const tries = [() => viaPump(meta, blob, filename), ...(filebase ? [() => viaFilebase(meta, body, type)] : []), ...(process.env.PINATA_JWT ? [() => viaPinata(process.env.PINATA_JWT, meta, blob, filename)] : []), () => viaTweetpad(meta, body, type)];
  const errors = [];
  for (const attempt of tries) {
    try { const out = await attempt(); return res.status(200).json({ ok: true, ...out, sha256: sha256(body) }); }
    catch (err) { errors.push(err.message); }
  }
  return fail(res, 502, errors.join('; '));
};
