/* /custom: Ethereum custom launches through Launch Party's CustomLaunch, with the hook fixed or upgradeable (api/_eth-launch.js).
   The same steps as the launch form's Ethereum option: the image and metadata go to IPFS, Launch Party's review is asked from
   this browser, /api/evm-create checks its answer and rebuilds the transaction, the wallet sends it, /api/launches lists the coin.
   Here a creator may also choose an upgradeable hook (they become the proxy's admin) and a team share that vests to them, and can
   freeze an upgradeable hook later. ?embed is the X card (it pops the deployer out), ?popup the pop-out, ?card the card image. */
const $ = (id) => document.getElementById(id);
const MODE = document.documentElement.dataset.mode;
const ETH = { id: 1, hex: '0x1', explorer: 'https://etherscan.io' };
const RPC = 'https://ethereum-rpc.publicnode.com';
const opts = { hook: 'fixed', feePct: 2, start: '10', team: 0, vest: 60 };
const wallet = { list: [], active: null, address: null };
const form = { file: null, bytes: null, sha: null, url: null, thumb: '', busy: false, checks: [], done: null };
const short = (a) => a.slice(0, 6) + '…' + a.slice(-4);
const errText = (e) => String((e && (e.message || e.reason)) || e).replace(/^Error:? /, '');
const hex = (bytes) => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');

async function api(path, json) {
  const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(json) });
  const out = await r.json().catch(() => null);
  if (!r.ok || !out) throw new Error((out && out.error) || 'HTTP ' + r.status);
  return out;
}
async function ethCall(to, data) {
  const r = await (await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }) })).json();
  if (r.error) throw new Error(r.error.message);
  return r.result;
}

/* ---------- wallets: EIP-6963, or the one injected window.ethereum ---------- */
window.addEventListener('eip6963:announceProvider', (ev) => {
  const d = ev.detail;
  if (d && d.provider && d.info && !wallet.list.some(w => w.info.uuid === d.info.uuid)) { wallet.list.push(d); render(); }
});
const providers = () => (wallet.list.length ? wallet.list : window.ethereum ? [{ info: { name: 'Browser wallet', uuid: 'injected', icon: '' }, provider: window.ethereum }] : []);
async function connect(entry) {
  try {
    const [address] = await entry.provider.request({ method: 'eth_requestAccounts' });
    Object.assign(wallet, { active: entry, address });
    loadMine();
  } catch (err) { setChecks([{ tone: 'bad', text: /reject|denied|cancel/i.test(errText(err)) ? 'Connection declined in the wallet' : errText(err) }]); }
  render();
}
async function ensureEthereum(p) {
  if (parseInt(await p.request({ method: 'eth_chainId' }), 16) === ETH.id) return;
  await p.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ETH.hex }] });
}

/* ---------- the image: read, hashed (the IPFS step must hash the same bytes), and a 64 px thumbnail for the lists ---------- */
async function takeImage(file) {
  if (!file || !/^image\/(png|jpeg|gif|webp)$/.test(file.type) || file.size > 4 * 1024 * 1024) return setChecks([{ tone: 'bad', text: 'Use a PNG, JPG, GIF or WebP up to 4 MB' }]);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sha = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
  if (form.url) URL.revokeObjectURL(form.url);
  const url = URL.createObjectURL(file);
  Object.assign(form, { file, bytes, sha, url, thumb: await thumbOf(url), done: null, checks: [] });
  $('cl-drop').replaceChildren(Object.assign(document.createElement('img'), { src: url, alt: '' }));
  render();
}
async function thumbOf(url) {
  try {
    const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    c.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 64, 64);
    for (const [type, q] of [['image/webp', .8], ['image/jpeg', .8], ['image/png']]) { const d = c.toDataURL(type, q); if (d.startsWith('data:' + type) && d.length < 20000) return d; }
  } catch { /* the lists fall back to the full image */ }
  return '';
}

