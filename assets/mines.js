/* /games/mines: Mines, reveal tiles on a 5×5 board and cash out before a mine. Each tile is one Gamba play at the true odds of
   the tiles left (api/gamba.js minesBet): a safe tile pays left/safe times what rode on it, and the next tile rides that; a mine
   loses it. Cashing out just stops: every tile's win is already paid. Where the other mines lay is only drawn for show when a
   round ends. assets/gamba-kit.js does the wallet, the game balance, the checks and the fairness. */
const CELLS = 25;
const MINES = [3, 5, 10];
const BETS = [0.01, 0.02, 0.05, 0.1];   // a round starts with up to 0.1 SOL (api/gamba.js GAMES.mines)
const MAX_WIN = 2;                       // SOL: a round stops riding before a tile could pay more
const opts = { bet: Number(store.get('mines:bet')) || 0.05, mines: Number(store.get('mines:mines')) || 3 };
if (!BETS.includes(opts.bet)) opts.bet = 0.05;
if (!MINES.includes(opts.mines)) opts.mines = 3;
/* the round: what rides (lamports), the tiles found, and how it ended; kept per mode so a reload carries on */
const fresh = () => ({ on: false, mines: opts.mines, start: 0, step: 0, value: 0, gems: [], booms: [], fake: [], over: null });
const roundKey = () => 'mines:round:' + kit.mode;
let round = fresh();
function loadRound() { try { const v = JSON.parse(store.get(roundKey())); round = v && Array.isArray(v.gems) ? v : fresh(); } catch { round = fresh(); } }
const saveRound = () => store.set(roundKey(), JSON.stringify(round));
const payOf = (mines, step) => { const left = CELLS - step, safe = left - mines; return Math.floor(left * 10000 / safe); };
const betOf = (mines, step) => { const left = CELLS - step, pay = payOf(mines, step); return Array.from({ length: left }, (_, i) => (i < mines ? 0 : pay)); };
const chanceOf = (mines, step) => (CELLS - step - mines) / (CELLS - step);
/* what rides on the next tile, and what it would pay */
const riding = () => (round.on ? round.value : Math.round(opts.bet * 1e9));
const nextWin = () => Math.floor(riding() * payOf(round.on ? round.mines : opts.mines, round.on ? round.step : 0) / 10000);
const capped = () => round.on && (nextWin() > MAX_WIN * 1e9 || round.step >= CELLS - round.mines);

/* ---------- the board ---------- */
const board = $('mines-board');
const tiles = Array.from({ length: CELLS }, (_, i) => {
  const b = el('button', { type: 'button', className: 'mine-tile', 'aria-label': 'Tile ' + (i + 1) });
  b.append(el('span', { className: 'face' }));
  b.addEventListener('click', () => reveal(i));
  board.append(b);
  return b;
});
function paintBoard() {
  tiles.forEach((t, i) => {
    const gem = round.gems.includes(i), boom = round.booms.includes(i), fake = round.fake.includes(i);
    t.className = 'mine-tile' + (gem ? ' gem' : '') + (boom ? ' boom' : '') + (fake ? ' ghost' : '') + (round.over && !gem && !boom && !fake ? ' spent' : '');
    t.querySelector('.face').textContent = gem ? '💎' : boom ? '💥' : fake ? '💣' : '';
    t.disabled = kit.busy || (!round.over && (gem || capped()));   // a finished board: any tile starts the next round
  });
}

/* ---------- a tile ---------- */
async function reveal(i) {
  if (kit.busy) return;
  if (round.over) { round = fresh(); kit.render(); }
  if (round.gems.includes(i) || capped()) return;
  const real = kit.mode === 'real';
  if (real && !kit.ready()) return;
  if (!round.on) round = { ...fresh(), on: true, mines: opts.mines, start: Math.round(opts.bet * 1e9), value: Math.round(opts.bet * 1e9) };
  const { mines, step } = round, wager = round.value, bet = betOf(mines, step);
  kit.busy = true; kit.render();
  const t = tiles[i];
  const spin = () => t.classList.add('rolling');
  sfx.call();
  let r;
  if (real) r = await kit.play({ wager, mines, step }, { wager, bet, metadata: '0:mines:' + mines + ':' + step }, spin);
  else { spin(); say('', 'Digging… (practice)'); await sleep(450 + Math.random() * 250); r = await kit.practice(wager / 1e9, bet, kit.feeBps()); }
  t.classList.remove('rolling');
  if (!r) { if (step === 0) round = fresh(); kit.busy = false; kit.render(); return; }
  const s = kit.my;
  s.net += r.payout - r.cost;
  if (r.win) {
    round.gems.push(i); round.step += 1; round.value = Math.floor(wager * bet[r.index] / 10000);
    sfx.gem(round.step); buzz(20);
    say('ok', '💎 Safe · ×' + mult().toFixed(2) + ' · ' + sol(round.value / 1e9) + ' SOL riding');
    if (capped()) say('ok', 'The board is as far as it goes: cash out ' + sol(round.value / 1e9) + ' SOL');
  } else {
    round.booms.push(i); round.over = 'boom'; round.on = false;
    /* the other mines, drawn for show */
    const free = tiles.map((_, k) => k).filter(k => k !== i && !round.gems.includes(k));
    for (let n = 0; n < mines - 1 && free.length; n++) round.fake.push(free.splice(Math.random() * free.length | 0, 1)[0]);
    sfx.boom(); buzz([60, 40, 120]); flash('lose');
    $('gk-screen').classList.remove('shake'); void $('gk-screen').offsetWidth; $('gk-screen').classList.add('shake');
    stamp('lose', 'BOOM', '−' + sol(round.start / 1e9) + ' SOL');
    say('bad', 'Hit a mine on tile ' + (round.step + 1) + ' · pick a tile to go again');
  }
  kit.saveSess(); saveRound();
  kit.busy = false; kit.render(); kit.renderFair();
}
const mult = () => (round.start ? round.value / round.start : 1);
function cashOut() {
  if (kit.busy || !round.on || !round.step) return;
  const won = round.value / 1e9, x = mult(), s = kit.my;
  s.a = Math.max(s.a, Math.round(x * 100) / 100);   // best cash out
  s.b += 1;                                         // rounds cashed out
  round.on = false; round.over = 'cashed';
  kit.saveSess(); saveRound();
  stamp('win', 'CASHED OUT ×' + x.toFixed(2), '+' + sol(won - round.start / 1e9) + ' SOL'); flash('win'); sfx.win(); buzz([30, 40, 30]);
  say('ok', 'Cashed out ' + sol(won) + ' SOL' + (kit.mode === 'real' ? ' · it\'s in your ' + (kit.session ? 'game balance' : 'wallet') : '') + ' · pick a tile to go again');
  kit.render();
}
/* a finished round clears on the next pick of bet, mines or tile */
function clearOver() { if (round.over) { round = fresh(); saveRound(); } }

