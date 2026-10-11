/**
 * TweetpadEthereum: "Now on Ethereum.", the fifth chain. 1080x1080 @30, 2012 skin, 25.2 s.
 * Keeps film 5's look (centred captions, the app at ×1.55 under the how-to's camera). Every app string is verbatim from
 * embed.html + assets/tweetpad.js: the five-logo Launch header switch (the tab-bar switch keeps four, as embed.html's .hud-row
 * does, so picking Ethereum leaves it unpicked), renderEthBox, renderLaunch's note and button, onLaunchEvm + buildEthLaunch's
 * check lines (each check() replaces a pending line), renderCoinHead's chain line, renderCoinFees' ethereum branch, renderTrade's
 * ethereum fee line, and the Solana profile's autoClaimBox / toggleAutoClaim.
 * Demo coin only: $ECAT ("Ether Cat", public/brand/ether-cat.svg, drawn for the film). No quoted trade figures. 0xxx…xxxx addresses.
 */
import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { BRAND, FONTS, skinOf } from "../brand/tokens";
import { Caption, Cursor, cursorAt, Fine, Ground } from "../components/Film";
import { EvmLine, LaunchForm, LaunchFormProps } from "../components/LaunchForm";
import { CoinView, DemoCoin, SolanaProfile, TradeBox } from "../components/Views";
import { AppFrame, Net, NET_TITLE, NETS_4, NETS_5, OfficialStrip, SkinCtx, Tab, Toast, useSkin, WelcomeTweet } from "../components/ui";
import { Cam, camLerp, camMap, CaptionBand, NO_CAM, Stage, WALLET_OK } from "../howto/parts";
import { lerp, ramp, settle, typed } from "../lib/motion";
import { End } from "../scenes/End";
import { Hook } from "../scenes/Hook";
import { APP, CARD } from "../scenes/layout";
import { ETH as R, ETH_COPY as C } from "../timeline";
import { EvmWalletWindow } from "./RobinhoodUpdate";

const NAME = C.coinName, TICK = C.ticker;
const IMG = "brand/ether-cat.svg";
const W = C.wallet;
const FEE = C.feePct, START = C.start;
const ECAT: DemoCoin = { name: NAME, symbol: TICK, age: "now", img: IMG, chain: "ethereum" };
const WOW: DemoCoin = { name: "Such Launch", symbol: "WOW", age: "2d", img: "brand/agent-inu.jpg" };

/* launch-form scrolls (app px) */
const FS_HEAD = 190;    // the Launch header (and its five-logo switch) near the top of the card
const FS_ETH_BOX = 362; // Ethereum form: the eth-box, the button and the (two-line) note in view
const FS_TOP = 240;     // the image, name and ticker at the top of the card (the wallet line above them)
const FS_CHIPS = 320;   // the eth-box chips and its note in view
const FS_BTN = 336;     // the Launch button in view
const FS_CHECKS = 410;  // …while the check lines run (the chips stay in view above the button)

/** app-px click targets, each at the scroll its scene uses (checked against stills) */
const T = {
  ethSeg: [370, 89],                                     // FS_HEAD: the Ethereum button in the Launch header switch
  drop: [117, 133], name: [270, 109], ticker: [270, 149], // FS_TOP
  fee3: [228, 261], start5: [171, 310],                  // FS_CHIPS: the 3% and 5 ETH chips
  button: [230, 430],                                    // FS_BTN: the Launch button
  turnOn: [387, 244],                                    // the profile's "Turn on" (its own camera, scroll 0)
} as const;

const inWin = (f: number, a: number, b: number) => f >= a && f < b;
const capFade = (f: number, dur: number) => ramp(f, 0, 12) * (1 - ramp(f, dur - 10, dur, settle));
const evmLine: EvmLine = { address: W.address, wallet: W.name };
const form = (p: Partial<LaunchFormProps>): LaunchFormProps => ({ chain: "ethereum", nets: NETS_5, button: "Add an image", buttonPrimary: false, evmLine, ...p });
const LaunchTab: React.FC<{ fp: LaunchFormProps }> = ({ fp }) => (<><OfficialStrip /><WelcomeTweet /><LaunchForm {...fp} /></>);

