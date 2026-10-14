/* Any token's own page (/<chain>/<address>, api/t.js), on any chain tweetpad runs on: the token and its chain, its chart, a buy and
   sell box, its market, what can be checked about it, its last trades and a share row. The first read comes in the page; it is read
   again every 15 seconds (api/token.js). Solana: Jupiter quotes and builds the swap, the wallet (Wallet Standard, assets/bkit.js)
   signs, the page sends it. Robinhood Chain, BNB Chain, Base and Ethereum: api/token.js builds KyberSwap's route and dry-runs it,
   an EVM wallet (EIP-6963) sends it. Inside X's player (?embed) the whole thing plays in the post. */
(() => {
'use strict';
const { $, h, MODE, store, errText, short, usd, qty, ago, toRaw, fromRaw, wallet, discover, disconnect, sign, send, confirm } = window.bkit;

let t = JSON.parse($('t-data').textContent);
const SOL = t.chain === 'solana';
const SHARE = location.origin + '/' + t.short + '/' + t.address;
/* the EVM chains as a wallet is asked to switch to them (the app's EVM_NETS), with what is kept back for gas on Max */
const NETS = {
  robinhood: { id: 4663, hex: '0x1237', name: 'Robinhood Chain', symbol: 'ETH', currency: 'Ether', rpc: 'https://rpc.mainnet.chain.robinhood.com', explorer: 'https://robinhoodchain.blockscout.com',
    presets: ['0.001', '0.005', '0.01'], reserve: '0.0003' },
  bnb: { id: 56, hex: '0x38', name: 'BNB Chain', symbol: 'BNB', currency: 'BNB', rpc: 'https://bsc-rpc.publicnode.com', explorer: 'https://bscscan.com',
    presets: ['0.01', '0.05', '0.1'], reserve: '0.002' },
  base: { id: 8453, hex: '0x2105', name: 'Base', symbol: 'ETH', currency: 'Ether', rpc: 'https://mainnet.base.org', explorer: 'https://basescan.org',
    presets: ['0.001', '0.005', '0.01'], reserve: '0.0003' },
  ethereum: { id: 1, hex: '0x1', name: 'Ethereum', symbol: 'ETH', currency: 'Ether', rpc: 'https://ethereum-rpc.publicnode.com', explorer: 'https://etherscan.io',
    presets: ['0.005', '0.01', '0.05'], reserve: '0.003' },
};
const NET = NETS[t.chain];
const NATIVE = SOL ? { symbol: 'SOL', decimals: 9, presets: ['0.05', '0.1', '0.5'], reserve: 10000000n }
  : { symbol: NET.symbol, decimals: 18, presets: NET.presets, reserve: toRaw(NET.reserve, 18) };
const txUrl = (sig) => (SOL ? 'https://solscan.io/tx/' : NET.explorer + '/tx/') + sig;
const addrUrl = (a) => (SOL ? 'https://solscan.io/account/' : NET.explorer + '/address/') + a;
const tokenUrl = SOL ? 'https://solscan.io/token/' + t.address : NET.explorer + '/token/' + t.address;
/* back to the app's token list in a frame (the X card, the pop-out), else tweetpad's own page */
if (MODE === 'embed' || MODE === 'popup') $('t-home').href = '/embed.html?' + new URLSearchParams({ ...(MODE === 'popup' && { mode: 'popup' }), tab: 'tokens' });

/* ---------- the wallet: Solana's through assets/bkit.js, an EVM one here ---------- */
const evm = { providers: [], active: null, address: null, picking: false };
window.addEventListener('eip6963:announceProvider', (ev) => {
  const d = ev.detail;
  if (d && d.provider && d.info && !evm.providers.some(p => p.info.uuid === d.info.uuid)) { evm.providers.push(d); renderTrade(); }
});
const evmList = () => (evm.providers.length ? evm.providers
  : window.ethereum ? [{ info: { name: 'Browser wallet', uuid: 'injected', icon: '' }, provider: window.ethereum }] : []);
async function evmRead(method, params) {
  const r = await fetch(NET.rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const out = await r.json();
  if (out.error) throw new Error(out.error.message || 'RPC error');
  return out.result;
}
async function ensureChain(p) {
  if (parseInt(await p.request({ method: 'eth_chainId' }), 16) === NET.id) return;
  try { await p.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: NET.hex }] }); }
  catch (err) {
    /* 4902: the wallet doesn't know this chain yet (Robinhood Chain, usually), so offer to add it */
    if (!(err && (err.code === 4902 || /unrecognized|not added|unknown chain|try adding/i.test(err.message || '')))) throw err;
    await p.request({ method: 'wallet_addEthereumChain', params: [{ chainId: NET.hex, chainName: NET.name,
      nativeCurrency: { name: NET.currency, symbol: NET.symbol, decimals: 18 }, rpcUrls: [NET.rpc], blockExplorerUrls: [NET.explorer] }] });
  }
}
async function connectEvm(entry) {
  evm.picking = false;
  try {
    const [address] = await entry.provider.request({ method: 'eth_requestAccounts' });
    if (!/^0x[0-9a-fA-F]{40}$/.test(address || '')) throw new Error('the wallet returned no account');
    await ensureChain(entry.provider);
    Object.assign(evm, { active: entry, address });
    if (entry.provider.on) entry.provider.on('accountsChanged', (list) => { evm.address = (list && list[0]) || null; if (!evm.address) evm.active = null; walletChanged(); });
  } catch (err) {
    say('bad', /reject|denied|cancel/i.test(errText(err)) ? 'Connection declined in the wallet' : errText(err));
  }
  walletChanged();
}
const connectSol = (w) => window.bkit.connect(w).catch((err) => say('bad', errText(err)));
const me = () => (SOL ? wallet.account && wallet.account.address : evm.address);
const walletName = () => (SOL ? wallet.active && wallet.active.name : evm.active && evm.active.info.name);
const walletChoices = () => (SOL ? wallet.list.map(w => ({ name: w.name, icon: w.icon, go: () => connectSol(w) }))
  : evmList().map(e => ({ name: e.info.name, icon: e.info.icon, go: () => connectEvm(e) })));
