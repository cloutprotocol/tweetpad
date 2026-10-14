/**
 * TweetpadStonks: "Stocks meet memes. Stonkfun, inside the tweet." 1080x1080 @30, 2012 skin, 34.2 s.
 * Solana launches on Stonkfun (Raydium LaunchLab) through tweetpad, as shipped in b6418ac: the Launchpad switch at the top of
 * the form, "Pair with" by launchpad, Stonkfun's fee setup (Creator fees · Holder rewards 1% / 3% · Community), the launch's
 * check lines, and the coin page with its tax and what holders were paid. Every in-app string is verbatim from embed.html /
 * assets/tweetpad.js (renderStonkBox, renderPairs, renderLaunch, onLaunch, renderStonkFees, renderTrade).
 * The xStock logos (public/stonk/) are the ones Stonkfun serves for its pairs; they swirl around the # icon in the hook and the
 * end card, and around the app throughout. The small type says no affiliation.
 * Taps are drawn inside the tapped control (ThreeNew's Tap: hand + ripple), so no click target needs measuring; the only cursor
 * is on the generic wallet window, whose Approve button is WALLET_OK.
 * Demo coin $MCHIP only (public/brand/moon-chip.svg). Demo reward amounts. xxxx…xxxx addresses.
 */
import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { BRAND, FONTS, skinOf } from "../brand/tokens";
import { Caption, Cursor, cursorAt, Fine, Ground } from "../components/Film";
import { LaunchForm, StonkForm, StonkTapAt } from "../components/LaunchForm";
import { CoinView, DemoCoin } from "../components/Views";
import { AppFrame, NETS_4, NETS_5, OfficialStrip, SkinCtx, Tab, Toast, WelcomeTweet } from "../components/ui";
import { Cam, camLerp, CaptionBand, NO_CAM, Stage, WALLET_OK, WalletWindow } from "../howto/parts";
import { lerp, pop, ramp, settle } from "../lib/motion";
import { End } from "../scenes/End";
import { APP } from "../scenes/layout";
import { STONK as R, STONK_COPY as C } from "../timeline";
import { Tap } from "./ThreeNew";

const NAME = C.coinName, TICK = C.ticker;
const IMG = "brand/moon-chip.svg";
const COIN: DemoCoin = { name: NAME, symbol: TICK, age: "now", img: IMG };

const inWin = (f: number, a: number, b: number) => f >= a && f < b;
const capFade = (f: number, dur: number) => ramp(f, 0, 12) * (1 - ramp(f, dur - 10, dur, settle));

/* =========================================================================================
 * The stonks: Stonkfun's xStock pair logos, on two tilted rings
 * ========================================================================================= */
type Logo = { sym: string; file: string };
const LOGOS: Logo[] = ([
  ["TSLAx", "jpg"], ["NVDAx", "jpg"], ["SPYx", "png"], ["GOOGLx", "webp"], ["APPLx", "jpg"], ["AMZNx", "jpg"], ["METAx", "jpg"], ["MSFTx", "webp"],
  ["COINx", "webp"], ["MSTRx", "png"], ["HOODx", "png"], ["PLTRx", "png"], ["GMEx", "png"], ["QQQx", "jpg"], ["CRCLx", "jpg"], ["GLDx", "jpg"],
  ["MCDx", "jpg"], ["KOx", "png"], ["INTCx", "png"], ["SPCXx", "jpg"], ["BRKx", "webp"], ["STRCx", "webp"],
] as const).map(([sym, ext]) => ({ sym, file: `stonk/${sym}.${ext}` }));
const logo = (sym: string) => LOGOS.find((l) => l.sym === sym)!.file;