/* ---------- one shot (as film 5); the tab bar keeps the four-chain switch, the Launch header has five ---------- */
type Key = [number, number, number] | [number, number, number, "film"];
type Cap = { head: string; head2?: string; sub?: string; tag?: string };
type ShotProps = {
  f: number; cam: Cam; scroll: number; tab?: Tab; net?: Net; tokenCount?: number;
  toast?: React.ReactNode; overlay?: React.ReactNode; extra?: React.ReactNode; children: React.ReactNode;
  cap: Cap; capT: number; fine: React.ReactNode;
  cursor?: { keys: Key[]; down: boolean; t: number; hand?: boolean; size?: number };
};
const Shot: React.FC<ShotProps> = ({ f, cam, scroll, tab = "launch", net = "ethereum", tokenCount = 5, toast, overlay, extra, children, cap, capT, fine, cursor }) => {
  const m = camMap(cam);
  const cur = cursor ? cursorAt(f, cursor.keys.map(([k, x, y, film]) => (film ? [k, x, y] : [k, m(x, y).x, m(x, y).y]) as [number, number, number])) : null;
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <AppFrame scale={APP.scale} tab={tab} tokenCount={tokenCount} scrollY={scroll} connected net={net} nets={NETS_4} toast={toast} overlay={overlay}>{children}</AppFrame>
      </Stage>
      <CaptionBand />
      <Caption tag={cap.tag} head={cap.head} head2={cap.head2} sub={cap.sub} t={capT} y={30} />
      {typeof fine === "string" ? <Fine text={fine} t={0.9} /> : fine}
      {extra}
      {cur && cursor ? <Cursor x={cur.x} y={cur.y} down={cursor.down} t={cursor.t} hand={cursor.hand} size={cursor.size} /> : null}
    </AbsoluteFill>
  );
};

/** the browser tooltip of the hovered Launch header button (its title attribute), just under the pointer (app px) */
const HeadTip: React.FC<{ net: Net; y: number; t: number }> = ({ net, y, t }) => {
  const s = useSkin();
  return (
    <div style={{ position: "absolute", right: 8, top: y, padding: "6px 9px", background: "rgba(20,20,20,.92)", color: "#fff", borderRadius: 5, whiteSpace: "nowrap",
      font: `12px/1.2 ${s.px}`, boxShadow: "0 4px 12px rgba(0,0,0,.3)", opacity: t, transform: `translateY(${(1 - t) * -4}px)` }}>{NET_TITLE[net]}</div>
  );
};