function disconnectAny() { if (SOL) disconnect(); else { Object.assign(evm, { active: null, address: null }); walletChanged(); } }

/* a wallet connected or gone: its balances follow */
const pos = { owner: null, native: null, tokens: null };
function walletChanged() {
  const a = me();
  if (!a) Object.assign(pos, { owner: null, native: null, tokens: null });
  else if (pos.owner !== a) loadPosition();
  renderTrade();
}
/* what the wallet holds: the token, and what it pays with (each read on its own, so one busy RPC still leaves the other) */
async function loadPosition() {
  const a = me();
  if (!a) return;
  pos.owner = a;
  const [tok, nat] = await Promise.allSettled(SOL
    /* Solana: Jupiter's balances for the wallet (public RPCs refuse getTokenAccountsByOwner now); none listed is none held */
    ? [fetch('https://lite-api.jup.ag/ultra/v1/balances/' + a).then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
        .then(out => BigInt((out[t.address] || {}).amount || 0)),
      window.bkit.rpc('getBalance', [a, { commitment: 'confirmed' }]).then(out => BigInt(out.value))]
    : [evmRead('eth_call', [{ to: t.address, data: '0x70a08231' + a.slice(2).toLowerCase().padStart(64, '0') }, 'latest']).then(hex => BigInt(hex === '0x' ? 0 : hex)),
      evmRead('eth_getBalance', [a, 'latest']).then(BigInt)]);
  if (me() !== a) return;
  if (tok.status === 'fulfilled') pos.tokens = tok.value;
  if (nat.status === 'fulfilled') pos.native = nat.value;
  renderTrade();
}

