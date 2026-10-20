/**
 * TweetpadPartyHowTo: "How to bundle a coin with a crew", the Launch Party walkthrough (docs/PARTY-WALKTHROUGH-FILM.md). 1080x1080 @30,
 * ~55 s. The live follow-up to TweetpadParty (PartyFilm.tsx): the same light canvas and crew, with tweetpad's real party screens on it
 * (dark glass, Inter Tight numbers, as assets/party.css draws them) and a cursor that clicks and types:
 *   Poster  the crew's ring around tweetpad: Launch Party, live now (frame 0 is X's thumbnail, so it's composed from the start)
 *   Find    tweetpad.io/party typed, the landing, Throw a party
 *   Coin    Launch a crew bundle: the picture, the name, the ticker
 *   Party   10 seats × 0.1 SOL (raise 1 SOL), fees to the crew, $TP holders only, unlock over 3 days
 *   Open    the curve preview, Open the party, one signature, the done page
 *   Post    Tweet your party: the post, with the room's card in it
 *   Seats   the crew takes seats in the post; a wallet without $TP is turned away
 *   Launch  Launch $CREW on pump.fun: one buy, the launched view and its contract address
 *   Claim   claim as they unlock; the crew's fees
 *   End     Launch Party, live now, tweetpad.io/party
 * NUMBERS: pump.fun's mainnet curve, checked against the party SDK's firstBuyCoins: 10 × 0.1 SOL is 4.31% of the curve, 3.42M a seat,
 * 29.8 SOL at launch; SOL at $104.6 (2026-10-19). The contract address is made up (an illustration). CLAIMS as the guide's §8.
 */
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { FONTS } from "../brand/tokens";
import { Canvas, Chip, clamp, CREW, ease, hand, inter, mono, Pfp, ramp, W } from "./PartyFilm";

const tight = '"Inter Tight", "Inter", system-ui, sans-serif';
/* the party pages' own colours (assets/party.css) */
const P = { bg: "#12161d", ink: "#f3f5f8", dim: "#8d96a3", faint: "#5d6672", rule: "rgba(255,255,255,0.07)", fill: "rgba(255,255,255,0.055)", mint: "#3fe0a0", blue: "#1d9bf0", gold: "#f2c230", warn: "#f97316" };
const SOL_USD = 104.6;
const STEPS = [0.44, 0.88, 1.32, 1.76, 2.19, 2.62, 3.05, 3.47, 3.89, 4.31];
const CA = "9CrEwPaRtYxq3M8vXk2LhTqN7sJd4FbW1zR6yGmP5pump";   // illustration
const coinPic = staticFile("party/noun-5.svg");