const Disc: React.FC<{ file: string; size: number; style?: React.CSSProperties }> = ({ file, size, style }) => (
  <span style={{ position: "absolute", width: size, height: size, borderRadius: "50%", overflow: "hidden", background: "#fff",
    boxShadow: "0 0 0 3px #fff, 0 10px 24px rgba(20,40,70,.25)", ...style }}>
    <Img src={staticFile(file)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  </span>
);

type Ring = { n: number; rx: number; ry: number; speed: number; size: number; phase: number };
/** a ring of logos at (cx, cy): its front half (sin > 0) is drawn by layer "front", its back half by layer "back" */
const Swirl: React.FC<{ f: number; cx: number; cy: number; rings: Ring[]; layer: "back" | "front" | "all"; opacity?: number; tilt?: number; floor?: number }> = ({ f, cx, cy, rings, layer, opacity = 1, tilt = -10, floor = 1080 }) => {
  let k = 0;
  const items: { key: string; x: number; y: number; d: number; size: number; file: string; spin: number }[] = [];
  rings.forEach((r, ri) => {
    for (let i = 0; i < r.n; i++) {
      const lg = LOGOS[(k++ * 7 + ri * 3) % LOGOS.length];
      const a = r.phase + (i / r.n) * Math.PI * 2 + f * r.speed;
      const d = (Math.sin(a) + 1) / 2;                     // 0 far … 1 near
      if (layer === "back" && d >= 0.5) continue;
      if (layer === "front" && d < 0.5) continue;
      const x = Math.cos(a) * r.rx, y = Math.sin(a) * r.ry;
      const t = (tilt * Math.PI) / 180;                     // the ring's tilt
      items.push({ key: `${ri}-${i}`, x: cx + x * Math.cos(t) - y * Math.sin(t), y: cy + x * Math.sin(t) + y * Math.cos(t) + Math.sin(f * 0.07 + i) * 6, d,
        size: r.size * (0.55 + 0.6 * d), file: lg.file, spin: Math.sin(f * 0.05 + i * 1.7) * 12 });
    }
  });
  items.sort((a, b) => a.d - b.d);
  return (
    <div style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none" }}>
      {items.map((it) => {
        // fade out as a disc nears the floor (the small type's band), gone before it reaches it
        const low = Math.max(0, Math.min(1, (floor - (it.y + it.size / 2)) / 60));
        return low <= 0 ? null : (
          <Disc key={it.key} file={it.file} size={it.size} style={{ left: it.x - it.size / 2, top: it.y - it.size / 2, transform: `rotate(${it.spin}deg)`,
            filter: it.d < 0.35 ? `blur(${(0.35 - it.d) * 6}px)` : undefined, opacity: (0.45 + 0.55 * it.d) * low }} />
        );
      })}
    </div>
  );
};

/** green candles rising behind everything: stonks only go up (it is a meme, not a forecast; the small type has no prices) */
const Candles: React.FC<{ f: number; opacity?: number }> = ({ f, opacity = 1 }) => (
  <div style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none" }}>
    {Array.from({ length: 16 }, (_, i) => {
      const x = ((i * 137) % 1000) + 40, speed = 1.2 + (i % 5) * 0.35, h = 30 + ((i * 53) % 50);
      const y = 1120 - ((f * speed + i * 97) % 1260);
      return (
        <span key={i} style={{ position: "absolute", left: x, top: y, width: 14, height: h, opacity: 0.22 }}>
          <span style={{ position: "absolute", left: 6, top: -12, width: 2, height: h + 24, background: "#2e9e4f" }} />
          <span style={{ position: "absolute", inset: 0, borderRadius: 2, background: "#2e9e4f" }} />
        </span>
      );
    })}
  </div>
);

const RINGS_BIG: Ring[] = [
  { n: 9, rx: 300, ry: 92, speed: 0.022, size: 104, phase: 0 },
  { n: 13, rx: 470, ry: 150, speed: -0.014, size: 92, phase: 0.6 },
];
/** around the app: wide enough that the logos pass in the margins either side of it */
const RINGS_APP: Ring[] = [{ n: 14, rx: 500, ry: 380, speed: 0.008, size: 84, phase: 0.3 }];

/* =========================================================================================
 * 0. Hook: the swirl (frame 0 is the thumbnail: the ring, the icon and the caption are already up)
 * ========================================================================================= */
const Intro: React.FC = () => {
  const f = useCurrentFrame(); const d = R.intro.dur;
  const out = ramp(f, d - 14, d, settle);
  const cy = 610;
  const bob = Math.sin(f * 0.09) * 10;
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <Candles f={f} />
      <Swirl f={f + 40} cx={540} cy={cy} rings={RINGS_BIG} layer="back" />
      <div style={{ position: "absolute", left: 540 - 140, top: cy - 160 + bob, width: 280, height: 280, filter: "drop-shadow(0 20px 40px rgba(29,161,242,.35))" }}>
        <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: "100%", height: "100%", transform: `rotate(${Math.sin(f * 0.05) * 4}deg)` }} />
      </div>
      <Swirl f={f + 40} cx={540} cy={cy} rings={RINGS_BIG} layer="front" />
      {/* the line under the icon, as a 2012 pill */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 846, display: "flex", justifyContent: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "14px 26px", background: "#fff", border: "1px solid #c8c8c8", borderRadius: 40,
          boxShadow: "0 12px 30px rgba(20,23,26,.14)", font: `800 30px/1 ${FONTS.ui}`, color: BRAND.ink, transform: `scale(${0.96 + 0.04 * pop(f, 6)})` }}>
          <span style={{ display: "inline-flex" }}>{["TSLAx", "NVDAx", "SPYx"].map((s, i) => <span key={s} style={{ position: "relative", width: 34, height: 34, marginLeft: i ? -10 : 0 }}><Disc file={logo(s)} size={34} /></span>)}</span>
          {C.intro.center}
        </span>
      </div>
      <Caption tag={C.intro.tag} head={C.intro.head} head2={C.intro.head2} t={1} y={40} />
      <Fine text={C.fine.intro} t={0.9} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * The app scenes: the launch form, scrolled and zoomed, with the swirl behind the app
 * ========================================================================================= */