/* ---------- trading ---------- */
const JUP = 'https://lite-api.jup.ag/swap/v1';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const SLIPS = [1, 3, 5, 10, 20];
const trade = { side: 'buy', amount: '', raw: null, quote: null, quoting: false, seq: 0, timer: null, busy: false, status: null, slip: Number(store.get('tweetpad:slip')) || 5 };
const decimals = () => (trade.side === 'buy' ? NATIVE.decimals : t.decimals);
const amountRaw = () => (trade.raw != null ? trade.raw : toRaw(trade.amount, decimals()));
const amountText = () => (trade.raw != null ? fromRaw(trade.raw, decimals()) : trade.amount.trim());
function say(tone, text, sig) { trade.status = { tone, text, sig }; renderTrade(); }
function setAmount(amount, raw = null) { Object.assign(trade, { amount, raw, status: null }); requestQuote(); }
/* { out (base units of what you receive), jup (Jupiter's quote, which builds the swap) } */
async function fetchQuote() {
  if (SOL) {
    const buy = trade.side === 'buy';
    const r = await fetch(JUP + '/quote?' + new URLSearchParams({ inputMint: buy ? SOL_MINT : t.address, outputMint: buy ? t.address : SOL_MINT,
      amount: amountRaw().toString(), slippageBps: String(trade.slip * 100) }));
    const jup = await r.json();
    if (!r.ok || !jup.outAmount) throw new Error(/route/i.test(jup.error || '') || !jup.error ? 'Jupiter has no route for this trade' : jup.error);
    return { out: BigInt(jup.outAmount), jup };
  }
  const r = await fetch('/api/token?' + new URLSearchParams({ chain: t.chain, address: t.address, side: trade.side, amount: amountText() }));
  const out = await r.json();
  if (!r.ok) throw new Error(out.error || 'HTTP ' + r.status);
  return { out: BigInt(out.expected) };
}
function requestQuote() {
  clearTimeout(trade.timer);
  const seq = ++trade.seq;
  trade.quote = null;
  if (!amountRaw()) { trade.quoting = false; return renderTrade(); }
  trade.quoting = true; renderTrade();
  trade.timer = setTimeout(async () => {
    try { const q = await fetchQuote(); if (seq === trade.seq) trade.quote = q; }
    catch (err) { if (seq === trade.seq) trade.quote = { error: errText(err) }; }
    if (seq === trade.seq) { trade.quoting = false; renderTrade(); }
  }, 350);
}
async function evmReceipt(hash) {
  for (let i = 0; i < 90; i++) {
    const r = await evmRead('eth_getTransactionReceipt', [hash]).catch(() => null);
    if (r && r.status === '0x1') return r;
    if (r && r.status === '0x0') throw Object.assign(new Error('failed on chain'), { sig: hash });
    await new Promise(ok => setTimeout(ok, 1500));
  }
  throw Object.assign(new Error('not confirmed yet: check the transaction'), { sig: hash });
}
async function runTrade() {
  if (trade.busy || !me()) return;
  trade.busy = true;
  const side = trade.side;
  let sig = null;
  try {
    say('warn', 'Getting the best price…');
    let expected;
    if (SOL) {
      const { jup } = await fetchQuote();
      const r = await fetch(JUP + '/swap', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ quoteResponse: jup,
        userPublicKey: wallet.account.address, dynamicComputeUnitLimit: true, prioritizationFeeLamports: { priorityLevelWithMaxLamports: { maxLamports: 300000, priorityLevel: 'high' } } }) });
      const out = await r.json();
      if (!r.ok || !out.swapTransaction) throw new Error(out.error || 'Jupiter could not build the swap');
      expected = BigInt(jup.outAmount);
      say('warn', 'Approve in ' + walletName() + '…');
      const [bytes] = await sign([out.swapTransaction]);
      sig = await send(bytes);
      say('warn', 'Confirming…', sig);
      await confirm(sig);
    } else {
      const p = evm.active.provider;
      await ensureChain(p);
      const r = await fetch('/api/token', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chain: t.chain, wallet: evm.address, address: t.address, side, amount: amountText(), slippageBps: trade.slip * 100 }) });
      const built = await r.json();
      if (!r.ok) throw new Error(built.error || 'HTTP ' + r.status);
      for (const [i, call] of built.calls.entries()) {
        const many = built.calls.length > 1 ? ' (' + (i + 1) + ' of ' + built.calls.length + ': ' + call.label + ')' : '';
        say('warn', 'Approve in ' + walletName() + many + '…');
        sig = await p.request({ method: 'eth_sendTransaction', params: [{ from: evm.address, to: call.to, data: call.data, value: call.value, chainId: NET.hex }] });
        say('warn', 'Confirming…', sig);
        await evmReceipt(sig);
      }
      expected = BigInt(built.expected);
    }
    const got = Number(expected) / 10 ** (side === 'buy' ? t.decimals : NATIVE.decimals);
    say('ok', side === 'buy' ? 'Bought ≈ ' + qty(got) + ' $' + t.symbol : 'Sold for ≈ ' + qty(got) + ' ' + NATIVE.symbol, sig);
    Object.assign(trade, { amount: '', raw: null, quote: null });
    refresh();
  } catch (err) {
    const text = errText(err);
    say('bad', /reject|declin|denied|cancel/i.test(text) ? 'Cancelled in the wallet' : /blockhash not found|block height exceeded/i.test(text) ? 'Took too long to approve; try again' : text, err.sig || sig);
  } finally {
    trade.busy = false;
    renderTrade();
    setTimeout(loadPosition, 1500);
  }
}

