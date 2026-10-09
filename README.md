# Wallet Embed Probe

Answers one question before you build the launchpad: **can a Solana wallet connect and sign from inside an X Player Card iframe?**

| File | Role |
| --- | --- |
| `index.html` | The page you post. Carries the Player Card meta tags; also frames the probe same-origin as a control. |
| `embed.html` | The probe X loads in the iframe (`twitter:player`). No dependencies, no build step. |
| `preview.png` | `twitter:image` (1080x1080). |

## Deploy

1. In `index.html`, the card URLs point at `twitterpad.vercel.app`, and `twitter:site` is `@Prawnsfamily`; change them if you deploy elsewhere.
2. Upload the three files to the root of any HTTPS static host.
3. Make sure the host does **not** send `X-Frame-Options` for `embed.html`. To restrict framing to X instead of leaving it open, send:

   ```
   Content-Security-Policy: frame-ancestors 'self' https://x.com https://*.x.com https://twitter.com https://*.twitter.com
   Cache-Control: no-store
   ```

4. Post `https://YOUR_DOMAIN/?v=1`. X caches cards per URL, so bump `v` whenever you change the tags.

## Test matrix

Run each row, do Connect → Sign message → Sign transaction, then copy the Report tab.

| # | Where | What it tells you |
| --- | --- | --- |
| 1 | `embed.html` opened directly | Baseline. Wallets must appear here or the setup is wrong. |
| 2 | `index.html` | Same-origin iframe. Separates "iframes in general" from "cross-origin iframes". |
| 3 | The post on desktop x.com, expanded | The real answer. Check the Environment tab for `ancestorOrigins` and `sandboxedOpaqueOrigin`. |
| 4 | Row 3, Fallbacks tab → Open popup bridge | Whether a popup on your origin can connect and report back into the frame. |
| 5 | The post in the X mobile app | Expected to open a browser rather than play inline. The report shows which context you landed in. |

Repeat row 3 with each wallet extension you care about (Phantom, Solflare, Backpack): they do not all inject into iframes the same way.

## What the probe does

- Detects wallets through Wallet Standard, legacy globals (`window.phantom.solana`, `window.solflare`, `window.backpack`) and EIP-6963 (EVM, for comparison).
- **Sign message** verifies the returned Ed25519 signature in the browser.
- **Sign transaction** builds a 0-lamport transfer from the wallet to itself, asks the wallet to sign it, verifies the signature, and **never broadcasts it**.
- Defaults to mainnet (the probe transaction is never broadcast) using the publicnode RPC, since `api.mainnet-beta.solana.com` rejects browser requests. Options: `embed.html?cluster=devnet`, `embed.html?rpc=https://your-rpc`.
- Does not test the WalletConnect (Reown) protocol; that needs a project ID and their SDK.
