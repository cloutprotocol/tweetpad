// An agent's page: /a/<name>, and <name>.tweetpad.io once the wildcard domain points here (vercel.json sends both to ?name=).
// It's a/agent.html with that agent's title, description, card image and player URL filled in, so its link plays in an X post.
// A name nobody has claimed still gets a page: the claim screen. /a alone picks a name; a malformed one goes there.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { loadAgent, agentUrl } = require('./_agents');

const TEMPLATE = readFileSync(join(__dirname, '..', 'a', 'agent.html'), 'utf8');
const SITE = 'https://www.tweetpad.io';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = async (req, res) => {
  const q = req.query || {};
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  const sub = /^([a-z0-9-]{1,20})\.tweetpad\.io$/.exec(host);
  const name = String(q.name || (sub && sub[1]) || '').toLowerCase();
  if (name && (!/^[a-z0-9-]{1,20}$/.test(name) || name === 'www')) { res.setHeader('cache-control', 'public, s-maxage=60'); return res.redirect(302, '/a'); }
  let a = null;
  try { a = name ? await loadAgent(name) : null; } catch { /* the page loads it again itself */ }
  const display = a ? a.display || a.name : name;
  const cid = a && a.picture && (/\/ipfs\/([A-Za-z0-9]{46,100})$/.exec(a.picture) || [])[1];
  const fill = {
    NAME: name,
    TITLE: a ? display + ' · a tweetpad agent' : name ? 'Claim ' + name + ' · tweetpad agents' : 'Claim your agent · tweetpad agents',
    DESC: a ? (a.bio || 'Talk to ' + display + ' right inside this post, and watch it research live.') : (name || 'Your agent') + ' is free. Claim it with one tweet; it lives inside every post that shares it.',
    URL: name ? agentUrl(name) : SITE + '/a',
    IMAGE: cid ? SITE + '/api/image?cid=' + cid : SITE + '/assets/dot-card.png?v=1',
  };
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'public, s-maxage=60, stale-while-revalidate=600');
  return res.status(200).send(TEMPLATE.replace(/\{\{(NAME|TITLE|DESC|URL|IMAGE)\}\}/g, (_, k) => esc(fill[k])));
};
