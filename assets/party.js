/* /p/<room>: a pump.fun party room, live from the chain through the party SDK (assets/vendor/party-sdk.js). It shows the seats (with
   holders' @handles from tweetpad profiles), the curve the crew's buy reaches, and one button that follows the room: take a seat,
   refund, launch, claim, close seats, collect crew fees, refund everyone; the host edits the whitelist, cancels, takes back the spare
   launch reserve; anyone sweeps a finished party to its host (Launch Party's integration guide §5: buttons follow the chain). A wallet
   signs here (Wallet Standard). In X's card (?embed) there's no wallet, so signing moves to a pop-out on desktop (?popup) or to the
   wallet's own browser on phones. Solana mainnet, through tweetpad's RPC proxy; a room that isn't on mainnet is looked for on devnet,
   where the test parties opened before mainnet live, and every devnet amount is labelled test SOL. */
import * as sdk from '/assets/vendor/party-sdk.js';
import { me, wallets, signer, pickWallet, forgetWallet, onWalletChange, PHONE, net, useNet } from '/assets/party-wallet.js';

const SITE = 'https://www.tweetpad.io', CURVE_COINS = 793_100_000n * 1_000_000n;
/* mainnet pump.fun's opening reserves: a devnet test room's figures (its curve is 100× smaller) show mainnet's too */
const MAINNET = { virtualTokens: 1_073_000_000_000_000n, virtualSol: 30_000_000_000n };
if (new URLSearchParams(location.search).get('net') === 'devnet') useNet('devnet');
let ctx = null, found = false;
const connectNet = () => { ctx = sdk.solanaContext(net.chainId, { rpcUrl: net.rpc }); sdk.setSolanaPriorityFee(net.priorityFee); };
connectNet();
const MODE = document.documentElement.dataset.mode, ROOM = window.ROOM && !/^\{\{/.test(window.ROOM) ? window.ROOM : location.pathname.split('/')[2];
const PAGE = SITE + '/p/' + ROOM;
const $ = (id) => document.getElementById(id);
const short = (a) => (a ? String(a).slice(0, 4) + '…' + String(a).slice(-4) : '');
const sol = (lamports) => { const n = Number(lamports) / 1e9; return (n >= 100 ? n.toFixed(0) : n >= 1 ? n.toFixed(2) : n.toFixed(n >= 0.1 ? 3 : 4)).replace(/\.?0+$/, ''); };
const coins = (raw) => { const n = Number(raw) / 1e6, u = n >= 1e9 ? [1e9, 'B'] : n >= 1e6 ? [1e6, 'M'] : n >= 1e3 ? [1e3, 'K'] : [1, '']; const v = n / u[0]; return (v >= 100 || !u[1] ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, '')) + u[1]; };
const usd = (n) => (n >= 1000 ? '$' + (n / 1000).toFixed(n >= 1e4 ? 0 : 1) + 'K' : n >= 1 ? '$' + n.toFixed(2) : '$' + n.toFixed(n >= 0.1 ? 2 : 3));
const ofSupply = (raw) => { const p = Number(raw) * 100 / Number(sdk.PUMP_SUPPLY); return (p >= 1 ? p.toFixed(2) : p >= 0.01 ? p.toFixed(3) : p.toFixed(4)).replace(/0+$/, '') + '% of supply'; };
const pct = (x) => (x >= 99.95 ? '100' : x >= 10 ? x.toFixed(0) : x.toFixed(1)) + '%';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- what we know ---------- */
let solUsd = 0;   // SOL in dollars, for the "≈ $" lines (api/agent-topup.js?prices, kept 30 s there)
fetch('/api/agent-topup?prices').then((r) => r.json()).then((j) => { solUsd = Number(j.solUsd) || 0; render(); }).catch(() => {});
const st = { room: null, seats: [], meta: null, profiles: {}, opening: null, curve: null, allow: null, gate: null, waiting: [], crewFees: 0n, spare: 0n, sweepable: false, missing: false };

async function load() {
  try {
    let room;
    try { room = await sdk.readPumpRoom(ctx, ROOM); } catch (e) {
      // not a room on mainnet: the test parties opened before mainnet are on devnet (decided once, on the first read)
      if (found || net.devnet || !/not a pump\.fun party room/.test(e.message)) throw e;
      useNet('devnet'); connectNet(); st.opening = null;
      room = await sdk.readPumpRoom(ctx, ROOM);
    }
    found = true;
    const [seats, opening] = await Promise.all([sdk.pumpSeats(ctx, ROOM), st.opening || sdk.pumpOpening(ctx)]);
    Object.assign(st, { room, seats: seats.sort((a, b) => a.index - b.index), opening, missing: false });
    if (room.gated && !st.allow) st.allow = (await sdk.pumpAllowlist(ctx, ROOM).catch(() => [])).map((k) => k.toBase58());
    if (room.gated && room.state === sdk.PUMP_OPEN) loadGate();
    if (room.state === sdk.PUMP_LAUNCHED) {
      st.curve = await sdk.readCurve(ctx, room.mint).catch(() => null);
      if (room.feeMode === 'crew' && !room.quote) st.crewFees = await sdk.pumpCrewFeesWaiting(ctx, room).catch(() => 0n);
    }
    if (room.state !== sdk.PUMP_OPEN) {   // what the host can take back, and whether a finished party has anything left to sweep
      const [vault, floor] = await Promise.all([ctx.conn.getBalance(room.vault), st.rentFloor || ctx.conn.getMinimumBalanceForRentExemption(0)]).catch(() => [0, 0]);
      st.rentFloor = floor; st.vaultLam = BigInt(vault);
      st.spare = floor ? sdk.pumpReserveSpare(room, BigInt(vault), BigInt(floor)) : 0n;
      const finished = room.state === sdk.PUMP_CANCELLED ? room.active === 0 : room.openSeats === 0;
      st.sweepable = finished && await sdk.pumpSweepable(ctx, room).catch(() => false);
    }
    if (!st.meta && room.uri) loadMeta(room.uri);
    loadProfiles([room.host.toBase58(), ...seats.map((s) => s.owner.toBase58())]);
  } catch (e) {
    st.missing = !st.room;
    if (!st.room) console.warn('party room', e);
  }
  render();
}
async function loadMeta(uri) {
  const url = uri.replace(/^ipfs:\/\//, 'https://ipfs.io/ipfs/');
  try { st.meta = await (await fetch(url, { signal: AbortSignal.timeout(6000) })).json(); render(); } catch { st.meta = {}; }
}
async function loadProfiles(wallets) {
  const want = [...new Set(wallets)].filter((w) => !(w in st.profiles)).slice(0, 50);
  if (!want.length) return;
  want.forEach((w) => { st.profiles[w] = null; });
  try { const out = await (await fetch('/api/profile?wallets=' + want.join(','))).json(); Object.assign(st.profiles, out.profiles || {}); render(); } catch { /* handles are a nicety */ }
}
/* a token holders party: its rule (api/party-gate.js) and the holders waiting for the host to add them */
async function loadGate() {
  try { const j = await (await fetch('/api/party-gate?room=' + ROOM)).json(); st.gate = j.gate; st.waiting = j.waiting || []; render(); } catch { /* the list on chain still rules */ }
}
const gateSym = () => (st.gate && st.gate.symbol ? '$' + st.gate.symbol : 'the token');
const ago = (t) => { const s = Math.max(0, Math.floor(Date.now() / 1000) - t); return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + ' min ago' : s < 86400 ? Math.floor(s / 3600) + ' h ago' : Math.floor(s / 86400) + ' d ago'; };
const span = (s) => (s >= 86400 ? `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h` : s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : `${Math.max(1, Math.ceil(s / 60))} min`);
const handleOf = (w) => { const p = st.profiles[w]; return p && p.handle ? p.handle : null; };

/* ---------- the room, drawn ---------- */
function render() {
  const r = st.room;
  if (!r && !st.missing) return;   // still loading: the skeleton stays (party.css, .room[aria-busy])
  $('room').removeAttribute('aria-busy');
  if (!r) {
    $('state').lastElementChild.textContent = st.missing ? 'Not found' : 'Loading…';
    $('name').textContent = st.missing ? 'No party here' : 'A launch party';
    $('sub').textContent = st.missing ? 'This link isn’t a pump.fun party room.' : 'on pump.fun';
    button(st.missing ? 'No party at this address' : 'Loading…', null);
    return;
  }
  const S = r.state, open = S === sdk.PUMP_OPEN, launched = S === sdk.PUMP_LAUNCHED, cancelled = S === sdk.PUMP_CANCELLED;
  const host = r.host.toBase58(), hostName = handleOf(host) ? '@' + handleOf(host) : short(host);
  const mine = me.address ? st.seats.filter((s) => s.owner.toBase58() === me.address) : [];
  const partySize = launched && r.perSeat > 0n ? Number(r.bought / r.perSeat) : r.capacity;

  $('refundable').hidden = !open;   // only true before launch
  $('net').hidden = !net.devnet; $('sheet-hint').hidden = !net.devnet;   // devnet test rooms say so
  const chip = $('state');
  chip.className = 'chip state ' + (open ? 'open' : launched ? 'launched' : 'cancelled');
  chip.lastElementChild.textContent = open ? `Open · ${r.active} of ${r.capacity}` : launched ? (st.curve && st.curve.complete ? 'Graduated' : 'Launched') : 'Cancelled';
  document.title = `$${r.symbol} party · ${open ? r.active + ' of ' + r.capacity + ' seats' : launched ? 'launched' : 'cancelled'}`;

  const img = st.meta && (st.meta.image || '').replace(/^ipfs:\/\//, 'https://ipfs.io/ipfs/');
  $('face').innerHTML = img ? `<img src="${esc(img)}" alt="" onerror="this.remove()">` : esc((r.symbol || '?')[0]);
  $('aura').style.backgroundImage = img ? `url("${img.replace(/"/g, '%22')}")` : '';   // the coin's own colours, blurred behind the card
  $('name').textContent = r.name;
  $('sub').innerHTML = `<b>$${esc(r.symbol)}</b> · hosted by ${handleOf(host) ? `<a href="https://x.com/${esc(handleOf(host))}" target="_blank" rel="noopener">${esc(hostName)}</a>` : esc(hostName)}`;

  /* the seats: one each (up to a screenful); a holder's X picture when they've linked one, else a colour of their own (from the wallet) */
  const show = Math.min(MODE === 'embed' ? 30 : 60, Math.max(r.capacity, partySize));
  const held = open ? st.seats : [];
  let dots = '';
  for (let i = 0; i < show; i++) {
    const seat = held[i], taken = open ? i < r.active : launched ? i < partySize : false;
    const owner = seat && seat.owner.toBase58(), h = owner && handleOf(owner), isMine = owner && owner === me.address;
    const hue = owner ? [...owner].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 360, 7) : 0;
    dots += `<span class="seat${taken ? ' taken' : ''}${isMine ? ' mine' : ''}" title="${esc(taken ? (h ? '@' + h : owner ? short(owner) : 'taken') : 'open seat')}"${owner && !h ? ` style="--h:${hue}"` : ''}>${h ? `<img src="https://unavatar.io/x/${esc(h)}" alt="" loading="lazy" onerror="this.remove()">` : owner ? esc(owner.slice(0, 2)) : ''}</span>`;
  }
  const extra = Math.max(r.capacity, partySize) - show;
  if (extra > 0) dots += `<span class="seat more">+${extra}</span>`;
  $('grid').innerHTML = dots;
  $('seats-count').textContent = open ? `${r.active} of ${r.capacity} taken` : launched ? `${partySize} in the buy` : `${r.active} to refund`;

  const price = sol(r.seatPrice) + ' SOL';
  const at = (lamports) => (st.opening ? Math.min(100, Number(sdk.firstBuyCoins(st.opening, lamports) * 10000n / CURVE_COINS) / 100) : 0);
  const fullPct = at(BigInt(r.capacity) * r.seatPrice), perSeatFull = st.opening && r.capacity ? sdk.firstBuyCoins(st.opening, BigInt(r.capacity) * r.seatPrice) / BigInt(r.capacity) : 0n;
  const REF = net.devnet || !st.opening ? MAINNET : st.opening;   // the curve the headline is on: the room's own, or mainnet's for a devnet test
  const perSeatMain = r.capacity ? sdk.firstBuyCoins(REF, BigInt(r.capacity) * r.seatPrice) / BigInt(r.capacity) : 0n;
  const pctMain = Math.min(100, Number(sdk.firstBuyCoins(REF, BigInt(r.capacity) * r.seatPrice) * 10000n / CURVE_COINS) / 100);
  /* the three numbers that matter, each with the line that makes it mean something: dollars, who can join, a share of the supply */
  const tile = (label, value, unit = '', sub = '', fill = null, title = '') => `<div class="tile"${title ? ` title="${esc(title)}"` : ''}><small>${label}</small>`
    + `<b>${value}${unit ? ` <span>${unit}</span>` : ''}</b>${fill === null ? '' : `<i class="fill"><u style="width:${Math.max(0, Math.min(100, fill))}%"></u></i>`}${sub ? `<em>${sub}</em>` : ''}</div>`;
  const inUsd = (lamports) => (solUsd && !net.devnet ? '\u2248 ' + usd(Number(lamports) / 1e9 * solUsd) : '');
  const who = r.gated ? (st.gate ? `${gateSym()} holders only` : 'Whitelist only') : r.maxPerWallet ? `Up to ${r.maxPerWallet} a wallet` : 'Anyone can join';
  const mcap = st.curve ? sdk.curveMarketCap(st.curve) : 0n;
  $('tiles').innerHTML = open
    ? tile('Seat price', sol(r.seatPrice), 'SOL', [inUsd(r.seatPrice), 'refundable'].filter(Boolean).join(' · '))
      + tile('Seats left', r.capacity - r.active, `of ${r.capacity}`, who, r.active * 100 / r.capacity)
      + tile('Each seat gets', perSeatMain ? coins(perSeatMain) : '—', '$' + esc(r.symbol), perSeatMain ? ofSupply(perSeatMain) : '', null,
        net.devnet ? `With every seat taken, on pump.fun's mainnet curve. On devnet's test curve (100× smaller) this test party gets about ${coins(perSeatFull)} a seat.` : 'With every seat taken, at the curve\u2019s price now')
    : launched ? tile(net.devnet ? 'A seat got · devnet' : 'A seat got', coins(r.perSeat), '$' + esc(r.symbol), ofSupply(r.perSeat), null, net.devnet ? 'On devnet\u2019s pump.fun test curve, which is 100× smaller than mainnet\u2019s' : '')
      + tile('Market cap', st.curve ? sol(mcap) : '—', 'SOL', st.curve ? inUsd(mcap) : '')
      + tile('Party of', partySize, partySize === 1 ? 'seat' : 'seats', 'one buy, one price')
    : tile('Refunds left', r.active, r.active === 1 ? 'seat' : 'seats', r.active ? 'anyone can send them' : 'all refunded', r.capacity ? (r.capacity - r.active) * 100 / r.capacity : 0)
      + tile('Seat price', sol(r.seatPrice), 'SOL', 'back to each owner') + tile('Status', 'Cancelled', '', 'no coin was made');
  st.facts = { perSeatFull, perSeatMain, fullPct, mine: mine.length };

  document.querySelector('.seats').hidden = launched;
  renderLanded(r, launched, mine, partySize);

  /* pump.fun's bonding curve, the way pump.fun shows it: where the crew's one buy lands it (solid: the seats taken now; striped: with
     every seat), or where the live coin is. A curve graduates to PumpSwap when its 793.1M curve coins are sold */
  const badge = $('pf-badge');
  badge.className = 'pf-badge' + (cancelled ? ' done' : ''); badge.hidden = launched;   // launched: the green strip under it says so
  badge.lastElementChild.innerHTML = launched ? (st.curve && st.curve.complete ? 'Graduated from <b>pump.fun</b> to PumpSwap' : 'Live on <b>pump.fun</b>') : cancelled ? 'Cancelled before launch on <b>pump.fun</b>' : 'Launches on <b>pump.fun</b>';
  const now = $('curve-now'), ghost = $('curve-ghost');
  /* the headline is pump.fun's mainnet curve (30 SOL virtual, ~85 SOL to graduate), where a party really launches; devnet's test curve
     is 100× smaller (0.3 SOL virtual, ~0.85 SOL), so the same test SOL goes ~100× further there, and that's said underneath */
  const gradSol = st.opening ? Number(st.opening.virtualSol * st.opening.virtualTokens / (st.opening.virtualTokens - CURVE_COINS) - st.opening.virtualSol) / 1e9 : 0;
  const onMain = (lamports) => Math.min(100, Number(sdk.firstBuyCoins(REF, lamports) * 10000n / CURVE_COINS) / 100);
  const dev = (text) => (net.devnet ? `<small class="devnote">${text}</small>` : '');
  const facts = (list) => `<div class="facts">${list.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>`;
  if (open && st.opening) {
    const nowLam = BigInt(r.active) * r.seatPrice, fullLam = BigInt(r.capacity) * r.seatPrice, afterFee = (l) => sol(BigInt(Math.round(Number(l) / 1.0125)));
    const n = onMain(nowLam), f = pctMain;
    $('curve-pct').textContent = pct(f);
    $('curve-label').innerHTML = facts([['The crew\u2019s buy', afterFee(fullLam) + ' SOL'], ['Taken now', pct(n)], ['Graduates at', '~85 SOL']])
      + dev(MODE === 'embed' ? `Devnet\u2019s test curve is 100× smaller: ${pct(fullPct)} there.` : `Devnet test: devnet\u2019s pump.fun curve is 100× smaller (it graduates at ${sol(BigInt(Math.round(gradSol * 1e9)))} SOL), so this test party reaches ${pct(fullPct)} there, about ${coins(perSeatFull)} a seat.`);
    now.style.width = Math.max(n, n > 0 ? 0.8 : 0) + '%'; ghost.style.width = Math.max(f, 1.2) + '%';
  } else if (launched && st.curve) {
    const p = st.curve.complete ? 100 : Math.max(0, Math.min(100, 100 - Number(st.curve.realTokens * 10000n / CURVE_COINS) / 100));
    $('curve-pct').textContent = pct(p);
    $('curve-label').innerHTML = st.curve.complete ? 'The curve is <b>complete</b>: the coin graduated and trades on PumpSwap.'
      : facts([['In the curve', sol(st.curve.realSol) + ' SOL'], ['Still for sale', coins(st.curve.realTokens)], ['Graduates at', net.devnet ? sol(BigInt(Math.round(gradSol * 1e9))) + ' SOL' : '~85 SOL']])
        + dev(MODE === 'embed' ? 'Devnet\u2019s test curve: 100× smaller than mainnet\u2019s.' : 'This is devnet\u2019s pump.fun test curve, 100× smaller than mainnet\u2019s (mainnet\u2019s graduates at ~85 SOL).');
    now.style.width = p + '%'; ghost.style.width = '0';
  } else { $('curve-pct').textContent = '—'; $('curve-label').textContent = cancelled ? 'No coin: the party was cancelled before launch.' : 'How far the crew\u2019s buy takes the coin along its curve'; now.style.width = '0'; ghost.style.width = '0'; }

  /* the button, and what else this wallet can do */
  const more = [];
  const can = sdk.pumpLaunchable(r, me.address);
  if (open) {
    const listed = !r.gated || !me.address || me.address === host || (st.allow || []).includes(me.address);
    if (r.active >= r.capacity) button(`Launch $${r.symbol} on pump.fun`, launch, 'launch');   // full: anyone may launch it
    else if (!listed && st.gate && st.waiting.includes(me.address)) button('Asked to join: waiting for the host to add you', null);
    else if (!listed && st.gate) button(`Hold ${gateSym()}? Ask to join`, askToJoin);
    else if (!listed) button('Whitelist only: this wallet isn’t on it', null);
    else if (r.maxPerWallet && mine.length >= r.maxPerWallet) button(`You hold the most seats a wallet can (${r.maxPerWallet})`, null);
    else button(`Take a seat · ${price}`, takeSeat);
    if (mine.length) more.push(['Refund my seat' + (mine.length > 1 ? 's' : ''), refundMine]);   // refunds always show before launch
    else if (!me.address && r.active > 0) more.push(['Refund my seats', async () => {   // not connected: we can't tell whose seats are whose yet
      if (!(await connect())) return;
      if (st.seats.some((s) => s.owner.toBase58() === me.address)) refundMine(); else status('This wallet holds no seats in this party.');
    }]);
    if (me.address && can.host && r.active > 0 && r.active < r.capacity) more.push(['Launch with ' + r.active + ' seat' + (r.active > 1 ? 's' : ''), launch]);   // the host, before it's full
    if (me.address === host && MODE !== 'embed') {   // the host, while it fills
      const waiting = st.waiting.filter((w) => !(st.allow || []).includes(w)).length;
      if (st.gate) more.push([`Refresh from ${gateSym()} holders${waiting ? ` · ${waiting} waiting` : ''}`, refreshHolders]);
      more.push([r.gated ? `Edit the whitelist · ${(st.allow || []).length}` : 'Make it whitelist only', openWhitelist]);
      more.push(['Cancel the party', cancelParty]);
    }
  } else if (launched) {
    /* after launch the big button is always the claim (pump.fun is the small link under the coin's address) */
    const claimable = mine.reduce((t, s) => t + sdk.pumpClaimable(r, s), 0n), anyLeft = st.seats.some((s) => s.released < r.perSeat);
    if (!me.address) button(anyLeft ? `Claim your $${r.symbol}` : 'Every seat has claimed', anyLeft ? claimAfterConnect : null, 'launch');   // a seat holder, not connected yet
    else if (claimable > 0n) button(`Claim ${coins(claimable)} $${r.symbol}`, claim, 'launch');
    else if (st.crewFees > 0n) button(`Collect ${sol(st.crewFees)} SOL in crew fees`, collect, 'launch');   // claimed: the crew's fees are what's left to do
    else if (mine.length && mine.some((s) => s.released < r.perSeat)) button('Unlocking: nothing to claim yet', null, 'launch');
    else button('Share the launch', share);
    if (st.crewFees > 0n && (claimable > 0n || !me.address)) more.push([`Collect ${sol(st.crewFees)} SOL in crew fees`, collect]);
    /* closing a claimed seat only gives back its ~0.0016 SOL deposit. In a crew party an open seat keeps earning its share of the creator fees,
       so closing isn't offered there at all; elsewhere it's a small link that asks first */
    if (r.feeMode !== 'crew' && mine.length && mine.every((s) => s.released >= r.perSeat)) more.push([mine.length > 1 ? 'Close my seats' : 'Close my seat', askClose]);
  } else {
    if (r.active > 0) button('Refund everyone', refundAll); else button('Every seat is refunded', null);
  }
  if (!open && me.address === host && st.spare > 0n) more.push([`Take back ${sol(st.spare)} SOL of the launch reserve`, withdraw]);   // pumpReserveSpare
  if (!open && st.sweepable) more.push(['Sweep the finished party to the host', sweep]);   // anyone may send it; it only pays the host
  more.push(['Share', share]);
  if (MODE === 'embed') more.push(['How it works', openFaq]);
  renderFaq();
  $('more').innerHTML = '';
  for (const [label, fn] of more) $('more').append(Object.assign(document.createElement('button'), { type: 'button', textContent: label, onclick: () => fn() }));
  if (me.address) $('more').append(Object.assign(document.createElement('button'), { type: 'button', className: 'wallet', title: 'Use another wallet',   // switch: forget this one, pick again
    innerHTML: `<i></i>${esc(short(me.address))}<span>Switch</span>`, onclick: async () => { status(''); await forgetWallet(); connect(); } }));
}
/* ---------- launched: the coin's address, your seats, the crew ---------- */
function renderLanded(r, launched, mine, partySize) {
  $('landed').hidden = !launched; $('yours').hidden = true; $('crew').hidden = !launched;
  if (!launched) return;
  const mint = r.mint.toBase58(), done = st.curve && st.curve.complete, sym = '$' + r.symbol;
  $('landed-what').textContent = done ? 'Graduated to PumpSwap' : net.devnet ? 'Launched on pump.fun (devnet)' : 'Launched on pump.fun';
  $('landed-when').textContent = r.launchedAt ? ago(r.launchedAt) : '';
  $('ca').textContent = mint;
  $('ca-copy').onclick = async () => { try { await navigator.clipboard.writeText(mint); $('ca-copy').textContent = 'Copied'; setTimeout(() => { $('ca-copy').textContent = 'Copy'; }, 1600); } catch { prompt('The coin\u2019s contract address', mint); } };
  $('lk-pump').href = 'https://pump.fun/coin/' + mint; $('lk-dex').href = 'https://dexscreener.com/solana/' + mint;
  $('lk-scan').href = 'https://solscan.io/token/' + mint + (net.devnet ? '?cluster=devnet' : '');
  $('lk-pump').hidden = $('lk-dex').hidden = net.devnet;
  /* a coin's price on the curve, in SOL: virtual SOL over virtual coins */
  const solPerCoin = st.curve ? (Number(st.curve.virtualSol) / 1e9) / (Number(st.curve.virtualTokens) / 1e6) : 0;
  const coinUsd = (raw) => (solPerCoin && solUsd && !net.devnet ? ' \u2248 ' + usd(Number(raw) / 1e6 * solPerCoin * solUsd) : '');

  /* your seats: what's yours to claim now, what's still unlocking, what you've claimed, the crew fees riding along */
  if (mine.length) {
    const now = Math.floor(Date.now() / 1000), claimable = mine.reduce((t, s) => t + sdk.pumpClaimable(r, s, now), 0n);
    const claimed = mine.reduce((t, s) => t + s.released, 0n), total = r.perSeat * BigInt(mine.length);
    const fees = r.feeMode === 'crew' && st.vaultLam !== undefined ? mine.reduce((t, s) => t + sdk.pumpSolOwed(r, s, st.vaultLam), 0n) : 0n;
    $('yours').hidden = false;
    $('yours-n').textContent = `${mine.length} seat${mine.length > 1 ? 's' : ''} · ${coins(total)} ${sym}`;
    $('yours-amt').textContent = claimable > 0n ? coins(claimable) : claimed >= total ? coins(claimed) : '0';
    $('yours-sym').textContent = claimable > 0n ? `${sym} to claim${coinUsd(claimable)}` : claimed >= total ? `${sym} claimed` : `${sym} to claim`;
    const vested = r.vest ? Math.min(1, (now - r.launchedAt) / r.vest) : 1;
    $('unlock').hidden = !r.vest;
    if (r.vest) {
      $('unlock-bar').style.width = (vested * 100).toFixed(1) + '%';
      $('unlock-text').textContent = vested >= 1 ? 'Fully unlocked' : `${Math.floor(vested * 100)}% unlocked · all of it in ${span(r.launchedAt + r.vest - now)}`;
    }
    $('yours-sub').innerHTML = [claimed > 0n && claimed < total ? `${coins(claimed)} claimed so far` : '', fees > 0n ? `+${sol(fees)} SOL in crew fees with your next claim` : ''].filter(Boolean).join(' · ');
  }

  /* the crew, seat by seat: claimed, or still to claim; seats closed after claiming are gone from the chain, so they're counted */
  const seats = [...st.seats].sort((a, b) => a.index - b.index), closed = Math.max(0, partySize - seats.length);
  const claimedN = seats.filter((s) => s.released >= r.perSeat).length + closed;
  $('crew-n').textContent = `${partySize} seat${partySize === 1 ? '' : 's'} · ${claimedN} claimed`;
  $('crew-list').innerHTML = seats.slice(0, MODE === 'embed' ? 0 : 50).map((s) => {
    const owner = s.owner.toBase58(), h = handleOf(owner), isMine = owner === me.address, hue = [...owner].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 360, 7);
    const left = sdk.pumpClaimable(r, s), all = s.released >= r.perSeat;
    const state = all ? '<em class="ok">Claimed</em>' : left > 0n ? `<em>To claim · ${coins(left)}</em>` : '<em>Unlocking</em>';
    return `<li class="${isMine ? 'mine' : ''}"><span class="seat taken${isMine ? ' mine' : ''}" style="--h:${hue}">${h ? `<img src="https://unavatar.io/x/${esc(h)}" alt="" loading="lazy" onerror="this.remove()">` : esc(owner.slice(0, 2))}</span>`
      + `<span class="who">${h ? `<a href="https://x.com/${esc(h)}" target="_blank" rel="noopener">@${esc(h)}</a>` : esc(short(owner))}${isMine ? ' <i>you</i>' : ''}${owner === r.host.toBase58() ? ' <i>host</i>' : ''}</span>${state}</li>`;
  }).join('') + (closed ? `<li class="closed"><span class="seat"></span><span class="who">${closed} seat${closed > 1 ? 's' : ''} claimed and closed</span><em class="ok">Done</em></li>` : '');
}

/* how a party works: the room's own terms in the answers */
function faqItems() {
  const r = st.room, f = st.facts || {}, sym = r ? '$' + r.symbol : 'the coin', price = r ? sol(r.seatPrice) + ' SOL' : 'the seat price';
  const fees = !r ? '' : r.feeMode === 'crew' ? 'To the crew: the party is the coin\u2019s creator, so pump.fun\u2019s creator fees are split evenly between the seats still open. Anyone can press Collect, and each seat\u2019s share arrives with its next claim.'
    : r.feeMode === 'holders' ? 'To holders: pump.fun pays its holder rewards to everyone holding the coin, in the party or not. pump.fun decides the payouts.'
    : 'To the host: pump.fun\u2019s creator fees go to a wallet the host chose.';
  const vest = r && r.vest > 0n ? ` They unlock evenly over ${Math.round(Number(r.vest) / 86400)} day${Number(r.vest) === 86400 ? '' : 's'} from launch.` : ' They\u2019re yours at launch.';
  return [
    ['What\u2019s a launch party?', `A host opens a room of seats at one price. When the party launches, every seat\u2019s money goes into one first buy of a new coin on pump.fun, and the coins are split evenly between the seats.`],
    ['Can I get my money back?', 'Yes, until launch. Refund your seat any time before the party launches. If the host cancels, anyone can refund everyone, and each seat\u2019s money goes back to its owner.'],
    ['When does it launch?', 'The moment the last seat fills, anyone can launch it. The host can also launch early with the seats taken so far. There\u2019s no deadline and no countdown.'],
    ['Who can join?', r && r.gated && st.gate ? `Holders of ${gateSym()}${st.gate.min ? ` (at least ${st.gate.min.toLocaleString('en-US')})` : ''}, and the host. The party\u2019s program checks a whitelist, which tweetpad builds from the token\u2019s holders on Solana. Bought in since? Press \u201cAsk to join\u201d: tweetpad checks your balance, and the host adds you with the next refresh.`
      : r && r.gated ? `Only the host and the wallets on the party\u2019s whitelist: the party\u2019s program checks every seat taken or sent. The host can add or remove wallets while the party fills, or let anyone join.${r.maxPerWallet ? ` Each wallet can hold up to ${r.maxPerWallet} seat${r.maxPerWallet > 1 ? 's' : ''}.` : ''}`
      : `Anyone with the link.${r && r.maxPerWallet ? ` Each wallet can hold up to ${r.maxPerWallet} seat${r.maxPerWallet > 1 ? 's' : ''}.` : ''}`],
    ['What do I get?', `An equal share of the coins the party\u2019s buy gets${f.perSeatMain ? `: about ${coins(f.perSeatMain)} ${sym} a seat on pump.fun if every seat fills, at the curve\u2019s price now.${net.devnet ? ` (This devnet test runs on pump.fun\u2019s devnet curve, which is 100 times smaller, so here it\u2019s about ${coins(f.perSeatFull)} a seat.)` : ''}` : '.'}${vest} You claim them here.`],
    ['What does it cost?', `${price} a seat, plus a small deposit (about 0.0016 SOL) for the seat\u2019s account, which comes back when you refund or close the seat. pump.fun takes its own trading fee: 1.25% of every trade on its curve today.`],
    ['Who holds the money until launch?', 'The seat money sits in Launch Party\u2019s party program until launch, and Launch Party holds the key that can update that program. Nobody can take it out but the seat\u2019s owner (a refund) or the launch.'],
    ['Where do the creator fees go?', fees],
    ['Is this pump.fun?', 'No. Parties run on Launch Party\u2019s party program and SDK (@launchpartyV4 on X), brought into posts by tweetpad. Launch Party isn\u2019t affiliated with pump.fun: parties launch through pump.fun\u2019s public programs, and the coin lives on pump.fun like any other.'],
  ];
}
function renderFaq() {
  const html = faqItems().map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');
  const list = $('faq-list'), sheet = $('faq-sheet-list');
  if (list.dataset.v !== html) { list.innerHTML = html; list.dataset.v = html; }
  if (sheet.dataset.v !== html) { sheet.innerHTML = html; sheet.dataset.v = html; }
}
function openFaq() { $('faq-sheet').hidden = false; }

/* the whitelist (the host, while the party fills): rewrite it, or let anyone join. One wallet a line (or commas, spaces); base58
   Solana addresses, repeats dropped (Launch Party's pumpInviteList) */
function whitelist(text) {
  const wallets = new Set(), invalid = [];
  for (const raw of text.split(/[\s,;]+/)) { const t = raw.trim(); if (!t) continue; if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(t)) wallets.add(t); else invalid.push(t); }
  return { wallets: [...wallets], invalid };
}
function wlCount() {
  const { wallets, invalid } = whitelist($('wl-text').value);
  $('wl-count').textContent = `${wallets.length} wallet${wallets.length === 1 ? '' : 's'}${invalid.length ? ` · ${invalid.length} not a wallet address` : ''} · you\u2019re always in`;
  $('wl-save').disabled = !!invalid.length || !wallets.length || wallets.length > sdk.PUMP_ALLOWLIST_MAX;
}
async function openWhitelist() {
  $('wl-text').value = (await sdk.pumpAllowlist(ctx, ROOM).catch(() => [])).map((k) => k.toBase58()).join('\n');
  $('wl-open').hidden = !st.room.gated;
  wlCount(); $('wl-sheet').hidden = false;
}
function saveWhitelist(gated) {
  const { wallets } = whitelist($('wl-text').value);
  $('wl-sheet').hidden = true;
  run(gated ? 'Saving the whitelist' : 'Letting anyone join', async () => { st.allow = null; return sdk.planPumpSetAllowlist(ctx, { host: me.address, room: ROOM, wallets, gated }); });
}
$('wl-text').addEventListener('input', wlCount);

