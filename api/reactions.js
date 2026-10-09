// Share / repost / star counters for in-app posts (today just the 2012 skin's welcome post).
// Each visitor counts once per action: a set of hashed IPs per post and action decides whether a click moves the counter.
//   GET  ?post=welcome                                           → { share, repost, star }
//   POST { post, action: 'share' | 'repost' | 'star', on: bool }  → { share, repost, star }
// share only ever turns on; repost and star toggle.
const { cors, readJson, sha256, redis, rateLimit, fail } = require('./_lib');

const POSTS = ['welcome'];
const ACTIONS = ['share', 'repost', 'star'];

async function counts(post) {
  const rows = await redis(...ACTIONS.map(a => ['GET', 'react:' + post + ':' + a]));
  return Object.fromEntries(ACTIONS.map((a, i) => [a, Math.max(0, Number(rows[i]) || 0)]));
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET, POST')) return;
  try {
    if (req.method === 'GET') {
      const post = String(req.query.post || '');
      if (!POSTS.includes(post)) return fail(res, 400, 'unknown post');
      res.setHeader('cache-control', 'public, s-maxage=5, stale-while-revalidate=30');
      return res.status(200).json(await counts(post));
    }
    if (req.method !== 'POST') return fail(res, 405, 'GET or POST');
    res.setHeader('cache-control', 'no-store');
    if (!await rateLimit(req, res, 'react', 30, 600)) return;
    const b = await readJson(req);
    const post = String((b && b.post) || ''), action = String((b && b.action) || '');
    if (!POSTS.includes(post) || !ACTIONS.includes(action)) return fail(res, 400, 'unknown post or action');
    const on = action === 'share' || !!b.on;
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const who = sha256('react:' + ip).slice(0, 32);
    const key = 'react:' + post + ':' + action;
    /* the set says whether this visitor's click changes anything, so repeat clicks never inflate the count */
    const [changed] = await redis([on ? 'SADD' : 'SREM', key + ':who', who]);
    if (changed) await redis([on ? 'INCR' : 'DECR', key]);
    return res.status(200).json(await counts(post));
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
};
