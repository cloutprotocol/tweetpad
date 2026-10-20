/* tweetpad launch parties: the wallet, shared by a room (/p/<room>) and the host form (/party). Wallets are found through the Wallet
   Standard (Phantom, Solflare, Backpack all register there) and sign the party SDK's transactions as bytes. With no wallet on the
   page, a phone opens the page in a wallet's own browser; inside X's card, the room opens a pop-out instead (see party.js).
   The page provides the picker: #sheet, #wallets, #sheet-close. */
export const SITE = 'https://www.tweetpad.io';

/* the network: Solana mainnet (party_pump 8hXV…), read and sent through tweetpad's own RPC proxy (api/rpc.js) so the keyed RPC's URL
   stays on the server; devnet stays for the test rooms opened before mainnet. `useNet` switches it, before the SDK's context is made */
const ORIGIN = /^https?:/.test(location.origin) ? location.origin : SITE;   // X's card frame can have an opaque origin
export const NETS = {
  mainnet: { name: 'mainnet', chainId: 792703809, cluster: 'solana:mainnet', rpc: ORIGIN + '/api/rpc', priorityFee: 50_000, devnet: false },
  devnet: { name: 'devnet', chainId: 792703810, cluster: 'solana:devnet', rpc: 'https://api.devnet.solana.com', priorityFee: 0, devnet: true },
};
export const net = { ...NETS.mainnet };
export const useNet = (name) => Object.assign(net, NETS[name]);
export const PHONE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
export const me = { wallet: null, address: null, account: null };
export const wallets = [];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

(function discover() {
  const api = { register: (...ws) => { for (const w of ws) if ((w.chains || []).some((c) => String(c).startsWith('solana:')) && w.features && w.features['solana:signTransaction'] && !wallets.includes(w)) wallets.push(w); return () => {}; } };
  addEventListener('wallet-standard:register-wallet', (ev) => { try { ev.detail(api); } catch { /* a wallet that misbehaves */ } });
  try { dispatchEvent(new CustomEvent('wallet-standard:app-ready', { detail: api })); } catch { /* old browsers */ }
})();

/* SWITCHING: a wallet can change its account while the page is open (Phantom's account menu, another wallet). The page follows the
   wallet's own change event, so a plan is always built for, and signed by, the account the wallet has selected now */
const changed = [];
export const onWalletChange = (fn) => changed.push(fn);
const solAccount = (accounts) => (accounts || []).find((a) => (a.chains || []).some((c) => String(c).startsWith('solana:'))) || (accounts || [])[0] || null;
let unwatch = null;
function watch(w) {
  if (unwatch) { try { unwatch(); } catch { /* already gone */ } unwatch = null; }
  const ev = w.features['standard:events'];
  if (!ev) return;
  unwatch = ev.on('change', ({ accounts }) => {
    if (!accounts || me.wallet !== w) return;
    const a = solAccount(accounts);
    if (a && a.address === me.address) return;
    Object.assign(me, a ? { address: a.address, account: a } : { wallet: null, address: null, account: null });
    for (const fn of changed) fn(me.address);
  });
}

async function useWallet(w) {
  const f = w.features['standard:connect'];
  let res = null;
  try { res = f ? await f.connect() : null; } catch (e) { if (!(w.accounts || []).length) throw e; }
  const account = solAccount((res && res.accounts) || w.accounts);
  if (!account) throw new Error('The wallet didn’t share an account.');
  Object.assign(me, { wallet: w, address: account.address, account });
  watch(w);
}

/* forget this wallet (the page's side; the wallet stays connected to the site), so the next action asks which wallet to use */
export async function forgetWallet() {
  const w = me.wallet;
  Object.assign(me, { wallet: null, address: null, account: null });
  if (unwatch) { try { unwatch(); } catch { /* already gone */ } unwatch = null; }
  try { await w?.features['standard:disconnect']?.disconnect(); } catch { /* not every wallet has it */ }
  for (const fn of changed) fn(null);
}

/* the SDK's signer: one transaction at a time, as bytes */
export const signer = () => ({
  address: me.address,
  async signTransaction(bytes) {
    if (!me.wallet) throw new Error('Connect a wallet first.');
    const [out] = await me.wallet.features['solana:signTransaction'].signTransaction({ account: me.account, transaction: bytes, chain: net.cluster });
    return new Uint8Array(out.signedTransaction);
  },
});

/* pick a wallet: resolves true once connected. `page` is where a phone with no wallet should reopen (its wallet's browser) */
export function pickWallet(page, onError) {
  return new Promise((resolve) => {
    if (me.address) return resolve(true);
    const sheet = document.getElementById('sheet'), list = document.getElementById('wallets');
    list.innerHTML = '';
    for (const w of wallets) list.append(Object.assign(document.createElement('button'), { type: 'button', innerHTML: (w.icon ? `<img src="${esc(w.icon)}" alt="">` : '') + esc(w.name),
      onclick: async () => { try { await useWallet(w); sheet.hidden = true; resolve(true); } catch (e) { if (onError) onError(e); sheet.hidden = true; resolve(false); } } }));
    if (!wallets.length) {
      const deep = [['Phantom', 'https://phantom.app/ul/browse/' + encodeURIComponent(page) + '?ref=' + encodeURIComponent(SITE)], ['Solflare', 'https://solflare.com/ul/v1/browse/' + encodeURIComponent(page) + '?ref=' + encodeURIComponent(SITE)]];
      for (const [name, href] of deep) list.append(Object.assign(document.createElement('a'), { href, target: '_blank', rel: 'noopener', textContent: PHONE ? 'Open in ' + name : 'Get ' + name }));
    }
    sheet.hidden = false;
    document.getElementById('sheet-close').onclick = () => { sheet.hidden = true; resolve(false); };
  });
}
