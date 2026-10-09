// EVM launch (Robinhood Chain, BNB Chain or Base), step 2 (step 1 is /api/ipfs, as on Solana): build the solo launch transaction for the user's
// EVM wallet to sign. Dry-run against the live gateway first, so a launch that would fail never reaches the wallet, and
// remember the launch as pending (by its metadata link) so only launches built here can be listed later.
// Body JSON: { chain (robinhood | bnb | base), wallet, name, symbol, uri, image, thumb, devBuy (native coin, decimal string), holdersBps (0–10000), twitter?, telegram?, website? }
// Every launch has a flat 1% trading fee; holdersBps is how much of the creator side (after Launch Party's 10%) goes to holders.
// Returns: { tx: { to, data, value, gas, chainId }, fee, expected, minimum }   (wei and token amounts as decimal strings)
const { createHash } = require('node:crypto');
const { cors, readJson, isEvmAddress, EVM_CHAINS, cleanThumb, redis, rateLimit, fail } = require('./_lib');

const PENDING_TTL = 60 * 60;
const MAX_DEV_BUY_WEI = 10n ** 18n;   // 1 ETH (or BNB)
const pendingKey = (uri) => 'pending:evm:' + createHash('sha256').update(uri).digest('hex').slice(0, 32);

/* "0.25" ETH → wei, without going through floating point */
function toWei(s) {
  const m = /^(\d{1,4})(?:\.(\d{1,18}))?$/.exec(String(s || '0').trim());
  if (!m) return null;
  return BigInt(m[1]) * 10n ** 18n + BigInt((m[2] || '').padEnd(18, '0'));
}

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if (cors(req, res, 'POST')) return;
  if (req.method !== 'POST') return fail(res, 405, 'POST launch details');
  if (!await rateLimit(req, res, 'evm-create', 15, 600)) return;
  const b = await readJson(req);
  if (!b) return fail(res, 400, 'invalid JSON');

  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const symbol = typeof b.symbol === 'string' ? b.symbol.trim() : '';
  const devBuy = toWei(b.devBuy);
  const chain = b.chain || 'robinhood';
  if (!EVM_CHAINS.includes(chain)) return fail(res, 400, 'unknown chain');
  if (!isEvmAddress(b.wallet)) return fail(res, 400, 'connect an EVM wallet');
  if (!name || name.length > 32) return fail(res, 400, 'name must be 1–32 characters');
  if (!/^[A-Z0-9]{2,10}$/.test(symbol)) return fail(res, 400, 'ticker must be 2–10 letters or numbers');
  if (typeof b.uri !== 'string' || !/^https:\/\/[A-Za-z0-9.-]{1,64}\/ipfs\/[A-Za-z0-9]{46,100}$/.test(b.uri)) return fail(res, 400, 'metadata must be an IPFS link');
  if (devBuy === null || devBuy > MAX_DEV_BUY_WEI) return fail(res, 400, 'dev buy must be between 0 and 1 ' + (chain === 'bnb' ? 'BNB' : 'ETH'));
  const holdersBps = Number(b.holdersBps || 0);
  if (!Number.isInteger(holdersBps) || holdersBps < 0 || holdersBps > 10000) return fail(res, 400, 'holder share must be 0–100%');
  const image = typeof b.image === 'string' && /^https:\/\/[A-Za-z0-9.-]{1,64}\/ipfs\/[A-Za-z0-9]{46,100}$/.test(b.image) ? b.image : '';
  const socials = {};
  for (const k of ['twitter', 'telegram', 'website']) if (typeof b[k] === 'string' && /^https:\/\/\S{3,200}$/.test(b[k])) socials[k] = b[k];

  const evm = require('./_evm');   // viem is only loaded for EVM launches
  const wallet = evm.getAddress(b.wallet);
  let built;
  try { built = await evm.buildLaunch({ chain, wallet, name, symbol, uri: b.uri, socials: Object.keys(socials).length ? JSON.stringify(socials) : '', devBuy, holdersBps }); }
  catch (err) { return fail(res, err.status || 502, err.message); }

  /* NX: one launch per metadata link, so nobody can swap in their own details before it's listed */
  const pending = { chain, creator: wallet, name, symbol, uri: b.uri, image, thumb: cleanThumb(b.thumb), devBuy: Number(devBuy) / 1e18, holdersBps, at: Date.now() };
  const [set] = await redis(['SET', pendingKey(b.uri), JSON.stringify(pending), 'NX', 'EX', PENDING_TTL]);
  if (set !== 'OK') {
    const [held] = await redis(['GET', pendingKey(b.uri)]);
    if (!held || JSON.parse(held).creator !== wallet) return fail(res, 409, 'this metadata is already being launched; upload again to start over');
  }
  const hex = (n) => '0x' + n.toString(16);
  return res.status(200).json({
    tx: { to: built.to, data: built.data, value: hex(built.value), gas: hex(built.gas), chainId: hex(BigInt(built.chainId)) },
    fee: built.fee.toString(), expected: built.expected.toString(), minimum: built.minimum.toString(),
  });
};

module.exports.pendingKey = pendingKey;
