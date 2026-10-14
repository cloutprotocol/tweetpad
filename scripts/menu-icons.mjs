// tweetpad Menu icons, second pass: quieter glass. A softer squircle, a tonal gradient lit from the top, a hairline rim
// (light above, shade below) instead of the big gloss arc, white glyphs with a faint cool gradient and a tinted shadow.
import fs from 'node:fs';
const out = process.argv[2] || new URL('../assets/menu', import.meta.url).pathname;   // node scripts/menu-icons.mjs
const W = '#fff';
const icons = {
  launch: ['#47b2ff', '#1670dc', '#0b4f9e', `<g transform="rotate(45 48 48)">
    <path fill="#ffc861" d="M42 62h12l-6 15z"/>
    <path fill="url(#w)" d="M48 17c10 8 13 22 10 41H38c-3-19 0-33 10-41z"/>
    <path fill="url(#w)" d="M38 47l-8 10v10l9-6zM58 47l8 10v10l-9-6z"/>
    <circle cx="48" cy="38" r="5.5" fill="#1a78e0"/><circle cx="48" cy="38" r="2.6" fill="#8fd0ff"/></g>`],
  tokens: ['#3dcc84', '#119357', '#0a6b3e', [62, 51, 40].map((y, i) => `
    <path fill="#dff3e8" d="M26 ${y}v6a22 8 0 0 0 44 0v-6z"/><ellipse cx="48" cy="${y}" rx="22" ry="8" fill="url(#w)"/>${i === 2 ? `
    <ellipse cx="48" cy="${y}" rx="13" ry="4.4" fill="none" stroke="#18a463" stroke-width="2.4"/>` : ''}`).join('')],
  feed: ['#45c0ff', '#168fe6', '#0b62a8', `<g fill="none" stroke="url(#w)" stroke-width="7.5" stroke-linecap="round">
    <path d="M42 25l-5 46M61 25l-5 46M28 40h43M25 56h43"/></g>`],
  custom: ['#9a88ff', '#5b3fd9', '#3a2399', `<g fill="none" stroke="url(#w)" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="58" cy="22" r="5" stroke-width="5"/>
    <path stroke-width="7.5" d="M58 28v29a14 14 0 0 1-28 0v-6"/><path stroke-width="6.5" d="M30 49l-6 9M30 49l7 6"/></g>`],
  games: ['#46586a', '#1d2833', '#0b1117', `<g transform="rotate(-10 48 48)">
    <rect x="27" y="27" width="42" height="42" rx="10" fill="url(#w)"/>
    ${[[37, 37], [59, 37], [48, 48], [37, 59], [59, 59]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.2" fill="#24313d"/>`).join('')}</g>`],
  profile: ['#ffb54d', '#ef7a17', '#a84f06', `<circle cx="48" cy="37" r="12.5" fill="url(#w)"/>
    <path fill="url(#w)" d="M24 74c0-13 10.7-21 24-21s24 8 24 21a3 3 0 0 1-3 3H27a3 3 0 0 1-3-3z"/>`],
  more: ['#b3bec7', '#7a8893', '#515e68', [30, 48, 66].map((x) => `<circle cx="${x}" cy="48" r="6.5" fill="url(#w)"/>`).join('')],
  post: ['#45c0ff', '#168fe6', '#0b62a8', `<path fill="url(#w)" d="M21 47 75 23 63 75 47 61l-8 10V57l26-27-31 21z"/>
    <path fill="#b9e3ff" d="M39 57v14l8-10z"/>`],
  scan: ['#ffd84a', '#e6a300', '#9c6c00', `<g fill="none" stroke="url(#w)" stroke-linecap="round">
    <circle cx="43" cy="43" r="15" stroke-width="7"/><path d="M54 54l15 15" stroke-width="9"/></g>`],
  autoclaim: ['#3fd6b8', '#0f8f7f', '#07594f', `<g fill="none" stroke="url(#w)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M71 48a23 23 0 0 1-40 16M25 48a23 23 0 0 1 40-16"/><path d="M66 19v13H53M30 77V64h13"/></g>`],
  winamp: ['#3d4260', '#16172a', '#08080f', `<defs><linearGradient id="eq" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3fe07a"/><stop offset=".6" stop-color="#ffe14a"/><stop offset="1" stop-color="#ff6a3d"/></linearGradient></defs>
    ${[[22, 46], [34, 30], [46, 40], [58, 24], [70, 50]].map(([x, y]) => `<rect x="${x}" y="${y}" width="8" height="${72 - y}" rx="2" fill="url(#eq)"/>`).join('')}`],
  agents: ['#9fb2c1', '#5d7486', '#3c4e5c', `<rect x="45" y="20" width="6" height="12" rx="3" fill="url(#w)"/><circle cx="48" cy="19" r="5" fill="url(#w)"/>
    <rect x="23" y="32" width="50" height="38" rx="13" fill="url(#w)"/>
    <rect x="31" y="42" width="34" height="16" rx="8" fill="#4f6576"/><circle cx="40" cy="50" r="3.6" fill="#8fe3ff"/><circle cx="56" cy="50" r="3.6" fill="#8fe3ff"/>`],
  about: ['#6fb0e6', '#3576b8', '#1f4f80', `<circle cx="48" cy="27" r="6.5" fill="url(#w)"/><rect x="41.5" y="39" width="13" height="35" rx="6.5" fill="url(#w)"/>`],
  themes: ['#ff93c9', '#d6448e', '#8f205a', `<path fill="url(#w)" d="M48 22c-15 0-27 11-27 25 0 13 10 24 24 24 4 0 7-2 7-6 0-2-1-3-1-5 0-3 2-5 5-5h6c8 0 13-5 13-13 0-11-12-20-27-20z"/>
    <circle cx="35" cy="47" r="4.6" fill="#1da1f2"/><circle cx="41" cy="34" r="4.6" fill="#2fc172"/><circle cx="55" cy="32" r="4.6" fill="#ffc531"/><circle cx="65" cy="42" r="4.6" fill="#ff5a5f"/>`],
};
for (const [name, [hi, lo, ink, glyph]] of Object.entries(icons)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <!-- tweetpad Menu icon: ${name}. Generated with the rest of the set: quiet glass, lit from the top, white glyph. -->
  <defs>
    <linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset="1" stop-color="${lo}"/></linearGradient>
    <radialGradient id="l" cx=".5" cy="0" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
    <linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#e6eef5"/></linearGradient>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.4" flood-color="${ink}" flood-opacity=".45"/></filter>
  </defs>
  <rect x="3" y="3" width="90" height="90" rx="24" fill="url(#f)"/>
  <rect x="3" y="3" width="90" height="90" rx="24" fill="url(#l)"/>
  <g filter="url(#s)">${glyph}</g>
  <rect x="3.6" y="3.6" width="88.8" height="88.8" rx="23.4" fill="none" stroke="url(#r)" stroke-width="1.2"/>
</svg>
`;
  fs.writeFileSync(`${out}/${name}.svg`, svg);
}
console.log(Object.keys(icons).length, 'icons');
