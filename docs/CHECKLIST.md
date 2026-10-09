# Checklist

Where tweetpad stands, and what to do next. `[x]` is done and verified, `[ ]` is open.

## Critical fixes (before a public launch)

- [x] Rate-limit every write endpoint per IP (`ipfs`, `create`, `launches` POST, `profile`, `rewards` POST, `upload`).
- [x] Only list coins that were built here and verified on chain (payer, mint, pump.fun program, pairing).
- [x] Card actions are click handlers, not form submits (X's sandbox drops `submit`).
- [x] CORS on every function (the sandboxed card has an opaque origin).
- [ ] **One real `$JACK`-paired launch** from a funded wallet. Simulated on mainnet and run end to end with an
      unfunded wallet; a real one has not landed yet.
- [ ] **Separate Redis for development.** Local `vercel dev` and production share the `twitterpad-launches` store,
      so local tests write to the live list. Add a second Upstash database and connect it to Development only.
- [ ] **Own domain.** `*.vercel.app` triggers MetaMask's phishing interstitial; `tweetpad.vercel.app` is taken.
      Then submit the domain to MetaMask's `eth-phishing-detect` and Blockaid as a false positive.
- [ ] **Private RPC** (`RPC_URL`): sends, confirmations and on-chain checks use the free publicnode RPC, which
      rate-limits under load. Route browser sends through a function so the key stays secret.
- [ ] **Moderation**: an admin way to hide a listing (`ZREM launches <mint>`), plus a word filter on names and tickers.
- [ ] **Fee split decisions** for the treasury (address, tweetpad's share of creator fees, creator fee rate on
      paired coins). The split is a second transaction signed in the same wallet prompt; pump.fun locks it after.

## Quick wins

- [x] Market cap and 1h change on the token list (DexScreener, one batched call, 15s CDN cache).
- [x] 64px thumbnails saved at launch, resized images (`/api/image?w=`) everywhere else.
- [x] Paged token list, New / Hot / Mcap sorts.
- [x] Coin screen: chart in market cap, trades, live websocket, copy contract address, share card `/c/<mint>`.
- [x] Image modal with focus handling and `Esc`.
- [x] Clickable logo, inventory hotbar of coins.
- [x] "by @handle ✓" on token list rows for verified creators.
- [ ] SOL balance in the wallet menu.
- [ ] Show the pairing (`⇄ $JACK`) on list rows, not only on the coin screen.
- [ ] Empty states with a call to action everywhere (Tokens when the API is down, Profile when nothing launched).
- [x] Favicon (inline SVG; it was the card's only 404).

## Quality of life

- [ ] **Buy / sell inside the card.** SOL coins: PumpPortal `trade-local`. `$JACK`-paired coins: pump.fun's
      `multi_hop_swap` (SOL → `$JACK` → coin) through the SDK. Quick-amount buttons, slippage, same signing path.
- [ ] **Dev buy on paired launches** via the same multi-hop swap.
- [x] **Crafting: pair a new coin with any tweetpad coin.** "Pair with" on the launch form opens a searchable grid
      (SOL + every listed coin); `/api/launches?pair=` and `/api/create` check the pick with the SDK's
      `resolveQuoteMint`. Limits, checked on mainnet 2026-10-09: `Global.max_curve_depth` is 1, so only SOL-paired
      (depth 0) coins can be parents; mayhem-mode coins and curves complete awaiting migration are refused.
- [ ] **First real crafted launch** (a coin paired with a tweetpad coin) from a funded wallet, then trade it.
- [ ] **Public profiles**: `/u/<handle>` card with a creator's coins, like `/c/<mint>`.
- [ ] **Treasury tab**: treasury balance, coins sharing fees, and a "Harvest" button that triggers pump.fun's
      permissionless fee distribution.
- [ ] **A game that adds value without being a lottery**: a no-purchase "mining" raffle funded by the treasury,
      or visible buyback-and-burn of the platform token. (Paid lotteries are regulated gambling in most places.)
- [ ] Notifications in the chat feed when one of your coins trades or migrates.
- [ ] Keyboard help overlay (`?`).
- [ ] Split `assets/tweetpad.js` into ES modules once it passes ~2,000 lines (no build step needed: `type="module"`).

## Done along the way

- [x] Wallet probe: Wallet Standard, legacy providers, popup bridge, environment report (now the Debug panel).
- [x] Mainnet by default via publicnode (`api.mainnet-beta.solana.com` answers browsers with 403).
- [x] pump.fun IPFS through our function (it blocks browsers but answers servers), Pinata fallback.
- [x] PumpPortal for SOL launches; pump.fun SDK `create_v2` for pump-coin pairing.
- [x] Profiles: wallet ↔ X via a tweeted code + wallet signature, read from the public tweet (no X API).
- [x] Creator rewards: balance per quote, claim transaction built server side, signed in the wallet.
