# tweetpad square promo (Remotion)

A 1080×1080, 30 fps, 37 s promo for tweetpad. It rebuilds the X player card UI (`/embed.html`, 2012 skin, optional
Tweetcraft) in React/CSS, then shows the Robinhood Chain launch (Launch Party's solo launcher), picked with the tab-bar chain switch.
Read `../SKILL.md` first: it has the facts, claim rules, script, render commands and QA checklist.

```bash
npm ci
npm run typecheck
npx remotion studio src/index.ts
npm run render          # ../out/tweetpad-square.mp4
npm run render:craft    # ../out/tweetpad-square-tweetcraft.mp4
npm run stills          # ../out/stills/*.png
```

Copy and timing: `src/timeline.ts`. `EVM_STATUS` is `"live"`: Robinhood launches shipped in the card.
Fonts in `public/fonts/` are OFL (Google Fonts: Inter, Fredoka, Gelasio, Pixelify Sans, VT323, Doto).

## Film 2: How to launch

`npm run render:howto` renders the `TweetpadHowToLaunch` composition to `../out/tweetpad-how-to-launch.mp4`. It is Solana only. See SKILL.md section 8, which also covers the `CLAIM_FIRST` flag in `src/timeline.ts`.

## Film 3: Now on Robinhood Chain

`npm run render:robinhood` renders the `TweetpadRobinhoodUpdate` composition (44.5 s) to `../out/tweetpad-robinhood-update.mp4`. See SKILL.md section 9.
