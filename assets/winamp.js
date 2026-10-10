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
  const SKINS = [   // the right-click menu's Skins list
    ['Sony 2000 SE', DEFAULT_SKIN],
    ['Winamp3 Classified', 'cd251187a5e6ff54ce938d26f1f2de02'],
    ['Winamp5 Classified', 'b0fb83cc20af3abe264291bb17fb2a13'],
    ['Bento Classified', 'd6010aa35bed659bc1311820daa4b341'],
    ['Microchip 2', '03a967351bc69b83a3c063782997d434'],
    ['PlasTech', 'eaa2bdf27a82632543cd5fe319a71d45'],
  ];
  /* the preloaded playlist: well-loved modules on The Mod Archive, played from their copy, credited in the page footer */
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
    initialSkin: { url: skinUrl(DEFAULT_SKIN) },
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
})();
