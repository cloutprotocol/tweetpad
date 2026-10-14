/**
 * ALL film copy and scene timing live here. 30 fps, 1080x1080.
 * Flip EVM_STATUS to "live" once the Robinhood Chain launch ships in the card; the EVM scene and end card
 * copy switch automatically (see COPY.evm).
 */
export const FPS = 30;
export type EvmStatus = "coming" | "live";
export const EVM_STATUS: EvmStatus = "live"; // Robinhood launches shipped in the card (tab-bar chain switch)

export const SCENES = {
  hook: { from: 0, dur: 120 },      // 0:00.0  a tweet in a feed
  open: { from: 120, dur: 150 },    // 0:04.0  the card opens into the full launchpad
  solana: { from: 270, dur: 240 },  // 0:09.0  image, name, ticker, Launch
  tokens: { from: 510, dur: 180 },  // 0:17.0  token list, chart, feed
  evm: { from: 690, dur: 270 },     // 0:23.0  chain switch: Robinhood Chain, Launch Party's solo launcher, 1% creator fee
  end: { from: 960, dur: 150 },     // 0:32.0  # icon, wordmark, tweetpad.io, $TP
} as const;
export const TOTAL = SCENES.end.from + SCENES.end.dur; // 1110 f = 37.0 s

export const COPY = {
  hook: { head: "Launch a token", head2: "without leaving the tweet.", tweet: "Launch a token without leaving the tweet.", link: "tweetpad.io" },
  open: { head: "The whole launchpad,", head2: "inside a tweet.", sub: "No app to install and no tab to open." },
  solana: { head: "Drop an image.", head2: "Pick a ticker. Hit Launch.", fine: "Demo launch. Launches on pump.fun · 0 pad fee · network fees apply" },
  tokens: { head: "Tokens, charts and a feed.", head2: "Made for the timeline.", fine: "Illustrative coins. No live market data shown." },
  evm: {
    tag: (s: EvmStatus) => (s === "live" ? "NEW" : "NEW · COMING SOON"),
    head: "Launch on Robinhood Chain.",
    head2: "1% creator fee.",
    sub: "Built on Launch Party's solo launcher.",
    facts: [
      "Robinhood Chain · solo launch",
      "Built on Launch Party's solo launcher",
      "Share the fee: holders earn ETH rewards",
      "Dry-run on chain before your wallet signs",
      "Optional dev buy, up to 1 ETH",
    ],
    /** the fact card's small type */
    factsFine: "1% trading fee · 10% of it to Launch Party SDK. Network and launch fees apply.",
    fine: (s: EvmStatus) =>
      (s === "live" ? "" : "Coming soon to tweetpad. Design preview, not the shipped card. ") + "1% trading fee · 10% of it to Launch Party SDK · network and launch fees apply.",
  },
  end: {
    tagline: "Launch a token without leaving the tweet.",
    url: "tweetpad.io",
    ticker: "$TP",
    fine: (s: EvmStatus) =>
      "Solana: launches on pump.fun · 0 pad fee · network fees apply.  Robinhood Chain via Launch Party" +
      (s === "live" ? "" : " (coming soon)") + ": 1% trading fee · 10% of it to Launch Party SDK · network and launch fees apply.",
  },
} as const;

/* =====================================================================================================
 * Composition 2: TweetpadHowToLaunch, "How to launch a token on tweetpad". SOLANA ONLY (what's live).
 * No EVM / Robinhood / Launch Party content in this film.
 * ===================================================================================================== */

/** Owner opt-in. false = "The launchpad inside a tweet." · true = "The first launchpad inside a tweet." (unverified claim) */
export const CLAIM_FIRST = false;

const H = (from: number, dur: number) => ({ from, dur });
export const HOWTO = {
  intro: H(0, 120),      // a post in the feed with the tweetpad player card
  tour: H(120, 210),     // the card opens; Launch, Tokens, Feed, More
  connect: H(330, 195),  // Step 1
  image: H(525, 120),    // Step 2
  names: H(645, 150),    // Step 3
  desc: H(795, 120),     // Step 4
  socials: H(915, 135),  // Step 5
  devbuy: H(1050, 120),  // Step 6
  launch: H(1170, 255),  // Step 7
  share: H(1425, 150),   // Step 8
  end: H(1575, 120),     // end card
} as const;
export const HOWTO_TOTAL = HOWTO.end.from + HOWTO.end.dur; // 1695 f = 56.5 s

export const HOWTO_COPY = {
  intro: {
    head: "How to launch a token",
    head2: "on tweetpad",
    tweet: CLAIM_FIRST ? "The first launchpad inside a tweet." : "The launchpad inside a tweet.",
  },
  tour: {
    head: CLAIM_FIRST ? "The first launchpad inside a tweet." : "The launchpad inside a tweet.",
    sub: "Tap the card and the whole app opens in the post.",
    // tab titles, verbatim from embed.html (title attributes, key hints removed)
    tabs: [
      { key: "launch", label: "Launch", title: "Launch a token" },
      { key: "tokens", label: "Tokens", title: "Tokens launched here" },
      { key: "feed", label: "Feed", title: "Feed: what's happening on tweetpad" },
      { key: "more", label: "More", title: "More: profile, games, debug" },
    ],
  },
  steps: [
    { n: 1, head: "Connect your wallet", sub: "Connect wallet → Phantom → Connect" },
    { n: 2, head: "Add an image", sub: "PNG, JPG, GIF or WebP · up to 4 MB · drop or paste" },
    { n: 3, head: "Pick a name and a ticker", sub: "Ticker: 2–10 letters or numbers" },
    { n: 4, head: "Describe it in 140", sub: "A description, tweet-sized. Optional." },
    { n: 5, head: "Add social links", sub: "Optional: X, Telegram, website" },
    { n: 6, head: "Dev buy, if you want one", sub: "None, 0.1, 0.5 or 1 SOL · bought in the launch transaction" },
    { n: 7, head: "Hit Launch, approve in your wallet", sub: "tweetpad simulates the transaction before your wallet is asked" },
    { n: 8, head: "Share it", sub: "Its link plays as its own card on X. It shows up in Tokens too." },
  ],
  demo: "Demo coin. Launches create real tokens on mainnet and cost real SOL.",
  end: {
    tagline: "Launch a token without leaving the tweet.",
    url: "tweetpad.io",
    ticker: "$TP",
    fee: "Launches on pump.fun · 0 pad fee · network fees apply",
  },
} as const;

/* =====================================================================================================
 * Composition 3: TweetpadRobinhoodUpdate, the "now on Robinhood Chain" feature update. 2012 skin, ~31 s.
 * App strings are verbatim from embed.html + assets/tweetpad.js (renderLaunch, renderEvmWallet, renderDevBuy,
 * onLaunchEvm, renderCoinHead). Addresses are 0xxx…xxxx. No prices, caps, volumes or users.
 * ===================================================================================================== */
export const ROBINHOOD = {
  title: H(0, 75),       // STATIC title card: # icon × feather, "The first launchpad inside a tweet." (the timeline thumbnail)
  hook: H(75, 90),       // the post in a feed, tag NEW
  switch: H(165, 120),   // the card opens; tap the feather in the tab bar
  connect: H(285, 150),  // Connect EVM wallet → connect → add Robinhood Chain → Connected!
  fill: H(435, 150),     // image, name, ticker, 0.001 ETH dev buy + estimate
  fees: H(585, 150),     // Creator fees: drag the holders' share to 30%
  launch: H(735, 210),   // Launch → check lines → approve → live
  coin: H(945, 150),     // the coin page opens by itself: share box, fee split, holder rewards; then Tokens
  profile: H(1095, 150), // Profile: creator rewards → Claim → "Rewards claimed!"
  end: H(1245, 90),      // end card
} as const;
export const ROBINHOOD_TOTAL = ROBINHOOD.end.from + ROBINHOOD.end.dur; // 1335 f = 44.5 s