/* ---------- drawing ---------- */
const chainChip = () => h('span', { class: 't-net ' + t.short, title: t.chainName }, h('span', { class: 't-mark ' + t.short, 'aria-hidden': 'true' }), h('span', { text: t.chainName }));
function renderCoin() {
  const m = t.market || {}, ch = m.change24h;
  $('t-coin').replaceChildren(
    h('span', { class: 't-pic-wrap' }, t.image ? h('img', { class: 't-pic', src: t.image, alt: '', referrerpolicy: 'no-referrer', onerror: (ev) => ev.target.replaceWith(h('span', { class: 't-pic ph', text: t.symbol.slice(0, 1) })) })
      : h('span', { class: 't-pic ph', text: t.symbol.slice(0, 1) }), h('span', { class: 't-badge ' + t.short, title: t.chainName }, h('span', { class: 't-mark ' + t.short, 'aria-hidden': 'true' }))),
    h('div', { class: 't-name' }, h('b', { text: t.name }),
      h('small', null, chainChip(), h('button', { class: 't-ca', type: 'button', title: 'Copy the contract address', onclick: () => copy(t.address, 'Contract address copied') }, short(t.address) + ' ⧉'))),
    h('div', { class: 't-cap' }, h('b', { text: usd(m.mcap) }),
      ch != null ? h('span', { class: ch >= 0 ? 'up' : 'dn', text: (ch >= 0 ? '▲ ' : '▼ ') + Math.abs(ch).toFixed(1) + '% 24h' }) : h('span', { text: 'market cap' })));
}