/* ---------- pieces ---------- */
/* a caption that resolves word by word, in the pages' display face */
const Say: React.FC<{ text: string; at: number; to?: number; size?: number; color?: string }> = ({ text, at, to, size = 56, color = W.ink }) => {
  const f = useCurrentFrame(), out = to === undefined ? 1 : interpolate(f, [to - 10, to], [1, 0], clamp);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: size * 0.24, opacity: out, fontFamily: tight, fontWeight: 800, fontSize: size, lineHeight: 1.04, letterSpacing: "-0.035em", color, textAlign: "center" }}>
      {text.split(" ").map((w, i) => {
        const t = interpolate(f, [at + i * 3, at + i * 3 + 14], [0, 1], { ...clamp, easing: ease });
        return <span key={i} style={{ opacity: t, filter: `blur(${(1 - t) * 12}px)`, translate: `0px ${(1 - t) * size * 0.22}px` }}>{w}</span>;
      })}
    </div>
  );
};
const Caption: React.FC<{ lines: [string, number, number?][] }> = ({ lines }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 40, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {lines.map(([t, at, to]) => (f >= at - 1 && (to === undefined || f < to) ? <Say key={t} text={t} at={at} to={to} /> : null))}
    </div>
  );
};
/* the cursor: a path of [frame, x, y], clicks at frames; a ring ripples out on each click */
type Pt = [number, number, number];
const at = (path: Pt[], f: number) => {
  if (f <= path[0][0]) return [path[0][1], path[0][2]];
  for (let i = 1; i < path.length; i++) if (f <= path[i][0]) {
    const [f0, x0, y0] = path[i - 1], [f1, x1, y1] = path[i], t = Easing.bezier(0.45, 0, 0.2, 1)((f - f0) / (f1 - f0));
    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
  }
  const l = path[path.length - 1]; return [l[1], l[2]];
};
const Cursor: React.FC<{ path: Pt[]; clicks?: number[]; from?: number; to?: number }> = ({ path, clicks = [], from = 0, to = 99999 }) => {
  const f = useCurrentFrame(), [x, y] = at(path, f);
  const o = interpolate(f, [from, from + 8, to - 8, to], [0, 1, 1, 0], clamp);
  const press = clicks.reduce((m, c) => Math.max(m, interpolate(f, [c, c + 3, c + 9], [0, 1, 0], clamp)), 0);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, translate: `${x}px ${y}px`, opacity: o, zIndex: 50, pointerEvents: "none" }}>
      {clicks.map((c) => { const u = interpolate(f, [c, c + 18], [0, 1], clamp); return u > 0 && u < 1 ? <div key={c} style={{ position: "absolute", left: -26, top: -26, width: 52, height: 52, borderRadius: "50%", border: `3px solid ${P.blue}`, opacity: 1 - u, scale: 0.4 + u }} /> : null; })}
      <svg width={34} height={40} viewBox="0 0 17 20" style={{ scale: 1 - press * 0.12, transformOrigin: "0 0", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.35))" }}>
        <path d="M1 1 L1 15.5 L5 12 L7.6 18 L10.4 16.8 L7.9 11 L13 11 Z" fill="#0b0d10" stroke="#ffffff" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </div>
  );
};
/* typed text: the first n characters by frame */
const typed = (text: string, f: number, from: number, per = 2.2) => text.slice(0, Math.max(0, Math.floor((f - from) / per)));
/* the dark glass card the party pages are drawn on */
const Glass: React.FC<{ w?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ w = 640, style, children }) => (
  <div style={{ position: "relative", width: w, padding: "26px 28px", borderRadius: 34, overflow: "hidden", color: P.ink, fontFamily: inter,
    background: `radial-gradient(70% 45% at 20% 0%, rgba(29,155,240,0.22), transparent 70%), linear-gradient(180deg, #1a2029, ${P.bg})`,
    boxShadow: "0 0 0 1px rgba(11,13,16,0.08), 0 60px 120px -40px rgba(11,13,16,0.55)", ...style }}>{children}</div>
);
const Bar: React.FC<{ right?: React.ReactNode }> = ({ right }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 12px 5px 5px", borderRadius: 99, background: P.fill, fontFamily: FONTS.round, fontWeight: 600, fontSize: 16 }}>
      <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 24, height: 24 }} />tweetpad</span>
    <span style={{ padding: "7px 12px", borderRadius: 99, background: P.fill, color: P.dim, fontWeight: 600, fontSize: 13 }}>Parties</span>
    <span style={{ marginLeft: "auto" }}>{right}</span>
  </div>
);
const StateChip: React.FC<{ text: string; color?: string }> = ({ text, color = P.blue }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 99, background: P.fill, fontWeight: 600, fontSize: 13 }}>
    <i style={{ width: 7, height: 7, borderRadius: 4, background: color, boxShadow: `0 0 0 4px ${color}2e` }} />{text}</span>
);
const Label: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: 13, color: P.dim, marginBottom: 8 }}><span>{children}</span>{right && <span>{right}</span>}</div>
);
const Seg: React.FC<{ opts: [string, string?][]; on: number; lit?: number }> = ({ opts, on, lit = 1 }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${opts.length}, 1fr)`, gap: 4, padding: 4, borderRadius: 14, background: P.fill }}>
    {opts.map(([a, b], i) => (
      <div key={a} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: b ? "11px 4px 10px" : "11px 4px", borderRadius: 10,
        background: i === on ? `rgba(255,255,255,${0.12 * lit})` : "transparent", color: i === on ? P.ink : P.dim, fontFamily: tight, fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>
        {a}{b && <small style={{ fontFamily: inter, fontWeight: 500, fontSize: 11, color: i === on ? P.dim : P.faint }}>{b}</small>}
      </div>
    ))}
  </div>
);
const Btn: React.FC<{ children: React.ReactNode; green?: boolean; press?: number; dim?: boolean }> = ({ children, green, press = 0, dim }) => (
  <div style={{ padding: green ? "22px 16px" : "17px 16px", borderRadius: 18, textAlign: "center", fontFamily: tight, fontWeight: 700, fontSize: green ? 22 : 18, letterSpacing: "-0.01em",
    color: dim ? P.dim : green ? "#04140c" : "#0a0d12", scale: 1 - press * 0.03,
    background: dim ? "rgba(255,255,255,0.07)" : green ? "linear-gradient(180deg, #7cf5c3, #3fe0a0 55%, #22c58a)" : "linear-gradient(180deg, #ffffff, #e7eef6)",
    boxShadow: dim ? "none" : green ? "0 4px 16px rgba(63,224,160,0.16), inset 0 1px 0 rgba(255,255,255,0.5)" : "0 4px 14px rgba(0,0,0,0.18)" }}>{children}</div>
);
/* the crew around tweetpad, as on tweetpad.io/party */
const Ring: React.FC<{ size: number; spin?: number }> = ({ size, spin = 0 }) => {
  const f = useCurrentFrame(), R = size * 0.42, s = size * 0.19, rot = f * 0.25 + spin;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div style={{ position: "absolute", inset: "14%", borderRadius: "50%", background: "radial-gradient(circle, rgba(63,224,160,0.55), transparent 65%)", filter: "blur(20px)", scale: 1 + 0.04 * Math.sin(f / 14) }} />
      <div style={{ position: "absolute", inset: size / 2 - R, borderRadius: "50%", border: "3px solid rgba(63,224,160,0.75)" }} />
      {CREW.map((_, i) => {
        const a = ((i * 36 + rot - 90) * Math.PI) / 180;
        return <div key={i} style={{ position: "absolute", left: size / 2 + Math.cos(a) * R - s / 2, top: size / 2 + Math.sin(a) * R - s / 2 }}><Pfp i={i} size={s} ring="#12161d" /></div>;
      })}
      <div style={{ position: "absolute", inset: size / 2 - size * 0.25, borderRadius: "50%", display: "grid", placeItems: "center",
        background: "radial-gradient(circle at 35% 30%, #1d2a33, #0d1318)", boxShadow: "inset 0 0 0 2px rgba(63,224,160,0.45), 0 0 50px rgba(63,224,160,0.35), 0 20px 50px rgba(0,0,0,0.4)" }}>
        <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: size * 0.25, height: size * 0.25, filter: "drop-shadow(0 6px 18px rgba(29,155,240,0.45))" }} />
      </div>
    </div>
  );
};
/* a seat as the room draws it: a crew member, or an empty dashed one */
const Seat: React.FC<{ i: number | null; size: number; t?: number; mine?: boolean }> = ({ i, size, t = 1, mine }) => (
  <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px dashed rgba(255,255,255,0.2)" }} />
    {i !== null && <div style={{ position: "absolute", inset: 0, opacity: t, scale: 0.5 + 0.5 * t }}><Pfp i={i} size={size} ring={mine ? P.gold : "#2a5c86"} /></div>}
    {mine && t > 0.5 && <span style={{ position: "absolute", bottom: -8, left: "50%", translate: "-50% 0", padding: "2px 7px", borderRadius: 99, background: P.gold, color: "#1a1405", fontWeight: 700, fontSize: 10 }}>You</span>}
  </div>
);
/* the room's three numbers, hairlines between */
const Tiles: React.FC<{ items: [string, string, string, string?][] }> = ({ items }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, paddingTop: 18, borderTop: `1px solid ${P.rule}` }}>
    {items.map(([k, v, u, sub], i) => (
      <div key={k} style={{ padding: i ? "0 0 0 16px" : "0 16px 0 0", borderLeft: i ? `1px solid ${P.rule}` : "none", minWidth: 0 }}>
        <div style={{ fontSize: 13, color: P.dim }}>{k}</div>
        <div style={{ marginTop: 8, fontFamily: tight, fontWeight: 700, fontSize: 30, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{v} <span style={{ fontFamily: inter, fontWeight: 600, fontSize: 13, color: P.dim, letterSpacing: 0 }}>{u}</span></div>
        {sub && <div style={{ marginTop: 8, fontSize: 12, color: P.faint, whiteSpace: "nowrap" }}>{sub}</div>}
      </div>
    ))}
  </div>
);
const Curve: React.FC<{ pct: number; facts: [string, string][]; title?: string }> = ({ pct, facts, title = "bonding curve" }) => (
  <div style={{ paddingTop: 20, borderTop: `1px solid ${P.rule}` }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
      <span style={{ fontWeight: 600, fontSize: 15 }}><span style={{ color: P.mint }}>pump.fun</span> {title}</span>
      <span style={{ fontFamily: tight, fontWeight: 700, fontSize: 32, letterSpacing: "-0.02em", color: P.mint, textShadow: "0 0 24px rgba(63,224,160,0.35)" }}>{pct.toFixed(pct >= 10 ? 0 : pct > 0 ? 2 : 1)}%</span>
    </div>
    <div style={{ height: 8, borderRadius: 8, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
      <div style={{ width: `${Math.max(pct, 0.6)}%`, height: "100%", borderRadius: 8, background: "linear-gradient(90deg, #2bc4d9, #3fe0a0)", boxShadow: "0 0 18px rgba(63,224,160,0.4)" }} />
    </div>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${facts.length}, 1fr)`, gap: 8, marginTop: 14 }}>
      {facts.map(([k, v]) => <div key={k}><div style={{ fontSize: 12.5, color: P.dim }}>{k}</div><div style={{ marginTop: 4, fontFamily: tight, fontWeight: 600, fontSize: 18 }}>{v}</div></div>)}
    </div>
  </div>
);

