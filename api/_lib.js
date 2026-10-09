// Shared helpers for the API functions. Files starting with "_" are not deployed as routes.
const { createHash } = require('node:crypto');

const PUMP_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const RPC_URL = process.env.RPC_URL || 'https://solana-rpc.publicnode.com';
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // Vercel function request bodies cap at 4.5 MB

/* the card frame is sandboxed with an opaque ("null") origin, so even our own page calls cross-origin */
function cors(req, res, methods) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', methods + ', OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type, x-file-type, x-meta');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}

function sniffImage(b) {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 6 && b.toString('latin1', 0, 4) === 'GIF8') return 'image/gif';
  if (b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/* raw request body as a Buffer: Vercel's helpers buffer application/octet-stream into req.body */
async function readBody(req, limit) {
  if (Buffer.isBuffer(req.body)) return req.body.length > limit ? null : req.body;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = await readBody(req, 64 * 1024);
  try { return raw ? JSON.parse(raw.toString('utf8')) : null; } catch { return null; }
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58encode(bytes) {
  const digits = [];
  for (const b of bytes) {
    let carry = b;
    for (let i = 0; i < digits.length; i++) { carry += digits[i] << 8; digits[i] = carry % 58; carry = (carry / 58) | 0; }
    while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0; }
  }
  let out = '';
  for (const b of bytes) { if (b === 0) out += '1'; else break; }
  for (let i = digits.length - 1; i >= 0; i--) out += B58[digits[i]];
  return out;
}
function b58decode(str) {
  const bytes = [];
  for (const ch of str) {
    let carry = B58.indexOf(ch);
    if (carry < 0) return null;
    for (let i = 0; i < bytes.length; i++) { carry += bytes[i] * 58; bytes[i] = carry & 0xff; carry >>= 8; }
    while (carry) { bytes.push(carry & 0xff); carry >>= 8; }
  }
  for (const ch of str) { if (ch === '1') bytes.push(0); else break; }
  return Uint8Array.from(bytes.reverse());
}
const isPubkey = (s) => typeof s === 'string' && s.length >= 32 && s.length <= 44 && (b58decode(s) || []).length === 32;

/* signer keys of a serialized (legacy or v0) transaction; key counts here stay under 128, so compact-u16 is one byte */
function signerKeys(tx) {
  const sigCount = tx[0];
  const msg = tx.subarray(1 + 64 * sigCount);
  const o = (msg[0] & 0x80) ? 1 : 0;
  const required = msg[o];
  const keyCount = msg[o + 3];
  const keys = [];
  for (let i = 0; i < keyCount; i++) keys.push(b58encode(msg.subarray(o + 4 + 32 * i, o + 36 + 32 * i)));
  return { sigCount, signers: keys.slice(0, required), keys };
}

/* Upstash Redis over REST (provisioned through the Vercel Marketplace) */
async function redis(...commands) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw Object.assign(new Error('launch registry is not configured'), { status: 503 });
  const res = await fetch(url + '/pipeline', {
    method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error('registry error ' + res.status);
  const out = await res.json();
  for (const r of out) if (r.error) throw new Error('registry: ' + r.error);
  return out.map(r => r.result);
}

async function rpc(method, params) {
  const res = await fetch(RPC_URL, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const out = await res.json();
  if (out.error) throw new Error('rpc ' + method + ': ' + out.error.message);
  return out.result;
}

function fail(res, status, error) {
  return res.status(status).json({ error });
}

module.exports = {
  PUMP_PROGRAM, MAX_IMAGE_BYTES, cors, sniffImage, readBody, readJson, sha256,
  b58encode, b58decode, isPubkey, signerKeys, redis, rpc, fail,
};
