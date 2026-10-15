/* tweetpad agent kit v1: backdrops. Clean anime-style scenes drawn flat and crisp on a 2D canvas behind your agent: no blur and no
   glow, just shapes and colour, moving gently (and holding still for prefers-reduced-motion).
     import { createBackdrop } from '/kit/v1/backdrop.js';
     const backdrop = createBackdrop(canvas, { theme: 'sky' });   // 'sky' | 'meadow' | 'sunset' | 'night' | 'studio' | 'sakura' | 'pop'
     backdrop.setTheme('night');
   Leave its canvas behind your agent's (position: fixed; inset: 0) and give the agent's canvas a transparent background. Some scenes
   also draw in front of the agent (the meadow's tall grass): pass a second canvas above the agent's as { front } (pointer-events: none). */

const rnd = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

/* a cel cloud: its shade, then its body a little higher, both flat */
function cloud(g, x, y, s, body, shade) {
  const puffs = [[0, 0, 1], [-0.9, 0.18, 0.72], [0.95, 0.2, 0.68], [-0.45, -0.35, 0.7], [0.45, -0.4, 0.62], [1.6, 0.35, 0.45], [-1.55, 0.38, 0.42]];
  const draw = (dy, k) => { g.beginPath(); for (const [px, py, r] of puffs) { g.moveTo(x + px * s + r * s * k, y + py * s + dy); g.arc(x + px * s, y + py * s + dy, r * s * k, 0, Math.PI * 2); } g.fill(); };
  g.fillStyle = shade; draw(s * 0.12, 1);
  g.fillStyle = body; draw(-s * 0.02, 0.94);
}
function sparkle(g, x, y, r) {
  g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill();
}
/* a tuft of tall grass: dark outer blades, lighter inner ones, each a curved point that sways */
function tuft(g, x, y, s, sway, dark, light) {
  const blade = (dx, h, w, c) => {
    g.fillStyle = c; g.beginPath(); g.moveTo(x + dx - w, y);
    g.quadraticCurveTo(x + dx - w * 0.4, y - h * 0.6, x + dx * 1.6 + sway * h, y - h);
    g.quadraticCurveTo(x + dx + w * 0.4, y - h * 0.55, x + dx + w, y); g.fill();
  };
  for (const [dx, k] of [[-0.55, 0.78], [0.55, 0.82], [-0.25, 0.95], [0.3, 1]]) blade(dx * s, s * k, s * 0.2, dark);
  for (const [dx, k] of [[-0.05, 0.85], [0.15, 0.7]]) blade(dx * s, s * k, s * 0.14, light);
}
function petal(g, x, y, s, a) {
  g.save(); g.translate(x, y); g.rotate(a); g.beginPath();
  g.moveTo(0, -s); g.bezierCurveTo(s * 0.9, -s * 0.6, s * 0.7, s * 0.7, 0, s); g.bezierCurveTo(-s * 0.7, s * 0.7, -s * 0.9, -s * 0.6, 0, -s); g.fill();
  g.restore();
}