/* ---------- the form ---------- */
const toUrl = (v, hosts, prefix) => {
  v = String(v || '').trim();
  if (!v) return '';
  if (/\s/.test(v)) return null;
  if (/^@?[A-Za-z0-9_]{1,30}$/.test(v) && prefix) return prefix + v.replace(/^@/, '');
  const u = /^https?:\/\//i.test(v) ? v : 'https://' + v;
  try { const h = new URL(u).hostname.replace(/^www\./, ''); return !hosts || hosts.includes(h) ? 'https://' + u.replace(/^https?:\/\//i, '') : null; } catch { return null; }
};
const links = () => ({ twitter: toUrl($('cl-x').value, ['x.com', 'twitter.com'], 'https://x.com/'), website: toUrl($('cl-web').value) });
function problem() {
  if (!form.file) return 'Add an image';
  if (!$('cl-name').value.trim()) return 'Add a name';
  if (!/^[A-Z0-9]{2,10}$/.test($('cl-ticker').value.trim())) return 'Ticker: 2–10 letters or numbers';
  const l = links();
  if (l.twitter === null) return 'X link: @handle or an x.com link';
  if (l.website === null) return 'Website: check the address';
  return null;
}
function setChecks(list) { form.checks = list; renderChecks(); }
function check(tone, text, href, link) {
  const last = form.checks[form.checks.length - 1];
  if (last && last.tone === 'warn') form.checks.pop();
  form.checks.push({ tone, text, href, link });
  renderChecks();
}
function renderChecks() {
  $('cl-checks').replaceChildren(...form.checks.map(c => {
    const li = Object.assign(document.createElement('li'), { className: c.tone, textContent: c.text });
    if (c.href) li.append(Object.assign(document.createElement('a'), { href: c.href, target: '_blank', rel: 'noopener', textContent: c.link || '↗' }));
    return li;
  }));
}
function render() {
  for (const b of document.querySelectorAll('[data-hook]')) b.setAttribute('aria-pressed', String(b.dataset.hook === opts.hook));
  for (const b of document.querySelectorAll('[data-fee]')) b.setAttribute('aria-pressed', String(Number(b.dataset.fee) === opts.feePct));
  for (const b of document.querySelectorAll('[data-start]')) b.setAttribute('aria-pressed', String(b.dataset.start === opts.start));
  for (const b of document.querySelectorAll('[data-team]')) b.setAttribute('aria-pressed', String(Number(b.dataset.team) === opts.team));
  for (const b of document.querySelectorAll('[data-vest]')) b.setAttribute('aria-pressed', String(Number(b.dataset.vest) === opts.vest));
  for (const b of document.querySelectorAll('.deployer button:not(#cl-launch)')) b.disabled = form.busy;
  $('cl-vest-row').hidden = !opts.team;
  const t = $('cl-ticker').value.trim() || 'TICKER';
  $('cl-summary').replaceChildren(...[
    'Each trade: ', b(opts.feePct + '% to you'), ', in ETH and $' + t + '. ',
    opts.hook === 'fixed' ? 'The hook is fixed forever. ' : 'You can change the hook later, in public, or freeze it. ',
    opts.team ? opts.team + '% of supply vests to you over ' + opts.vest + ' days. ' : 'All the supply goes to the pool. ',
    'Opens at ' + opts.start + ' ETH.']);
  /* wallet line */
  const list = providers();
  $('cl-wallet').textContent = wallet.address ? short(wallet.address) + ' · ' + wallet.active.info.name : list.length ? '' : 'No EVM wallet here: install MetaMask, Rabby or Phantom';
  $('cl-wallets').replaceChildren(...(wallet.address ? [btn('Disconnect', () => { Object.assign(wallet, { active: null, address: null }); $('cl-mine').hidden = true; render(); })]
    : list.map(e => btn(e.info.name, () => connect(e)))));
  const p = problem();
  $('cl-launch').disabled = form.busy;
  $('cl-launch').textContent = form.busy ? 'Launching…' : form.done ? 'Launch another' : !wallet.address ? 'Connect a wallet' : p || 'Launch $' + t + ' on Ethereum';
  renderBrief();
}
const b = (text) => Object.assign(document.createElement('b'), { textContent: text });
const btn = (text, onclick) => { const e = Object.assign(document.createElement('button'), { type: 'button', className: 'btn', textContent: text }); e.addEventListener('click', onclick); return e; };

/* ---------- the launch ---------- */
async function onLaunch() {
  if (form.done) { Object.assign(form, { done: null, checks: [] }); renderChecks(); return render(); }
  if (!wallet.address) { const list = providers(); if (list.length === 1) connect(list[0]); return; }
  if (problem() || form.busy) return render();
  form.busy = true; form.checks = []; render();
  const l = links(), name = $('cl-name').value.trim(), symbol = $('cl-ticker').value.trim();
  let hash = null;
  try {
    check('warn', 'Uploading image and metadata to IPFS…');
    const meta = { name, symbol, description: $('cl-desc').value.trim(), ...(l.twitter ? { twitter: l.twitter } : {}), ...(l.website ? { website: l.website } : {}) };
    const r = await fetch('/api/ipfs', { method: 'POST', body: form.bytes, headers: { 'content-type': 'application/octet-stream', 'x-file-type': form.file.type, 'x-meta': encodeURIComponent(JSON.stringify(meta)) } });
    const ipfs = await r.json().catch(() => null);
    if (!r.ok || !ipfs) throw new Error((ipfs && ipfs.error) || 'IPFS upload failed');
    if (ipfs.sha256 !== form.sha) throw new Error('IPFS step hashed a different image');
    check('ok', 'Image and metadata on IPFS', ipfs.uri, 'JSON ↗');

    check('warn', 'Building the Ethereum launch…');
    const fields = { chain: 'ethereum', wallet: wallet.address, name, symbol, uri: ipfs.uri, feePct: opts.feePct, openingValue: opts.start,
      hook: opts.hook, teamPct: opts.team, teamVestDays: opts.team ? opts.vest : 0, twitter: l.twitter || '', website: l.website || '' };
    const req = await api('/api/evm-create', { ...fields, step: 'request' });
    check('warn', 'Launch Party is reviewing the launch…');
    const pr = await fetch(req.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req.body) });
    const prepared = await pr.json().catch(() => null);
    if (pr.status === 429) throw new Error('Launch Party\'s review is busy for this connection; try again in a few minutes');
    if (!prepared) throw new Error('Launch Party\'s review did not answer (' + pr.status + ')');
    const built = await api('/api/evm-create', { ...fields, image: ipfs.image, thumb: form.thumb, prepared });
    check('ok', 'Reviewed by Launch Party and checked here: approved for 30 minutes');

    const p = wallet.active.provider;
    await ensureEthereum(p);
    check('warn', 'Approve in ' + wallet.active.info.name + '…');
    hash = await p.request({ method: 'eth_sendTransaction', params: [{ from: wallet.address, ...built.tx }] });
    check('warn', 'Confirming on Ethereum…', ETH.explorer + '/tx/' + hash, 'Tx ↗');
    let rec = null;
    for (let i = 0; i < 16 && !rec; i++) {
      try { rec = await api('/api/launches', { chain: 'ethereum', hash }); }
      catch (err) { if (!/not found yet/.test(errText(err)) || i === 15) throw err; await new Promise(res => setTimeout(res, 2500)); }
    }
    check('ok', '$' + symbol + ' is live on Ethereum', '/c/' + rec.launch.mint, 'Its card ↗');
    form.done = rec.launch;
    loadMine();
  } catch (err) {
    const msg = errText(err);
    if (hash && /not found yet/.test(msg)) { check('bad', 'Sent, not confirmed yet: check the transaction before launching again', ETH.explorer + '/tx/' + hash, 'Tx ↗'); form.done = { pending: hash }; }
    else check('bad', /reject|denied|cancel/i.test(msg) ? 'Cancelled in the wallet' : msg, hash ? ETH.explorer + '/tx/' + hash : undefined, hash ? 'Tx ↗' : undefined);
  } finally {
    form.busy = false;
    render();
  }
}

