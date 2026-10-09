// Step 2 of a launch: have PumpPortal build the pump.fun create transaction (unsigned; no key needed),
// check it, and remember the launch as pending so only launches made through the pad can be listed later.
// Body JSON: { publicKey, mint, name, symbol, uri, image, devBuy }
const { PUMP_PROGRAM, cors, readJson, isPubkey, signerKeys, redis, fail } = require('./_lib');

const PENDING_TTL = 60 * 60; // seconds a built launch may wait to be signed and sent
const MAX_DEV_BUY = 10;      // SOL

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if (cors(req, res, 'POST')) return;
  if (req.method !== 'POST') return fail(res, 405, 'POST launch details');
  const b = await readJson(req);
  if (!b) return fail(res, 400, 'invalid JSON');
  const { publicKey, mint, name, symbol, uri, image } = b;
  const devBuy = Number(b.devBuy || 0);
  if (!isPubkey(publicKey) || !isPubkey(mint) || publicKey === mint) return fail(res, 400, 'invalid wallet or mint address');
  if (typeof name !== 'string' || !name.trim() || name.length > 32) return fail(res, 400, 'name must be 1–32 characters');
  if (typeof symbol !== 'string' || !/^[A-Z0-9]{2,10}$/.test(symbol)) return fail(res, 400, 'ticker must be 2–10 letters or numbers');
  if (typeof uri !== 'string' || !uri.startsWith('https://')) return fail(res, 400, 'metadata URI must be https');
  if (!Number.isFinite(devBuy) || devBuy < 0 || devBuy > MAX_DEV_BUY) return fail(res, 400, 'dev buy must be between 0 and ' + MAX_DEV_BUY + ' SOL');

  let tx;
  try {
    const r = await fetch('https://pumpportal.fun/api/trade-local', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        publicKey, action: 'create', tokenMetadata: { name: name.trim(), symbol, uri }, mint,
        denominatedInSol: 'true', amount: devBuy, slippage: 10, priorityFee: 0.0005, pool: 'pump',
      }),
    });
    tx = Buffer.from(await r.arrayBuffer());
    if (!r.ok) throw new Error(tx.toString('utf8').slice(0, 200) || 'HTTP ' + r.status);
  } catch (err) {
    return fail(res, 502, 'PumpPortal could not build the transaction: ' + err.message);
  }

  /* never hand the wallet something other than what was asked for */
  let parsed;
  try { parsed = signerKeys(tx); } catch { parsed = null; }
  if (!parsed || parsed.signers.length !== 2 || parsed.signers[0] !== publicKey || parsed.signers[1] !== mint || !parsed.keys.includes(PUMP_PROGRAM)) {
    return fail(res, 502, 'PumpPortal returned an unexpected transaction');
  }

  try {
    const pending = { mint, creator: publicKey, name: name.trim(), symbol, uri, image: typeof image === 'string' ? image : '', devBuy, at: Date.now() };
    await redis(['SET', 'pending:' + mint, JSON.stringify(pending), 'EX', PENDING_TTL]);
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
  return res.status(200).json({ ok: true, tx: tx.toString('base64') });
};