/* the chart: GeckoTerminal's candles for the token's most liquid pair (api/chart.js), closes drawn as a line */
const chart = { tf: store.get('tweetpad:ttf') || '15m', candles: [], trades: [], error: null, seq: 0 };
const TFS = { '5m': '6 hours', '15m': '20 hours', '1h': '3 days' };
async function loadChart() {
  if (!t.pair) { chart.error = 'No pool to chart yet'; return renderChart(); }
  const seq = ++chart.seq;
  try {
    const r = await fetch('/api/chart?' + new URLSearchParams({ pool: t.pair.address, tf: chart.tf, ...(!SOL && { net: t.chain }) }));
    const out = await r.json();
    if (!r.ok) throw new Error(out.error || 'HTTP ' + r.status);
    if (seq === chart.seq) Object.assign(chart, { candles: out.candles || [], trades: out.trades || [], error: null });
  } catch (err) { if (seq === chart.seq && !chart.candles.length) chart.error = errText(err); }
  if (seq === chart.seq) { renderChart(); renderParts(); }
}
function renderChart() {
  $('t-tf').replaceChildren(h('span', { class: 't-tf-label', text: 'Last ' + TFS[chart.tf] }), h('div', { class: 'chips' }, ...Object.keys(TFS).map(tf =>
    h('button', { type: 'button', 'aria-pressed': String(chart.tf === tf), onclick: () => { chart.tf = tf; store.set('tweetpad:ttf', tf); chart.candles = []; renderChart(); loadChart(); } }, tf))));
  const cv = $('t-chart'), dpr = window.devicePixelRatio || 1, w = cv.clientWidth, hgt = cv.clientHeight;
  if (!w) return;
  cv.width = w * dpr; cv.height = hgt * dpr;
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  g.clearRect(0, 0, w, hgt);
  const pts = chart.candles.map(c => c[4]).filter(v => v > 0);
  if (pts.length < 2) { g.fillStyle = '#999'; g.font = '12px "Helvetica Neue", Helvetica, Arial, sans-serif'; g.fillText(chart.error || 'Loading the chart…', 10, hgt / 2); return; }
  const lo = Math.min(...pts), hi = Math.max(...pts), span = hi - lo || hi || 1, pad = 8;
  const x = (i) => pad + (i / (pts.length - 1)) * (w - pad * 2 - 50), y = (v) => pad + (1 - (v - lo) / span) * (hgt - pad * 2);
  const up = pts[pts.length - 1] >= pts[0];
  g.beginPath(); pts.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v))));
  g.lineTo(x(pts.length - 1), hgt); g.lineTo(x(0), hgt); g.closePath();
  const fill = g.createLinearGradient(0, 0, 0, hgt);
  fill.addColorStop(0, up ? 'rgba(46, 158, 79, .22)' : 'rgba(208, 52, 58, .2)'); fill.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = fill; g.fill();
  g.beginPath(); pts.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v))));
  g.strokeStyle = up ? '#2e9e4f' : '#d0343a'; g.lineWidth = 2; g.lineJoin = 'round'; g.stroke();
  /* the last price, at the right edge */
  const last = pts[pts.length - 1], ly = Math.min(Math.max(y(last), 9), hgt - 9);
  g.fillStyle = up ? '#2e9e4f' : '#d0343a'; g.fillRect(w - pad - 48, ly - 9, 48, 18);
  g.fillStyle = '#fff'; g.font = 'bold 10px "Helvetica Neue", Helvetica, Arial, sans-serif'; g.textAlign = 'center';
  g.fillText('$' + (last < 0.001 ? last.toExponential(1) : last < 1 ? last.toPrecision(2) : last.toFixed(2)), w - pad - 24, ly + 3.5);
}

