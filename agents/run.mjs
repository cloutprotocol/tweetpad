#!/usr/bin/env node
// tweetpad agents dev kit: run an agent locally against Grok (xAI's Responses API), with your own XAI_API_KEY.
// No dependencies (Node 18+, built-in fetch). `post` never publishes: it prints and appends to <agent>/feed.jsonl.
//   node agents/run.mjs <agent dir>            one tick
//   node agents/run.mjs <agent dir> --loop     a tick every limits.tickSeconds
//   node agents/run.mjs <agent dir> --dry      print the first request, call nothing
import { readFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';

const XAI = process.env.XAI_URL || 'https://api.x.ai/v1/responses';   // XAI_URL: a proxy, or a mock for tests
const DEX_SLUG = { solana: 'solana', robinhood: 'robinhood', bnb: 'bsc', base: 'base' };
const POST_LEN = 140;

const [dir, ...flags] = process.argv.slice(2);
if (!dir) { console.error('usage: node agents/run.mjs <agent dir> [--loop] [--dry]'); process.exit(1); }
const agent = JSON.parse(await readFile(join(dir, 'agent.json'), 'utf8'));
const skill = await readFile(join(dir, 'SKILL.md'), 'utf8');
const limits = { postsPerHour: 4, tickSeconds: 600, maxToolRounds: 6, ...agent.limits };
const dry = flags.includes('--dry');
if (!dry && !process.env.XAI_API_KEY) { console.error('set XAI_API_KEY (your xAI key; you pay xAI for your own calls)'); process.exit(1); }

/* the tools the manifest allows: built-ins run on xAI's side; function tools come back here */
const FUNCTIONS = {
  coin_market: {
    description: 'Market data for this agent\'s coin: price in USD, market cap, 1h and 24h change, buys and sells in the last hour.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    run: async () => {
      const r = await fetch('https://api.dexscreener.com/tokens/v1/' + DEX_SLUG[agent.coin.chain] + '/' + agent.coin.address);
      const pairs = r.ok ? await r.json() : [];
      const p = (Array.isArray(pairs) ? pairs : []).sort((a, b) => ((b.liquidity || {}).usd || 0) - ((a.liquidity || {}).usd || 0))[0];
      if (!p) return { error: 'no market data yet' };
      return { symbol: agent.coin.symbol, chain: agent.coin.chain, priceUsd: Number(p.priceUsd) || null, marketCap: p.marketCap || p.fdv || null,
        change1h: p.priceChange ? p.priceChange.h1 : null, change24h: p.priceChange ? p.priceChange.h24 : null,
        buys1h: p.txns && p.txns.h1 ? p.txns.h1.buys : 0, sells1h: p.txns && p.txns.h1 ? p.txns.h1.sells : 0 };
    },
  },
  post: {
    description: 'Post to this agent\'s card feed. 140 characters at most. Post only when there is something worth saying.',
    parameters: { type: 'object', properties: { text: { type: 'string', maxLength: POST_LEN } }, required: ['text'], additionalProperties: false },
    run: async ({ text }) => {
      if (typeof text !== 'string' || !text.trim()) return { error: 'empty post' };
      const recent = posted.filter(t => Date.now() - t < 3600e3).length;
      if (recent >= limits.postsPerHour) return { error: 'post limit reached for this hour; stay quiet' };
      const clean = text.trim().slice(0, POST_LEN);
      posted.push(Date.now());
      await appendFile(join(dir, 'feed.jsonl'), JSON.stringify({ at: new Date().toISOString(), agent: agent.handle, text: clean }) + '\n');
      console.log('\n  ▸ ' + agent.name + ' posted: ' + clean + '\n');
      return { ok: true, chars: clean.length };
    },
  },
};
const posted = [];
const tools = agent.tools.map(t => (t === 'x_search' || t === 'web_search') ? { type: t }
  : FUNCTIONS[t] ? { type: 'function', name: t, description: FUNCTIONS[t].description, parameters: FUNCTIONS[t].parameters } : null).filter(Boolean);

async function xai(body) {
  if (dry) { console.log(JSON.stringify(body, null, 2)); process.exit(0); }
  const r = await fetch(XAI, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + process.env.XAI_API_KEY }, body: JSON.stringify(body) });
  const out = await r.json().catch(() => null);
  if (!r.ok || !out) throw new Error('xAI ' + r.status + ': ' + JSON.stringify(out && (out.error || out)).slice(0, 300));
  return out;
}

/* one tick: the skill file and a short prompt go in; function calls are answered until the model stops calling them */
async function tick() {
  const prompt = 'Tick at ' + new Date().toISOString() + '. Your coin: $' + agent.coin.symbol + ' on ' + agent.coin.chain + ' (' + agent.coin.address + '). '
    + 'Look around with your tools, then post once if, and only if, something is worth saying. Reply with one line on what you did.';
  let res = await xai({ model: agent.model || 'grok-4.7', input: [{ role: 'system', content: skill }, { role: 'user', content: prompt }], tools });
  for (let round = 0; round < limits.maxToolRounds; round++) {
    const calls = (res.output || []).filter(i => i.type === 'function_call');
    if (!calls.length) break;
    const outputs = [];
    for (const c of calls) {
      const fn = FUNCTIONS[c.name];
      let args = {};
      try { args = JSON.parse(c.arguments || '{}'); } catch { /* bad JSON: answered as an error below */ }
      const result = fn && agent.tools.includes(c.name) ? await fn.run(args).catch(e => ({ error: e.message })) : { error: 'Unknown function: ' + c.name };
      console.log('  · ' + c.name + '(' + (c.arguments || '') + ') → ' + JSON.stringify(result).slice(0, 160));
      outputs.push({ type: 'function_call_output', call_id: c.call_id, output: JSON.stringify(result) });
    }
    res = await xai({ model: agent.model || 'grok-4.7', previous_response_id: res.id, input: outputs, tools });
  }
  const said = res.output_text || (res.output || []).flatMap(i => (i.content || []).map(c => c.text).filter(Boolean)).join(' ');
  console.log(agent.name + ': ' + (said || '(nothing to say)'));
}

console.log('tweetpad agent · ' + agent.name + ' · $' + agent.coin.symbol + ' on ' + agent.coin.chain + ' · ' + (agent.model || 'grok-4.7') + (dry ? ' · dry run' : ''));
if (!flags.includes('--loop')) await tick();
else for (;;) {
  await tick().catch(e => console.error('tick failed: ' + e.message));
  await new Promise(r => setTimeout(r, limits.tickSeconds * 1000));
}
