/**
 * TweetpadThreeNew: "Three new things on tweetpad." 1080x1080 @30, 2012 skin, 30.2 s.
 * The intro is a parody character: the Ethereum diamond in shades (assets/notvitalik-avatar.svg, redrawn here so its jaw, shades
 * and eyes can move), named "vitalik.eth" with the PARODY chip /custom gives it. It talks while it spells out the three updates.
 * It is never the real Vitalik Buterin: no photo of him, no @handle of his, and the intro's small type says so.
 * Then: 1 · Ethereum (film 10's launch form, compressed), 2 · /custom (rebuilt from custom.html + feature.css + custom.js render /
 * renderBrief, every string verbatim), 3 · Auto-claim (the Solana profile's autoClaimBox, then /autoclaim as its card image shows it).
 * Taps on the feature pages are ripples drawn inside the tapped button, so no click target needs measuring.
 * Demo coin only ($ECAT, public/brand/ether-cat.svg). No quoted figures. 0xxx…xxxx / xxxx…xxxx addresses.
 */
import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { BRAND, FONTS, skinOf } from "../brand/tokens";
import { Caption, Cursor, cursorAt, Fine, Ground } from "../components/Film";
import { EvmLine, LaunchForm, LaunchFormProps } from "../components/LaunchForm";
import { DemoCoin, SolanaProfile } from "../components/Views";
import { AppFrame, Net, NetLogo, NETS_4, NETS_5, OfficialStrip, SkinCtx, Tab, Toast, WelcomeTweet } from "../components/ui";
import { Cam, camLerp, camMap, CaptionBand, NO_CAM, Stage, WALLET_OK } from "../howto/parts";
import { lerp, pop, ramp, settle, typed } from "../lib/motion";
import { End } from "../scenes/End";
import { APP } from "../scenes/layout";
import { THREE as R, THREE_COPY as C, THREE_T as IT } from "../timeline";
import { EvmWalletWindow } from "./RobinhoodUpdate";

const NAME = C.coinName, TICK = C.ticker;
const IMG = "brand/ether-cat.svg";
const W = C.wallet;
const WOW: DemoCoin = { name: "Such Launch", symbol: "WOW", age: "2d", img: "brand/agent-inu.jpg" };

const inWin = (f: number, a: number, b: number) => f >= a && f < b;
const capFade = (f: number, dur: number) => ramp(f, 0, 12) * (1 - ramp(f, dur - 10, dur, settle));

/* =========================================================================================
 * The parody diamond (assets/notvitalik-avatar.svg's shapes, viewBox 0 0 96 96).
 * jaw 0–1 drops the lower diamond and opens the dark gap between the halves (closed, the gap is its smile);
 * peek 0–1 lifts the shades off the eyes behind them; blink 0–1 shuts those eyes; glint 0–1 sweeps a shine over the lenses.
 * ========================================================================================= */
type Face = { jaw?: number; peek?: number; blink?: number; glint?: number | null };
export const Diamond: React.FC<Face & { size: number; framed?: boolean; style?: React.CSSProperties }> = ({ size, framed, jaw = 0, peek = 0, blink = 0, glint = null, style }) => {
  const d = jaw * 7;            // jaw drop (svg px)
  const up = peek * 10;         // shades lift
  const ry = 3.6 * (1 - 0.9 * blink);
  const id = framed ? "nvf" : "nv";
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ overflow: "visible", ...style }}>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a9df0" /><stop offset="1" stopColor="#4a5fd0" /></linearGradient>
        <clipPath id={`${id}-lens`}><rect x="30" y={38 - up} width="15" height="7" rx="2" /><rect x="51" y={38 - up} width="15" height="7" rx="2" /></clipPath>
      </defs>
      {framed ? <rect width="96" height="96" rx="10" fill={`url(#${id}-bg)`} /> : null}
      {/* the mouth: the dark gap between the upper diamond's lower edge and the jaw's upper edge */}
      <path d={`M29 48.6 48 60 67 48.6 L67 ${52.6 + d} 48 ${64 + d} 29 ${52.6 + d}z`} fill="#14171a" />
      {jaw > 0.15 ? <path d={`M40 ${57 + d * 0.9} Q48 ${59 + d * 0.5} 56 ${57 + d * 0.9} L48 ${63 + d}z`} fill="#e0607e" opacity={Math.min(1, (jaw - 0.15) * 3)} /> : null}
      {/* the jaw */}
      <g transform={`translate(0 ${d})`}>
        <path d="M48 64 28 52l20 30 20-30z" fill="#fff" />
        <path d="M48 64v18l20-30z" fill="#dfe4fb" />
      </g>
      {/* the head */}
      <path d="M48 14 28 48l20 12 20-12z" fill="#fff" />
      <path d="M48 14v46l20-12z" fill="#dfe4fb" />
      {/* the eyes behind the shades */}
      {peek > 0.05 ? (
        <g opacity={Math.min(1, peek * 2)}>
          {[37.5, 58.5].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy={41.5} rx={4.2} ry={ry} fill="#fff" stroke="#14171a" strokeWidth={0.9} />
              {blink < 0.6 ? <circle cx={x + 0.6} cy={41.8} r={1.9} fill="#14171a" /> : null}
            </g>
          ))}
        </g>
      ) : null}
      {/* the shades */}
      <g transform={`translate(0 ${-up}) rotate(${-peek * 4} 48 41)`}>
        <rect x="30" y="38" width="15" height="7" rx="2" fill="#14171a" />
        <rect x="51" y="38" width="15" height="7" rx="2" fill="#14171a" />
        <rect x="44" y="40" width="8" height="2" fill="#14171a" />
      </g>
      {glint !== null ? (
        <g clipPath={`url(#${id}-lens)`}>
          <path d={`M${22 + glint * 52} 34 l4 0 l-6 14 l-4 0z`} fill="#fff" opacity={0.75} />
        </g>
      ) : null}
    </svg>
  );
};