/** a file thumbnail riding the cursor into the drop zone (as the how-to's DragFile, with this film's image) */
const DragFile: React.FC<{ f: number; drop: number }> = ({ f, drop }) => {
  const t = ramp(f, 18, drop - 6, settle);
  return (
    <div style={{ position: "absolute", left: lerp(900, 330, t), top: lerp(1000, 520, t), width: 120, height: 120, borderRadius: 14, overflow: "hidden", zIndex: 40,
      boxShadow: "0 16px 40px rgba(0,0,0,.3)", border: "4px solid #fff", transform: `rotate(${lerp(10, -4, t)}deg)`, opacity: 1 - ramp(f, drop - 2, drop + 3) }}>
      <Img src={staticFile(IMG)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
};

/* ---------- 1. hook ---------- */
// the X card image reads "zero pad fee" (Solana): its small type sits on the same frames
const HookScene: React.FC = () => {
  const f = useCurrentFrame();
  const t = 1 - ramp(f, 108, 120, settle);
  return (
    <>
      <Hook tag={C.hook.tag} head={C.hook.head} head2={C.hook.head2} tweet={C.hook.tweet} />
      {/* a soft band so the small type never sits on the skeleton post below */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 84, opacity: t, background: `linear-gradient(rgba(245,248,250,0), ${BRAND.bg} 55%)` }} />
      <Fine text={C.fine.hook} t={0.9 * t} />
    </>
  );
};

/* ---------- 2. the card opens on Launch (Base, the chain picked last time); tap Ethereum in the Launch header ---------- */
const Switch: React.FC = () => {
  const f = useCurrentFrame(); const d = R.switch.dur;
  const g = ramp(f, 0, 22, settle);
  const tap = 58;
  const net: Net = f >= tap ? "ethereum" : "base";
  const fp: LaunchFormProps = net === "base" ? form({ chain: "base", holders: 30, button: "Add an image" }) : form({});
  const pull = ramp(f, tap + 10, tap + 34, settle);                           // pull back and scroll down to the eth-box
  const scroll = lerp(lerp(150, FS_HEAD, ramp(f, 2, 24, settle)), FS_ETH_BOX, pull);
  const zoom = ramp(f, 14, 34, settle) * (1 - pull);
  const cam = camLerp(camLerp(NO_CAM, { z: 1.08, fx: 230, fy: 331, k: 0.3 }, pull), { z: 1.45, fx: 300, fy: 110, k: 0.5 }, zoom);
  const capT = ramp(f, 10, 24) * (1 - ramp(f, d - 10, d, settle));
  const fineSwap = ramp(f, tap, tap + 8);
  const fine = (<><Fine text={C.fine.base} t={0.9 * (1 - fineSwap) * ramp(f, 8, 18)} /><Fine text={C.fine.eth} t={0.9 * fineSwap} /></>);
  if (g < 1) {
    const x = lerp(CARD.x, APP.x, g), y = lerp(CARD.y, APP.y, g);
    const w = lerp(CARD.w, APP.w * APP.scale, g), h = lerp(CARD.h, APP.h * APP.scale, g);
    const scale = w / APP.w;
    return (
      <AbsoluteFill>
        <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: lerp(16, 10, g), overflow: "hidden", border: "1px solid #c8c8c8", boxShadow: `0 ${20 * g}px ${60 * g}px rgba(20,23,26,${0.18 * g})` }}>
          <AppFrame scale={scale} h={h / scale} tab="launch" tokenCount={5} scrollY={scroll} connected net="base" nets={NETS_4}><LaunchTab fp={fp} /></AppFrame>
          <Img src={staticFile("brand/card-preview.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 1 - ramp(f, 2, 14) }} />
        </div>
        <Caption head={C.switch.head} sub={C.switch.sub} t={capT} y={30} />
        {fine}
      </AbsoluteFill>
    );
  }
  const tip = inWin(f, tap - 14, tap + 4);
  const [ex, ey] = T.ethSeg;
  return (
    <Shot f={f} cam={cam} scroll={scroll} net={net} cap={C.switch} capT={capT} fine={fine}
      overlay={tip ? <HeadTip net="ethereum" y={ey + 22 + FS_HEAD - scroll} t={ramp(f, tap - 14, tap - 8)} /> : null}
      cursor={{ keys: [[22, 1000, 1060, "film"], [tap - 16, ex, ey + 2], [tap + 6, ex, ey + 2], [tap + 34, ex, ey + 2 - (FS_ETH_BOX - FS_HEAD)], [d, 365, 442, "film"]],
        down: inWin(f, tap, tap + 5), t: ramp(f, 22, 30), hand: true, size: 1.2 }}>
      <LaunchTab fp={fp} />
    </Shot>
  );
};

/* ---------- 3. fill: image, name, ticker, then the fee (3%) and the starting value (5 ETH) ---------- */
const Fill: React.FC = () => {
  const f = useCurrentFrame(); const d = R.fill.dur;
  const drop = 16, tapFee = 84, tapStart = 102;
  const name = typed(NAME, f, 26, 0.6);
  const ticker = typed(TICK, f, 48, 0.4);
  const caret = f >= 22 && f < 46 ? "name" : f >= 46 && f < 62 ? "ticker" : null;
  const hasImg = f >= drop;
  // renderLaunch, Ethereum: the first problem, else "Launch $T on Ethereum" (no dev buy on the custom launch)
  const problem = !hasImg ? "Add an image" : !name ? "Add a name" : ticker.length < 2 ? "Ticker: 2–10 letters or numbers" : null;
  const button = problem ?? `Launch $${ticker} on Ethereum`;
  const toChips = ramp(f, 62, 78, settle);
  const cam = camLerp(NO_CAM, { z: 1.4, fx: 220, fy: lerp(125, 300, toChips), k: 0.5 }, ramp(f, 0, 14, settle) * (1 - ramp(f, d - 12, d, settle)));
  const scroll = lerp(lerp(FS_ETH_BOX, FS_TOP, ramp(f, 0, 12, settle)), FS_CHIPS, toChips);
  return (
    <Shot f={f} cam={cam} scroll={scroll} cap={C.fill} capT={capFade(f, d)} fine={C.fine.eth}
      extra={f < drop + 4 && f > 2 ? <DragFile f={f + 22} drop={drop + 22} /> : null}
      cursor={{ keys: [[0, ...T.drop], [drop - 2, ...T.drop], [22, ...T.name], [44, ...T.name], [48, ...T.ticker], [60, ...T.ticker], [tapFee - 8, ...T.fee3], [tapFee + 6, ...T.fee3], [tapStart - 6, ...T.start5], [d, ...T.start5]],
        down: inWin(f, drop, drop + 5) || inWin(f, 22, 26) || inWin(f, 46, 50) || inWin(f, tapFee, tapFee + 5) || inWin(f, tapStart, tapStart + 5), t: 1 }}>
      <LaunchTab fp={form({ image: hasImg ? IMG : null, imageT: ramp(f, drop, drop + 10), name, ticker, caret, button, buttonPrimary: !problem,
        ethFee: f >= tapFee ? FEE : 2, ethStart: f >= tapStart ? START : "10",
        ethPressed: inWin(f, tapFee - 1, tapFee + 4) ? { fee: FEE } : inWin(f, tapStart - 1, tapStart + 4) ? { start: START } : null })} />
    </Shot>
  );
};

/* ---------- 4. launch: onLaunchEvm + buildEthLaunch's check lines on Ethereum ---------- */
type Chk = { text: string; done: boolean; link?: string };
const IPFS: Chk = { text: "Image and metadata on IPFS", done: true, link: "JSON ↗" };
const REVIEWED: Chk = { text: "Reviewed by Launch Party and checked here: approved for 30 minutes", done: true };
const LINES: [number, Chk[]][] = [
  [14, [{ text: "Uploading image and metadata to IPFS…", done: false }]],
  [26, [IPFS, { text: "Building the Ethereum launch…", done: false }]],
  [38, [IPFS, { text: "Launch Party is reviewing the launch…", done: false }]],
  [62, [IPFS, REVIEWED]],
  [82, [IPFS, REVIEWED, { text: `Approve in ${W.name}…`, done: false }]],
  [112, [IPFS, REVIEWED, { text: "Confirming on Ethereum…", done: false, link: "Tx ↗" }]],
  [128, [IPFS, REVIEWED, { text: `$${TICK} is live on Ethereum`, done: true, link: "Explorer ↗" }]],
];
const Launch: React.FC = () => {
  const f = useCurrentFrame(); const d = R.launch.dur;
  const click = 8, winIn = 84, ok = 106, live = 128;
  let checks: Chk[] = [];
  for (const [at, c] of LINES) if (f >= at) checks = c;
  const done = f >= live;
  const button = done ? "Launch another" : f >= click + 4 ? "Launching…" : `Launch $${TICK} on Ethereum`;
  const winT = ramp(f, winIn, winIn + 10) * (1 - ramp(f, ok + 4, ok + 12));
  // …and once more as the last lines land, so "$ECAT is live" sits above the toast
  const scroll = lerp(lerp(FS_CHIPS, FS_BTN, ramp(f, 0, 6, settle)), FS_CHECKS, ramp(f, 14, 36, settle)) + 40 * ramp(f, 104, 124, settle);
  const cam = camLerp(NO_CAM, { z: 1.3, fx: 230, fy: 390, k: 0.4 }, ramp(f, 16, 36, settle) * (1 - ramp(f, d - 24, d - 8, settle)));
  return (
    <Shot f={f} cam={cam} scroll={scroll} tokenCount={done ? 6 : 5} cap={C.launch} capT={capFade(f, d)} fine={C.fine.launch}
      toast={<Toast title="Token launched!" text="Share it: the link plays as its own card on X" t={ramp(f, live, live + 10)} />}
      extra={winT > 0 ? <EvmWalletWindow kind="approve" chain="Ethereum" t={winT} pressed={inWin(f, ok, ok + 6)} /> : null}
      cursor={{ keys: [[0, ...T.start5], [click - 4, ...T.button], [click + 20, ...T.button], [winIn + 14, WALLET_OK.x + 30, WALLET_OK.y + 50, "film"], [ok - 4, WALLET_OK.x, WALLET_OK.y, "film"], [ok + 16, WALLET_OK.x, WALLET_OK.y, "film"], [d, 900, 1000, "film"]],
        down: inWin(f, click, click + 5) || inWin(f, ok, ok + 5), t: 1 - ramp(f, d - 30, d - 18) }}>
      <LaunchTab fp={form({ image: IMG, name: NAME, ticker: TICK, ethFee: FEE, ethStart: START, button, buttonPrimary: true, pressed: inWin(f, click, click + 5), checks })} />
    </Shot>
  );
};

/* ---------- 5. the coin page: the Ethereum badge and chain line, the fee hook line, an idle ETH trade box ---------- */
const FS_COIN = 190;
const Coin: React.FC = () => {
  const f = useCurrentFrame(); const d = R.coin.dur;
  const push = ramp(f, 26, 52, settle);
  const cam = camLerp({ z: 1.6, fx: 180, fy: 110, k: 0.5 }, { z: 1.3, fx: 230, fy: 265, k: 0.5 }, push);
  return (
    <Shot f={f} cam={cam} tab="tokens" scroll={lerp(0, FS_COIN, push)} tokenCount={6} cap={C.coin} capT={capFade(f, d)} fine={C.fine.coin}>
      <CoinView drawT={ramp(f, 0, 30) * 0.3} coin={ECAT} badge chain="ethereum" feePct={FEE} holders={0}
        trade={<TradeBox side="buy" symbol={TICK} chain="ethereum" feePct={FEE} est={{ kind: "idle" }} button={`Buy $${TICK}`} disabled />} />
    </Shot>
  );
};

/* ---------- 6. side note: Auto-claim on the Solana profile (one signed message, no transaction) ---------- */
const AutoClaim: React.FC = () => {
  const f = useCurrentFrame(); const d = R.autoclaim.dur;
  const tap = 42, on = tap + 8;
  const cam = { z: 1.45, fx: 230, fy: 170, k: 0.45 };
  return (
    <Shot f={f} cam={cam} tab="more" scroll={0} tokenCount={6} cap={C.autoclaim} capT={capFade(f, d)} fine={C.fine.autoclaim}
      cursor={{ keys: [[0, 900, 1000, "film"], [tap - 12, ...T.turnOn], [d, ...T.turnOn]], down: inWin(f, tap, tap + 5), t: ramp(f, 8, 16) * (1 - ramp(f, d - 12, d)), hand: true, size: 1.2 }}>
      <SolanaProfile address={C.sol.address} rewards={C.sol.rewards} coin={WOW} auto={f >= on ? { minSol: C.sol.minSol } : null} pressed={inWin(f, tap, tap + 5)}
        status={f >= on ? { tone: "ok", text: C.sol.on } : null} />
    </Shot>
  );
};

/* ---------- 7. end ---------- */
/* End's small type, one chain family per line (End's own Fine wraps mid-sentence at this length) */
const EndScene: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <End tagline={C.end.tagline} tagline2={C.end.tagline2} fine="" />
      <div style={{ position: "absolute", left: 40, right: 40, bottom: 16, textAlign: "center", font: `500 17px/1.3 ${FONTS.ui}`, color: "rgba(255,255,255,.88)", opacity: ramp(f, 40, 56) }}>
        {C.end.fine.map((l) => <div key={l}>{l}</div>)}
      </div>
    </>
  );
};

