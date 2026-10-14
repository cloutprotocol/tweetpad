---
name: tweetpad-remotion-promo
description: Use when making or editing tweetpad promo videos in Remotion. That covers the 1080x1080 square film, new scenes, cutdowns, copy changes, re-skins (2012 or Tweetcraft) and the Robinhood Chain / Launch Party EVM launch scene. It holds the product facts you may and may not claim, the brand tokens and asset files, the scene-by-scene script with frame timings, render commands and a QA checklist. Read it before touching /Users/cloutcoin/GitHub/tweetpad/remotion/project.
---

# tweetpad promo video: Remotion skill

The project lives in `/Users/cloutcoin/GitHub/tweetpad/remotion/project/` (Remotion 4.0.534, React 19, TypeScript).
It rebuilds the tweetpad X player card UI in React/CSS from the shipped styles. It contains no screenshots
of the live app and no iframes. The tweetpad app (`embed.html`, `assets/`, `api/` at the repo root `/Users/cloutcoin/GitHub/tweetpad/`) is **read-only reference**. Never edit it.

```
remotion/
  SKILL.md                 this file
  project/
    package.json           pinned deps; scripts: studio, typecheck, render, render:craft, stills, render:/stills: robinhood, howto, trade, multichain, welcome, panel, agents, winamp, ethereum, three, stonks, games, bordrless
    remotion.config.ts     jpeg q95, concurrency 4, REMOTION_CHROME override
    scripts/stills.mjs     bundle once, render many PNG stills
    scripts/export_wordmark.py  re-exports the wordmark PNGs from banner/banner.py (+ tp/pico.py)
    public/brand/          # icon, glyphs, wordmarks, token pfps, dex banners, card-preview.png, agent-inu.jpg, solana.svg, bnb.svg (the official mark, copied from assets/), base.svg, ethereum.svg (copied from assets/), ether-cat.svg (film 10's demo coin image, drawn for the film), moon-chip.svg (film 12's demo coin image, drawn for the film), pfp-cz.jpg, pfp-jesse.jpg (film 6 only)
    public/fonts/          Inter, Fredoka, Gelasio, Pixelify Sans, VT323, Doto (all OFL)
    public/stonk/          film 12 only: the xStock pair logos as Stonkfun serves them (TSLAx.jpg, NVDAx.jpg, SPYx.png …)
    public/games/          film 13 only: pumpordump.jpg, mines.jpg (the /games tiles) and gamba.svg (Gamba's shrimp mark), copied from assets/games/
    public/winamp/         film 9 only: space-debris.mp3 (40 s) + skin-01 … skin-10 player stills (275x348 logical at 4x)
    src/
      index.ts, Root.tsx   compositions TweetpadSquare (2012), TweetpadSquareCraft (Tweetcraft), TweetpadHowToLaunch, TweetpadRobinhoodUpdate, TweetpadTradeUpdate, TweetpadMultichainUpdate, TweetpadWelcomeBnbBase, TweetpadTradePanel, TweetpadAgentsTeaser, TweetpadWinamp, TweetpadEthereum, TweetpadThreeNew, TweetpadStonks, TweetpadGames
      Tweetpad.tsx         the film: Ground + 6 <Sequence>s
      timeline.ts          ALL copy + scene frame ranges + EVM_STATUS flag  <- edit copy here only
      brand/tokens.ts      BRAND palette, FONTS, SKIN_2012 / SKIN_CRAFT (copied from the app CSS)
      brand/fonts.ts       @remotion/fonts loader
      lib/motion.ts        ramp / inOut / pop / typed / glide / settle
      components/ui.tsx    AppFrame, AppHeader, Hud (+ chain switch: NETS_2 / NETS_4 / NETS_5, netXY, EVM_NETS), NetTip, NetNew, Panel, Btn, Seg, Input, Tag, WelcomeTweet, OfficialStrip, Toast
      components/LaunchForm.tsx  LaunchForm (solana | robinhood: EVM wallet line, ETH presets + estimate; jito: the "⚡ Bundle with Jito" row), NOTE_SOLANA / NOTE_EVM
      components/Views.tsx TokenList (badges, chain filter), CoinView (chart + trade slot + /c/ share box), TradeBox, JitoRow, ChainBadge, FeedView, DEMO_COINS
      components/Film.tsx  Ground, Caption, Fine, Cursor, cursorAt
      scenes/              Hook, Open, Solana, Tokens, Evm, End, layout.ts (APP rect, toFilm, CARD rect)
      howto/               film 2 (HowTo.tsx) + parts.tsx (camera / Stage, wallet menu + window, tab ring)
      update/              film 3, RobinhoodUpdate.tsx · film 4, TradeUpdate.tsx · film 5, MultichainUpdate.tsx · film 6, WelcomeBnbBase.tsx · film 7, TradePanel.tsx · film 8, AgentsTeaser.tsx · film 9, Winamp.tsx · film 10, EthereumUpdate.tsx · film 11, ThreeNew.tsx · film 12, Stonks.tsx · film 13, Games.tsx
  out/                     tweetpad-square.mp4 + stills/*.png
```

---

## 1. Product facts (verified in code, 2026-10-09)

**What tweetpad is.** It is an X player card dressed as the 2012 bird app, with an optional pixel-HUD skin. You expand
the post, connect a wallet, drop an image, pick a ticker and press Launch. The coin goes live and is listed on tweetpad
with its own chart, trades and share card, all inside the post. Routes: `/` is the landing page, which wraps the card
in an iframe. `/embed.html` is the X player card, the app itself. `/c/<contract>` is the per-coin card, which opens
straight to that coin. The live version is 0.1.0 and the license is MIT (github.com/cloutprotocol/tweetpad).

