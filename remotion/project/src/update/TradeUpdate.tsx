/**
 * TweetpadTradeUpdate: "Now: buy and sell inside the tweet.", the trading + Jito bundles update. 1080x1080 @30, 2012 skin, 24.8 s.
 * Keeps film 3's look (centred captions, the app at ×1.55 under the how-to's camera). Every app string is verbatim from
 * embed.html + assets/tweetpad.js: renderTokens (chain badges, the chain filter), renderTrade (Buy | Sell, Slippage, presets,
 * the quote line, "⚡ Jito bundle", the status line), runTrade's statuses and setVerdict toast, and onLaunch's check lines
 * with the launch form's "⚡ Bundle with Jito" row. Demo coins and demo amounts only (the quote and holding are the
 * owner-supplied live-curve figures), xxxx…xxxx addresses.
 * A Jito bundle here is ONE wallet sending its own transaction (a launch bundles its own create + dev buy): never multi-wallet.
 */
import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { skinOf } from "../brand/tokens";
import { Caption, Cursor, cursorAt, Fine, Ground } from "../components/Film";
import { LaunchForm, LaunchFormProps } from "../components/LaunchForm";
import { CoinView, DemoCoin, TokenList, TradeBox, TradeBoxProps, TradeEst, TradeStatus } from "../components/Views";
import { AppFrame, OfficialStrip, SkinCtx, Tab, Toast, WelcomeTweet } from "../components/ui";
import { Cam, camLerp, camMap, CaptionBand, NO_CAM, Stage, WALLET_OK, WalletWindow } from "../howto/parts";
import { lerp, ramp, settle } from "../lib/motion";
import { End } from "../scenes/End";
import { Hook } from "../scenes/Hook";
import { APP, CARD } from "../scenes/layout";
import { TRADE as R, TRADE_COPY as C } from "../timeline";

/* demo coins: $JACK on Solana (the one we trade), $SKY on Robinhood Chain */
const JACK: DemoCoin = { name: "Jumping Jack", symbol: "JACK", age: "2m", color: "#e8a33c" };
const SKY: DemoCoin = { name: "Night Sky", symbol: "SKY", age: "4m", color: "#2b3a67", robinhood: true };
const COINS: DemoCoin[] = [
  JACK, SKY,
  { name: "Hello Timeline", symbol: "GM", age: "9m", color: "#1DA1F2" },
  { name: "Such Launch", symbol: "WOW", age: "31m", img: "brand/agent-inu.jpg", robinhood: true },
  { name: "Hashtag", symbol: "HASH", age: "48m", color: "#2e9e4f" },
  { name: "tweetpad", symbol: "TP", age: "", img: "brand/tweetpad-hash-256.png" },
];
/** owner-supplied figures from the live pump.fun curve, printed as the app's fmtQty would (5% slippage: min = fmtQty(0.097 × 0.95) = "0.0921") */
const Q = { out: "2.7M", min: "2.6M", sold: "0.097", soldMin: "0.0921" };
const W = C.wallet.name;

const FS_TRADE = 150;  // coin page scroll with the whole trade box in view
const FS_JITO = 270;   // launch form scroll with the dev-buy box, the Jito row and the button in view
const FS_CHECKS = 360; // …while the check lines run
/** the trade box close-up, and a wider shot that keeps the toast (bottom of the card) in frame */
const CAM_TRADE: Cam = { z: 1.4, fx: 230, fy: 230, k: 0.55 };
const CAM_WIDE: Cam = { z: 1.15, fx: 230, fy: 310, k: 0.4 };

/** app-px click targets, each at the scroll its scene uses (checked against stills) */
const T = {
  jackRow: [210, 150],                  // Tokens, scroll 0: the $JACK row
  chip01: [289, 202], buy: [230, 313],  // FS_TRADE: the 0.1 chip, the Buy button
  sellTab: [174, 164], chip100: [346, 202], sell: [230, 313],
  launch: [230, 413],                   // FS_JITO: the Launch button
} as const;

const inWin = (f: number, a: number, b: number) => f >= a && f < b;
const capFade = (f: number, dur: number) => ramp(f, 0, 12) * (1 - ramp(f, dur - 10, dur, settle));

