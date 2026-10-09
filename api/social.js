// Likes, retweets and timelines for feed posts and replies (stored by api/chat.js as msg:<id>).
//   GET  ?ids=1,2,3&wallet=<w>                       → { stats: { <id>: { likes, retweets, replies, liked, retweeted } } }
//   GET  ?user=<wallet>                              → { posts }: their tweets, replies and retweets, newest first
//   POST { action: 'like' | 'retweet', token, id, on } → that post's stats, after the change
// A wallet likes or retweets a post once (a set per post); a retweet also lands on the retweeter's timeline.
// Writing uses the chat session (api/chat.js), so it is the same one free signature as chatting and posting.
const { cors, readJson, isPubkey, redis, loadPost, rateLimit, fail } = require('./_lib');

const MAX_IDS = 60, TIMELINE = 50;
const validId = (id) => /^\d{1,12}$/.test(String(id));

async function stats(ids, wallet) {
  const cmds = ids.flatMap(id => [['SCARD', 'likes:' + id], ['SCARD', 'rts:' + id], ['LLEN', 'chat:reply:' + id],
    ...(wallet ? [['SISMEMBER', 'likes:' + id, wallet], ['SISMEMBER', 'rts:' + id, wallet]] : [])]);
  const out = ids.length ? await redis(...cmds) : [];
  const per = wallet ? 5 : 3, result = {};
  ids.forEach((id, i) => {
    const r = out.slice(i * per, i * per + per);
    result[id] = { likes: r[0] || 0, retweets: r[1] || 0, replies: r[2] || 0, liked: !!r[3], retweeted: !!r[4] };
  });
  return result;
}

/* a profile: own tweets and replies ("p:<id>") and retweets ("rt:<id>", scored when retweeted) */
async function timeline(wallet) {
  const [rows] = await redis(['ZREVRANGE', 'user:posts:' + wallet, 0, TIMELINE - 1, 'WITHSCORES']);
  const entries = [];
  for (let i = 0; i < rows.length; i += 2) entries.push({ key: rows[i], at: Number(rows[i + 1]) });
  if (!entries.length) return [];
  const [msgs] = await redis(['MGET', ...entries.map(e => 'msg:' + e.key.split(':')[1])]);
  return entries.map((e, i) => msgs[i] && { ...JSON.parse(msgs[i]), ...(e.key.startsWith('rt:') && { retweetedAt: e.at }) }).filter(Boolean);
}

async function act(b, res) {
  const id = String(b.id || '');
  if (!validId(id)) return fail(res, 400, 'invalid post');
  const [wallet] = await redis(['GET', 'chatsess:' + String(b.token || '')]);
  if (!wallet) return fail(res, 401, 'chat session expired; sign in again');
  const post = await loadPost(id);
  if (!post) return fail(res, 404, 'that post is gone');
  const on = !!b.on;
  if (b.action === 'like') await redis([on ? 'SADD' : 'SREM', 'likes:' + id, wallet]);
  else if (b.action === 'retweet') {
    if (post.wallet === wallet) return fail(res, 400, 'you can’t retweet your own tweet');
    /* the set decides whether this changes anything; only then does the retweeter's timeline move */
    const [changed] = await redis([on ? 'SADD' : 'SREM', 'rts:' + id, wallet]);
    if (changed) await redis(on ? ['ZADD', 'user:posts:' + wallet, Date.now(), 'rt:' + id] : ['ZREM', 'user:posts:' + wallet, 'rt:' + id]);
  } else return fail(res, 400, 'unknown action');
  return res.status(200).json({ id, ...(await stats([id], wallet))[id] });
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET, POST')) return;
  try {
    if (req.method === 'GET') {
      const q = req.query || {};
      res.setHeader('cache-control', 'public, s-maxage=3, stale-while-revalidate=10');
      if (q.user) {
        if (!isPubkey(String(q.user))) return fail(res, 400, 'invalid wallet');
        return res.status(200).json({ posts: await timeline(String(q.user)) });
      }
      const ids = [...new Set(String(q.ids || '').split(',').filter(validId))].slice(0, MAX_IDS);
      const wallet = isPubkey(String(q.wallet || '')) ? String(q.wallet) : null;
      return res.status(200).json({ stats: await stats(ids, wallet) });
    }
    if (req.method !== 'POST') return fail(res, 405, 'GET or POST');
    res.setHeader('cache-control', 'no-store');
    if (!await rateLimit(req, res, 'social', 120, 600)) return;
    const b = await readJson(req);
    if (!b) return fail(res, 400, 'invalid JSON');
    return await act(b, res);
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
};
