/* tweetpad agent kit v1: a Solana wallet through the Wallet Standard (Phantom, Solflare, Backpack…), as on the launch form.
   Used by the agent page for claims, owner sign-in and top-ups; agent code never gets it (spec: the bridge).
     import { wallets } from '/kit/v1/wallet.js';
     wallets.list            // detected wallets, updated as they register; wallets.onChange(fn)
     await wallets.connect(w) → address;  await wallets.signMessage(text) → base58 signature
     await wallets.sendTransaction(base64) → signature, once confirmed */
const RPC = 'https://solana-rpc.publicnode.com';
const CHAIN = 'solana:mainnet';
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(bytes) {
  let n = 0n; for (const b of bytes) n = n * 256n + BigInt(b);
  let s = ''; while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; s = '1' + s; }
  return s;
}
const b64dec = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64enc = (u) => btoa(String.fromCharCode(...u));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function rpc(method, params) {
  const r = await (await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) })).json();
  if (r.error) throw new Error(r.error.message);
  return r.result;
}

const listeners = new Set();
export const wallets = {
  list: [], active: null, account: null,
  get address() { return this.account && this.account.address; },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  changed() { for (const fn of listeners) fn(this); },
  async connect(w) {
    const res = await w.features['standard:connect'].connect();
    const accounts = (res && res.accounts) || w.accounts || [];
    const account = accounts.find((a) => (a.chains || []).some((c) => String(c).startsWith('solana:'))) || accounts[0];
    if (!account) throw new Error(w.name + ' returned no account');
    this.active = w; this.account = account;
    try { localStorage.setItem('kit:wallet', w.name); } catch { /* storage blocked in this frame */ }
    this.changed();
    return account.address;
  },
  async disconnect() {
    try { await this.active?.features['standard:disconnect']?.disconnect(); } catch { /* already gone */ }
    this.active = null; this.account = null; this.changed();
  },
  async signMessage(text) {
    const f = this.active && this.active.features['solana:signMessage'];
    if (!f) throw new Error('this wallet can’t sign messages');
    const [out] = await f.signMessage({ account: this.account, message: new TextEncoder().encode(text) });
    return b58(out.signature);
  },
  async sendTransaction(base64) {
    const [out] = await this.active.features['solana:signTransaction'].signTransaction({ account: this.account, transaction: b64dec(base64), chain: CHAIN });
    const signed = new Uint8Array(out.signedTransaction);
    const sig = await rpc('sendTransaction', [b64enc(signed), { encoding: 'base64', preflightCommitment: 'confirmed', maxRetries: 5 }]);
    for (let i = 0; i < 60; i++) {
      const [st] = (await rpc('getSignatureStatuses', [[sig]])).value;
      if (st && st.err) throw new Error('the transaction failed on chain');
      if (st && (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized')) return sig;
      await sleep(700);
    }
    throw new Error('not confirmed yet; check your wallet');
  },
};

const seen = new Set();
const standardApi = Object.freeze({
  register(...ws) {
    for (const w of ws) {
      if (!w || seen.has(w)) continue;
      seen.add(w);
      const solana = Array.from(w.chains || []).some((c) => String(c).startsWith('solana:'));
      if (solana && w.features && w.features['solana:signTransaction'] && w.features['standard:connect'] && !/metamask/i.test(w.name)) wallets.list.push(w);
    }
    wallets.changed();
    return () => {};
  },
});
addEventListener('wallet-standard:register-wallet', (ev) => { try { ev.detail(standardApi); } catch { /* a wallet's own error */ } });
try { dispatchEvent(new CustomEvent('wallet-standard:app-ready', { detail: standardApi })); } catch { /* no wallets */ }