/** fee small print: every "1% creator fee" / "holders earn ETH" claim is paired with Launch Party's 10% */
const RH_FEE = "1% trading fee · 10% of it to Launch Party SDK";
export const ROBINHOOD_COPY = {
  // owner-approved for this film: the "first" claim and the tweetpad × Robinhood logo lockup
  title: { tagline: "The first launchpad inside a tweet." },
  hook: { tag: "NEW", head: "Now on", head2: "Robinhood Chain.", tweet: "Launch a token without leaving the tweet." },
  switch: { head: "One tap to switch chains.", sub: "Solana or Robinhood Chain, right in the tab bar." },
  connect: { head: "Connect an EVM wallet.", sub: "MetaMask, Rabby, Phantom and more." },
  fill: { head: "Drop an image.", head2: "Pick a ticker." },
  fees: { head: "Share fees with your holders.", sub: "A 1% creator fee. Holders earn ETH rewards." },
  launch: { head: "Hit Launch.", head2: "Checked on chain before you sign." },
  coin: { head: "Share it.", head2: "It plays as its own card on X." },
  profile: { head: "Claim your fees", head2: "from your profile." },
  // small type per scene
  fine: {
    demo: "Demo coin. Launches create real tokens on mainnet and cost real ETH.",
    fees: RH_FEE + " · holders claim in ETH.",
    launch: "Demo coin. " + RH_FEE + " · network and launch fees apply.",
    amounts: "Demo coin, demo amounts. " + RH_FEE + ".",
  },
  wallet: { name: "MetaMask", address: "0xxx…xxxx" },
  holders: 30,
  rewards: { holder: "0.00120 ETH", creator: "0.00340 ETH", claimed: "0.00000 ETH" },
  end: {
    tagline: "Launch a token without leaving the tweet.",
    fine: "Solana: launches on pump.fun · 0 pad fee · network fees apply.  Robinhood Chain via Launch Party's solo launcher: " + RH_FEE + " · network and launch fees apply.",
  },
} as const;

/* =====================================================================================================
 * Film 4: TweetpadTradeUpdate, "Now: buy and sell inside the tweet." Trading on the coin page + Jito bundles.
 * Claims: tweetpad takes no fee on trades; the wallet signs and pays; a Jito bundle carries a +0.0001 SOL tip and is
 * ONE wallet's own transaction (a launch bundles its own create + dev buy). Never multi-wallet, "bundle supply", speed
 * numbers, guaranteed first-in-block or MEV-proof.
 * ===================================================================================================== */
export const TRADE = {
  hook: H(0, 90),        // the post in a feed, tag NEW
  tokens: H(90, 88),     // the card opens on Tokens: chain badges + All · Solana · feather; tap $JACK
  buy: H(178, 184),      // the coin page: push into the trade box, 0.1 → quote → Buy → approve → Jito bundle → Bought
  sell: H(362, 156),     // Sell → 100% → quote → Sell → approve → Jito bundle → Sold
  rh: H(518, 60),        // a Robinhood coin: ETH presets, the Uniswap side's idle line
  launch: H(578, 96),    // the launch form: "⚡ Bundle with Jito" → "Sending as a Jito bundle…" → "Confirmed on mainnet"
  end: H(674, 90),       // end card
} as const;
export const TRADE_TOTAL = TRADE.end.from + TRADE.end.dur; // 764 f = 25.5 s

export const TRADE_COPY = {
  hook: { tag: "NEW", head: "Now: buy and sell", head2: "inside the tweet.", tweet: "Launch a token without leaving the tweet." },
  tokens: { head: "Every coin wears its chain.", sub: "Filter the list: All, Solana or Robinhood Chain." },
  buy: { head: "Tap an amount.", head2: "Hit Buy.", sub: "Right under the chart." },
  bundle: { head: "Sent as a Jito bundle.", sub: "Your wallet signs and pays. tweetpad takes nothing." },
  sell: { head: "Selling is the same.", sub: "25%, 50% or all of what you hold." },
  rh: { head: "Robinhood coins trade too.", sub: "In their Uniswap pool, paid in ETH." },
  launch: { head: "Launch as a bundle.", sub: "Your create and dev buy go as one Jito bundle." },
  // small type per scene
  fine: {
    list: "Demo coins. No live market data shown.",
    sol: "Demo coin, demo amounts. pump.fun’s fees only · tweetpad takes no fee on trades · network fees apply.",
    jito: "Demo coin, demo amounts. Jito tip +0.0001 SOL, from your wallet · pump.fun’s fees only · network fees apply.",
    rh: "Demo coin, demo amounts. 1% trading fee · 10% of it to Launch Party SDK · network fees apply.",
    launch: "Demo launch. Launches on pump.fun · 0 pad fee · Jito tip +0.0001 SOL · network fees apply.",
  },
  wallet: { name: "Phantom" },
  end: {
    tagline: "Launch, bundle, buy and sell.",
    tagline2: "Without leaving the tweet.",
    fine: "Solana: pump.fun’s fees only, tweetpad takes no fee on trades · optional Jito tip +0.0001 SOL · network fees apply.  Robinhood Chain: 1% trading fee · 10% of it to Launch Party SDK.",
  },
} as const;

/* =====================================================================================================
 * Film 5: TweetpadMultichainUpdate, "Now on BNB Chain and Base." Four chains in one switch (Solana · Robinhood · BNB · Base).
 * Claims: one EVM wallet works on all three EVM chains; the same Launch Party launcher on each; tweetpad takes no fee on trades.
 * Never: that BNB or Base coins already exist on tweetpad (demo coins only, the one BNB coin is the one this film launches),
 * quoted trade amounts on BNB / Base (no live pool to take figures from), speed or cost-savings claims.
 * ===================================================================================================== */
export const MULTI = {
  hook: H(0, 84),        // the post in a feed, tag NEW
  switch: H(84, 130),    // the card opens on Launch; tap Robinhood → BNB → Base → BNB in the tab bar, the form follows
  fill: H(214, 105),     // BNB: image, name, ticker, 0.05 BNB dev buy + estimate
  launch: H(319, 120),   // Launch → check lines → MetaMask approve → "$PAWS is live on BNB Chain"
  tokens: H(439, 90),    // Tokens: mixed badges; tap the BNB filter chip, then $PAWS
  coin: H(529, 78),      // the coin page: yellow badge, "BNB Chain" meta line, the BNB trade box (idle)
  base: H(607, 54),      // a Base coin page: blue badge, ETH presets
  end: H(661, 84),       // end card
} as const;
export const MULTI_TOTAL = MULTI.end.from + MULTI.end.dur; // 745 f = 24.8 s

