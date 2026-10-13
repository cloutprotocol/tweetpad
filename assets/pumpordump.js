/* /games/pumpordump: Pump or Dump, call the next candle at 2×, 3× or 5×. One Gamba play a call (assets/gamba-kit.js does the
   wallet, the game balance, the checks and the fairness); this file is the chart and the call. The chart is for show: a call's
   candle is drawn from Gamba's result. ?embed is the X card, ?popup the app's frame (from Games), ?card the card image. */
const BETS = [0.01, 0.02, 0.05, 0.1];   // up to 0.1 SOL a call (api/gamba.js GAMES.pumpordump)
const LEVS = [2, 3, 5];
const opts = { bet: Number(store.get('pod:bet')) || 0.05, lev: Number(store.get('pod:lev')) || 2 };
if (!BETS.includes(opts.bet)) opts.bet = 0.05;
if (!LEVS.includes(opts.lev)) opts.lev = 2;
/* the multipliers, as /api/gamba sets them: Pump wins on the first outcome, Dump on the last */
const betOf = (side, lev) => Array.from({ length: lev }, (_, i) => (i === (side === 'pump' ? 0 : lev - 1) ? lev * 10000 : 0));

/* ---------- the chart: candles for show, a call's candle drawn from the result ---------- */
const cv = $('pod-chart'), ctx = cv.getContext('2d');
const chart = { candles: [], live: null, roll: null, resolve: null, parts: [], shake: 0, next: 0 };
function candle(o, c) { const span = Math.abs(c - o) + o * .004; return { o, c, h: Math.max(o, c) + Math.random() * span * .6, l: Math.min(o, c) - Math.random() * span * .6 }; }
(function seedCandles() {
  let p = 1;
  for (let i = 0; i < 30; i++) { const c = p * (1 + (Math.random() - .5) * .03); chart.candles.push(candle(p, c)); p = c; }
  chart.live = candle(p, p);
})();
function stepAmbient(now) {
  if (chart.roll || chart.resolve || now < chart.next) return;
  chart.next = now + 650;
  const lv = chart.live;
  chart.candles.push(lv);
  if (chart.candles.length > 30) chart.candles.shift();
  chart.live = candle(lv.c, lv.c * (1 + (Math.random() - .49) * .025));
}
function draw(now) {
  const w = cv.clientWidth, hgt = cv.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(hgt * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(hgt * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, hgt);
  const lv = chart.live;
  /* the rolling candle wiggles harder the longer Gamba takes; the resolving one eases to its close */
  if (chart.roll) {
    const t = (now - chart.roll.at) / 1000, amp = Math.min(.012 + t * .02, .05);
    lv.c = lv.o * (1 + Math.sin(t * 19) * amp * .7 + Math.sin(t * 7.3) * amp * .5);
    lv.h = Math.max(lv.h, lv.c); lv.l = Math.min(lv.l, lv.c);
    const k = Math.floor(t * 9);
    if (k !== chart.roll.k) { chart.roll.k = k; sfx.tick(k % 24); }
  } else if (chart.resolve) {
    const r = chart.resolve, t = Math.min(1, (now - r.at) / 520), e = 1 - Math.pow(1 - t, 3);
    lv.c = r.from + (r.to - r.from) * e;
    lv.h = Math.max(lv.h, lv.c); lv.l = Math.min(lv.l, lv.c);
    if (t >= 1 && !r.done) { r.done = true; r.then(); }
  }
  const all = [...chart.candles, lv];
  let hi = -Infinity, lo = Infinity;
  for (const c of all) { hi = Math.max(hi, c.h); lo = Math.min(lo, c.l); }
  const pad = (hi - lo) * .12 || .01;
  hi += pad; lo -= pad;
  const y = (v) => 6 + (hgt - 12) * (1 - (v - lo) / (hi - lo));
  const n = all.length, cw = w / (n + 1.5), bw = Math.max(3, cw * .62);
  /* the grid, and the live price line */
  ctx.strokeStyle = 'rgba(120, 160, 190, .09)'; ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) { const gy = Math.round(hgt * i / 4) + .5; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }
  const shake = chart.shake > now ? (Math.random() - .5) * 6 : 0;
  all.forEach((c, i) => {
    const x = cw * (i + .9) + shake, up = c.c >= c.o, live = i === n - 1;
    ctx.strokeStyle = ctx.fillStyle = up ? '#3ddc84' : '#ff5a5f';
    if (live) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = chart.roll || chart.resolve ? 14 : 6; }
    ctx.beginPath(); ctx.moveTo(x, y(c.h)); ctx.lineTo(x, y(c.l)); ctx.stroke();
    const top = y(Math.max(c.o, c.c)), body = Math.max(2, y(Math.min(c.o, c.c)) - top);
    ctx.fillRect(x - bw / 2, top, bw, body);
    ctx.shadowBlur = 0;
  });
  const py = y(lv.c);
  ctx.setLineDash([3, 3]); ctx.strokeStyle = lv.c >= lv.o ? 'rgba(61, 220, 132, .55)' : 'rgba(255, 90, 95, .55)';
  ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke(); ctx.setLineDash([]);
  /* a win's rockets and coins */
  chart.parts = chart.parts.filter(p => now - p.at < 1500);
  ctx.textAlign = 'center';
  for (const p of chart.parts) {
    const t = (now - p.at) / 1000;
    ctx.globalAlpha = Math.max(0, 1 - t / 1.5);
    ctx.font = p.size + 'px serif';
    ctx.fillText(p.ch, p.x + p.vx * t * 60, p.y + (p.vy * t + 4.5 * t * t) * 60);
  }
  ctx.globalAlpha = 1;
  const price = $('pod-price');
  price.textContent = lv.c.toFixed(4);
  price.className = lv.c >= lv.o ? 'up' : 'dn';
}
function frame(now) { if (!document.hidden) { stepAmbient(now); draw(now); } requestAnimationFrame(frame); }
function burst(gold) {
  const now = performance.now(), x = cv.clientWidth * .85, y = cv.clientHeight * .3;
  const chars = gold ? ['💰', '🎰', '⭐', '💎'] : ['🚀', '💰', '🟩', '✨'];
  for (let i = 0; i < (gold ? 34 : 20); i++) chart.parts.push({ at: now, x, y, ch: chars[i % chars.length], size: 12 + Math.random() * 12, vx: (Math.random() - .7) * 3, vy: -1.5 - Math.random() * 2.5 });
}
const startRoll = () => { chart.roll = { at: performance.now(), k: -1 }; $('gk-screen').classList.add('rolling'); };
const stopRoll = () => { chart.roll = null; $('gk-screen').classList.remove('rolling'); };
/* ease the live candle to the result; the move is bigger at higher leverage */
function resolveCandle(up, lev) {
  return new Promise((then) => {
    const lv = chart.live, move = (.05 + lev * .012) * (up ? 1 : -1);
    stopRoll();
    chart.resolve = { at: performance.now(), from: lv.c, to: lv.o * (1 + move), then: () => { chart.resolve = null; chart.next = performance.now() + 1600; then(); } };
  });
}