/** a talking mouth for frames in [a, b): a deterministic syllable pattern that settles shut at both ends */
export const talk = (f: number, windows: [number, number][]) => {
  for (const [a, b] of windows) if (f >= a && f < b) {
    const env = Math.min(1, (f - a) / 3, (b - f) / 3);
    return env * (0.3 + 0.7 * Math.abs(Math.sin(f * 1.05))) * (0.55 + 0.45 * Math.abs(Math.sin(f * 0.41 + 1)));
  }
  return 0;
};

/** the PARODY chip (feature.css .parody) */
const Parody: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <span style={{ padding: `${1 * scale}px ${5 * scale}px`, color: "#fff", font: `bold ${9 * scale}px/1.3 ${FONTS.ui}`, letterSpacing: ".04em", textTransform: "uppercase", background: "#999", borderRadius: 3 * scale }}>{C.intro.parody}</span>
);

/* =========================================================================================
 * 0. Intro: the diamond spells out the three updates in a post of its own
 * ========================================================================================= */
const ITEMS: { label: string; at: number; icon: React.ReactNode }[] = [
  { label: C.intro.items[0], at: IT.item1, icon: <Disc bg="#627eea"><NetLogo net="ethereum" c="#fff" size={30} /></Disc> },
  { label: C.intro.items[1], at: IT.item2, icon: <Disc bg="linear-gradient(#33bcef, #019ad2)"><HookIcon /></Disc> },
  { label: C.intro.items[2], at: IT.item3, icon: <Disc bg="linear-gradient(135deg, #9945ff, #14f195)"><NetLogo net="solana" c="#fff" size={28} /></Disc> },
];
function Disc({ bg, children }: { bg: string; children: React.ReactNode }) {
  return <span style={{ flex: "none", width: 54, height: 54, borderRadius: "50%", display: "grid", placeItems: "center", background: bg, boxShadow: "inset 0 2px 0 rgba(255,255,255,.35), 0 3px 8px rgba(0,0,0,.18)" }}>{children}</span>;
}
/** a fee hook, drawn as a fishing hook */
function HookIcon() {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="15" cy="4" r="2" />
      <path d="M15 6v9a5 5 0 0 1-10 0v-2l-2 2" />
    </svg>
  );
}
const SPELL = 0.75; // chars per frame for the spelled-out items
const gmEnd = IT.gm + Math.ceil(C.intro.gm.length / 1.2);

