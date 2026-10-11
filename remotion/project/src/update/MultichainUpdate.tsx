/**
 * TweetpadMultichainUpdate: "Now on BNB Chain and Base.", the four-chain update. 1080x1080 @30, 2012 skin, 24.8 s.
 * Keeps films 3–4's look (centred captions, the app at ×1.55 under the how-to's camera). Every app string is verbatim from
 * embed.html + assets/tweetpad.js: the four-logo .net-switch (tab bar + Launch header), EVM_NETS (units, presets, openingFdv),
 * renderLaunch's note and button, renderDevBuy's estimate, renderFeeBox, onLaunchEvm's check lines, renderTokens' chain filter,
 * renderCoinHead's chain line, renderCoinFees and renderTrade's idle EVM box.
 * Demo coins only: $PAWS is the BNB coin this film launches; $BLUE (Base) is shown on its own page, not in the list, so the
 * film never suggests BNB or Base coins already trade on tweetpad. No quoted trade figures on BNB / Base. 0xxx…xxxx addresses.
 */
import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { skinOf } from "../brand/tokens";
import { Caption, Cursor, cursorAt, Fine, Ground } from "../components/Film";
import { EvmLine, LaunchForm, LaunchFormProps } from "../components/LaunchForm";
import { ChainFilter, CoinView, DemoCoin, TokenList, TradeBox } from "../components/Views";
import { AppFrame, Net, NETS_4, netXY, NetTip, OfficialStrip, SkinCtx, Tab, Toast, WelcomeTweet } from "../components/ui";
import { DragFile } from "../howto/HowTo";
import { Cam, camLerp, camMap, CaptionBand, NO_CAM, Stage, WALLET_OK } from "../howto/parts";
import { lerp, ramp, settle, typed } from "../lib/motion";
import { End } from "../scenes/End";
import { Hook } from "../scenes/Hook";
import { APP, CARD } from "../scenes/layout";
import { MULTI as R, MULTI_COPY as C } from "../timeline";
import { EvmWalletWindow } from "./RobinhoodUpdate";

const NAME = "Diamond Paws", TICK = "PAWS";
const IMG = "brand/agent-inu.jpg";
const W = C.wallet;
const HOLDERS = 30;
/* demo coins. The list holds no Base coin and one BNB coin, the one launched here. */
const PAWS: DemoCoin = { name: NAME, symbol: TICK, age: "now", img: IMG, chain: "bnb" };
const BLUE: DemoCoin = { name: "Blue Square", symbol: "BLUE", age: "6m", color: "#7a5af8", chain: "base" };
const COINS: DemoCoin[] = [
  PAWS,
  { name: "Jumping Jack", symbol: "JACK", age: "2m", color: "#e8a33c" },
  { name: "Night Sky", symbol: "SKY", age: "4m", color: "#2b3a67", chain: "robinhood" },
  { name: "Hello Timeline", symbol: "GM", age: "9m", color: "#1DA1F2" },
  { name: "Hashtag", symbol: "HASH", age: "48m", color: "#2e9e4f" },
  { name: "tweetpad", symbol: "TP", age: "", img: "brand/tweetpad-hash-256.png" },
];

/* launch-form scrolls (app px) */
const FS_SOL_BUY = 300;  // Solana form: the dev-buy box, button and note just above the tab bar
const FS_EVM_BUY = 400;  // …on an EVM chain (wallet line + Creator fees box add ~100 px)
const FS_TOP = 240;      // EVM form with the image, name and ticker at the top of the card
const FS_BUY = 330;      // EVM form with the dev-buy presets and the estimate in view
const FS_FEES = 360;     // …with the Launch button in view
const FS_CHECKS = 440;   // …while the check lines run

/** app-px click targets, each at the scroll its scene uses (checked against stills) */
const T = {
  drop: [117, 120], name: [270, 97], ticker: [270, 135], // FS_TOP
  preset05: [238, 362],                                    // FS_BUY: the 0.05 BNB preset
  button: [230, 425],                                      // FS_FEES: the Launch button
  chipBnb: [214, 104], pawsRow: [210, 150],                // Tokens: the BNB filter chip, then the first row
} as const;