/* ---------- a call ---------- */
/* the words on the stamp: a win, or the way it went against you */
function verdict(win, side, lev) {
  if (win) return side === 'pump' ? 'TO THE MOON' : 'CALLED THE DUMP';
  return lev > 2 ? 'LIQUIDATED' : side === 'pump' ? 'RUGGED' : 'SQUEEZED';
}
async function call(side) {
  if (kit.busy) return;
  sfx.call();
  document.querySelector('.scroll').scrollTo({ top: 0, behavior: 'smooth' });   // the chart in view for the roll
  const lev = opts.lev, bet = betOf(side, lev), real = kit.mode === 'real';
  if (real && !kit.ready()) return;
  kit.busy = true; kit.render();
  let r;
  if (real) {
    const wager = Math.round(opts.bet * 1e9);
    r = await kit.play({ wager, side, lev }, { wager, bet, metadata: '0:pumpordump:' + side + ':' + lev }, startRoll);
  } else {
    if (kit.practiceBank.balance >= opts.bet * (1 + kit.feeBps() / 10000)) { startRoll(); say('', 'Rolling… (practice)'); await sleep(1100 + Math.random() * 500); }
    r = await kit.practice(opts.bet, bet, kit.feeBps());
  }
  if (r) await land(r, side, lev);
  else stopRoll();
  kit.busy = false; kit.render(); kit.renderFair();
}
async function land(r, side, lev) {
  const s = kit.my;
  await resolveCandle(r.win ? side === 'pump' : side !== 'pump', lev);
  const net = r.payout + r.jackpot - r.cost;
  s.net += net;
  s.a = r.win ? s.a + 1 : 0;           // streak
  s.b = Math.max(s.b, s.a);            // best streak
  kit.saveSess();
  if (r.jackpot > 0) { stamp('jack', 'JACKPOT', '+' + sol(r.jackpot) + ' SOL'); flash('jack'); burst(true); sfx.jackpot(); buzz([40, 50, 40, 50, 120]); }
  else if (r.win) { stamp('win', verdict(true, side, lev), signed(net) + ' SOL'); flash('win'); burst(false); sfx.win(); buzz([30, 40, 30]); }
  else { stamp('lose', verdict(false, side, lev), signed(net) + ' SOL'); flash('lose'); chart.shake = performance.now() + 380; sfx.lose(); buzz(140); }
  say(r.win ? 'ok' : 'bad', r.win ? (s.a > 1 ? s.a + ' in a row 🔥 ' : '') + 'Won ' + sol(r.payout) + ' SOL' : 'Lost ' + sol(r.cost) + ' SOL · call the next one');
  renderSession(r.win);
}