function renderTrade() {
  const box = $('t-trade'), buy = trade.side === 'buy', a = me();
  const maxBuy = pos.native != null && pos.native > NATIVE.reserve ? pos.native - NATIVE.reserve : pos.native != null ? 0n : null;
  const raw = amountRaw();
  const tooMuch = a && raw && (buy ? pos.native != null && raw > pos.native : pos.tokens != null && raw > pos.tokens);
  const chip = (label, pressed, onclick, disabled) => h('button', { type: 'button', 'aria-pressed': String(!!pressed), disabled: trade.busy || disabled, onclick }, label);
  const chips = buy ? [...NATIVE.presets.map(v => chip(v, trade.raw == null && trade.amount === v, () => setAmount(v))),
      chip('Max', maxBuy != null && trade.raw === maxBuy, () => setAmount(fromRaw(maxBuy, NATIVE.decimals), maxBuy), !(maxBuy > 0n))]
    : [25, 50, 100].map(p => chip(p + '%', pos.tokens && trade.raw === pos.tokens * BigInt(p) / 100n, () => { const r = pos.tokens * BigInt(p) / 100n; setAmount(fromRaw(r, t.decimals), r); }, !pos.tokens));
  const input = h('input', { class: 'text', type: 'text', inputmode: 'decimal', placeholder: '0', value: trade.raw != null ? fromRaw(trade.raw, decimals()) : trade.amount, disabled: trade.busy,
    'aria-label': buy ? NATIVE.symbol + ' to spend' : '$' + t.symbol + ' to sell',
    oninput: (ev) => { const v = ev.target.value.replace(',', '.'); if (/^\d*\.?\d*$/.test(v)) setAmount(v); else ev.target.value = trade.amount; } });
  const out = trade.quote && trade.quote.out != null ? Number(trade.quote.out) / 10 ** (buy ? t.decimals : NATIVE.decimals) : null;
  const est = trade.quoting ? h('span', { class: 'dim', text: 'Quoting…' })
    : trade.quote && trade.quote.error ? h('span', { class: 'bad', text: trade.quote.error })
    : out != null ? h('span', null, '≈ ', h('b', { text: qty(out) + (buy ? ' $' + t.symbol : ' ' + NATIVE.symbol) }), h('span', { class: 'dim', text: ' · min ' + qty(out * (1 - trade.slip / 100)) }))
    : h('span', { class: 'dim', text: (SOL ? 'Routed by Jupiter' : 'Routed by KyberSwap on ' + t.chainName) + ' · tweetpad takes nothing' });
  const choices = walletChoices();
  let action;
  if (!a) {
    action = (SOL ? wallet.picking : evm.picking) && choices.length > 1
      ? h('div', { class: 't-wallets' }, ...choices.map(c => h('button', { type: 'button', class: 'btn', onclick: c.go }, c.icon ? h('img', { src: c.icon, alt: '' }) : null, c.name)))
      : h('button', { type: 'button', class: 'btn primary t-go', disabled: !choices.length,
          onclick: () => { if (choices.length === 1) choices[0].go(); else { if (SOL) wallet.picking = true; else evm.picking = true; renderTrade(); } } },
        choices.length ? 'Connect wallet to trade' : SOL ? 'No Solana wallet here: open in Phantom or Solflare' : 'No EVM wallet here: open in MetaMask or Rabby');
    /* X's frame on some browsers has no wallet: the same page in its own tab has */
    if (!choices.length && MODE !== 'page') action = h('a', { class: 'btn primary t-go', href: SHARE, target: '_blank', rel: 'noopener' }, 'Open to trade ↗');
  } else {
    action = h('button', { type: 'button', class: 'btn primary t-go' + (buy ? '' : ' sell'), disabled: trade.busy || !raw || tooMuch || (!SOL && !t.pair) || !!(trade.quote && trade.quote.error), onclick: runTrade },
      trade.busy ? 'Working…' : tooMuch ? (buy ? 'Not enough ' + NATIVE.symbol : 'You hold less than that') : (buy ? 'Buy $' : 'Sell $') + t.symbol);
  }
  box.replaceChildren(...[
    h('div', { class: 't-top' },
      h('div', { class: 'chips t-side', role: 'tablist' }, ...['buy', 'sell'].map(s => h('button', { type: 'button', role: 'tab', class: s, 'aria-pressed': String(trade.side === s), disabled: trade.busy,
        onclick: () => { if (trade.side !== s) { Object.assign(trade, { side: s, amount: '', raw: null, status: null }); requestQuote(); } } }, s === 'buy' ? 'Buy' : 'Sell'))),
      h('button', { type: 'button', class: 't-slip', title: 'The most the price may move against you before the trade cancels', disabled: trade.busy,
        onclick: () => { trade.slip = SLIPS[(SLIPS.indexOf(trade.slip) + 1) % SLIPS.length]; store.set('tweetpad:slip', String(trade.slip)); requestQuote(); } }, 'Slippage ' + trade.slip + '%')),
    h('div', { class: 't-row' }, h('label', { class: 't-amt' }, input, h('span', { text: buy ? NATIVE.symbol : '$' + t.symbol })), h('div', { class: 'chips t-chips' }, ...chips)),
    h('div', { class: 't-est', 'aria-live': 'polite' }, est),
    action,
    a ? h('div', { class: 't-bal' }, h('span', null, buy ? 'Balance ' : 'You hold ',
        h('b', { text: buy ? (pos.native == null ? '…' : qty(Number(pos.native) / 10 ** NATIVE.decimals) + ' ' + NATIVE.symbol)
          : (pos.tokens == null ? '…' : qty(Number(pos.tokens) / 10 ** t.decimals) + ' $' + t.symbol) })),
      h('button', { type: 'button', class: 'linkish', onclick: disconnectAny, title: 'Disconnect ' + walletName() }, short(a) + ' ×')) : null,
    trade.status ? h('div', { class: 't-status ' + trade.status.tone }, trade.status.text,
      trade.status.sig ? h('a', { href: txUrl(trade.status.sig), target: '_blank', rel: 'noopener', text: ' Tx ↗' }) : null) : null,
  ].filter(Boolean));
}

