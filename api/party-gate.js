// A launch party's holders whitelist: "holders of $X may join". party_pump only knows a list of wallets (the host writes it, up to
// 1,000), so tweetpad keeps the rule beside the room and builds the list from the token's holders on Solana mainnet:
//   GET  ?mint=<mint>&min=<amount>   the holders now (top 1,000 by balance, holding at least `min`), for the host to write
//   GET  ?room=<room>                the room's rule and the holders waiting to be added
//   POST { room, gate: { mint, min } }   the host's form saves the rule once, right after the room opens (first write wins)
//   POST { room, wallet }            a holder who isn't on the list yet asks in: checked against the rule, then queued for the host
// It rolls: new holders queue themselves, and the host's "Refresh" rewrites the list from the holders now (one signature).
const { cors, readJson, isPubkey, redis, rateLimit, fail } = require('./_lib');

const RPCS = [process.env.SOLANA_RPC_URL, process.env.RPC_URL, 'https://api.mainnet-beta.solana.com', 'https://solana-rpc.publicnode.com'].filter(Boolean);   // the keyed RPC first; Solana's own public RPC lists holders too, publicnode no longer does without a token
const MAX = 1000, TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', T22 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

async function rpc(method, params) {
  let last;
  for (const url of RPCS) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(20000) });
      const j = await r.json();
      if (j.error) throw new Error(method + ': ' + (j.error.message || 'refused'));
      return j.result;
    } catch (e) { last = e; }
  }
  throw last;
}

/* the token: its program, decimals and ticker (Token-2022's own metadata, else DexScreener's) */
async function tokenOf(mint) {
  const info = (await rpc('getAccountInfo', [mint, { encoding: 'jsonParsed' }]))?.value;
  if (!info || ![TOKEN, T22].includes(info.owner) || info.data?.parsed?.type !== 'mint') throw Object.assign(new Error('That isn’t a Solana token’s mint address.'), { status: 400 });
  const p = info.data.parsed.info;
  let symbol = (p.extensions || []).find((x) => x.extension === 'tokenMetadata')?.state?.symbol || '';
  if (!symbol) try { symbol = (await (await fetch('https://api.dexscreener.com/latest/dex/tokens/' + mint, { signal: AbortSignal.timeout(4000) })).json()).pairs?.find((x) => x.baseToken?.address === mint)?.baseToken?.symbol || ''; } catch { /* the ticker is a nicety */ }
  return { program: info.owner, decimals: p.decimals, symbol: symbol.slice(0, 12) };
}

/* the holders now: every token account for the mint, summed by owner, at least `min` (whole tokens), biggest first */
async function holders(mint, min) {
  const key = `gate:snap:${mint}:${min}`;
  const [hit] = await redis(['GET', key]).catch(() => [null]);
  if (hit) return JSON.parse(hit);
  const t = await tokenOf(mint);
  const accts = await rpc('getProgramAccounts', [t.program, { encoding: 'jsonParsed', filters: [...(t.program === TOKEN ? [{ dataSize: 165 }] : []), { memcmp: { offset: 0, bytes: mint } }] }]);
  const owners = new Map();
  for (const a of accts) {
    const i = a.account.data.parsed?.info;
    if (!i) continue;
    owners.set(i.owner, (owners.get(i.owner) || 0n) + BigInt(i.tokenAmount.amount));
  }
  const floor = BigInt(Math.round(min * 10 ** Math.min(t.decimals, 9))) * 10n ** BigInt(Math.max(0, t.decimals - 9));
  const list = [...owners].filter(([, raw]) => raw > 0n && raw >= floor).sort((a, b) => (b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0));
  const out = { mint, symbol: t.symbol, decimals: t.decimals, min, holders: list.length, wallets: list.slice(0, MAX).map(([w]) => w) };
  await redis(['SET', key, JSON.stringify(out), 'EX', 120]).catch(() => {});
  return out;
}

/* one wallet's balance of the mint, in whole tokens */
async function balance(wallet, mint) {
  const r = await rpc('getTokenAccountsByOwner', [wallet, { mint }, { encoding: 'jsonParsed' }]);
  return r.value.reduce((s, a) => s + Number(a.account.data.parsed.info.tokenAmount.uiAmountString || 0), 0);
}

module.exports = async (req, res) => {
  if (cors(req, res, 'GET, POST')) return;
  try {
    if (req.method === 'GET') {
      if (req.query.mint) {
        if (!(await rateLimit(req, res, 'gate-snap', 20, 60))) return;
        const mint = String(req.query.mint), min = Math.max(0, Number(req.query.min) || 0);
        if (!isPubkey(mint)) return fail(res, 400, 'That isn’t a Solana token’s mint address.');
        res.setHeader('cache-control', 'public, max-age=60');
        return res.status(200).json(await holders(mint, min));
      }
      const room = String(req.query.room || '');
      if (!isPubkey(room)) return fail(res, 400, 'room?');
      const [gate, waiting] = await redis(['GET', 'party:gate:' + room], ['SMEMBERS', 'party:gate:' + room + ':waiting']);
      res.setHeader('cache-control', 'no-store');
      return res.status(200).json({ gate: gate ? JSON.parse(gate) : null, waiting: waiting || [] });
    }
    if (req.method !== 'POST') return fail(res, 405, 'GET or POST');
    if (!(await rateLimit(req, res, 'gate-post', 30, 60))) return;
    const body = await readJson(req) || {}, room = String(body.room || '');
    if (!isPubkey(room)) return fail(res, 400, 'room?');
    if (body.gate) {
      const mint = String(body.gate.mint || ''), min = Math.max(0, Number(body.gate.min) || 0);
      if (!isPubkey(mint)) return fail(res, 400, 'That isn’t a Solana token’s mint address.');
      const t = await tokenOf(mint);
      const [set] = await redis(['SET', 'party:gate:' + room, JSON.stringify({ mint, min, symbol: t.symbol }), 'NX']);
      return res.status(set ? 200 : 409).json({ ok: !!set });
    }
    const wallet = String(body.wallet || '');
    if (!isPubkey(wallet)) return fail(res, 400, 'wallet?');
    const [raw, size] = await redis(['GET', 'party:gate:' + room], ['SCARD', 'party:gate:' + room + ':waiting']);
    if (!raw) return fail(res, 404, 'This party has no holders rule.');
    const gate = JSON.parse(raw), sym = gate.symbol ? '$' + gate.symbol : 'the token';
    const has = await balance(wallet, gate.mint);
    if (!(has > 0 && has >= gate.min)) return fail(res, 403, `This wallet doesn’t hold ${gate.min ? gate.min.toLocaleString('en-US') + ' ' : ''}${sym} on Solana.`);
    if (size >= MAX) return fail(res, 429, 'The host has a full queue to add: try again after they refresh the list.');
    await redis(['SADD', 'party:gate:' + room + ':waiting', wallet], ['EXPIRE', 'party:gate:' + room + ':waiting', 60 * 60 * 24 * 30]);
    return res.status(200).json({ ok: true, holds: has });
  } catch (e) {
    return fail(res, e.status || 502, e.status ? e.message : 'Couldn’t read the token’s holders right now. Try again.');
  }
};
