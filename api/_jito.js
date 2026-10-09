// Jito bundles for Solana: a transaction carries a small tip to one of Jito's tip accounts and goes to Jito's block engine
// instead of the public RPC, so it lands as an atomic bundle in the next block it can, privately (not front-runnable from the
// mempool). One wallet, one signature: this is "bundle your launch / trade", not multi-wallet supply bundling.
// Jito's endpoint is free (rate-limited per IP); the tip comes from the user's own wallet inside their transaction.
const { PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } = require('@solana/web3.js');

const BLOCK_ENGINE = 'https://mainnet.block-engine.jito.wtf/api/v1';
/* from getTipAccounts (2026-10-09); any one of them works */
const TIP_ACCOUNTS = [
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5', 'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe', 'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49', 'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh', 'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL', '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
];
/* 0.0001 SOL: above ~90% of landed tips (bundles.jito.wtf tip_floor, 2026-10-09), about a cent */
const TIP_LAMPORTS = 100000;

const tipAccount = () => new PublicKey(TIP_ACCOUNTS[Math.floor(Math.random() * TIP_ACCOUNTS.length)]);
const tipInstruction = (payer, lamports = TIP_LAMPORTS) =>
  SystemProgram.transfer({ fromPubkey: new PublicKey(payer), toPubkey: tipAccount(), lamports });

/* add the tip to an unsigned transaction someone else built (PumpPortal's launch uses a lookup table, so it is resolved,
   decompiled, extended and recompiled against the same table) */
async function withTip(txBytes, payer, conn, lamports = TIP_LAMPORTS) {
  const tx = VersionedTransaction.deserialize(new Uint8Array(txBytes));
  const tables = await Promise.all((tx.message.addressTableLookups || []).map(async (l) => {
    const r = await conn.getAddressLookupTable(l.accountKey);
    if (!r.value) throw new Error('lookup table not found');
    return r.value;
  }));
  const msg = TransactionMessage.decompile(tx.message, { addressLookupTableAccounts: tables });
  msg.instructions.push(tipInstruction(payer, lamports));
  const out = new VersionedTransaction(msg.compileToV0Message(tables)).serialize();
  if (out.length > 1232) throw new Error('the transaction is too large to bundle');
  return Buffer.from(out);
}

/* send a fully signed transaction through Jito; bundleOnly keeps it off the public mempool */
async function sendViaJito(signedB64) {
  const r = await fetch(BLOCK_ENGINE + '/transactions?bundleOnly=true', {
    method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(10000),
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'sendTransaction', params: [signedB64, { encoding: 'base64' }] }),
  });
  const out = await r.json().catch(() => null);
  if (!r.ok || !out || out.error) throw Object.assign(new Error('Jito: ' + ((out && out.error && out.error.message) || 'HTTP ' + r.status)), { status: 502 });
  return out.result;   // the transaction signature
}

module.exports = { TIP_LAMPORTS, tipInstruction, withTip, sendViaJito };