/* ---------- the timeline ---------- */
const X = 14;
const LENS: [string, number][] = [["poster", 100], ["find", 130], ["coin", 190], ["party", 300], ["open", 210], ["post", 170], ["seats", 290], ["launch", 170], ["claim", 170], ["end", 150]];
const T: Record<string, { from: number; len: number }> = {};
{ let a = 0; for (const [k, len] of LENS) { T[k] = { from: a, len }; a += len - X; } }
export const PARTY_HOWTO_TOTAL = T.end.from + T.end.len;
const Fader: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const f = useCurrentFrame(), len = T[id].len;
  const o = (id === "poster" ? 1 : interpolate(f, [0, X], [0, 1], clamp)) * (id === "end" ? 1 : interpolate(f, [len - X, len], [1, 0], clamp));
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
const Shot: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <Sequence name={id} from={T[id].from} durationInFrames={T[id].len}><Fader id={id}>{children}</Fader></Sequence>
);

/* ======================================================================================================================
 * 0 · Poster: composed at frame 0
 * ==================================================================================================================== */
const Poster: React.FC<{ end?: boolean }> = ({ end }) => {
  const f = useCurrentFrame(), late = end ? ramp(f, 30, 14) : 1;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #ecfdf3 0%, #c9f7dc 55%, #9eeec0 100%)" }}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 36%, rgba(255,255,255,0.9), transparent 55%)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
        <div style={{ marginTop: -40 }}><Ring size={470} /></div>
        <div style={{ marginTop: 8, fontFamily: tight, fontWeight: 800, fontSize: 104, lineHeight: 1, letterSpacing: "-0.045em", color: W.ink }}>Launch Party</div>
        <div style={{ fontFamily: tight, fontWeight: 700, fontSize: 34, letterSpacing: "-0.02em", color: W.ink }}>Bundle a coin with a crew on <span style={{ color: W.deep }}>pump.fun</span></div>
        <div style={{ marginTop: 14, opacity: late }}><Chip size={24} dot>{end ? "Live now · tweetpad.io/party" : "Live now"}</Chip></div>
        {end && <div style={{ marginTop: 8, opacity: ramp(f, 44, 14), fontFamily: inter, fontWeight: 600, fontSize: 22, color: W.dim }}>Powered by the <b style={{ color: W.ink }}>@launchpartyV4</b> SDK</div>}
      </AbsoluteFill>
      {end && <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, textAlign: "center", fontFamily: inter, fontSize: 15, color: "#4e5a52", opacity: ramp(f, 56, 14) }}>
        Refundable until launch. Not affiliated with pump.fun; parties launch through pump.fun's public programs.</div>}
    </AbsoluteFill>
  );
};

/* ======================================================================================================================
 * 1 · Find it: tweetpad.io/party
 * ==================================================================================================================== */