const Intro: React.FC = () => {
  const f = useCurrentFrame(); const d = R.intro.dur;
  const out = ramp(f, d - 14, d, settle);
  const windows: [number, number][] = [[IT.gm, gmEnd], ...ITEMS.map((it) => [it.at, it.at + Math.ceil(it.label.length / SPELL) + 2] as [number, number])];
  const jaw = talk(f, windows);
  // a hop on each item, the head nodding along, then peeking over the shades with a slow blink
  const hop = ITEMS.reduce((a, it) => a + Math.max(0, Math.sin(Math.min(Math.PI, Math.max(0, (f - it.at) / 10) * Math.PI))) * (f >= it.at && f < it.at + 10 ? 1 : 0), 0);
  const peek = ramp(f, IT.peek, IT.peek + 8) * (1 - ramp(f, IT.peek + 26, IT.peek + 34, settle));
  const blink = Math.max(0, 1 - Math.abs(f - (IT.peek + 16)) / 3);
  const glintAt = [24, 162].find((g) => f >= g && f < g + 12);
  const glint = glintAt === undefined ? null : (f - glintAt) / 12;
  const tilt = Math.sin(f * 0.08) * 3 + jaw * 2 - peek * 6;
  const bob = Math.sin(f * 0.11) * 8 - hop * 22;
  const squash = 1 + hop * 0.06;
  // frame 0 is the thumbnail: the character, the caption and the post are already up
  const cardIn = 1;
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <Caption tag={C.intro.tag} head={C.intro.head} head2={C.intro.head2} t={1} y={40} />
      {/* the character */}
      <div style={{ position: "absolute", left: 40, top: 300, width: 420, height: 520 }}>
        <div style={{ position: "absolute", left: -40, top: 20, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(rgba(138,157,240,.38), rgba(138,157,240,0) 68%)" }} />
        <div style={{ position: "absolute", left: 70, bottom: 30, width: 280, height: 40, borderRadius: "50%", background: "radial-gradient(rgba(20,40,90,.22), rgba(20,40,90,0) 70%)",
          transform: `scaleX(${1 - hop * 0.15})` }} />
        <div style={{ position: "absolute", left: 0, top: 30, transform: `translateY(${bob}px) rotate(${tilt}deg) scale(${1 / squash}, ${squash})`, transformOrigin: "50% 90%",
          filter: "drop-shadow(0 16px 26px rgba(40,60,140,.28))" }}>
          <Diamond size={420} jaw={jaw} peek={peek} blink={blink} glint={glint} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 488, display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
          <b style={{ font: `800 30px/1 ${FONTS.ui}`, color: BRAND.ink }}>{C.intro.name}</b><Parody scale={2} />
        </div>
      </div>
      {/* its post (the 2012 card look of feature.css .tweet), spelled out line by line */}
      <div style={{ position: "absolute", left: 480, top: 300, width: 560, padding: 22, background: "#fff", border: "1px solid #c8c8c8", borderRadius: 10,
        boxShadow: "0 18px 50px rgba(20,23,26,.14)", opacity: cardIn }}>
        {/* the speech-bubble tail toward the character */}
        <div style={{ position: "absolute", left: -15, top: 120, width: 28, height: 28, background: "#fff", borderLeft: "1px solid #c8c8c8", borderBottom: "1px solid #c8c8c8", transform: "rotate(45deg)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 64, height: 64, borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }}><Diamond size={64} framed jaw={jaw} /></span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flex: 1 }}>
            <b style={{ font: `bold 26px/1.2 ${FONTS.ui}`, color: "#333" }}>{C.intro.name}</b>
            <Parody scale={1.8} />
            <span style={{ marginLeft: "auto", font: `22px/1.2 ${FONTS.ui}`, color: "#999" }}>now</span>
          </div>
        </div>
        <div style={{ marginTop: 14, minHeight: 72, font: `30px/1.3 ${FONTS.serif}`, color: "#333" }}>
          {typed(C.intro.gm, f, IT.gm, 1.2)}{f >= IT.gm && f < gmEnd + 6 && Math.floor(f / 8) % 2 === 0 ? <span style={{ color: BRAND.primary }}>|</span> : null}
        </div>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
          {ITEMS.map((it, i) => {
            const p = f < it.at ? 0 : pop(f, it.at);
            const txt = typed(it.label, f, it.at, SPELL);
            const live = f >= it.at && txt.length < it.label.length;
            const hi = ramp(f, it.at, it.at + 4) * (1 - ramp(f, it.at + 30, it.at + 44));
            return (
              // not spelled yet: a faint ghost of the line (so the thumbnail, frame 0, shows all three), lit letter by letter as it is said
              <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 12px", borderRadius: 10,
                transform: `scale(${0.96 + 0.04 * Math.min(1, p)})`, transformOrigin: "0 50%",
                background: `rgba(29,161,242,${0.1 * hi})`, border: `1px solid rgba(29,161,242,${0.35 * hi})` }}>
                <span style={{ width: 30, font: `800 30px/1 ${FONTS.ui}`, color: f >= it.at ? BRAND.primary : BRAND.lightGray }}>{i + 1}</span>
                <span style={{ display: "flex", filter: `grayscale(${1 - Math.min(1, p)})`, opacity: 0.45 + 0.55 * Math.min(1, p) }}>{it.icon}</span>
                <b style={{ position: "relative", font: `800 36px/1.1 ${FONTS.ui}`, letterSpacing: "-.02em", whiteSpace: "nowrap" }}>
                  <span style={{ color: "rgba(20,23,26,.13)" }}>{it.label}</span>
                  <span style={{ position: "absolute", left: 0, top: 0, color: BRAND.ink }}>{txt}{live && Math.floor(f / 6) % 2 === 0 ? <span style={{ color: BRAND.primary, fontWeight: 400 }}>|</span> : null}</span>
                </b>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, font: `24px/1.3 ${FONTS.serif}`, color: "#0084b4", opacity: ramp(f, IT.item3 + 30, IT.item3 + 40) }}>#tweetpad</div>
      </div>
      <Fine text={C.fine.intro} t={0.9} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * 1. Ethereum: film 10's launch form, from the fee chips to "$ECAT is live on Ethereum"
 * ========================================================================================= */
const FS_CHIPS = 320;   // the eth-box chips, the note and the Launch button in view
const FS_CHECKS = 410;  // …while the check lines run
/** app-px click targets at FS_CHIPS (film 10's T, the button moved down by FS_CHIPS → FS_BTN) */
const T = { fee3: [228, 261], start5: [171, 310], button: [230, 446], turnOn: [387, 244] } as const;

type Key = [number, number, number] | [number, number, number, "film"];
type Cap = { head: string; head2?: string; sub?: string; tag?: string };
const evmLine: EvmLine = { address: W.address, wallet: W.name };
const form = (p: Partial<LaunchFormProps>): LaunchFormProps => ({ chain: "ethereum", nets: NETS_5, button: "Add an image", buttonPrimary: false, evmLine, ...p });
const LaunchTab: React.FC<{ fp: LaunchFormProps }> = ({ fp }) => (<><OfficialStrip /><WelcomeTweet /><LaunchForm {...fp} /></>);

const Shot: React.FC<{ f: number; cam: Cam; scroll: number; tab?: Tab; net?: Net; tokenCount?: number; toast?: React.ReactNode; extra?: React.ReactNode;
  children: React.ReactNode; cap: Cap; capT: number; fine: string; cursor?: { keys: Key[]; down: boolean; t: number; hand?: boolean; size?: number } }> =
  ({ f, cam, scroll, tab = "launch", net = "ethereum", tokenCount = 5, toast, extra, children, cap, capT, fine, cursor }) => {
    const m = camMap(cam);
    const cur = cursor ? cursorAt(f, cursor.keys.map(([k, x, y, film]) => (film ? [k, x, y] : [k, m(x, y).x, m(x, y).y]) as [number, number, number])) : null;
    return (
      <AbsoluteFill>
        <Stage cam={cam}>
          <AppFrame scale={APP.scale} tab={tab} tokenCount={tokenCount} scrollY={scroll} connected net={net} nets={NETS_4} toast={toast}>{children}</AppFrame>
        </Stage>
        <CaptionBand />
        <Caption tag={cap.tag} head={cap.head} head2={cap.head2} sub={cap.sub} t={capT} y={24} />
        <Fine text={fine} t={0.9} />
        {extra}
        {cur && cursor ? <Cursor x={cur.x} y={cur.y} down={cursor.down} t={cursor.t} hand={cursor.hand} size={cursor.size} /> : null}
      </AbsoluteFill>
    );
  };

type Chk = { text: string; done: boolean; link?: string };
const IPFS: Chk = { text: "Image and metadata on IPFS", done: true, link: "JSON ↗" };
const REVIEWED: Chk = { text: "Reviewed by Launch Party and checked here: approved for 30 minutes", done: true };
const CLICK = 56;
const LINES: [number, Chk[]][] = [
  [CLICK + 6, [{ text: "Uploading image and metadata to IPFS…", done: false }]],
  [CLICK + 14, [IPFS, { text: "Building the Ethereum launch…", done: false }]],
  [CLICK + 22, [IPFS, { text: "Launch Party is reviewing the launch…", done: false }]],
  [CLICK + 40, [IPFS, REVIEWED]],
  [CLICK + 52, [IPFS, REVIEWED, { text: `Approve in ${W.name}…`, done: false }]],
  [CLICK + 80, [IPFS, REVIEWED, { text: "Confirming on Ethereum…", done: false, link: "Tx ↗" }]],
  [CLICK + 92, [IPFS, REVIEWED, { text: `$${TICK} is live on Ethereum`, done: true, link: "Explorer ↗" }]],
];
const Eth: React.FC = () => {
  const f = useCurrentFrame(); const d = R.eth.dur;
  const tapFee = 18, tapStart = 36, winIn = CLICK + 54, ok = CLICK + 72, live = CLICK + 92;
  let checks: Chk[] = [];
  for (const [at, c] of LINES) if (f >= at) checks = c;
  const done = f >= live;
  const button = done ? "Launch another" : f >= CLICK + 4 ? "Launching…" : `Launch $${TICK} on Ethereum`;
  const winT = ramp(f, winIn, winIn + 8) * (1 - ramp(f, ok + 4, ok + 10));
  const scroll = lerp(FS_CHIPS, FS_CHECKS, ramp(f, CLICK + 10, CLICK + 30, settle)) + 40 * ramp(f, CLICK + 76, CLICK + 90, settle);
  const cam = camLerp({ z: 1.35, fx: 220, fy: 300, k: 0.5 }, { z: 1.3, fx: 230, fy: 390, k: 0.4 }, ramp(f, CLICK + 6, CLICK + 30, settle));
  return (
    <Shot f={f} cam={camLerp(cam, NO_CAM, ramp(f, d - 26, d - 8, settle))} scroll={scroll} tokenCount={done ? 6 : 5} cap={C.eth} capT={capFade(f, d)} fine={C.fine.eth}
      toast={<Toast title="Token launched!" text="Share it: the link plays as its own card on X" t={ramp(f, live, live + 10)} />}
      extra={winT > 0 ? <EvmWalletWindow kind="approve" chain="Ethereum" t={winT} pressed={inWin(f, ok, ok + 6)} /> : null}
      cursor={{ keys: [[0, 900, 1000, "film"], [tapFee - 8, ...T.fee3], [tapFee + 6, ...T.fee3], [tapStart - 6, ...T.start5], [tapStart + 6, ...T.start5], [CLICK - 6, ...T.button], [CLICK + 20, ...T.button],
        [winIn + 10, WALLET_OK.x + 30, WALLET_OK.y + 50, "film"], [ok - 4, WALLET_OK.x, WALLET_OK.y, "film"], [ok + 14, WALLET_OK.x, WALLET_OK.y, "film"], [d, 900, 1000, "film"]],
        down: inWin(f, tapFee, tapFee + 5) || inWin(f, tapStart, tapStart + 5) || inWin(f, CLICK, CLICK + 5) || inWin(f, ok, ok + 5), t: ramp(f, 2, 10) * (1 - ramp(f, d - 30, d - 18)) }}>
      <LaunchTab fp={form({ image: IMG, name: NAME, ticker: TICK, button, buttonPrimary: true, pressed: inWin(f, CLICK, CLICK + 5), checks,
        ethFee: f >= tapFee ? C.feePct : 2, ethStart: f >= tapStart ? C.start : "10",
        ethPressed: inWin(f, tapFee - 1, tapFee + 4) ? { fee: C.feePct } : inWin(f, tapStart - 1, tapStart + 4) ? { start: C.start } : null })} />
    </Shot>
  );
};

/* =========================================================================================
 * The feature pages (/custom, /autoclaim) in feature.css's 2012 look, at their own px (480 wide), scaled up
 * ========================================================================================= */
const FW = 480, FS = 1.55;
const ui = FONTS.ui;
const box: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 7, padding: 10, background: "#fff", border: "1px solid #c8c8c8", borderRadius: 5, boxShadow: "0 1px 2px rgba(0,0,0,.12)" };
const label: React.CSSProperties = { color: "#555", font: `bold 12px/1.2 ${ui}` };
const note: React.CSSProperties = { margin: 0, color: "#777", font: `12px/1.35 ${ui}` };
const textIn: React.CSSProperties = { width: "100%", padding: "7px 8px", color: "#333", font: `13px/1.3 ${ui}`, background: "#fff", border: "1px solid #ccc", borderRadius: 4, boxShadow: "inset 0 1px 2px rgba(0,0,0,.08)", boxSizing: "border-box" };
const btnBase: React.CSSProperties = { position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 12px", color: "#333",
  font: `bold 12px/1 ${ui}`, textShadow: "0 1px 0 #fff", whiteSpace: "nowrap", background: "linear-gradient(#fff, #e6e6e6)", border: "1px solid #bbb", borderBottomColor: "#a2a2a2",
  borderRadius: 4, boxShadow: "inset 0 1px 0 rgba(255,255,255,.6), 0 1px 1px rgba(0,0,0,.08)", boxSizing: "border-box" };
const primary: React.CSSProperties = { color: "#fff", textShadow: "0 -1px 0 rgba(0,0,0,.25)", background: "linear-gradient(#33bcef, #019ad2)", borderColor: "#057ed0", borderBottomColor: "#0466a8" };

/** a tap: a hand comes in, presses, and a blue ripple spreads from the button's centre (drawn inside the button) */
export const Tap: React.FC<{ f: number; at: number }> = ({ f, at }) => {
  const k = f - at;
  if (k < -12 || k > 16) return null;
  const r = ramp(f, at, at + 14);
  const hand = ramp(f, at - 12, at - 2) * (1 - ramp(f, at + 8, at + 16));
  const down = k >= 0 && k < 5;
  return (
    <>
      {k >= 0 ? <span style={{ position: "absolute", left: "50%", top: "50%", width: 60, height: 60, marginLeft: -30, marginTop: -30, borderRadius: "50%", pointerEvents: "none",
        background: "rgba(29,161,242,.35)", transform: `scale(${0.2 + 1.3 * r})`, opacity: 1 - r }} /> : null}
      <span style={{ position: "absolute", left: "50%", top: "55%", zIndex: 5, opacity: hand, transform: `translate(${(1 - hand) * 30}px, ${(1 - hand) * 30}px) scale(${1 / FS * 1.2})`, transformOrigin: "0 0" }}>
        <Cursor x={0} y={0} hand down={down} size={1} />
      </span>
    </>
  );
};
const Button: React.FC<{ children: React.ReactNode; f: number; at?: number; on?: boolean; style?: React.CSSProperties }> = ({ children, f, at, on, style }) => {
  const down = at !== undefined && inWin(f, at, at + 5);
  return (
    <span style={{ ...btnBase, ...(on ? primary : null), ...(down ? { boxShadow: "inset 0 2px 4px rgba(0,0,0,.25)" } : null), ...style }}>
      {children}{at !== undefined ? <Tap f={f} at={at} /> : null}
    </span>
  );
};
/** .chips: the app's segmented buttons; on = the pressed one */
const Chips: React.FC<{ items: string[]; on: number; f: number; taps?: Record<number, number> }> = ({ items, on, f, taps = {} }) => (
  <div style={{ display: "flex", flexWrap: "wrap" }}>
    {items.map((it, i) => {
      const pressed = i === on;
      return (
        <span key={it} style={{ ...btnBase, padding: "6px 10px", marginLeft: i ? -1 : 0, color: pressed ? "#fff" : "#555", borderRadius: i === 0 ? "4px 0 0 4px" : i === items.length - 1 ? "0 4px 4px 0" : 0, boxShadow: "none",
          ...(pressed ? { zIndex: 1, textShadow: "0 -1px 0 rgba(0,0,0,.25)", background: "linear-gradient(#2c8fd6, #4aa9e9)", borderColor: "#1d6aa5", boxShadow: "inset 0 1px 3px rgba(0,0,0,.3)" } : null) }}>
          {it}{taps[i] !== undefined ? <Tap f={f} at={taps[i]} /> : null}
        </span>
      );
    })}
  </div>
);
const Mark: React.FC<{ net: "ethereum" | "solana"; size?: number; c?: string }> = ({ net, size = 14, c = "#fff" }) => <NetLogo net={net} c={c} size={size} />;

/** the frame: the blue bar (‹ # tweetpad … [mark] title), then a scrolling column of cards */
const FeatureFrame: React.FC<{ title: string; net: "ethereum" | "solana"; h?: number; scroll: number; children: React.ReactNode }> = ({ title, net, h = 480, scroll, children }) => (
  <div style={{ position: "relative", width: FW, height: h, display: "flex", flexDirection: "column", overflow: "hidden", background: "#e6e6e6", fontFamily: ui, color: "#333", WebkitFontSmoothing: "antialiased" }}>
    <div style={{ position: "relative", zIndex: 2, flex: "none", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", color: "#fff", background: "linear-gradient(#63b8ee, #3c9ad9 50%, #2b86cc)",
      borderBottom: "1px solid #1d6aa5", boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 1px 3px rgba(0,0,0,.25)" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 8px 2px 4px" }}>
        <span style={{ font: `bold 20px/1 ${ui}`, opacity: 0.85 }}>‹</span>
        <Img src={staticFile("brand/tweetpad-hash-256.png")} style={{ width: 24, height: 24, filter: "drop-shadow(0 -1px 0 rgba(0,0,0,.25))" }} />
        <span style={{ font: `600 19px/1 ${FONTS.round}`, letterSpacing: "-.01em", textShadow: "0 -1px 0 rgba(0,0,0,.3)" }}>tweetpad</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", padding: "4px 9px", font: `bold 13px/1 ${ui}`, textShadow: "0 -1px 0 rgba(0,0,0,.3)",
        background: "rgba(0,0,0,.18)", border: "1px solid rgba(255,255,255,.35)", borderRadius: 12 }}><Mark net={net} />{title}</span>
    </div>
    <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, transform: `translateY(${-scroll}px)` }}>{children}</div>
    </div>
  </div>
);
/** the frame on screen: centred under the caption band, eased in, optionally zoomed on (fx, fy) in frame px */
const FeatureStage: React.FC<{ t: number; z?: number; fx?: number; fy?: number; h?: number; top?: number; children: React.ReactNode }> = ({ t, z = 1, fx = 240, fy = 240, h = 480, top = 240, children }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 214, bottom: 38, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: (1080 - FW * FS) / 2, top: top - 214, width: FW * FS, height: h * FS, borderRadius: 10, overflow: "hidden", border: "1px solid #c8c8c8",
      boxShadow: "0 20px 60px rgba(20,23,26,.18)", opacity: t, transform: `translateY(${(1 - t) * 30}px) scale(${z})`, transformOrigin: `${fx * FS}px ${fy * FS}px` }}>
      <div style={{ width: FW, height: h, transform: `scale(${FS})`, transformOrigin: "0 0" }}>{children}</div>
    </div>
  </div>
);