const inWin = (f: number, a: number, b: number) => f >= a && f < b;
const capFade = (f: number, dur: number) => ramp(f, 0, 12) * (1 - ramp(f, dur - 10, dur, settle));
const evmLine: EvmLine = { address: W.address, wallet: W.name };
const form = (p: Partial<LaunchFormProps>): LaunchFormProps => ({ chain: "bnb", nets: NETS_4, button: "Add an image", buttonPrimary: false, evmLine, holders: HOLDERS, ...p });
const LaunchTab: React.FC<{ fp: LaunchFormProps }> = ({ fp }) => (<><OfficialStrip /><WelcomeTweet /><LaunchForm {...fp} /></>);

/* ---------- one shot (as films 3–4) ---------- */
type Key = [number, number, number] | [number, number, number, "film"];
type Cap = { head: string; head2?: string; sub?: string };
type ShotProps = {
  f: number; cam: Cam; scroll: number; tab?: Tab; net?: Net; netT?: number; netHover?: Net | null; tokenCount?: number;
  toast?: React.ReactNode; overlay?: React.ReactNode; extra?: React.ReactNode; children: React.ReactNode;
  cap: Cap; capT: number; fine: string;
  cursor?: { keys: Key[]; down: boolean; t: number; hand?: boolean; size?: number };
};
const Shot: React.FC<ShotProps> = ({ f, cam, scroll, tab = "launch", net = "bnb", netT, netHover, tokenCount = 5, toast, overlay, extra, children, cap, capT, fine, cursor }) => {
  const m = camMap(cam);
  const cur = cursor ? cursorAt(f, cursor.keys.map(([k, x, y, film]) => (film ? [k, x, y] : [k, m(x, y).x, m(x, y).y]) as [number, number, number])) : null;
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <AppFrame scale={APP.scale} tab={tab} tokenCount={tokenCount} scrollY={scroll} connected net={net} netT={netT} netHover={netHover} nets={NETS_4} toast={toast} overlay={overlay}>{children}</AppFrame>
      </Stage>
      <CaptionBand />
      <Caption head={cap.head} head2={cap.head2} sub={cap.sub} t={capT} y={30} />
      <Fine text={fine} t={0.9} />
      {extra}
      {cur && cursor ? <Cursor x={cur.x} y={cur.y} down={cursor.down} t={cursor.t} hand={cursor.hand} size={cursor.size} /> : null}
    </AbsoluteFill>
  );
};

/* ---------- 1. hook ---------- */
const HookScene: React.FC = () => <Hook tag={C.hook.tag} head={C.hook.head} head2={C.hook.head2} tweet={C.hook.tweet} />;

