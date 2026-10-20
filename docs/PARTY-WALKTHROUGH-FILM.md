# "How to bundle a coin with a crew": the Launch Party walkthrough film

The live follow-up to the launch-party film (`remotion/project/src/update/PartyFilm.tsx`, "Live on devnet now · mainnet soon"). That one
said what a party is; this one shows how to throw one on tweetpad, start to finish, in the real screens.

- **Format:** 1080×1080, 30 fps, about 55 s; a new composition (`TweetpadPartyHowTo`), the old one stays.
- **Look:** the launch-party film's light canvas (dot grid, mint glow from the floor), with tweetpad's real party screens on it as dark glass
  cards, a cursor that clicks and types, captions in Inter Tight that resolve word by word. Frame 0 is a finished poster (X's thumbnail).
- **Numbers** (pump.fun's mainnet curve, checked against the party SDK's `firstBuyCoins`): 10 seats × 0.1 SOL is one 1 SOL buy: **4.31%** of
  the curve, **3.42M** coins a seat, a **29.8 SOL** market cap at launch. Seat by seat: 0.44, 0.88, 1.32, 1.76, 2.19, 2.62, 3.05, 3.47, 3.89,
  4.31%. Dollars at SOL $104.6 (2026-10-19): a seat ≈ $10.46, the raise ≈ $105.
- **Claims** (Launch Party's guide §8): say "refundable until launch", "launch on pump.fun with your friends"; never "guaranteed", "no
  snipers", "first", "bet", "ticket"; no pump.fun logo (text only); the not-affiliated line on the end card; tweets tag @pumpfun.

## Script

### 0 · Poster (0:00–0:03)
Composed at frame 0: the crew (Nouns) in a ring of seats around tweetpad's mark, the ring turning slowly.
- **Launch Party**
- *Bundle a coin with a crew on pump.fun*
- chip: **Live now**

### 1 · Find it (0:03–0:07)
A browser bar; the cursor types `tweetpad.io/party`. The landing slides up: "Launch Party", the three steps, Open now.
- caption: **Start at tweetpad.io/party**
- the cursor clicks **Throw a party**.

### 2 · The coin (0:07–0:13)
"Launch a crew bundle". A picture drops into the image well (pops in); the cursor types the name **Crew** and the ticker **CREW**
(the byte counters tick down).
- caption: **Name your coin.**

### 3 · The party (0:13–0:22)
The cursor works the form, each control lighting as it's touched:
- Seats: taps **+** to 10; seat price: the **0.1** preset. The raise line counts up: **Raise 1 SOL ≈ $105 · one buy at launch, 10 equal shares**.
- Creator fees: **The crew** (split by the seats).
- Who can join: **Token holders** → the **$TP holders** preset → "58 wallets hold 1,000,000 $TP or more".
- Coins unlock: **3 days**.
- captions: **Pick the seats and the price.** → **Pick who can join.**

### 4 · Open it (0:22–0:27)
The curve preview fills to **4.31%** ("The crew's buy 0.99 SOL · Each seat gets 3.42M · Graduates at ~85 SOL"); Due now totals up.
The cursor presses **Open the party**; a wallet sheet slides up ("Confirm in your wallet"), confirms; the done page: the coin's picture,
**Your party is open**, $CREW · 10 seats · 0.1 SOL each, one seat taken (You).
- caption: **One signature. Your party is open.**

### 5 · Post it (0:27–0:32)
The cursor presses **Tweet your party**: an X post types itself ("Throwing a launch party: $CREW on @pumpfun. 10 seats at 0.1 SOL,
refundable until launch… For $TP holders.") and posts, and the room's card appears in it.
- caption: **Post it on X.**

### 6 · The crew takes seats (0:32–0:41)
Inside the post's card, the seats fill one by one (Nouns drop in), each with a toast ("@gm_kai took a seat 4/10"); the tiles count down
"Seats left"; the curve bar steps 0.44% → 4.31% by the real steps. A wallet with no $TP bounces off ("Hold $TP? Ask to join").
- captions: **Your crew takes seats right in the post.** → **Refundable until launch.**

### 7 · Launch (0:41–0:46)
Full: the button turns pump.fun green, **Launch $CREW on pump.fun**. Pressed: every seat sends a gold line into one buy; the card turns
to the launched view: **Launched on pump.fun**, the contract address with **Copy**, the market cap.
- caption: **Every seat buys at once, at one price.**

### 8 · Claim (0:46–0:51)
Your seats: **3.42M $CREW**, the unlock bar filling over 3 days ("40% unlocked · all of it in 1d 19h"), **Claim 1.37M $CREW** pressed →
"Claimed". Crew fees ride along: **Collect 0.012 SOL in crew fees**.
- caption: **Claim as they unlock. The crew shares the fees.**

### 9 · End (0:51–0:55)
The ring again, tweetpad in the middle.
- **Launch Party**
- *Bundle a coin with a crew on pump.fun*
- chip: **Live now · tweetpad.io/party**
- *Powered by the @launchpartyV4 SDK*
- footer: Refundable until launch. Not affiliated with pump.fun; parties launch through pump.fun's public programs.

## Build notes
- Reuse from `PartyFilm.tsx`: the canvas, `Words`, `Chip`, the crew and `Pfp`, the curve math and its steps; from the site: the room card
  (dark glass, Inter Tight numbers) rebuilt as React, matching `assets/party.css` (the hairline layout, the green launch button).
- New: a `Cursor` (click ripple), a typed field, the wallet sheet, the X compose box. The ring is the landing's (`party/index.html`).
- Stills to check before rendering: 0 (poster), the raise line, the done page, the full card, the launched view, the end card.
