/* /party: throw a launch party. The host sets the coin (picture, name, ticker) and the party's terms (seats, price, creator fees, seats
   per wallet, who can join, their own seats, vest), sees where the crew's buy takes the coin on its pump.fun bonding curve and everything due now,
   then opens the room: the picture and metadata go to IPFS (api/ipfs.js), the SDK's plan opens it, and the room's link is ready to
   tweet. The program's limits are checked as they type (spec §3, §6); its own sentences show if a transaction fails anyway.
   Solana mainnet, through tweetpad's RPC proxy (?net=devnet opens a test party on devnet instead). */
import * as sdk from '/assets/vendor/party-sdk.js';
import { me, signer, pickWallet, SITE, net, useNet } from '/assets/party-wallet.js';

const CURVE_COINS = 793_100_000n * 1_000_000n;
/* mainnet pump.fun's opening reserves: a devnet test's curve is 100× smaller, so its preview shows what the same party would do on mainnet too */
const MAINNET = { virtualTokens: 1_073_000_000_000_000n, virtualSol: 30_000_000_000n };
if (new URLSearchParams(location.search).get('net') === 'devnet') useNet('devnet');
const ctx = sdk.solanaContext(net.chainId, { rpcUrl: net.rpc });
sdk.setSolanaPriorityFee(net.priorityFee);   // mainnet steps land reliably with one (the guide's 50,000 µlamports per CU)
for (const el of document.querySelectorAll('.net-only')) el.hidden = !net.devnet;
const $ = (id) => document.getElementById(id);
const bytes = (s) => new TextEncoder().encode(s).length;
const sol = (n) => (n >= 100 ? n.toFixed(0) : n >= 1 ? n.toFixed(3) : n.toFixed(4)).replace(/\.?0+$/, '');
const coins = (raw) => { const n = Number(raw) / 1e6; return n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n.toFixed(0); };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const status = (text, tone = '') => { const s = $('status'); s.className = 'status ' + tone; s.innerHTML = text; };

/* what the network says: pump.fun's opening reserves (the curve preview), and whether it takes holder-reward coins */
let opening = null, holdersOn = false, image = null, fee = 'crew', who = 'anyone';
Promise.all([sdk.pumpOpening(ctx), sdk.pumpHolderRewardsOn(ctx).catch(() => false)]).then(([o, h]) => {
  opening = o; holdersOn = h;
  if (!h) { const b = $('fee-holders'); b.disabled = true; b.title = 'pump.fun has holder rewards switched off on this network'; }
  update();
});

/* the coin */
$('image').addEventListener('change', () => {
  const f = $('image').files[0];
  if (!f) return;
  if (f.size > 4_000_000) { status('That picture is over 4 MB.', 'bad'); return; }
  image = f;
  $('drop-face').innerHTML = `<img src="${URL.createObjectURL(f)}" alt="">`;
  update();
});
$('symbol').addEventListener('input', () => { const el = $('symbol'); el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });

/* a big picture is shrunk to 512 px before it's sent (pump.fun shows coins small; tweetpad's own fallback store takes up to 700 KB) */
async function shrink(file) {
  if (file.size <= 600 * 1024 || file.type === 'image/gif') return file;
  const bmp = await createImageBitmap(file), k = Math.min(1, 512 / Math.max(bmp.width, bmp.height));
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
  const g = c.getContext('2d'); g.fillStyle = '#0a0d12'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.9));
}

/* presets */
const quick = (id, values, input, label) => {
  for (const v of values) $(id).append(Object.assign(document.createElement('button'), { type: 'button', textContent: label(v), onclick: () => { $(input).value = v; update(); } }));
};
quick('quick-seats', [5, 10, 20, 50, 100], 'seats', (v) => String(v));
quick('quick-price', [0.05, 0.1, 0.25, 0.5, 1], 'price', (v) => String(v));
/* the small choices (seats per wallet, your seats, when coins unlock) as segments you can see at a glance; the select underneath
   stays the value the form reads, and its disabled options (your seats within the cap) disable the segment too */
