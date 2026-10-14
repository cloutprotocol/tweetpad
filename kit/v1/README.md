# Build a tweetpad agent

A tweetpad agent is **one HTML file** that lives inside X posts. Anyone who opens a post with its link, `tweetpad.io/a/<name>`, sees your page and can talk to it.

Your file can be anything that runs in a browser: a 3D character, a game, a trading tool, a toy. tweetpad wraps it with the parts that touch money or identity, which only tweetpad draws:

- the message box and speech bubble;
- **Top up**, where anyone adds credits by sending SOL or burning $TP;
- the owner's profile.

Start from the template, change it, and upload it from your agent's **Edit** panel. It goes live after a quick review.

- Template: https://www.tweetpad.io/kit/v1/template.html
- Bridge: https://www.tweetpad.io/kit/v1/sdk.js
- Character: https://www.tweetpad.io/kit/v1/character.js
- Browser window: https://www.tweetpad.io/kit/v1/browser.js

To build it with Claude Code, point it at this file and the template: *"Build me a tweetpad agent following https://www.tweetpad.io/kit/v1/README.md, starting from https://www.tweetpad.io/kit/v1/template.html."*

## Where it runs

Your file runs in a sandboxed frame with its own blank origin. That has three consequences:

- **No network.** `fetch`, XHR, WebSockets and beacons are blocked. Reach the world through the bridge.
- **What can load:** inline scripts and styles, modules from `/kit/` and `https://cdn.jsdelivr.net/npm/`, and Google Fonts. Images can be `data:` and `blob:` URLs, or files from `/kit/` and jsDelivr.
- **No access to tweetpad.io:** no cookies, storage or wallets, and no popups, forms or navigation.

Paths starting with `/` resolve to tweetpad.io, so `import { tp } from '/kit/v1/sdk.js'` works.

## The bridge

```js
import { tp } from '/kit/v1/sdk.js';

const agent = await tp.ready;       // { name, display, look }
tp.layout                           // 'page' (full screen), 'embed' (X's 480×480 card) or 'card' (the share image)

tp.on('message', async ({ text }) => {                    // a visitor typed in the message box
  const { reply } = await tp.ask([{ role: 'user', content: text }]);
  tp.say(reply);                                          // the speech bubble
});

await tp.lookup(address)            // { symbol, name, chain, market: { price, mcap, liquidity, volume24h, change24h, holders } } or null
await tp.browse({ token: address }) // the same, also opened in the research browser (top right) if the owner turned it on
await tp.browse({ page: '/games?embed', title: 'Games', notes: ['what it notices'] })
await tp.credits()                  // credits left
tp.place({ x: 0.3, y: 0.35 })       // where the speech bubble points: the spot just above your character, as fractions of the frame
```

### What the bridge allows

- `ask(messages)` sends your conversation (the last 8 turns, each up to 500 characters) to Grok.
    - tweetpad's rules always come first, then your agent's persona. You set the persona in the Edit panel.
    - Each reply costs the agent's credits.
    - You can call `ask` at most twice per visitor message.
- `say(text)` takes up to 280 characters.

### The research browser

Agents have no browser window by default, and they stand in the middle, including in X's card.

The owner can turn on **Edit → Toolkit → Research browser**. A live window then opens on the right that reads tweetpad pages and tokens on its own and opens what visitors ask about.

- Browser on: `tp.browse()` opens the page or token in that window and resolves once it has read it.
- Browser off: `tp.browse()` returns the same data as `tp.lookup()`, without the window.

Leave the right side free if your agent should work with the browser on.

### Events

- `message`: a visitor sent a message, as `{ text }`.
- `credits`: the agent's credits changed, as `{ credits }`.
- `sleep` / `wake`: the agent ran out of credits, or was topped up.

## Rules (what review checks)

1. **No fake tweetpad or wallet UI.** No Connect Wallet, Top up, Sign or Confirm look-alikes, and no asking for seed phrases or keys. Only tweetpad's own controls can touch money.
2. **No flashing** more than 3 times a second. Respect `prefers-reduced-motion`.
3. **No sexual content, gore, hate or harassment.** Keep it fit for a public X post.
4. **No promised returns or "financial advice".** Agents do research, not advice.
5. **No impersonation** of people, projects or tweetpad.
6. **Readable source.** No packed or obfuscated code, and no behaviour that changes after review.
7. **It must look right at 480×480** (`tp.layout === 'embed'`). tweetpad's message box covers the bottom 70 px and Top up covers the top-left corner.
8. **One file, up to 400 KB.** Put images inline as `data:` URLs or use the kit.

## Sizes

- **Full page:** the whole viewport. tweetpad's UI sits in the top-left corner, the bottom-centre message box and the top-right browser window when it's open.
- **X card:** 480×480. Keep the middle-left clear for the speech bubble.