const Find: React.FC = () => {
  const f = useCurrentFrame(), url = typed("tweetpad.io/party", f, 14, 1.6), page = ramp(f, 48, 16);
  return (
    <AbsoluteFill>
      <Canvas glow={0.7} />
      <Caption lines={[["Start at tweetpad.io/party", 6]]} />
      <div style={{ position: "absolute", left: 120, top: 190, width: 840, borderRadius: 24, overflow: "hidden", background: "#ffffff", boxShadow: "0 0 0 1px rgba(11,13,16,0.08), 0 60px 120px -40px rgba(11,13,16,0.5)", rotate: `${hand(f, 1, 0.12)}deg` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", background: "#f1f3f2", borderBottom: "1px solid rgba(11,13,16,0.07)" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <i key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />)}
          <div style={{ flex: 1, marginLeft: 12, padding: "10px 16px", borderRadius: 12, background: "#ffffff", fontFamily: inter, fontSize: 19, color: W.ink, boxShadow: "inset 0 0 0 1px rgba(11,13,16,0.08)" }}>
            {url}<span style={{ opacity: f < 48 && Math.floor(f / 8) % 2 === 0 ? 1 : 0 }}>|</span></div>
        </div>
        <div style={{ height: 560, position: "relative", background: `radial-gradient(60% 50% at 20% 10%, rgba(63,224,160,0.2), transparent 70%), radial-gradient(50% 60% at 90% 10%, rgba(29,155,240,0.25), transparent 70%), ${P.bg}`, opacity: page }}>
          <div style={{ position: "absolute", left: 48, top: 64, color: P.ink }}>
            <div style={{ fontFamily: tight, fontWeight: 800, fontSize: 64, letterSpacing: "-0.04em" }}>Launch Party</div>
            <div style={{ marginTop: 10, fontFamily: tight, fontWeight: 700, fontSize: 22, letterSpacing: "-0.015em" }}>Bundle a coin with a crew on <span style={{ color: P.mint }}>pump.fun</span></div>
            <div style={{ marginTop: 14, width: 400, fontFamily: inter, fontSize: 17, lineHeight: 1.5, color: "#b9c0ca" }}>Seats at one price, refundable until launch. At launch they all buy together and split the coins.</div>
            <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
              <div style={{ width: 210 }}><Btn press={interpolate(f, [96, 99, 105], [0, 1, 0], clamp)}>Throw a party</Btn></div>
              <div style={{ padding: "17px 22px", borderRadius: 16, background: P.fill, fontWeight: 600, fontSize: 16 }}>Share</div>
            </div>
          </div>
          <div style={{ position: "absolute", right: 34, top: 70 }}><Ring size={290} /></div>
          <div style={{ position: "absolute", left: 48, right: 48, bottom: 40, paddingTop: 18, borderTop: `1px solid ${P.rule}`, display: "flex", justifyContent: "space-between", color: P.ink, fontFamily: tight, fontWeight: 600, fontSize: 21 }}>
            <span>Open now</span><span style={{ fontFamily: inter, fontSize: 15, color: P.dim }}>3 parties</span></div>
        </div>
      </div>
      <Cursor from={52} path={[[52, 760, 900], [90, 272, 557], [130, 272, 557]]} clicks={[96]} />
    </AbsoluteFill>
  );
};

/* ======================================================================================================================
 * 2 · The coin
 * ==================================================================================================================== */
const Field: React.FC<{ label: string; value: string; ph: string; left?: number; caret?: boolean; big?: boolean }> = ({ label, value, ph, left, caret, big }) => (
  <div>
    <Label right={left !== undefined ? <span style={{ color: P.faint, fontWeight: 500 }}>{left}</span> : undefined}>{label}</Label>
    <div style={{ padding: "15px 16px", borderRadius: 14, background: P.fill, border: caret ? "1px solid rgba(29,155,240,0.6)" : "1px solid transparent", fontFamily: big ? tight : inter, fontWeight: big ? 700 : 500, fontSize: 19, color: value ? P.ink : P.faint }}>
      {value || ph}{caret && <span style={{ color: P.blue }}>|</span>}
    </div>
  </div>
);
const Coin: React.FC = () => {
  const f = useCurrentFrame(), pic = interpolate(f, [40, 54], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 1.45, 0.5, 1) });
  const name = typed("Crew", f, 74, 3), tick = typed("CREW", f, 112, 3);
  return (
    <AbsoluteFill>
      <Canvas glow={0.7} />
      <Caption lines={[["Name your coin.", 6]]} />
      <div style={{ position: "absolute", left: 220, top: 180, rotate: `${hand(f, 2, 0.12)}deg` }}>
        <Glass w={640}>
          <Bar />
          <div style={{ fontFamily: tight, fontWeight: 800, fontSize: 40, letterSpacing: "-0.035em" }}>Launch a crew bundle</div>
          <div style={{ marginTop: 6, fontSize: 14, color: P.faint }}>Powered by the <b style={{ color: P.dim }}>@launchpartyV4</b> SDK</div>
          <div style={{ marginTop: 26, paddingTop: 22, borderTop: `1px solid ${P.rule}` }}>
            <div style={{ fontFamily: tight, fontWeight: 600, fontSize: 18, marginBottom: 16 }}>The coin</div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ position: "relative", width: 150, height: 172, flex: "none", borderRadius: 22, border: "1.5px dashed rgba(255,255,255,0.14)", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 14, color: P.dim, overflow: "hidden" }}>
                Add a picture
                <div style={{ position: "absolute", inset: 0, opacity: pic, scale: 0.6 + 0.4 * pic, background: "#e8ebe8" }}><Img src={coinPic} style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated" }} /></div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label="Name" value={name} ph="Party Coin" left={32 - name.length} caret={f >= 70 && f < 108} big />
                <Field label="Ticker" value={tick} ph="PARTY" left={10 - tick.length} caret={f >= 108} big />
              </div>
            </div>
            <div style={{ marginTop: 14 }}><Field label="Description" value="" ph="What it's about, in one line (optional)" /></div>
          </div>
        </Glass>
      </div>
      <Cursor from={20} path={[[20, 900, 900], [38, 320, 505], [66, 320, 505], [72, 620, 467], [104, 620, 467], [110, 620, 560], [190, 620, 560]]} clicks={[40, 72, 110]} />
    </AbsoluteFill>
  );
};

/* ======================================================================================================================
 * 3 · The party: seats, price, fees, who can join, unlock
 * ==================================================================================================================== */
