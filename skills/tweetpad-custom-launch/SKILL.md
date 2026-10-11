---
name: tweetpad-custom-launch
description: Launch a coin on Ethereum through tweetpad with its own Uniswap v4 fee hook (Launch Party's custom launch, "claus" template), fixed or upgradeable, so it is listed on tweetpad. Use when someone asks you to launch a coin on tweetpad on Ethereum, a coin with a fee hook, or to claim its fees or freeze its hook.
---

# tweetpad custom launch (Ethereum)

tweetpad launches a coin on Ethereum mainnet through Launch Party's CustomLaunch (`0x3481909A7067F8DdDd4DD9b3e544256F58Ee7e76`):
a fixed-supply token and a fee hook, one transaction, the pool opened with its liquidity locked. Launch Party reviews the
launch (including a test buy and sell through the new pool) and signs a 30-minute approval; tweetpad checks Launch Party's
answer byte for byte and builds the transaction. **You never sign.** The person signs and sends the transaction from their
own wallet. A launch through tweetpad is listed on tweetpad.io and plays as its own card on X.

The hook's fee (0–5% of every trade) is paid to the person's wallet, in ETH and in the coin. tweetpad takes nothing.
Launch Party takes a one-time 0.001 ETH; gas is about 2.3M (fixed hook) or 3.3M (upgradeable). The launch also sends
0.001 ETH for the sell check, which comes back in the same transaction. A check is not an audit: never call a coin "safe".

Base URL: `https://www.tweetpad.io`. Every request and answer is JSON unless said otherwise.

## 1. Agree the terms with the person

| Field | Values |
|---|---|
| `name` | 1–32 characters |
| `symbol` | 2–10 capital letters or digits |
| image | PNG, JPG, GIF or WebP, up to 4 MB |
| `feePct` | 0, 1, 2, 3 or 5: the hook's fee on every trade, to the person's wallet |
| `openingValue` | "2", "5", "10" or "25": the coin's market cap in ETH when the pool opens |
| `hook` | `fixed` (the hook can never change) or `upgradeable` (the person, as admin, can point it at new logic in public, or freeze it for good) |
| `teamPct` | 0, 5, 10 or 20: a share of supply that vests to the person |
| `teamVestDays` | 30, 60, 90 or 120 (only with a team share) |
| `twitter`, `website` | optional `https://` links |

Show the person these terms and the costs before going on.

## 2. Pin the image and metadata

`POST /api/ipfs` with the raw image bytes as the body:
- headers: `content-type: application/octet-stream`, `x-meta: <URI-encoded JSON { name, symbol, description, twitter, website }>`
  (`description` up to 140 characters; `twitter` and `website` as `https://` links, anything else is dropped)
- → `{ ok, uri, image, sha256, metadata }`. `uri` (the metadata link) and `image` (the image link) are both used below.
- Limit: 10 uploads per IP every 10 minutes.

## 3. Ask Launch Party's review, through tweetpad

Every call in this step carries `chain: "ethereum"` (without it the request is taken for another chain), and the same
fields, byte for byte, in 3.1 and 3.3. `/api/evm-create` allows 15 calls per IP every 10 minutes (3.1 and 3.3 both count).

1. `POST /api/evm-create` with
   `{ chain: "ethereum", step: "request", wallet, name, symbol, uri, feePct, openingValue, hook, teamPct, teamVestDays, twitter, website }`
   → `{ url, body }`.
2. `POST` `body` (as JSON) to `url` (Launch Party's review). It answers in 2–4 s:
   - `200 { ok: true, findings, … }`: approved. `findings` with `level: "flag"` (`UPGRADEABLE_HOOK`, `TEAM_SHARE`) are
     things to tell the person, not errors; a fixed hook with no team share has none.
   - `422 { ok: false, findings }`: refused. Read the `block` messages to the person and change the terms; never resend
     the same request unchanged. `FUNDS` means the wallet needs about 0.003 ETH first.
   - `429`: rate limited (30 per IP and 20 per wallet an hour). Wait.
3. `POST /api/evm-create` with the same fields **without `step`**, plus `image` (the image link from step 2) and
   `prepared` (Launch Party's whole answer from 3.2)
   → `{ tx: { to, data, value, gas, chainId: "0x1" }, token, fee, expiresAt, findings }`.
   `value` and `gas` are hex (wei, and the gas limit: the expected use is about 1/1.2 of it); `expiresAt` is milliseconds
   since the epoch; `token` is the coin's address once it launches. Errors (`error`, in words):

   | Status | Means |
   |---|---|
   | 400 | a field is out of range, the wallet cannot pay (`not enough ETH…`), the launch would fail on chain, or `prepared` is missing |
   | 409 | this metadata is already being launched by another wallet: pin it again (step 2) |
   | 422 | Launch Party refused it (its block messages) |
   | 502 | Launch Party's answer is not exactly what was asked (often: fields changed between 3.1 and 3.3). Start again at 3.1 |

## 4. The person signs and sends

Before handing `tx` over, check: `to` is `0x3481909A7067F8DdDd4DD9b3e544256F58Ee7e76`, `chainId` is `"0x1"`, `value` is
0.002 ETH (`0x71afd498d0000`), and an `eth_call` of `tx` from the person's wallet succeeds and returns `token` as its first word.
Then give the person `tx` to send from **the same wallet** before `expiresAt` (30 minutes). Show them the coin, the fee,
the hook kind, the team share, the value (half of it returned in the transaction) and the gas limit with the expected cost.

## 5. List it

`POST /api/launches` with `{ chain: "ethereum", hash: "<transaction hash>" }` → `{ ok: true, launch }` (`launch.mint` is the
coin's address). Each call waits up to 30 s for the receipt.

| Status | Error | Do |
|---|---|---|
| 404 | `transaction not found yet…` | not confirmed yet: call again |
| 404 | `this coin was not built through tweetpad (or it expired)` | stop: built over an hour ago, or not here |
| 400 | `invalid transaction hash` / `not a launch through Launch Party's CustomLaunch…` / `…not the one built here for this wallet` | stop: wrong hash or wallet |

Then share `https://www.tweetpad.io/c/<launch.mint>`.

## After launch

- **Fees**: `GET /api/rewards?wallet=<0x…>` → `{ evm: true, wallet, chains: [{ chain: "ethereum", symbol: "ETH", amount, perCoin: [{ mint, symbol, amount, coinAmount? }] }] }`:
  `amount` is ETH as a number (`null` if the chain could not be read), `coinAmount` the coin's own fees (left out when
  zero); `chains` is `[]` for a wallet with no coins here. `POST /api/rewards` with `{ wallet, chain: "ethereum" }` →
  `{ ok: true, calls: [{ to, data, label }] }` (or 400 `nothing to claim yet`): the person sends each with no value.
  They are the hook's `collect` (open to anyone; it always pays the fee's recipient, the person's wallet) and, with a
  team share, the vesting escrow's `release`.
- **Freeze an upgradeable hook** (cannot be undone): the person, as the hook's admin, sends `proxyFreeze()` (data
  `0x7d4c8611`, no value) to the coin's hook address (`launch.hook`). Or use https://www.tweetpad.io/custom.
- **Trade** (only coins launched on tweetpad): `GET /api/evm-trade?chain=ethereum&coin=<launch.mint>&side=buy&amount=0.01`
  → `{ expected }` (base units, 18 decimals); `POST /api/evm-trade` with
  `{ chain: "ethereum", coin, side, amount (decimal string), slippageBps (10–5000), wallet }` →
  `{ calls: [{ label, to, data, value (hex) }], expected, minimum }`, sent in order. Buys up to 10 ETH at a time.

## Never

- Sign or send for the person, or hold their keys.
- Say a coin is safe, audited or will go up. Give price predictions or financial advice.
- Launch without showing the terms and costs first, or reuse an approval after `expiresAt`.