type Cap = { head: string; head2?: string; sub?: string; tag?: string };
const Shot: React.FC<{ f: number; cam: Cam; scroll: number; tab?: Tab; tokenCount?: number; toast?: React.ReactNode; overlay?: React.ReactNode; extra?: React.ReactNode;
  children: React.ReactNode; cap: Cap; capT: number; fine: string; cursor?: { keys: [number, number, number][]; down: boolean; t: number } }> =
  ({ f, cam, scroll, tab = "launch", tokenCount = 15, toast, overlay, extra, children, cap, capT, fine, cursor }) => {
    const cur = cursor ? cursorAt(f, cursor.keys) : null;
    return (
      <AbsoluteFill>
        <Swirl f={f * 1.5 + 200} cx={540} cy={640} rings={RINGS_APP} layer="all" opacity={0.55} floor={1030} />
        <Stage cam={cam}>
          <AppFrame scale={APP.scale} tab={tab} tokenCount={tokenCount} scrollY={scroll} connected net="solana" nets={NETS_4} toast={toast} overlay={overlay}>{children}</AppFrame>
        </Stage>
        <CaptionBand />
        <Caption tag={cap.tag} head={cap.head} head2={cap.head2} sub={cap.sub} t={capT} y={24} />
        <Fine text={fine} t={0.9} />
        {extra}
        {cur && cursor ? <Cursor x={cur.x} y={cur.y} down={cursor.down} t={cursor.t} /> : null}
      </AbsoluteFill>
    );
  };