const Party: React.FC = () => {
  const f = useCurrentFrame();
  const seats = f >= 40 ? 10 : 9, price = f >= 66 ? 0.1 : 0.05, raise = seats * price;
  const who = f >= 150 ? 2 : 0, gate = ramp(f, 168, 14), unlock = f >= 236 ? 2 : 0;
  const scroll = interpolate(f, [120, 150, 210, 236], [0, -150, -150, -250], { ...clamp, easing: Easing.bezier(0.45, 0, 0.2, 1) });
  const pill = (v: string, on: boolean) => <span key={v} style={{ padding: "6px 11px", borderRadius: 99, background: on ? "rgba(255,255,255,0.12)" : "transparent", color: on ? P.ink : P.dim, fontWeight: 600, fontSize: 13.5 }}>{v}</span>;
  return (
    <AbsoluteFill>
      <Canvas glow={0.7} />
      <div style={{ position: "absolute", left: 220, top: 0, width: 640, height: 1080, overflow: "hidden", maskImage: "linear-gradient(180deg, transparent 150px, #000 200px, #000 980px, transparent 1060px)" }}>
        <div style={{ position: "absolute", left: 0, top: 190 + scroll, rotate: `${hand(f, 3, 0.1)}deg` }}>
          <Glass w={640}>
            <div style={{ fontFamily: tight, fontWeight: 600, fontSize: 18, marginBottom: 16 }}>The party</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <Label>Seats</Label>
                <div style={{ display: "flex", alignItems: "center", gap: 6, height: 68, padding: "0 10px 0 18px", borderRadius: 16, background: P.fill }}>
                  <span style={{ flex: 1, fontFamily: tight, fontWeight: 700, fontSize: 30, letterSpacing: "-0.02em" }}>{seats}</span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: P.dim, marginRight: 6 }}>seats</span>
                  {["−", "+"].map((s) => <span key={s} style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.07)", fontSize: 20 }}>{s}</span>)}
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 8 }}>{["5", "10", "20", "50", "100"].map((v) => pill(v, Number(v) === seats))}</div>
              </div>
              <div>
                <Label right={<span style={{ fontWeight: 500 }}>≈ ${(price * SOL_USD).toFixed(2)}</span>}>Seat price</Label>
                <div style={{ display: "flex", alignItems: "center", height: 68, padding: "0 18px", borderRadius: 16, background: P.fill }}>
                  <span style={{ flex: 1, fontFamily: tight, fontWeight: 700, fontSize: 30, letterSpacing: "-0.02em" }}>{price}</span><span style={{ fontWeight: 600, fontSize: 14, color: P.dim }}>SOL</span>
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 8 }}>{["0.05", "0.1", "0.25", "0.5", "1"].map((v) => pill(v, Number(v) === price))}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 14, padding: "14px 16px", borderRadius: 14, background: "rgba(63,224,160,0.08)" }}>
              <span style={{ fontSize: 13, color: P.dim }}>Raise</span>
              <span style={{ fontFamily: tight, fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", color: P.mint }}>{raise.toFixed(raise >= 1 ? 0 : 2).replace(/\.?0+$/, "")} SOL</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>≈ ${(raise * SOL_USD).toFixed(0)}</span>
              <span style={{ marginLeft: "auto", fontSize: 13, color: P.dim }}>one buy at launch, {seats} equal shares</span>
            </div>
            <div style={{ marginTop: 20 }}><Label>Creator fees</Label><Seg opts={[["The crew", "split by the seats"], ["Me", "to your wallet"], ["Holders", "pump.fun's rewards"]]} on={0} /></div>
            <div style={{ marginTop: 20 }}><Label>Who can join</Label><Seg opts={[["Anyone", "with the link"], ["Whitelist", "wallets you list"], ["Token holders", "of a coin you pick"]]} on={who} /></div>
            <div style={{ height: gate * 128, opacity: gate, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 14, background: P.fill }}>
                  <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 24, height: 24 }} /><b style={{ fontFamily: tight, fontSize: 18 }}>$TP</b><span style={{ fontFamily: mono, fontSize: 13, color: P.dim }}>BctF…EQDN</span></div>
                <div style={{ padding: "14px 16px", borderRadius: 14, background: P.fill, fontFamily: tight, fontWeight: 700, fontSize: 18 }}>1,000,000</div>
              </div>
              <div style={{ marginTop: 10, fontSize: 13, color: P.faint }}>58 wallets hold 1,000,000 $TP or more on Solana now, and they all go on the whitelist.</div>
            </div>
            <div style={{ marginTop: 20 }}><Label>Coins unlock</Label><Seg opts={[["At launch"], ["1 day"], ["3 days"], ["7 days"]]} on={unlock} /></div>
          </Glass>
        </div>
      </div>
      <Caption lines={[["Pick the seats and the price.", 6, 118], ["Pick who can join.", 120]]} />
      <Cursor from={20} path={[[20, 900, 950], [38, 505, 311], [56, 505, 311], [64, 621, 367], [100, 621, 367], [140, 733, 520], [148, 733, 488], [176, 733, 488], [226, 613, 640], [234, 613, 618], [300, 613, 618]]} clicks={[40, 66, 150, 236]} />
    </AbsoluteFill>
  );
};

/* ======================================================================================================================
 * 4 · Open it: the curve preview, one signature, the done page
 * ==================================================================================================================== */