/* ---------- your upgradeable hooks: who operates each, and Freeze (the admin gives the hook up for good) ---------- */
const SEL = { admin: '0x3e47158c', freeze: '0x7d4c8611' };   // proxyAdmin(), proxyFreeze()
async function loadMine() {
  if (!wallet.address) return;
  const r = await fetch('/api/launches?creator=' + wallet.address).then(x => x.json()).catch(() => null);
  const coins = ((r && r.launches) || []).filter(c => c.chain === 'ethereum' && c.upgradeable);
  $('cl-mine').hidden = !coins.length;
  if (!coins.length) return;
  const rows = await Promise.all(coins.map(async (c) => {
    const admin = await ethCall(c.hook, SEL.admin).then(v => '0x' + v.slice(26)).catch(() => null);
    return { c, admin };
  }));
  $('cl-coins').replaceChildren(...rows.map(({ c, admin }) => {
    const li = document.createElement('li');
    const frozen = admin && /^0x0{40}$/.test(admin), mine = admin && admin.toLowerCase() === wallet.address.toLowerCase();
    li.append(b('$' + c.symbol), Object.assign(document.createElement('span'), { className: 'grow',
      textContent: admin == null ? 'hook status unavailable' : frozen ? 'frozen: fixed forever' : mine ? 'you can change it' : 'operated by ' + short(admin) }));
    if (mine && !frozen) li.append(btn('Freeze for good', () => freeze(c)));
    return li;
  }));
}
async function freeze(c) {
  if (form.busy || !confirmFreeze(c)) return;
  form.busy = true; render();
  try {
    const p = wallet.active.provider;
    await ensureEthereum(p);
    /* a dry run first: only the hook's admin can freeze, and a frozen hook stays frozen */
    const sim = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ from: wallet.address, to: c.hook, data: SEL.freeze }, 'latest'] }) }).then(x => x.json());
    if (sim.error) throw new Error('the freeze would fail: ' + sim.error.message);
    setChecks([{ tone: 'warn', text: 'Approve the freeze of $' + c.symbol + '\'s hook in ' + wallet.active.info.name + '…' }]);
    const h = await p.request({ method: 'eth_sendTransaction', params: [{ from: wallet.address, to: c.hook, data: SEL.freeze, chainId: ETH.hex }] });
    check('ok', '$' + c.symbol + '\'s hook is frozen once this confirms', ETH.explorer + '/tx/' + h, 'Tx ↗');
    setTimeout(loadMine, 15000);
  } catch (err) {
    const msg = errText(err);
    check('bad', /reject|denied|cancel/i.test(msg) ? 'Cancelled in the wallet' : msg);
  } finally { form.busy = false; render(); }
}
/* the one irreversible step on this page: said in words before the wallet opens (no browser dialog: they block in X's frame) */
const armed = {};
function confirmFreeze(c) {
  if (armed[c.mint] && Date.now() - armed[c.mint] < 8000) { delete armed[c.mint]; return true; }
  armed[c.mint] = Date.now();
  setChecks([{ tone: 'warn', text: 'Freezing $' + c.symbol + '\'s hook can never be undone: nobody can change it again. Press Freeze for good again to go ahead.' }]);
  return false;
}

