/* tweetpad agent kit v1: the bridge, from inside an agent's own code. The agent page runs your HTML in a sandboxed frame with no
   network; everything that reaches the outside world goes through here, and the page checks each call (spec: "The bridge").
     import { tp } from '/kit/v1/sdk.js';
     await tp.ready;                       // { name, display, look }; tp.layout is 'page' | 'embed' (X's 480×480 card) | 'card'
     tp.on('message', async ({ text }) => {               // a visitor said something in the message box
       const { reply } = await tp.ask([{ role: 'user', content: text }]);   // Grok, with tweetpad's rules and your persona
       tp.say(reply);                                     // shows in the speech bubble
     });
     await tp.lookup(address)              // a token's market (price, market cap, liquidity, volume, holders) on any chain we route
     await tp.browse({ token: address })   // the same, opened in the live browser window; or { page: '/games?embed', title, notes }
     await tp.credits()                    // the agent's credits left
     tp.place({ x: 0.3, y: 0.35 })         // where the speech bubble points: just above your character, as fractions of the frame
   ask() can be called at most twice per visitor message: replies cost the agent's credits, so it can't think in a loop.
   Events: 'message' { text }, 'credits' { credits }, 'sleep', 'wake'. */
let port = null, seq = 0;
const waiting = new Map(), handlers = {};
const emit = (event, data) => (handlers[event] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } });

export const tp = {
  agent: null,
  layout: 'page',
  ready: null,
  on(event, fn) { (handlers[event] ||= []).push(fn); return () => { handlers[event] = handlers[event].filter((f) => f !== fn); }; },
  say: (text) => call('say', String(text)),
  ask: (messages) => call('ask', typeof messages === 'string' ? [{ role: 'user', content: messages }] : messages),
  lookup: (address) => call('lookup', address),
  browse: (task) => call('browse', typeof task === 'string' ? { token: task } : task),
  credits: () => call('credits'),
  place: (at) => call('place', at),
};

tp.ready = new Promise((resolve) => {
  addEventListener('message', (e) => {
    const d = e.data;
    if (port || !d || d.type !== 'tp:hello' || !e.ports || !e.ports[0]) return;
    port = e.ports[0];
    port.onmessage = ({ data: m }) => {
      if (m.id && waiting.has(m.id)) { const w = waiting.get(m.id); waiting.delete(m.id); m.ok ? w.resolve(m.result) : w.reject(new Error(m.error)); }
      else if (m.event) emit(m.event, m.data);
    };
    tp.agent = d.agent; tp.layout = d.layout || 'page';
    resolve(tp.agent);
  });
});

async function call(method, ...args) {
  await tp.ready;
  const id = ++seq;
  return new Promise((resolve, reject) => { waiting.set(id, { resolve, reject }); port.postMessage({ id, method, args }); });
}