/* ---------- 2. the card opens on Launch; tap through the four chains in the tab bar ---------- */
const TAPS: [number, Net][] = [[34, "robinhood"], [58, "bnb"], [82, "base"], [106, "bnb"]];
const Switch: React.FC = () => {
  const f = useCurrentFrame(); const d = R.switch.dur;
  const g = ramp(f, 0, 22, settle);
  let net: Net = "solana", from = 0, at = -99;
  for (const [k, n] of TAPS) if (f >= k) { from = NETS_4.indexOf(net); net = n; at = k; }
  const netT = lerp(from, NETS_4.indexOf(net), ramp(f, at + 1, at + 8, settle)); // the blue slides to the tapped logo
  const evmK = ramp(f, TAPS[0][0] + 1, TAPS[0][0] + 12, settle);                  // the form grows (wallet line + fee box) once
  const scroll = lerp(lerp(150, FS_SOL_BUY, ramp(f, 4, 26, settle)), FS_EVM_BUY, evmK);
  const cam = camLerp(NO_CAM, { z: 1.25, fx: 230, fy: 380, k: 0.4 }, ramp(f, 12, 30, settle));
  const fp: LaunchFormProps = net === "solana" ? { chain: "solana", nets: NETS_4, button: "Add an image", buttonPrimary: false } : form({ chain: net });
  const capT = ramp(f, 10, 24) * (1 - ramp(f, d - 10, d, settle));
  const tapNext = TAPS.find(([k]) => k > f - 10);
  const tip = tapNext && f >= tapNext[0] - 8 && f < tapNext[0] + 6 ? tapNext[1] : null;
  if (g < 1) {
    const x = lerp(CARD.x, APP.x, g), y = lerp(CARD.y, APP.y, g);
    const w = lerp(CARD.w, APP.w * APP.scale, g), h = lerp(CARD.h, APP.h * APP.scale, g);
    const scale = w / APP.w;
    return (
      <AbsoluteFill>
        <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: lerp(16, 10, g), overflow: "hidden", border: "1px solid #c8c8c8", boxShadow: `0 ${20 * g}px ${60 * g}px rgba(20,23,26,${0.18 * g})` }}>
          <AppFrame scale={scale} h={h / scale} tab="launch" tokenCount={5} scrollY={scroll} connected nets={NETS_4}><LaunchTab fp={fp} /></AppFrame>
          <Img src={staticFile("brand/card-preview.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 1 - ramp(f, 2, 14) }} />
        </div>
        <Caption head={C.switch.head} sub={C.switch.sub} t={capT} y={30} />
        <Fine text={C.fine.switch} t={0.9 * ramp(f, 8, 18)} />
      </AbsoluteFill>
    );
  }
  const keys: Key[] = [[18, 1000, 1060, "film"]];
  for (const [k, n] of TAPS) { const [x, y] = netXY(n, NETS_4); keys.push([k - 6, x, y + 2], [k + 4, x, y + 2]); }
  keys.push([d, ...netXY("bnb", NETS_4)]);
  return (
    <Shot f={f} cam={cam} scroll={scroll} net={net} netT={netT} netHover={tip} cap={C.switch} capT={capT} fine={C.fine.switch}
      overlay={tip ? <NetTip net={tip} t={1} /> : null}
      cursor={{ keys, down: TAPS.some(([k]) => inWin(f, k, k + 5)), t: ramp(f, 18, 26), hand: true, size: 1.25 }}>
      <LaunchTab fp={fp} />
    </Shot>
  );
};

/* ---------- 3. fill on BNB: image, name, ticker, 0.05 BNB ---------- */
const Fill: React.FC = () => {
  const f = useCurrentFrame(); const d = R.fill.dur;
  const drop = 16, tap = 84;
  const name = typed(NAME, f, 26, 0.6);
  const ticker = typed(TICK, f, 52, 0.4);
  const caret = f >= 22 && f < 48 ? "name" : f >= 48 && f < 64 ? "ticker" : null;
  const hasImg = f >= drop, buy = f >= tap;
  // renderLaunch, EVM: the first problem, else "Launch $T on BNB" (+ " · buy N BNB")
  const problem = !hasImg ? "Add an image" : !name ? "Add a name" : ticker.length < 2 ? "Ticker: 2–10 letters or numbers" : null;
  const button = problem ?? `Launch $${ticker} on BNB` + (buy ? " · buy 0.05 BNB" : "");
  const toBuy = ramp(f, 64, 80, settle);
  const cam = camLerp(NO_CAM, { z: 1.4, fx: 220, fy: lerp(118, 360, toBuy), k: 0.5 }, ramp(f, 0, 14, settle) * (1 - ramp(f, d - 12, d, settle)));
  // the switch scene ends at the bottom of the form: glide back up to the image, then down to the dev buy
  const scroll = lerp(lerp(FS_EVM_BUY, FS_TOP, ramp(f, 0, 12, settle)), FS_BUY, toBuy);
  return (
    <Shot f={f} cam={cam} scroll={scroll} cap={C.fill} capT={capFade(f, d)} fine={C.fine.launch}
      extra={f < drop + 4 && f > 2 ? <DragFile f={f + 22} drop={drop + 22} /> : null}
      cursor={{ keys: [[0, ...T.drop], [drop - 2, ...T.drop], [22, ...T.name], [46, ...T.name], [50, ...T.ticker], [62, ...T.ticker], [tap - 6, ...T.preset05], [d, ...T.preset05]],
        down: inWin(f, drop, drop + 5) || inWin(f, 22, 26) || inWin(f, 48, 52) || inWin(f, tap, tap + 5), t: 1 }}>
      <LaunchTab fp={form({ image: hasImg ? IMG : null, imageT: ramp(f, drop, drop + 10), name, ticker, caret, devBuy: buy ? 3 : 0, button, buttonPrimary: !problem })} />
    </Shot>
  );
};