type Chk = { text: string; done: boolean; link?: string };
const LaunchTab: React.FC<{ stonk: StonkForm; button: string; buttonPrimary?: boolean; pressed?: boolean; checks?: Chk[] }> = ({ stonk, button, buttonPrimary = true, pressed, checks }) => (
  <><OfficialStrip /><WelcomeTweet />
    <LaunchForm chain="solana" nets={NETS_5} width={363} image={IMG} name={NAME} ticker={TICK} button={button} buttonPrimary={buttonPrimary} pressed={pressed} checks={checks} stonk={stonk} /></>
);
/** the tap node for whichever control is tapped at frame f (one at a time) */
const tapOf = (f: number, taps: [StonkTapAt, number][]): StonkForm["tap"] => {
  const hit = taps.find(([, at]) => f >= at - 12 && f <= at + 16);
  return hit ? { at: hit[0], node: <Tap f={f} at={hit[1]} /> } : null;
};
const pressedOf = (f: number, taps: [StonkTapAt, number][]) => (taps.find(([, at]) => inWin(f, at, at + 5)) || [null])[0];

const PAIR_FIRST = { symbol: C.first, img: logo(C.first), community: true };
const PAIR_PICK = { symbol: C.pick, img: logo(C.pick), community: true };

/** where the form sits (app px of scroll): its head and the Launchpad row near the top, then the fee box, then the button and checks */
const FS_HEAD = 196, FS_FEES = 330, FS_CHECKS = 470;

/* =========================================================================================
 * 1. The Launchpad switch: pump.fun → Stonkfun
 * ========================================================================================= */
const Switch: React.FC = () => {
  const f = useCurrentFrame(); const d = R.switch.dur;
  const tap = 44, loaded = tap + 12;
  const taps: [StonkTapAt, number][] = [["venue-stonk", tap]];
  const stonk: StonkForm = f < tap ? { venue: "pump" } : { venue: "stonk", pair: f >= loaded ? PAIR_FIRST : null, mode: "standard", taxBps: 100 };
  const zoom = ramp(f, 8, 30, settle) * (1 - ramp(f, 86, 112, settle));
  const cam = camLerp({ z: 1, fx: 230, fy: 260, k: 0 }, { z: 1.6, fx: 230, fy: 40, k: 0.55 }, zoom);
  const scroll = lerp(FS_HEAD, FS_FEES - 60, ramp(f, 90, 120, settle));
  return (
    <Shot f={f} cam={camLerp(cam, NO_CAM, ramp(f, d - 20, d - 4, settle) * 0)} scroll={scroll} cap={C.switch} capT={capFade(f, d)} fine={C.fine.switch}>
      <LaunchTab stonk={{ ...stonk, tap: tapOf(f, taps), pressed: pressedOf(f, taps) }} button={`Launch $${TICK}` + (f >= tap ? " on Stonkfun" : "")} />
    </Shot>
  );
};

/* =========================================================================================
 * 2. Pair with: every pair, by launchpad; the Stonkfun filter, then $NVDAx
 * ========================================================================================= */
const PUMP_TILES: DemoCoin[] = [
  { name: "tweetpad", symbol: "TP", age: "", img: "brand/tweetpad-hash-256.png" },
  { name: "Such Launch", symbol: "WOW", age: "2d", img: "brand/agent-inu.jpg" },
  { name: "Ether Cat", symbol: "ECAT", age: "1d", img: "brand/ether-cat.svg" },
];
const STONK_TILES = ["SOL", "SPYx", "NVDAx", "GOOGLx", "QQQx", "TSLAx", "CRCLx", "COINx", "MSTRx", "AMZNx", "HOODx", "APPLx"];
const ui = FONTS.ui;