/* ---------- rendering ---------- */
function chips(id, values, current, label, disabled, pick) {
  $(id).replaceChildren(...values.map(v => {
    const b = el('button', { type: 'button', textContent: label(v), disabled: disabled(v) });
    b.setAttribute('aria-pressed', String(v === current));
    b.addEventListener('click', () => { pick(v); kit.render(); });
    return b;
  }));
}
function render() {
  const lev = opts.lev;
  chips('pod-bets', BETS, opts.bet, String, () => kit.busy, (v) => { opts.bet = v; store.set('pod:bet', v); });
  chips('pod-levs', LEVS, lev, (v) => v + '×', () => kit.busy, (v) => { opts.lev = v; store.set('pod:lev', v); });
  $('pod-odds').textContent = Math.round(100 / lev) + '% to win';
  const wins = 'wins ' + sol(opts.bet * lev) + ' SOL';
  $('pod-pump').querySelector('span').textContent = wins;
  $('pod-dump').querySelector('span').textContent = wins;
  for (const id of ['pod-pump', 'pod-dump']) $(id).disabled = kit.busy;
  document.querySelector('.gk-controls').classList.toggle('busy', kit.busy);
}
function renderSession(won) {
  const s = kit.my;
  $('pod-streak').textContent = s.a + (s.a >= 3 ? ' 🔥' : '');
  $('pod-best').textContent = s.b;
  $('gk-net').textContent = signed(s.net);
  $('gk-net').className = s.net > 0 ? 'up' : s.net < 0 ? 'dn' : '';
  $('gk-net-label').textContent = kit.mode === 'real' ? 'Net (SOL)' : 'Net (practice)';
  if (won) { $('pod-streak').classList.remove('pop'); void $('pod-streak').offsetWidth; $('pod-streak').classList.add('pop'); }
}

kit.init({
  id: 'pumpordump', idle: 'Call the next candle', suspense: 1300, render, onMode: () => renderSession(),
  fees: { creatorBps: 100, gambaBps: 90, poolBps: 180, jackpotBps: 10 },
  costLine: (feeBps) => 'costs ' + sol(opts.bet * (1 + feeBps / 10000)) + ' SOL with fees · pays ' + sol(opts.bet * opts.lev) + ' SOL on a win',
  feedCall: (p) => el('span', { className: 'call ' + (p.side === 'pump' ? 'up' : 'dn'), textContent: (p.side === 'pump' ? '▲ PUMP ' : '▼ DUMP ') + p.lev + '×' }),
});
$('pod-pump').addEventListener('click', () => call('pump'));
$('pod-dump').addEventListener('click', () => call('dump'));
/* ↑ / W calls Pump, ↓ / S calls Dump (not while typing a seed) */
document.addEventListener('keydown', (ev) => {
  if (ev.target.closest('input, textarea') || ev.metaKey || ev.ctrlKey || ev.altKey) return;
  if (ev.key === 'ArrowUp' || ev.key === 'w') { ev.preventDefault(); call('pump'); }
  else if (ev.key === 'ArrowDown' || ev.key === 's') { ev.preventDefault(); call('dump'); }
});
renderSession();
requestAnimationFrame(frame);