export const TweetpadEthereum: React.FC<{ skin?: "2012" | "tweetcraft" }> = ({ skin = "2012" }) => {
  loadFonts();
  const f = useCurrentFrame();
  const e = R.end;
  return (
    <SkinCtx.Provider value={skinOf(skin)}>
      <AbsoluteFill>
        <Ground blue={ramp(f, e.from - 6, e.from + 10)} />
        <Sequence from={R.hook.from} durationInFrames={R.hook.dur} name="1 Hook"><HookScene /></Sequence>
        <Sequence from={R.switch.from} durationInFrames={R.switch.dur} name="2 Five-chain switch"><Switch /></Sequence>
        <Sequence from={R.fill.from} durationInFrames={R.fill.dur} name="3 Fill: fee + starting value"><Fill /></Sequence>
        <Sequence from={R.launch.from} durationInFrames={R.launch.dur} name="4 Launch on Ethereum"><Launch /></Sequence>
        <Sequence from={R.coin.from} durationInFrames={R.coin.dur} name="5 Coin page + fees"><Coin /></Sequence>
        <Sequence from={R.autoclaim.from} durationInFrames={R.autoclaim.dur} name="6 Also new: Auto-claim"><AutoClaim /></Sequence>
        <Sequence from={e.from} durationInFrames={e.dur} name="7 End"><EndScene /></Sequence>
      </AbsoluteFill>
    </SkinCtx.Provider>
  );
};
