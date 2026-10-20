# Party in a post: pump.fun parties on tweetpad and X

The UX and X plan for bringing Launch Party's pump.fun party into tweetpad. A host opens a room of seats at one price,
friends take refundable seats, and launch creates the coin on pump.fun with every seat's money as its first buy
(`launchpartyV4/docs/PUMPFUN-PARTY-FRONTEND-SPEC.md` has the rules; this doc doesn't repeat them).

**The idea in one line: a coin your timeline launches together, one seat at a time, right inside the post.**

Written 2026-10-16. The party program is live on devnet only; mainnet is reserved, not deployed. Everything below that
touches money says "Devnet · test SOL" until it is.

## Status

**Mainnet (2026-10-19), following Launch Party's integration guide** (launchpartyV4 `docs/PUMPFUN-PARTY-INTEGRATION.md`, SDK from
`c341c4a`): party_pump `8hXVfRTobBpfhFHajEktYM7cVhpfmacKmBhC2tjtwDjC`, chainId 792703809.
- The browser reads and sends through `api/rpc.js`, a proxy to the keyed RPC (`SOLANA_RPC_URL`, server-side only; Solana's public RPC
  without it). It forwards only the SDK's methods, and getProgramAccounts only for party_pump. Priority fee 50,000 µlamports/CU.
- `/p/<room>` reads mainnet first; a room that isn't there is read on devnet (the test rooms), which then says "Devnet · test SOL".
  `/party` opens on mainnet (`?net=devnet` for a test).
- Buttons follow the chain (guide §5): the host cancels (asked twice), takes back the spare launch reserve (`pumpReserveSpare`), and
  anyone sweeps a finished party (`pumpSweepable`).
- Copy (§8): the upgrade-key line ("The seat money sits in Launch Party's party program until launch, and Launch Party holds the key
  that can update that program"), pump.fun's own fee, "Not affiliated with pump.fun; parties launch through pump.fun's public
  programs." The card keeps the short line and has the rest under "How it works".
- Checked read-only on mainnet: party.studio's rehearsal rooms ($RHHOLD, $RHCREW) show as launched, with crew fees to collect.
- Metadata (guide §5.7, real coins want IPFS): pump.fun's IPFS, then Filebase (`FILEBASE_KEY`, `FILEBASE_SECRET`, `FILEBASE_BUCKET`,
  `FILEBASE_GATEWAY`; pinned through its S3 API as party.studio does, the CID read back, the gateway checked before the link is used),
  then Pinata, then tweetpad.io/m/ as the last resort.
- Before real users: a keyed `SOLANA_RPC_URL` and the Filebase keys in Vercel, then a small mainnet rehearsal through the form (guide §9).

**Phase 1 (devnet):**
- **The room page and X card, `/p/<room>`** (`api/p.js`, `party/room.html`, `assets/party.js`, `assets/party.css`), in `?embed`, `?popup`, `?card` and page modes:
  - it reads the room live through the SDK bundle (`assets/vendor/party-sdk.js`, built by `scripts/build-party-sdk.mjs` from launchpartyV4);
  - seats show holders' @handles from tweetpad profiles.
- **Tested end to end on devnet through the page** with a Wallet Standard test wallet: take a seat, the per-wallet cap, refund, launch a full room (anyone), collect crew fees, claim, close seats, a cancelled room's "Refund everyone".
- **In X's card**, with no wallet, Take a seat opens the pop-out (`?popup`) on desktop and offers open-in-wallet links on phones.
- **The host form, `/party`** (`party/new.html`, `assets/party-new.js`): coin, terms, the curve preview, due now, open, tweet.
- **Who can join** (Launch Party's on-chain whitelist, party_pump `set_allowlist`, up to 1,000 wallets; the room opens locked):
  - *Whitelist*: the host pastes wallets; on the room page the host edits the list or lets anyone join (`#wl-sheet`).
  - *Token holders* (`api/party-gate.js`): tweetpad builds the whitelist from a Solana token's holders now (mainnet, top 1,000 by
    balance, an optional minimum), and keeps the rule beside the room (Redis `party:gate:<room>`, first write wins). It rolls: a
    holder who isn't listed presses "Ask to join", tweetpad checks the balance and queues them, and the host's "Refresh from $X
    holders" rewrites the list from the holders then (new holders in, sellers out; seats already taken stay). The program only
    knows the list, and only the host can write it, so a refresh needs the host's signature. A fully automatic gate would need
    party_pump to check the token balance itself at take_seat.
  - Tested on devnet: a whitelisted room refuses an unlisted wallet and admits it once added; a $TP holders room (1M+) queues a
    holder left off, refuses a wallet without $TP, and the host's refresh took the list from 50 to 58.