const MC_FEE = "1% trading fee · 10% of it to Launch Party SDK";
export const MULTI_COPY = {
  hook: { tag: "NEW", head: "Now on BNB Chain", head2: "and Base.", tweet: "Launch a token without leaving the tweet." },
  switch: { head: "Four chains, one switch.", sub: "Solana · Robinhood · BNB · Base" },
  fill: { head: "Same wallet, same launcher.", sub: "One EVM wallet and Launch Party's launcher on all three." },
  launch: { head: "Hit Launch.", head2: "Live on BNB Chain.", sub: "Your wallet is switched to BNB Chain for you." },
  tokens: { head: "Every chain in one list.", sub: "Filter by Solana, Robinhood, BNB or Base." },
  coin: { head: "Trade it in the tweet.", sub: "Paid in BNB. tweetpad takes nothing." },
  base: { head: "Base works the same.", sub: "Paid in ETH, with the same EVM wallet." },
  // small type per scene
  fine: {
    switch: "Robinhood, BNB and Base: " + MC_FEE + " · network and launch fees apply.",
    launch: "Demo coin. " + MC_FEE + " · network and launch fees apply.",
    list: "Demo coins. No live market data shown.",
    coin: "Demo coin. " + MC_FEE + " · network fees apply.",
  },
  wallet: { name: "MetaMask", address: "0xxx…xxxx" },
  end: {
    tagline: "Every chain. One tweet.",
    tagline2: "Solana · Robinhood · BNB · Base",
    fine: "Solana: launches on pump.fun · 0 pad fee · network fees apply.  Robinhood Chain, BNB Chain and Base via Launch Party's solo launcher: " + MC_FEE + " · network and launch fees apply.",
  },
} as const;

/* =====================================================================================================
 * Film 6: TweetpadWelcomeBnbBase. A tight announcement, not a walkthrough: Now live (white) → two welcome posts →
 * one montage of what tweetpad does (each thing once) → end.
 * FRAMING (real people): @cz_binance and @jessepollak are WELCOMED by Agent Inu @tweetpad, never shown as authors. Their
 * avatars appear only as mention chips (with chain badges). No quotes, replies, likes, invented checks, and no "joined",
 * "partnered" or "backed by" wording.
 * ===================================================================================================== */
export const WELCOME = {
  live: H(0, 90),        // white: # icon + wordmark, "Now live", Solana · Robinhood · BNB Chain · Base pop in
  welcome: H(90, 180),   // two posts stack in the feed: @cz_binance (BNB), then @jessepollak (Base)
  montage: H(270, 210),  // five 42 f beats: chain switch → launch → Jito → buy/sell → fees
  end: H(480, 90),       // end card
} as const;
export const WELCOME_TOTAL = WELCOME.end.from + WELCOME.end.dur; // 570 f = 19.0 s
/** the montage beats, 42 f each, in order */
export const WELCOME_BEATS = ["chain", "launch", "jito", "trade", "fees"] as const;
export const WELCOME_BEAT_DUR = 42;

export const WELCOME_COPY = {
  live: { head: "Now live", url: "tweetpad.io" },
  chains: [
    { net: "solana", name: "Solana" }, { net: "robinhood", name: "Robinhood" }, { net: "bnb", name: "BNB Chain" }, { net: "base", name: "Base" },
  ] as const,
  welcome: {
    author: { name: "Agent Inu", handle: "@tweetpad", time: "now" },
    cz: { cap: "Welcome, BNB Chain.", handle: "@cz_binance", pfp: "brand/pfp-cz.jpg", pixel: false, chain: "bnb" as const,
      tweet: "gm @cz_binance 👋 BNB Chain is live on #tweetpad. Launch a coin and trade it without leaving the tweet." },
    jesse: { cap: "Welcome, Base.", handle: "@jessepollak", pfp: "brand/pfp-jesse.jpg", pixel: true, chain: "base" as const,
      tweet: "gm @jessepollak 🔵 Base is live on #tweetpad. Launch a coin and trade it without leaving the tweet." },
    fine: "A welcome from @tweetpad. Mentions only: no affiliation or endorsement implied.",
  },
  montage: {
    head: "Launch, bundle, trade, earn.", head2: "All in one tweet.",
    /** one label per beat (WELCOME_BEATS order) and its small type */
    beats: {
      chain: { label: "Pick a chain", fine: "Robinhood, BNB and Base: " + MC_FEE + " · network and launch fees apply." },
      launch: { label: "Launch", fine: "Demo coin. " + MC_FEE + " · network and launch fees apply." },
      jito: { label: "Bundle with Jito", fine: "Demo launch. Launches on pump.fun · 0 pad fee · Jito tip +0.0001 SOL · network fees apply." },
      trade: { label: "Buy and sell", fine: "Demo coin, demo amounts. pump.fun’s fees only · tweetpad takes no fee on trades · network fees apply." },
      fees: { label: "Creator and holder fees", fine: "Demo coin. " + MC_FEE + " · holders claim in the chain's coin." },
    },
  },
  end: {
    tagline: "tweetpad: the only launchpad you need.",
    cc: "cc @cz_binance @jessepollak",
    fine: MULTI_COPY.end.fine,
  },
} as const;

/* =====================================================================================================
 * Film 7: TweetpadTradePanel, "The trading terminal inside a tweet." A high-end promo for trading + Jito bundles: the $JACK
 * coin page in a slow 3D orbit, its parts lifting off as floating panels, one beat per feature. Figures: 0.1 SOL → ≈ 2.7M $JACK
 * (≈ $11.4); 2.7M back → ≈ 0.097 SOL (owner-supplied, live curve); demo balance 1.2 SOL · $148. Never: speed numbers, "MEV-proof".
 * ===================================================================================================== */
export const PANEL = {
  intro: H(0, 78),       // # field + headline
  terminal: H(70, 440),  // card flies in → panels explode → buy quote → Jito Turbo → Enter → bundle → Bought → sell → snap back
  end: H(505, 95),       // end card
} as const;
export const PANEL_TOTAL = PANEL.end.from + PANEL.end.dur; // 600 f = 20.0 s
/** terminal-local frames (S2): every app event, in order */
export const PANEL_T = {
  explode: 30, chip: 72, quoted: 84, turbo: 150, enter: 205, sending: 225, confirming: 250, bought: 270,
  sellTab: 305, pct: 322, sellQuoted: 334, sellPress: 352, snap: 375, out: 410,
} as const;

export const PANEL_COPY = {
  intro: { head: "The trading terminal", head2: "inside a tweet." },
  beats: {
    quote: "Tap an amount.",
    jito: "Pick your Jito speed.",
    buy: "Hit Enter. Sent as a bundle.",
    sell: "Sell it back.",
  },
  fine: "Demo coin and balance. pump.fun’s fees only · tweetpad takes no trade fee · network fees apply.",
  end: {
    head: "Launch. Bundle. Trade.", head2: "Inside the tweet.", url: "tweetpad.io",
    fine: "Solana trades on pump.fun's own SDK (Jupiter after graduation): pump.fun’s fees only, tweetpad takes no fee. Robinhood, BNB and Base trade in Uniswap v4: 1% trading fee · 10% of it to Launch Party SDK. Network fees apply.",
  },
} as const;

/* =====================================================================================================
 * Film 8: TweetpadAgentsTeaser, "Agents, coming soon, powered by Grok". The Lights out look (assets/skin-lights.css + the
 * "Agents (coming soon)" block in assets/tweetpad.css). COMING SOON: never shown as live or existing today; the agent card is
 * labelled Preview. "Powered by Grok" / "runs on Grok" in text only: no X, xAI or Grok logos or wordmarks, no partnership or
 * endorsement. Agents read as agents, not people. No price predictions. Official account: @tweetpad_io.
 * ===================================================================================================== */
export const AGENTS = {
  hook: H(0, 80),        // "Agents are coming to tweetpad." · Powered by Grok
  stage: H(72, 478),     // one 3D stage: the card builds and its log streams → skill file → coin → into a tweet
  end: H(545, 90),       // end card
} as const;
export const AGENTS_TOTAL = AGENTS.end.from + AGENTS.end.dur; // 635 f = 21.2 s
/** stage-local phase starts */
export const AGENTS_P = { card: 0, skill: 168, coin: 300, post: 393, out: 470 } as const;

