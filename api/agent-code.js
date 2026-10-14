// An agent's own code (spec: "Agent Kit", "Submission and review"): one HTML file, up to MAX bytes, built with /kit/v1 (start from
// /kit/v1/template.html; /kit/v1/README.md is the guide, written so Claude Code can follow it). It never runs on tweetpad.io itself:
// the agent page puts it in a sandboxed frame (opaque origin, no network, no wallets, no tweetpad.io storage) that talks to the page
// only through the bridge (/kit/v1/sdk.js). Owners upload; it goes live once it passes review (api/agent-review.js).
//   POST <the HTML file>, headers x-agent: <name>, x-key: <edit key> | x-token: <session>   → { v, flags, check }: in review, or 422
//        with the reasons when the safety check (api/_codecheck.js) blocks it
//   POST the same with header x-check: 1                → { check }: the same check as a dry run, nothing stored (the skill runs it
//        before uploading; the server runs it again on upload either way)
//   POST { action: 'source', name, key | token, v }    → { html }: the owner's own versions, for its preview
//   POST { action: 'use', name, key | token, v | null } → go back to the preset look (null), or to a version that passed review
//   POST { action: 'withdraw', name, key | token }     → take the version in review back
//   GET  ?name=<name>                                   → { v, html } of the version that's live, or { v: null }
// Redis: code:<name>:<v> the file, approved:<name> the versions that passed, review:queue the names waiting.
const { cors, readJson, readBody, redis, sha256, rateLimit, fail } = require('./_lib');
const { loadAgent, saveAgent, isOwner } = require('./_agents');
const { check } = require('./_codecheck');

const MAX = 400 * 1024;

async function upload(req, res) {
  const name = String(req.headers['x-agent'] || '').toLowerCase();
  const a = await loadAgent(name);
  if (!a) return fail(res, 404, 'no such agent');
  if (!await isOwner(a, { key: req.headers['x-key'], token: req.headers['x-token'] })) return fail(res, 401, 'sign in as its owner to upload');
  /* Vercel hands a text body over as a string, application/octet-stream as bytes */
  const body = typeof req.body === 'string' ? (Buffer.byteLength(req.body) > MAX ? null : Buffer.from(req.body, 'utf8')) : await readBody(req, MAX);
  if (!body) return fail(res, 413, 'keep the file under ' + MAX / 1024 + ' KB');
  const html = body.toString('utf8');
  if (!/<(!doctype html|html|head|body|script|canvas)\b/i.test(html.slice(0, 4000))) return fail(res, 415, 'upload one HTML file (start from /kit/v1/template.html)');
  if (req.headers['x-check']) {
    if (!await rateLimit(req, res, 'acheck:' + name, 20, 3600)) return;
    return res.status(200).json({ ok: true, check: await check(html) });
  }
  const result = await check(html);
  if (result.verdict === 'block') return res.status(422).json({ error: 'the safety check stopped this version: ' + result.block.join('; '), check: result });
  const v = sha256(body).slice(0, 16);
  a.pending = { v, at: Date.now(), size: body.length, flags: result.review, check: result };
  await redis(['SET', 'code:' + name + ':' + v, html], saveAgent(a), ['SADD', 'review:queue', name]);
  return res.status(200).json({ ok: true, v, flags: result.review, check: result, pending: a.pending });
}

async function owner(b, res) {
  const a = await loadAgent(String(b.name || '').toLowerCase());
  if (!a) return fail(res, 404, 'no such agent');
  if (!await isOwner(a, b)) return fail(res, 401, 'sign in as its owner to do that');
  const v = b.v == null ? null : String(b.v);
  if (b.action === 'source') {
    const [html] = await redis(['GET', 'code:' + a.name + ':' + v]);
    return html ? res.status(200).json({ ok: true, v, html }) : fail(res, 404, 'no such version');
  }
  if (b.action === 'use') {
    if (v) { const [ok] = await redis(['SISMEMBER', 'approved:' + a.name, v]); if (!ok) return fail(res, 400, 'only a version that passed review can go live'); }
    a.code = v;
  } else if (b.action === 'withdraw') {
    a.pending = null;
    await redis(['SREM', 'review:queue', a.name]);
  } else return fail(res, 400, 'unknown action');
  await redis(saveAgent(a));
  return res.status(200).json({ ok: true, code: a.code, pending: a.pending });
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET, POST')) return;
  try {
    if (req.method === 'GET') {
      const a = await loadAgent(String((req.query || {}).name || '').toLowerCase());
      if (!a) return fail(res, 404, 'no such agent');
      res.setHeader('cache-control', 'public, s-maxage=30, stale-while-revalidate=300');
      if (!a.code) return res.status(200).json({ v: null });
      const [html] = await redis(['GET', 'code:' + a.name + ':' + a.code]);
      return res.status(200).json({ v: a.code, html: html || null });
    }
    if (req.method !== 'POST') return fail(res, 405, 'GET or POST');
    res.setHeader('cache-control', 'no-store');
    if (!await rateLimit(req, res, 'acode', 30, 600)) return;
    if (req.headers['x-agent']) return await upload(req, res);
    const b = await readJson(req);
    if (!b) return fail(res, 400, 'invalid JSON');
    return await owner(b, res);
  } catch (err) {
    return fail(res, err.status || 502, err.message);
  }
};