/* =========================================================================================
 * 2. /custom: the parody post on top, the deployer (Upgradeable, team share 10% over 90 days), then the agent brief
 * ========================================================================================= */
const FS_HOOK = 330;   // the fee hook box in view
const FS_AGENT = 560;  // the launch button and the agent box in view
type Hook = "fixed" | "upgradeable";
/** custom.js render(): the summary line */
const summary = (o: { hook: Hook; fee: number; start: string; team: number; vest: number }) => (
  <>Each trade: <b style={{ color: "#333" }}>{o.fee}% to you</b>, in ETH and ${TICK}. {o.hook === "fixed" ? "The hook is fixed forever. " : "You can change the hook later, in public, or freeze it. "}
    {o.team ? `${o.team}% of supply vests to you over ${o.vest} days. ` : "All the supply goes to the pool. "}Opens at {o.start} ETH.</>
);
/** custom.js renderBrief() */
const brief = (o: { hook: Hook; fee: number; start: string; team: number; vest: number }) =>
  "Read https://www.tweetpad.io/skills/tweetpad-custom-launch/SKILL.md and prepare a custom launch on Ethereum through tweetpad: "
  + NAME + " ($" + TICK + "), " + o.fee + "% fee to my wallet, " + (o.hook === "fixed" ? "a fixed hook" : "an upgradeable hook") + ", opening at " + o.start + " ETH"
  + (o.team ? ", " + o.team + "% team share vesting over " + o.vest + " days" : ", no team share") + ". Show me the plan before I sign.";