/* ---------- your agent: tweetpad's skill file and a brief built from the form ---------- */
function renderBrief() {
  const t = $('cl-ticker').value.trim() || 'TICKER', n = $('cl-name').value.trim() || 'My Coin';
  $('cl-brief').textContent = 'Read https://www.tweetpad.io/skills/tweetpad-custom-launch/SKILL.md and prepare a custom launch on Ethereum through tweetpad: '
    + n + ' ($' + t + '), ' + opts.feePct + '% fee to my wallet, ' + (opts.hook === 'fixed' ? 'a fixed hook' : 'an upgradeable hook') + ', opening at ' + opts.start + ' ETH'
    + (opts.team ? ', ' + opts.team + '% team share vesting over ' + opts.vest + ' days' : ', no team share') + '. Show me the plan before I sign.';
}
$('cl-copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('cl-brief').textContent); $('cl-copied').textContent = 'Copied'; }
  catch { $('cl-copied').textContent = 'Select the text to copy it'; }
  setTimeout(() => { $('cl-copied').textContent = ''; }, 1800);
});

/* ---------- wiring ---------- */
const pop = (hashPart) => {
  const url = '/custom?popup' + (hashPart || '');
  const w = window.open(url, 'tweetpad-custom', 'popup,width=480,height=480');
  if (w) w.focus(); else window.open(url, '_blank', 'noopener');
};
$('cl-pop').addEventListener('click', () => pop());
$('cl-agent-pop').addEventListener('click', () => pop('#cl-agent'));
for (const el of document.querySelectorAll('[data-hook]')) el.addEventListener('click', () => { opts.hook = el.dataset.hook; render(); });
for (const el of document.querySelectorAll('[data-fee]')) el.addEventListener('click', () => { opts.feePct = Number(el.dataset.fee); render(); });
for (const el of document.querySelectorAll('[data-start]')) el.addEventListener('click', () => { opts.start = el.dataset.start; render(); });
for (const el of document.querySelectorAll('[data-team]')) el.addEventListener('click', () => { opts.team = Number(el.dataset.team); render(); });
for (const el of document.querySelectorAll('[data-vest]')) el.addEventListener('click', () => { opts.vest = Number(el.dataset.vest); render(); });
$('cl-launch').addEventListener('click', onLaunch);
$('cl-img').addEventListener('change', (ev) => takeImage(ev.target.files[0]));
$('cl-drop').addEventListener('dragover', (ev) => ev.preventDefault());
$('cl-drop').addEventListener('drop', (ev) => { ev.preventDefault(); takeImage(ev.dataTransfer.files[0]); });
document.addEventListener('paste', (ev) => { const f = [...(ev.clipboardData ? ev.clipboardData.files : [])][0]; if (f) takeImage(f); });
$('cl-ticker').addEventListener('input', () => { const el = $('cl-ticker'); el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); render(); });
for (const id of ['cl-name', 'cl-x', 'cl-web']) $(id).addEventListener('input', render);
window.dispatchEvent(new Event('eip6963:requestProvider'));   // after every helper exists: some wallets answer at once
render();
setTimeout(render, 600);   // wallets that announce late

/* the bar's way home: the launchpad's own page in the X card and the pop-out (the landing page would frame it again) */
if (document.documentElement.dataset.mode !== 'page') document.querySelector('.head .home').href = '/embed.html';
