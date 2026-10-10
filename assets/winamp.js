/* tweetpad Winamp: Webamp (MIT, github.com/captbaritone/webamp) with the Sony 2000 SE skin, a playlist of classic tracker
   music fetched from The Mod Archive (their download API allows any origin) and rendered here, and the user's own files.
   /winamp is the full page; ?popup is the window tweetpad's More → Winamp opens; ?embed is the X player card. */
(() => {
  const $ = (id) => document.getElementById(id);
  const mode = new URLSearchParams(location.search).has('popup') ? 'popup' : new URLSearchParams(location.search).has('embed') ? 'embed' : 'page';
  document.documentElement.dataset.mode = mode;

  const SKIN_MUSEUM = 'https://api.webamp.org/graphql';
  const skinUrl = (md5) => 'https://r2.webampskins.org/skins/' + md5 + '.wsz';
  const DEFAULT_SKIN = 'd585200e36246e65959d93a71cc4579b';   // Sony_2000_SE.wsz
  const askedSkin = (new URLSearchParams(location.search).get('skin') || '').toLowerCase();   // ?skin=<museum md5>, to share a look
  const firstSkin = /^[0-9a-f]{32}$/.test(askedSkin) ? askedSkin : DEFAULT_SKIN;
  const SKINS = [   // the right-click menu's Skins list
    ['Sony 2000 SE', DEFAULT_SKIN],
    ['Winamp3 Classified', 'cd251187a5e6ff54ce938d26f1f2de02'],
    ['Winamp5 Classified', 'b0fb83cc20af3abe264291bb17fb2a13'],
    ['Bento Classified', 'd6010aa35bed659bc1311820daa4b341'],
    ['Microchip 2', '03a967351bc69b83a3c063782997d434'],
    ['PlasTech', 'eaa2bdf27a82632543cd5fe319a71d45'],
  ];
  /* the preloaded playlist: well-loved modules on The Mod Archive, played from their copy, credited under ⓘ */
  const MODS = [
    { id: 57925, artist: 'Captain', title: 'Space Debris' },
    { id: 212083, artist: 'Purple Motion', title: 'Unreal ][ (Second Reality)' },
    { id: 191789, artist: 'Karsten Koch', title: 'Aryx' },
    { id: 40475, artist: 'Jester', title: 'Elysium' },
    { id: 42560, artist: 'Jogeir Liljedahl', title: 'Guitar Slinger' },
  ];
  const modUrl = (id) => 'https://api.modarchive.org/downloads.php?moduleid=' + id;
  const RATE = 32000;   // tracker music loses nothing audible here, and a five-minute song stays near 38 MB in memory
  const TRACKER = /\.(mod|xm|s3m|it|mptm|669|amf|ams|dbm|dmf|dsm|far|mdl|med|mtm|okt|ptm|stm|ult|umx|mo3)$/i;
  const SKIN_FILE = /\.(wsz|zip)$/i;

  /* the renderer is a module worker; a module worker from our own origin may import libopenmpt from the CDN */
  let worker, seq = 0;
  const waiting = new Map();
  function render(bytes) {
    if (!worker) {
      worker = new Worker('/assets/mod-render.js', { type: 'module' });
      worker.onmessage = ({ data }) => { const w = waiting.get(data.id); waiting.delete(data.id); if (w) (data.error ? w.fail(new Error(data.error)) : w.ok(data)); };
    }
    const id = ++seq;
    return new Promise((ok, fail) => { waiting.set(id, { ok, fail }); worker.postMessage({ id, bytes, rate: RATE }, [bytes]); });
  }
  async function trackFromModule(bytes, fallbackName, known) {
    const out = await render(bytes);
    return { blob: new Blob([out.wav], { type: 'audio/wav' }), duration: out.seconds, defaultName: fallbackName,
      metaData: { artist: (known && known.artist) || out.artist || 'Unknown', title: (known && known.title) || out.title || fallbackName } };
  }

  /* files the user hands us: tracker modules are rendered, skins are worn, everything else goes to Webamp as is */
  async function tracksFromFiles(files) {
    const tracks = [];
    for (const f of files) {
      if (SKIN_FILE.test(f.name)) app.setSkinFromUrl(URL.createObjectURL(f));
      else if (TRACKER.test(f.name)) {
        try { tracks.push(await trackFromModule(await f.arrayBuffer(), f.name.replace(TRACKER, ''))); } catch (e) { status(f.name + ': ' + e.message); }
      } else tracks.push({ blob: f, defaultName: f.name.replace(/\.[^.]+$/, '') });
    }
    return tracks;
  }

  const status = (s) => { $('wa-status').textContent = s || ''; };
  if (!window.Webamp || !Webamp.browserIsSupported()) { status('This browser can\'t run Winamp.'); return; }
  const app = new Webamp({
    initialSkin: { url: skinUrl(firstSkin) },
    availableSkins: SKINS.map(([name, md5]) => ({ name, url: skinUrl(md5) })),
    enableHotkeys: false,   // the page is small, and on X the keys belong to the post
    /* a drop with tracker modules or a skin in it is ours; anything else, Webamp handles (null) */
    handleTrackDropEvent: (e) => {
      const files = [...e.dataTransfer.files];
      return files.some(f => TRACKER.test(f.name) || SKIN_FILE.test(f.name)) ? tracksFromFiles(files) : null;
    },
    filePickers: [{ contextMenuName: 'Tracker modules, music or a skin…', requiresNetwork: false,
      filePicker: () => new Promise((ok) => { pick.onchange = async () => { ok(await tracksFromFiles([...pick.files])); pick.value = ''; }; pick.click(); }) }],
  });
  const pick = $('wa-file');

  /* the preloaded modules, one at a time, each joining the playlist as soon as it is ready */
  async function preload() {
    for (const m of MODS) {
      status('Loading ' + m.title + '…');
      try {
        const r = await fetch(modUrl(m.id));
        if (!r.ok) throw new Error(r.status);
        app.appendTracks([await trackFromModule(await r.arrayBuffer(), m.title, m)]);
        /* the first one is cued, the way Winamp starts with a track in the display, so Play works before anyone picks one.
           BUFFER_TRACK is what Webamp itself does for initialTracks; the store is internal, so this rides on the pinned 2.3.1 */
        const { playlist } = app.store.getState();
        if (playlist.currentTrack == null && playlist.trackOrder.length) app.store.dispatch({ type: 'BUFFER_TRACK', id: playlist.trackOrder[0] });
      } catch { /* The Mod Archive is down or slow: skip this one */ }
    }
    status('');
  }

  const stage = $('wa-stage');
  app.renderInto(stage).then(preload);
  app.onClose(() => { if (mode === 'popup') window.close(); else $('wa-reopen').hidden = false; });
  $('wa-reopen').addEventListener('click', () => { app.reopen(); $('wa-reopen').hidden = true; });
  /* the same pop-out tweetpad's More → Winamp opens; this player pauses so the two don't play over each other */
  $('wa-pop').addEventListener('click', () => {
    const w = window.open('/winamp?popup', 'tweetpad-winamp', 'popup,width=275,height=382');
    if (w) { app.pause(); w.focus(); }
  });
  /* ⓘ opens the panel; it covers the controls, so a click on it (not on a link), a click elsewhere or Esc closes it */
  const showInfo = (open) => { $('wa-info').hidden = !open; $('wa-info-btn').setAttribute('aria-expanded', String(open)); };
  $('wa-info-btn').addEventListener('click', (e) => { e.stopPropagation(); showInfo($('wa-info').hidden); });
  document.addEventListener('click', (e) => { if (!$('wa-info').hidden && !e.target.closest('#wa-info a')) showInfo(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') showInfo(false); });
  $('wa-add').addEventListener('click', () => {
    pick.onchange = async () => { app.appendTracks(await tracksFromFiles([...pick.files])); pick.value = ''; };
    pick.click();
  });

  /* a random classic skin from the museum's first 5,000 (its ranking puts the good ones first), skipping ones marked NSFW */
  $('wa-random').addEventListener('click', async () => {
    const btn = $('wa-random');
    btn.disabled = true;
    try {
      for (let tries = 0; tries < 3; tries++) {
        const r = await fetch(SKIN_MUSEUM, { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query: '{ skins(first: 1, offset: ' + Math.floor(Math.random() * 5000) + ', sort: MUSEUM) { nodes { md5 filename nsfw } } }' }) });
        const skin = ((((await r.json()) || {}).data || {}).skins || {}).nodes?.[0];
        if (!skin || skin.nsfw) continue;
        app.setSkinFromUrl(skinUrl(skin.md5));
        return;
      }
    } catch { /* the museum is down: keep the current skin */ } finally { btn.disabled = false; }
  });

  /* ---------- the player scales to fill its frame (480 square on the full page and on X: 1.25x), in eighths so the pixel art
     stays even; the pop-out is the player's own size ---------- */
  function fit() {
    if (mode === 'popup') return;
    const f = stage.parentElement.getBoundingClientRect();
    const z = Math.floor(Math.min((f.width - 16) / 275, (f.height - 50) / 348) * 8) / 8;
    document.documentElement.style.setProperty('--pz', String(Math.max(0.75, Math.min(1.5, z))));
  }
  fit();
  new ResizeObserver(fit).observe(stage.parentElement);

  /* ---------- the backdrop: tweetpad's # in a grid, lit from the bottom as Winamp's spectrum analyser in the skin's own
     colours (VISCOLOR: 2 to 17 are the bars top to bottom, 23 the peak dots). Still and dim when nothing plays ---------- */
  const vis = $('wa-vis');
  if (mode === 'popup' || !vis) return;
  const ctx = vis.getContext('2d');
  const CELL = 22;
  const glyphs = new Map();   // one pre-drawn # per colour
  const glyph = (color) => {
    if (glyphs.has(color)) return glyphs.get(color);
    const g = document.createElement('canvas');
    g.width = g.height = CELL * devicePixelRatio;
    const c = g.getContext('2d');
    c.scale(devicePixelRatio, devicePixelRatio);
    c.fillStyle = color;
    c.font = '700 19px "Helvetica Neue", Helvetica, Arial, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('#', CELL / 2, CELL / 2 + 1);
    glyphs.set(color, g);
    return g;
  };
  const DIM = 'rgba(120, 160, 190, .09)';
  let freq = null, levels = [], peaks = [], last = '';
  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const w = innerWidth, h = innerHeight;
    if (vis.width !== Math.round(w * devicePixelRatio) || vis.height !== Math.round(h * devicePixelRatio)) {
      vis.width = Math.round(w * devicePixelRatio); vis.height = Math.round(h * devicePixelRatio);
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      last = '';
    }
    const cols = Math.ceil(w / CELL), rows = Math.ceil(h / CELL);
    const colors = (app.store.getState().display || {}).skinColors || [];
    const playing = app.getMediaStatus && app.getMediaStatus() === 'PLAYING';
    const analyser = app.media && app.media.getAnalyser && app.media.getAnalyser();
    let moving = false;
    if (playing && analyser) {
      if (!freq || freq.length !== analyser.frequencyBinCount) freq = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(freq);
    }
    for (let c = 0; c < cols; c++) {
      /* columns are log-spaced over the useful part of the spectrum, like Winamp's 19 bars, mirrored from the centre out */
      const k = Math.abs(c - (cols - 1) / 2) / (cols / 2);
      let v = 0;
      if (playing && freq) {
        const lo = Math.floor(2 * Math.pow(freq.length * 0.6 / 2, k)), hi = Math.max(lo + 1, Math.floor(2 * Math.pow(freq.length * 0.6 / 2, k + 1 / cols * 2)));
        for (let i = lo; i < hi; i++) v = Math.max(v, freq[i]);
        v = Math.pow(v / 255, 1.6);
      }
      levels[c] = Math.max(v, (levels[c] || 0) - 0.025);
      peaks[c] = Math.max(levels[c], (peaks[c] || 0) - 0.006);
      if (levels[c] > 0 || peaks[c] > 0) moving = true;
    }
    if (!moving && last === 'still') return;   // nothing playing and already drawn still
    last = moving ? 'moving' : 'still';
    ctx.clearRect(0, 0, w, h);
    for (let c = 0; c < cols; c++) {
      const lit = Math.round(levels[c] * rows), peak = rows - 1 - Math.min(rows - 1, Math.round(peaks[c] * rows));
      for (let r = 0; r < rows; r++) {
        const fromBottom = rows - 1 - r;
        let color = DIM;
        if (fromBottom < lit) color = colors[17 - Math.min(15, Math.floor(fromBottom / rows * 16))] || '#3c3';
        else if (r === peak && peaks[c] > 0.02) color = colors[23] || '#ccc';
        ctx.drawImage(glyph(color), c * CELL, r * CELL, CELL, CELL);
      }
    }
  }
  requestAnimationFrame(frame);
})();