const card = (title, ...kids) => h('section', { class: 't-card' }, h('div', { class: 't-card-head', text: title }), ...kids);
const kv = (k, v, tone) => h('div', { class: 't-kv' + (tone ? ' ' + tone : '') }, h('span', { text: k }), h('b', null, v));
const DEX = { raydium: 'Raydium', orca: 'Orca', meteora: 'Meteora', pumpswap: 'PumpSwap', pumpfun: 'pump.fun', uniswap: 'Uniswap', pancakeswap: 'PancakeSwap',
  aerodrome: 'Aerodrome', sushiswap: 'SushiSwap', launchlab: 'LaunchLab' };
const price = (p) => (p == null ? '—' : '$' + (p < 0.0001 ? p.toExponential(2) : p < 1 ? p.toPrecision(3) : p.toFixed(p < 100 ? 3 : 2)));
function renderParts() {
  const m = t.market || {}, p = t.pair, au = t.audit, parts = [];
  parts.push(card('Market on ' + t.chainName,
    kv('Price', price(m.price)),
    kv('Liquidity', usd(m.liquidity)),
    kv('24h', usd(m.volume24h) + ' volume' + (m.trades24h != null ? ' · ' + Math.round(m.trades24h).toLocaleString() + ' trades' : '')),
    m.holders ? kv('Holders', Math.round(m.holders).toLocaleString()) : null,
    p ? kv('Most liquid pool', h('span', null, h('a', { href: 'https://dexscreener.com/' + ({ bnb: 'bsc' }[t.chain] || t.chain) + '/' + p.address, target: '_blank', rel: 'noopener' },
      (DEX[p.dex] || p.dex) + p.labels.filter(x => /^(v\d|clmm|dlmm|cpmm)$/i.test(x)).map(x => ' ' + x).join('') + ' · ' + t.symbol + '/' + p.quote), p.createdAt ? ' · opened ' + ago(p.createdAt) + ' ago' : ''))
      : kv('Pool', 'none found yet', 'held')));
  /* what can be checked about it: Jupiter's audit on Solana (and the scanner's full read); the explorer anywhere */
  if (au) parts.push(card('Before you buy',
    kv('Jupiter', au.verified ? 'verified' : 'not verified', au.verified ? 'gone' : null),
    au.mintOff != null ? kv('Mint authority', au.mintOff ? 'revoked: no more can be made' : 'held: more can be minted', au.mintOff ? 'gone' : 'held') : null,
    au.freezeOff != null ? kv('Freeze authority', au.freezeOff ? 'revoked' : 'held: holders can be frozen', au.freezeOff ? 'gone' : 'held') : null,
    au.top10 != null ? kv('Top holders', au.top10.toFixed(1) + '% of supply', au.top10 > 50 ? 'held' : null) : null,
    au.organic ? kv('Organic trading', au.organic) : null,
    h('a', { class: 'btn t-scan', href: '/scan?mint=' + t.address + (MODE === 'page' ? '' : '&' + MODE) }, 'Full scan, holders and a sell test')));
  else if (!SOL) parts.push(card('Before you buy',
    h('p', { class: 'note', text: 'Anyone can deploy a token. The swap is dry-run from your wallet before you sign, so a token that blocks selling right now shows up as a failed quote; a tax or a later block may not.' }),
    h('div', { class: 't-out' }, h('a', { href: tokenUrl, target: '_blank', rel: 'noopener' }, 'Contract on the explorer ↗'),
      t.chain !== 'robinhood' ? h('a', { href: 'https://honeypot.is/' + ({ bnb: 'bsc', base: 'base', ethereum: 'ethereum' }[t.chain]) + '?address=' + t.address, target: '_blank', rel: 'noopener' }, 'Honeypot check ↗') : null)));
  if (chart.trades.length) parts.push(card('Last trades', h('ol', { class: 't-trades' }, ...chart.trades.slice(0, 8).map(x =>
    h('li', null, h('b', { class: x.kind === 'buy' ? 'up' : 'dn', text: x.kind === 'buy' ? 'Buy' : 'Sell' }), h('span', { text: usd(x.usd) }),
      x.wallet ? h('a', { class: 't-addr', href: addrUrl(x.wallet), target: '_blank', rel: 'noopener', text: short(x.wallet) }) : h('span'),
      h('a', { class: 't-ago', href: txUrl(x.tx), target: '_blank', rel: 'noopener', text: ago(x.time) }))))));
  /* sharing: the link plays as this very card on X, the chain on its picture */
  const l = t.links || {};
  parts.push(h('section', { class: 't-share' },
    h('div', { class: 't-link' }, h('code', { text: 'tweetpad.io/' + t.short + '/' + short(t.address) }),
      h('button', { type: 'button', class: 'btn', onclick: () => copy(SHARE, 'Link copied: it plays as this card on X') }, 'Copy'),
      h('a', { class: 'btn primary', target: '_blank', rel: 'noopener',
        href: 'https://x.com/intent/post?' + new URLSearchParams({ text: '$' + t.symbol + ' on ' + t.chainName + ', tradeable right inside this post', url: SHARE }) }, 'Post on X')),
    h('div', { class: 't-out' },
      p ? h('a', { href: 'https://dexscreener.com/' + ({ bnb: 'bsc' }[t.chain] || t.chain) + '/' + t.address, target: '_blank', rel: 'noopener' }, 'DexScreener ↗') : null,
      h('a', { href: tokenUrl, target: '_blank', rel: 'noopener' }, (SOL ? 'Solscan' : 'Explorer') + ' ↗'),
      l.website ? h('a', { href: l.website, target: '_blank', rel: 'noopener' }, 'Website ↗') : null,
      l.twitter ? h('a', { href: l.twitter, target: '_blank', rel: 'noopener' }, 'X ↗') : null,
      l.telegram ? h('a', { href: l.telegram, target: '_blank', rel: 'noopener' }, 'Telegram ↗') : null)));
  $('t-parts').replaceChildren(...parts);
}
async function copy(text, done) {
  try { await navigator.clipboard.writeText(text); say('ok', done); } catch { say('warn', text); }
}

/* read again every 15 seconds while the page is in view, the chart every 30 */
async function refresh() {
  try {
    const r = await fetch('/api/token?' + new URLSearchParams({ chain: t.chain, address: t.address }));
    if (r.ok) { t = await r.json(); renderCoin(); renderParts(); if (!trade.busy) renderTrade(); }
  } catch { /* keep the last */ }
}
let ticks = 0;
setInterval(() => {
  if (document.hidden) return;
  refresh();
  if (++ticks % 2 === 0) loadChart();
  if (amountRaw() && !trade.busy && !trade.quoting) requestQuote();
}, 15000);
window.addEventListener('resize', renderChart);
renderCoin(); renderChart(); renderTrade(); renderParts();
loadChart();
if (SOL) discover(walletChanged);
else window.dispatchEvent(new Event('eip6963:requestProvider'));
})();