for (const sel of document.querySelectorAll('select.as-seg')) {
  const seg = Object.assign(document.createElement('div'), { className: 'seg small', role: 'radiogroup' });
  seg.style.gridTemplateColumns = `repeat(${sel.options.length}, 1fr)`;
  for (const o of sel.options) seg.append(Object.assign(document.createElement('button'), { type: 'button', role: 'radio', textContent: o.value === '0' && sel.id === 'cap' ? 'Any' : o.textContent.replace(/^Over /, ''),
    onclick: () => { if (o.disabled) return; sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); } }));
  sel.hidden = true; sel.after(seg); sel.seg = seg;
}
const syncSegs = () => { for (const sel of document.querySelectorAll('select.as-seg')) [...sel.seg.children].forEach((b, i) => { b.setAttribute('aria-checked', String(sel.selectedIndex === i)); b.disabled = sel.options[i].disabled; }); };
/* the seat steppers: one more or fewer, within the program's 2 to 1,000 */
for (const b of document.querySelectorAll('.step')) b.onclick = () => { const el = $('seats'); el.value = Math.max(2, Math.min(1000, (Math.floor(Number(el.value)) || 10) + Number(b.dataset.d))); update(); };
let solUsd = 0;   // for the dollar figures (api/agent-topup.js?prices)
fetch('/api/agent-topup?prices').then((r) => r.json()).then((j) => { solUsd = Number(j.solUsd) || 0; update(); }).catch(() => {});
const usd = (n) => (n >= 1000 ? '$' + (n / 1000).toFixed(n >= 1e4 ? 0 : 1) + 'K' : n >= 10 ? '$' + n.toFixed(0) : '$' + n.toFixed(2));

/* creator fees */
const FEE_HELP = {
  crew: 'The party is the coin’s creator: pump.fun’s creator fees are split evenly between the seats still open.',
  host: 'pump.fun’s creator fees go to your wallet.',
  holders: 'pump.fun pays its holder rewards to everyone holding the coin, in the party or not. Holder rewards are pump.fun’s program, and pump.fun decides the payouts.',
};
for (const b of $('fee').querySelectorAll('button')) b.onclick = () => { if (b.disabled) return; fee = b.dataset.v; update(); };
for (const b of $('who').querySelectorAll('button')) b.onclick = () => {
  who = b.dataset.v; $('allow').hidden = who !== 'list'; $('gate').hidden = who !== 'holders'; update();
  if (who === 'list') $('allow').focus(); else if (who === 'holders' && !$('gate-mint').value) $('gate-mint').focus();
};

/* token holders: the token's holders now (api/party-gate.js, Solana mainnet), the top 1,000 written as the whitelist at open. Its rule
   stays beside the room, so later holders can ask in and the host refreshes the list from the holders then */
let snap = null, snapFor = '', snapErr = '', snapTimer = 0;
function loadSnap() {
  const mint = $('gate-mint').value.trim(), min = Math.max(0, Number($('gate-min').value) || 0), key = mint + ':' + min;
  if (key === snapFor) return;
  snapFor = key; snap = null; snapErr = ''; update();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) { snapErr = mint ? 'That isn’t a Solana token’s mint address.' : ''; update(); return; }
  clearTimeout(snapTimer);
  snapTimer = setTimeout(async () => {
    try {
      const r = await fetch(`/api/party-gate?mint=${mint}&min=${min}`), j = await r.json();
      if (snapFor !== key) return;
      if (!r.ok) snapErr = j.error || 'Couldn’t read the token’s holders.'; else snap = j;
    } catch { if (snapFor === key) snapErr = 'Couldn’t read the token’s holders.'; }
    update();
  }, 450);
}
$('gate-mint').addEventListener('input', loadSnap); $('gate-min').addEventListener('input', loadSnap);
for (const b of $('quick-gate').children) b.onclick = () => { $('gate-mint').value = b.dataset.mint; loadSnap(); };

/* the whitelist as typed: one wallet a line (or commas, spaces); base58 Solana addresses, repeats dropped (Launch Party's pumpInviteList) */
function whitelist(text) {
  const wallets = new Set(), invalid = [];
  for (const raw of text.split(/[\s,;]+/)) { const t = raw.trim(); if (!t) continue; if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(t)) wallets.add(t); else invalid.push(t); }
  return { wallets: [...wallets], invalid };
}

