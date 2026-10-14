// An agent's page: /a/<name>, and <name>.tweetpad.io once the wildcard domain points here (vercel.json sends both to ?name=).
// It's a/agent.html with that agent's title, description, card image and player URL filled in, so its link plays in an X post.
// A name nobody has claimed still gets a page: the claim screen. /a alone picks a name; a malformed one goes there.
// Its card image is /a/<name>/card.png (?img): the agent's name, owner, bio and picture. X keeps a link's card for days, so the
// title never says "Claim" (a card fetched before a claim must not mislead after it), and the image URL changes with the profile.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { sha256, rateLimit } = require('./_lib');
const { loadAgent, agentUrl } = require('./_agents');

const TEMPLATE = readFileSync(join(__dirname, '..', 'a', 'agent.html'), 'utf8');
const SITE = 'https://www.tweetpad.io';
const SIZE = 960;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- the card image ---------- */
let fonts = null;
async function loadFonts() {
  if (fonts) return fonts;
  const get = async (family, weight) => {
    const css = await (await fetch('https://fonts.googleapis.com/css2?family=' + family + ':wght@' + weight, { signal: AbortSignal.timeout(5000) })).text();
    const src = /src: url\((https:[^)]+)\)/.exec(css)[1];
    return { name: family.replace(/\+/g, ' '), weight, style: 'normal', data: await (await fetch(src, { signal: AbortSignal.timeout(5000) })).arrayBuffer() };
  };
  try { fonts = await Promise.all([get('Fredoka', 600), get('Inter', 400), get('Inter', 700)]); }
  catch { fonts = []; }   // @vercel/og's built-in font still draws everything
  return fonts;
}
const dataUri = (png) => 'data:image/png;base64,' + png.toString('base64');
async function picture(src) {
  if (typeof src !== 'string' || !/^https:\/\//.test(src)) return null;
  try {
    const r = await fetch(src, { signal: AbortSignal.timeout(5000) });
    const body = r.ok ? Buffer.from(await r.arrayBuffer()) : null;
    return body && body.length < 8 * 1024 * 1024 ? dataUri(await require('sharp')(body, { animated: false }).resize(300, 300, { fit: 'cover' }).png().toBuffer()) : null;
  } catch { return null; }
}
let icon = null;
async function appIcon() {
  if (icon !== null) return icon;
  try { const r = await fetch(SITE + '/assets/brand/tweetpad-hash-180.png', { signal: AbortSignal.timeout(4000) }); icon = r.ok ? dataUri(Buffer.from(await r.arrayBuffer())) : ''; }
  catch { icon = ''; }
  return icon;
}
const el = (tag, style, ...children) => ({ type: tag, props: { style: { display: 'flex', ...style }, children: children.flat().filter(c => c != null && c !== false) } });
const img = (src, style) => ({ type: 'img', props: { src, style } });

async function card(a) {
  const [list, pic, mark] = await Promise.all([loadFonts(), picture(a.picture), appIcon()]);
  const sans = list.length ? 'Inter' : undefined, round = list.length ? 'Fredoka' : sans;
  const name = a.display || a.name, color = (a.look && a.look.color) || '#f4f4f4';
  /* its face: the owner's picture, else its starter colour as a ball (agents with their own code show their initial) */
  const face = pic ? img(pic, { width: 240, height: 240, borderRadius: 56, objectFit: 'cover', boxShadow: '0 16px 40px rgba(0,0,0,.5)' })
    : a.code ? el('div', { width: 240, height: 240, borderRadius: 56, backgroundColor: '#1d9bf0', color: '#fff', fontSize: 140, fontFamily: round, alignItems: 'center', justifyContent: 'center' }, name.slice(0, 1).toUpperCase())
    : el('div', { width: 240, height: 240, borderRadius: 120, backgroundImage: `radial-gradient(circle at 36% 30%, #ffffff 0px, ${color} 70px, ${color} 120px, #202022 260px)`, boxShadow: '0 20px 50px rgba(0,0,0,.55)' });
  const bio = (a.bio || 'An AI agent that lives inside X posts.').slice(0, 120);
  const tree = el('div', { width: SIZE, height: SIZE, position: 'relative', flexDirection: 'column', alignItems: 'center', fontFamily: sans, color: '#f2f3f5',
      backgroundImage: 'radial-gradient(circle at 50% 42%, #24262a 0px, #0b0b0c 620px)' },
    el('div', { marginTop: 56, alignItems: 'center' }, mark ? img(mark, { width: 54, height: 54 }) : null,
      el('div', { marginLeft: 14, fontSize: 40, fontFamily: round, fontWeight: 600 }, 'tweetpad agents')),
    el('div', { marginTop: 64 }, face),
    el('div', { marginTop: 40, fontSize: name.length > 14 ? 84 : 110, fontFamily: round, fontWeight: 600, letterSpacing: -2, lineHeight: 1 }, name),
    a.handle ? el('div', { marginTop: 16, fontSize: 34, color: '#8b9096' }, 'by @' + a.handle) : null,
    el('div', { marginTop: 22, maxWidth: 760, fontSize: 32, lineHeight: 1.35, color: '#c9cdd2', textAlign: 'center', justifyContent: 'center' }, bio),
    el('div', { position: 'absolute', bottom: 54, alignItems: 'center', padding: '16px 30px', borderRadius: 40, backgroundColor: '#fff', color: '#111', fontSize: 30, fontWeight: 700 },
      'Talk to it in this post'));
  const { ImageResponse } = await import('@vercel/og');
  return Buffer.from(await new ImageResponse(tree, { width: SIZE, height: SIZE, fonts: list.length ? list : undefined }).arrayBuffer());
}

module.exports = async (req, res) => {
  const q = req.query || {};
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  const sub = /^(?!www\.)([a-z0-9-]{1,20})\.tweetpad\.io$/.exec(host);   // www is the site, not an agent
  const name = String(q.name || (sub && sub[1]) || '').toLowerCase();
  if (name && (!/^[a-z0-9-]{1,20}$/.test(name) || name === 'www')) { res.setHeader('cache-control', 'public, s-maxage=60'); return res.redirect(302, '/a'); }
  let a = null;
  try { a = name ? await loadAgent(name) : null; } catch { /* the page loads it again itself */ }

  if (q.img != null) {
    if (!a) return res.redirect(302, SITE + '/assets/dot-card.png?v=1');
    if (!await rateLimit(req, res, 'agentimg', 200, 600)) return;
    try {
      const png = await card(a);
      res.setHeader('content-type', 'image/png');
      res.setHeader('cache-control', 'public, s-maxage=300, stale-while-revalidate=3600');
      return res.status(200).send(png);
    } catch {
      res.setHeader('cache-control', 'public, s-maxage=30');
      return res.redirect(302, SITE + '/assets/dot-card.png?v=1');
    }
  }

  const display = a ? a.display || a.name : name;
  /* the card image's address changes with what it shows, so X fetches the new one */
  const v = a ? sha256([a.display, a.bio, a.picture, a.handle, a.code, a.look && a.look.color].join('|')).slice(0, 10) : '';
  const fill = {
    NAME: name,
    TITLE: a ? display + ' · a tweetpad agent' : name ? name + ' · tweetpad agents' : 'tweetpad agents',
    DESC: a ? (a.bio || 'Talk to ' + display + ' right inside this post.') : 'AI agents that live inside X posts. Claim one with a tweet.',
    URL: name ? agentUrl(name) : SITE + '/a',
    IMAGE: a ? SITE + '/a/' + name + '/card.png?v=' + v : SITE + '/assets/dot-card.png?v=1',
  };
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'public, s-maxage=30, stale-while-revalidate=60');
  return res.status(200).send(TEMPLATE.replace(/\{\{(NAME|TITLE|DESC|URL|IMAGE)\}\}/g, (_, k) => esc(fill[k])));
};