/* ---------- one shot: the app under a camera, a centred caption, a cursor (as film 3) ---------- */
type Key = [number, number, number] | [number, number, number, "film"]; // app px, or raw film px (wallet window)
type Cap = { head: string; head2?: string; sub?: string };
type ShotProps = {
  f: number; cam: Cam; scroll: number; tab?: Tab; toast?: React.ReactNode; extra?: React.ReactNode; children: React.ReactNode;
  caps: { cap: Cap; t: number }[];
  cursor?: { keys: Key[]; down: boolean; t: number; hand?: boolean; size?: number };
  fine: { text: string; t: number }[];
};
const Shot: React.FC<ShotProps> = ({ f, cam, scroll, tab = "tokens", toast, extra, children, caps, cursor, fine }) => {
  const m = camMap(cam);
  const cur = cursor ? cursorAt(f, cursor.keys.map(([k, x, y, film]) => (film ? [k, x, y] : [k, m(x, y).x, m(x, y).y]) as [number, number, number])) : null;
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <AppFrame scale={APP.scale} tab={tab} tokenCount={COINS.length} scrollY={scroll} connected toast={toast}>{children}</AppFrame>
      </Stage>
      <CaptionBand />
      {caps.map(({ cap, t }, i) => (t > 0 ? <Caption key={i} head={cap.head} head2={cap.head2} sub={cap.sub} t={t} y={30} /> : null))}
      {fine.map(({ text, t }, i) => (t > 0 ? <Fine key={i} text={text} t={0.9 * t} /> : null))}
      {extra}
      {cur && cursor ? <Cursor x={cur.x} y={cur.y} down={cursor.down} t={cursor.t} hand={cursor.hand} size={cursor.size} /> : null}
    </AbsoluteFill>
  );
};

/* ---------- 1. hook ---------- */
const HookScene: React.FC = () => <Hook tag={C.hook.tag} head={C.hook.head} head2={C.hook.head2} tweet={C.hook.tweet} />;

/* ---------- 2. the card opens on Tokens: chain badges and the chain filter; tap $JACK ---------- */
const Tokens: React.FC = () => {
  const f = useCurrentFrame(); const d = R.tokens.dur;
  const g = ramp(f, 0, 24, settle);
  const tap = 66;
  const capT = ramp(f, 10, 24) * (1 - ramp(f, d - 8, d, settle));
  const list = <TokenList rows={6} coins={COINS} badges filter="all" highlight={f >= tap - 10 ? 0 : -1} appear={(i) => ramp(f, 14 + i * 3, 24 + i * 3)} />;
  // the badges are small: lean in on the list while it lands
  const cam = camLerp(NO_CAM, { z: 1.3, fx: 200, fy: 190, k: 0.35 }, ramp(f, 26, 50, settle));
  if (g < 1) {
    const x = lerp(CARD.x, APP.x, g), y = lerp(CARD.y, APP.y, g);
    const w = lerp(CARD.w, APP.w * APP.scale, g), h = lerp(CARD.h, APP.h * APP.scale, g);
    const scale = w / APP.w;
    return (
      <AbsoluteFill>
        <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: lerp(16, 10, g), overflow: "hidden", border: "1px solid #c8c8c8", boxShadow: `0 ${20 * g}px ${60 * g}px rgba(20,23,26,${0.18 * g})` }}>
          <AppFrame scale={scale} h={h / scale} tab="tokens" tokenCount={COINS.length} connected>{list}</AppFrame>
          <Img src={staticFile("brand/card-preview.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 1 - ramp(f, 2, 14) }} />
        </div>
        <Caption head={C.tokens.head} sub={C.tokens.sub} t={capT} y={30} />
        <Fine text={C.fine.list} t={0.9 * ramp(f, 8, 18)} />
      </AbsoluteFill>
    );
  }
  return (
    <Shot f={f} cam={cam} scroll={0} caps={[{ cap: C.tokens, t: capT }]} fine={[{ text: C.fine.list, t: 1 }]}
      cursor={{ keys: [[24, 980, 1040, "film"], [tap - 8, ...T.jackRow], [d, ...T.jackRow]], down: inWin(f, tap, tap + 6), t: ramp(f, 24, 34) }}>
      {list}
    </Shot>
  );
};