export const AGENTS_COPY = {
  hook: { head: "Agents are coming", head2: "to tweetpad.", kicker: "Powered by Grok" },
  caps: {
    card: { head: "Give your coin an agent.", sub: "It reads the timeline and the chart." },
    skill: { head: "Write its skill.", sub: "One Markdown file you own." },
    coin: { head: "Tie it to your coin.", sub: "On any chain tweetpad supports." },
    post: { head: "Watch it inside the post.", sub: "" },
  },
  /** AGENT_DEMO (assets/tweetpad.js), the first five lines */
  log: [
    ["think", "Reading the timeline for $AI…"],
    ["tool", "x_search(\"$AI OR \"agent inu\"\") → 14 new posts"],
    ["tool", "chart($AI, 1h) → +12.4% · buys 38 / sells 11"],
    ["think", "Momentum and mentions are up. Stay on voice: dog, calm, no price promises."],
    ["post", "such volume. very community. wow. 🐕"],
  ] as const,
  /** a short agent.json and SKILL.md lines from agents/examples/agent-inu/ (the coin address left out) */
  agentJson: [
    "{",
    "  \"name\": \"Agent Inu\",",
    "  \"coin\": { \"chain\": \"solana\", \"symbol\": \"AI\" },",
    "  \"model\": \"grok-4.7\",",
    "  \"tools\": [\"x_search\", \"coin_market\", \"post\"]",
    "}",
  ],
  skillMd: [
    "You are an agent, not a person,",
    "and you say so if anyone asks.",
    "",
    "## Voice",
    "- A calm shiba in sunglasses. Lowercase.",
    "",
    "## Never",
    "- Give financial advice, price targets or promises.",
  ],
  tweet: { name: "Agent Inu", handle: "@tweetpad_io", time: "now", text: "Agents are coming to #tweetpad. Give your coin one, and watch it work right here in the post." },
  fine: "Preview with demo activity. Agents aren't live yet.",
  end: {
    head: "Launch an agent", head2: "inside a tweet.", sub: "Coming soon · powered by Grok", url: "tweetpad.io",
    kit: "Dev kit: github.com/cloutprotocol/tweetpad", handle: "@tweetpad_io",
    fine: "Not live yet. Grok is xAI's model; tweetpad isn't affiliated with xAI or X.",
  },
} as const;

/* =====================================================================================================
 * Film 9: TweetpadWinamp, "Winamp, inside a tweet." tweetpad.io/winamp: Webamp with the site's # spectrum backdrop, 10 skin
 * stills (public/winamp/skin-*.png, 275x348 logical at 4x) and "Space Debris" by Captain as the soundtrack (public/winamp/
 * space-debris.mp3, 40 s). NOT affiliated with Winamp: say so on the end card; no "official"; no Winamp / Nullsoft logos beyond
 * what is inside the skin stills; never name or label a skin; no third-party brands in text. Music credit always on the end
 * card. Official account: @tweetpad_io. Skin cuts sit on onsets of the track (125 BPM, beat ≈ 14.4 f).
 * ===================================================================================================== */
export const WINAMP = {
  hook: H(0, 90),        // the # spectrum is moving at frame 0; "Winamp. / Inside a tweet." + the classic player drops in
  skins: H(90, 358),     // ten skins, hard cuts on the beat, a white flash and a scale pop each
  tracker: H(448, 122),  // push into the playlist; file chips drop onto the player
  popout: H(570, 90),    // a tweetpad card; the player lifts out of it as its own window
  end: H(660, 90),       // end card
} as const;
export const WINAMP_TOTAL = WINAMP.end.from + WINAMP.end.dur; // 750 f = 25.0 s
/** skins-local cut frames (90 + these = 90, 123, 158, 201, 231, 271, 303, 340, 376, 410: onsets in the track) */
export const WINAMP_CUTS = [0, 33, 68, 111, 141, 181, 213, 250, 286, 320] as const;
/** skins in cut order (files in public/winamp/): the classic one closes the run so the tracker push lands on it */
export const WINAMP_SKINS = [
  "skin-02-sony-2000-se.png", "skin-03-purple-glow.png", "skin-04-ascii.png", "skin-05-blue-jeans.png", "skin-06-necromech.png",
  "skin-07-bento.png", "skin-08-microchip-2.png", "skin-09-sausage-amp.png", "skin-10-winamp3-classified.png", "skin-01-classic.png",
] as const;

export const WINAMP_COPY = {
  hook: { head: "Winamp.", head2: "Inside a tweet." },
  skins: { head: "90,000 skins.", sub: "One click: 🎲 Skin.", total: "90,000",
    /** museum-style counter per cut (random-looking; never a skin's name) */
    nums: ["31377", "07214", "58902", "12650", "84133", "40418", "69027", "23581", "77346", "00001"] },
  tracker: { head: "Tracker classics, preloaded.", sub: "Upload your own: .mod .xm .s3m .it, MP3s, .wsz skins.",
    chips: [".mod", ".xm", ".s3m", ".it", ".mp3", ".wsz"] },
  popout: { head: "Pop it out.", sub: "It keeps playing.",
    card: { title: "tweetpad", menu: "More", item: "Winamp ↗", note: "Pops out: tracker classics, 90,000 skins, your music" } },
  end: {
    head: "Winamp,", head2: "inside a tweet.", url: "tweetpad.io/winamp", handle: "@tweetpad_io",
    fine: "Space Debris by Captain, via The Mod Archive · Webamp by Jordan Eldredge · skins from the Winamp Skin Museum · Not affiliated with Winamp.",
  },
} as const;

/* =====================================================================================================
 * Film 10: TweetpadEthereum, "Now on Ethereum." The fifth chain: Launch Party's custom launch on Ethereum mainnet, picked in the
 * Launch header switch (the tab-bar switch keeps its four chains, as embed.html does). The creator picks a fee (0–5%) and a
 * starting value; Launch Party's public review signs a 30-minute approval that tweetpad checks; one transaction; a fixed fee hook
 * pays the creator in ETH and in the coin. Side note: Auto-claim (Solana).
 * Launch Party may be named with custom launch / fee hook language in THIS film only. Demo coin $ECAT only; no prices, market
 * caps, volumes or user counts; 0xxx…xxxx addresses; no audit or safety claims; no "free" / "no fees".
 * ===================================================================================================== */
export const ETH = {
  hook: H(0, 84),          // the post in a feed, tag NEW
  switch: H(84, 120),      // the card opens on Launch (Base, remembered); tap Ethereum in the Launch header; the form follows
  fill: H(204, 126),       // image, "Ether Cat" / "ECAT", fee 3%, starting value 5 ETH
  launch: H(330, 150),     // Launch → IPFS → Launch Party's review → approved → MetaMask → "$ECAT is live on Ethereum"
  coin: H(480, 96),        // the coin page: Ethereum badge + chain line, the fee hook line, the ETH trade box (idle)
  autoclaim: H(576, 96),   // side note: Profile → Auto-claim Off → On (Solana)
  end: H(672, 84),         // end card
} as const;
export const ETH_TOTAL = ETH.end.from + ETH.end.dur; // 756 f = 25.2 s