/* ---------- 4. launch: onLaunchEvm's check lines on BNB Chain ---------- */
type Chk = { text: string; done: boolean; link?: string };
const IPFS: Chk = { text: "Image and metadata on IPFS", done: true, link: "JSON ↗" };
const BUILT: Chk = { text: "Transaction built and checked against the live launcher", done: true };
const LINES: [number, Chk[]][] = [
  [14, [{ text: "Uploading image and metadata to IPFS…", done: false }]],
  [28, [IPFS, { text: "Building the BNB Chain launch…", done: false }]],
  [42, [IPFS, BUILT, { text: `Approve in ${W.name}…`, done: false }]],
  [80, [IPFS, BUILT, { text: "Confirming on BNB Chain…", done: false, link: "Tx ↗" }]],
  [98, [IPFS, BUILT, { text: `$${TICK} is live on BNB Chain`, done: true, link: "Explorer ↗" }]],
];
const Launch: React.FC = () => {
  const f = useCurrentFrame(); const d = R.launch.dur;
  const click = 8, winIn = 46, ok = 72, live = 98;
  let checks: Chk[] = [];
  for (const [at, c] of LINES) if (f >= at) checks = c;
  const done = f >= live;
  const button = done ? "Launch another" : f >= click + 4 ? "Launching…" : `Launch $${TICK} on BNB · buy 0.05 BNB`;
  const winT = ramp(f, winIn, winIn + 10) * (1 - ramp(f, ok + 4, ok + 12));
  const scroll = lerp(lerp(FS_BUY, FS_FEES, ramp(f, 0, 6, settle)), FS_CHECKS, ramp(f, 14, 36, settle));
  const cam = camLerp(NO_CAM, { z: 1.3, fx: 230, fy: 370, k: 0.4 }, ramp(f, 16, 36, settle) * (1 - ramp(f, d - 24, d - 8, settle)));
  return (
    <Shot f={f} cam={cam} scroll={scroll} tokenCount={done ? 6 : 5} cap={C.launch} capT={capFade(f, d)} fine={C.fine.launch}
      toast={<Toast title="Token launched!" text="Share it: the link plays as its own card on X" t={ramp(f, live, live + 10)} />}
      extra={winT > 0 ? <EvmWalletWindow kind="approve" chain="BNB Chain" t={winT} pressed={inWin(f, ok, ok + 6)} /> : null}
      cursor={{ keys: [[0, ...T.preset05], [click - 4, ...T.button], [click + 20, ...T.button], [winIn + 14, WALLET_OK.x + 30, WALLET_OK.y + 50, "film"], [ok - 4, WALLET_OK.x, WALLET_OK.y, "film"], [ok + 16, WALLET_OK.x, WALLET_OK.y, "film"], [d, 900, 1000, "film"]],
        down: inWin(f, click, click + 5) || inWin(f, ok, ok + 5), t: 1 - ramp(f, d - 30, d - 18) }}>
      <LaunchTab fp={form({ image: IMG, name: NAME, ticker: TICK, devBuy: 3, button, buttonPrimary: true, pressed: inWin(f, click, click + 5), checks })} />
    </Shot>
  );
};

/* ---------- 5. Tokens: badges for every chain; the BNB chip narrows the list ---------- */
const Tokens: React.FC = () => {
  const f = useCurrentFrame(); const d = R.tokens.dur;
  const chipAt = 30, rowAt = 66;
  const filter: ChainFilter = f >= chipAt ? "bnb" : "all";
  const cam = camLerp(NO_CAM, { z: 1.3, fx: 200, fy: 190, k: 0.35 }, ramp(f, 4, 24, settle));
  return (
    <Shot f={f} cam={cam} tab="tokens" scroll={0} tokenCount={COINS.length} cap={C.tokens} capT={capFade(f, d)} fine={C.fine.list}
      cursor={{ keys: [[0, 900, 1000, "film"], [chipAt - 8, ...T.chipBnb], [chipAt + 8, ...T.chipBnb], [rowAt - 8, ...T.pawsRow], [d, ...T.pawsRow]],
        down: inWin(f, chipAt, chipAt + 5) || inWin(f, rowAt, rowAt + 5), t: ramp(f, 2, 10), hand: true, size: 1.2 }}>
      <TokenList rows={6} coins={COINS} badges filter={filter} filterChains={NETS_4} filterPressed={inWin(f, chipAt - 2, chipAt + 3) ? "bnb" : null}
        highlight={f >= rowAt - 8 ? 0 : -1} appear={(i) => (f >= chipAt ? ramp(f, chipAt + 1 + i * 3, chipAt + 9 + i * 3) : ramp(f, i * 2, 8 + i * 2))} />
    </Shot>
  );
};