/* ---------- the coin page with its trade box ---------- */
const CoinPage: React.FC<{ coin: DemoCoin; trade: TradeBoxProps }> = ({ coin, trade }) => (
  <CoinView drawT={1} coin={coin} badge chain={coin.robinhood ? "robinhood" : "solana"} rewards="0.00120 ETH" trade={<TradeBox {...trade} />} />
);
const jack = (p: Partial<TradeBoxProps>): TradeBoxProps => ({ side: "buy", symbol: JACK.symbol, est: { kind: "idle" }, jito: true, button: "Buy $JACK", ...p });

/* ---------- 3. buy: 0.1 → quote → Buy → approve → Jito bundle → Bought ---------- */
const Buy: React.FC = () => {
  const f = useCurrentFrame(); const d = R.buy.dur;
  const chipAt = 44, quoted = 60, buyAt = 80, winIn = 86, ok = 112, send = 116, confirm = 146, done = 164;
  const busy = f >= buyAt + 2 && f < done;
  const est: TradeEst = f >= done ? { kind: "idle" } : f >= quoted ? { kind: "quote", out: Q.out, min: Q.min } : f >= chipAt ? { kind: "quoting" } : { kind: "idle" };
  const status: TradeStatus | null = f >= done ? { tone: "ok", text: `Bought ≈ ${Q.out} $JACK`, tx: true }
    : f >= confirm ? { tone: "warn", text: "Confirming…", tx: true }
    : f >= send ? { tone: "warn", text: "Sending as a Jito bundle…" }
    : f >= buyAt + 2 ? { tone: "warn", text: `Approve in ${W}…` } : null;
  const picked = f >= chipAt && f < done; // runTrade clears the amount once it lands
  const trade = jack({ amount: picked ? "0.1" : "", chip: picked ? 1 : -1, est, status, button: busy ? "Working…" : "Buy $JACK",
    pressed: inWin(f, buyAt, buyAt + 5), disabled: f >= done || f < chipAt });
  const scroll = lerp(0, FS_TRADE, ramp(f, 4, 30, settle));
  // push into the trade box; ease back out when it lands so the toast shows
  const cam = camLerp(camLerp(NO_CAM, CAM_TRADE, ramp(f, 8, 34, settle)), CAM_WIDE, ramp(f, done - 2, done + 16, settle));
  const winT = ramp(f, winIn, winIn + 10) * (1 - ramp(f, ok + 4, ok + 12));
  const capA = ramp(f, 0, 12) * (1 - ramp(f, 104, 114, settle));
  const capB = ramp(f, 116, 128) * (1 - ramp(f, d - 10, d, settle));
  return (
    <Shot f={f} cam={cam} scroll={scroll} caps={[{ cap: C.buy, t: capA }, { cap: C.bundle, t: capB }]}
      fine={[{ text: C.fine.sol, t: 1 - ramp(f, 110, 118) }, { text: C.fine.jito, t: ramp(f, 118, 126) }]}
      toast={<Toast title="Bought $JACK!" text={`Bought ≈ ${Q.out} $JACK`} t={ramp(f, done, done + 8)} />}
      extra={winT > 0 ? <WalletWindow kind="approve" t={winT} pressed={inWin(f, ok, ok + 6)} /> : null}
      cursor={{ keys: [[0, ...T.jackRow], [24, 300, 260], [chipAt - 6, ...T.chip01], [chipAt + 8, ...T.chip01], [buyAt - 6, ...T.buy], [buyAt + 6, ...T.buy],
        [winIn + 14, WALLET_OK.x + 30, WALLET_OK.y + 50, "film"], [ok - 4, WALLET_OK.x, WALLET_OK.y, "film"], [ok + 18, WALLET_OK.x, WALLET_OK.y, "film"], [d, ...T.sellTab]],
        down: inWin(f, chipAt, chipAt + 5) || inWin(f, buyAt, buyAt + 5) || inWin(f, ok, ok + 5), t: 1, hand: true, size: 1.3 }}>
      <CoinPage coin={JACK} trade={trade} />
    </Shot>
  );
};