const ParodyPost: React.FC<{ jaw: number }> = ({ jaw }) => (
  <div style={{ display: "flex", gap: 10, padding: 10, background: "#fff", border: "1px solid #c8c8c8", borderRadius: 5, boxShadow: "0 1px 2px rgba(0,0,0,.12)" }}>
    <span style={{ flex: "none", width: 48, height: 48, borderRadius: 5, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,.25)" }}><Diamond size={48} framed jaw={jaw} /></span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, whiteSpace: "nowrap" }}>
        <b style={{ font: `bold 14px/1.2 ${ui}`, color: "#333" }}>{C.intro.name}</b><Parody /><span style={{ marginLeft: "auto", font: `12px/1.2 ${ui}`, color: "#999" }}>now</span>
      </div>
      <p style={{ margin: "3px 0 0", font: `14px/1.35 ${FONTS.serif}`, color: "#333" }}>
        Launch a coin with its own fee hook on Ethereum, fixed or upgradeable, straight from a tweet. <span style={{ color: "#0084b4" }}>@launchpartyv4</span> cooked. <span style={{ color: "#0084b4" }}>#tweetpad</span>{" "}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "1px 7px 1px 1px", verticalAlign: 1, color: "#0084b4", font: `bold 11px/1 ${ui}`, background: "#f5f8fa", border: "1px solid #e3e3e3", borderRadius: 16 }}>
          <Img src={staticFile("brand/tweetpad-hash-256.png")} style={{ width: 16, height: 16, borderRadius: "50%" }} />@tweetpad_io</span>
      </p>
    </div>
  </div>
);

const Custom: React.FC = () => {
  const f = useCurrentFrame(); const d = R.custom.dur;
  const tapHook = 50, tapFee = 70, tapTeam = 92, tapVest = 112, toAgent = 140, tapCopy = 206;
  const o = { hook: (f >= tapHook ? "upgradeable" : "fixed") as Hook, fee: f >= tapFee ? C.feePct : 2, start: "10", team: f >= tapTeam ? C.team : 0, vest: f >= tapVest ? C.vest : 60 };
  const scroll = lerp(lerp(0, FS_HOOK, ramp(f, 16, 40, settle)), FS_AGENT, ramp(f, toAgent, toAgent + 26, settle));
  const agentCap = f >= toAgent;
  const capT = agentCap ? ramp(f, toAgent, toAgent + 12) * (1 - ramp(f, d - 10, d, settle)) : ramp(f, 0, 12) * (1 - ramp(f, toAgent - 10, toAgent, settle));
  const zoom = ramp(f, 40, 56, settle) * (1 - ramp(f, toAgent - 6, toAgent + 14, settle));
  const hookAt = (h: Hook) => (h === "upgradeable" ? tapHook : undefined);
  return (
    <AbsoluteFill>
      <FeatureStage t={ramp(f, 0, 12) * (1 - ramp(f, d - 12, d, settle))} z={1 + 0.12 * zoom} fx={240} fy={260}>
        <FeatureFrame title="Custom launch" net="ethereum" scroll={scroll}>
          <ParodyPost jaw={0} />
          {/* the deployer */}
          <div style={box}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ ...label, flex: 1 }}>Wallet</span><span style={note}>{W.address} · {W.name}</span></div>
            <div style={{ display: "flex", gap: 8 }}><Button f={f}>Disconnect</Button></div>
          </div>
          <div style={box}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ position: "relative", width: 70, height: 70, flex: "none", overflow: "hidden", borderRadius: 5, border: "1px dashed #bbb", background: "#f7f9fa" }}>
                <Img src={staticFile(IMG)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              </span>
              <div style={{ flex: 1, display: "grid", gap: 6 }}>
                <span style={textIn}>{NAME}</span>
                <span style={{ ...textIn, textTransform: "uppercase" }}>{TICK}</span>
              </div>
            </div>
            <span style={{ ...textIn, minHeight: 50 }}>launched on tweetpad.io</span>
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ ...textIn, flex: 1, color: "#999" }}>X: @handle or link (optional)</span>
              <span style={{ ...textIn, flex: 1, color: "#999" }}>Website (optional)</span>
            </div>
          </div>
          <div style={box}>
            <span style={label}>Fee hook</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {([["fixed", "Fixed", "The hook can never change. What buyers see is what it stays."], ["upgradeable", "Upgradeable", "You can point it at new logic, in public, or freeze it for good."]] as const).map(([k, b, s]) => {
                const on = o.hook === k, at = hookAt(k);
                return (
                  <span key={k} style={{ ...btnBase, flexDirection: "column", alignItems: "flex-start", gap: 4, padding: "8px 9px", whiteSpace: "normal", textAlign: "left", textShadow: "none",
                    ...(on ? { background: "#eaf5fc", borderColor: "#56b4ef", boxShadow: "0 0 0 1px #56b4ef" } : null) }}>
                    <b style={{ color: "#333", font: `bold 13px/1 ${ui}` }}>{b}</b>
                    <span style={{ color: "#777", font: `11px/1.3 ${ui}`, fontWeight: 400 }}>{s}</span>
                    {at !== undefined ? <Tap f={f} at={at} /> : null}
                  </span>
                );
              })}
            </div>
            <span style={label}>Creator fee</span>
            <Chips f={f} items={["0%", "1%", "2%", "3%", "5%"]} on={[0, 1, 2, 3, 5].indexOf(o.fee)} taps={{ 3: tapFee }} />
            <span style={label}>Starting value</span>
            <Chips f={f} items={["2 ETH", "5 ETH", "10 ETH", "25 ETH"]} on={2} />
            <span style={label}>Team share</span>
            <Chips f={f} items={["None", "5%", "10%", "20%"]} on={[0, 5, 10, 20].indexOf(o.team)} taps={{ 2: tapTeam }} />
            {o.team ? <div style={{ opacity: ramp(f, tapTeam, tapTeam + 8) }}><Chips f={f} items={["30 days", "60 days", "90 days", "120 days"]} on={[30, 60, 90, 120].indexOf(o.vest)} taps={{ 2: tapVest }} /></div> : null}
            <p style={note}>{summary(o)}</p>
          </div>
          <Button f={f} on style={{ width: "100%", padding: "9px 12px", fontSize: 13 }}>Launch ${TICK} on Ethereum</Button>
          {/* hand it to your agent */}
          <div style={box}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ ...label, flex: 1 }}>Or hand it to your agent</span><span style={{ color: "#0084b4", font: `13px/1 ${ui}` }}>Skill file ↗</span></div>
            <p style={note}>Your agent reads one file, prepares the launch through tweetpad and brings you the transaction to sign. It is listed here like any other.</p>
            <pre style={{ margin: 0, padding: 8, whiteSpace: "pre-wrap", color: "#333", font: `11px/1.4 ${FONTS.code}`, background: "#fafafa", border: "1px solid #ddd", borderRadius: 4,
              boxShadow: f >= tapCopy ? "inset 0 1px 2px rgba(0,0,0,.08), 0 0 0 2px rgba(86,180,239,.6)" : "inset 0 1px 2px rgba(0,0,0,.08)" }}>{brief(o)}</pre>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Button f={f} at={tapCopy}>Copy brief</Button><span style={note}>{f >= tapCopy + 4 ? "Copied" : ""}</span></div>
          </div>
        </FeatureFrame>
      </FeatureStage>
      <CaptionBand />
      {agentCap ? <Caption tag={C.agent.tag} head={C.agent.head} sub={C.agent.sub} t={capT} y={24} />
        : <Caption tag={C.custom.tag} head={C.custom.head} head2={C.custom.head2} t={capT} y={24} />}
      <Fine text={C.fine.custom} t={0.9} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * 3. Auto-claim: Profile → Turn on, then /autoclaim as its card image shows it (no live numbers)
 * ========================================================================================= */