const THEMES = {
  sky(g, w, h, t, r) {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#5fb8ff'); sky.addColorStop(0.7, '#bfe6ff'); sky.addColorStop(1, '#e8f6ff');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const m = Math.min(w, h);
    for (let i = 0; i < 6; i++) {
      const s = m * (0.05 + r() * 0.05), y = h * (0.1 + r() * 0.55), speed = 4 + r() * 6;
      const x = ((r() * (w + m * 0.6) + t * speed) % (w + m * 0.6)) - m * 0.3;
      cloud(g, x, y, s, '#ffffff', '#cfe6f7');
    }
    g.fillStyle = '#d6eefc'; g.beginPath(); g.ellipse(w / 2, h * 1.02, w * 0.9, h * 0.16, 0, 0, Math.PI * 2); g.fill();
  },
  meadow(g, w, h, t, r) {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#6cc4ff'); sky.addColorStop(0.62, '#d4f0ff');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const m = Math.min(w, h);
    for (let i = 0; i < 4; i++) {
      const s = m * (0.04 + r() * 0.04), y = h * (0.08 + r() * 0.3), x = ((r() * (w + m * 0.6) + t * (3 + r() * 4)) % (w + m * 0.6)) - m * 0.3;
      cloud(g, x, y, s, '#ffffff', '#cfe6f7');
    }
    const hill = (y, a, c, phase) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += w / 48) g.lineTo(x, y + Math.sin(x / w * Math.PI * a + phase) * m * 0.035); g.lineTo(w, h); g.fill(); };
    hill(h * 0.6, 2.2, '#a8e08f', 0.4); hill(h * 0.68, 3.4, '#86cf6e', 1.9);
    g.fillStyle = '#5fb84f'; g.fillRect(0, h * 0.76, w, h * 0.24);   // the field
    const rows = [[0.78, 0.05, '#3f9a3f', '#6cc65a'], [0.83, 0.06, '#378e38', '#62bd52']];
    for (const [ry, size, dark, light] of rows) for (let x = -m * 0.05; x < w + m * 0.05; x += m * size * 0.9) {
      const jitter = r(), s = m * size * (0.85 + jitter * 0.35);
      tuft(g, x + jitter * m * 0.02, h * ry + jitter * m * 0.01, s, 0.06 * Math.sin(t * 1.3 + x * 0.02), dark, light);
    }
  },
  sunset(g, w, h, t) {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#3b2f7a'); sky.addColorStop(0.45, '#c95b8f'); sky.addColorStop(0.75, '#ffb38a');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const m = Math.min(w, h), cx = w / 2, cy = h * 0.6, R = m * 0.26;
    g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
    const sun = g.createLinearGradient(0, cy - R, 0, cy + R); sun.addColorStop(0, '#fff3c4'); sun.addColorStop(1, '#ff8f70');
    g.fillStyle = sun; g.fillRect(cx - R, cy - R, R * 2, R * 2);
    g.fillStyle = '#d8668f';   // the retro stripes, scrolling down slowly
    for (let i = 0; i < 7; i++) { const yy = cy + ((i * R * 0.16 + t * 6) % (R * 1.1)); g.fillRect(cx - R, yy, R * 2, 2 + (yy - cy) / R * R * 0.05); }
    g.restore();
    const hill = (y, a, c, phase) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += w / 40) g.lineTo(x, y + Math.sin(x / w * Math.PI * a + phase) * m * 0.03); g.lineTo(w, h); g.fill(); };
    hill(h * 0.74, 3, '#7a4aa0', 0.6); hill(h * 0.82, 5, '#4a2f78', 2.1);
  },
  night(g, w, h, t, r) {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#0a1036'); sky.addColorStop(1, '#2a3a7c');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const m = Math.min(w, h);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 40; i++) {
      const x = r() * w, y = r() * h * 0.7, s = m * (0.004 + r() * 0.01), tw = 0.55 + 0.45 * Math.sin(t * (0.6 + r()) + i);
      g.globalAlpha = tw; sparkle(g, x, y, s);
    }
    g.globalAlpha = 1;
    const mx = w * 0.78, my = h * 0.2, mr = m * 0.07;   // a crescent: the moon, with the sky bitten out of it
    g.fillStyle = '#fff4c8'; g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#121a4a'; g.beginPath(); g.arc(mx + mr * 0.42, my - mr * 0.22, mr * 0.88, 0, Math.PI * 2); g.fill();
    const rr = rnd(7); let x = 0;
    while (x < w) {   // a skyline, its windows lit
      const bw = m * (0.05 + rr() * 0.07), bh = m * (0.08 + rr() * 0.18);
      g.fillStyle = '#0b1030'; g.fillRect(x, h - bh, bw, bh);
      g.fillStyle = '#ffd86b';
      for (let wy = h - bh + m * 0.02; wy < h - m * 0.02; wy += m * 0.03) for (let wx = x + m * 0.012; wx < x + bw - m * 0.015; wx += m * 0.022) if (rr() > 0.62) g.fillRect(wx, wy, m * 0.008, m * 0.012);
      x += bw + m * 0.006;
    }
  },
  studio(g, w, h) {
    const wall = g.createLinearGradient(0, 0, 0, h); wall.addColorStop(0, '#f6f3fc'); wall.addColorStop(1, '#e9e3f6');
    g.fillStyle = wall; g.fillRect(0, 0, w, h);
    g.fillStyle = '#dcd4ef'; g.beginPath(); g.ellipse(w / 2, h * 0.93, w * 0.62, h * 0.13, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(120,100,170,0.18)'; g.lineWidth = Math.max(1, Math.min(w, h) * 0.003);
    for (const k of [0.5, 0.75, 1]) { g.beginPath(); g.ellipse(w / 2, h * 0.93, w * 0.62 * k, h * 0.13 * k, 0, 0, Math.PI * 2); g.stroke(); }
  },
  sakura(g, w, h, t, r) {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#ffd9e8'); sky.addColorStop(1, '#fff6fa');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const m = Math.min(w, h);
    for (let i = 0; i < 28; i++) {   // petals falling
      const sp = 14 + r() * 18, x0 = r() * w, y = ((r() * h + t * sp) % (h + m * 0.1)) - m * 0.05;
      g.fillStyle = r() > 0.5 ? '#ff9dc1' : '#ffc3d8';
      petal(g, x0 + Math.sin(t * 0.8 + i) * m * 0.03, y, m * (0.008 + r() * 0.008), t * (0.6 + r()) + i);
    }
  },
  pop(g, w, h, t) {
    g.fillStyle = '#ffe24d'; g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.45, R = Math.hypot(w, h);
    g.fillStyle = '#fff6b8';
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2 + t * 0.03; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineTo(cx + Math.cos(a + 0.12) * R, cy + Math.sin(a + 0.12) * R); g.fill(); }
    g.fillStyle = 'rgba(255,140,60,0.35)';   // halftone, denser toward the corners
    const step = Math.min(w, h) * 0.035;
    for (let y = step / 2; y < h; y += step) for (let x = step / 2; x < w; x += step) {
      const d = Math.min(1, Math.hypot(x - cx, y - cy) / (Math.min(w, h) * 0.75)), rr = step * 0.42 * d * d;
      if (rr > 0.4) { g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); }
    }
  },
};
/* what some scenes draw in front of the agent */
const FRONT = {
  meadow(g, w, h, t, r) {
    const m = Math.min(w, h);
    for (let x = -m * 0.06; x < w + m * 0.06; x += m * 0.062) {
      const jitter = r(), s = m * (0.09 + jitter * 0.05);
      tuft(g, x + jitter * m * 0.03, h * (0.9 + jitter * 0.03), s, 0.08 * Math.sin(t * 1.5 + x * 0.015), '#2e7f33', '#57b14a');
    }
  },
};
export const BACKDROPS = Object.keys(THEMES);

export function createBackdrop(canvas, opts = {}) {
  const g = canvas.getContext('2d'), front = opts.front ? opts.front.getContext('2d') : null, reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let theme = THEMES[opts.theme] ? opts.theme : 'sky', raf = 0, start = performance.now();
  const size = (c, ctx, dpr) => {
    const w = c.clientWidth || innerWidth, h = c.clientHeight || innerHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return [w, h];
  };
  function draw(now) {
    const dpr = Math.min(devicePixelRatio, 2), [w, h] = size(canvas, g, dpr);
    const t = reduce.matches ? 0 : (now - start) / 1000;
    THEMES[theme](g, w, h, t, rnd(42));   // the same seed every frame: the scene stays put while its parts move
    if (front) { const [fw, fh] = size(opts.front, front, dpr); front.clearRect(0, 0, fw, fh); if (FRONT[theme]) FRONT[theme](front, fw, fh, t, rnd(7)); }
    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);
  return {
    setTheme(name) { if (THEMES[name]) theme = name; },
    stop() { cancelAnimationFrame(raf); },
  };
}