const ETH_FINE = "Ethereum via Launch Party: creator fee 0–5% · 0.001 ETH launch fee + gas";
export const ETH_COPY = {
  hook: { tag: "NEW", head: "Now on Ethereum.", head2: "Launch from the tweet.", tweet: "Launch a token without leaving the tweet." },
  switch: { head: "Five chains, one switch.", sub: "Solana · Robinhood · BNB · Base · Ethereum" },
  fill: { head: "Pick your fee.", head2: "Pick where it starts.", sub: "0–5% of every trade, to you. Fixed at launch." },
  launch: { head: "Reviewed by Launch Party.", head2: "Checked by tweetpad.", sub: "Then one transaction from your wallet." },
  coin: { head: "Your fee on every trade.", head2: "In ETH and your coin.", sub: "Claimed on your profile." },
  autoclaim: { tag: "ALSO NEW", head: "Auto-claim.", sub: "Solana creator fees, claimed to your wallet every 5 minutes." },
  // small type per scene
  fine: {
    hook: "Solana: launches on pump.fun · 0 pad fee · network fees apply.",
    base: "Base: 1% trading fee · 10% of it to Launch Party SDK · network and launch fees apply.",
    eth: ETH_FINE + ".",
    launch: "Demo coin. " + ETH_FINE + ".",
    coin: "Demo coin. 3% creator fee, set at launch · Ethereum network fees apply.",
    autoclaim: "Demo amounts. tweetpad pays the network fee. tweetpad.io/autoclaim",
  },
  coinName: "Ether Cat", ticker: "ECAT", feePct: 3, start: "5",
  wallet: { name: "MetaMask", address: "0xxx…xxxx" },
  sol: { address: "xxxx…xxxx", rewards: "0.0031 SOL", minSol: "0.005",
    on: "Auto-claim is on: fees of 0.005 SOL or more are claimed to this wallet" },
  end: {
    tagline: "Every chain. One tweet.",
    tagline2: "Solana · Robinhood · BNB · Base · Ethereum",
    /** one line per chain family */
    fine: [
      "Solana: launches on pump.fun · 0 pad fee · network fees apply.",
      "Robinhood Chain, BNB Chain and Base via Launch Party's solo launcher:",
      MC_FEE + " · network and launch fees apply.",
      ETH_FINE + ".",
    ],
  },
} as const;

/* =====================================================================================================
 * Film 11: TweetpadThreeNew, "Three new things on tweetpad." A parody character (the Ethereum diamond in shades, from
 * assets/notvitalik-avatar.svg, named "vitalik.eth" with a PARODY chip as on /custom) spells out the three updates in the
 * intro: Ethereum launches, custom launches (/custom: fixed or upgradeable fee hook, team share, the agent skill file) and
 * Auto-claim on Solana. Never the real Vitalik Buterin's photo, handle or voice; the intro's small type says so.
 * Launch Party may be named with custom launch / fee hook / upgradeable hook language in THIS film (all shipped). Demo coin
 * $ECAT only; no prices, market caps, volumes, claim or user counts; 0xxx…xxxx addresses; no audit or safety claims; no "free".
 * ===================================================================================================== */
export const THREE = {
  intro: H(0, 216),        // the parody diamond spells out the three updates, one by one
  eth: H(216, 180),        // 1 · Ethereum: fee 3%, 5 ETH, Launch → Launch Party's review → "$ECAT is live on Ethereum"
  custom: H(396, 252),     // 2 · /custom: Upgradeable hook, team share 10% over 90 days, then "Or hand it to your agent"
  autoclaim: H(648, 168),  // 3 · Auto-claim: Profile → Turn on, then the /autoclaim page
  end: H(816, 90),         // end card
} as const;
export const THREE_TOTAL = THREE.end.from + THREE.end.dur; // 906 f = 30.2 s

/** frames inside the intro: [start of the spelled-out line, …] */
export const THREE_T = { gm: 8, item1: 54, item2: 96, item3: 138, peek: 176 } as const;

const CUSTOM_FINE = "Ethereum via Launch Party's CustomLaunch: creator fee 0–5% · 0.001 ETH launch fee + gas";
export const THREE_COPY = {
  intro: {
    name: "vitalik.eth", parody: "parody",
    gm: "gm. three new things on tweetpad:",
    items: ["Ethereum launches", "Custom launches", "Auto-claim on Solana"],
    tag: "NEW", head: "Three new things", head2: "on tweetpad.",
  },
  eth: { tag: "1 · ETHEREUM", head: "Launch on Ethereum.", head2: "Pick your fee, 0–5%." },
  custom: { tag: "2 · CUSTOM LAUNCH", head: "Your token, your fee hook.", head2: "Fixed or upgradeable." },
  agent: { tag: "2 · CUSTOM LAUNCH", head: "Or hand it to your agent.", sub: "One skill file. You still sign." },
  autoclaim: { tag: "3 · AUTO-CLAIM", head: "Auto-claim on Solana.", sub: "Creator fees to your wallet, every 5 minutes." },
  fine: {
    intro: "Parody character. Not Vitalik Buterin; no affiliation or endorsement implied.",
    eth: "Demo coin. " + CUSTOM_FINE + ".",
    custom: "Demo coin. Via Launch Party's CustomLaunch · creator fee 0–5% · 0.001 ETH launch fee + gas · a check is not an audit.",
    autoclaim: "Demo amounts. Claims once 0.005 SOL is waiting · tweetpad pays the network fee. tweetpad.io/autoclaim",
  },
  coinName: "Ether Cat", ticker: "ECAT", feePct: 3, start: "5", team: 10, vest: 90,
  wallet: { name: "MetaMask", address: "0xxx…xxxx" },
  sol: { address: "xxxx…xxxx", rewards: "0.0031 SOL", minSol: "0.005",
    on: "Auto-claim is on: fees of 0.005 SOL or more are claimed to this wallet" },
  end: {
    tagline: "Ethereum. Custom launches. Auto-claim.",
    tagline2: "All inside the tweet.",
    fine: [
      "Solana: launches on pump.fun · 0 pad fee · network fees apply.",
      CUSTOM_FINE + ".",
      "Parody character, not Vitalik Buterin. tweetpad.io/custom · tweetpad.io/autoclaim",
    ],
  },
} as const;

/* =====================================================================================================
 * Film 12: TweetpadStonks, "Stocks meet memes. Stonkfun, inside the tweet." Solana launches on Stonkfun (Raydium LaunchLab)
 * through tweetpad, shipped b6418ac: the Launchpad switch (pump.fun | Stonkfun), "Pair with" by launchpad (SOL, the
 * tokenized stocks, USDC), the fee setup (Creator fees · Holder rewards 1% / 3% · Community), the launch, and the coin page
 * with its tax and what holders were paid. Every in-app string is verbatim from embed.html / assets/tweetpad.js.
 * The xStock logos are the ones Stonkfun serves for its pairs (public/stonk/); the small type says no affiliation.
 * Demo coin $MCHIP only (public/brand/moon-chip.svg); reward amounts are demo values; no prices, market caps, volumes,
 * user or payout counts beyond the demo; xxxx…xxxx addresses; no audit or safety claims; no "free".
 * ===================================================================================================== */
export const STONK = {
  intro: H(0, 150),        // the swirl: xStock logos orbit the # icon
  switch: H(150, 140),     // 1 · the Launchpad switch: pump.fun → Stonkfun (the pair chip turns to $TSLAx, the fee box shows)
  pair: H(290, 160),       // 2 · Pair with: the Stonkfun filter, then $NVDAx
  fees: H(450, 150),       // 3 · Holder rewards → 3% → Community
  launch: H(600, 180),     // 4 · Launch: the check lines, the approve window, "$MCHIP is live"
  coin: H(780, 140),       // 5 · the coin page: ⇄ $NVDAx, the 3% tax, paid to holders (demo)
  end: H(920, 105),        // end card, the swirl around it
} as const;
export const STONK_TOTAL = STONK.end.from + STONK.end.dur; // 1025 f = 34.2 s