/* ---------- 6. the BNB coin page: the yellow badge, the chain line, an idle BNB trade box ---------- */
const CAM_TRADE: Cam = { z: 1.4, fx: 230, fy: 230, k: 0.55 };
const FS_TRADE = 150;
const Coin: React.FC = () => {
  const f = useCurrentFrame(); const d = R.coin.dur;
  const push = ramp(f, 26, 50, settle);
  const cam = camLerp({ z: 1.6, fx: 180, fy: 110, k: 0.5 }, CAM_TRADE, push);
  return (
    <Shot f={f} cam={cam} tab="tokens" scroll={lerp(0, FS_TRADE, push)} tokenCount={COINS.length} cap={C.coin} capT={capFade(f, d)} fine={C.fine.coin}>
      <CoinView drawT={ramp(f, 0, 30) * 0.3} coin={PAWS} badge chain="bnb" holders={HOLDERS} rewards="0.00000 BNB" rewardsClaimable={false}
        trade={<TradeBox side="buy" symbol={TICK} chain="bnb" est={{ kind: "idle" }} button={`Buy $${TICK}`} disabled />} />
    </Shot>
  );
};

/* ---------- 7. Base: the same box, in ETH ---------- */
const Base: React.FC = () => {
  const f = useCurrentFrame(); const d = R.base.dur;
  return (
    <Shot f={f} cam={{ z: 1.05, fx: 230, fy: 245, k: 0.3 }} tab="tokens" scroll={40} tokenCount={COINS.length} cap={C.base} capT={capFade(f, d)} fine={C.fine.coin}>
      <CoinView drawT={1} coin={BLUE} badge chain="base" holders={0}
        trade={<TradeBox side="buy" symbol={BLUE.symbol} chain="base" est={{ kind: "idle" }} button={`Buy $${BLUE.symbol}`} disabled />} />
    </Shot>
  );
};

/* ---------- 8. end ---------- */
const EndScene: React.FC = () => <End tagline={C.end.tagline} tagline2={C.end.tagline2} fine={C.end.fine} />;

export const TweetpadMultichainUpdate: React.FC<{ skin?: "2012" | "tweetcraft" }> = ({ skin = "2012" }) => {
  loadFonts();
  const f = useCurrentFrame();
  const e = R.end;
  return (
    <SkinCtx.Provider value={skinOf(skin)}>
      <AbsoluteFill>
        <Ground blue={ramp(f, e.from - 6, e.from + 10)} />
        <Sequence from={R.hook.from} durationInFrames={R.hook.dur} name="1 Hook"><HookScene /></Sequence>
        <Sequence from={R.switch.from} durationInFrames={R.switch.dur} name="2 Four-chain switch"><Switch /></Sequence>
        <Sequence from={R.fill.from} durationInFrames={R.fill.dur} name="3 Fill on BNB"><Fill /></Sequence>
        <Sequence from={R.launch.from} durationInFrames={R.launch.dur} name="4 Launch on BNB"><Launch /></Sequence>
        <Sequence from={R.tokens.from} durationInFrames={R.tokens.dur} name="5 Tokens (BNB filter)"><Tokens /></Sequence>
        <Sequence from={R.coin.from} durationInFrames={R.coin.dur} name="6 BNB coin page"><Coin /></Sequence>
        <Sequence from={R.base.from} durationInFrames={R.base.dur} name="7 Base coin"><Base /></Sequence>
        <Sequence from={e.from} durationInFrames={e.dur} name="8 End"><EndScene /></Sequence>
      </AbsoluteFill>
    </SkinCtx.Provider>
  );
};