const PairDialog: React.FC<{ f: number; t: number; filter: "all" | "stonk"; picked: string; taps: { filter: number; tile: number } }> = ({ f, t, filter, picked, taps }) => {
  const tile = (key: string, img: React.ReactNode, title: string, detail: string, green: boolean, sel: boolean, tapAt?: number) => (
    <span key={key} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "7px 3px 6px", background: sel ? "#eaf5fc" : "#fff",
      border: `1px solid ${sel ? "#56b4ef" : "#e3e3e3"}`, borderRadius: 6, boxShadow: sel ? "0 0 0 1px #56b4ef" : undefined }}>
      {img}
      <b style={{ font: `bold 12px/1.1 ${ui}`, color: "#333" }}>{title}</b>
      <small style={{ font: `11px/1 ${ui}`, color: green ? "#2e9e4f" : "#999" }}>{detail}</small>
      {tapAt !== undefined ? <Tap f={f} at={tapAt} /> : null}
    </span>
  );
  const pic = (file: string, round = true) => <Img src={staticFile(file)} style={{ width: 30, height: 30, borderRadius: round ? "50%" : 6, objectFit: "cover", background: "#fff", boxShadow: "0 0 0 1px #eee" }} />;
  const sol = <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#000", display: "grid", placeItems: "center" }}><Img src={staticFile("brand/solana.svg")} style={{ width: 17 }} /></span>;
  const head = (label: string, sub: string) => (
    <div key={label} style={{ gridColumn: "1 / -1", display: "flex", alignItems: "baseline", gap: 6, padding: "6px 2px 0" }}>
      <b style={{ font: `bold 12px/1 ${ui}`, color: "#333" }}>{label}</b><small style={{ font: `11px/1 ${ui}`, color: "#999", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</small>
    </div>
  );
  const stonkTiles = STONK_TILES.map((s) => tile(s, s === "SOL" ? sol : pic(logo(s)), s === "SOL" ? "SOL" : "$" + s, s === "SOL" ? "Stonkfun" : "Stock", true, s === picked,
    s === C.pick ? taps.tile : undefined));
  const items = filter === "all"
    ? [head("pump.fun", "SOL or any coin launched on tweetpad"), tile("psol", sol, "SOL", "Default", false, false),
       ...PUMP_TILES.map((c) => tile(c.symbol, pic(c.img!, false), "$" + c.symbol, c.symbol === "TP" ? "—" : c.age, false, false)),
       head("Stonkfun", "SOL, tokenized stocks or USDC · creator fees or holder rewards"), ...stonkTiles.slice(0, 4)]
    : stonkTiles;
  const chip = (k: "all" | "pump" | "stonk", label: string, i: number) => {
    const on = k === filter;
    return (
      <span key={k} style={{ position: "relative", flex: 1, textAlign: "center", padding: "5px 0", marginLeft: i ? -1 : 0, font: `bold 12px/1 ${ui}`, zIndex: on ? 1 : 0,
        color: on ? "#fff" : "#555", textShadow: on ? "0 -1px 0 rgba(0,0,0,.25)" : "0 1px 0 #fff", background: on ? "linear-gradient(#2c8fd6, #4aa9e9)" : "linear-gradient(#fff, #e6e6e6)",
        border: `1px solid ${on ? "#1d6aa5" : "#bbb"}`, borderRadius: i === 0 ? "4px 0 0 4px" : i === 2 ? "0 4px 4px 0" : 0, boxShadow: on ? "inset 0 1px 3px rgba(0,0,0,.3)" : undefined }}>
        {label}{k === "stonk" ? <Tap f={f} at={taps.filter} /> : null}
      </span>
    );
  };
  return (
    <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${0.35 * t})`, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 54 }}>
      <div style={{ width: 400, display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "#fff", border: "1px solid #c8c8c8", borderRadius: 6,
        boxShadow: "0 10px 40px rgba(0,0,0,.35)", opacity: t, transform: `translateY(${(1 - t) * 14}px) scale(${0.97 + 0.03 * t})`, fontFamily: ui }}>
        <div style={{ display: "flex", alignItems: "center" }}><b style={{ flex: 1, font: `bold 15px/1 ${ui}`, color: "#333" }}>Pair with</b><span style={{ font: `20px/1 ${ui}`, color: "#999" }}>×</span></div>
        <span style={{ padding: "8px 10px 8px 30px", color: "#aaa", font: `14px/1.2 ${ui}`, border: "1px solid #ccc", borderRadius: 16, boxShadow: "inset 0 1px 2px rgba(0,0,0,.08)" }}>Search name, $ticker or contract</span>
        <div style={{ display: "flex" }}>{chip("all", "All", 0)}{chip("pump", "pump.fun", 1)}{chip("stonk", "Stonkfun", 2)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>{items}</div>
        <p style={{ margin: 0, font: `11px/1.3 ${ui}`, color: "#999" }}>The pair picks the launchpad: pump.fun, or Stonkfun for stocks, USDC and holder rewards.</p>
      </div>
    </div>
  );
};

const Pair: React.FC = () => {
  const f = useCurrentFrame(); const d = R.pair.dur;
  const tapChip = 16, open = tapChip + 6, tapFilter = 56, tapTile = 104, close = tapTile + 10;
  const taps: [StonkTapAt, number][] = [["pair", tapChip]];
  const dlgT = ramp(f, open, open + 10, settle) * (1 - ramp(f, close, close + 10, settle));
  const picked = f >= tapTile ? C.pick : C.first;
  const pair = f >= close ? PAIR_PICK : PAIR_FIRST;
  const cam = camLerp({ z: 1.6, fx: 230, fy: 40, k: 0.55 }, NO_CAM, ramp(f, open - 4, open + 12, settle) * (1 - ramp(f, close + 6, close + 26, settle)));
  return (
    <Shot f={f} cam={cam} scroll={FS_HEAD} cap={C.pair} capT={capFade(f, d)} fine={C.fine.pair}
      overlay={dlgT > 0 ? <PairDialog f={f} t={dlgT} filter={f >= tapFilter ? "stonk" : "all"} picked={picked} taps={{ filter: tapFilter, tile: tapTile }} /> : null}>
      <LaunchTab stonk={{ venue: "stonk", pair, mode: "standard", taxBps: 100, tap: tapOf(f, taps), pressed: pressedOf(f, taps) }} button={`Launch $${TICK} on Stonkfun`} />
    </Shot>
  );
};

/* =========================================================================================
 * 3. Fees: Holder rewards → 3% → Community
 * ========================================================================================= */
const Fees: React.FC = () => {
  const f = useCurrentFrame(); const d = R.fees.dur;
  const tReward = 30, tTax = 64, tComm = 100;
  const taps: [StonkTapAt, number][] = [["mode-reward", tReward], ["tax-300", tTax], ["mode-community", tComm]];
  const mode = f >= tComm ? "community" : f >= tReward ? "reward" : "standard";
  const scroll = lerp(FS_HEAD, FS_FEES, ramp(f, 0, 22, settle));
  const cam = camLerp(NO_CAM, { z: 1.45, fx: 230, fy: 330, k: 0.5 }, ramp(f, 6, 26, settle) * (1 - ramp(f, d - 24, d - 6, settle)));
  return (
    <Shot f={f} cam={cam} scroll={scroll} cap={C.fees} capT={capFade(f, d)} fine={C.fine.fees}>
      <LaunchTab stonk={{ venue: "stonk", pair: PAIR_PICK, mode, taxBps: f >= tTax ? 300 : 100, shareBps: 3300, tap: tapOf(f, taps), pressed: pressedOf(f, taps) }}
        button={`Launch $${TICK} on Stonkfun`} />
    </Shot>
  );
};

/* =========================================================================================
 * 4. Launch: onLaunch's check lines for a Stonkfun launch, the approve window, "$MCHIP is live"
 * ========================================================================================= */
const CLICK = 22;
const IPFS: Chk = { text: "Image and metadata on IPFS", done: true, link: "JSON ↗" };
const BUILT: Chk = { text: `Transaction built · mint xxxx…xxxx · paired with $${C.pick} · Holder rewards 3%`, done: true };
const SIGNED: Chk = { text: `Signed by ${C.wallet} and the new mint`, done: true };
const CONFIRMED: Chk = { text: "Confirmed on mainnet", done: true, link: "Tx ↗" };
const LIVE = CLICK + 118;
const LINES: [number, Chk[]][] = [
  [CLICK + 4, [{ text: "Uploading image and metadata to IPFS…", done: false }]],
  [CLICK + 14, [IPFS, { text: "Building the Stonkfun transaction…", done: false }]],
  [CLICK + 28, [IPFS, BUILT, { text: `Approve in ${C.wallet}…`, done: false }]],
  [CLICK + 70, [IPFS, BUILT, SIGNED, { text: "Sending to Solana…", done: false }]],
  [CLICK + 80, [IPFS, BUILT, SIGNED, { text: "Confirming…", done: false, link: "Tx ↗" }]],
  [CLICK + 104, [IPFS, BUILT, SIGNED, CONFIRMED]],
  [LIVE, [IPFS, BUILT, SIGNED, CONFIRMED, { text: `$${TICK} is live`, done: true, link: "Stonkfun ↗" }, { text: "Stonkfun picks it up within a minute or two", done: true }]],
];
const Launch: React.FC = () => {
  const f = useCurrentFrame(); const d = R.launch.dur;
  const winIn = CLICK + 34, ok = CLICK + 62;
  let checks: Chk[] = [];
  for (const [at, c] of LINES) if (f >= at) checks = c;
  const button = f >= LIVE ? "Launch another" : f >= CLICK + 2 ? "Launching…" : `Launch $${TICK} on Stonkfun`;
  const taps: [StonkTapAt, number][] = [["button", CLICK]];
  const winT = ramp(f, winIn, winIn + 8) * (1 - ramp(f, ok + 4, ok + 10));
  const scroll = lerp(FS_FEES, FS_CHECKS, ramp(f, CLICK + 6, CLICK + 30, settle)) + 60 * ramp(f, CLICK + 96, LIVE + 6, settle);
  const cam = camLerp(NO_CAM, { z: 1.25, fx: 230, fy: 380, k: 0.4 }, ramp(f, CLICK + 6, CLICK + 30, settle) * (1 - ramp(f, d - 24, d - 6, settle)));
  return (
    <Shot f={f} cam={cam} scroll={scroll} cap={C.launch} capT={capFade(f, d)} fine={C.fine.launch}
      toast={<Toast title="Token launched!" text="Share it: the link plays as its own card on X" t={ramp(f, LIVE, LIVE + 10)} />}
      extra={winT > 0 ? <WalletWindow kind="approve" t={winT} pressed={inWin(f, ok, ok + 6)} /> : null}
      cursor={{ keys: [[winIn + 4, 900, 1000], [ok - 4, WALLET_OK.x, WALLET_OK.y], [ok + 12, WALLET_OK.x, WALLET_OK.y], [ok + 26, 960, 1060]],
        down: inWin(f, ok, ok + 5), t: ramp(f, winIn + 2, winIn + 10) * (1 - ramp(f, ok + 12, ok + 22)) }}>
      <LaunchTab stonk={{ venue: "stonk", pair: PAIR_PICK, mode: "reward", taxBps: 300, tap: tapOf(f, taps), pressed: pressedOf(f, taps) }}
        button={button} pressed={inWin(f, CLICK, CLICK + 5)} checks={checks} />
    </Shot>
  );
};

/* =========================================================================================
 * 5. The coin page: ⇄ $NVDAx, its 3% tax, and what its holders were paid (renderStonkFees; demo amounts)
 * ========================================================================================= */
const StonkFees: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, font: `12px/1.3 ${ui}`, color: "#999" }}>
    <div><b style={{ color: "#333" }}>3% transfer tax</b> · paid to holders in ${C.pick} by Stonkfun</div>
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", background: "#f7f9fa", border: "1px solid #e3e3e3", borderRadius: 5 }}>
      <span style={{ flex: 1, font: `bold 11px/1 ${ui}`, color: "#999", textTransform: "uppercase", letterSpacing: ".03em" }}>Paid to holders</span>
      <b style={{ font: `bold 15px/1.2 ${ui}`, color: "#333" }}>{C.paid}</b><span style={{ color: "#999" }}>· {C.wallets}</span>
    </div>
    <span style={{ font: `11px/1.3 ${ui}`, color: "#aaa" }}>Launched on <span style={{ textDecoration: "underline", textDecorationColor: "#ccc", textUnderlineOffset: 2 }}>Stonkfun</span> (Raydium LaunchLab)</span>
  </div>
);
const Coin: React.FC = () => {
  const f = useCurrentFrame(); const d = R.coin.dur;
  const scroll = 120 * ramp(f, 40, 70, settle);
  const cam = camLerp(NO_CAM, { z: 1.35, fx: 230, fy: 400, k: 0.45 }, ramp(f, 56, 80, settle) * (1 - ramp(f, d - 22, d - 6, settle)));
  return (
    <Shot f={f} cam={cam} scroll={scroll} tab="tokens" tokenCount={16} cap={C.coin} capT={capFade(f, d)} fine={C.fine.coin}
      toast={<Toast title="Token launched!" text="Share it: the link plays as its own card on X" t={1 - ramp(f, 4, 16)} />}>
      <CoinView drawT={ramp(f, 4, 40)} coin={COIN} badge stonk={{ pair: C.pick, fees: <StonkFees /> }} />
    </Shot>
  );
};

/* =========================================================================================
 * 6. End: the card on blue, the swirl around it, three lines of small type
 * ========================================================================================= */
const EndScene: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Swirl f={f * 1.2 + 90} cx={540} cy={520} rings={[{ n: 16, rx: 560, ry: 470, speed: 0.012, size: 92, phase: 0 }]} layer="all" opacity={0.5 * ramp(f, 0, 16)} floor={985} />
      <End tagline={C.end.tagline} tagline2={C.end.tagline2} fine="" />
      <div style={{ position: "absolute", left: 40, right: 40, bottom: 14, textAlign: "center", font: `500 17px/1.3 ${FONTS.ui}`, color: "rgba(255,255,255,.88)", opacity: ramp(f, 40, 56) }}>
        {C.end.fine.map((l) => <div key={l}>{l}</div>)}
      </div>
    </>
  );
};

export const TweetpadStonks: React.FC<{ skin?: "2012" | "tweetcraft" }> = ({ skin = "2012" }) => {
  loadFonts();
  const f = useCurrentFrame();
  const e = R.end;
  return (
    <SkinCtx.Provider value={skinOf(skin)}>
      <AbsoluteFill>
        <Ground blue={ramp(f, e.from - 6, e.from + 10)} />
        <Sequence from={R.intro.from} durationInFrames={R.intro.dur} name="0 Hook: the stonks swirl"><Intro /></Sequence>
        <Sequence from={R.switch.from} durationInFrames={R.switch.dur} name="1 Launchpad switch"><Switch /></Sequence>
        <Sequence from={R.pair.from} durationInFrames={R.pair.dur} name="2 Pair with a stock"><Pair /></Sequence>
        <Sequence from={R.fees.from} durationInFrames={R.fees.dur} name="3 Fee setup"><Fees /></Sequence>
        <Sequence from={R.launch.from} durationInFrames={R.launch.dur} name="4 Launch"><Launch /></Sequence>
        <Sequence from={R.coin.from} durationInFrames={R.coin.dur} name="5 Coin page: holders paid"><Coin /></Sequence>
        <Sequence from={e.from} durationInFrames={e.dur} name="6 End"><EndScene /></Sequence>
      </AbsoluteFill>
    </SkinCtx.Provider>
  );
};