const STONK_FEE_FINE = "Stonkfun (Raydium LaunchLab): about 0.009 SOL · network fees apply";
const NO_AFFIL = "Logos belong to their owners. No affiliation with or endorsement by them, or by Stonkfun.";
export const STONK_COPY = {
  intro: { tag: "NEW", head: "Stocks meet memes.", head2: "Stonkfun, inside the tweet.", center: "Launch a coin paired with a stock." },
  switch: { tag: "1 · LAUNCHPAD", head: "One switch:", head2: "pump.fun or Stonkfun." },
  pair: { tag: "2 · PAIR", head: "Pair your coin with a stock.", sub: "TSLAx, NVDAx, SPYx… or SOL and USDC." },
  fees: { tag: "3 · FEES", head: "Creator fees,", head2: "or holder rewards." },
  launch: { tag: "4 · LAUNCH", head: "Hit Launch.", head2: "Checked on chain before it's listed." },
  coin: { tag: "5 · HOLDERS", head: "Holders get paid", head2: "in the stock." },
  fine: {
    intro: "xStocks are tokenized stocks, shown as Stonkfun lists its pairs. " + NO_AFFIL,
    switch: STONK_FEE_FINE + ".",
    pair: "Pairs as Stonkfun lists them. " + NO_AFFIL,
    fees: "A 1% or 3% tax, fixed at launch, paid out to holders by Stonkfun. Network fees apply.",
    launch: "Demo coin. Launches create real tokens on mainnet and cost real SOL.",
    coin: "Demo coin, demo amounts. Trades through Jupiter: LaunchLab's 1% fee and Jupiter's 0.1% · tweetpad takes nothing.",
  },
  coinName: "Moon Chip", ticker: "MCHIP", wallet: "Phantom",
  first: "TSLAx", pick: "NVDAx",
  paid: "0.0042 NVDAx", wallets: "12 wallets",
  end: {
    tagline: "Stocks meet memes.",
    tagline2: "Launch on Stonkfun, inside the tweet.",
    fine: [
      "Solana: launches on pump.fun · 0 pad fee · network fees apply.",
      STONK_FEE_FINE + " · holder rewards paid out by Stonkfun.",
      NO_AFFIL,
    ],
  },
} as const;

/* =====================================================================================================
 * Film 13: TweetpadGames, "Casino games, inside the tweet. Built on Gamba." tweetpad's games on Gamba (gamba.so), shipped in
 * 96fafb3: /games, Pump or Dump (call the next candle at 2×, 3× or 5×), Mines (5×5, 3 / 5 / 10 mines, gems ride, cash out),
 * ⚡ Instant play (one signature opens a game balance: no pop-ups), provably fair (Gamba's committed seed, checked in the
 * browser), and Gamba's public SOL pool as the house. Every in-app string is verbatim from games/*.html, assets/gamba-kit.js,
 * pumpordump.js and mines.js. Demo plays only: the amounts follow from the real odds and fees (0.05 SOL bets), the addresses
 * are xxxx…xxxx, the jackpot and every live number are left out (no volumes, payouts or player counts). A loss is shown in
 * each game. Gamba is named in words and by its shrimp mark ("Built on Gamba"), never as a partner or endorser; no "free",
 * no "guaranteed", no audit or safety claims; 18+ and "only where betting is legal" on every play scene.
 * ===================================================================================================== */
export const GAMES = {
  intro: H(0, 150),        // the hook: gems, bombs and candles orbit the # icon; "Built on Gamba"
  hub: H(150, 100),        // 1 · /games: two tiles; Pump or Dump is tapped
  pod: H(250, 240),        // 2 · Pump or Dump: 3×, PUMP → TO THE MOON; DUMP → LIQUIDATED
  mines: H(490, 240),      // 3 · Mines: three gems, cash out ×1.49; a new round → BOOM
  instant: H(730, 150),    // 4 · ⚡ Instant play: one signature, the game balance, tiles with no pop-ups
  fair: H(880, 140),       // 5 · Provably fair: the committed seed, the checks
  gamba: H(1020, 120),     // 6 · Built on Gamba: the house is its public SOL pool
  end: H(1140, 110),       // end card
} as const;
export const GAMES_TOTAL = GAMES.end.from + GAMES.end.dur; // 1250 f = 41.7 s

const GAMES_LEGAL = "18+, and only where betting is legal. Bet only what you can lose.";
export const GAMES_COPY = {
  intro: { tag: "NEW", head: "Casino games,", head2: "inside the tweet.", center: "Pump or Dump · Mines" },
  hub: { tag: "1 · GAMES", head: "Two games.", head2: "One tap, in the post." },
  pod: { tag: "2 · PUMP OR DUMP", head: "Call the next candle.", sub: "2×, 3× or 5× · bets up to 0.1 SOL" },
  mines: { tag: "3 · MINES", head: "Find gems.", head2: "Cash out before a mine." },
  instant: { tag: "4 · ⚡ INSTANT PLAY", head: "One signature.", head2: "Then no pop-ups." },
  fair: { tag: "5 · PROVABLY FAIR", head: "Every result,", head2: "checked in your browser." },
  gamba: { head: "Built on Gamba.", sub: "Solana's on-chain casino protocol" },
  facts: ["The house is Gamba's public SOL pool", "Every bet settled on chain in about a second", "Seeds committed before you play"],
  fine: {
    intro: "Practice uses no money. Real plays: " + GAMES_LEGAL,
    hub: "Built on Gamba's open protocol. Gamba doesn't run or endorse tweetpad.",
    pod: "Demo plays. A call costs the bet + 3.8% in fees. 18+, and only where betting is legal.",
    mines: "Demo plays. Each tile costs 3.2% in fees on what rides. 18+, and only where betting is legal.",
    instant: "The game balance holds up to 1 SOL in a key your wallet's signature makes; it withdraws only to that wallet.",
    fair: "Gamba commits to each seed (SHA-256) before the bet; the page recomputes every result from the revealed seed.",
    gamba: "Gamba's shrimp mark belongs to Gamba. Gamba doesn't run or endorse tweetpad.",
  },
  wallet: "Phantom", addr: "xxxx…xxxx",
  end: {
    tagline: "Casino games, inside the tweet.",
    tagline2: "Pump or Dump and Mines, built on Gamba.",
    fine: [
      "tweetpad.io/games · Gamba's public SOL pool · bets up to 0.1 SOL · fees on top of each play.",
      GAMES_LEGAL + " Over time the house wins.",
      "Gamba doesn't run or endorse tweetpad.",
    ],
  },
} as const;

/* =====================================================================================================
 * Film 14: TweetpadBordrless, "Bordrless tokens, tradeable in a tweet." Bordrless tokens live in a token standard of their own
 * (not SPL, not Token-2022): wallets don't list them and swap aggregators don't route them. tweetpad gives every one of them a
 * trading page at tweetpad.io/b/<token CA> that plays as its own X card, so a posted link is the coin, tradeable in the post;
 * plus the Tokens page's Bordrless list by market cap, the scanner, and Bordrless launches. Drawn in Bordrless's look (paper,
 * ink, Anton, JetBrains Mono, hard shadows, "Fig." tags, the 1-bit dithered pictures in public/bordrless/) with tweetpad's
 * # icon and blue. Demo coin $RING only, demo numbers under "Demo coin, demo numbers."; no real coin, price or address; no
 * audit or safety claims; no "free"; Bordrless named in words, never as a partner or endorser.
 * ===================================================================================================== */