/* ---------- rendering ---------- */
function chips(id, values, current, label, disabled, pick) {
  $(id).replaceChildren(...values.map(v => {
    const b = el('button', { type: 'button', textContent: label(v), disabled: disabled(v) });
    b.setAttribute('aria-pressed', String(v === current));
    b.addEventListener('click', () => { pick(v); clearOver(); kit.render(); });
    return b;
  }));
}
function render() {
  const locked = kit.busy || round.on;
  chips('mines-bets', BETS, opts.bet, String, () => locked, (v) => { opts.bet = v; store.set('mines:bet', v); });
  chips('mines-count', MINES, round.on ? round.mines : opts.mines, (v) => v + ' 💣', () => locked, (v) => { opts.mines = v; store.set('mines:mines', v); });
  const m = round.on ? round.mines : opts.mines, step = round.on ? round.step : 0;
  $('mines-next').textContent = capped() ? 'max' : '×' + (payOf(m, step) / 10000).toFixed(2);
  $('mines-chance').textContent = capped() ? '' : Math.round(chanceOf(m, step) * 100) + '% safe';
  $('mines-value').textContent = round.on && round.step ? sol(round.value / 1e9) + ' SOL' : '—';
  $('mines-mult').textContent = round.on && round.step ? '×' + mult().toFixed(2) : '';
  const cash = $('mines-cash');
  cash.disabled = kit.busy || !(round.over || (round.on && round.step));
  cash.querySelector('b').textContent = round.on && round.step ? 'CASH OUT ' + sol(round.value / 1e9) + ' SOL' : round.over ? 'NEW ROUND' : 'PICK A TILE';
  cash.querySelector('span').textContent = round.on && round.step ? '×' + mult().toFixed(2) + ' on ' + sol(round.start / 1e9) + ' SOL' : 'each tile is its own draw at the true odds';
  cash.classList.toggle('ready', round.on && round.step > 0 && !kit.busy);
  document.querySelector('.gk-controls').classList.toggle('busy', kit.busy);
  paintBoard();
  renderSession();
}
function renderSession() {
  const s = kit.my;
  $('mines-best').textContent = s.a ? '×' + s.a : '—';
  $('mines-rounds').textContent = s.b;
  $('gk-net').textContent = signed(s.net);
  $('gk-net').className = s.net > 0 ? 'up' : s.net < 0 ? 'dn' : '';
  $('gk-net-label').textContent = kit.mode === 'real' ? 'Net (SOL)' : 'Net (practice)';
}

kit.init({
  id: 'mines', idle: 'Pick a tile', render, onMode: () => { loadRound(); kit.render(); },
  fees: { creatorBps: 50, gambaBps: 90, poolBps: 180, jackpotBps: 0 },
  costLine: (feeBps) => (round.on && round.step ? 'the next tile rides ' + sol(round.value / 1e9) + ' SOL' : 'a round starts with ' + sol(opts.bet) + ' SOL')
    + ' · ' + (feeBps / 100).toFixed(1) + '% fees a tile',
  feedCall: (p) => el('span', { className: 'call ' + (p.payout ? 'up' : 'dn'), textContent: (p.payout ? '💎 tile ' : '💥 tile ') + (p.step + 1) + ' · ' + p.mines + '💣' }),
});
$('mines-cash').addEventListener('click', () => { if (round.over) { clearOver(); kit.render(); } else cashOut(); });
loadRound();
if (round.over) round = fresh();
kit.render();
