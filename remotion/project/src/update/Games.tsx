/**
 * TweetpadGames: "Casino games, inside the tweet. Built on Gamba." 1080x1080 @30, 2012 skin, 40.7 s.
 * tweetpad's games on Gamba, as shipped in 96fafb3: /games, Pump or Dump, Mines, ⚡ Instant play and the fairness check.
 * The game pages are rebuilt here from assets/feature.css + assets/games.css (the 480 px frame, the dark screen, the chips and
 * the big buttons); every in-app string is verbatim from games/*.html and assets/gamba-kit.js, pumpordump.js, mines.js.
 * Demo plays: 0.05 SOL bets, and every amount on screen follows from the real odds and fees (3× pays 0.15; a call costs
 * 0.0519; Mines with 3 mines pays ×1.1363, ×1.1428, ×1.15). Each game shows a loss. No jackpot, volumes or player counts.
 * Gamba is named in words and by its shrimp mark (public/games/gamba.svg, from Gamba's platform template), never as a
 * partner: the small type says Gamba doesn't run or endorse tweetpad. Taps are ThreeNew's Tap (hand + ripple inside the
 * tapped control); the only cursor is on the generic wallet window ("Sign message").
 */
import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { BRAND, FONTS, skinOf } from "../brand/tokens";
import { Caption, Cursor, cursorAt, Fine, Ground } from "../components/Film";
import { SkinCtx } from "../components/ui";
import { Cam, camLerp, CaptionBand, WALLET_OK, WalletWindow } from "../howto/parts";
import { lerp, pop, ramp, settle } from "../lib/motion";
import { End } from "../scenes/End";
import { GAMES as R, GAMES_COPY as C } from "../timeline";
import { Tap } from "./ThreeNew";

const ui = FONTS.ui, mono = FONTS.mono;
const inWin = (f: number, a: number, b: number) => f >= a && f < b;
const capFade = (f: number, dur: number) => ramp(f, 0, 12) * (1 - ramp(f, dur - 10, dur, settle));
const sol = (n: number) => (Math.abs(n) >= 1 ? n.toFixed(2) : n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "") || "0");
const UP = "#2e9e4f", UP_HI = "#4fd06f", DN = "#d0343a", DN_HI = "#ff6a6a", GOLD = "#f5c542";

/* =========================================================================================
 * The stage: a game page (480 px wide, the card's width) at ×1.45, with the camera of films 10–12
 * ========================================================================================= */
const GW = 480, GH = 540, GS = 1.45, GX = (1080 - GW * GS) / 2, GY = 236;
const G_NO: Cam = { z: 1, fx: 240, fy: 270, k: 0 };
const toG = (ax: number, ay: number) => ({ x: GX + ax * GS, y: GY + ay * GS });
const GStage: React.FC<{ cam: Cam; t?: number; children: React.ReactNode }> = ({ cam, t = 1, children }) => {
  const F = toG(cam.fx, cam.fy);
  const Cc = { x: F.x + (540 - F.x) * cam.k, y: F.y + (640 - F.y) * cam.k };
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 214, bottom: 38, overflow: "hidden", opacity: t }}>
      <div style={{ position: "absolute", left: 0, top: -214, width: 1080, height: 1080, transformOrigin: "0 0",
        transform: `translate(${Cc.x}px, ${Cc.y}px) scale(${cam.z}) translate(${-F.x}px, ${-F.y}px)` }}>
        <div style={{ position: "absolute", left: GX, top: GY, width: GW, height: GH, transform: `scale(${GS})`, transformOrigin: "0 0", borderRadius: 7, overflow: "hidden",
          boxShadow: "0 14px 40px rgba(20,23,26,.2)", border: "1px solid #c8c8c8" }}>
          {children}
        </div>
      </div>
    </div>
  );
};