**Next:**
- "Launch a party" in the Launch tab (the form is at `/party`);
- live card images per room;
- invite by @handle (a whitelist from tweetpad profiles' wallets);
- the keeper (auto-launch, auto-claim, collect, sweep);
- the Parties channel.

## 1. Why it's bullish (and true)

Every hook below is a mechanism the program already enforces, so the copy can say it plainly:

| What people feel | Why it's true | How we say it (spec §8) |
|---|---|---|
| "Everyone's in at the same price" | every seat costs the same, and all of them buy in one first buy at launch | "Every seat buys at launch, at the same price." |
| "Nothing to lose by joining early" | a seat refunds in full until launch; once cancelled, anyone can refund everyone | "Refundable until launch." |
| "It's filling up" | seats, and the curve the crew's buy will reach, update as seats are taken | "7 of 10 seats · the crew's buy takes the curve to 34%" |
| "It goes the moment it's full" | once every seat is taken, *anyone* may launch; tweetpad's keeper presses it | "Launches the moment the last seat fills." |
| "My coins just arrive" | anyone may send a seat's claim; it pays only the seat's owner | "Your coins land in your wallet." |
| "The crew earns" | crew mode makes the room the coin's creator; anyone may collect, every open seat gets an equal share | "Creator fees go to the crew." |

Never: "guaranteed", "no snipers", "sniper protection", "APY", "first". Every surface carries the line *Launch Party
isn't affiliated with pump.fun; parties launch through pump.fun's public programs*, and shows pump.fun's 1.25% trade fee.

## 2. The loop on X

```
host opens a room on tweetpad ──▶ tweets the room link ──▶ the post IS the room (X player card)
        ▲                                                         │ tap "Take a seat"
        │                                                         ▼
  followers see receipts ◀── "I'm in: seat 4/10 of $TICKER" ◀── signs in the pop-out (or the wallet app)
                                                                  │ last seat taken
                                                                  ▼
            keeper launches (permissionless) ──▶ the same post flips to the live coin: chart, trade, claims
                                                                  │
                                       keeper claims for every seat; Dot gives the quant read in the post
```

Each step is a reason to post again, and every post carries the same live card.

## 3. The surfaces

### 3a. The X card (`tweetpad.io/p/<room>`, 480×480)

One card, four faces that follow the chain (`readPumpRoom`, spec §5.1):

- **Open:**
  - the coin's image, name and ticker;
  - **the seat grid** (10–40 dots; a filled dot shows the holder's avatar and @handle from tweetpad profiles, or a short
    wallet if unlinked);
  - **the curve bar** ("the crew's buy takes the curve to N%", from `pumpLaunchMath`), rising with every seat;
  - the price per seat, "up to N a wallet" or "invite-only";
  - one big button: **Take a seat**;
  - under it, always: **Refundable until launch** and, for holders, a **Refund** link.
- **Full / launching:** "Last seat taken. Launching…", the curve bar filling to its launch mark, then the coin.
- **Launched:** tweetpad's existing coin card (chart, buy and sell on the curve, holders), plus a seat strip: "your seat: 1.2M $TICKER · Claim" and, in crew mode, "crew fees waiting · Collect". A graduated coin links to pump.fun.
- **Cancelled:** "The host cancelled. Every seat refunds in full", with **Refund everyone** (anyone can press it).

Invite-only: before anyone taps, the card says whether *this* wallet is on the list (spec §5.3). The host always gets in.

### 3b. Signing from inside a post

X's card can't reach a wallet extension, and on phones there's no wallet in X's browser at all. tweetpad already solves
this for launches and trades:
- desktop: the pop-out window (`?popup`);
- phones: open-in-wallet links.

Take a seat, Refund, Claim and Launch all go through the same path. The plan is built on tap, never on load: plans expire
after 60 s.

### 3c. The room page and the host form

- **Launch tab:** a two-way switch, **Launch alone** (today's pump.fun launch) or **Launch a party**. The party form is the
  spec's host form: seats, price, fee mode, cap, invite-only, the live "curve at launch". It ends on **Open the room and
  tweet it**, which opens X with the post pre-written.
- **Room page (`/p/<room>`):** the card's faces at full size, plus who's in, the invite list, Send a seat, the host's
  Cancel and Withdraw reserve, and Sweep once finished (spec §3).
- **Menu and Tokens:** a **Parties** channel (open rooms, filling fastest first) and a Parties filter on Tokens for
  coins that launched as a party, marked with a small "party of 10" badge.

### 3d. Agents in the room

- A host can put their **agent** in the room's card: a character that greets visitors, answers "how does this work?"
  with Grok, and reacts when a seat fills. The kit needs one new read for this: `tp.party(room)`, returning the room's
  public state.
- **Dot** gives the quant read on the coin the moment it launches, in the same post.

## 4. What tweetpad adds on top of the SDK

| Piece | What it is | Builds on |
|---|---|---|
| Room card and page | `/p/<room>` in `?embed`, `?popup`, `?card` modes, reading the room through `@launchparty/core/solana` | tweetpad's card modes |
| Live card image | `/p/<room>/card.png` per state: seats filled, the curve bar, "Launched" (fills spec §9's "no link previews") | `api/card-image.js` |
| Handles on seats | each seat's owner shown as a verified @handle | `api/profile.js` (wallet ↔ X, signed + tweeted) |
| **Invite by @handle** | the host types @handles; tweetpad turns each verified handle into its wallet and writes the wallet list the program checks. An unverified handle gets a "link your wallet on tweetpad to be invited" prompt | profiles; the program's wallet allowlist (the program never sees handles) |
| **Auto-launch, auto-claim, collect** | the keeper launches full rooms, sends every seat's claim, collects crew fees and sweeps finished rooms. All of these are permissionless and pay only their rightful owners | `api/keeper.js` (Vercel Cron) |
| Seat receipts | after a seat lands, "Share your seat" opens X with "I'm in: seat 4 of 10 in the $TICKER party" and the room link | X web intents |
| Rooms list | open rooms for the Parties channel. There's no indexer, so read `listPumpRooms` and cache it | a cached API route |

## 5. Tweets

**The host's post** (pre-written by the form):
> Throwing a launch party: $TICKER on @pumpfun. 10 seats at 0.5 SOL, refundable until launch. Every seat buys at the same
> price, in one first buy. Take a seat 👇 tweetpad.io/p/…

**A seat receipt:**
> I'm in: seat 4 of 10 in the $TICKER party. 6 left. tweetpad.io/p/…

**From @tweetpad_io** (phase 2: milestone posts by the keeper, quote-tweeting the host's post):
- "Room full: $TICKER launches now"
- "Launched: $TICKER, a party of 10. Coins are landing in every seat"

**Announcement thread (mainnet day):**
1. Launch parties are live on tweetpad: launch a coin on @pumpfun with your friends, from a post.
2. A host opens 10 seats. The timeline fills them. Refundable until launch.
3. The last seat launches it, and every seat buys at the same price, in one first buy.
4. The post becomes the coin: chart, trades and everyone's coins land automatically.
5. Throw one: tweetpad.io/party. Not affiliated with pump.fun; parties launch through pump.fun's public programs.

## 6. Rollout

1. **Now (devnet):**
   - build the card and room page against devnet, labelled "Devnet · test SOL";
   - post a playable test party from @tweetpad_io ("try it with test SOL");
   - film the loop (open, fill, launch, claim) for the teaser.
2. **Mainnet day:** once `party_pump` is deployed and `PARTY_PUMP` has its mainnet entry:
   - switch the label off and turn the keeper on;
   - post the thread, and host the first party publicly with the film.
3. **After:**
   - milestone posts from @tweetpad_io;
   - agents in rooms (`tp.party`);
   - parties on the Bordrless DEX (native SOL quotes) once it's a supported pair.

## 7. Open questions

- **Mainnet:** when is `party_pump` deployed, and who signs the upgrade authority?
- **Keeper costs:** who pays its transaction fees for launching and claiming? Each is a small SOL amount per room; a
  tweetpad budget, or a few lamports from each room's reserve?
- **X automation:** do milestone posts from @tweetpad_io stay within X's automation rules, and at what volume?
- **Invite by @handle:** profiles map wallet → handle today. The reverse lookup (handle → wallet) needs an index.
- **Caps:** a cap alone is beaten with more wallets (spec §5.4). Do we encourage invite-only for public hype rooms, or
  show "up to N a wallet" plainly and let hosts choose?