export const BORDR = {
  intro: H(0, 240),     // tweetpad's own post spells out what's new, line by line, beside the ringed sphere
  why: H(240, 150),     // Fig. 1: its own token standard; wallets don't list it, aggregators don't route it. Until now.
  share: H(390, 180),   // 1 · SHARE: tweetpad.io/b/<token CA> typed into a post becomes the coin's card
  trade: H(570, 240),   // 2 · TRADE: the card opens into /b/<mint>; 0.1 SOL, connect, approve, bought
  chain: H(810, 150),   // 3 · ON CHAIN: the page scrolls through its rules, curve, who can change it, yours to claim
  list: H(960, 150),    // 4 · EVERY TOKEN + 5 · LAUNCH: the Bordrless list by market cap, and the launch form's Bordrless setup
  howto: H(1110, 180),  // Fig. 2: how to make any Bordrless token tradeable in a post, in four steps
  end: H(1290, 120),    // end card over the monument
} as const;
export const BORDR_TOTAL = BORDR.end.from + BORDR.end.dur; // 1410 f = 47.0 s

/** frames inside the intro: [start of each spelled-out line, …] */
export const BORDR_T = { gm: 10, items: [58, 92, 126, 160, 194] } as const;

const BORDR_NAMED = "Bordrless is named in words; no affiliation with or endorsement by Bordrless.";
export const BORDR_COPY = {
  intro: {
    author: "tweetpad", handle: "@tweetpad_io",
    gm: "gm. Bordrless tokens now trade inside a tweet:",
    items: ["Buy and sell any Bordrless token in a post", "Share it: tweetpad.io/b/<token CA>", "Every token, ranked by market cap",
      "Scan who can still change it", "Launch your own on Bordrless"],
    tag: "NEW", head: "Bordrless tokens.", head2: "Tradeable in a tweet.",
  },
  why: { fig: "Fig. 1", tag: "THE PROBLEM", head: "Its own token standard.", head2: "Hard to trade anywhere else.",
    wallet: "Your wallet", walletNote: "No Bordrless tokens listed", router: "Swap aggregator", routerNote: "No route for this token",
    stamp: "Until now." },
  share: { tag: "1 · SHARE", head: "Paste tweetpad.io/b/<token CA>.", head2: "It becomes a card you can trade.",
    post: "$RING trades right inside this post", link: "tweetpad.io/b/RiNG…xxxx" },
  trade: { tag: "2 · TRADE", head: "Buy and sell in the post.", head2: "SOL in, SOL out. Your wallet signs." },
  chain: { tag: "3 · ON CHAIN", head: "Its rules, its curve, its risk.", head2: "Read from the chain." },
  list: { tag: "4 · EVERY TOKEN", head: "Every Bordrless token,", head2: "ranked by market cap." },
  launch: { tag: "5 · LAUNCH", head: "Or launch your own.", head2: "Your fee. Its rules." },
  howto: {
    fig: "Fig. 2", tag: "HOW TO", head: "Make any Bordrless token", head2: "tradeable in a post.",
    steps: [
      ["Copy the token's contract address", "from bordrless.app, a chart, anywhere"],
      ["Put it after tweetpad.io/b/", "tweetpad.io/b/<token CA>"],
      ["Post the link on X", "it unfurls into the coin's own card"],
      ["Anyone taps play and trades", "buy and sell right inside the post"],
    ],
    or: "Or: tweetpad → Tokens → Bordrless → pick a coin → Post on X",
  },
  coin: { name: "Ring", ticker: "RING", cap: "$48.2K", change: "+12.4% 24h", holders: "96", curve: 0.46, raised: "48.3", grad: "105",
    quote: "214.2K", min: "203.5K", balance: "1.24", fee: "1%", wallet: "Phantom", addr: "xxxx…xxxx" },
  fine: {
    intro: BORDR_NAMED,
    why: "A Bordrless holding is an account of Bordrless's own token program, not an SPL token account.",
    trade: "Demo coin, demo numbers. Trades run on Bordrless's DEX: its LP fee and each coin's own rules apply · tweetpad takes nothing · network fees apply.",
    chain: "Demo coin, demo numbers. Read with Bordrless's SDK; candles and trades from Bordrless's indexer. A scan is not an audit.",
    list: "Demo coins. The live list is every Bordrless token, launched on tweetpad or not.",
    launch: "Bordrless launch: 0.01 SOL launch fee + rent, about 0.035 SOL · creator fee 0.5–2% · tweetpad takes nothing.",
    howto: "Works for any Bordrless token on Bordrless's launchpad. Coins with a hook of their creator's own trade on bordrless.app.",
  },
  end: {
    tagline: "Every Bordrless token.", tagline2: "Tradeable in a tweet.", link: "tweetpad.io/b/<token CA>",
    fine: ["Trades run on Bordrless's DEX · its LP fee and each coin's rules apply · tweetpad takes nothing · network fees apply.", BORDR_NAMED],
  },
} as const;

/* =====================================================================================================
 * Film 15: TweetpadBordrlessHome, "Launch & trade Bordrless tokens (inside a tweet)." It starts on tweetpad's new home, the Menu
 * (index.html: nine channels in the card's 2012 skin, the dock and its clock), where the Wii hand picks the Bordrless channel:
 * the home opens it as the Menu does (the tile grows into the screen, the channel's banner centred while it loads, Menu |
 * Bordrless | Start), then Start. Then Bordrless's look: the sphere read as Bordrless reads it (token program, hook, DEX), a launch
 * on /borderless, a trade on Bordrless's DEX in the post (/b/<mint>), every token by market cap, and the poster. Demo coin $RING
 * and demo numbers only; Bordrless named in words, its sphere as the channel's mark and the art; never a partner or endorser.
 * ===================================================================================================== */
export const BHOME = {
  home: H(0, 150),      // the Menu; the hand visits Launch and Games, then picks Bordrless
  open: H(150, 135),    // the channel opens: the zoom, the banner, the section behind it, Start
  fig: H(285, 120),     // the sphere, read: the token program, the hook, the Bordrless DEX
  launch: H(405, 240),  // 1 · LAUNCH on /borderless: image, name, ticker, Burn, 0.1 SOL, one approval, live
  trade: H(645, 210),   // 2 · TRADE on Bordrless's DEX, in the post (/b/<mint>)
  tokens: H(855, 120),  // 3 · EVERY TOKEN, by market cap
  end: H(975, 150),     // the poster
} as const;
export const BHOME_TOTAL = BHOME.end.from + BHOME.end.dur; // 1125 f = 37.5 s

export const BHOME_COPY = {
  home: { tag: "NEW", head: "A new channel on tweetpad." },
  fig: { fig: "Fig. 2", tag: "TOKENS WITH A BRAIN", head: "Their own token program.", head2: "Their own DEX.",
    callouts: [
      ["1", "Upper ring", "The token program", "Calls the token's hook on every transfer, mint and burn."],
      ["2", "The band", "The hook", "The token's own rules: a fee, a burn, rewards."],
      ["3", "The ribs", "Its answer", "An amount, not a yes or no."],
      ["4", "Lower ring", "The Bordrless DEX", "Every swap runs through it, rules and all."],
    ] },
  launch: { tag: "1 · LAUNCH", head: "Launch a Bordrless token.", head2: "Your fee. Its rules. One approval." },
  trade: { tag: "2 · TRADE", head: "Trade it on Bordrless's DEX.", head2: "Right inside the post." },
  tokens: { tag: "3 · EVERY TOKEN", head: "Every Bordrless token.", head2: "By market cap. Tap one, trade it." },
  fine: {
    home: "tweetpad.io · Bordrless's sphere marks its channel; Bordrless doesn't run or endorse tweetpad.",
    fig: "Bordrless's token program, hooks and DEX; tweetpad builds on its open SDK.",
    launch: "Demo coin. Bordrless launch: 0.01 SOL launch fee + rent, about 0.035 SOL · creator fee 0.5–2% · tweetpad takes nothing.",
    trade: "Demo coin, demo numbers. Trades run on Bordrless's DEX: its LP fee and each coin's rules apply · tweetpad takes nothing · network fees apply.",
    tokens: "Demo coins. The live list is every Bordrless token, launched on tweetpad or not.",
  },
} as const;

