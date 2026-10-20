// A pump.fun party room's page: /p/<room>. It's party/room.html with the room's title, description, player URL and card image
// filled in, so the link plays in an X post. X keeps a link's card for days, so the tags only say what never changes about a room
// (its coin, its seats and their price); the live state (seats taken, launched) is in the page itself.
// The room is read with the party SDK (assets/vendor/party-sdk.js) on Solana mainnet, through the keyed RPC (SOLANA_RPC_URL), or on
// devnet for the test rooms opened before mainnet.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');

const TEMPLATE = readFileSync(join(__dirname, '..', 'party', 'room.html'), 'utf8');
const SITE = 'https://www.tweetpad.io';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isAddress = (s) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);

let sdk = null;
const party = async () => {   // an ES module bundle; loaded as CommonJS somewhere, its exports sit under `default`
  if (!sdk) { const m = await import(pathToFileURL(join(__dirname, '..', 'assets', 'vendor', 'party-sdk.js')).href); sdk = m.solanaContext ? m : m.default; }
  return sdk;
};

module.exports = async (req, res) => {
  const room = String(req.query.room || '');
  if (!isAddress(room)) return res.status(404).send('Not a party room.');
  const fill = { ROOM: room, URL: SITE + '/p/' + room, IMAGE: SITE + '/assets/party-card.png?v=1',
    TITLE: 'A launch party on tweetpad', DESC: 'Take a seat in a coin launch on pump.fun, right in the post. Refundable until launch.' };
  try {
    const s = await party();
    let r, devnet = false;
    try { r = await s.readPumpRoom(s.solanaContext(792703809, { rpcUrl: process.env.SOLANA_RPC_URL || process.env.RPC_URL || 'https://api.mainnet-beta.solana.com' }), room); }
    catch (e) {
      if (!/not a pump\.fun party room/.test(e.message)) throw e;
      r = await s.readPumpRoom(s.solanaContext(792703810, { rpcUrl: process.env.DEVNET_RPC_URL || 'https://api.devnet.solana.com' }), room);
      devnet = true;
    }
    const price = (Number(r.seatPrice) / 1e9).toString();
    fill.TITLE = `$${r.symbol} launch party · tweetpad`;
    fill.DESC = `${r.name} on pump.fun: ${r.capacity} seats at ${price} SOL, refundable until launch. Take a seat in the post.${devnet ? ' (Devnet test)' : ''}`;
  } catch { /* not readable right now: the page still loads and says so */ }
  res.setHeader('cache-control', 'public, s-maxage=60, stale-while-revalidate=600');
  res.setHeader('content-type', 'text/html; charset=utf-8');
  return res.status(200).send(TEMPLATE.replace(/\{\{(ROOM|TITLE|DESC|URL|IMAGE)\}\}/g, (_, k) => esc(fill[k])));
};