/* ---------- the page: feature.css's blue bar and a column of cards ---------- */
const GameFrame: React.FC<{ title: string; mark: React.ReactNode; scroll?: number; sound?: boolean; children: React.ReactNode }> = ({ title, mark, scroll = 0, sound = true, children }) => (
  <div style={{ width: GW, height: GH, display: "flex", flexDirection: "column", background: "#e6e6e6", color: "#333", font: `13px/1.35 ${ui}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none", padding: "8px 10px", color: "#fff", background: "linear-gradient(#63b8ee, #3c9ad9 50%, #2b86cc)",
      borderBottom: "1px solid #1d6aa5", boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 1px 3px rgba(0,0,0,.25)", position: "relative", zIndex: 2 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 8px 2px 4px" }}>
        <span style={{ font: `bold 20px/1 ${ui}`, opacity: 0.85 }}>‹</span>
        <Img src={staticFile("brand/tweetpad-hash-256.png")} style={{ width: 24, height: 24 }} />
        <span style={{ font: `600 19px/1 ${FONTS.round}`, textShadow: "0 -1px 0 rgba(0,0,0,.3)" }}>tweetpad</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", padding: "4px 9px", font: `bold 13px/1 ${ui}`, textShadow: "0 -1px 0 rgba(0,0,0,.3)",
        background: "rgba(0,0,0,.18)", border: "1px solid rgba(255,255,255,.35)", borderRadius: 12 }}>{mark}{title}</span>
      {sound ? <span style={{ width: 26, height: 26, display: "grid", placeItems: "center", font: `bold 14px/1 ${ui}`, background: "rgba(0,0,0,.18)", border: "1px solid rgba(255,255,255,.35)", borderRadius: "50%" }}>♪</span> : null}
    </div>
    <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, transform: `translateY(${-scroll}px)` }}>{children}</div>
    </div>
  </div>
);
const PodMark = <span style={{ font: `bold 9px/1 ${ui}`, letterSpacing: -1, color: "#b8ffcf" }}>▲▼</span>;
const box: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, padding: 10, background: "#fff", border: "1px solid #c8c8c8", borderRadius: 5, boxShadow: "0 1px 2px rgba(0,0,0,.12)" };
const btn: React.CSSProperties = { position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 12px", color: "#333", font: `bold 12px/1 ${ui}`,
  textShadow: "0 1px 0 #fff", whiteSpace: "nowrap", background: "linear-gradient(#fff, #e6e6e6)", border: "1px solid #bbb", borderBottomColor: "#a2a2a2", borderRadius: 4 };
const primary: React.CSSProperties = { color: "#fff", textShadow: "0 -1px 0 rgba(0,0,0,.25)", background: "linear-gradient(#33bcef, #019ad2)", borderColor: "#057ed0", borderBottomColor: "#0466a8" };
const linkish: React.CSSProperties = { position: "relative", color: "#0084b4", font: `bold 12px/1 ${ui}` };

/** .chips / .gk-mode: segmented buttons; the tap is drawn inside the tapped one */
const Seg: React.FC<{ items: string[]; on: number; f: number; tapAt?: Record<number, number>; pad?: string; dim?: boolean }> = ({ items, on, f, tapAt = {}, pad = "5px 8px", dim }) => (
  <span style={{ display: "flex" }}>
    {items.map((s, i) => {
      const sel = i === on;
      return (
        <span key={s} style={{ ...btn, padding: pad, marginLeft: i ? -1 : 0, borderRadius: i === 0 ? "4px 0 0 4px" : i === items.length - 1 ? "0 4px 4px 0" : 0, color: sel ? "#fff" : "#555",
          ...(sel ? { textShadow: "0 -1px 0 rgba(0,0,0,.25)", background: "linear-gradient(#2c8fd6, #4aa9e9)", borderColor: "#1d6aa5", boxShadow: "inset 0 1px 3px rgba(0,0,0,.3)", zIndex: 1 } : null),
          opacity: dim && !sel ? 0.55 : 1 }}>
          {s}{tapAt[i] !== undefined ? <Tap f={f} at={tapAt[i]} /> : null}
        </span>
      );
    })}
  </span>
);
const Label: React.FC<{ children: React.ReactNode; w?: number }> = ({ children, w = 30 }) => (
  <span style={{ width: w, flex: "none", color: "#999", font: `bold 11px/1.2 ${ui}`, textTransform: "uppercase" }}>{children}</span>
);
/** the Practice | Real SOL switch with the wallet, and the game balance row */
const WhoPlays: React.FC<{ f: number; bank: React.ReactNode }> = ({ f, bank }) => (
  <>
    <div style={{ display: "flex", alignItems: "center" }}>
      <Seg items={["Practice", "Real SOL"]} on={1} f={f} pad="5px 10px" />
      <span style={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: 6, color: "#777", fontSize: 12, whiteSpace: "nowrap" }}>
        <span>{C.addr} · 1.2 SOL</span><span style={linkish}>Disconnect</span></span>
    </div>
    {bank}
  </>
);
const bankRow: React.CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 10px", padding: "6px 8px", color: "#777", fontSize: 12, background: "#f4f9fd",
  border: "1px solid #d4e6f3", borderRadius: 4 };
const Bank: React.FC<{ balance: number; pulse?: number }> = ({ balance, pulse = 0 }) => (
  <div style={{ ...bankRow, boxShadow: pulse ? `0 0 0 ${3 * pulse}px rgba(29,161,242,${0.35 * pulse})` : undefined }}>
    <span style={{ flex: 1 }}>⚡ Game balance <b style={{ color: "#333" }}>{sol(balance)} SOL</b></span>
    <span style={linkish}>Top up</span><span style={linkish}>Withdraw</span><span style={linkish}>Lock</span>
  </div>
);
/** .gk-big: the big play buttons */
const Big: React.FC<{ kind: "up" | "dn" | "cash"; head: string; sub: string; f: number; at?: number; pressed?: boolean; dim?: boolean; h?: number }> = ({ kind, head, sub, f, at, pressed, dim, h = 52 }) => {
  const bg = kind === "up" ? `linear-gradient(${UP_HI}, ${UP})` : kind === "dn" ? `linear-gradient(${DN_HI}, ${DN})` : "linear-gradient(#ffd45e, #e2a51f)";
  const border = kind === "up" ? "#237a3d" : kind === "dn" ? "#a6262b" : "#b07c10";
  return (
    <span style={{ ...btn, flexDirection: "column", gap: 2, height: h, width: "100%", borderRadius: 6, color: kind === "cash" ? "#3d2a00" : "#fff",
      textShadow: kind === "cash" ? "0 1px 0 rgba(255,255,255,.35)" : "0 -1px 0 rgba(0,0,0,.3)", background: bg, borderColor: border, opacity: dim ? 0.55 : 1,
      transform: pressed ? "translateY(1px) scale(.98)" : undefined }}>
      <b style={{ font: `900 19px/1 ${ui}`, letterSpacing: ".02em" }}>{head}</b><span style={{ font: `bold 11px/1 ${ui}`, opacity: 0.9 }}>{sub}</span>
      {at !== undefined ? <Tap f={f} at={at} /> : null}
    </span>
  );
};

/* ---------- the dark screen, its status line and the stamp ---------- */
const Screen: React.FC<{ children: React.ReactNode; flash?: { kind: "win" | "lose"; at: number } | null; f: number; shake?: number }> = ({ children, flash, f, shake = 0 }) => {
  const k = flash ? f - flash.at : 99;
  const glow = flash && k >= 0 && k < 27 ? 1 - k / 27 : 0;
  const col = flash && flash.kind === "win" ? "79,208,111" : "255,90,95";
  const sx = shake && inWin(f, shake, shake + 12) ? Math.sin((f - shake) * 2.4) * 5 * (1 - (f - shake) / 12) : 0;
  return (
    <div style={{ position: "relative", overflow: "hidden", padding: "7px 8px 6px", color: "#cfe0ea", background: "radial-gradient(120% 90% at 50% 0%, #17283a 0%, #0c141b 70%)",
      border: "1px solid #08131b", borderRadius: 5, boxShadow: `inset 0 1px 0 rgba(255,255,255,.06), inset 0 0 60px rgba(${col},${0.8 * glow})`, transform: `translateX(${sx}px)` }}>
      {children}
    </div>
  );
};
const Status: React.FC<{ text: string; tone?: "ok" | "bad" | "" }> = ({ text, tone = "" }) => (
  <div style={{ minHeight: 17, textAlign: "center", font: `bold 12px/17px ${ui}`, color: tone === "ok" ? UP_HI : tone === "bad" ? DN_HI : "#8fa9b8" }}>{text}</div>
);
const Stamp: React.FC<{ f: number; at: number; kind: "win" | "lose"; title: string; sub: string }> = ({ f, at, kind, title, sub }) => {
  const k = f - at;
  if (k < 0 || k > 60) return null;
  const s = k < 9 ? 2.2 - 1.2 * pop(k, 0) : 1;
  const o = Math.min(1, k / 3) * (1 - ramp(k, 48, 60));
  const col = kind === "win" ? UP_HI : DN_HI;
  return (
    <div style={{ position: "absolute", left: "50%", top: "54%", zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 14px 5px", color: col,
      border: "3px solid currentColor", borderRadius: 6, background: "rgba(8,14,20,.78)", opacity: o, transform: `translate(-50%, -50%) rotate(-8deg) scale(${s})`,
      textShadow: `0 0 10px ${kind === "win" ? "rgba(79,208,111,.7)" : "rgba(255,90,95,.7)"}` }}>
      <b style={{ font: `bold 26px/1 ${ui}`, letterSpacing: ".02em", whiteSpace: "nowrap" }}>{title}</b><span style={{ font: `22px/1 ${mono}` }}>{sub}</span>
    </div>
  );
};

/* =========================================================================================
 * Pump or Dump's chart: candles for show; a call's candle wiggles while Gamba rolls, then closes on the result
 * ========================================================================================= */
type Candle = { o: number; c: number; h: number; l: number };
const rnd = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const gen = (n: number, p: number): Candle => { const r = rnd(1000 + n); const c = p * (1 + (r() - 0.49) * 0.025); const span = Math.abs(c - p) + p * 0.004;
  return { o: p, c, h: Math.max(p, c) + r() * span * 0.6, l: Math.min(p, c) - r() * span * 0.6 }; };
type Call = { at: number; res: number; up: boolean; lev: number };
const STEP = 18, HOLD = 34;
const wiggle = (o: number, k: number) => { const t = k / 30, amp = Math.min(0.012 + t * 0.02, 0.05); return o * (1 + Math.sin(t * 19) * amp * 0.7 + Math.sin(t * 7.3) * amp * 0.5); };
/** the candles at frame f: ambient steps while nobody plays, a call's candle while it plays and holds, then it joins the history */
function chartAt(f: number, calls: Call[]) {
  const hist: Candle[] = [];
  let p = 1, n = 0;
  for (let i = 0; i < 30; i++) { const c = gen(n++, p); hist.push(c); p = c.c; }
  let free = 0, steps = 0, cursor = 0;
  const ambient = (to: number) => { free += Math.max(0, to - cursor); const s = Math.floor(free / STEP); while (steps < s) { const c = gen(n++, p); hist.push(c); p = c.c; steps++; } };
  for (const call of calls) {
    ambient(Math.min(call.at, f));
    if (f < call.at) break;
    const o = p, from = wiggle(o, call.res - call.at), to = o * (1 + (0.05 + call.lev * 0.012) * (call.up ? 1 : -1));
    if (f < call.res) { const c = wiggle(o, f - call.at); return { hist, live: { o, c, h: Math.max(o, c, o * 1.012), l: Math.min(o, c, o * 0.988) } as Candle, rolling: true }; }
    const e = 1 - Math.pow(1 - Math.min(1, (f - call.res) / 16), 3), c = from + (to - from) * e;
    const done: Candle = { o, c, h: Math.max(o, c, o * 1.03), l: Math.min(o, c, o * 0.97) };
    if (f < call.res + HOLD) return { hist, live: done, rolling: false };
    hist.push(done); p = done.c; cursor = call.res + HOLD;
  }
  ambient(f);
  const lc = p * (1 + Math.sin(f * 0.21) * 0.004);
  return { hist, live: { o: p, c: lc, h: Math.max(p, lc) + p * 0.002, l: Math.min(p, lc) - p * 0.002 } as Candle, rolling: false };
}
const PodChart: React.FC<{ f: number; calls: Call[]; w?: number; h?: number }> = ({ f, calls, w = 442, h = 140 }) => {
  const { hist, live, rolling } = chartAt(f, calls);
  const all = [...hist.slice(-30), live];
  let hi = -Infinity, lo = Infinity;
  for (const c of all) { hi = Math.max(hi, c.h); lo = Math.min(lo, c.l); }
  const pad = (hi - lo) * 0.12 || 0.01; hi += pad; lo -= pad;
  const y = (v: number) => 6 + (h - 12) * (1 - (v - lo) / (hi - lo));
  const cw = w / (all.length + 1.5), bw = Math.max(3, cw * 0.62);
  const py = y(live.c), liveUp = live.c >= live.o;
  return (
    <svg width={w} height={h} style={{ display: "block", marginTop: 4, overflow: "visible" }}>
      {[1, 2, 3].map((i) => <line key={i} x1={0} x2={w} y1={Math.round((h * i) / 4) + 0.5} y2={Math.round((h * i) / 4) + 0.5} stroke="rgba(120,160,190,.09)" />)}
      {all.map((c, i) => {
        const x = cw * (i + 0.9), up = c.c >= c.o, col = up ? "#3ddc84" : "#ff5a5f", isLive = i === all.length - 1;
        const top = y(Math.max(c.o, c.c)), body = Math.max(2, y(Math.min(c.o, c.c)) - top);
        return (
          <g key={i} style={isLive ? { filter: `drop-shadow(0 0 ${rolling ? 7 : 4}px ${col})` } : undefined}>
            <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={col} />
            <rect x={x - bw / 2} y={top} width={bw} height={body} fill={col} />
          </g>
        );
      })}
      <line x1={0} x2={w} y1={py} y2={py} stroke={liveUp ? "rgba(61,220,132,.55)" : "rgba(255,90,95,.55)"} strokeDasharray="3 3" />
    </svg>
  );
};
const priceAt = (f: number, calls: Call[]) => { const { live } = chartAt(f, calls); return { v: live.c.toFixed(4), up: live.c >= live.o }; };
/** a win's rockets and coins, thrown up from the live candle */
const Burst: React.FC<{ f: number; at: number }> = ({ f, at }) => {
  const k = f - at;
  if (k < 0 || k > 45) return null;
  const t = k / 30, chars = ["🚀", "💰", "🟩", "✨"];
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
      {Array.from({ length: 20 }, (_, i) => {
        const r = rnd(50 + i), vx = (r() - 0.7) * 3, vy = -1.5 - r() * 2.5, size = 12 + r() * 12;
        return <span key={i} style={{ position: "absolute", left: 0.85 * 442 + vx * t * 60, top: 0.3 * 140 + 30 + (vy * t + 4.5 * t * t) * 60, font: `${size}px/1 serif`,
          opacity: Math.max(0, 1 - t / 1.5) }}>{chars[i % 4]}</span>;
      })}
    </div>
  );
};

/* =========================================================================================
 * Mines' board: 5×5, 38 px tiles; a tapped tile spins, then shows a gem or the mine
 * ========================================================================================= */
type TileState = "idle" | "spin" | "gem" | "boom" | "ghost" | "spent";
const Board: React.FC<{ f: number; states: TileState[]; taps: Record<number, number>; revealAt: Record<number, number> }> = ({ f, states, taps, revealAt }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5, width: 210, margin: "5px auto 3px" }}>
    {states.map((s, i) => {
      const k = revealAt[i] !== undefined ? f - revealAt[i] : 99;
      const popS = (s === "gem" || s === "boom") && k >= 0 && k < 10 ? 0.6 + 0.4 * pop(k, 0) : 1;
      const bg = s === "gem" ? "radial-gradient(circle at 50% 40%, #2f7a4c, #173d27)" : s === "boom" ? "radial-gradient(circle at 50% 40%, #a8333a, #4a1216)"
        : s === "ghost" ? "#241417" : s === "spin" ? "linear-gradient(#3d5d7a, #284256)" : "linear-gradient(#2a3d50, #1b2a39)";
      const shadow = s === "gem" ? "0 0 12px rgba(79,208,111,.45), inset 0 1px 0 rgba(255,255,255,.15)" : s === "boom" ? "0 0 16px rgba(255,90,95,.6)" : "inset 0 1px 0 rgba(255,255,255,.12)";
      const spin = s === "spin" ? Math.abs(Math.cos(f * 0.32)) : 1;
      return (
        <span key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: 6, background: bg, border: "1px solid #0a141c", borderBottomWidth: 3, boxShadow: shadow,
          display: "grid", placeItems: "center", font: "19px/1 serif", opacity: s === "spent" ? 0.45 : s === "ghost" ? 0.7 : 1,
          transform: `scale(${popS}) scaleX(${0.15 + 0.85 * spin})` }}>
          {s === "gem" ? "💎" : s === "boom" ? "💥" : s === "ghost" ? "💣" : ""}
          {taps[i] !== undefined ? <Tap f={f} at={taps[i]} /> : null}
        </span>
      );
    })}
  </div>
);
/** Mines with 3 mines: the multipliers api/gamba.js minesBet makes (cells left over safe ones left, rounded down to bps) */
const PAY = [1.1363, 1.1428, 1.15, 1.1578, 1.1666];

/* =========================================================================================
 * The film's frame around each app scene: the caption, the small type, the swirl of game pieces
 * ========================================================================================= */
type Piece = { kind: "gem" | "bomb" | "up" | "dn" };
const PIECES: Piece[] = ["gem", "up", "bomb", "gem", "dn", "up", "gem", "bomb", "up", "gem", "dn", "bomb", "gem", "up"].map((k) => ({ kind: k as Piece["kind"] }));
const PieceView: React.FC<{ p: Piece; size: number }> = ({ p, size }) => (
  p.kind === "gem" || p.kind === "bomb"
    ? <span style={{ display: "grid", placeItems: "center", width: size, height: size, borderRadius: size * 0.16, font: `${size * 0.52}px/1 serif`,
        background: p.kind === "gem" ? "radial-gradient(circle at 50% 40%, #2f7a4c, #173d27)" : "linear-gradient(#2a3d50, #1b2a39)",
        border: "1px solid #0a141c", borderBottomWidth: Math.max(2, size * 0.06), boxShadow: p.kind === "gem" ? "0 0 18px rgba(79,208,111,.45)" : "0 8px 20px rgba(20,40,70,.25)" }}>{p.kind === "gem" ? "💎" : "💣"}</span>
    : <span style={{ position: "relative", display: "block", width: size * 0.34, height: size }}>
        <span style={{ position: "absolute", left: "46%", top: -size * 0.18, width: 2, height: size * 1.36, background: p.kind === "up" ? "#3ddc84" : "#ff5a5f" }} />
        <span style={{ position: "absolute", inset: 0, borderRadius: 2, background: p.kind === "up" ? "#3ddc84" : "#ff5a5f", boxShadow: `0 0 14px ${p.kind === "up" ? "rgba(61,220,132,.6)" : "rgba(255,90,95,.6)"}` }} />
      </span>
);
type Ring = { n: number; rx: number; ry: number; speed: number; size: number; phase: number };
const Swirl: React.FC<{ f: number; cx: number; cy: number; rings: Ring[]; layer: "back" | "front" | "all"; opacity?: number; tilt?: number; floor?: number }> = ({ f, cx, cy, rings, layer, opacity = 1, tilt = -10, floor = 1080 }) => {
  let k = 0;
  const items: { key: string; x: number; y: number; d: number; size: number; p: Piece; spin: number }[] = [];
  rings.forEach((r, ri) => {
    for (let i = 0; i < r.n; i++) {
      const p = PIECES[(k++ * 5 + ri * 3) % PIECES.length];
      const a = r.phase + (i / r.n) * Math.PI * 2 + f * r.speed;
      const d = (Math.sin(a) + 1) / 2;
      if (layer === "back" && d >= 0.5) continue;
      if (layer === "front" && d < 0.5) continue;
      const x = Math.cos(a) * r.rx, yy = Math.sin(a) * r.ry, t = (tilt * Math.PI) / 180;
      items.push({ key: `${ri}-${i}`, x: cx + x * Math.cos(t) - yy * Math.sin(t), y: cy + x * Math.sin(t) + yy * Math.cos(t) + Math.sin(f * 0.07 + i) * 6, d,
        size: r.size * (0.55 + 0.6 * d), p, spin: Math.sin(f * 0.05 + i * 1.7) * 14 });
    }
  });
  items.sort((a, b) => a.d - b.d);
  return (
    <div style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none" }}>
      {items.map((it) => {
        const low = Math.max(0, Math.min(1, (floor - (it.y + it.size / 2)) / 60));
        return low <= 0 ? null : (
          <span key={it.key} style={{ position: "absolute", left: it.x - it.size / 2, top: it.y - it.size / 2, transform: `rotate(${it.spin}deg)`,
            filter: it.d < 0.35 ? `blur(${(0.35 - it.d) * 6}px)` : undefined, opacity: (0.45 + 0.55 * it.d) * low }}><PieceView p={it.p} size={it.size} /></span>
        );
      })}
    </div>
  );
};
const RINGS_BIG: Ring[] = [{ n: 8, rx: 300, ry: 92, speed: 0.022, size: 96, phase: 0 }, { n: 12, rx: 470, ry: 150, speed: -0.014, size: 84, phase: 0.6 }];
const RINGS_APP: Ring[] = [{ n: 14, rx: 500, ry: 380, speed: 0.008, size: 76, phase: 0.3 }];

type Cap = { head: string; head2?: string; sub?: string; tag?: string };
const Shot: React.FC<{ f: number; cam: Cam; t?: number; cap: Cap; capT: number; fine: string; extra?: React.ReactNode; children: React.ReactNode }> = ({ f, cam, t = 1, cap, capT, fine, extra, children }) => (
  <AbsoluteFill>
    <Swirl f={f * 1.5 + 200} cx={540} cy={640} rings={RINGS_APP} layer="all" opacity={0.45} floor={1030} />
    <GStage cam={cam} t={t}>{children}</GStage>
    <CaptionBand />
    <Caption tag={cap.tag} head={cap.head} head2={cap.head2} sub={cap.sub} t={capT} y={24} />
    <Fine text={fine} t={0.9} />
    {extra}
  </AbsoluteFill>
);
const Gamba: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => <Img src={staticFile("games/gamba.svg")} style={{ width: size, height: size, ...style }} />;

/* =========================================================================================
 * 0. Hook (frame 0 is the thumbnail: the rings, the icon, the pill and the caption are already up)
 * ========================================================================================= */
const Intro: React.FC = () => {
  const f = useCurrentFrame(); const d = R.intro.dur;
  const out = ramp(f, d - 14, d, settle), cy = 600, bob = Math.sin(f * 0.09) * 10;
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <Swirl f={f + 40} cx={540} cy={cy} rings={RINGS_BIG} layer="back" />
      <div style={{ position: "absolute", left: 540 - 140, top: cy - 160 + bob, width: 280, height: 280, filter: "drop-shadow(0 20px 40px rgba(29,161,242,.35))" }}>
        <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: "100%", height: "100%", transform: `rotate(${Math.sin(f * 0.05) * 4}deg)` }} />
      </div>
      <Swirl f={f + 40} cx={540} cy={cy} rings={RINGS_BIG} layer="front" />
      <div style={{ position: "absolute", left: 0, right: 0, top: 832, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "14px 26px", background: "#fff", border: "1px solid #c8c8c8", borderRadius: 40,
          boxShadow: "0 12px 30px rgba(20,23,26,.14)", font: `800 30px/1 ${ui}`, color: BRAND.ink, transform: `scale(${0.96 + 0.04 * pop(f, 6)})` }}>
          <span style={{ font: `bold 18px/1 ${ui}`, letterSpacing: -2 }}><span style={{ color: UP }}>▲</span><span style={{ color: DN }}>▼</span></span>{C.intro.center}<span style={{ font: "26px/1 serif" }}>💎</span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, font: `700 22px/1 ${ui}`, color: BRAND.darkGray }}><Gamba size={30} />Built on Gamba</span>
      </div>
      <Caption tag={C.intro.tag} head={C.intro.head} head2={C.intro.head2} t={1} y={40} />
      <Fine text={C.fine.intro} t={0.9} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * 1. /games: the two tiles; Pump or Dump is tapped
 * ========================================================================================= */
const HubTile: React.FC<{ img: string; title: string; text: string; play: string; f: number; at?: number }> = ({ img, title, text, play, f, at }) => (
  <span style={{ position: "relative", display: "block", overflow: "hidden", color: "#fff", background: "#000", border: "1px solid #c8c8c8", borderRadius: 5, boxShadow: "0 1px 2px rgba(0,0,0,.12)",
    transform: at !== undefined && inWin(f, at, at + 5) ? "scale(.98)" : undefined }}>
    <Img src={staticFile(img)} style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover" }} />
    <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "grid", gap: 2, padding: "22px 10px 8px", background: "linear-gradient(transparent, rgba(0,0,0,.8))" }}>
      <b style={{ font: `bold 16px/1.1 ${ui}` }}>{title}</b><small style={{ color: "#d5dee5", font: `11px/1.25 ${ui}` }}>{text}</small></span>
    <span style={{ position: "absolute", top: 8, right: 8, padding: "5px 10px", font: `bold 12px/1 ${ui}`, background: "rgba(46,158,79,.92)", border: "1px solid rgba(255,255,255,.55)", borderRadius: 9999 }}>{play}</span>
    {at !== undefined ? <Tap f={f} at={at} /> : null}
  </span>
);
const GambaCard: React.FC<{ text: string }> = ({ text }) => (
  <span style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", background: "#fff", border: "1px solid #c8c8c8", borderRadius: 5, boxShadow: "0 1px 2px rgba(0,0,0,.12)" }}>
    <Gamba size={28} /><span style={{ display: "grid", gap: 2 }}><b style={{ font: `bold 13px/1.1 ${ui}` }}>Built on Gamba</b><small style={{ color: "#777", fontSize: 11 }}>{text}</small></span>
  </span>
);
const Hub: React.FC = () => {
  const f = useCurrentFrame(); const d = R.hub.dur;
  const tap = 58;
  const cam = camLerp(G_NO, { z: 1.2, fx: 130, fy: 110, k: 0.35 }, ramp(f, 30, 54, settle));
  return (
    <Shot f={f} cam={cam} t={ramp(f, 0, 8) * (1 - ramp(f, d - 8, d))} cap={C.hub} capT={capFade(f, d)} fine={C.fine.hub}>
      <GameFrame title="Games" mark={PodMark} sound={false}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <HubTile img="games/pumpordump.jpg" title="Pump or Dump" text="Call the next candle, up to 5×" play="▶ Play" f={f} at={tap} />
          <HubTile img="games/mines.jpg" title="Mines" text="Find gems, cash out before a mine" play="▶ Play · New" f={f} />
        </div>
        <GambaCard text="Solana's on-chain casino protocol: every result settled on chain and checked in your browser" />
        <p style={{ margin: 0, color: "#999", fontSize: 11, lineHeight: 1.35, textAlign: "center" }}>Practice is free and open to everyone. Real plays are SOL on Solana, 18+, and only where
          betting is legal; ⚡ Instant play skips the wallet pop-ups. Bet only what you can lose. tweetpad runs these games on Gamba's open protocol; Gamba doesn't run or endorse tweetpad.</p>
      </GameFrame>
    </Shot>
  );
};

/* =========================================================================================
 * 2. Pump or Dump: 3×, PUMP → TO THE MOON; then DUMP → LIQUIDATED
 * ========================================================================================= */
const POD_CALLS: Call[] = [{ at: 58, res: 90, up: true, lev: 3 }, { at: 152, res: 182, up: true, lev: 3 }];   // the second: a Dump call the candle goes against
const Pod: React.FC = () => {
  const f = useCurrentFrame(); const d = R.pod.dur;
  const tLev = 30, [c1, c2] = POD_CALLS;
  const lev = f >= tLev ? 1 : 0;
  const busy = inWin(f, c1.at - 6, c1.res + 16) || inWin(f, c2.at - 6, c2.res + 16);
  const price = priceAt(f, POD_CALLS);
  let status: [string, "ok" | "bad" | ""] = ["Call the next candle", ""];
  if (f >= c1.at - 6) status = ["Building your play…", ""];
  if (f >= c1.at) status = ["Gamba is rolling…", ""];
  if (f >= c1.res + 16) status = ["Won 0.15 SOL", "ok"];
  if (f >= c2.at - 6) status = ["Building your play…", ""];
  if (f >= c2.at) status = ["Gamba is rolling…", ""];
  if (f >= c2.res + 16) status = ["Lost 0.0519 SOL · call the next one", "bad"];
  const flash = f >= c2.res + 16 ? { kind: "lose" as const, at: c2.res + 16 } : f >= c1.res + 16 ? { kind: "win" as const, at: c1.res + 16 } : null;
  const cam = camLerp(G_NO, { z: 1.12, fx: 240, fy: 200, k: 0.25 }, ramp(f, 0, 30, settle) * (1 - ramp(f, d - 24, d - 6, settle)));
  return (
    <Shot f={f} cam={cam} t={ramp(f, 0, 8)} cap={C.pod} capT={capFade(f, d)} fine={C.fine.pod}>
      <GameFrame title="Pump or Dump" mark={PodMark}>
        <Screen f={f} flash={flash} shake={c2.res + 16}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "baseline", gap: 6, font: `20px/1 ${mono}` }}><b style={{ color: "#fff", fontWeight: "normal" }}>$CANDLE</b>
              <span style={{ color: price.up ? UP_HI : DN_HI }}>{price.v}</span></span>
          </div>
          <PodChart f={f} calls={POD_CALLS} />
          <Burst f={f} at={c1.res + 16} />
          <Stamp f={f} at={c1.res + 16} kind="win" title="TO THE MOON" sub="+0.0981 SOL" />
          <Stamp f={f} at={c2.res + 16} kind="lose" title="LIQUIDATED" sub="−0.0519 SOL" />
          <Status text={status[0]} tone={status[1]} />
        </Screen>
        <div style={box}>
          <WhoPlays f={f} bank={<Bank balance={f >= c2.at ? 0.4462 : f >= c1.res + 16 ? 0.4981 : f >= c1.at ? 0.3481 : 0.4} />} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Label>Bet</Label><Seg items={["0.01", "0.02", "0.05", "0.1"]} on={2} f={f} dim={busy} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Label>Lev</Label><Seg items={["2×", "3×", "5×"]} on={lev} f={f} tapAt={{ 1: tLev }} dim={busy} />
            <span style={{ flex: 1, textAlign: "right", color: "#777", fontSize: 12 }}>{lev ? "33% to win" : "50% to win"}</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Big kind="up" head="▲ PUMP" sub={`wins ${lev ? "0.15" : "0.1"} SOL`} f={f} at={c1.at - 8} pressed={inWin(f, c1.at - 8, c1.at - 3)} dim={busy} />
            <Big kind="dn" head="▼ DUMP" sub={`wins ${lev ? "0.15" : "0.1"} SOL`} f={f} at={c2.at - 8} pressed={inWin(f, c2.at - 8, c2.at - 3)} dim={busy} />
          </div>
          <p style={{ margin: 0, color: "#777", fontSize: 11, textAlign: "center" }}>costs 0.0519 SOL with fees · pays {lev ? "0.15" : "0.1"} SOL on a win</p>
        </div>
      </GameFrame>
    </Shot>
  );
};

/* =========================================================================================
 * 3. Mines: three gems (×1.14, ×1.30, ×1.49), cash out; a new round → BOOM
 * ========================================================================================= */
const MinesScreen: React.FC<{ f: number; states: TileState[]; taps: Record<number, number>; revealAt: Record<number, number>; next: string; chance: string; riding: string; mult: string;
  status: [string, "ok" | "bad" | ""]; stamps?: React.ReactNode; flash?: { kind: "win" | "lose"; at: number } | null; shake?: number }> =
  ({ f, states, taps, revealAt, next, chance, riding, mult, status, stamps, flash, shake }) => (
    <Screen f={f} flash={flash} shake={shake}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 6, font: `20px/1 ${mono}` }}><small style={{ color: "#8fa9b8", font: `bold 9px/1 ${ui}`, letterSpacing: ".08em" }}>NEXT</small>
          <b style={{ color: "#fff", fontWeight: "normal" }}>{next}</b><span style={{ color: UP_HI }}>{chance}</span></span>
        <span style={{ display: "flex", alignItems: "baseline", gap: 6, font: `20px/1 ${mono}` }}><small style={{ color: "#8fa9b8", font: `bold 9px/1 ${ui}`, letterSpacing: ".08em" }}>RIDING</small>
          <b style={{ color: "#fff", fontWeight: "normal" }}>{riding}</b><span style={{ color: UP_HI }}>{mult}</span></span>
      </div>
      <Board f={f} states={states} taps={taps} revealAt={revealAt} />
      {stamps}
      <Status text={status[0]} tone={status[1]} />
    </Screen>
  );
const MinesControls: React.FC<{ f: number; bank: React.ReactNode; cash: { head: string; sub: string; ready: boolean; at?: number }; line: string; locked: boolean }> = ({ f, bank, cash, line, locked }) => (
  <div style={box}>
    <WhoPlays f={f} bank={bank} />
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Label>Bet</Label><Seg items={["0.01", "0.02", "0.05", "0.1"]} on={2} f={f} dim={locked} />
      <span style={{ width: 6 }} /><Label w={40}>Mines</Label><Seg items={["3 💣", "5 💣", "10 💣"]} on={0} f={f} dim={locked} /></div>
    <Big kind="cash" head={cash.head} sub={cash.sub} f={f} at={cash.at} pressed={cash.at !== undefined && inWin(f, cash.at, cash.at + 5)} dim={!cash.ready} h={46} />
    <p style={{ margin: 0, color: "#777", fontSize: 11, textAlign: "center" }}>{line}</p>
  </div>
);
/** a round's states over time: tiles tapped at frames, each revealing `spin` frames later */
const SPIN = 9;
function roundAt(f: number, plays: { tile: number; at: number; gem: boolean }[], ghosts: number[]) {
  const states: TileState[] = Array.from({ length: 25 }, () => "idle");
  const taps: Record<number, number> = {}, revealAt: Record<number, number> = {};
  let gems = 0, boom = -1;
  for (const p of plays) {
    if (f >= p.at - 12) taps[p.tile] = p.at;
    if (f < p.at) continue;
    revealAt[p.tile] = p.at + SPIN;
    if (f < p.at + SPIN) { states[p.tile] = "spin"; continue; }
    states[p.tile] = p.gem ? "gem" : "boom";
    if (p.gem) gems++; else boom = p.at + SPIN;
  }
  if (boom >= 0) for (let i = 0; i < 25; i++) { if (ghosts.includes(i)) states[i] = "ghost"; else if (states[i] === "idle") states[i] = "spent"; }
  return { states, taps, revealAt, gems, boom };
}
const ROUND1 = [{ tile: 6, at: 34, gem: true }, { tile: 12, at: 66, gem: true }, { tile: 8, at: 98, gem: true }];
const CASH = 136, NEW_ROUND = 178, ROUND2 = [{ tile: 17, at: 192, gem: false }];
const VALUES = [0.05, 0.0568, 0.0649, 0.0747], MULTS = ["×1.14", "×1.30", "×1.49"];
const Mines: React.FC = () => {
  const f = useCurrentFrame(); const d = R.mines.dur;
  const second = f >= NEW_ROUND;
  const r = second ? roundAt(f, ROUND2, [3, 21]) : roundAt(f, ROUND1, []);
  const cashed = !second && f >= CASH;
  const spinning = r.states.includes("spin");
  const g = r.gems, boomed = r.boom >= 0;
  let status: [string, "ok" | "bad" | ""] = ["Pick a tile", ""];
  if (!second) {
    if (spinning) status = ["Gamba is rolling…", ""];
    else if (g) status = [`💎 Safe · ${MULTS[g - 1]} · ${VALUES[g]} SOL riding`, "ok"];
    if (cashed) status = ["Cashed out 0.0747 SOL · it's in your game balance · pick a tile to go again", "ok"];
  } else {
    status = spinning ? ["Gamba is rolling…", ""] : boomed ? ["Hit a mine on tile 1 · pick a tile to go again", "bad"] : ["Pick a tile", ""];
  }
  const active = !second && g > 0 && !cashed;
  const cash = active ? { head: `CASH OUT ${VALUES[g]} SOL`, sub: `${MULTS[g - 1]} on 0.05 SOL`, ready: !spinning, at: g === 3 ? CASH : undefined }
    : cashed && !second ? { head: "NEW ROUND", sub: "each tile is its own draw at the true odds", ready: true, at: NEW_ROUND - 8 }
    : boomed ? { head: "NEW ROUND", sub: "each tile is its own draw at the true odds", ready: true } : { head: "PICK A TILE", sub: "each tile is its own draw at the true odds", ready: false };
  const step = second ? 0 : cashed ? 0 : g;
  const line = active ? `the next tile rides ${VALUES[g]} SOL · 3.2% fees a tile` : "a round starts with 0.05 SOL · 3.2% fees a tile";
  /* the game balance: each tile costs what rides + 3.2%, a gem pays it back × the tile's multiplier */
  const bal = second ? (f >= ROUND2[0].at ? 0.3676 : 0.4192) : [0.4, 0.4052, 0.4115, 0.4192][Math.min(3, g)];
  const flash = boomed ? { kind: "lose" as const, at: r.boom } : f >= CASH ? { kind: "win" as const, at: CASH } : null;
  const cam = camLerp(G_NO, { z: 1.08, fx: 240, fy: 210, k: 0.2 }, ramp(f, 0, 30, settle) * (1 - ramp(f, d - 24, d - 6, settle)));
  return (
    <Shot f={f} cam={cam} t={ramp(f, 0, 8)} cap={C.mines} capT={capFade(f, d)} fine={C.fine.mines}>
      <GameFrame title="Mines" mark={<span style={{ font: "13px/1 serif" }}>💣</span>}>
        <MinesScreen f={f} states={r.states} taps={r.taps} revealAt={r.revealAt} next={`×${PAY[step].toFixed(2)}`} chance={["88% safe", "88% safe", "87% safe", "86% safe"][step]}
          riding={active ? `${VALUES[g]} SOL` : "—"} mult={active ? MULTS[g - 1] : ""} status={status} flash={flash} shake={boomed ? r.boom : 0}
          stamps={<><Stamp f={f} at={CASH} kind="win" title="CASHED OUT ×1.49" sub="+0.0247 SOL" />{boomed ? <Stamp f={f} at={r.boom} kind="lose" title="BOOM" sub="−0.05 SOL" /> : null}</>} />
        <MinesControls f={f} bank={<Bank balance={bal} />} cash={cash} line={line} locked={active || spinning} />
      </GameFrame>
    </Shot>
  );
};

/* =========================================================================================
 * 4. ⚡ Instant play: "Each play asks your wallet." → one signature → the game balance → tiles with no pop-ups
 * ========================================================================================= */
const Instant: React.FC = () => {
  const f = useCurrentFrame(); const d = R.instant.dur;
  const tapBtn = 26, winIn = 34, ok = 60, open = ok + 8, topped = 88;
  const plays = [{ tile: 7, at: 104, gem: true }, { tile: 11, at: 118, gem: true }, { tile: 13, at: 132, gem: true }];
  const r = roundAt(f, plays, []);
  const g = r.gems, spinning = r.states.includes("spin");
  const bank = f < open
    ? <div style={bankRow}><span style={{ flex: 1 }}>Each play asks your wallet.</span><span style={{ ...btn, ...primary, padding: "5px 9px", fontSize: 11 }}>⚡ Instant play<Tap f={f} at={tapBtn} /></span></div>
    : <Bank balance={f < topped ? 0 : [0.25, 0.2552, 0.2615, 0.2692][g]} pulse={ramp(f, open, open + 6) * (1 - ramp(f, topped + 14, topped + 26))} />;
  let status: [string, "ok" | "bad" | ""] = ["Pick a tile", ""];
  if (f >= open) status = ["Game balance open: top it up to play without pop-ups", "ok"];
  if (f >= topped) status = ["Game balance topped up: plays need no pop-ups now", "ok"];
  if (g || spinning) status = spinning ? ["Gamba is rolling…", ""] : [`💎 Safe · ${MULTS[g - 1]} · ${VALUES[g]} SOL riding`, "ok"];
  const winT = ramp(f, winIn, winIn + 8) * (1 - ramp(f, ok + 4, ok + 10));
  const cam = camLerp(G_NO, { z: 1.35, fx: 240, fy: 330, k: 0.45 }, ramp(f, 6, 26, settle) * (1 - ramp(f, 92, 108, settle)));
  const active = g > 0;
  return (
    <Shot f={f} cam={cam} t={ramp(f, 0, 8)} cap={C.instant} capT={capFade(f, d)} fine={C.fine.instant}
      extra={<>
        {winT > 0 ? <WalletWindow kind="sign" t={winT} pressed={inWin(f, ok, ok + 6)} /> : null}
        {(() => { const cur = cursorAt(f, [[winIn + 4, 900, 1000], [ok - 4, WALLET_OK.x, WALLET_OK.y], [ok + 12, WALLET_OK.x, WALLET_OK.y], [ok + 26, 960, 1060]]);
          const t = ramp(f, winIn + 2, winIn + 10) * (1 - ramp(f, ok + 12, ok + 22));
          return t > 0 ? <Cursor x={cur.x} y={cur.y} down={inWin(f, ok, ok + 5)} t={t} /> : null; })()}
      </>}>
      <GameFrame title="Mines" mark={<span style={{ font: "13px/1 serif" }}>💣</span>}>
        <MinesScreen f={f} states={r.states} taps={r.taps} revealAt={r.revealAt} next={`×${PAY[g].toFixed(2)}`} chance={["88% safe", "88% safe", "87% safe", "86% safe"][g]}
          riding={active ? `${VALUES[g]} SOL` : "—"} mult={active ? MULTS[g - 1] : ""} status={status} />
        <MinesControls f={f} bank={bank} cash={active ? { head: `CASH OUT ${VALUES[g]} SOL`, sub: `${MULTS[g - 1]} on 0.05 SOL`, ready: !spinning } : { head: "PICK A TILE", sub: "each tile is its own draw at the true odds", ready: false }}
          line={active ? `the next tile rides ${VALUES[g]} SOL · 3.2% fees a tile` : "a round starts with 0.05 SOL · 3.2% fees a tile"} locked={active || spinning} />
      </GameFrame>
    </Shot>
  );
};

/* =========================================================================================
 * 5. Provably fair: Pump or Dump's page, scrolled to the seeds and the checks (the LIQUIDATED call: 3×, outcome 2 of 3)
 * ========================================================================================= */
const NEXT_HASH = "7c1e0b94d2f35a68e9b04c7d1a26f8e3b5c90d47e61f2a83c4d59b0e7a16f2c8";
const CHECKS: { text: string; link?: string; at: number }[] = [
  { text: "Checked here: only Gamba's play, 0.05 SOL, your seed, 1% to tweetpad", at: 22 },
  { text: "Seed revealed; its SHA-256 matches what Gamba committed before you played", at: 48 },
  { text: "HMAC-SHA256(seed, \"739203909-7\") → 154831 → outcome 2 of 3, as Gamba settled", at: 72 },
  { text: "Settled on chain", link: "Gamba explorer ↗", at: 94 },
];
const Fair: React.FC = () => {
  const f = useCurrentFrame(); const d = R.fair.dur;
  const scroll = lerp(0, 470, ramp(f, 0, 24, settle));
  const cam = camLerp(G_NO, { z: 1.22, fx: 240, fy: 175, k: 0.4 }, ramp(f, 14, 36, settle) * (1 - ramp(f, d - 22, d - 6, settle)));
  const kv = (label: string, node: React.ReactNode) => (
    <div style={{ display: "grid", gap: 3 }}><span style={{ color: "#999", font: `bold 10px/1.2 ${ui}`, letterSpacing: ".03em", textTransform: "uppercase" }}>{label}</span>{node}</div>
  );
  const code: React.CSSProperties = { padding: "5px 7px", color: "#333", font: `11px/1.35 Menlo, Monaco, monospace`, wordBreak: "break-all", background: "#fafafa", border: "1px solid #ddd", borderRadius: 4 };
  return (
    <Shot f={f} cam={cam} t={ramp(f, 0, 8)} cap={C.fair} capT={capFade(f, d)} fine={C.fine.fair}>
      <GameFrame title="Pump or Dump" mark={PodMark} scroll={scroll}>
        <Screen f={f}>
          <div style={{ font: `20px/1 ${mono}` }}><b style={{ color: "#fff", fontWeight: "normal" }}>$CANDLE</b> <span style={{ color: DN_HI }}>0.9688</span></div>
          <PodChart f={f + 400} calls={[]} />
          <Status text="Lost 0.0519 SOL · call the next one" tone="bad" />
        </Screen>
        <div style={{ ...box, height: 226 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {[["1", "Streak"], ["1", "Best streak"], ["+0.0462", "Net (SOL)"]].map(([v, l]) => (
            <div key={l} style={{ padding: "9px 10px", background: "#fff", border: "1px solid #c8c8c8", borderRadius: 5 }}>
              <b style={{ display: "block", font: `bold 19px/1.1 ${ui}`, color: v.startsWith("+") ? UP : "#333" }}>{v}</b>
              <span style={{ color: "#999", font: `bold 10px/1.2 ${ui}`, letterSpacing: ".03em", textTransform: "uppercase" }}>{l}</span></div>
          ))}
        </div>
        <div style={{ ...box, gap: 7 }}>
          <div style={{ display: "flex" }}><span style={{ flex: 1, color: "#555", font: `bold 12px/1.2 ${ui}` }}>Provably fair</span><span style={{ color: "#0084b4" }}>Gamba explorer ↗</span></div>
          <p style={{ margin: 0, color: "#777", fontSize: 12, lineHeight: 1.35 }}>Before you bet, Gamba commits to its next seed (you see its SHA-256). Your seed and the play's number go in too, so
            neither side can pick the result. When it settles, the seed is revealed and this page checks it.</p>
          {kv("Gamba's next seed (SHA-256)", <code style={code}>{NEXT_HASH}</code>)}
          {kv("Your seed", <span style={{ display: "flex", gap: 6 }}><span style={{ flex: 1, padding: "7px 8px", border: "1px solid #ccc", borderRadius: 4, boxShadow: "inset 0 1px 2px rgba(0,0,0,.08)" }}>739203909</span><span style={btn}>New</span></span>)}
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 3, fontSize: 12 }}>
            {CHECKS.filter((c) => f >= c.at).map((c) => (
              <li key={c.text} style={{ color: UP, opacity: ramp(f, c.at, c.at + 6), transform: `translateY(${(1 - ramp(f, c.at, c.at + 6)) * 6}px)` }}>
                <span style={{ fontSize: 9, verticalAlign: 1 }}>● </span>{c.text}{c.link ? <b style={{ marginLeft: 6, color: "#0084b4" }}>{c.link}</b> : null}</li>
            ))}
          </ul>
        </div>
      </GameFrame>
    </Shot>
  );
};

/* =========================================================================================
 * 6. Built on Gamba: the shrimp, three facts
 * ========================================================================================= */
const GambaScene: React.FC = () => {
  const f = useCurrentFrame(); const d = R.gamba.dur;
  const s = pop(f, 6), out = ramp(f, d - 12, d, settle);
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <Swirl f={f * 1.3 + 120} cx={540} cy={470} rings={[{ n: 12, rx: 470, ry: 170, speed: 0.012, size: 80, phase: 0 }]} layer="all" opacity={0.5} floor={1000} />
      <Caption head={C.gamba.head} sub={C.gamba.sub} t={capFade(f, d)} y={60} />
      <div style={{ position: "absolute", left: 540 - 130, top: 300, width: 260, height: 260, display: "grid", placeItems: "center", background: "#fff", borderRadius: 60,
        boxShadow: "0 24px 60px rgba(240,90,90,.25), 0 0 0 1px #f1d8d4", transform: `scale(${s}) rotate(${(1 - s) * -12}deg)` }}>
        <Gamba size={190} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 620, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        {C.facts.map((t, i) => {
          const k = ramp(f, 24 + i * 12, 38 + i * 12);
          return (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "14px 24px", background: "#fff", border: "1px solid #e1e8ed", borderRadius: 40,
              font: `700 28px/1 ${ui}`, color: BRAND.ink, boxShadow: "0 10px 26px rgba(20,23,26,.1)", opacity: k, transform: `translateY(${(1 - k) * 16}px)` }}>
              <span style={{ color: UP }}>✓</span>{t}</span>
          );
        })}
      </div>
      <Fine text={C.fine.gamba} t={0.9} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * 7. End: the card on blue, the pieces around it, three lines of small type
 * ========================================================================================= */
const EndScene: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Swirl f={f * 1.2 + 90} cx={540} cy={520} rings={[{ n: 16, rx: 560, ry: 470, speed: 0.012, size: 84, phase: 0 }]} layer="all" opacity={0.5 * ramp(f, 0, 16)} floor={985} />
      <End tagline={C.end.tagline} tagline2={C.end.tagline2} fine="" />
      <div style={{ position: "absolute", left: 40, right: 40, bottom: 14, textAlign: "center", font: `500 17px/1.3 ${ui}`, color: "rgba(255,255,255,.88)", opacity: ramp(f, 40, 56) }}>
        {C.end.fine.map((l) => <div key={l}>{l}</div>)}
      </div>
    </>
  );
};

export const TweetpadGames: React.FC<{ skin?: "2012" | "tweetcraft" }> = ({ skin = "2012" }) => {
  loadFonts();
  const f = useCurrentFrame();
  const e = R.end;
  return (
    <SkinCtx.Provider value={skinOf(skin)}>
      <AbsoluteFill>
        <Ground blue={ramp(f, e.from - 6, e.from + 10)} />
        <Sequence from={R.intro.from} durationInFrames={R.intro.dur} name="0 Hook: casino games"><Intro /></Sequence>
        <Sequence from={R.hub.from} durationInFrames={R.hub.dur} name="1 /games"><Hub /></Sequence>
        <Sequence from={R.pod.from} durationInFrames={R.pod.dur} name="2 Pump or Dump"><Pod /></Sequence>
        <Sequence from={R.mines.from} durationInFrames={R.mines.dur} name="3 Mines"><Mines /></Sequence>
        <Sequence from={R.instant.from} durationInFrames={R.instant.dur} name="4 Instant play"><Instant /></Sequence>
        <Sequence from={R.fair.from} durationInFrames={R.fair.dur} name="5 Provably fair"><Fair /></Sequence>
        <Sequence from={R.gamba.from} durationInFrames={R.gamba.dur} name="6 Built on Gamba"><GambaScene /></Sequence>
        <Sequence from={e.from} durationInFrames={e.dur} name="7 End"><EndScene /></Sequence>
      </AbsoluteFill>
    </SkinCtx.Provider>
  );
};