/* =========================================================================================
 * Film 16: "One Menu. Every chain." (TweetpadMenuTour)
 * The update (tweetpad's new home, the Menu; the Wii skin, now the default; any token tradeable) and a walk through what was
 * already there, every app opened from the Menu the way index.html opens a channel. Frames are absolute: the Menu stays on
 * screen the whole film, so the visits are one timeline rather than separate Sequences. 1650 f = 55 s.
 * ========================================================================================= */
export const TOUR = {
  title: { from: 0, dur: 60 },          // static: the # and the wordmark, the line, NEW · THE MENU
  menu: { from: 60, dur: 75 },          // the channels arrive, the dock rises; the hand comes in
  // each visit: the tile is clicked at `at`, its channel plays for `len` (open, the app, Menu pressed, back into the tile)
  tokens: { at: 135, len: 250 },        // NEW: paste any token's address, its page, a buy
  post: { from: 385, dur: 200 },        // NEW: its link posted on X plays as a card; Open to trade, bought from the post
  launch: { at: 610, len: 190 },        // and launch your own: Solana → Robinhood → BNB → Base → Ethereum
  outro: { from: 800, dur: 40 },        // the whole Menu again
  end: { from: 840, dur: 150 },
} as const;
export const TOUR_TOTAL = TOUR.end.from + TOUR.end.dur; // 990 f = 33.0 s

export const TOUR_COPY = {
  title: { tag: "NEW · THE MENU", line: "The launchpad inside a tweet." },
  menu: { tag: "NEW", head: "tweetpad has a home.", head2: "Every app, one Menu." },
  launch: { tag: "LAUNCH", head: "Or launch your own.", head2: "From one card.",
    chains: ["Solana · pump.fun", "Robinhood Chain", "BNB Chain", "Base", "Ethereum · Launch Party"] },
  tokens: { tag: "NEW", head: "Trade any token.", head2: "On Solana, Base, BNB, Ethereum." },
  anyToken: { tag: "NEW", head: "Trade any token.", head2: "Paste its address. It's tradeable." },
  post: { tag: "NEW", head: "Post any token.", head2: "Trade it right from the tweet." },
  feed: { tag: "FEED", head: "The pad's own timeline.", head2: "Post, retweet, embed a coin." },
  hooks: { tag: "HOOKS LAUNCH", head: "Your own fee hook.", head2: "Uniswap v4, on Ethereum." },
  games: { tag: "GAMES", head: "Pump or Dump. Mines.", head2: "Played inside the post." },
  profile: { tag: "PROFILE", head: "Your coins and rewards.", head2: "Claimed on every chain." },
  bordrless: { tag: "BORDRLESS", head: "Tokens with their own rules.", head2: "Launch and trade them here." },
  more: { tag: "NEW DEFAULT", head: "The Wii skin.", head2: "Or 2012, Tweetcraft, Lights out." },
  outro: { head: "One Menu.", head2: "Every chain." },
  end: { tagline: "The launchpad inside a tweet.", cc: "Solana · Robinhood Chain · BNB Chain · Base · Ethereum" },
  fine: {
    menu: "tweetpad.io · the Menu plays as tweetpad's own card on X.",
    launch: "Demo coin. Launch fees and network fees vary by chain. Robinhood, BNB, Base: 1% creator fee, 10% of the fee to Launch Party SDK.",
    tokens: "Demo token and numbers. Any token: Jupiter on Solana, KyberSwap on EVM · tweetpad takes nothing.",
    post: "Demo token and numbers. The link plays as its own X card; trades open in a tweetpad window · tweetpad takes nothing.",
    feed: "Demo posts.",
    hooks: "Demo coin. Ethereum launches go through Launch Party: 0.001 ETH launch fee + gas · your fee, fixed or upgradeable in public.",
    games: "Built on Gamba's open protocol; Gamba doesn't run or endorse tweetpad. Real plays: SOL, 18+, only where legal.",
    profile: "Demo numbers. Robinhood Chain: 1% creator fee, 10% of the fee to Launch Party SDK; holders earn ETH rewards.",
    bordrless: "Demo coins. Bordrless's sphere marks its channel; Bordrless doesn't run or endorse tweetpad.",
    more: "Skins are saved in your browser. Wii is the default for new visitors.",
    end: "tweetpad.io · demo coins and numbers throughout · not financial advice.",
  },
} as const;

/* =========================================================================================
 * Film 17: "The new way to shill a token." (TweetpadShill)
 * The old way (a typed-out shill: the CA, a chart link, a swap link; then the reader's copy, paste and tab maze) against the new:
 * one tweetpad link (/<chain>/<address>, api/t.js) that plays as the token's own card and trades from the post. Then the same
 * link on all five chains, and how to do it in three steps. 1160 f = 38.7 s.
 * ========================================================================================= */
export const SHILL = {
  hook: { from: 0, dur: 75 },     // ETH Guy and Agent Inu: "Shilling a token on X?"
  old: { from: 75, dur: 270 },    // ETH Guy types it out, posts it; then the reader's four tabs
  neu: { from: 345, dur: 240 },   // Agent Inu drops one link; the card plays; Open to trade; bought
  chains: { from: 585, dur: 230 },// the same post on Solana, Robinhood Chain, BNB Chain, Base, Ethereum
  how: { from: 815, dur: 210 },   // 1 copy the address · 2 post tweetpad.io/t/<address> · 3 anyone trades it from the post
  end: { from: 1025, dur: 150 },  // "The first launchpad inside an @X post.", the cast in the corners
} as const;
export const SHILL_TOTAL = SHILL.end.from + SHILL.end.dur; // 1175 f = 39.2 s

export const SHILL_COPY = {
  hook: { head: "Shilling a token on X?", head2: "There's a better way." },
  old: { tag: "THE OLD WAY", head: "A wall of text.", head2: "Then four tabs to buy." },
  oldSteps: ["Copy the CA", "Open the chart", "Find a DEX, connect", "Paste the CA, swap"],
  neu: { tag: "THE NEW WAY", head: "Drop one link.", head2: "It trades right in the post." },
  chains: { tag: "ANY TOKEN", head: "Five chains. One link." },
  how: { tag: "HOW TO", head: "Three steps.", head2: "No wall of text." },
  steps: [
    ["1", "Copy any token's address", "Solana or EVM: tweetpad finds its chain."],
    ["2", "Post it as tweetpad.io/t/…", "tweetpad.io/t/ + the address becomes the token's own card."],
    ["3", "Anyone can trade it", "Chart, buy and sell, right from the post."],
  ],
  end: { tagline: "The first launchpad inside an @X post.", tagline2: "Shill any token with one link." },
  fine: {
    old: "Illustration. Demo token and links.",
    neu: "Demo token and numbers. The link plays as its own X card; trades open in a tweetpad window · tweetpad takes nothing.",
    chains: "Demo tokens and numbers. Jupiter on Solana, KyberSwap on the EVM chains · tweetpad takes nothing · network fees apply.",
    how: "Any token with a market on these chains. Not financial advice.",
    end: "tweetpad.io · demo tokens and numbers throughout · not financial advice.",
  },
} as const;