/* a holder who isn't on the list yet: tweetpad checks the balance and queues them for the host */
async function askToJoin() {
  if (!(await connect())) return;
  if ((st.allow || []).includes(me.address) || me.address === st.room.host.toBase58()) return render();
  status(`Checking this wallet holds ${esc(gateSym())}…`);
  try {
    const r = await fetch('/api/party-gate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ room: ROOM, wallet: me.address }) }), j = await r.json();
    if (!r.ok) return status(esc(j.error || 'That didn’t work. Try again.'), 'bad');
    st.waiting = [...new Set([...st.waiting, me.address])];
    status(`You hold ${esc(gateSym())}: you\u2019re in the queue. The host adds holders when they refresh the list.`, 'ok'); render();
  } catch { status('That didn’t work. Try again.', 'bad'); }
}
/* the host: rewrite the whitelist from the token's holders now (new holders in, sellers out; seats already taken stay) */
function refreshHolders() {
  run(`Refreshing the whitelist from ${gateSym()} holders`, async () => {
    const j = await (await fetch(`/api/party-gate?mint=${st.gate.mint}&min=${st.gate.min || 0}`)).json();
    if (!j.wallets) throw new Error(j.error || 'Couldn’t read the token’s holders.');
    st.allow = null;
    return sdk.planPumpSetAllowlist(ctx, { host: me.address, room: ROOM, wallets: j.wallets.filter((w) => w !== me.address).slice(0, sdk.PUMP_ALLOWLIST_MAX), gated: true });
  });
}
$('wl-save').onclick = () => saveWhitelist(true);
$('wl-open').onclick = () => saveWhitelist(false);
$('wl-close').onclick = () => { $('wl-sheet').hidden = true; };
$('faq-sheet-close').onclick = () => { $('faq-sheet').hidden = true; };
$('faq-toggle').onclick = () => { const t = $('faq-toggle'), open = t.getAttribute('aria-expanded') !== 'true'; t.setAttribute('aria-expanded', open); $('faq-list').hidden = !open; };

function button(label, fn, look = '') {
  const go = $('go');
  go.textContent = label; go.disabled = !fn; go.onclick = fn ? () => fn() : null; go.className = 'go' + (look ? ' ' + look : '');
}
const status = (text, tone = '') => { const s = $('status'); s.className = 'status ' + tone; s.innerHTML = text; };

/* ---------- wallets: shared with the host form (assets/party-wallet.js) ---------- */
/* in X's card there's no wallet: on desktop, finish in a pop-out; on a phone, in a wallet's own browser */
function connect() {
  if (me.address) return Promise.resolve(true);
  if (MODE === 'embed' && !wallets.length && !PHONE) {
    const w = window.open(PAGE + '?popup', 'tweetpad-party', 'popup,width=460,height=820');
    if (w) { status('Finish in the window that opened. This card updates when you\u2019re done.'); return Promise.resolve(false); }
  }
  return pickWallet(PAGE, (e) => status(esc(sdk.solanaErrorText(e)), 'bad')).then((ok) => { if (ok) render(); return ok; });
}

/* ---------- actions: build the plan on tap (plans expire in 60 s), sign each step, then read the room again ---------- */
let busy = false;
async function run(label, build, after) {
  if (busy) return;
  if (!(await connect())) return;
  busy = true; $('go').disabled = true;
  try {
    status(esc(label) + '…');
    const who = me.address, plan = await build();
    if (me.address !== who) throw new Error('Your wallet switched accounts. Press again to use the new one.');   // a plan is built for one account
    await sdk.executeSolanaPlan(plan, signer(), ctx.conn, { onStep: (i, step, s) => status(`${esc(step.label)} (${i + 1} of ${plan.steps.length}): ${s === 'signing' ? 'confirm in your wallet' : s === 'pending' ? 'sending…' : 'done'}`) });
    status(esc(label) + ': done.', 'ok');
    if (MODE === 'popup' && window.opener) try { window.opener.postMessage({ type: 'party:changed', room: ROOM }, SITE); } catch { /* the card refreshes itself anyway */ }
    await load();
    if (after) after();
  } catch (e) {
    status(esc(sdk.solanaErrorText(e)), 'bad');
  } finally { busy = false; render(); }
}
const takeSeat = async () => {
  const r = st.room;   // a whitelist party: connect first, then say so here if this wallet isn't on it (rather than the SDK's refusal)
  if (r.gated && !me.address && !(await connect())) return;
  if (r.gated && me.address !== r.host.toBase58() && !(st.allow || []).includes(me.address)) {
    render();
    return status(st.gate ? `This wallet isn\u2019t on the whitelist yet. Hold ${esc(gateSym())}? Press \u201cAsk to join\u201d.` : 'This party is whitelist only, and this wallet isn\u2019t on it.', 'bad');
  }
  return run('Taking a seat', () => sdk.planPumpTakeSeats(ctx, { member: me.address, room: ROOM, seats: 1, ids: sdk.newPumpSeatIds(1) }), offerShare);
};
const refundMine = () => run('Refunding your seats', () => sdk.planPumpRefund(ctx, { member: me.address, room: ROOM }));
const refundAll = () => run('Refunding every seat', () => sdk.planPumpRefund(ctx, { member: me.address, room: ROOM, everyone: true }));
const launch = () => run('Launching on pump.fun', () => sdk.planPumpLaunch(ctx, { launcher: me.address, room: ROOM }));
const claim = () => run('Claiming your coins', () => sdk.planPumpClaim(ctx, { caller: me.address, room: ROOM, member: me.address }));
const closeSeats = () => run('Closing your seats', () => sdk.planPumpCloseSeats(ctx, { member: me.address, room: ROOM }));
const collect = () => run('Collecting the crew’s fees', () => sdk.planPumpCollectFees(ctx, { caller: me.address, room: ROOM }));
/* not connected yet: connect, then claim if this wallet holds seats with coins waiting */
async function claimAfterConnect() {
  if (!(await connect())) return;
  const r = st.room, left = st.seats.filter((s) => s.owner.toBase58() === me.address).reduce((t, s) => t + sdk.pumpClaimable(r, s), 0n);
  if (left > 0n) claim(); else { render(); status(st.seats.some((s) => s.owner.toBase58() === me.address) ? 'Nothing to claim yet: your coins are still unlocking.' : 'This wallet holds no seats in this party. Use Switch to pick the wallet that took the seat.', 'bad'); }
}
/* closing seats: say what it does (and doesn't) before anything is signed */
function askClose() {
  const n = st.seats.filter((s) => s.owner.toBase58() === me.address).length;
  $('close-text').textContent = `Your coins are already in your wallet: closing ${n > 1 ? `these ${n} seats` : 'the seat'} just deletes ${n > 1 ? 'their accounts' : 'its account'} on Solana and gives back the deposit you paid to open ${n > 1 ? 'them' : 'it'}, about ${sol(BigInt(n) * 1_600_000n)} SOL. Nothing else changes, and it can\u2019t be undone.`;
  $('close-yes').textContent = `Close ${n > 1 ? `${n} seats` : 'my seat'} · ${sol(BigInt(n) * 1_600_000n)} SOL back`;
  $('close-sheet').hidden = false;
}
$('close-yes').onclick = () => { $('close-sheet').hidden = true; closeSeats(); };
$('close-no').onclick = () => { $('close-sheet').hidden = true; };
const withdraw = () => run('Taking back the launch reserve', () => sdk.planPumpWithdraw(ctx, { host: me.address, room: ROOM }));
const sweep = () => run('Sweeping the finished party', () => sdk.planPumpSweep(ctx, { caller: me.address, room: ROOM }));
/* the host cancels: asked twice (there's no undo), and every seat stays refundable */
function cancelParty() {
  status('Cancel the party? There\u2019s no launch after that, and every seat stays refundable. <a href="#" id="cancel-yes">Yes, cancel it</a>', 'bad');
  $('cancel-yes').onclick = (e) => { e.preventDefault(); run('Cancelling the party', () => sdk.planPumpCancel(ctx, { host: me.address, room: ROOM })); };
}

/* ---------- sharing: the room, or a seat receipt ---------- */
/* tweets tag @pumpfun rather than write pump.fun: X turns "pump.fun" into a link and takes the post's card from the first link,
   which would show pump.fun's card instead of the party */
const testTag = () => (net.devnet ? ' (Devnet test)' : '');   // a devnet test room's posts say so
function intent(text) { window.open('https://x.com/intent/post?text=' + encodeURIComponent(text + '\n' + PAGE), '_blank', 'noopener'); }
function share() {
  const r = st.room; if (!r) return intent('A launch party on tweetpad');
  intent(r.state === sdk.PUMP_OPEN ? `Launch party: $${r.symbol} on @pumpfun. ${r.capacity - r.active} of ${r.capacity} seats left at ${sol(r.seatPrice)} SOL, refundable until launch.${testTag()}` : `$${r.symbol} launched on @pumpfun as a party of ${r.capacity}: one buy, one price.\nCA: ${r.mint.toBase58()}${testTag()}`);
}
function offerShare() {
  const r = st.room, n = me.address ? st.seats.filter((s) => s.owner.toBase58() === me.address).length : 0;
  if (!r || !n) return;
  status(`You’re in: seat ${r.active} of ${r.capacity}. <a href="#" id="receipt">Share your seat</a>`, 'ok');
  $('receipt').onclick = (e) => { e.preventDefault(); intent(`I'm in: seat ${r.active} of ${r.capacity} in the $${r.symbol} party. ${r.capacity - r.active} left, refundable until launch.${testTag()}`); };
}

/* ---------- keep it live ---------- */
onWalletChange(() => { if (!busy) { status(''); render(); } });   // the wallet switched accounts: this page follows
addEventListener('message', (e) => { if (e.origin === SITE && e.data && e.data.type === 'party:changed' && e.data.room === ROOM) load(); });
setInterval(() => { if (!document.hidden && !busy) load(); }, 12000);
load();
