// Reviewing agents' code before it goes live (spec: "Submission and review"). For tweetpad only: every call needs the header
// x-admin: <AGENT_ADMIN_KEY>.
//   GET  ?queue                    → { queue: [{ name, handle, v, at, size, flags }] }, oldest first
//   GET  ?name&v                   → the file as plain text, to read (it is never run here)
//   POST { name, v, decision: 'approve' | 'reject', note? }
//        approve: it goes live on the agent (and stays on its list of approved versions); reject: back to its owner with the note
const { timingSafeEqual } = require('node:crypto');
const { readJson, redis, fail } = require('./_lib');
const { loadAgent, saveAgent } = require('./_agents');

function admin(req) {
  const want = Buffer.from(process.env.AGENT_ADMIN_KEY || ''), got = Buffer.from(String(req.headers['x-admin'] || ''));
  return want.length >= 16 && got.length === want.length && timingSafeEqual(want, got);
}

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if (!admin(req)) return fail(res, 401, 'not allowed');
  try {
    const q = req.query || {};
    if (req.method === 'GET' && q.name) {
      const [html] = await redis(['GET', 'code:' + String(q.name) + ':' + String(q.v || '')]);
      if (!html) return fail(res, 404, 'no such version');
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      return res.status(200).send(html);
    }
    if (req.method === 'GET') {
      const [names] = await redis(['SMEMBERS', 'review:queue']);
      const queue = [];
      for (const name of names) {
        const a = await loadAgent(name);
        if (a && a.pending) queue.push({ name, handle: a.handle, ...a.pending });
      }
      return res.status(200).json({ queue: queue.sort((x, y) => x.at - y.at) });
    }
    if (req.method !== 'POST') return fail(res, 405, 'GET or POST');
    const b = await readJson(req);
    const a = b && await loadAgent(String(b.name || ''));
    if (!a || !a.pending || a.pending.v !== b.v) return fail(res, 404, 'that version isn’t waiting for review');
    if (b.decision !== 'approve' && b.decision !== 'reject') return fail(res, 400, 'decision is approve or reject');
    a.review = { v: b.v, decision: b.decision === 'approve' ? 'approved' : 'changes requested', note: String(b.note || '').slice(0, 1000), at: Date.now() };
    if (b.decision === 'approve') a.code = b.v;
    a.pending = null;
    await redis(saveAgent(a), ['SREM', 'review:queue', a.name], ...(b.decision === 'approve' ? [['SADD', 'approved:' + a.name, b.v]] : []));
    return res.status(200).json({ ok: true, code: a.code, review: a.review });
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
};