/* ---------- 4. sell it all back: 100% → quote → Sell → approve → Jito bundle → Sold ---------- */
const Sell: React.FC = () => {
  const f = useCurrentFrame(); const d = R.sell.dur;
  const tabAt = 12, chipAt = 32, quoted = 46, sellAt = 60, winIn = 64, ok = 84, send = 90, confirm = 112, done = 130;
  const sell = f >= tabAt;
  const picked = f >= chipAt && f < done; // runTrade clears the amount once it lands
  const busy = f >= sellAt + 2 && f < done;
  // after it lands the box still shows the old holding until loadHolding() re-reads it (1.5 s): the film jumps to the re-read
  const est: TradeEst = !sell ? { kind: "idle" } : f >= done ? { kind: "hold", qty: f >= done + 12 ? "0" : Q.out }
    : f >= quoted ? { kind: "quote", out: Q.sold, min: Q.soldMin } : picked ? { kind: "quoting" } : { kind: "hold", qty: Q.out };
  const status: TradeStatus | null = !sell ? { tone: "ok", text: `Bought ≈ ${Q.out} $JACK`, tx: true }
    : f >= done ? { tone: "ok", text: `Sold for ≈ ${Q.sold} SOL`, tx: true }
    : f >= confirm ? { tone: "warn", text: "Confirming…", tx: true }
    : f >= send ? { tone: "warn", text: "Sending as a Jito bundle…" }
    : f >= sellAt + 2 ? { tone: "warn", text: `Approve in ${W}…` } : null;
  const trade = jack({ side: sell ? "sell" : "buy", amount: picked ? Q.out : "", chip: picked ? 2 : -1, est, status,
    button: busy ? "Working…" : sell ? "Sell $JACK" : "Buy $JACK", pressed: inWin(f, sellAt, sellAt + 5), disabled: !picked,
    chipsDisabled: f >= done + 12, sidePressed: inWin(f, tabAt - 2, tabAt + 3) ? "sell" : null });
  const cam = camLerp(camLerp(CAM_WIDE, CAM_TRADE, ramp(f, 2, 16, settle)), CAM_WIDE, ramp(f, done - 2, done + 16, settle));
  const winT = ramp(f, winIn, winIn + 10) * (1 - ramp(f, ok + 4, ok + 12));
  return (
    <Shot f={f} cam={cam} scroll={FS_TRADE} caps={[{ cap: C.sell, t: capFade(f, d) }]} fine={[{ text: C.fine.jito, t: 1 }]}
      toast={<>
        <Toast title="Bought $JACK!" text={`Bought ≈ ${Q.out} $JACK`} t={1 - ramp(f, 6, 14)} />
        <Toast title="Sold $JACK" text={`Sold for ≈ ${Q.sold} SOL`} t={ramp(f, done, done + 8)} />
      </>}
      extra={winT > 0 ? <WalletWindow kind="approve" t={winT} pressed={inWin(f, ok, ok + 6)} /> : null}
      cursor={{ keys: [[0, ...T.sellTab], [tabAt + 8, ...T.sellTab], [chipAt - 6, ...T.chip100], [chipAt + 6, ...T.chip100], [sellAt - 6, ...T.sell], [sellAt + 4, ...T.sell],
        [winIn + 12, WALLET_OK.x + 30, WALLET_OK.y + 50, "film"], [ok - 4, WALLET_OK.x, WALLET_OK.y, "film"], [ok + 14, WALLET_OK.x, WALLET_OK.y, "film"], [d, 900, 1000, "film"]],
        down: inWin(f, tabAt, tabAt + 5) || inWin(f, chipAt, chipAt + 5) || inWin(f, sellAt, sellAt + 5) || inWin(f, ok, ok + 5), t: 1 - ramp(f, d - 14, d - 4), hand: true, size: 1.3 }}>
      <CoinPage coin={JACK} trade={trade} />
    </Shot>
  );
};

/* ---------- 5. a Robinhood coin: ETH presets, Uniswap's side, no Jito row ---------- */
const Rh: React.FC = () => {
  const f = useCurrentFrame(); const d = R.rh.dur;
  const trade: TradeBoxProps = { side: "buy", symbol: SKY.symbol, chain: "robinhood", est: { kind: "idle" }, button: "Connect EVM wallet to trade", buttonKind: "connect" };
  return (
    <Shot f={f} cam={CAM_TRADE} scroll={FS_TRADE} caps={[{ cap: C.rh, t: capFade(f, d) }]} fine={[{ text: C.fine.rh, t: 1 }]}>
      <CoinPage coin={SKY} trade={trade} />
    </Shot>
  );
};