const AutoClaim: React.FC = () => {
  const f = useCurrentFrame(); const d = R.autoclaim.dur;
  const tap = 34, on = tap + 8, swap = 78;
  const toPage = ramp(f, swap, swap + 14, settle);
  const cam = { z: 1.45, fx: 230, fy: 170, k: 0.45 };
  // a coin travels from the fees pill to the wallet pill, once per beat ("every 5 minutes")
  const loop = ((f - swap - 14) % 36 + 36) % 36 / 36;
  return (
    <AbsoluteFill>
      {toPage < 1 ? (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - toPage }}>
          <Shot f={f} cam={cam} tab="more" net="solana" scroll={0} tokenCount={6} cap={C.autoclaim} capT={0} fine=""
            cursor={{ keys: [[0, 900, 1000, "film"], [tap - 12, ...T.turnOn], [d, ...T.turnOn]], down: inWin(f, tap, tap + 5), t: ramp(f, 4, 12) * (1 - ramp(f, swap - 10, swap)), hand: true, size: 1.2 }}>
            <SolanaProfile address={C.sol.address} rewards={C.sol.rewards} coin={WOW} auto={f >= on ? { minSol: C.sol.minSol } : null} pressed={inWin(f, tap, tap + 5)}
              status={f >= on ? { tone: "ok", text: C.sol.on } : null} />
          </Shot>
        </div>
      ) : null}
      {toPage > 0 ? (
        <FeatureStage t={toPage * (1 - ramp(f, d - 12, d, settle))} h={262} top={320}>
          <FeatureFrame title="Auto-claim" net="solana" h={262} scroll={0}>
            <p style={{ margin: 0, padding: 10, color: "#555", font: `13px/1.35 ${ui}`, background: "#fff", border: "1px solid #c8c8c8", borderRadius: 5, boxShadow: "0 1px 2px rgba(0,0,0,.12)" }}>
              Your pump.fun <b style={{ color: "#333" }}>creator fees</b>, claimed <b style={{ color: "#333" }}>to your wallet</b> every 5 minutes. tweetpad pays the network fee. No keys, no deposits, no cut.</p>
            <div style={{ position: "relative", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 8px", background: "#fff", border: "1px solid #c8c8c8", borderRadius: 5, boxShadow: "0 1px 2px rgba(0,0,0,.12)" }}>
              <span style={{ padding: "6px 10px", color: "#555", font: `bold 14px/1 ${ui}`, background: "linear-gradient(#fff, #ececec)", border: "1px solid #ccc", borderRadius: 14 }}>pump.fun creator fees</span>
              <span style={{ position: "relative", padding: "0 10px", color: "#0084b4", font: `bold 20px/1 ${ui}` }}>→
                <span style={{ position: "absolute", left: lerp(-60, 70, loop), top: -7 - Math.sin(loop * Math.PI) * 4, width: 14, height: 14, borderRadius: "50%", background: "linear-gradient(135deg, #9945ff, #14f195)",
                  boxShadow: "0 0 0 2px #fff, 0 1px 3px rgba(0,0,0,.3)", opacity: Math.sin(loop * Math.PI) * toPage }} />
              </span>
              <span style={{ padding: "6px 10px", color: "#fff", font: `bold 14px/1 ${ui}`, textShadow: "0 -1px 0 rgba(0,0,0,.25)", background: "linear-gradient(#33bcef, #019ad2)", border: "1px solid #057ed0", borderRadius: 14 }}>your wallet</span>
              <b style={{ flexBasis: "100%", color: "#0084b4", font: `bold 22px/1.1 ${ui}`, letterSpacing: "-.01em", textAlign: "center" }}>every 5 minutes</b>
            </div>
            <p style={{ margin: 0, color: "#999", font: `11px/1.35 ${ui}`, textAlign: "center" }}>Only pump.fun's own permissionless claim instructions: the fees can only go to the creator.</p>
          </FeatureFrame>
        </FeatureStage>
      ) : null}
      <CaptionBand />
      <Caption tag={C.autoclaim.tag} head={C.autoclaim.head} sub={C.autoclaim.sub} t={capFade(f, d)} y={24} />
      <Fine text={C.fine.autoclaim} t={0.9} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * 4. End: the three lines of small type, and the diamond waving goodbye in the corner
 * ========================================================================================= */
const EndScene: React.FC = () => {
  const f = useCurrentFrame();
  const inT = pop(f, 30);
  return (
    <>
      <End tagline={C.end.tagline} tagline2={C.end.tagline2} fine="" />
      <div style={{ position: "absolute", right: 30, bottom: 96, transform: `translateY(${(1 - inT) * 160}px) rotate(${Math.sin(f * 0.25) * 6}deg)`, transformOrigin: "50% 90%" }}>
        <Diamond size={180} jaw={talk(f, [[40, 56]])} peek={ramp(f, 58, 64) * (1 - ramp(f, 76, 82))} blink={Math.max(0, 1 - Math.abs(f - 69) / 3)} />
      </div>
      <div style={{ position: "absolute", left: 40, right: 40, bottom: 16, textAlign: "center", font: `500 17px/1.3 ${FONTS.ui}`, color: "rgba(255,255,255,.88)", opacity: ramp(f, 40, 56) }}>
        {C.end.fine.map((l) => <div key={l}>{l}</div>)}
      </div>
    </>
  );
};

export const TweetpadThreeNew: React.FC<{ skin?: "2012" | "tweetcraft" }> = ({ skin = "2012" }) => {
  loadFonts();
  const f = useCurrentFrame();
  const e = R.end;
  return (
    <SkinCtx.Provider value={skinOf(skin)}>
      <AbsoluteFill>
        <Ground blue={ramp(f, e.from - 6, e.from + 10)} />
        <Sequence from={R.intro.from} durationInFrames={R.intro.dur} name="0 Intro: the parody diamond spells it out"><Intro /></Sequence>
        <Sequence from={R.eth.from} durationInFrames={R.eth.dur} name="1 Ethereum"><Eth /></Sequence>
        <Sequence from={R.custom.from} durationInFrames={R.custom.dur} name="2 Custom launch + agent"><Custom /></Sequence>
        <Sequence from={R.autoclaim.from} durationInFrames={R.autoclaim.dur} name="3 Auto-claim"><AutoClaim /></Sequence>
        <Sequence from={e.from} durationInFrames={e.dur} name="4 End"><EndScene /></Sequence>
      </AbsoluteFill>
    </SkinCtx.Provider>
  );
};