**Verbatim app copy you can use:**
- "Welcome to #tweetpad. Drop an image, pick a ticker, hit Launch, and your coin goes live without leaving the tweet. Such launch. Very wow." (welcome post, Agent Inu @tweetpad)
- "Launch a token without leaving the tweet." (landing tagline, About)
- "Made for the timeline" (About footer)
- "No app to install and no tab to open." (README)
- Skins: **2012**: "Blue bar, white cards, the old bird app" (Default). **Tweetcraft**: "Pixel HUD, night sky, hotbar".
- Tabs: Launch, Tokens, Feed (# icon only), More. Composer: "What's happening?", "$ Tag a coin", "Tweet". 140-character counters on the description, posts, feed and replies.
- Launch form: "PNG, JPG, GIF or WebP · up to 4 MB · drop or paste", "Dev buy", "optional · bought in the launch transaction", presets None / 0.1 / 0.5 / 1, "No dev buy: you launch holding none of your coin.", description prefilled "launched on tweetpad.io".
- Button states (tweetpad.js renderLaunch): "Connect wallet", "Add an image", "Add a name", "Ticker: 2–10 letters or numbers", "Launch $TICKER", "Launching…", "Launch another".
- Toast: "Token launched!" / "$TICKER is live on pump.fun".
- Fee line, Solana: **"Launches on pump.fun · 0 pad fee · network fees apply"**.
- Banner copy (brand files, not the app): "The whole launchpad, inside a tweet." · "Launch a coin without ever leaving X."

**Solana (shipped, live).** Launches on pump.fun. The pad charges no fee; network fees apply. Pair with SOL (the default) or any
tweetpad coin. The dev buy is optional. The server re-checks every launch on chain before it is listed.

**Robinhood Chain / EVM (shipped, live in the card).** Sources: `assets/tweetpad.js` (ROBINHOOD, connectEvm, renderEvmWallet, renderFeeBox, renderDevBuy, onLaunchEvm, renderCoinFees, evmProfileSection, claimEvmRewards), `api/evm-create.js`, `api/_evm.js`, `api/launches.js`.
- **Chain switch, two places, always in sync** (skin-2012.css `.net-switch`): (a) a dark recessed pill at the right end of the tab bar, opposite chat: the picked chain on the old blue gradient (`#4aa9e9`→`#2c8fd6`) with a white logo, the other logo grey (`NetPill`, centres in `NET_XY`); (b) a light segmented switch in the Launch header, right of "Launch" (`NetSeg`). Logos are one-colour masks: the Solana mark and the feather (`public/brand/robinhood.png`). Titles: "Launch on Solana (pump.fun)" / "Launch on Robinhood Chain".
- On Robinhood the "Pair SOL" chip is hidden and an EVM wallet line sits under the Launch head: "1 EVM wallet found" / "EVM wallet · 0x… · MetaMask · Disconnect" / "No EVM wallet here. Install MetaMask, Rabby or Phantom, or open tweetpad in your wallet’s browser." The header "Connect ▾" stays the Solana wallet.
- **Fees** (`api/_evm.js`): a flat **1% trading fee** on every coin for its life (`feeEndBps 100`). Launch Party takes 10% of each fee (0.1% of the trade); the creator splits the rest with holders (`holdersBps`, 10% steps), fixed at launch. Holders earn **ETH rewards**, claimed on the coin page.
- **Creator fees box** (above Dev buy): "Creator fees" · "1% of every trade, for the coin's life"; slider "Creator 70%" ━●━ "Holder rewards 30%"; "Each trade: **0.63% to you** · 0.27% to holders (ETH, claimed on the coin page) Fixed at launch."; "0.1% to Launch Party SDK ↗". At 0%: "Each trade: 0.9% to you Fixed at launch."
- Buttons: "Connect EVM wallet" → "Add an image" → "Add a name" → "Ticker: 2–10 letters or numbers" → "Launch $WOW on Robinhood" (" · buy 0.001 ETH") → "Launching…" → "Launch another". While it names a problem the button is grey.
- Dev buy presets None / 0.001 / 0.005 / 0.01 ETH (max 1). Estimate: "You get ≈ 989.0K $WOW · 0.10% of supply after the 1% fee, guarded at 99% when you sign" (1B × 0.99b / (1 + 0.99b), `evmEstimate`).
- Fee note, verbatim: **"Launches on Robinhood Chain · 1% trading fee · 0.0005 ETH launch fee + gas"**.
- Check lines (each `check()` replaces the pending one before it): "Uploading image and metadata to IPFS…" → "Image and metadata on IPFS" [JSON ↗] + "Building the Robinhood launch…" → "Transaction built and checked against the live launcher" + "Approve in MetaMask…" → "Confirming on Robinhood Chain…" [Tx ↗] → "$WOW is live on Robinhood Chain" [Explorer ↗]. Toasts: "Connected!" / "MetaMask · 0x…", "Token launched!" / "Share it: the link plays as its own card on X". Then the coin page opens by itself.
- Coin page: "Trade on Uniswap ↗", "Explorer ↗" (no LIVE/OFFLINE chip), the share box, "**1% trading fee** · creator 70% · holders 30%", "10% of the fee to Launch Party SDK ↗", and "YOUR HOLDER REWARDS · 0.00120 ETH · [Claim]" (`Rewards`). Token list row: "$WOW · now · Robinhood".
- Profile (no Solana wallet): "Connect a Solana wallet", then the feather + "Robinhood Chain", `0x… ⧉ ↗`, "CREATOR REWARDS · 0.00340 ETH · [Claim]", status "Approve claim 1 of 1 ($WOW) in MetaMask…" → "Confirming…" → "Rewards claimed to your wallet" [Tx ↗], toast "Rewards claimed!" / "Creator fees sent to 0x…", "Your Robinhood coins · 1" with "$WOW · now · 70% yours" (`RobinhoodProfile`).
- Chain id 4663, explorer robinhoodchain.blockscout.com. Launch Party's live solo launcher (gateway `createIn`, kind 1). The user pays the launch fee plus gas. The server dry-runs every launch before the wallet sees it; only launches built by tweetpad are listed.
- Not yet done (owner note): a real signed Robinhood launch end to end.

**Claim rules.**
| OK to say | Never say |
|---|---|
| Robinhood: "1% creator fee", "holders earn ETH rewards", "share fees with your holders", always with "10% of the fee to Launch Party SDK" in small type | any "0%", "zero" or "no" trading fee for Robinhood (it is 1% now); "reflections"; bare "zero fee", "free", "no fees", "gas-free" |
| always pair fee talk with small type: "network and launch fees apply" (EVM) / "network fees apply" (Solana) | any fee amount for the EVM launch fee outside the app's own fee note (shown verbatim inside the app UI only) |
| "built on Launch Party's solo launcher", "Launch Party v4 factory" (not "no-tax mode": the fee is 1%) | "custom launch", "upgradable/upgradeable hooks", "Uniswap v4 hook" for tweetpad's Robinhood / BNB / Base launches. Exception: film 10 (§16) names Ethereum's custom launch and its fixed fee hook, which shipped |
| "every launch is dry-run on chain before your wallet signs" | "safe", "audited", "guaranteed", "rug-proof", "vetted" |
| "new", "now on Robinhood Chain", "live on Robinhood Chain" (`EVM_STATUS = "live"`) | dates; "coming soon" (it shipped) |
| demo coin names (Such Launch $WOW etc.) with "—" where a market cap would be; reward amounts only as demo values (0.00120 / 0.00340 ETH) under a "Demo coin, demo amounts" fine line | any price, market cap, volume, % move, holder/user count, trade count, real reward amount |
| "Launch Party", "Robinhood Chain", "pump.fun", "X" **in words** | a partnership, endorsement or "official" claim with Robinhood, Launch Party, pump.fun or X; their logos, except the chain logos inside the in-app switch |
| the tweetpad # icon and wordmark | the Twitter bird (the shipped 2012 header uses it; the film replaces it with the # icon), the old Twitter wordmark, the X logo |
| $TP (ticker), TWEETPAD (token name), shortened official contract `BctF…EQDN` | full contract addresses in big type; any EVM contract address (use `0x…`) |

### EVM_STATUS
`EVM_STATUS = "live"` (2026-10-09). The square film's scene 5 now taps the feather in the tab bar and shows the shipped
form, check lines and fee note; its caption tag is "NEW" and the "coming soon" lines are gone. `ChainToggle` was removed.

---

## 2. Brand tokens

**Film palette (hash kit README, 2012 palette).** Primary `#1DA1F2` · light tint `#36D8FF` · ink `#14171A` · dark gray
`#657786` · light gray `#AAB8C2` · border `#E1E8ED` · background `#F5F8FA`. The # icon face gradient runs `#36D8FF` → `#1DA1F2`
and the glyph runs `#FFFFFF` → `#E1E8ED`.

**App palette (rebuilt UI only, from `skin-2012.css`).** bg `#e6e6e6`, cards `#fff` with `#c8c8c8` border and radius 5,
text `#333`, dim `#999`, accent/link `#0084b4`, primary button `#33bcef`→`#019ad2`, header bar `#63b8ee`→`#3c9ad9`→`#2b86cc`,
segmented-on `#2c8fd6`→`#4aa9e9`, tab bar `#3b3b3b`→`#0c0c0c`, ok `#2e9e4f`, bad `#d0343a`.
Tweetcraft (`tweetpad.css :root`): bg `#0b1210`, panel `rgba(30,56,64,.82)`, accent `#6fe7d8`, gold `#e8b64c`, ok `#7dff9a`,
pink `#ff74e6`, primary button `#6ad893`→`#3c9c60`. All of these are in `SKIN_2012` / `SKIN_CRAFT` in `brand/tokens.ts`.

**Fonts.** The shipped `embed.html` uses:
- 2012 skin: "Helvetica Neue", Helvetica, Arial for the UI; **Fredoka 600** for the header title "tweetpad" and the About name; **Georgia** for tweet/post text; Menlo for code chips.
- Tweetcraft: **Pixelify Sans** (`--px`) and **VT323** (`--mono`).

In the film, **Inter** stands in for Helvetica Neue (in the UI and the captions), **Gelasio** stands in for Georgia (it is metric-compatible),
and Fredoka, Pixelify Sans and VT323 match the app. **Doto** (Black) is loaded only for optional Tweetcraft-flavoured film
type. The app never uses it.

**Files in `public/brand/`.**
- `tweetpad-hash-{256,512,1024}.png`: the chrome-ring glossy slanted white # icon (transparent).
- `hash-{white,blue,ink}.png`: the # glyph alone.
- `wordmark-cyan-{800,1600}.png`: the bubbly lowercase wordmark with a cyan gradient, white outline and soft shadow. Use it on light or sky grounds.
- `wordmark-white-{800,1600}.png`: flat white, no outline. Use it on blue grounds. Regenerate both with `python3 scripts/export_wordmark.py`.
- `pfp-token-{blue,light}-1000.png` (the $TP token image) and `dex-banner-{blue,light}-1500x500.png`.
- `card-preview.png`: the real X card image (`src/preview.png`). It reads "Launchpad inside a tweet · tweetpad.io · zero pad fee".
- `agent-inu.jpg` (the welcome-post avatar, also used as the demo coin image) and `solana.svg`.

**Skins.** `<Tweetpad skin="2012" />` is the default. `skin="tweetcraft"` swaps every UI token to the pixel HUD and hides the
welcome post, as the app does. The `TweetpadSquareCraft` composition renders it. Film chrome (captions, end card) stays brand-blue in both.

---

## 3. Format

1080×1080, 30 fps, **1110 frames = 37.0 s**, H.264 MP4, no audio. The app renders at its own CSS px (460×520) inside
`AppFrame`, scaled ×1.55 to 713×806 at (183, 236). Captions sit in the top 230 px and fine print in the bottom 40 px.
Keep everything inside a 40 px safe margin.

---

## 4. Script, scene by scene

| # | Scene | Frames | Time | On-screen copy | Motion | Component / asset |
|---|---|---|---|---|---|---|
| 1 | Hook: a tweet in a feed | 0–119 (120) | 0:00–0:04 | **Launch a token / without leaving the tweet.** Post: Agent Inu @tweetpad "Launch a token without leaving the tweet. tweetpad.io" | The timeline scrolls up 520 px (glide, f0–55) and lands on the post. The player card's play button pops at f60, the cursor glides in and clicks at f92. Skeleton posts and the caption fade at f108–120. | `scenes/Hook.tsx`, `brand/card-preview.png`, neutral skeleton posts (no X chrome) |
| 2 | The card opens into the full launchpad | 120–269 (150) | 0:04–0:09 | **The whole launchpad, / inside a tweet.** sub: No app to install and no tab to open. | The card rect grows into the app rect (settle, 26 f) while card-preview.png crossfades out. The app scrolls 150 px through the $TP strip, the welcome post and the launch form. | `scenes/Open.tsx`, `AppFrame`, `OfficialStrip`, `WelcomeTweet`, `LaunchForm chain="solana"` |
| 3 | Solana launch flow | 270–509 (240) | 0:09–0:17 | **Drop an image. / Pick a ticker. Hit Launch.** In-app copy is verbatim (button problem states, "Launching…", toast "Token launched! $WOW is live on pump.fun"). Fine: "Demo launch. Launches on pump.fun · 0 pad fee · network fees apply" | Image drops at f24–36. "Such Launch" types at f48 and "WOW" at f100. Launch is clicked at f150, the toast rises at f192, the scene fades at f228–240. | `scenes/Solana.tsx`, `LaunchForm`, `Toast` |
| 4 | Tokens list, chart, feed | 510–689 (180) | 0:17–0:23 | **Tokens, charts and a feed. / Made for the timeline.** Fine: "Illustrative coins. No live market data shown." | List rows stagger in (f4–36) and the $WOW row is clicked at f50. The coin screen draws its candles at f60–100 and shows the `tweetpad.io/c/xxxx…` share box. The Feed tab is clicked at f114. "gm from inside the tweet #tweetpad" types with the 140 counter, a coin is tagged at f144, Tweet is clicked at f160 and the post drops in. | `scenes/Tokens.tsx`, `TokenList`, `CoinView`, `FeedView`, `DEMO_COINS` |
| 5 | Robinhood Chain (shipped) | 690–959 (270) | 0:23–0:32 | Tag **NEW** · **Launch on Robinhood Chain. / 1% creator fee.** Fact card: **1% creator fee** · Robinhood Chain · solo launch · Built on Launch Party's solo launcher · Share the fee: holders earn ETH rewards · Dry-run on chain before your wallet signs · Optional dev buy, up to 1 ETH · "1% trading fee · 10% of it to Launch Party SDK. Network and launch fees apply." Fine: "1% trading fee · 10% of it to Launch Party SDK · network and launch fees apply." | A hand pointer taps the feather in the tab bar at f44 (tooltip "Launch on Robinhood Chain") and the thumb slides. The pair chip goes, the EVM wallet line appears, units and presets become ETH and the note becomes `NOTE_EVM`. 0.001 ETH is picked at f90 (the estimate shows), Launch is clicked at f126 and the shipped check lines run. The app blurs at f186 and the fact card rises. | `scenes/Evm.tsx`, `LaunchForm chain="robinhood"`, `Hud` switch |
| 6 | End card | 960–1109 (150) | 0:32–0:37 | # icon · white wordmark · **Launch a token without leaving the tweet.** · `tweetpad.io` · `$TP`. Fine: "Solana: launches on pump.fun · 0 pad fee · network fees apply.  Robinhood Chain via Launch Party (coming soon): no trading fee · network and launch fees apply." | The ground turns blue (f954–970). The icon springs in, then the wordmark, tagline and pills follow. A faint # pattern drifts. | `scenes/End.tsx`, `tweetpad-hash-512.png`, `wordmark-white-1600.png` |

Every caption, fine-print line and fact lives in `src/timeline.ts` (`COPY`, `SCENES`, `EVM_STATUS`).

---

## 5. Render

```bash
cd /Users/cloutcoin/GitHub/tweetpad/remotion/project
npm ci                       # or npm i (Node 20)
npm run typecheck
npx remotion studio src/index.ts                                       # preview / scrub
npx remotion render src/index.ts TweetpadSquare ../out/tweetpad-square.mp4
npx remotion render src/index.ts TweetpadSquareCraft ../out/tweetpad-square-tweetcraft.mp4   # optional skin
node scripts/stills.mjs ../out/stills 70:hook 250:open 395:solana 600:tokens 920:evm 1080:end
# Remotion downloads its own headless Chrome on first run. To use a system Chrome instead:
REMOTION_CHROME=/usr/bin/google-chrome npx remotion render src/index.ts TweetpadSquare ../out/tweetpad-square.mp4
```
Props: `--props='{"skin":"tweetcraft"}'` works on either composition.

## 6. Adding or changing a scene

1. Add a range to `SCENES` in `timeline.ts` and shift the later `from`s. `TOTAL` follows the end card automatically. Put all new copy in `COPY`.
2. Create `src/scenes/MyScene.tsx`. Use `useCurrentFrame()`, which is local to the Sequence. Fade in over the first ~10 f and out over the last ~12 f with `ramp(..., settle)`.
3. For app UI, wrap content in `<AppFrame scale={APP.scale} tab=… connected>` inside a div at the `APP` rect (copy the wrapper from `Solana.tsx`). Build in app px. Use `toFilm(ax, ay)` for cursor targets and confirm them with a still.
4. Register it in `Tweetpad.tsx` as `<Sequence from durationInFrames name>`.
5. New UI pieces belong in `components/`. Take styles from `assets/skin-2012.css` / `assets/tweetpad.css`, never invent a look, and read colours from `useSkin()` so both skins work.
6. Run `npm run typecheck`, render stills of the new scene's key frames, then the full MP4.

## 7. QA checklist

- [ ] `npm run typecheck` is clean, and the full render finishes 1080×1080, 30 fps, 1110 f (37.0 s).
- [ ] No Twitter bird, no old Twitter wordmark and no X logo anywhere. The header uses the # icon. X appears only in words.
- [ ] No bare "zero fee", "free" or "no fees", and no 0% / zero trading fee for Robinhood. Every fee mention has "network fees apply" (Solana) or the Launch Party 10% line (Robinhood) in small type on the same frame.
- [ ] Robinhood is shown with the tab-bar switch and the shipped strings. No "coming soon".
- [ ] Launch Party is described only as the "v4 factory" or "solo launcher". There is no custom launch, hook or upgrade language, and no audit or safety claims. (Film 10 only: Ethereum's "custom launch" and "fixed fee hook", see §16.)
- [ ] No numbers except real parameters: 140 characters, 0–1 ETH dev buy, 1% trading fee and its splits, demo reward amounts, 0.1/0.5/1 SOL and 0.001/0.005/0.01 ETH presets, the app's own estimate and fee note, 4 MB. No prices, market caps, volumes, % moves or user counts. Market cap cells show "—".
- [ ] Demo coins are obviously demo (Such Launch $WOW and friends) and no real third-party coin appears. Addresses are `xxxx…`/`0x…`, except the shortened official `BctF…EQDN`.
- [ ] In-app strings match `embed.html` / `tweetpad.js` verbatim. The only film-made UI is the generic wallet window, the NEW tag over the switch and the pill styling of the switch.
- [ ] Fonts loaded (no Times/serif fallback in the UI). The wordmark is crisp and its edges aren't clipped.
- [ ] Captions sit inside the 40 px safe area. Fine print is readable at 1080 (≥17 px) and nothing overlaps the app frame.
- [ ] The cursor lands on its targets (check stills at each click frame).
- [ ] Nothing outside `remotion/` changed.

## 8. Film 2: `TweetpadHowToLaunch` ("How to launch a token on tweetpad")

**Purpose.** A step-by-step walkthrough of the shipped Solana launch inside the X player card, from the post in the feed to sharing the coin. 1080x1080, 30 fps, 1695 frames (56.5 s). It uses the 2012 skin; pass `skin: "tweetcraft"` as a prop to try the pixel skin (untuned).

**Solana only.** No EVM, Robinhood or Launch Party content appears anywhere in this film. Its end card shows only the app's own note: "Launches on pump.fun · 0 pad fee · network fees apply".

**Code.**
- `src/howto/HowTo.tsx`: the scenes.
- `src/howto/parts.tsx`: camera/zoom, step chip, wallet menu, generic wallet window, tab ring.
- Timing and copy: `HOWTO` / `HOWTO_COPY` in `src/timeline.ts`.
- Shared pieces: `LaunchForm` (with socials, the estimate override, check lines with link chips, rings), `CoinView`, `TokenList`, `Hook`, `End`.

**The flag.** `CLAIM_FIRST` in `src/timeline.ts`.
- `false` (default): the intro and tour line reads "The launchpad inside a tweet."
- `true`: it reads "The first launchpad inside a tweet."
- This "first" claim is unverified. Only the owner should flip it.
- The end-card tagline is always "Launch a token without leaving the tweet."

| # | Scene | Frames | Seconds | What happens (strings verbatim from embed.html / tweetpad.js) |
|---|---|---|---|---|
| 1 | Intro | 0–119 | 0.0–4.0 | A post in the feed with the player card. "How to launch a token / on tweetpad" + "The launchpad inside a tweet." |
| 2 | Open + tour | 120–329 | 4.0–11.0 | The card grows into the app. The cursor rings Launch, Tokens, Feed and More, each with its tooltip ("Launch a token", "Tokens launched here", "Feed: what's happening on tweetpad", "More: profile, games, debug"). |
| 3 | Step 1 Connect | 330–524 | 11.0–17.5 | Click "Connect wallet". The menu opens: "Connect a wallet", Detected: Phantom DETECTED, More wallets: Solflare / Backpack INSTALL ↗, "mainnet · top-level", "Wallet missing? Popup". Next comes a generic (unbranded) wallet window, then the toast "Connected!" / "Phantom · xxxx…xxxx". The button becomes "Add an image". |
| 4 | Step 2 Image | 525–644 | 17.5–21.5 | A file is dragged into the drop zone ("PNG, JPG, GIF or WebP · up to 4 MB · drop or paste"). The button becomes "Add a name". |
| 5 | Step 3 Name + ticker | 645–794 | 21.5–26.5 | Type "Such Launch" and "WOW". The button runs "Add a name" → "Ticker: 2–10 letters or numbers" → "Launch $WOW". |
| 6 | Step 4 Description | 795–914 | 26.5–30.5 | The description field (140 max, prefilled "launched on tweetpad.io", counter 117 → 93). |
| 7 | Step 5 Socials | 915–1049 | 30.5–35.0 | "+ Social links (optional)" opens X / TG / WEB ("@handle or x.com link", "@group or t.me link", "yoursite.com"). Type into X; the count badge shows 1. |
| 8 | Step 6 Dev buy | 1050–1169 | 35.0–39.0 | Presets None / 0.1 / 0.5 / 1, "optional · bought in the launch transaction". Tap 0.1, which shows "Buying 0.1 SOL of $WOW at launch." (the app's no-estimate string, so no numbers are invented) and the button "Launch $WOW · buy 0.1 SOL". |
| 9 | Step 7 Launch | 1170–1424 | 39.0–47.5 | "Launching…". Check lines appear in order: "Uploading image and metadata to IPFS…", "Image and metadata on IPFS" [JSON ↗], "Building the pump.fun transaction…", "Transaction built · mint xxxx…xxxx", "Approve in Phantom…". Callout: simulated before you sign. Then the wallet window (Approve), "Signed by Phantom and the new mint", "Sending to Solana…", "Confirming…" [Tx ↗], "Confirmed on mainnet" [Tx ↗], "$WOW is live" [pump.fun ↗]. The toast reads "Token launched!" / "$WOW is live on pump.fun" and the button becomes "Launch another". |
| 10 | Step 8 Share | 1425–1574 | 47.5–52.5 | The coin page (opened automatically by `openCoin`): chart, LIVE, "Trade on pump.fun ↗", the share box `tweetpad.io/c/xxxx…` with Copy and Post on X, and a `tweetpad.io/c/<contract>` pill. Click Tokens; $WOW sits at the top, "now". |
| 11 | End | 1575–1694 | 52.5–56.5 | # icon, wordmark, "Launch a token without leaving the tweet.", tweetpad.io, $TP, and "Launches on pump.fun · 0 pad fee · network fees apply". |

**Rules specific to this film.**
- Demo coin only: no market caps, prices, volumes or users. The Tokens list shows "—".
- Addresses are always `xxxx…xxxx`.
- The wallet window is generic and says "Illustration. Your wallet's own window looks different."
- A permanent fine line reads: "Demo coin. Launches create real tokens on mainnet and cost real SOL."
- The simulation claim is backed by `api/create.js`, which calls `simulateTransaction` before returning the transaction, so "a build that would fail never reaches the wallet". Drop the claim if that code changes.

**Render.**
- `npm run render:howto` writes `../out/tweetpad-how-to-launch.mp4`.
- `npm run stills:howto` writes `TweetpadHowToLaunch-f*.png` files. Rename them to `howto-<frame>-<name>.png`.

**Tuning.**
- The click targets are app-px constants (`T`, `TAB_RECT`) at the top of `HowTo.tsx`.
- Header tab positions differ between the connected and not-connected states (the avatar is narrower than "Connect ▾").
- The camera keeps `z = 1` at both ends of every step, so cuts between steps don't jump.

## 9. Film 3: `TweetpadRobinhoodUpdate` ("Now on Robinhood Chain")

**Purpose.** The feature-update film for Robinhood Chain launches. 1080x1080, 30 fps, 1335 frames (44.5 s), 2012 skin.
It opens on a **static** title card (frame 0 is the thumbnail), then keeps TweetpadSquare's look (centred captions, the app at ×1.55)
with the how-to's camera (`Stage`, `camMap`) for close-ups. Every scene sets its own small type (`ROBINHOOD_COPY.fine`).

**Owner-approved for this film only:** the tweetpad # × Robinhood feather logo lockup on the title card, and "The first launchpad inside a tweet." (the `CLAIM_FIRST` claim). Don't reuse them elsewhere without asking.

**Code.** `src/update/RobinhoodUpdate.tsx`. Timing and copy: `ROBINHOOD` / `ROBINHOOD_COPY` in `src/timeline.ts`. Click targets: `T` (app px; each comment names the scroll it assumes: `FS_RH`, `FS_BTN`, `FS_BUY`, `FS_FEES`) and `NET_XY`.

| # | Scene | Frames | What happens |
|---|---|---|---|
| 0 | Title (static) | 0–74 | Blue ground with a still # pattern. tweetpad # icon × white feather (logos, no words), "The first launchpad inside a tweet." Nothing moves until it fades. |
| 1 | Hook | 75–164 | Tag NEW · "Now on / Robinhood Chain." The post in a feed. |
| 2 | The switch | 165–284 | The card opens. The camera lands at ×3 on the tab-bar pill; a NEW tag pops over the feather; a hand pointer hovers (tooltip) and taps; the blue slides. Pulls back: header switch in sync, pair chip gone, Creator fees box, ETH presets, "Connect EVM wallet". "One tap to switch chains." |
| 3 | Connect | 285–434 | Generic wallet window: "Connect to tweetpad.io?" → "Add Robinhood Chain?" → "Connected!"; scroll up to the wallet line. "Connect an EVM wallet." |
| 4 | Fill | 435–584 | Image, "Such Launch" / "WOW", 0.001 ETH, the 989.0K estimate. "Drop an image. / Pick a ticker." |
| 5 | Creator fees | 585–734 | Zoom on the box; the hand drags Holder rewards 0% → 30% (0.63% / 0.27%). "Share fees with your holders." / "A 1% creator fee. Holders earn ETH rewards." Fine: "1% trading fee · 10% of it to Launch Party SDK · holders claim in ETH." |
| 6 | Launch | 735–944 | Check lines, approve window, "$WOW is live on Robinhood Chain", "Token launched!". "Hit Launch. / Checked on chain before you sign." |
| 7 | Coin page | 945–1094 | Links, share box, the fee split + "YOUR HOLDER REWARDS 0.00120 ETH [Claim]", then Tokens ("· Robinhood"). "Share it. / It plays as its own card on X." |
| 8 | Profile claim | 1095–1244 | "CREATOR REWARDS 0.00340 ETH" → Claim → approve → "Rewards claimed to your wallet" [Tx ↗], "Rewards claimed!", 0.00000 ETH. "Claim your fees / from your profile." |
| 9 | End | 1245–1334 | # icon, wordmark, tagline, tweetpad.io, $TP, both chains' fee lines. |

**Render.** `npm run render:robinhood` → `../out/tweetpad-robinhood-update.mp4`. `npm run stills:robinhood` writes
`TweetpadRobinhoodUpdate-f*.png`; rename them to `rh-<frame>-<name>.png`.

**Notes.** The how-to film's Hud also shows the switch now (Solana picked); its MP4 was rendered before and is unchanged.
When the form changes height, re-measure the click targets from stills (the fee box moved the button below the fold once already).

## 10. Film 4: `TweetpadTradeUpdate` ("Now: buy and sell inside the tweet.")

**Purpose.** The feature-update film for trading on the coin page and Jito bundles. 1080x1080, 30 fps, 764 frames (25.5 s), 2012 skin.
Same look as film 3 (centred captions, the app at ×1.55, `Stage`/`camMap` close-ups); every scene sets its own small type (`TRADE_COPY.fine`).

**What it may claim (verified in `assets/tweetpad.js` renderTrade / runTrade / sendTx and `embed.html` #jito-row).**
- Trade box under the chart: Buy | Sell (green / red), "Slippage 5%" (cycles 1/3/5/10/20), presets 0.05 · 0.1 · 0.5 · 1 SOL, Sell 25% · 50% · 100%, Robinhood 0.001 · 0.005 · 0.01 · 0.05 ETH.
- Quote line: "Quoting…" → "≈ 2.7M $JACK · min 2.6M" (buy 0.1 SOL); Sell: "You hold 2.7M $JACK" → 100% → "≈ 0.097 SOL · min 0.0921"; idle "pump.fun’s fees only · tweetpad takes nothing" / Robinhood "1% coin fee, to its creator and holders · tweetpad takes nothing". The 2.7M and 0.097 SOL figures were taken by the owner from the live pump.fun curve; each "min" is the app's own fmtQty(out × 0.95) at Slippage 5% (so "0.0921", not "0.092"). Invent no others.
- Statuses: "Approve in Phantom…" → "Sending as a Jito bundle…" → "Confirming…" [Tx ↗] → "Bought ≈ 2.7M $JACK" / "Sold for ≈ 0.097 SOL" [Tx ↗]; toasts "Bought $JACK!" / "Sold $JACK". After a sell the box shows "You hold 0 $JACK" with the % chips disabled (the film skips loadHolding's 1.5 s re-read delay).
- Jito: "⚡ Jito bundle" + "+0.0001 SOL tip · first in its block, private" (trade box), "⚡ Bundle with Jito" + "+0.0001 SOL tip · lands first in its block, out of the public mempool" (launch, checked by default). Launch check lines: … "Signed by Phantom and the new mint" → "Sending as a Jito bundle…" → "Confirming…" → "Confirmed on mainnet".
- tweetpad takes no fee on trades; the wallet signs and pays. Solana trades: pump.fun's SDK on the curve (Jupiter after graduation, no Jito there). Robinhood: Uniswap v4 pool, ETH.
- **Never:** multi-wallet bundles or "bundle supply" (it is ONE wallet bundling its own create + dev buy), speed numbers, guaranteed first-in-block, "MEV-proof", invented quotes or sell proceeds.

**Code.** `src/update/TradeUpdate.tsx`. Timing and copy: `TRADE` / `TRADE_COPY` in `src/timeline.ts`. Click targets: `T` (app px at `FS_TRADE` / `FS_JITO`). Cameras: `CAM_TRADE` (trade box close-up), `CAM_WIDE` (keeps the toast in frame).
New component props (all optional, films 1–3 unchanged): `TokenList badges filter`, `CoinImg badge badgeLeft`, `CoinView coin badge trade`, `LaunchForm jito` (+ ring `"jito"`), `End tagline2`; new `TradeBox` (+ `chipsDisabled`), `JitoRow`, `ChainBadge` in `Views.tsx`.

| # | Scene | Frames | What happens |
|---|---|---|---|
| 1 | Hook | 0–89 | Tag NEW · "Now: buy and sell / inside the tweet." The post in a feed. |
| 2 | Tokens | 90–177 | The card grows into the Tokens tab: chain badges on every image, filter chips All 6 · [Solana] 4 · [feather] 2. Tap $JACK. "Every coin wears its chain." |
| 3 | Buy | 178–361 | Coin page; camera pushes into the trade box. Tap 0.1 → "Quoting…" → quote. Buy → Phantom approve window → "Sending as a Jito bundle…" → "Confirming…" → green "Bought ≈ 2.7M $JACK Tx ↗", camera eases out, toast "Bought $JACK!". Captions "Tap an amount. / Hit Buy." then "Sent as a Jito bundle." |
| 4 | Sell | 362–517 | Sell tab (red), "You hold 2.7M $JACK", 100% → 2.7M, "Quoting…" → "≈ 0.097 SOL · min 0.0921", red "Sell $JACK" → Phantom approve → "Sending as a Jito bundle…" → "Confirming…" → green "Sold for ≈ 0.097 SOL Tx ↗", camera eases out, toast "Sold $JACK", "You hold 0 $JACK". "Selling is the same." |
| 5 | Robinhood coin | 518–577 | $SKY: ETH presets, no Jito row, the 1%-coin-fee idle line, "Connect EVM wallet to trade". Fine has the Launch Party 10%. |
| 6 | Bundled launch | 578–673 | Launch form, ring on "⚡ Bundle with Jito", Launch → "Sending as a Jito bundle…" → "Confirmed on mainnet". "Launch as a bundle." |
| 7 | End | 674–763 | # icon, wordmark, "Launch, bundle, buy and sell. / Without leaving the tweet.", tweetpad.io, $TP, both chains' fee lines. |

**Render.** `npm run render:trade` → `../out/tweetpad-trade-update.mp4`. `npm run stills:trade` writes `TweetpadTradeUpdate-f*.png`; rename them to `trade-<frame>-<name>.png`.

## 11. Film 5: `TweetpadMultichainUpdate` ("Now on BNB Chain and Base.")

**Purpose.** The feature-update film for BNB Chain and Base launches and trading (shipped, live). 1080x1080, 30 fps, 745 frames (24.8 s), 2012 skin.
Same look as films 3–4. Every scene sets its own small type (`MULTI_COPY.fine`); every EVM fee mention carries "10% of it to Launch Party SDK".

**What it may claim (verified in `embed.html` .net-switch / .chain-filter, `assets/tweetpad.js` EVM_NETS, renderLaunch, renderDevBuy, renderFeeBox, onLaunchEvm, renderCoinHead, renderCoinFees, renderTrade, `assets/tweetpad.css` .chain-badge).**
- The switch has four logos, Solana · feather · BNB diamond (`public/brand/bnb.svg`) · Base square (`public/brand/base.svg`), in the tab bar and the Launch header (`nets={NETS_4}`; tooltips "Launch on BNB Chain" / "Launch on Base"). The Pair chip hides on EVM chains.
- EVM_NETS: BNB Chain is BNB, presets None · 0.005 · 0.01 · 0.05, trade presets 0.005 · 0.01 · 0.05 · 0.1, opening valuation 3.5 BNB. Base is ETH, None · 0.001 · 0.005 · 0.01, trade presets 0.001 · 0.005 · 0.01 · 0.05, valuation 1.3 ETH. Robinhood is unchanged.
- Notes: "Launches on BNB Chain · 1% trading fee · 0.0005 BNB launch fee + gas" and "Launches on Base · 1% trading fee · 0.0005 ETH launch fee + gas". Button: "Launch $PAWS on BNB · buy 0.05 BNB". Estimate at 0.05 BNB: "You get ≈ 13.9M $PAWS · 1.39% of supply after the 1% fee, guarded at 99% when you sign" (`evmEstimate(b, fdv)`). Fee box: "(BNB, claimed on the coin page)".
- Check lines: "Uploading image and metadata to IPFS…" → "Image and metadata on IPFS" [JSON ↗] + "Building the BNB Chain launch…" → "Transaction built and checked against the live launcher" + "Approve in MetaMask…" → "Confirming on BNB Chain…" [Tx ↗] → "$PAWS is live on BNB Chain" [Explorer ↗]. Toast: "Token launched!".
- Badges: BNB is a dark mark on #f0b90b, Base a white square on #0000ff. Filter chips: All · Solana · Robinhood · BNB · Base, with counts (an empty count is hidden, as in renderTokens). The coin page line reads "[logo] BNB Chain · now · 0xxx…xxxx ⧉", with the "Uniswap ↗" / "Explorer ↗" chips.
- The trade box on BNB / Base is idle: "1% coin fee, to its creator and holders · tweetpad takes nothing" and a disabled "Buy $PAWS". Holder rewards show "0.00000 BNB" with a disabled Claim.
- One EVM wallet works on all three chains. The same Launch Party launcher runs on each. tweetpad takes no fee on trades. The wallet is switched to the chain automatically (ensureChain).
- **Never:** that BNB or Base coins already exist on tweetpad (the list holds only $PAWS, the coin this film launches; Base's $BLUE appears only on its own demo page), quoted trade figures on BNB / Base, speed or cost-savings claims, or a real 0x address (use `0xxx…xxxx`).

**Code.** `src/update/MultichainUpdate.tsx`. Timing and copy are `MULTI` / `MULTI_COPY` in `src/timeline.ts`. Click targets are in `T`, and the pill centres come from `netXY(net, NETS_4)`. It reuses film 3's `EvmWalletWindow` (now exported, with a `chain` prop).
Generalised components; the defaults keep films 1–4 as rendered:
- `Net` now covers 4 chains, with `NETS_2` / `NETS_4`, and `EVM_NETS` lives in `ui.tsx`.
- `AppFrame` / `Hud` / `NetSeg` / `LaunchForm` take `nets`, and the pill's `netT` is an index.
- `LaunchForm` reads the unit, presets, note and estimate per chain.
- `DemoCoin.chain` and `chainOf`, `ChainBadge chain`, `TokenList filterChains filterPressed` (the filter now narrows the rows).
- `CoinView chain="bnb"|"base"` (the shipped head line and chips) plus `rewardsClaimable`, and `TradeBox chain` for any EVM chain.

| # | Scene | Frames | What happens |
|---|---|---|---|
| 1 | Hook | 0–83 | NEW tag, "Now on BNB Chain / and Base.", the post in a feed. |
| 2 | Switch | 84–213 | The card opens on Launch, scrolled to the dev buy. A hand taps the tab-bar pill: Robinhood → BNB → Base → BNB (each with its tooltip). The unit, presets and note change each time, and the fee box appears. "Four chains, one switch." |
| 3 | Fill | 214–318 | BNB: the image drops, "Diamond Paws" / "PAWS" are typed, 0.05 BNB is tapped and the 13.9M estimate shows. "Same wallet, same launcher." |
| 4 | Launch | 319–438 | The check lines run, the MetaMask approve window says "BNB Chain", then "$PAWS is live on BNB Chain" [Explorer ↗] and the "Token launched!" toast. "Hit Launch. / Live on BNB Chain." |
| 5 | Tokens | 439–528 | Mixed badges and the 5-chip filter (All 6 · Solana 4 · Robinhood 1 · BNB 1 · Base). Tapping the BNB chip leaves only $PAWS, which is then tapped. "Every chain in one list." |
| 6 | BNB coin | 529–606 | Yellow badge and "BNB Chain · now · 0xxx…xxxx", then the camera pushes into the idle BNB trade box. "Trade it in the tweet." |
| 7 | Base coin | 607–660 | $BLUE: blue badge, "Base", the ETH trade box idle. "Base works the same." |
| 8 | End | 661–744 | "Every chain. One tweet. / Solana · Robinhood · BNB · Base", tweetpad.io, $TP, fee lines for all four chains. |

**Render.** `npm run render:multichain` writes `../out/tweetpad-multichain-update.mp4`. `npm run stills:multichain` writes `TweetpadMultichainUpdate-f*.png`; rename them to `multi-<frame>-<name>.png`.

## 12. Film 6: `TweetpadWelcomeBnbBase` (the BNB Chain + Base announcement)

**Purpose.** A tight announcement, not a walkthrough: 1080x1080, 30 fps, 570 frames (19.0 s), 2012 skin. Each thing tweetpad does
is shown **once**. Don't re-explain anything films 4–5 already walk through. Never overwrite older MP4s, and never write to `out/archive/`.

**FRAMING RULE (real people: @cz_binance, @jessepollak).**
- They are WELCOMED by tweetpad and are never shown as authors. Both posts are from Agent Inu @tweetpad and mention them.
- Their pfps (`public/brand/pfp-cz.jpg`, and `pfp-jesse.jpg` drawn with `imageRendering: "pixelated"`) appear only as mention chips, each with its chain badge in the corner like a coin image: BNB (yellow, white mark) and Base (blue).
- Never: quotes, replies, likes or posts attributed to them, invented verification checks, or "joined", "partnered" or "backed by" wording.
- The welcome scene's small type says: "A welcome from @tweetpad. Mentions only: no affiliation or endorsement implied." The end card only says "cc @cz_binance @jessepollak".

**Code.** `src/update/WelcomeBnbBase.tsx`. Timing and copy are `WELCOME` / `WELCOME_BEATS` / `WELCOME_COPY` in `src/timeline.ts`.
Shared additions are all off by default, so films 1–5 are unchanged:
- `BadgeMarkCtx` sets per-film badge mark colours. Film 6 sets `{ bnb: "#fff" }`, the app's current `.chain-badge.bnb`.
- `ChainBadge diam` sets an explicit badge size.
- `End row cc` adds a line under the tagline and a small line under the pills.
- `public/brand/bnb.svg` is now the official BNB mark. Films 4–5 pick it up if they are re-rendered (only the logo's pixels differ).

| # | Scene | Frames | What happens |
|---|---|---|---|
| 1 | Now live | 0–89 | Pure white. # icon + cyan wordmark and a huge "Now live" are already up at frame 0 (the thumbnail) and settle. Then Solana · Robinhood · BNB Chain · Base pop in as logo discs with names, and "tweetpad.io" sits at the bottom. |
| 2 | Welcome | 90–269 | The @cz_binance post rises with its mention chip ("Welcome, BNB Chain."). At +84 f it moves up and the @jessepollak post stacks under it ("Welcome, Base."). |
| 3 | Montage | 270–479 | Headline "Launch, bundle, trade, earn. / All in one tweet." over five 42 f beats, each with a numbered label and its own small type: 1 Pick a chain (one tap Solana → BNB, the form follows) · 2 Launch ("$PAWS is live on BNB Chain", toast) · 3 Bundle with Jito (the launch row, ringed) · 4 Buy and sell ($JACK: the 2.7M quote → Sell → 100% → "≈ 0.097 SOL · min 0.0921") · 5 Creator and holder fees (drag holders 0 → 30%, BNB). |
| 4 | End | 480–569 | "tweetpad: the only launchpad you need.", the four chain logos, tweetpad.io, $TP, "cc @cz_binance @jessepollak", fee lines for all four chains. |

**Render.** `npm run render:welcome` writes `../out/tweetpad-welcome-bnb-base.mp4`. `npm run stills:welcome` writes `TweetpadWelcomeBnbBase-f*.png`; rename them to `welcome-<frame>-<name>.png`.

## 13. Film 7: `TweetpadTradePanel` ("The trading terminal inside a tweet.")

**Purpose.** A flashy, high-end promo for trading + Jito bundles: 1080x1080, 30 fps, 600 frames (20.0 s), 2012 skin. Each feature gets one beat; nothing repeats from films 4–6.

**Look.**
- **Background:** a deep-navy field of 2012-blue # glyphs (#1d6aa5 / #2c8fd6 / #4aa9e9 / #9fdcff). It has three parallax layers drifting diagonally (far small glyphs, mid glowing glyphs, near blurred `hash-blue.png` bokeh), a centre glow, scanlines and a vignette. A dark radial "calm" sits behind the UI so it stays legible.
- **Centre:** the $JACK coin page in a slow 3D orbit, built with CSS `perspective` / `translateZ` / `rotate` and no WebGL, so the UI stays sharp.
- **Panels:** six parts lift off the card as glassy panels (white glass, thin #9fdcff rim, blue glow, deep shadow): the chart, recent trades, trade controls, quote + balance, the Jito speed picker, and button + status. While they float, the card recedes, darkens and blurs, and its own copies of those parts fade out (`TradeBox ghost`). The focused panel comes forward and the rest drop back and darken (they stay solid; translucent stacks looked muddy). At the end everything snaps back and fades into the card.
- Taps are blue ripples drawn inside the panel; the buy is triggered by a floating "Enter ⏎" keycap ("Enter key trades").

**Shipped UI shown (assets/tweetpad.js renderTrade, jitoSpeedPicker / JITO_SPEEDS, runTrade, renderTrades; skin-2012.css "trade extras, 2012 style").**
- Presets 0.05 · 0.1 · 0.5 · Max, with Sell chips 25% · 50% · 100%.
- Quote "≈ 2.7M $JACK $11.4 · min 2.6M". The numbers tick up as the quote lands.
- Balance line "Balance 1.2 SOL · $148" / "You hold 2.7M $JACK · $11.4".
- Jito row "⚡ Jito bundle" [Fast · Turbo · Ultra] "+0.0005 SOL tip · first in its block, private" (Fast is +0.0001, Turbo +0.0005, Ultra +0.001).
- Statuses "Approve in Phantom…" → "Sending as a Jito bundle (Turbo)…" → "Confirming… Tx ↗" → "Bought ≈ 2.7M $JACK Tx ↗", with toast "Bought $JACK!". Your trade then slides onto the top of the trades list as "BUY $11.4 xxxx…xxxx 1s"; the other rows show the app's "—".
- Sell: "≈ 0.097 SOL · min 0.0921", red "Sell $JACK", "Approve in Phantom…".
- **Figures:** 0.1 SOL → ≈ 2.7M $JACK (≈ $11.4) and 2.7M → ≈ 0.097 SOL are owner-supplied from the live curve. The 1.2 SOL / $148 balance is a demo. The sell quote shows no $ value, because that would be a derived figure. Never: speed numbers, "MEV-proof", or invented trade sizes in the list.

**Code.** `src/update/TradePanel.tsx`. Timing and copy are `PANEL` / `PANEL_T` (terminal-local event frames) / `PANEL_COPY` in `src/timeline.ts`.
- `TradeBox` is now built from exported parts (`TradeTop`, `TradeAmountRow`, `TradeQuote`, `TradeBal`, `JitoRow`, `TradeAction`) so each can be a panel.
- New optional props: `chips`, `bal`, `jitoSpeed`, `ghost`, `est.usd` / `est.gap`, `JitoRow speed`, plus `JitoSpeedPicker`.
- With none of these, films 4–6 render byte-identically (checked by pixel diff).
- Film 6's `ChainDisc` / `ChainRow` are exported for the end card.

**Studio.**
- Each scene and caption is a named `<Sequence>`.
- The headline, captions, end-card lines, the three # layers and the 3D rig are `Interactive.Div`s with inline `interpolate()` styles (`translate`, `rotate`, `scale`, `opacity`), so they can be edited in Studio Visual Mode.
- Panel slots are literal props on each `<FloatPanel>` (`home`, `slot = [x, y, z, rotateY, scale]`, `focus` windows).

| # | Scene | Frames | What happens |
|---|---|---|---|
| 1 | Intro | 0–77 | # field + # icon + "The trading terminal / inside a tweet." (up at frame 0, the thumbnail). |
| 2 | Fly-in + explode | 70–119 | The card flies in from deep z with a 32° orbit; at 100 the six panels spring off it in 3D. |
| 3 | Quote | ~130–219 | "Tap an amount.": tap 0.1 → "Quoting…" → the quote ticks to 2.7M / $11.4 / 2.6M; balance 1.2 SOL · $148. |
| 4 | Jito speed | ~206–274 | "Pick your Jito speed.": tap Turbo, the tip becomes +0.0005 SOL. |
| 5 | Buy | ~261–374 | "Hit Enter. Sent as a bundle.": the Enter keycap → Approve in Phantom… → Sending as a Jito bundle (Turbo)… → Confirming… → Bought ≈ 2.7M $JACK; the "Bought $JACK!" toast takes the headline slot; your BUY row slides into the trades. |
| 6 | Sell | 365–444 | "Sell it back.": Sell tab → "You hold 2.7M $JACK · $11.4" → 100% → "≈ 0.097 SOL · min 0.0921" → red Sell pressed. |
| 7 | Snap back | 445–509 | The panels fly home and fade into the card; the card flies off. |
| 8 | End | 505–599 | # icon, "Launch. Bundle. Trade. / Inside the tweet.", tweetpad.io, the four chain logos, fee small print for both chain families. |

**Render.** `npm run render:panel` writes `../out/tweetpad-trade-panel.mp4`. `npm run stills:panel` writes `TweetpadTradePanel-f*.png`; rename them to `panel-<frame>-<name>.png`.
Chrome rasterises 3D-transformed layers a touch softer than flat ones. Keep panel text at least ~13 app px × scale 1.6 so it stays crisp.

## 14. Film 8: `TweetpadAgentsTeaser` ("Agents, coming soon, powered by Grok")

**Purpose.** A teaser for agents: 1080x1080, 30 fps, 635 frames (21.2 s). The whole film uses the **Lights out** look (assets/skin-lights.css "Lights out tuning" and the "Agents (coming soon)" block in assets/tweetpad.css): pure black, hairlines #2f3336, text #e7e9ea / #71767b, accent #1d9bf0, green #00ba7c, flat pills (primary #eff3f4 with #0f1419 text), Inter, no gradients or text shadows.

**CLAIM RULES (agents).**
- **Coming soon only.** Never show agents as live or existing today.
  - The agent card carries a "PREVIEW · COMING SOON" label over it, and its own footer says "Preview · demo activity".
  - The small print says "Preview with demo activity. Agents aren't live yet."
  - The end card uses the app's note: "Not live yet. Grok is xAI's model; tweetpad isn't affiliated with xAI or X."
- **Grok in text only.** "Powered by Grok" / "runs on Grok" are fine. Never use the X logo, xAI or Grok logos or wordmarks, and never imply a partnership or endorsement.
- **Agents read as agents.** The skill panel quotes "You are an agent, not a person, and you say so if anyone asks."
- **No price predictions.** The log's `chart($AI, 1h) → +12.4% · buys 38 / sells 11` is the app's own AGENT_DEMO demo line, shown under the Preview / demo labels. Drop it if any % move is unwanted.
- **Accounts and addresses.** The official account is @tweetpad_io. The agent.json snippet leaves out the coin address that is in agents/examples/agent-inu/agent.json.

**Code.** `src/update/AgentsTeaser.tsx`. Timing and copy are `AGENTS` / `AGENTS_P` (stage-local phases) / `AGENTS_COPY` in `src/timeline.ts`; the log lines are AGENT_DEMO's first five.
- The agent card (`AgentCard`) is rebuilt from embed.html #agent-preview. The green Live dot pulses with the frame (agent-pulse, 1.4 s).
- The editor panel types agent.json, then flips to SKILL.md.
- The tweet embeds the card using CSS `zoom`, so its layout scales too.
- It reuses film 6's `ChainRow` and the `BadgeMarkCtx` white BNB mark. No shared component changed; films 1–7 are untouched.

**Studio.** Same structure as film 7: named Sequences, plus `Interactive.Div` with inline `interpolate()` on the grid, the glyph layers, the glow, the 3D rig, the hook, the captions and the end-card lines.

| # | Scene | Frames | What happens |
|---|---|---|---|
| 1 | Hook | 0–79 | Black field (hairline grid, two drifting layers of dark-grey #, blue glow). The # mark and "Agents are coming / to tweetpad." are up at frame 0 (the thumbnail); then "POWERED BY GROK". |
| 2 | Agent card | 72–239 | "Give your coin an agent. / It reads the timeline and the chart." The card flies in under a slow orbit (Agent Inu · $AI · runs on Grok · Live), labelled PREVIEW · COMING SOON. The log streams thinking → tool → tool → thinking → posted "such volume. very community. wow. 🐕"; the two tool calls pop off as glowing chips. |
| 3 | Skill | 240–371 | "Write its skill. / One Markdown file you own." The card swings left and back; an editor floats in front and types agent.json (name, coin, model grok-4.7, tools), then SKILL.md (agent not a person, Voice, Never: no financial advice or price targets). |
| 4 | Coin | 372–464 | "Tie it to your coin. / On any chain tweetpad supports." The card shrinks up; the $AI coin chip (Solana badge) and Solana · Robinhood · BNB Chain · Base pop in. |
| 5 | Post | 465–549 | "Watch it inside the post." A Lights out tweet from Agent Inu @tweetpad_io with the agent card embedded. |
| 6 | End | 545–634 | "Launch an agent / inside a tweet.", "Coming soon · powered by Grok", the tweetpad.io pill, "Dev kit: github.com/cloutprotocol/tweetpad", @tweetpad_io, and the app's not-affiliated note. |

**Render.** `npm run render:agents` writes `../out/tweetpad-agents-teaser.mp4`. `npm run stills:agents` writes `TweetpadAgentsTeaser-f*.png`; rename them to `agents-<frame>-<name>.png`.

## 15. Film 9: `TweetpadWinamp` ("Winamp, inside a tweet.")

**Purpose.** A promo for tweetpad.io/winamp (Webamp in the X card, the full page and the pop-out window): 1080x1080, 30 fps, 750 frames (25.0 s). Dark #050b10, tweetpad blue #1da1f2 accents, white Inter 900 headlines, captions in the film 7–8 slot (top, 64 px). It is the only film with a soundtrack: "Space Debris" by Captain (`public/winamp/space-debris.mp3`, a 40 s render of the module), played from frame 0 and faded out over the last 1.5 s.

**Look.**
- **Backdrop = the live page's # spectrum.** A 25 x 25 grid of # glyphs (≈43 px cells), unlit `rgba(120,160,190,.09)` on #050b10, lit column by column from the bottom like Winamp's spectrum analyser. 13 log-spaced bands (45 Hz–14 kHz), the bass in the centre column and mirrored outwards; each band is in dB against its own 96th percentile; bars fall smoothly (the top glyph lights partly) and a light-grey peak glyph holds, then drops.
- It reacts to the real track: `useAudioData` + `visualizeAudio` (`@remotion/media-utils` 4.0.534, 1024 samples). `analyse()` computes every frame's levels once in a `useMemo`, a deterministic pass from frame 0, seeded with frame 24's levels so the spectrum is already moving on the thumbnail frame (the track itself fades in from silence).
- Colours: Winamp's classic viscolor.txt ramp (green #188408 at the bottom → #32ff00 → yellow → orange → red #ef3110 at the top). During the skin run the ramp is mixed 55% toward each skin's dominant colour (`TINTS`); the classic skin keeps the classic ramp.
- **The player** is one of ten skin stills (`public/winamp/skin-*.png`, main + equalizer + playlist, playing Space Debris), drawn at 2x logical with `image-rendering: pixelated` in a CSS 3D rig (perspective 1600, rotateX ≈ 8°, a slow Y sway, a soft blue glow).

**CLAIM RULES (winamp).**
- **Not affiliated with Winamp.** The end card says so. Never "official". No Winamp / Nullsoft logos beyond what appears inside the skin stills themselves.
- **Never name or label a skin**, and no third-party brands in text (a brand that is part of a skin still is fine; don't caption it). The counter chip shows a random-looking museum number only ("skin 31377 / 90,000").
- **Music credit always:** "Space Debris by Captain, via The Mod Archive" (end card small print, with "Webamp by Jordan Eldredge · skins from the Winamp Skin Museum · Not affiliated with Winamp.").
- **Site and account:** tweetpad.io/winamp; @tweetpad_io.

**Code.** `src/update/Winamp.tsx`. Timing and copy are `WINAMP` / `WINAMP_CUTS` (skins-local cut frames) / `WINAMP_SKINS` (cut order) / `WINAMP_COPY` in `src/timeline.ts`.
- The skin cuts sit on onsets of the track (125 BPM, beat ≈ 14.4 f), not a flat 36 f: 90, 123, 158, 201, 231, 271, 303, 340, 376, 410. If the audio changes, re-detect them (energy flux of the decoded PCM at 30 fps) or fall back to every 36 f.
- Skin order: 02 … 10, then 01 (classic), so the tracker push lands on the classic playlist. The hook uses 01 and the pop-out uses 02 (tweetpad's default).
- Audio is `<Audio>` from `@remotion/media` 4.0.534 (added for this film). No shared component changed; films 1–8 are untouched.

**Studio.** Same structure as films 7–8: named Sequences ("Soundtrack", "# spectrum backdrop", "1–3 Player stage (3D)", captions, "2 Skin counter", "3 File chips", "4 Pop out", "5 End card"). The spectrum layer, the rig (Tracker push, Rig tilt (X), Rig sway (Y)), the headline, captions (and the tracker caption's scrim), the counter, the pop-out card and window, and the end-card lines are `Interactive.Div` with inline `interpolate()` styles.

| # | Scene | Frames | What happens |
|---|---|---|---|
| 1 | Hook | 0–89 | The # spectrum is lit at frame 0 (the thumbnail). "Winamp. / Inside a tweet."; the classic player drops in with a 3D tilt (rotateX 24° → 8°) and a blue glow. |
| 2 | Skins | 90–447 | "90,000 skins. / One click: 🎲 Skin." Ten hard cuts on the beat, each with a 4-frame white flash and a 1.0 → 1.03 → 1.0 pop, the card floating in 3D; the counter chip under the player scrambles, then lands on a museum-style number. The spectrum tints toward each skin. |
| 3 | Tracker | 448–569 | The camera pushes into the playlist (1.8x, pixelated). "Tracker classics, preloaded." then "Upload your own: .mod .xm .s3m .it, MP3s, .wsz skins."; file chips (.mod .xm .s3m .it .mp3 .wsz) drift in and drop onto the player. |
| 4 | Pop out | 570–659 | "Pop it out. / It keeps playing." A 2012-look tweetpad card (blue header, Fredoka "tweetpad", More → "Winamp ↗ / Pops out: tracker classics, 90,000 skins, your music") is tapped; the Sony-skin player lifts out of it as its own window (dark title bar "tweetpad.io/winamp") and floats right while the spectrum keeps moving. |
| 5 | End | 660–749 | # icon, "Winamp, / inside a tweet.", the tweetpad.io/winamp pill, @tweetpad_io, and the 21 px credit line. The music fades out over the last 45 frames. |

**Render.** `npm run render:winamp` writes `../out/tweetpad-winamp.mp4` (h264 + aac). `npm run stills:winamp` writes `TweetpadWinamp-f*.png` (frames 0, 120, 300, 500, 620, 720); rename them to `winamp-<frame>-<name>.png`.
The first frame waits for the mp3 to decode (`useAudioData` holds the render), and `analyse()` takes a moment per tab; both are cached after that.

## 16. Film 10: `TweetpadEthereum` ("Now on Ethereum.")

**Purpose.** The feature-update film for Ethereum launches (shipped, live), with Auto-claim (Solana) as a short side note. 1080x1080, 30 fps, 756 frames (25.2 s), 2012 skin.
Same look as film 5 (centred captions, the app at ×1.55, `Stage` / `camMap` close-ups, `CaptionBand`, `Caption`, `Fine`, `Cursor`); every scene sets its own small type (`ETH_COPY.fine`).

**What it may claim, with sources.**
- **The switch** (`embed.html` .launch-head .net-switch, `data-net="ethereum"`): Ethereum is the fifth logo **in the Launch header only**, title "Launch on Ethereum (Launch Party custom launch)". The tab-bar switch (.hud-row) still has four buttons, so with Ethereum picked none of them is lit. The film shows it that way: the hand taps the header switch, not the tab bar.
- **The form** (`renderEthBox`, `renderFeeBox`, `renderDevBuy`, `renderLaunch`): on Ethereum the Creator fees box (holders slider) and the Dev buy box hide and #eth-box shows: "Creator fee" · "of every trade, to your wallet, for the coin's life" · chips 0% 1% 2% 3% 5%; "Starting value" · "the coin's market cap when it opens" · 2 ETH 5 ETH 10 ETH 25 ETH (ethOpts starts at **2% and 10 ETH**, so the film taps 3% and 5 ETH); "Each trade: **3% to you**, in ETH and in the coin, claimed on your profile. Fixed at launch: the fee hook can never be changed." + "Reviewed and launched by Launch Party · 0.001 ETH launch fee". Note: "Launches on Ethereum through Launch Party · 3% fee to you · 0.001 ETH launch fee + gas". Button: "Add an image" → "Add a name" → "Ticker: 2–10 letters or numbers" → "Launch $ECAT on Ethereum" (no dev buy, so no " · buy …").
- **Check lines** (`onLaunchEvm`, `buildEthLaunch`; `check()` replaces a trailing pending line): "Uploading image and metadata to IPFS…" → "Image and metadata on IPFS" [JSON ↗] → "Building the Ethereum launch…" → "Launch Party is reviewing the launch…" → "Reviewed by Launch Party and checked here: approved for 30 minutes" → "Approve in MetaMask…" → "Confirming on Ethereum…" [Tx ↗] → "$ECAT is live on Ethereum" [Explorer ↗]. Toast "Token launched!" / "Share it: the link plays as its own card on X". The approve window is film 3's generic `EvmWalletWindow chain="Ethereum"`.
- **Coin page** (`renderCoinHead`, `renderCoinFees` ethereum branch, `renderTrade` feeLine, `.chain-badge.eth`): badge white mark on #627eea; "[logo] Ethereum · now · 0xxx…xxxx ⧉"; "Uniswap ↗" / "Explorer ↗"; "**3% trading fee** · to its creator, in ETH and $ECAT" + "Fixed fee hook, launched through Launch Party"; no holder rewards. Trade box idle, ETH presets 0.005 · 0.01 · 0.05 · 0.1, "3% coin fee, to its creator · tweetpad takes nothing", disabled "Buy $ECAT".
- **README "Ethereum"** backs the captions: Launch Party's public review signs a 30-minute approval; tweetpad checks the answer byte for byte; the wallet sends one transaction; the fixed fee hook pays the creator on every trade in ETH and in the coin; fees are claimed on the profile; 0.001 ETH launch fee + gas.
- **Auto-claim** (`autoClaimBox`, `toggleAutoClaim`, `api/autoclaim.js` MIN_SOL, `api/keeper.js`, README "Auto-claim", `autoclaim.html`): Profile → "AUTO-CLAIM · Off · ⓘ · [Turn on]" → "On · from 0.005 SOL · ⓘ · [Turn off]", status "Auto-claim is on: fees of 0.005 SOL or more are claimed to this wallet". The keeper claims the creator's pump.fun fees to their wallet every 5 minutes and pays the network fee; it has its own page, tweetpad.io/autoclaim. The film skips the sign step, because its status line says "free".

**Never (this film).**
- Real coins ($AI, $LAMP or any other). The only coins are $ECAT, the Ethereum coin launched here (`public/brand/ether-cat.svg`), and $WOW on the profile.
- Prices, market caps, volumes, % moves, user or claim counts. The starting value is shown only as the app's own chips.
- Real addresses. Use `0xxx…xxxx` / `xxxx…xxxx`.
- Audit or safety claims ("safe", "audited", "vetted", "rug-proof", "guaranteed"). "Reviewed by Launch Party" and "checked by tweetpad" are fine, because they describe real steps.
- "Free", "no fees" or "gas-free". Every fee mention has its small type on the same frame; the hook's X card image ("zero pad fee") gets the Solana line.
- Partnership or endorsement wording. Launch Party may be named with **custom launch / fee hook** language in THIS film only.
- Reward amounts other than obvious demo values (0.0031 SOL on the profile, under "Demo amounts.").

**Code.** `src/update/EthereumUpdate.tsx`. Timing and copy are `ETH` / `ETH_COPY` in `src/timeline.ts`. Click targets are in `T` (app px; each comment names its scroll: `FS_HEAD`, `FS_TOP`, `FS_CHIPS`, `FS_BTN`). The Ethereum form is ~110 px taller than the other EVM forms (the eth-box), so its scrolls are deeper than film 5's.
Shared additions, all defaulting to the old behaviour (films 1–9 render byte-identically: 23 stills of films 1–8 compared before/after):
- `Net` gains `"ethereum"`; `NETS_5` is new (`NETS_4` is unchanged); `LOGO_SRC`, `NET_TITLE` and `EVM_NETS.ethereum` (`custom: true`, fdv 10, no dev buy, trade presets 0.005 · 0.01 · 0.05 · 0.1) are added.
- `NetPill` leaves every button unlit when the picked chain isn't in its list (only reachable with Ethereum).
- `LaunchForm`: `ethFee`, `ethStart` and `ethPressed`, plus ring `"eth"`. For a `custom` chain the form shows `EthBox` instead of the fee box and dev buy, and the note is `noteEth(fee)`.
- `Views`: `BADGE.ethereum`, `CoinView feePct` (with the Ethereum head line and fee branch), `TradeBox` / `TradeQuote feePct`, and a new `SolanaProfile` (renderProfile with the auto-claim row).
- Film 6's `DISC_BG` / `DISC_FG` gain an ethereum entry, which is unused there.

| # | Scene | Frames | What happens |
|---|---|---|---|
| 1 | Hook | 0–83 | NEW tag, "Now on Ethereum. / Launch from the tweet.", the post in a feed. Small type: the Solana fee line (for the card image). |
| 2 | Switch | 84–203 | The card opens on Launch with Base picked (the app remembers the last chain): fee box with the slider, dev buy, tab-bar pill lit on Base. The camera moves onto the header switch; the hand hovers Ethereum (tooltip "Launch on Ethereum (Launch Party custom launch)") and taps it at 142. The tab-bar blue goes out, the slider and dev buy go, the eth-box and the Ethereum note appear. "Five chains, one switch." |
| 3 | Fill | 204–329 | The image drops (220), "Ether Cat" / "ECAT" are typed, 3% is tapped (288) and then 5 ETH (306); the note and button update. "Pick your fee. / Pick where it starts." |
| 4 | Launch | 330–479 | Launch is clicked (338). IPFS, "Launch Party is reviewing the launch…" (368–391), "Reviewed by Launch Party and checked here: approved for 30 minutes", the approve window (Approve at 436), "Confirming on Ethereum…", "$ECAT is live on Ethereum" and the toast (458). "Reviewed by Launch Party. / Checked by tweetpad." |
| 5 | Coin | 480–575 | The Ethereum badge and chain line, then the camera pushes to the idle ETH trade box and the fee-hook lines. "Your fee on every trade. / In ETH and your coin." |
| 6 | Auto-claim | 576–671 | ALSO NEW · "Auto-claim." The Solana profile; "Turn on" is tapped (618) → "On · from 0.005 SOL" and the status line. Small type: "Demo amounts. tweetpad pays the network fee. tweetpad.io/autoclaim". |
| 7 | End | 672–755 | "Every chain. One tweet. / Solana · Robinhood · BNB · Base · Ethereum", tweetpad.io, $TP, and four lines of fee small type (one per chain family; the EVM line is split in two). |

**Render.** `npm run render:ethereum` writes `../out/tweetpad-ethereum.mp4`. `npm run stills:ethereum` writes `TweetpadEthereum-f*.png` to `../out/stills`; rename them to `ethereum-<frame>-<name>.png`. Never overwrite an existing file in `out/` or `out/archive/`.

## 17. Film 11: `TweetpadThreeNew` ("Three new things on tweetpad.")

**Purpose.** One update film for Ethereum launches, custom launches (`/custom`) and Auto-claim on Solana, introduced by a talking parody character. 1080x1080, 30 fps, 906 frames (30.2 s), 2012 skin.

**THE CHARACTER RULE (parody, not a real person).**
- The intro character is the Ethereum diamond in shades from `assets/notvitalik-avatar.svg`, redrawn as an SVG (`Diamond` in `ThreeNew.tsx`) so its jaw talks, its shades lift, its eyes blink and its lenses glint. It is named "vitalik.eth" with the PARODY chip, as `/custom`'s post does.
- **Never** use `assets/vitalik.jpeg` (a photo of the real Vitalik Buterin), the @VitalikButerin handle, his voice or likeness in any film. Do not animate a real person's face to speak product copy; that reads as a fake endorsement whatever the label says.
- The intro's small type reads "Parody character. Not Vitalik Buterin; no affiliation or endorsement implied." and the end card repeats "Parody character, not Vitalik Buterin."

**What it may claim, with sources.**
- Ethereum: as film 10 (§16), compressed to the fee chips (3%, 5 ETH), the check lines, the approve window and "$ECAT is live on Ethereum".
- Custom launch (`custom.html`, `assets/custom.js` render / renderBrief, `assets/feature.css`): the Fee hook choice "Fixed · The hook can never change. What buyers see is what it stays." / "Upgradeable · You can point it at new logic, in public, or freeze it for good."; Creator fee 0–5%; Starting value 2/5/10/25 ETH (defaults 2% and 10 ETH); Team share None/5%/10%/20% with the vesting row 30/60/90/120 days (shown only with a share; default 60); the summary line and the agent brief are built by the same code as custom.js, so they are verbatim. "Or hand it to your agent", "Skill file ↗", "Copy brief" → "Copied". The page's own post is redrawn with the parody diamond (custom.html currently ships the photo; the film does not copy that).
- Auto-claim: the Solana profile's autoClaimBox (as film 10), then `/autoclaim` as its card image shows it (`.still` items only: the lede, the hero "pump.fun creator fees → your wallet / every 5 minutes" and the permissionless-claims line). The live stats and feed are never shown, and the steps are skipped (they say "free").
- **Never (this film):** any number beyond the app's own chips and the demo amounts; "free"; audit or safety claims ("a check is not an audit" sits in the small type); real coins or addresses.

**Code.** `src/update/ThreeNew.tsx`. Timing and copy are `THREE` / `THREE_T` (intro-local beats) / `THREE_COPY` in `src/timeline.ts`. The feature pages are rebuilt at their own px (`FeatureFrame`, 480 wide, scaled ×1.55 by `FeatureStage`). Taps on them are `Tap`s drawn inside the tapped button (hand + ripple), so there are no click targets to measure. The Ethereum scene reuses film 10's `T` coordinates. No shared component changed; films 1–10 are untouched.

| # | Scene | Frames | What happens |
|---|---|---|---|
| 0 | Intro | 0–215 | "NEW · Three new things / on tweetpad." The diamond floats and talks; its post types "gm. three new things on tweetpad:", then lights three ghosted lines letter by letter, with a hop on each: 1 Ethereum launches · 2 Custom launches (a hook icon) · 3 Auto-claim on Solana. It peeks over its shades and blinks at 176–210. Frame 0 (the thumbnail) shows all three lines as ghosts. |
| 1 | Ethereum | 216–395 | "1 · ETHEREUM · Launch on Ethereum. / Pick your fee, 0–5%." Tap 3%, 5 ETH, then Launch: IPFS → Launch Party's review → approve window → "$ECAT is live on Ethereum" and the toast. |
| 2 | Custom launch | 396–647 | "2 · CUSTOM LAUNCH · Your token, your fee hook. / Fixed or upgradeable." `/custom`: the parody post, then the deployer: tap Upgradeable, 3%, team 10%, 90 days (the summary follows). Then "Or hand it to your agent. / One skill file. You still sign.": the brief, Copy brief → Copied. |
| 3 | Auto-claim | 648–815 | "3 · AUTO-CLAIM · Auto-claim on Solana." Profile → Turn on → "On · from 0.005 SOL" and the status line, then `/autoclaim`'s hero with a SOL dot travelling to "your wallet". |
| 4 | End | 816–905 | "Ethereum. Custom launches. Auto-claim. / All inside the tweet.", tweetpad.io, $TP, the diamond waving in the corner, three lines of small type (Solana, Ethereum, the parody line). |

**Render.** `npm run render:three` writes `../out/tweetpad-three-new.mp4`. `npm run stills:three` writes `TweetpadThreeNew-f*.png`; rename them to `three-<frame>-<name>.png`.

## 18. Film 12: `TweetpadStonks` ("Stocks meet memes. Stonkfun, inside the tweet.")

**Purpose.** The update film for Stonkfun launches on Solana (shipped in b6418ac): a coin paired with a tokenized stock, SOL or USDC on Raydium LaunchLab under Stonkfun's platform, with creator fees or holder rewards. 1080x1080, 30 fps, 1025 frames (34.2 s), 2012 skin. Same look as films 10–11 (centred captions, the app at ×1.55, `Stage` close-ups, `CaptionBand`, `Fine`), plus **the stonks**: the xStock logos swirl on tilted rings around the # icon (hook), around the app (every app scene, faint), and around the end card, with faint green candles rising in the hook.

**What it may claim, with sources** (`embed.html` #venue-row / #stonk-box / #pairs-venue, `assets/tweetpad.js` renderStonkBox, renderPairs, renderPairPick, renderLaunch, onLaunch, renderStonkFees, renderTrade, `api/stonk.js`, README "Stonkfun").
- The Launchpad row at the top of the Solana form: "Launchpad [pump.fun | Stonkfun]". Switching to Stonkfun picks $TSLAx until a pair is picked; the chip reads "Pair … ▾" while the pairs load.
- "Pair with": "All · pump.fun · Stonkfun", the pump.fun section ("SOL or any coin launched on tweetpad") over the Stonkfun one ("SOL, tokenized stocks or USDC · creator fees or holder rewards"); stock tiles say "Stock", Stonkfun's SOL "Stonkfun"; the note "The pair picks the launchpad: pump.fun, or Stonkfun for stocks, USDC and holder rewards."
- The fee box: "Fees · fixed at launch, for the coin's life", Creator fees | Holder rewards | Community (Community only on stocks), "Holder tax · on every transfer, paid to holders" 1% | 3%, and the notes verbatim (creator fees: "Each trade: a 1% curve fee, your share forwarded to your wallet by Stonkfun. No transfer tax."; rewards: "… Stonkfun pays it out in $NVDAx: all to $MCHIP holders."; Community: "67% to $MCHIP holders, 33% to $NVDAx holders"), "On Stonkfun (Raydium LaunchLab) · about 0.009 SOL · no dev buy yet". No dev buy box on Stonkfun.
- The note under the button (`noteStonk`), the button "Launch $MCHIP on Stonkfun", and onLaunch's lines: "Building the Stonkfun transaction…", "Transaction built · mint xxxx…xxxx · paired with $NVDAx · Holder rewards 3%" (the app also appends "· opens at $…", a market cap: the film leaves it out), "Signed by Phantom and the new mint", "Confirmed on mainnet", "$MCHIP is live" [Stonkfun ↗], "Stonkfun picks it up within a minute or two".
- The coin page: "⇄ $NVDAx" under the head, "Stonkfun ↗" (no LIVE chip), "3% transfer tax · paid to holders in $NVDAx by Stonkfun", "PAID TO HOLDERS · 0.0042 NVDAx · 12 wallets" (**demo amounts**, under "Demo coin, demo amounts"), "Launched on Stonkfun (Raydium LaunchLab)". Trades go through Jupiter (LaunchLab's 1% fee and Jupiter's 0.1%; tweetpad takes nothing).

**Never (this film).**
- Stock prices, market caps (the $TP tile shows "—"), volumes, % moves, or anything that reads as a forecast; the rising candles are decoration, never with numbers.
- Affiliation or endorsement: the logos belong to their owners, and Stonkfun is named in words only (no Stonkfun logo). Every scene showing logos carries "Logos belong to their owners. No affiliation with or endorsement by them, or by Stonkfun."
- Real coins or addresses; audit or safety claims; "free". Holder rewards are "paid out by Stonkfun", never guaranteed.

**Code.** `src/update/Stonks.tsx`. Timing and copy are `STONK` / `STONK_COPY` in `src/timeline.ts`. Taps are ThreeNew's `Tap` (now exported), drawn inside the tapped control through `LaunchForm`'s `stonk.tap` slot, so there are no click targets; the only cursor is on `WalletWindow`'s Approve (`WALLET_OK`). The form is drawn at the shipped 363 px column (`width={363}`). The "Pair with" dialog is rebuilt in the film (`PairDialog`) and passed as `AppFrame`'s `overlay`.
Shared additions, all optional, so films 1–11 are unchanged: `LaunchForm stonk` (`StonkForm`: the Launchpad row, the Pair chip's pick, `StonkBox` in place of the dev buy, `noteStonk`), and `CoinView stonk` (the pair line, "Stonkfun ↗", and a fee node).

| # | Scene | Frames | What happens |
|---|---|---|---|
| 0 | Hook | 0–149 | "NEW · Stocks meet memes. / Stonkfun, inside the tweet." Two rings of xStock logos orbit the # icon in 3D (front and back halves around it), green candles rise, the pill "Launch a coin paired with a stock." Frame 0 is the thumbnail. |
| 1 | Switch | 150–289 | "1 · LAUNCHPAD · One switch: / pump.fun or Stonkfun." Close on the form's head; Stonkfun is tapped (194): the chip reads "…", then "$TSLAx", and the fee box replaces the dev buy as the camera pulls back. |
| 2 | Pair | 290–449 | "2 · PAIR · Pair your coin with a stock." The chip is tapped, "Pair with" opens on All, the Stonkfun filter is tapped (346), then $NVDAx (394); the dialog closes and the chip reads $NVDAx. |
| 3 | Fees | 450–599 | "3 · FEES · Creator fees, / or holder rewards." Holder rewards (480), 3% (514), Community (550); the note follows each tap. |
| 4 | Launch | 600–779 | "4 · LAUNCH · Hit Launch. / Checked on chain before it's listed." (Holder rewards 3%) The check lines, the generic approve window (Approve at 684), "$MCHIP is live" [Stonkfun ↗], "Stonkfun picks it up within a minute or two", the toast. |
| 5 | Coin | 780–919 | "5 · HOLDERS · Holders get paid / in the stock." The coin page draws its chart, scrolls to the tax and "PAID TO HOLDERS 0.0042 NVDAx · 12 wallets". |
| 6 | End | 920–1024 | "Stocks meet memes. / Launch on Stonkfun, inside the tweet.", tweetpad.io, $TP, the logos circling the card (faded before the small type), three lines of small type. |

**Render.** `npm run render:stonks` writes `../out/tweetpad-stonks.mp4`. `npm run stills:stonks` writes `TweetpadStonks-f*.png`; rename them to `stonks-<frame>-<name>.png` (16 already in `out/stills`). Never overwrite an existing file in `out/`.

## 19. Film 13: `TweetpadGames` ("Casino games, inside the tweet. Built on Gamba.")

**Purpose.** The update film for tweetpad's games on Gamba (shipped in 96fafb3): `/games`, Pump or Dump, Mines, ⚡ Instant play and the fairness check. 1080x1080, 30 fps, 1250 frames (41.7 s), 2012 skin. The game pages are rebuilt in the film from `assets/feature.css` + `assets/games.css` (`GameFrame`, `Screen`, `PodChart`, `Board`, `Seg`, `Big`, `Stamp`) at the card's 480 px width, ×1.45 (`GStage`, the films' camera). Game pieces (gem and mine tiles, green and red candles) orbit the # icon in the hook, the app in every scene, and the end card.

**What it may claim, with sources** (`games/*.html`, `assets/gamba-kit.js`, `pumpordump.js`, `mines.js`, `api/gamba.js`, README "Games").
- Pump or Dump: 2×, 3× or 5×, bets 0.01 / 0.02 / 0.05 / 0.1 SOL, "33% to win", "wins 0.15 SOL", "costs 0.0519 SOL with fees · pays 0.15 SOL on a win"; the stamps TO THE MOON / LIQUIDATED and the status lines verbatim.
- Mines: 5×5, 3 / 5 / 10 mines, NEXT / RIDING, "💎 Safe · ×1.14 · 0.0568 SOL riding", CASH OUT, "Cashed out … · it's in your game balance", BOOM, "Hit a mine on tile 1"; the multipliers are api/gamba.js minesBet's (×1.1363, ×1.1428, ×1.15 for 3 mines); 3.2% fees a tile.
- ⚡ Instant play: "Each play asks your wallet." → one signed message (the generic wallet window's "sign" kind: "Sign message … It approves no transaction.") → "⚡ Game balance … Top up · Withdraw · Lock"; up to 1 SOL; withdraws only to that wallet.
- Provably fair: the box and its four check lines verbatim; the seed hash shown is made up for the film.
- Gamba: "Built on Gamba", Solana's on-chain casino protocol, the house is its public SOL pool, settled on chain in about a second, seeds committed before you play.

**Never (this film).** Wins without a loss (each game shows one); live numbers (the jackpot, volumes, payouts, player counts); "free", "guaranteed", "risk-free", audit or safety claims; Gamba as a partner or endorser (its mark is shown as "Built on Gamba"; the small type says it doesn't run or endorse tweetpad); a scene with plays and no "18+, and only where betting is legal" in its small type.

| # | Scene | Frames | What happens |
|---|---|---|---|
| 0 | Hook | 0–149 | "NEW · Casino games, / inside the tweet." Gems, mines and candles orbit the # icon; the pill "Pump or Dump · Mines" and "Built on Gamba". Frame 0 is the thumbnail. |
| 1 | /games | 150–249 | "1 · GAMES · Two games. / One tap, in the post." The two tiles and the Gamba card; Pump or Dump is tapped. |
| 2 | Pump or Dump | 250–489 | 3× is tapped, PUMP (rolling candle, TO THE MOON +0.0981, rockets), then DUMP (LIQUIDATED −0.0519). |
| 3 | Mines | 490–729 | Three gems (×1.14, ×1.30, ×1.49), CASH OUT 0.0747 SOL, a new round, BOOM −0.05 with the other mines shown. |
| 4 | Instant play | 730–879 | ⚡ Instant play is tapped, the sign window (Sign at 790), the game balance, three tiles with no pop-ups. |
| 5 | Provably fair | 880–1019 | Pump or Dump's page scrolls to the seeds; the four checks land one by one. |
| 6 | Built on Gamba | 1020–1139 | The shrimp mark, three facts. |
| 7 | End | 1140–1249 | "Casino games, inside the tweet. / Pump or Dump and Mines, built on Gamba.", three lines of small type. |

**Render.** `npm run render:games` writes `../out/tweetpad-games.mp4`. `npm run stills:games` writes `TweetpadGames-f*.png` (14). Never overwrite an existing file in `out/`.


## 20. Film 14: `TweetpadBordrless` ("Bordrless tokens. Tradeable in a tweet.")

**Purpose.** The update film for tweetpad's Bordrless integration: every Bordrless token gets a trading page at `tweetpad.io/b/<token CA>` that plays as its own X card, so a posted link is the coin, tradeable in the post; plus the Tokens page's Bordrless list by market cap, the scanner, and Bordrless launches. 1080x1080, 30 fps, 1410 frames (47.0 s). **Its own look**, Bordrless's blended with tweetpad's: paper `#e3e3df`, ink `#111`, Anton headlines (second line white on ink over tweetpad's blue shadow), JetBrains Mono labels and small type, Space Grotesk text, square cards on hard offset shadows, "Fig." tags, corner brackets, and the user's two 1-bit dithered pictures (`public/bordrless/monument.png`, the ringed sphere; `workshop.png`, the sculptor), with tweetpad's # icon. Fonts: `public/fonts/Anton-Regular.ttf`, `JetBrainsMono-{Regular,Bold}.ttf`, `SpaceGrotesk-{Medium,Bold}.ttf` (OFL, from Google Fonts; added to `brand/fonts.ts`, unused by films 1–13).

**What it may claim, with sources** (`api/b.js`, `assets/b.js`, `b.css`, `api/bordrless.js`, `assets/tweetpad.js` renderBordrTokens / renderBordrBox, README "Bordrless", "Bordrless pages", "Tokens").
- Bordrless tokens live in Bordrless's own token program (not SPL, not Token-2022): wallets don't list them, swap aggregators don't route them (b.js's small print: "your wallet's token list won't show it").
- `/b/<mint>`: its own X player card (`?embed`) and card image (api/b.js `card()`: "TRADE IN THIS POST", the coin, MARKET CAP · 24H · HOLDERS, the curve bar "% TO GRADUATION", the rule chips); the page: the coin, the chart, Buy/Sell, chips 0.05 · 0.1 · 0.5 · Max, Slippage, the quote "≈ … $RING · min …", "Connect wallet to trade" → "Buy $RING", "Getting the price…" → "Approve in Phantom…" → "Confirming…" → "Bought ≈ … $RING" [Tx ↗], "Yours to claim", Fig. A–C cards verbatim (the risk words are the SDK's label for the rules kit).
- The Bordrless list: "Every Bordrless token", New · Hot · Mcap, rank, "$SYM · age · N holders", market cap, 24h. The launch box: Launchpad pump.fun | Stonkfun | Bordrless, Creator fee 0.5% / 1% / 2%, Token rules Plain / Diamond hands / Burn / Paid to hold, the note and button verbatim, "about 0.035 SOL".
- How to: copy the CA → tweetpad.io/b/<token CA> → post on X → anyone taps play and trades; or Tokens → Bordrless → a coin → Post on X. Coins with a hook of their creator's own trade on bordrless.app.

**Never (this film).** Real Bordrless coins, prices, caps or addresses (demo coins $RING, $MONO, $CHSL, $PLTH, $DUST with pictures cropped from the two dithered images; every number under "Demo coin(s), demo numbers"; addresses `xxxx…xxxx`, the link `tweetpad.io/b/RiNG…xxxx`); Bordrless's logo or any partnership/endorsement wording (named in words; the small type says so); "free", "safe", "audited"; a trade scene without the fee line ("tweetpad takes nothing · network fees apply").

**Code.** `src/update/Bordrless.tsx`. Timing and copy are `BORDR` / `BORDR_T` / `BORDR_COPY` in `src/timeline.ts`. The /b page is rebuilt at the card's 480 px (`BPage`, ×1.5); taps are ThreeNew's `Tap`; the only cursor is on the generic `WalletWindow` (connect, then approve). No shared component changed; films 1–13 are untouched.

| # | Scene | Frames | What happens |
|---|---|---|---|
| 0 | Intro | 0–239 | "NEW · Bordrless tokens. / Tradeable in a tweet." The ringed sphere floats on its "Fig. 0" plate under a scan line; tweetpad's own post types "gm. Bordrless tokens now trade inside a tweet:" and lights five ghosted lines one by one (buy and sell in a post · tweetpad.io/b/<token CA> · ranked by market cap · scan · launch). Frame 0 (the thumbnail) shows them all as ghosts. |
| 1 | The problem | 240–389 | "Fig. 1 · THE PROBLEM · Its own token standard. / Hard to trade anywhere else." The workshop; "Your wallet: ✕ No Bordrless tokens listed"; "Swap aggregator: ✕ No route for this token"; the stamp "Until now." |
| 2 | Share | 390–569 | "1 · SHARE · Paste tweetpad.io/b/<token CA>. / It becomes a card you can trade." A post is typed with the link, Post is tapped, the coin's card unfurls with the play button, play is tapped. |
| 3 | Trade | 570–809 | "2 · TRADE · Buy and sell in the post. / SOL in, SOL out. Your wallet signs." The page: 0.1 → the quote, connect (wallet window), Buy → approve → "Bought ≈ 214.2K $RING". |
| 4 | On chain | 810–959 | "3 · ON CHAIN · Its rules, its curve, its risk. / Read from the chain." The page scrolls: Yours to claim (Claim tapped), Fig. A rules, Fig. B the curve, Fig. C who can change it. |
| 5 | List · Launch | 960–1109 | "4 · EVERY TOKEN · … ranked by market cap." The list (five demo coins, #1–#5); then "5 · LAUNCH · Or launch your own. / Your fee. Its rules.": Bordrless tapped, Burn tapped, "Launch $RING on Bordrless". |
| 6 | How to | 1110–1289 | "Fig. 2 · HOW TO · Make any Bordrless token / tradeable in a post." Four numbered steps light in turn; step 2 types `<token CA>` after tweetpad.io/b/. |
| 7 | End | 1290–1409 | The monument; "tweetpad · ON BORDRLESS · Every Bordrless token. / Tradeable in a tweet. · tweetpad.io/b/<token CA>", two lines of small type. |

**Render.** `npm run render:bordrless` writes `../out/tweetpad-bordrless.mp4`. `npm run stills:bordrless` writes `TweetpadBordrless-f*.png` (14) to `../out/stills`. Never overwrite an existing file in `out/`.

## 21. Film 15: `TweetpadBordrlessHome` ("Launch & trade Bordrless tokens (inside a tweet).") and the poster

**Purpose.** The Bordrless channel on tweetpad's new home, then launching and trading Bordrless tokens on Bordrless's DEX inside a post. 1080x1080, 30 fps, 1125 frames (37.5 s). It opens in the home's own look (the Menu, 2012 skin) and turns to Bordrless's (film 14's paper, ink, Anton, mono) once Start is pressed.

**What it may claim, with sources** (`index.html`, `bordrless/index.html`, `assets/bhub.js`, `bhub.css`, `api/bordrless.js`, `api/b.js`, README "Bordrless section").
- The Menu (`index.html`, rebuilt at its 480 units ×1.6): nine channels (Launch, Tokens, Feed, Custom launch, Games, Profile, **Bordrless** with Bordrless's ringed-sphere mark `public/menu/bordrless.png`, $TP, More), the dock (the # round, the clock "10:53 / Tue 10/13", the 𝕏 round), hover = blue bezel + scale 1.035. The hand is index.html's cursor (the films' `Cursor hand`).
- The open, as index.html `open()` does it: the home scales ×1.12 toward the tile, fades and blurs 2 px; the screen grows from the tile's inset (radius 16) over 520 ms (16 f) with cubic-bezier(.45, 0, .2, 1); the banner (the channel's icon at 104 + its name, on the stripes) breathes while it loads; the bar "Menu · Bordrless · Start" rises; the banner fades off the section.
- The section: the bar (‹ # tweetpad · BORDRLESS chip), the tabs Tokens · Launch · Hooks, the Tokens tab ("Search a name, ticker or contract", "N tokens", the note, rows with rank, holders, curve or graduated), the Launch tab (A Your coin, B Your fee, its rules, C Dev buy, the button and its cost line, and bhub.js `check()` lines verbatim; a pending line is replaced by the next).
- Fig. 2: the sphere cut from Bordrless's own diagram (`public/bordrless/sphere.png`) on a framed plate, with its four nodes called out in our words: the token program, the hook, its answer ("an amount, not a yes or no"), the Bordrless DEX.
- The trade: film 14's `BPage` (/b/<mint>), 0.1 SOL → "Bought ≈ 214.2K $RING".

**Never (this film).** Real coins, prices or addresses (demo $RING, $MONO, $CHSL, $PLTH, $DUST and their numbers); Bordrless as a partner or endorser (its sphere marks its channel and is the art; the small type says Bordrless doesn't run or endorse tweetpad); "free", "safe", "audited".

**The poster** (`src/update/BordrlessPoster.tsx`, composition `TweetpadBordrlessPoster`, still `../out/stills/bordrless-poster.png` via `npm run still:bordrless-poster`): film 14's end card refined: the monument full bleed falling to ink, three callouts on the sphere (1 The token program · 2 The hook: its rules · 3 The Bordrless DEX), "Launch & trade / Bordrless tokens" with the "(inside a tweet)" sticker, a small post on the panel's edge playing $RING's card, and a ticker of tweetpad.io/borderless · tweetpad.io/b/<token CA>. `BordrlessPosterArt f` animates it in; film 15 ends on it.

**Code.** `src/update/BordrlessHome.tsx`, timing and copy `BHOME` / `BHOME_COPY` in `src/timeline.ts`. It imports film 14's exported parts (`Paper`, `BCap`, `BFine`, `Chip`, `Hash`, `Pic`, `PICS`, `BPage`, the palette and faces); exporting them changed nothing in film 14.

| # | Scene | Frames | What happens |
|---|---|---|---|
| 0 | The Menu | 0–149 | "# tweetpad · The launchpad inside a tweet." and the Menu; the hand hovers Launch, then Games, then Bordrless (the NEW · BORDRLESS chip appears) and clicks at 112. |
| 1 | The channel | 150–284 | The open (16 f), the banner breathing, the bar rising at 170, the section's Tokens tab under the banner from 212; Start is pressed at 254 and the frame zooms toward the viewer into Bordrless's paper. |
| 2 | Fig. 2 | 285–404 | "TOKENS WITH A BRAIN · Their own token program. / Their own DEX." The framed sphere; four callouts draw in. |
| 3 | Launch | 405–644 | "1 · LAUNCH · Launch a Bordrless token. / Your fee. Its rules. One approval." The image drops, Ring / RING, Burn, 0.1 SOL (≈ 2.07M $RING), Launch, the approve window, the check lines to "$RING is live · Its page ↗" and "Dev buy confirmed". |
| 4 | Trade | 645–854 | "2 · TRADE · Trade it on Bordrless's DEX. / Right inside the post." /b/<mint>: 0.1 → the quote, Buy, approve, "Bought ≈ 214.2K $RING". |
| 5 | Every token | 855–974 | "3 · EVERY TOKEN · Every Bordrless token. / By market cap. Tap one, trade it." The Tokens tab; Ring is tapped. |
| 6 | The poster | 975–1124 | The poster animates in: the corner marks, the masthead, the callouts, the panel, the sticker, the post, the ticker, the small type. |

**Render.** `npm run render:bordrless-home` writes `../out/tweetpad-bordrless-home.mp4`; `npm run stills:bordrless-home` writes `TweetpadBordrlessHome-f*.png` (15). Never overwrite an existing file in `out/`.