const Open: React.FC = () => {
  const f = useCurrentFrame(), fill = interpolate(f, [10, 50], [0, 4.31], { ...clamp, easing: ease });
  const press = interpolate(f, [74, 77, 83], [0, 1, 0], clamp), sheet = interpolate(f, [80, 96, 124, 136], [0, 1, 1, 0], { ...clamp, easing: ease });
  const done = ramp(f, 132, 18);
  return (
    <AbsoluteFill>
      <Canvas glow={0.7} />
      <Caption lines={[["One signature. Your party is open.", 6]]} />
      <div style={{ position: "absolute", left: 220, top: 190, rotate: `${hand(f, 4, 0.1)}deg` }}>
        <Glass w={640} style={{ height: 640 }}>
          <div style={{ opacity: 1 - done }}>
            <Curve pct={fill} title="bonding curve at launch" facts={[["The crew's buy", "0.99 SOL"], ["Each seat gets", "3.42M $CREW"], ["Graduates at", "~85 SOL"]]} />
            <div style={{ marginTop: 22, paddingTop: 20, borderTop: `1px solid ${P.rule}`, fontSize: 15 }}>
              <div style={{ fontFamily: tight, fontWeight: 600, fontSize: 18, marginBottom: 12 }}>Due now</div>
              {[["Your 1 seat", "0.1 SOL"], ["Seat deposit", "0.0016 SOL"], ["Launch reserve", "0.04 SOL"], ["Room rent", "0.0044 SOL"], ["$TP holders whitelist (58)", "0.0174 SOL"]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 9, color: "#b9c0ca" }}><span>{k}</span><span style={{ color: P.ink }}>{v}</span></div>))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${P.rule}`, fontWeight: 600 }}>
                <span>Total</span><span style={{ fontFamily: tight, fontWeight: 700, fontSize: 26 }}>~0.164 SOL</span></div>
            </div>
            <div style={{ marginTop: 22 }}><Btn press={press}>Open the party</Btn></div>
          </div>
          {/* the done page */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, opacity: done, scale: 0.96 + 0.04 * done }}>
            <div style={{ width: 150, height: 150, borderRadius: 40, overflow: "hidden", background: "#e8ebe8", boxShadow: "0 28px 70px rgba(0,0,0,0.5), 0 0 90px rgba(63,224,160,0.16)" }}><Img src={coinPic} style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} /></div>
            <StateChip text="Your party is open" color={P.mint} />
            <div style={{ fontFamily: tight, fontWeight: 700, fontSize: 44, letterSpacing: "-0.03em" }}>Crew</div>
            <div style={{ fontSize: 17, color: P.dim }}><b style={{ color: P.ink }}>$CREW</b> · 10 seats · 0.1 SOL each · $TP holders</div>
            <div style={{ display: "flex", gap: 8, margin: "6px 0 10px" }}>{Array.from({ length: 10 }, (_, i) => <Seat key={i} i={i === 0 ? 9 : null} size={36} mine={i === 0} />)}</div>
            <div style={{ width: 520 }}><Btn>Tweet your party</Btn></div>
          </div>
        </Glass>
      </div>
      {/* the wallet's sheet */}
      <div style={{ position: "absolute", left: 300, right: 300, bottom: 0, translate: `0px ${(1 - sheet) * 420}px`, padding: "26px 26px 40px", borderRadius: "28px 28px 0 0", background: "#1b1f27",
        boxShadow: "0 -30px 80px rgba(0,0,0,0.45)", color: P.ink, fontFamily: inter, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #ab9ff2, #6c5ce7)" }} /><b style={{ fontSize: 19 }}>Confirm in your wallet</b></div>
        <div style={{ fontSize: 15, color: P.dim }}>Open $CREW's party and take 1 seat · Solana</div>
        <div style={{ padding: 15, borderRadius: 14, textAlign: "center", fontWeight: 700, fontSize: 17, background: "#ab9ff2", color: "#16121f", scale: 1 - interpolate(f, [112, 115, 121], [0, 1, 0], clamp) * 0.03 }}>Approve</div>
      </div>
      <Cursor from={56} path={[[56, 860, 960], [72, 540, 665], [100, 540, 665], [110, 540, 1010], [150, 540, 1010]]} clicks={[74, 112]} to={150} />
    </AbsoluteFill>
  );
};

/* ======================================================================================================================
 * 5 · Post it on X; 6 · the crew takes seats in the post
 * ==================================================================================================================== */
const TWEET = "Throwing a launch party: $CREW on @pumpfun. 10 seats at 0.1 SOL, refundable until launch. Every seat buys at launch, at the same price. For $TP holders. Take a seat 👇";
const RoomCard: React.FC<{ seated: number; f: number; launched?: number; joinAt?: (i: number) => number }> = ({ seated, f, launched = 0, joinAt }) => {
  const pct = seated ? STEPS[seated - 1] : 0;
  return (
    <div style={{ width: 560, padding: "20px 22px", borderRadius: 22, color: P.ink, fontFamily: inter, background: `radial-gradient(60% 50% at 15% 0%, rgba(29,155,240,0.2), transparent 70%), ${P.bg}`, boxShadow: "0 0 0 1px rgba(11,13,16,0.1)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px 4px 4px", borderRadius: 99, background: P.fill, fontFamily: FONTS.round, fontWeight: 600, fontSize: 14 }}><Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 20, height: 20 }} />tweetpad</span>
        <span style={{ marginLeft: "auto" }}><StateChip text={launched > 0.5 ? "Launched" : `Open · ${seated} of 10`} color={launched > 0.5 ? P.mint : P.blue} /></span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
        <div style={{ width: 62, height: 62, borderRadius: 18, overflow: "hidden", background: "#e8ebe8" }}><Img src={coinPic} style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} /></div>
        <div><div style={{ fontFamily: tight, fontWeight: 700, fontSize: 26, letterSpacing: "-0.025em" }}>Crew</div><div style={{ fontSize: 14, color: P.dim }}><b style={{ color: P.ink }}>$CREW</b> · hosted by @you</div></div>
      </div>
      <div style={{ marginTop: 14 }}>
        {launched > 0.5
          ? <Tiles items={[["A seat got", "3.42M", "$CREW", "0.34% of supply"], ["Market cap", "29.8", "SOL", "≈ $3.1K"], ["Party of", "10", "seats", "one buy, one price"]]} />
          : <Tiles items={[["Seat price", "0.1", "SOL", "≈ $10.46 · refundable"], ["Seats left", String(10 - seated), "of 10", "$TP holders only"], ["Each seat gets", "3.42M", "$CREW", "0.34% of supply"]]} />}
      </div>
      {launched <= 0.5 && <div style={{ display: "flex", gap: 7, marginTop: 16 }}>{Array.from({ length: 10 }, (_, i) => <Seat key={i} i={i < seated ? (i === 0 ? 9 : i - 1) : null} size={36} t={joinAt ? interpolate(f, [joinAt(i), joinAt(i) + 10], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 1.45, 0.5, 1) }) : 1} />)}</div>}
      <div style={{ marginTop: 16 }}><Curve pct={launched > 0.5 ? 4.8 : pct} facts={launched > 0.5 ? [["In the curve", "1.09 SOL"], ["Still for sale", "755M"], ["Graduates at", "~85 SOL"]] : [["The crew's buy", "0.99 SOL"], ["Taken now", `${pct.toFixed(2)}%`], ["Graduates at", "~85 SOL"]]} /></div>
    </div>
  );
};
const XPost: React.FC<{ text: string; children?: React.ReactNode }> = ({ text, children }) => (
  <div style={{ width: 640, padding: "22px 26px 20px", borderRadius: 28, background: "#ffffff", boxShadow: "0 0 0 1px rgba(11,13,16,0.07), 0 60px 110px -50px rgba(21,128,61,0.4)", fontFamily: inter }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <span style={{ width: 46, height: 46, borderRadius: 23, overflow: "hidden" }}><Img src={staticFile("party/noun-9.svg")} style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} /></span>
      <div><div style={{ fontWeight: 800, fontSize: 19, color: W.ink }}>you</div><div style={{ fontSize: 15, color: W.dim }}>@you · now</div></div>
      <svg width="26" height="26" viewBox="0 0 24 24" style={{ marginLeft: "auto" }}><path fill="#0b0d10" d="M18.2 2.3h3.3l-7.2 8.3 8.5 11.2h-6.7l-5.2-6.8-6 6.8H1.6l7.7-8.8L1.2 2.3h6.8l4.7 6.2 5.5-6.2zm-1.2 17.6h1.8L7.1 4.2H5.1l11.9 15.7z" /></svg>
    </div>
    <div style={{ fontSize: 19, lineHeight: 1.4, color: W.ink, minHeight: 80 }}>{text.split(/(@pumpfun|\$CREW|\$TP)/).map((p, i) => <span key={i} style={{ color: /^[@$]/.test(p) ? W.blue : undefined }}>{p}</span>)}</div>
    {children && <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>{children}</div>}
  </div>
);
const Post: React.FC = () => {
  const f = useCurrentFrame(), text = typed(TWEET, f, 16, 0.55), posted = ramp(f, 112, 18);
  return (
    <AbsoluteFill>
      <Canvas glow={0.7} />
      <Caption lines={[["Post it on X.", 6]]} />
      <div style={{ position: "absolute", left: 220, top: 190, rotate: `${hand(f, 5, 0.12)}deg` }}>
        <XPost text={text}>{posted > 0 && <div style={{ opacity: posted, scale: 0.94 + 0.06 * posted }}><RoomCard seated={1} f={f} /></div>}</XPost>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14, opacity: 1 - posted }}>
          <span style={{ padding: "13px 26px", borderRadius: 99, background: W.ink, color: "#fff", fontFamily: inter, fontWeight: 800, fontSize: 17, scale: 1 - interpolate(f, [104, 107, 113], [0, 1, 0], clamp) * 0.05 }}>Post</span>
        </div>
      </div>
      <Cursor from={80} path={[[80, 900, 950], [100, 815, 402], [130, 815, 402]]} clicks={[104]} to={130} />
    </AbsoluteFill>
  );
};
const joinAt = (i: number) => (i === 0 ? -100 : 20 + (i - 1) * 22);
const Seats: React.FC = () => {
  const f = useCurrentFrame(), seated = 1 + CREW.slice(0, 9).filter((_, i) => f >= joinAt(i + 1)).length, who = seated - 1;
  const nope = interpolate(f, [100, 108, 150, 160], [0, 1, 1, 0], clamp), shake = Math.sin((f - 100) * 1.6) * interpolate(f, [104, 120], [9, 0], clamp);
  return (
    <AbsoluteFill>
      <Canvas glow={0.8} />
      <Caption lines={[["Your crew joins in the post.", 6, 150], ["Refundable until launch.", 152]]} />
      <div style={{ position: "absolute", left: 220, top: 176, rotate: `${hand(f, 6, 0.12)}deg`, scale: 1.0 }}>
        <XPost text={TWEET}><RoomCard seated={seated} f={f} joinAt={joinAt} /></XPost>
      </div>
      {/* who just took a seat; a wallet with no $TP, turned away */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, display: "flex", justifyContent: "center", gap: 14 }}>
        {who >= 1 && (
          <div key={who} style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "9px 22px 9px 9px", borderRadius: 999, background: "#ffffff", boxShadow: "0 0 0 1px rgba(11,13,16,0.08), 0 16px 30px -18px rgba(11,13,16,0.4)",
            fontFamily: inter, fontWeight: 700, fontSize: 22, color: W.ink, opacity: ramp(f, joinAt(who), 8) }}>
            <Pfp i={who - 1} size={40} ring={W.pill} />@{CREW[who - 1]} <span style={{ color: W.dim, fontWeight: 600 }}>took a seat</span><span style={{ fontFamily: mono, color: W.deep }}>{seated}/10</span>
          </div>
        )}
      </div>
      <div style={{ position: "absolute", right: 60, top: 850, opacity: nope, translate: `${shake}px 0px`, display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 16, background: "#ffffff",
        boxShadow: "0 0 0 2px rgba(249,115,22,0.35), 0 16px 30px -18px rgba(11,13,16,0.4)", fontFamily: inter, fontSize: 17, color: W.ink }}>
        <span style={{ width: 34, height: 34, borderRadius: 17, background: "#e8ebe8", display: "grid", placeItems: "center", fontWeight: 800, color: "#9aa09a" }}>?</span>
        <div><b style={{ textDecoration: "line-through", color: "#9aa09a" }}>7xQp…f3Rk</b><div style={{ color: P.warn, fontWeight: 700, fontSize: 15 }}>No $TP · Hold $TP? Ask to join</div></div>
      </div>
    </AbsoluteFill>
  );
};

/* ======================================================================================================================
 * 7 · Launch: one buy, then the launched view
 * ==================================================================================================================== */
const Launch: React.FC = () => {
  const f = useCurrentFrame(), press = interpolate(f, [40, 43, 49], [0, 1, 0], clamp), flow = interpolate(f, [46, 80], [0, 1], { ...clamp, easing: ease });
  const flash = interpolate(f, [46, 50, 70], [0, 0.6, 0], clamp), landed = ramp(f, 76, 18);
  return (
    <AbsoluteFill>
      <Canvas glow={0.8 + flash} />
      <Caption lines={[["One buy. One price.", 6]]} />
      <div style={{ position: "absolute", left: 220, top: 186, rotate: `${hand(f, 7, 0.1)}deg` }}>
        <Glass w={640} style={{ height: 660 }}>
          <Bar right={<StateChip text={landed > 0.5 ? "Launched" : "Open · 10 of 10"} color={landed > 0.5 ? P.mint : P.blue} />} />
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 84, height: 84, borderRadius: 24, overflow: "hidden", background: "#e8ebe8" }}><Img src={coinPic} style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} /></div>
            <div><div style={{ fontFamily: tight, fontWeight: 700, fontSize: 34, letterSpacing: "-0.03em" }}>Crew</div><div style={{ fontSize: 15, color: P.dim }}><b style={{ color: P.ink }}>$CREW</b> · hosted by @you</div></div>
          </div>
          {landed < 0.5 ? (
            <div style={{ opacity: 1 - landed * 2 }}>
              <div style={{ display: "flex", gap: 8, margin: "26px 0 6px" }}>{Array.from({ length: 10 }, (_, i) => <Seat key={i} i={i === 0 ? 9 : i - 1} size={46} mine={i === 0} />)}</div>
              <div style={{ marginTop: 20 }}><Curve pct={4.31} facts={[["The crew's buy", "0.99 SOL"], ["Taken now", "4.31%"], ["Graduates at", "~85 SOL"]]} /></div>
              <div style={{ marginTop: 26 }}><Btn green press={press}>Launch $CREW on pump.fun</Btn></div>
              <svg width={640} height={300} style={{ position: "absolute", left: 0, top: 120, overflow: "visible", opacity: interpolate(flow, [0, 0.1, 0.9, 1], [0, 1, 1, 0]) }}>
                {Array.from({ length: 10 }, (_, i) => { const x = 28 + 23 + i * 54; return <path key={i} d={`M${x} 82 C ${x} 200, 320 260, 320 ${560 - 120}`} fill="none" stroke="#e0a21a" strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - flow} style={{ filter: "drop-shadow(0 0 8px rgba(224,162,26,0.6))" }} />; })}
              </svg>
            </div>
          ) : (
            <div style={{ opacity: landed }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "22px 0 12px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: tight, fontWeight: 700, fontSize: 18, color: P.mint }}><i style={{ width: 10, height: 10, borderRadius: 5, background: P.mint, boxShadow: "0 0 0 5px rgba(63,224,160,0.2)" }} />Launched on pump.fun</span>
                <span style={{ fontSize: 14, color: P.dim }}>just now</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 12px 14px 16px", borderRadius: 16, background: "rgba(0,0,0,0.3)" }}>
                <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: P.dim, marginBottom: 6 }}>Contract address</div><div style={{ fontFamily: mono, fontSize: 15 }}>{CA}</div></div>
                <span style={{ padding: "9px 14px", borderRadius: 10, background: P.ink, color: "#0a0d12", fontWeight: 700, fontSize: 14 }}>Copy</span>
              </div>
              <div style={{ display: "flex", gap: 20, margin: "12px 0 6px", fontWeight: 600, fontSize: 14, color: P.dim }}><span>pump.fun</span><span>DexScreener</span><span>Solscan</span></div>
              <div style={{ marginTop: 14 }}><Tiles items={[["A seat got", "3.42M", "$CREW", "0.34% of supply"], ["Market cap", "29.8", "SOL", "≈ $3.1K"], ["Party of", "10", "seats", "one buy, one price"]]} /></div>
              <div style={{ marginTop: 22 }}><Btn green>Claim your $CREW</Btn></div>
            </div>
          )}
        </Glass>
      </div>
      <AbsoluteFill style={{ background: "#ffffff", opacity: flash, pointerEvents: "none" }} />
      <Cursor from={14} path={[[14, 900, 960], [34, 540, 635], [70, 540, 635]]} clicks={[40]} to={70} />
    </AbsoluteFill>
  );
};

/* ======================================================================================================================
 * 8 · Claim as they unlock; the crew's fees
 * ==================================================================================================================== */
const Claim: React.FC = () => {
  const f = useCurrentFrame(), u = interpolate(f, [14, 60], [0, 0.4], { ...clamp, easing: ease }), press = interpolate(f, [84, 87, 93], [0, 1, 0], clamp), claimed = f >= 90;
  return (
    <AbsoluteFill>
      <Canvas glow={0.8} />
      <Caption lines={[["Claim as they unlock.", 6, 104], ["The crew shares the fees.", 106]]} />
      <div style={{ position: "absolute", left: 220, top: 210, rotate: `${hand(f, 8, 0.1)}deg` }}>
        <Glass w={640}>
          <div style={{ padding: "18px 18px 16px", borderRadius: 22, background: "linear-gradient(135deg, rgba(242,194,48,0.12), rgba(242,194,48,0.03))" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: 14, color: P.dim }}><span>Your seats</span><span style={{ color: P.ink }}>1 seat · 3.42M $CREW</span></div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 12 }}>
              <span style={{ fontFamily: tight, fontWeight: 700, fontSize: 52, letterSpacing: "-0.03em", color: "#ffe08a" }}>{claimed ? "1.37M" : (3.42 * u).toFixed(2) + "M"}</span>
              <span style={{ fontWeight: 600, fontSize: 16, color: P.dim }}>$CREW {claimed ? "claimed" : "to claim"}</span>
            </div>
            <div style={{ marginTop: 14, height: 7, borderRadius: 6, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}><div style={{ width: `${u * 100}%`, height: "100%", borderRadius: 6, background: "linear-gradient(90deg, #f2c230, #ffe08a)" }} /></div>
            <div style={{ marginTop: 8, fontSize: 13.5, color: P.dim }}>{Math.round(u * 100)}% unlocked · all of it in 1d 19h</div>
          </div>
          <div style={{ marginTop: 22 }}>{claimed ? <Btn green>Collect 0.012 SOL in crew fees</Btn> : <Btn green press={press}>Claim {(3.42 * u).toFixed(2)}M $CREW</Btn>}</div>
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${P.rule}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: P.dim, marginBottom: 6 }}><span>The crew</span><span style={{ color: P.ink, fontWeight: 600 }}>10 seats · {claimed ? 4 : 3} claimed</span></div>
            {[[9, "you", claimed], [0, "@miladyfren", true], [2, "@gm_kai", false]].map(([i, n, c], k) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: k ? `1px solid ${P.rule}` : "none" }}>
                <Pfp i={i as number} size={34} ring={k === 0 ? P.gold : "#2a5c86"} /><span style={{ flex: 1, fontWeight: 600, fontSize: 15, color: k === 0 ? "#ffe08a" : P.ink }}>{n as string}</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: c ? P.mint : P.dim }}>{c ? "Claimed" : "To claim · 1.37M"}</span>
              </div>))}
          </div>
        </Glass>
      </div>
      <Cursor from={60} path={[[60, 900, 960], [80, 540, 462], [130, 540, 462]]} clicks={[84]} to={130} />
    </AbsoluteFill>
  );
};

export const TweetpadPartyHowTo: React.FC = () => {
  loadFonts();
  return (
    <AbsoluteFill style={{ background: W.white }}>
      <Shot id="poster"><Poster /></Shot>
      <Shot id="find"><Find /></Shot>
      <Shot id="coin"><Coin /></Shot>
      <Shot id="party"><Party /></Shot>
      <Shot id="open"><Open /></Shot>
      <Shot id="post"><Post /></Shot>
      <Shot id="seats"><Seats /></Shot>
      <Shot id="launch"><Launch /></Shot>
      <Shot id="claim"><Claim /></Shot>
      <Shot id="end"><Poster end /></Shot>
    </AbsoluteFill>
  );
};