/* everything that follows from the form, redrawn on every change */
function terms() {
  const seats = Math.floor(Number($('seats').value)), price = Number($('price').value), cap = Number($('cap').value), mine = Number($('mine').value);
  return { name: $('name').value.trim(), symbol: $('symbol').value, desc: $('desc').value.trim(), twitter: $('twitter').value.trim(), seats, price, cap, mine, vest: Number($('vest').value),
    list: who === 'list' ? whitelist($('allow').value) : who === 'holders' ? { wallets: snap ? snap.wallets : [], invalid: [] } : null,
    gate: who === 'holders' ? { mint: $('gate-mint').value.trim(), min: Math.max(0, Number($('gate-min').value) || 0) } : null };
}
function problems(t) {
  const p = [];
  if (!image) p.push('Add the coin’s picture.');
  if (!t.name) p.push('Name the coin.'); else if (bytes(t.name) > 32) p.push('The name is over 32 bytes (an emoji is 4).');
  if (t.symbol.length < 2) p.push('The ticker needs 2 to 10 letters or numbers.');
  if (!(t.seats >= 2 && t.seats <= 1000)) p.push('A party has 2 to 1,000 seats.');
  if (!(t.price >= 0.01)) p.push('A seat costs at least 0.01 SOL.');
  if (t.seats * t.price > 80) p.push('Too big: a room raises 80 SOL at most.');
  if (t.twitter && !/^https:\/\/(x|twitter)\.com\//.test(t.twitter)) p.push('The X link should start with https://x.com/.');
  if (t.list && t.list.invalid.length) p.push(`${t.list.invalid[0].slice(0, 24)}${t.list.invalid[0].length > 24 ? '…' : ''} isn’t a Solana wallet address.`);
  if (t.gate && !snap) p.push(snapErr || (t.gate.mint ? 'Reading the token’s holders…' : 'Paste the token whose holders may join.'));
  else if (t.list && !t.list.wallets.length) p.push(t.gate ? 'Nobody holds that much of the token: lower the amount.' : 'Add at least one wallet to the whitelist, or let anyone join.');
  if (t.list && t.list.wallets.length > sdk.PUMP_ALLOWLIST_MAX) p.push(`A whitelist holds up to ${sdk.PUMP_ALLOWLIST_MAX.toLocaleString()} wallets.`);
  return p;
}
function update() {
  const t = terms();
  $('name-left').textContent = 32 - bytes(t.name); $('name-left').classList.toggle('over', bytes(t.name) > 32);
  $('sym-left').textContent = 10 - t.symbol.length;
  $('desc-left').textContent = 140 - t.desc.length;
  for (const b of $('quick-seats').children) b.classList.toggle('on', Number(b.textContent) === t.seats);
  for (const b of $('quick-price').children) b.classList.toggle('on', Number(b.textContent) === t.price);
  /* the raise: every seat's money together, the one buy at launch */
  const raise = t.seats * t.price, dollars = solUsd && !net.devnet;
  $('price-usd').textContent = dollars && t.price > 0 ? '\u2248 ' + usd(t.price * solUsd) : '';
  $('raise').innerHTML = t.seats >= 2 && t.price > 0 ? `<span>Raise</span><b>${sol(raise)} SOL</b>${dollars ? `<small>\u2248 ${usd(raise * solUsd)}</small>` : ''}<i>one buy at launch, ${t.seats} equal shares</i>` : '';
  for (const b of $('fee').querySelectorAll('button')) b.setAttribute('aria-checked', String(b.dataset.v === fee));
  $('fee-help').textContent = FEE_HELP[fee];
  queueMicrotask(syncSegs);   // after this pass settles the selects (your seats within the cap)
  for (const b of $('who').querySelectorAll('button')) b.setAttribute('aria-checked', String(b.dataset.v === who));
  const sym = snap && snap.symbol ? '$' + snap.symbol : 'the token';
  $('who-help').textContent = t.gate
    ? (snap ? `${snap.holders.toLocaleString('en-US')} wallet${snap.holders === 1 ? '' : 's'} hold${snap.holders === 1 ? 's' : ''} ${t.gate.min ? t.gate.min.toLocaleString('en-US') + ' ' : ''}${sym} or more on Solana now${snap.holders > snap.wallets.length ? `: the biggest ${snap.wallets.length.toLocaleString('en-US')} go on the whitelist` : ', and they all go on the whitelist'}. Holders who buy in later can ask to join, and you refresh the list from the holders then. Seats already taken stay.`
      : snapErr || 'Only wallets holding this token can take a seat (you’re always in). The party’s program checks a whitelist; tweetpad builds it from the token’s holders.')
    : t.list
    ? `${t.list.wallets.length} wallet${t.list.wallets.length === 1 ? '' : 's'}${t.list.invalid.length ? ` · ${t.list.invalid.length} not a wallet address` : ''} · you’re always in. Only you and the wallets on the list can take a seat or be sent one: the party’s program checks it. You can edit the list while the party fills.`
    : `Anyone with the link can take a seat.${t.cap ? ` One wallet can hold up to ${t.cap}, but anyone can use more wallets: to keep it to your crew, use a whitelist.` : ''}`;
  /* your own seats: at most 3, fewer than the party, and within the cap */
  const most = Math.max(0, Math.min(3, t.seats - 1, t.cap || 3));
  for (const o of $('mine').options) o.disabled = Number(o.value) > most;
  if (t.mine > most) $('mine').value = String(most);
  const mine = Math.min(t.mine, most);

  /* pump.fun's bonding curve at launch, with every seat taken */
  let tooBig = false;
  if (opening && t.seats >= 1 && t.price > 0) {
    const raise = BigInt(Math.round(t.seats * t.price * 1e9)), bought = sdk.firstBuyCoins(opening, raise), mainBought = sdk.firstBuyCoins(net.devnet ? MAINNET : opening, raise);
    const mainPct = Math.min(100, Number(mainBought * 10000n / CURVE_COINS) / 100);
    const p = Math.min(100, Number(bought * 10000n / CURVE_COINS) / 100);
    const grad = Number(opening.virtualSol * opening.virtualTokens / (opening.virtualTokens - CURVE_COINS) - opening.virtualSol) / 1e9;
    tooBig = p >= 100;   // the program refuses a first buy that finishes the curve (on devnet's small test curve, easily)
    /* the headline is pump.fun's mainnet curve, where a party really launches; a devnet test's curve is 100× smaller, said underneath */
    $('curve-pct').textContent = (mainPct >= 10 ? mainPct.toFixed(0) : mainPct.toFixed(1)) + '%';
    $('curve-now').style.width = Math.max(mainPct, 1) + '%';
    $('curve-label').innerHTML = tooBig ? (net.devnet ? '<b>Too big for this devnet test:</b> on devnet\u2019s small pump.fun curve, one buy this size would finish it. Lower the seats or the price.' : '<b>Too big:</b> one buy this size would finish pump.fun\u2019s curve. Lower the seats or the price.')
      : `<div class="facts"><div><small>The crew\u2019s buy</small><b>${sol(Number(raise) / 1e9 / 1.0125)} SOL</b></div><div><small>Each seat gets</small><b>${coins(mainBought / BigInt(t.seats))}${t.symbol ? ' $' + esc(t.symbol) : ''}</b></div><div><small>Graduates at</small><b>~85 SOL</b></div></div>`
        + (net.devnet ? `<small class="devnote">Devnet test: devnet\u2019s pump.fun curve is 100× smaller (it graduates at ${sol(grad)} SOL), so this test party reaches ${(p >= 10 ? p.toFixed(0) : p.toFixed(1))}% there, about ${coins(bought / BigInt(t.seats))} a seat.</small>` : '');
  }

  /* due now (spec: "Money the user should see") */
  const items = [];
  if (mine) items.push([`Your ${mine} seat${mine > 1 ? 's' : ''}`, mine * t.price, 'refundable until launch']);
  if (mine) items.push(['Seat deposits', mine * 0.0016, 'back when a seat is refunded or closed']);
  items.push(['Launch reserve', 0.04, 'pays the coin’s rent at launch; what’s unused comes back']);
  items.push(['Room rent', 0.0044, '']);
  if (t.cap && mine) items.push(['Per-wallet counter', 0.001, 'back when you hold no seats']);
  /* the whitelist account: 32 bytes a wallet, rent back to you when it's cleared or the party ends */
  if (t.list && t.list.wallets.length) items.push([`${t.gate ? sym + ' holders whitelist' : 'Whitelist'} (${t.list.wallets.length.toLocaleString('en-US')} wallet${t.list.wallets.length === 1 ? '' : 's'})`, 0.0003 * t.list.wallets.length, 'back when the list is cleared or the party ends']);
  $('due').innerHTML = items.map(([k, v, n]) => `<li><span>${esc(k)}${n ? `<small>${esc(n)}</small>` : ''}</span><span>${sol(v)} SOL</span></li>`).join('');
  $('due-total').textContent = '~' + sol(items.reduce((s, [, v]) => s + v, 0)) + ' SOL';

  const p = problems(t);
  if (tooBig) p.push('Too big for the curve.');
  $('go').disabled = !!p.length || busy;
  $('go').title = p.join(' ');
  return { t: { ...t, mine }, ok: !p.length };
}
$('form').addEventListener('input', update);
$('form').addEventListener('change', update);

/* opening the room */
let busy = false;
$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { t, ok } = update();
  if (!ok || busy) return;
  if (!(await pickWallet(SITE + '/party/new', (err) => status(esc(sdk.solanaErrorText(err)), 'bad')))) return;
  busy = true; update();
  try {
    status('Putting the coin’s picture and details on IPFS…');
    const meta = { name: t.name, symbol: t.symbol, description: t.desc, twitter: t.twitter };
    const up = await fetch('/api/ipfs', { method: 'POST', headers: { 'x-meta': encodeURIComponent(JSON.stringify(meta)), 'content-type': 'application/octet-stream' }, body: await (await shrink(image)).arrayBuffer() });
    const pinned = await up.json().catch(() => ({}));
    if (!up.ok || !pinned.uri) throw new Error(pinned.error || 'The picture couldn’t be uploaded. Try again.');
    status('Building the party…');
    const { plan, room } = await sdk.planPumpOpen(ctx, { host: me.address, name: t.name, symbol: t.symbol, uri: pinned.uri, seatPrice: BigInt(Math.round(t.price * 1e9)),
      capacity: t.seats, vestSeconds: t.vest, feeMode: fee, maxPerWallet: t.cap, hostSeats: t.mine, allowlist: t.list ? t.list.wallets : undefined });
    await sdk.executeSolanaPlan(plan, signer(), ctx.conn, { onStep: (i, step, s) => status(`${esc(step.label)} (${i + 1} of ${plan.steps.length}): ${s === 'signing' ? 'confirm in your wallet' : s === 'pending' ? 'sending…' : 'done'}`) });
    if (t.gate) await fetch('/api/party-gate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ room: room.toBase58(), gate: t.gate }) }).catch(() => {});   // the rule, so later holders can ask in
    const link = SITE + '/p/' + room.toBase58();
    const text = `Throwing a launch party: $${t.symbol} on @pumpfun. ${t.seats} seats at ${t.price} SOL, refundable until launch. Every seat buys at launch, at the same price.${t.gate ? ` For $${snap.symbol || 'token'} holders.` : t.list ? ' Whitelist only.' : ''} Take a seat \u{1F447}${net.devnet ? ' (Devnet test)' : ''}\n${link}`;
    /* done: the coin itself, its terms in one line, the seats (yours taken), and the post */
    const pic = URL.createObjectURL(image);
    $('done-face').innerHTML = `<img src="${pic}" alt="">`;
    $('aura').style.backgroundImage = `url("${pic}")`;
    $('done-name').textContent = t.name;
    $('done-sub').innerHTML = `<b>$${esc(t.symbol)}</b> · ${t.seats} seats · ${t.price} SOL each${t.gate ? ` · $${esc(snap.symbol || 'token')} holders` : t.list ? ' · whitelist' : ''}`;
    $('done-seats').innerHTML = Array.from({ length: Math.min(t.seats, 24) }, (_, i) => `<span class="seat${i < t.mine ? ' taken mine' : ''}"></span>`).join('') + (t.seats > 24 ? `<span class="seat more">+${t.seats - 24}</span>` : '');
    $('tweet').href = 'https://x.com/intent/post?text=' + encodeURIComponent(text);
    $('room-link').href = '/p/' + room.toBase58();
    $('copy-link').onclick = async () => { try { await navigator.clipboard.writeText(link); $('copy-link').textContent = 'Copied'; } catch { prompt('The party\u2019s link', link); } };
    $('host').classList.add('opened');
    $('form').hidden = true; $('done').hidden = false;
    scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    status(esc(sdk.solanaErrorText(err)), 'bad');
  } finally { busy = false; update(); }
});
update();