/* ---------- 6. launch: "⚡ Bundle with Jito" → Launch → the check lines (a pending line is replaced by the next check()) ---------- */
type Chk = { text: string; done: boolean; link?: string };
const DONE: Chk[] = [
  { text: "Image and metadata on IPFS", done: true, link: "JSON ↗" },
  { text: "Transaction built · mint xxxx…xxxx", done: true },
  { text: `Signed by ${W} and the new mint`, done: true },
];
const LINES: [number, Chk[]][] = [
  [40, [...DONE, { text: "Sending as a Jito bundle…", done: false }]],
  [62, [...DONE, { text: "Confirming…", done: false, link: "Tx ↗" }]],
  [78, [...DONE, { text: "Confirmed on mainnet", done: true, link: "Tx ↗" }]],
];
const Launch: React.FC = () => {
  const f = useCurrentFrame(); const d = R.launch.dur;
  const click = 30;
  let checks: Chk[] = [];
  for (const [at, c] of LINES) if (f >= at) checks = c;
  const fp: LaunchFormProps = { chain: "solana", image: "brand/agent-inu.jpg", name: "Such Launch", ticker: "WOW", devBuy: 1, jito: true,
    button: f >= click + 4 ? "Launching…" : "Launch $WOW · buy 0.1 SOL", pressed: inWin(f, click, click + 5), checks, ring: f > 6 && f < click - 2 ? "jito" : null };
  const scroll = lerp(FS_JITO, FS_CHECKS, ramp(f, 36, 56, settle));
  const cam = camLerp({ z: 1.5, fx: 230, fy: 330, k: 0.5 }, { z: 1.35, fx: 230, fy: 350, k: 0.5 }, ramp(f, 36, 56, settle));
  return (
    <Shot f={f} cam={cam} scroll={scroll} tab="launch" caps={[{ cap: C.launch, t: capFade(f, d) }]} fine={[{ text: C.fine.launch, t: 1 }]}
      cursor={{ keys: [[0, 860, 1000, "film"], [click - 6, ...T.launch], [click + 10, ...T.launch], [d, 900, 1000, "film"]],
        down: inWin(f, click, click + 5), t: ramp(f, 4, 12) * (1 - ramp(f, d - 30, d - 18)) }}>
      <OfficialStrip /><WelcomeTweet /><LaunchForm {...fp} />
    </Shot>
  );
};

/* ---------- 7. end ---------- */
const EndScene: React.FC = () => <End tagline={C.end.tagline} tagline2={C.end.tagline2} fine={C.end.fine} />;

export const TweetpadTradeUpdate: React.FC<{ skin?: "2012" | "tweetcraft" }> = ({ skin = "2012" }) => {
  loadFonts();
  const f = useCurrentFrame();
  const e = R.end;
  return (
    <SkinCtx.Provider value={skinOf(skin)}>
      <AbsoluteFill>
        <Ground blue={ramp(f, e.from - 6, e.from + 10)} />
        <Sequence from={R.hook.from} durationInFrames={R.hook.dur} name="1 Hook"><HookScene /></Sequence>
        <Sequence from={R.tokens.from} durationInFrames={R.tokens.dur} name="2 Tokens (chain badges)"><Tokens /></Sequence>
        <Sequence from={R.buy.from} durationInFrames={R.buy.dur} name="3 Buy (Jito bundle)"><Buy /></Sequence>
        <Sequence from={R.sell.from} durationInFrames={R.sell.dur} name="4 Sell"><Sell /></Sequence>
        <Sequence from={R.rh.from} durationInFrames={R.rh.dur} name="5 Robinhood coin"><Rh /></Sequence>
        <Sequence from={R.launch.from} durationInFrames={R.launch.dur} name="6 Bundled launch"><Launch /></Sequence>
        <Sequence from={e.from} durationInFrames={e.dur} name="7 End"><EndScene /></Sequence>
      </AbsoluteFill>
    </SkinCtx.Provider>
  );
};
