/**
 * TweetpadBordrlessHome: "Launch & trade Bordrless tokens (inside a tweet)." 1080x1080 @30, 37.5 s.
 * It opens on tweetpad's new home, the Menu (index.html, rebuilt from its CSS at the card's 480 units: nine channels, the dock,
 * its clock), where the Wii hand (the same hand index.html's cursor is) visits Launch and Games and picks Bordrless. The channel
 * opens the way the Menu opens one (index.html open(): the home scales ×1.12 toward the tile and blurs out, the screen grows
 * from the tile's shape over 520 ms with cubic-bezier(.45,0,.2,1), the channel's banner centred on the stripes, breathing while
 * it loads, then Menu | Bordrless | Start), the section shows behind the banner, and Start is pressed. Then Bordrless's look:
 * the sphere read as Bordrless's own diagram reads it, a launch on /borderless (assets/bhub.js, every string verbatim), a trade on
 * Bordrless's DEX in the post (/b/<mint>, film 14's BPage), every token by market cap, and the poster (BordrlessPoster).
 * Demo coin $RING and demo numbers only. Bordrless named in words, its sphere as the channel's mark and the art.
 */
import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { FONTS } from "../brand/tokens";
import { Cursor, cursorAt } from "../components/Film";
import { WALLET_OK, WalletWindow } from "../howto/parts";
import { lerp, ramp, settle, typed } from "../lib/motion";
import { BHOME as R, BHOME_COPY as C, BORDR_COPY } from "../timeline";
import { BCap, BFine, BLUE, BPage, Chip, Hash, HEAD, INK, MONO, PageState, PAPER, Paper, Pic, PICS, YEL } from "./Bordrless";
import { BordrlessPosterArt } from "./BordrlessPoster";
import { Tap } from "./ThreeNew";

const CO = BORDR_COPY.coin;
const SANS = '"Space Grotesk", "Inter", sans-serif';
const ROUND = FONTS.round;
const CARD = "#f4f4f2", LINE = "#d4d4cf", DIM = "#6b6b66", SOFT = "#3b3b38", OK = "#1f9d47", TPB = "#1DA1F2";
const inWin = (f: number, a: number, b: number) => f >= a && f < b;
const capFade = (f: number, dur: number) => ramp(f, 0, 12) * (1 - ramp(f, dur - 10, dur, settle));
/** index.html's one easing, cubic-bezier(.45, 0, .2, 1) */
const ease = (x: number) => {
  // solve the bezier for x by bisection, then return its y
  const bz = (t: number, a: number, b: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (bz(m, 0.45, 0.2) < x) lo = m; else hi = m; }
  return bz((lo + hi) / 2, 0, 1);
};
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/* =========================================================================================
 * The Menu (index.html), at 480 units, scaled into the film
 * ========================================================================================= */
const FS = 1.6, FX = (1080 - 480 * FS) / 2, FY = 236;       // the frame: 768 px, from y 236
const toFilm = (ux: number, uy: number) => ({ x: FX + ux * FS, y: FY + uy * FS });
const STRIPES = "repeating-linear-gradient(#f7f9fa 0 3px, #eef1f3 3px 5px)";
const BEZEL = "#c9d0d5";
const TILES: { name: string; icon: string; bordr?: boolean }[] = [
  { name: "Launch", icon: "menu/launch.svg" }, { name: "Tokens", icon: "menu/tokens.svg" }, { name: "Feed", icon: "menu/feed.svg" },
  { name: "Custom launch", icon: "menu/custom.svg" }, { name: "Games", icon: "menu/games.svg" }, { name: "Profile", icon: "menu/profile.svg" },
  { name: "Bordrless", icon: "menu/bordrless.png", bordr: true }, { name: "$TP", icon: "brand/tweetpad-hash-256.png" }, { name: "More", icon: "menu/more.svg" },
];
const tileRect = (i: number) => ({ x: 14 + (i % 3) * 154, y: 16 + Math.floor(i / 3) * 112, w: 144, h: 102 });
const tileCentre = (i: number) => { const r = tileRect(i); return toFilm(r.x + r.w / 2, r.y + r.h / 2); };
const BORDR_TILE = 6;

const Tile: React.FC<{ i: number; hover: number }> = ({ i, hover }) => {
  const t = TILES[i], r = tileRect(i);
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, boxSizing: "border-box", display: "grid", placeItems: "center", alignContent: "center", gap: 5,
      borderRadius: 16, background: "linear-gradient(#fff, #f3f6f8)", border: `2.5px solid ${hover > 0.5 ? TPB : BEZEL}`, transform: `scale(${1 + 0.035 * hover})`,
      boxShadow: `inset 0 0 0 1.5px #fff, 0 0 0 ${3 * hover}px rgba(29,161,242,.25), 0 ${1 + 2 * hover}px ${3 + 9 * hover}px rgba(${hover > 0.5 ? "29,161,242,.25" : "40,60,75,.14"})` }}>
      <Img src={staticFile(t.icon)} style={{ width: t.bordr ? 58 : 52, height: t.bordr ? 58 : 52, objectFit: "contain", mixBlendMode: t.bordr ? "multiply" : undefined }} />
      <span style={{ font: `600 15px/1 ${ROUND}`, color: "#333" }}>{t.name}</span>
    </div>
  );
};
const Dock: React.FC = () => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 114 }}>
    <svg viewBox="0 0 480 114" width={480} height={114} style={{ position: "absolute", inset: 0 }}>
      <defs><linearGradient id="dk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fdfefe" /><stop offset="1" stopColor="#dfe5e9" /></linearGradient></defs>
      <path d="M0 36H86C116 36 120 10 150 10H330C360 10 364 36 394 36H480V114H0Z" fill="url(#dk)" />
      <path d="M0 36H86C116 36 120 10 150 10H330C360 10 364 36 394 36H480" fill="none" stroke={TPB} strokeWidth={2} />
    </svg>
    {[14, null].map((l, i) => (
      <div key={i} style={{ position: "absolute", bottom: 14, left: l ?? undefined, right: l === null ? 14 : undefined, width: 58, height: 58, borderRadius: "50%", boxSizing: "border-box",
        display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 30%, #fff, #e9eef1 70%)", border: `2.5px solid ${BEZEL}`, boxShadow: "0 2px 6px rgba(40,60,75,.18)" }}>
        {i === 0 ? <Hash size={30} /> : <span style={{ font: `600 26px/1 ${FONTS.ui}`, color: "#6b767d" }}>𝕏</span>}
      </div>
    ))}
    <div style={{ position: "absolute", left: "50%", bottom: 18, transform: "translateX(-50%)", textAlign: "center", color: "#8f9aa1", whiteSpace: "nowrap" }}>
      <div style={{ font: `500 34px/1 ${ROUND}`, letterSpacing: ".02em" }}>10:53</div>
      <div style={{ marginTop: 4, font: `500 12px/1 ${ROUND}` }}>Tue 10/13</div>
    </div>
  </div>
);

/* =========================================================================================
 * /borderless (bordrless/index.html + bhub.css), at 480 px: its bar, its tabs, then a tab's own content
 * ========================================================================================= */
const SectionHead: React.FC<{ tab: "tokens" | "launch" | "hooks" }> = ({ tab }) => (
  <div style={{ position: "relative", zIndex: 3 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, height: 44, padding: "0 10px", background: INK }}>
      <span style={{ color: "#fff", font: `700 18px/1 ${SANS}`, opacity: 0.85 }}>‹</span><Hash size={24} />
      <span style={{ font: `400 19px/1 ${HEAD}`, color: "#fff" }}>tweetpad</span>
      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, padding: "5px 10px", background: YEL, font: `700 11px/1 ${MONO}`, letterSpacing: ".04em" }}>
        <Img src={staticFile("menu/bordrless.png")} style={{ width: 16, height: 16, filter: "grayscale(1) contrast(1.2)" }} />BORDRLESS</span>
    </div>
    <div style={{ display: "flex", background: INK, borderBottom: `2px solid ${INK}` }}>
      {(["tokens", "launch", "hooks"] as const).map((k, i) => (
        <span key={k} style={{ flex: 1, textAlign: "center", padding: "9px 0 8px", font: `400 15px/1 ${HEAD}`, letterSpacing: ".02em", color: k === tab ? INK : "#cfcfca",
          background: k === tab ? YEL : INK, borderRight: i < 2 ? "1px solid #333" : undefined }}>{k[0].toUpperCase() + k.slice(1)}</span>
      ))}
    </div>
  </div>
);
const ROWS: { k: keyof typeof PICS; name: string; age: string; holders: number; cap: string; ch: string; up: boolean; grad?: boolean; curve?: number }[] = [
  { k: "MONO", name: "Monolith", age: "4d", holders: 188, cap: "$131.2K", ch: "+41.0%", up: true, grad: true },
  { k: "RING", name: "Ring", age: "2d", holders: 96, cap: "$48.2K", ch: "+12.4%", up: true, curve: 46 },
  { k: "CHSL", name: "Chisel", age: "6d", holders: 71, cap: "$22.9K", ch: "−3.1%", up: false, curve: 22 },
  { k: "PLTH", name: "Plinth", age: "1d", holders: 40, cap: "$9.6K", ch: "+5.8%", up: true, curve: 9 },
  { k: "DUST", name: "Dust", age: "3h", holders: 12, cap: "$5.1K", ch: "+0.9%", up: true, curve: 4 },
];
const TokensTab: React.FC<{ f?: number; tap?: number; stagger?: number }> = ({ f = 999, tap, stagger = 0 }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10 }}>
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span style={{ flex: 1, padding: "8px 10px", font: `400 12px/1.2 ${MONO}`, color: "#999", background: "#fff", border: `2px solid ${INK}` }}>Search a name, ticker or contract</span>
      <span style={{ padding: "3px 6px", font: `700 10px/1 ${MONO}`, background: "#cfcfca" }}>{ROWS.length} tokens</span>
    </div>
    <p style={{ margin: 0, color: SOFT, font: `400 12px/1.35 ${SANS}` }}>Highest market cap first. Each one opens its own page, and that link plays as a card you can trade in a post on X.</p>
    <div style={{ background: "#fff", border: `2px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}` }}>
      {ROWS.map((c, i) => {
        const p = stagger ? ramp(f, stagger + i * 5, stagger + 10 + i * 5) : 1;
        return (
          <div key={c.k} style={{ position: "relative", display: "flex", alignItems: "center", gap: 9, padding: "7px 9px", borderTop: i ? `1px solid ${LINE}` : undefined, opacity: p,
            transform: `translateY(${(1 - p) * 8}px)`, background: tap !== undefined && c.k === "RING" && f >= tap ? "#fbf3d6" : undefined }}>
            <Pic k={c.k} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", font: `700 13px/1.2 ${SANS}` }}>{c.name}</b>
              <span style={{ font: `400 10px/1.3 ${MONO}`, color: DIM }}>${c.k} · {c.age} · {c.holders} holders · {c.grad ? "graduated" : c.curve + "% curve"}</span></div>
            <span style={{ font: `700 10px/1 ${MONO}`, color: DIM }}>#{i + 1}</span>
            <div style={{ width: 72, textAlign: "right" }}><b style={{ display: "block", font: `700 13px/1.2 ${MONO}` }}>{c.cap}</b>
              <span style={{ font: `700 10px/1.2 ${MONO}`, color: c.up ? OK : "#d92d2d" }}>{c.ch}</span></div>
            {tap !== undefined && c.k === "RING" ? <Tap f={f} at={tap} /> : null}
          </div>
        );
      })}
    </div>
  </div>
);

/* =========================================================================================
 * 0. The Menu: the hand visits Launch and Games, then picks Bordrless
 * ========================================================================================= */
const HOVER: [number, number, number][] = [[30, 52, 0], [58, 80, 4], [88, 150, BORDR_TILE]];   // [from, to, tile]
const CLICK = 112;
const hoverOf = (f: number, i: number) => HOVER.reduce((a, [s, e, t]) => (t === i ? Math.max(a, ramp(f, s, s + 7) * (1 - ramp(f, e, e + 7))) : a), 0);
const MenuFrame: React.FC<{ f: number; open?: number; hoverAll?: boolean; children?: React.ReactNode }> = ({ f, open = 0, children }) => {
  const o = ease(clamp01(open));
  const c = tileRect(BORDR_TILE), ox = c.x + c.w / 2, oy = c.y + c.h / 2;
  return (
    <div style={{ position: "absolute", left: FX, top: FY, width: 480, height: 480, transform: `scale(${FS})`, transformOrigin: "0 0" }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 6, overflow: "hidden", border: "1px solid #c8c8c8", background: STRIPES,
        boxShadow: "0 1px 3px rgba(0,0,0,.15), 0 12px 40px rgba(0,0,0,.12)" }}>
        {/* the home, scaling toward the tile and blurring out as the channel opens */}
        <div style={{ position: "absolute", inset: 0, transformOrigin: `${ox}px ${oy}px`, transform: `scale(${1 + 0.12 * o})`, opacity: 1 - o, filter: `blur(${2 * o}px)` }}>
          {TILES.map((_, i) => <Tile key={i} i={i} hover={hoverOf(f, i)} />)}
          <Dock />
        </div>
        {children}
      </div>
    </div>
  );
};
const Home: React.FC = () => {
  const f = useCurrentFrame();
  const B = tileCentre(BORDR_TILE), L = tileCentre(0), G = tileCentre(4);
  const cur = cursorAt(f, [[8, 900, 1000], [34, L.x + 20, L.y + 12], [62, G.x + 18, G.y + 14], [96, B.x + 52, B.y - 6], [CLICK, B.x + 46, B.y - 12]]);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: FX, top: 92, display: "flex", alignItems: "center", gap: 14, fontFamily: ROUND }}>
        <Img src={staticFile("brand/tweetpad-hash-256.png")} style={{ width: 72, height: 72 }} />
        <span style={{ font: `600 54px/1 ${ROUND}`, letterSpacing: "-.02em", color: "#333" }}>tweetpad</span>
      </div>
      <div style={{ position: "absolute", left: FX, top: 178, font: `400 24px/1 ${FONTS.ui}`, color: "#777" }}>The launchpad inside a tweet.</div>
      <div style={{ position: "absolute", right: FX, top: 108, opacity: ramp(f, 84, 98) }}><Chip ink size={20}><span style={{ width: 10, height: 10, background: YEL }} />{C.home.tag} · BORDRLESS</Chip></div>
      <MenuFrame f={f} />
      <Cursor x={cur.x} y={cur.y} hand down={inWin(f, CLICK, CLICK + 5)} size={1.3} />
      <BFine text={C.fine.home} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * 1. The channel opens: the zoom, the banner (centred, breathing), the bar, the section behind it, Start
 * ========================================================================================= */
const OPEN = 16, BAR_AT = 20, LIVE_AT = 62, START_AT = 104;
const Open: React.FC = () => {
  const f = useCurrentFrame(); const d = R.open.dur;
  const o = clamp01(f / OPEN), e = ease(o);
  const r = tileRect(BORDR_TILE);
  // the screen grows from the tile's own shape (index.html clipOf: an inset with the tile's 16 px radius)
  const ins = { t: r.y * (1 - e), r: (480 - r.x - r.w) * (1 - e), b: (480 - r.y - r.h) * (1 - e), l: r.x * (1 - e), rad: 16 * (1 - e) };
  const op = Math.min(1, o / 0.25);
  const bar = ramp(f, BAR_AT, BAR_AT + 9);
  const banner = 1 - ramp(f, LIVE_AT, LIVE_AT + 11);
  const breathe = 1 + 0.05 * Math.sin((f / 48) * Math.PI * 2) ** 2;
  const S = toFilm(384, 456);
  const cur = cursorAt(f, [[0, tileCentre(BORDR_TILE).x + 46, tileCentre(BORDR_TILE).y - 12], [START_AT - 16, S.x + 40, S.y + 30], [START_AT - 2, S.x, S.y]]);
  const out = ramp(f, START_AT + 8, d, settle);
  return (
    <AbsoluteFill style={{ opacity: 1 - ramp(f, d - 8, d) }}>
      <div style={{ position: "absolute", left: FX, top: 92, display: "flex", alignItems: "center", gap: 14, opacity: 1 - out }}>
        <Img src={staticFile("brand/tweetpad-hash-256.png")} style={{ width: 72, height: 72 }} />
        <span style={{ font: `600 54px/1 ${ROUND}`, letterSpacing: "-.02em", color: "#333" }}>tweetpad</span>
      </div>
      <div style={{ position: "absolute", left: FX, top: 178, font: `400 24px/1 ${FONTS.ui}`, color: "#777", opacity: 1 - out }}>The launchpad inside a tweet.</div>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + out * 0.5})`, transformOrigin: `540px ${FY + 240 * FS}px`, opacity: 1 - out }}>
        <MenuFrame f={150} open={o}>
          <div style={{ position: "absolute", inset: 0, opacity: op, clipPath: `inset(${ins.t}px ${ins.r}px ${ins.b}px ${ins.l}px round ${ins.rad}px)`, background: STRIPES }}>
            {/* the tv: the section, its banner over it until it has loaded */}
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 432, overflow: "hidden", background: PAPER, borderBottom: `1px solid ${BEZEL}` }}>
              <div style={{ width: 480, fontFamily: SANS, color: INK }}><SectionHead tab="tokens" /><TokensTab f={f} stagger={LIVE_AT} /></div>
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", alignContent: "center", gap: 10, background: STRIPES, opacity: banner }}>
                <Img src={staticFile("menu/bordrless.png")} style={{ width: 104, height: 104, mixBlendMode: "multiply", transform: `scale(${breathe})`,
                  filter: "drop-shadow(0 4px 10px rgba(40,60,75,.2))" }} />
                <b style={{ font: `600 22px/1 ${ROUND}`, color: "#333" }}>Bordrless</b>
              </div>
            </div>
            {/* the bar: Menu | Bordrless | Start */}
            <div style={{ position: "absolute", left: 8, right: 8, bottom: 7, height: 34, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10,
              opacity: bar, transform: `translateY(${(1 - bar) * 8}px)` }}>
              {["Menu", "Bordrless", "Start"].map((w, i) => i === 1 ? <b key={w} style={{ font: `600 16px/1 ${ROUND}`, textAlign: "center" }}>{w}</b> : (
                <span key={w} style={{ position: "relative", height: 34, boxSizing: "border-box", display: "grid", placeItems: "center", borderRadius: 99, font: `600 14px/1 ${ROUND}`,
                  color: i === 2 && f >= START_AT - 14 ? TPB : "#6b767d", background: "linear-gradient(#fff, #eef2f4)",
                  border: `2px solid ${i === 2 && f >= START_AT - 14 ? TPB : BEZEL}`, boxShadow: i === 2 && f >= START_AT - 14 ? "0 0 0 3px rgba(29,161,242,.22)" : "0 1px 4px rgba(40,60,75,.15)" }}>{w}</span>
              ))}
            </div>
          </div>
        </MenuFrame>
      </div>
      <Cursor x={cur.x} y={cur.y} hand down={inWin(f, START_AT, START_AT + 5)} size={1.3} t={1 - out} />
      <BFine text={C.fine.home} t={1 - out} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * 2. The sphere, read: the token program, the hook, the Bordrless DEX
 * ========================================================================================= */
const FigCallout: React.FC<{ node: [number, number]; label: [number, number]; n: string; kicker: string; title: string; sub: string; t: number }> = ({ node, label, n, kicker, title, sub, t }) => {
  const [x, y] = node, [lx, ly] = label, knee = lx - 46;
  return (
    <>
      <svg width={1080} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <polyline points={`${x},${y} ${knee - 30},${y} ${knee},${ly} ${lx - 12},${ly}`} fill="none" stroke={INK} strokeWidth={3} strokeDasharray="1200" strokeDashoffset={1200 * (1 - t)} />
        <g opacity={Math.min(1, t * 3)}><rect x={x - 9} y={y - 9} width={18} height={18} fill="#fff" stroke={INK} strokeWidth={3} /><rect x={x - 3} y={y - 3} width={6} height={6} fill={INK} /></g>
      </svg>
      <div style={{ position: "absolute", left: lx, top: ly - 22, width: 1040 - lx, opacity: ramp(t, 0.5, 1), transform: `translateX(${(1 - t) * 12}px)` }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 30, height: 30, display: "grid", placeItems: "center", background: "#cfcfca", font: `700 16px/1 ${MONO}` }}>{n}</span>
          <span style={{ font: `400 17px/1 ${MONO}` }}>{kicker}</span>
        </span>
        <div style={{ marginTop: 8, font: `400 34px/1 ${HEAD}`, color: INK }}>{title}</div>
        <div style={{ marginTop: 6, font: `500 17px/1.3 ${SANS}`, color: SOFT }}>{sub}</div>
      </div>
    </>
  );
};
const Fig: React.FC = () => {
  const f = useCurrentFrame(); const d = R.fig.dur;
  const t = capFade(f, d);
  const k = 600 / 950;   // the sphere cut (public/bordrless/sphere.png, 950x870) drawn 600 wide
  const at = (x: number, y: number): [number, number] => [24 + x * k, 290 + y * k];
  return (
    <AbsoluteFill style={{ opacity: t }}>
      <BCap fig={C.fig.fig} tag={C.fig.tag} head={C.fig.head} head2={C.fig.head2} t={1} />
      <Img src={staticFile("bordrless/sphere.png")} style={{ position: "absolute", left: 24, top: 290, width: 600, imageRendering: "pixelated", border: `3px solid ${INK}`, boxShadow: `10px 10px 0 ${INK}`, boxSizing: "content-box", background: "#e3e3df",
        transform: `scale(${1.04 - 0.04 * ramp(f, 0, 40)})`, transformOrigin: "50% 50%" }} />
      {C.fig.callouts.map(([n, kicker, title, sub], i) => (
        <FigCallout key={n} n={n} kicker={kicker} title={title} sub={sub} t={ramp(f, 12 + i * 18, 32 + i * 18)}
          node={[at(590, 45), at(907, 353), at(913, 450), at(529, 777)][i]} label={[[680, 318], [680, 490], [680, 652], [680, 808]][i] as [number, number]} />
      ))}
      <BFine text={C.fine.fig} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * 3. Launch, on /borderless (assets/bhub.js renderLaunch), at 480 px ×1.5
 * ========================================================================================= */
const PS = 1.5, PX = (1080 - 480 * PS) / 2, PY = 262, PH = (972 - PY) / PS;
const Frame480: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", left: PX, top: PY, width: 480 * PS, height: PH * PS, overflow: "hidden", border: `3px solid ${INK}`, boxShadow: `10px 10px 0 ${INK}`, background: PAPER }}>
    <div style={{ width: 480, transform: `scale(${PS})`, transformOrigin: "0 0", fontFamily: SANS, color: INK }}>{children}</div>
  </div>
);
const card = (fig: string, title: string, ...kids: React.ReactNode[]) => (
  <section style={{ display: "flex", flexDirection: "column", padding: "9px 10px 8px", background: CARD, border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 6, marginBottom: 6, borderBottom: `2px solid ${INK}` }}>
      <span style={{ padding: "3px 6px", font: `700 10px/1 ${MONO}`, background: "#cfcfca" }}>{fig}</span><b style={{ font: `400 17px/1 ${HEAD}` }}>{title}</b></div>
    {kids}
  </section>
);
const chipRow = (f: number, items: string[], on: string, taps: Record<string, number> = {}) => (
  <div style={{ display: "flex", flexWrap: "wrap" }}>{items.map((w, i) => (
    <span key={w} style={{ position: "relative", padding: "6px 8px", marginLeft: i ? -2 : 0, font: `700 11px/1 ${MONO}`, color: w === on ? "#fff" : INK, background: w === on ? INK : "#fff", border: `2px solid ${INK}` }}>
      {w}{taps[w] !== undefined ? <Tap f={f} at={taps[w]} /> : null}</span>))}</div>
);
const L = { img: 12, name: 22, ticker: 48, burn: 74, buy: 94, go: 116, approveOk: 170, done: 214 } as const;
const LaunchScene: React.FC = () => {
  const f = useCurrentFrame(); const d = R.launch.dur;
  const name = typed(CO.name, f, L.name, 0.35), ticker = typed(CO.ticker, f, L.ticker, 0.4);
  const burn = f >= L.burn + 2, dev = f >= L.buy + 2, busy = inWin(f, L.go + 2, L.done + 30);
  const lines: [number, string, string, string?][] = [
    [L.go + 4, "ok", "Image and metadata on IPFS", "JSON ↗"], [L.go + 18, "ok", "Built and dry-run on mainnet · mint xxxx…xxxx · 1% creator fee · dev buy ready"],
    [L.go + 26, "warn", "Approve in Phantom…"], [L.approveOk + 4, "ok", "Signed by Phantom and the new mint"], [L.approveOk + 14, "ok", "Confirmed on mainnet", "Tx ↗"],
    [L.done, "ok", "$" + CO.ticker + " is live", "Its page ↗"], [L.done + 14, "ok", "Dev buy confirmed", "Tx ↗"]];
  // as bhub.js check(): a pending (warn) line is replaced by the next one
  const shown = lines.filter(([at]) => f >= at).filter(([, tone], i, arr) => tone !== "warn" || i === arr.length - 1);
  const scroll = lerp(0, 330, ramp(f, L.buy + 8, L.go - 2, settle)) + lerp(0, 150, ramp(f, L.approveOk + 8, L.done + 6, settle));
  const appr = inWin(f, L.go + 26, L.approveOk + 8) ? ramp(f, L.go + 26, L.go + 36) * (1 - ramp(f, L.approveOk + 2, L.approveOk + 8)) : 0;
  const cur = cursorAt(f, [[L.approveOk - 22, WALLET_OK.x + 120, WALLET_OK.y + 160], [L.approveOk - 2, WALLET_OK.x, WALLET_OK.y]]);
  return (
    <AbsoluteFill>
      <BCap tag={C.launch.tag} head={C.launch.head} head2={C.launch.head2} t={capFade(f, d)} />
      <div style={{ opacity: ramp(f, 0, 12) }}>
        <Frame480>
          <SectionHead tab="launch" />
          <div style={{ transform: `translateY(${-scroll}px)`, display: "flex", flexDirection: "column", gap: 8, padding: 10 }}>
            {card("A", "Your coin",
              <div key="c" style={{ display: "flex", gap: 8 }}>
                <span style={{ width: 74, height: 74, flex: "none", display: "grid", placeItems: "center", background: "#fff", border: `2px ${f >= L.img ? "solid" : "dashed"} ${INK}`,
                  boxShadow: f >= L.img ? `3px 3px 0 ${INK}` : undefined, font: `700 11px/1.3 ${MONO}`, color: DIM, overflow: "hidden" }}>
                  {f >= L.img ? <div style={{ transform: `scale(${Math.min(1, 0.6 + (f - L.img) / 12)})` }}><Pic k="RING" size={70} border={0} /></div> : <span>+<br />image</span>}</span>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ padding: "8px 9px", font: `500 13px/1.2 ${SANS}`, background: "#fff", border: `2px solid ${f >= L.name && f < L.ticker ? BLUE : INK}`, color: name ? INK : "#999" }}>{name || "Name"}</span>
                  <span style={{ padding: "8px 9px", font: `500 13px/1.2 ${SANS}`, background: "#fff", border: `2px solid ${f >= L.ticker && f < L.burn ? BLUE : INK}`, color: ticker ? INK : "#999" }}>{ticker || "TICKER"}</span>
                </div>
              </div>,
              <span key="d" style={{ marginTop: 8, padding: "8px 9px", minHeight: 40, font: `500 13px/1.2 ${SANS}`, color: "#999", background: "#fff", border: `2px solid ${INK}` }}>Description (optional)</span>)}
            {card("B", "Your fee, its rules",
              <div key="l1" style={{ display: "flex", justifyContent: "space-between", font: `700 11px/1 ${MONO}` }}><span>Creator fee</span><span style={{ color: DIM, fontWeight: 400, fontSize: 10 }}>of every trade, to you in SOL</span></div>,
              <div key="c1" style={{ margin: "6px 0 8px" }}>{chipRow(f, ["0.5%", "1%", "2%"], "1%")}</div>,
              <div key="l2" style={{ display: "flex", justifyContent: "space-between", font: `700 11px/1 ${MONO}` }}><span>Token rules</span><span style={{ color: DIM, fontWeight: 400, fontSize: 10 }}>run by the token itself, on every trade</span></div>,
              <div key="c2" style={{ margin: "6px 0 6px" }}>{chipRow(f, ["Plain", "Diamond hands", "Burn", "Paid to hold"], burn ? "Burn" : "Plain", { Burn: L.burn })}</div>,
              <p key="n" style={{ margin: 0, color: SOFT, font: `400 12px/1.4 ${SANS}` }}>Each trade: <b style={{ color: INK }}>1% to you</b> in SOL, claimed on its page{burn
                ? <> · the token itself runs <b style={{ color: INK }}>holder rewards 0.5%, burn 0.5%</b></> : " · no token rules"}. Fixed at launch.</p>)}
            {card("C", "Dev buy",
              <div key="r" style={{ display: "flex", gap: 6 }}>{chipRow(f, ["None", "0.1", "0.5", "1"], dev ? "0.1" : "None", { "0.1": L.buy })}
                <span style={{ flex: 1, padding: "7px 10px", font: `700 14px/1.2 ${MONO}`, background: "#fff", border: `2px solid ${INK}`, color: dev ? INK : "#aaa" }}>{dev ? "0.1" : "0"}</span></div>,
              <p key="e" style={{ margin: "6px 0 0", color: SOFT, font: `400 12px/1.35 ${SANS}` }}>{dev
                ? <>You get ≈ <b style={{ color: INK }}>2.07M ${CO.ticker}</b> · 0.21% of supply · bought right after the launch, one approval</> : "No dev buy: you launch holding none of your coin."}</p>)}
            <section style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, background: CARD, border: `2px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", font: `400 11px/1.2 ${MONO}`, color: DIM }}><span>Wallet <b style={{ color: INK }}>{CO.addr}</b></span><u>Disconnect</u></div>
              <span style={{ position: "relative", padding: "11px", textAlign: "center", color: "#fff", background: BLUE, border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, font: `700 14px/1 ${SANS}`, opacity: busy ? 0.65 : 1 }}>
                {busy ? "Launching…" : ticker.length < 4 ? "Ticker: 2–10 letters or numbers" : `Launch $${CO.ticker} on Bordrless${dev ? " · buy 0.1 SOL" : ""}`}<Tap f={f} at={L.go} /></span>
              <p style={{ margin: 0, textAlign: "center", color: SOFT, font: `400 10px/1.4 ${MONO}` }}>Launches on Bordrless, paired with SOL · 1% fee to you · about 0.035 SOL · 30 s sniper fee · graduates at ~105 SOL</p>
            </section>
            {shown.length ? <ul style={{ margin: 0, padding: "8px 10px", listStyle: "none", display: "grid", gap: 4, background: "#fff", border: `2px solid ${INK}`, font: `500 12px/1.35 ${SANS}` }}>
              {shown.map(([at, tone, text, link]) => <li key={at} style={{ color: tone === "ok" ? OK : "#c7870a" }}><span style={{ fontSize: 9 }}>● </span>{text}{link ? <b style={{ marginLeft: 6, color: INK, textDecoration: "underline" }}>{link}</b> : null}</li>)}
            </ul> : null}
          </div>
        </Frame480>
      </div>
      {appr > 0 ? <WalletWindow t={appr} kind="approve" pressed={inWin(f, L.approveOk, L.approveOk + 5)} /> : null}
      {appr > 0.5 ? <Cursor x={cur.x} y={cur.y} down={inWin(f, L.approveOk, L.approveOk + 5)} /> : null}
      <BFine text={C.fine.launch} t={capFade(f, d)} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * 4. Trade on Bordrless's DEX, in the post (/b/<mint>: film 14's BPage)
 * ========================================================================================= */
const TR = { chip: 24, buy: 52, approveOk: 100, done: 128 } as const;
const TradeScene: React.FC = () => {
  const f = useCurrentFrame(); const d = R.trade.dur;
  const s: PageState = {
    amount: inWin(f, TR.chip + 2, TR.done) ? "0.1" : "", quoting: inWin(f, TR.chip + 2, TR.chip + 14), quote: inWin(f, TR.chip + 14, TR.done),
    wallet: true, busy: inWin(f, TR.buy + 2, TR.done),
    status: f < TR.buy + 2 ? null : f < TR.buy + 10 ? { tone: "warn", text: "Getting the price…" } : f < TR.approveOk + 4 ? { tone: "warn", text: "Approve in Phantom…" }
      : f < TR.done ? { tone: "warn", text: "Confirming…" } : { tone: "ok", text: `Bought ≈ ${CO.quote} $${CO.ticker}`, tx: true },
    taps: { chip01: TR.chip, go: TR.buy },
  };
  const appr = inWin(f, TR.buy + 10, TR.approveOk + 8) ? ramp(f, TR.buy + 10, TR.buy + 20) * (1 - ramp(f, TR.approveOk + 2, TR.approveOk + 8)) : 0;
  const cur = cursorAt(f, [[TR.approveOk - 22, WALLET_OK.x + 120, WALLET_OK.y + 160], [TR.approveOk - 2, WALLET_OK.x, WALLET_OK.y]]);
  return (
    <AbsoluteFill>
      <BCap tag={C.trade.tag} head={C.trade.head} head2={C.trade.head2} t={capFade(f, d)} />
      <div style={{ opacity: ramp(f, 0, 12), transform: `scale(${0.95 + 0.05 * ramp(f, 0, 14)})`, transformOrigin: "540px 620px" }}>
        <BPage f={f} scroll={lerp(0, 120, ramp(f, TR.done + 20, TR.done + 50, settle))} s={s} chart={ramp(f, 2, 26)} />
      </div>
      {appr > 0 ? <WalletWindow t={appr} kind="approve" pressed={inWin(f, TR.approveOk, TR.approveOk + 5)} /> : null}
      {appr > 0.5 ? <Cursor x={cur.x} y={cur.y} down={inWin(f, TR.approveOk, TR.approveOk + 5)} /> : null}
      <BFine text={C.fine.trade} t={capFade(f, d)} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * 5. Every token, by market cap (the section's Tokens tab)
 * ========================================================================================= */
const TokensScene: React.FC = () => {
  const f = useCurrentFrame(); const d = R.tokens.dur;
  return (
    <AbsoluteFill>
      <BCap tag={C.tokens.tag} head={C.tokens.head} head2={C.tokens.head2} t={capFade(f, d)} />
      <div style={{ opacity: ramp(f, 0, 12) * (1 - ramp(f, d - 10, d)) }}>
        <Frame480><SectionHead tab="tokens" /><TokensTab f={f} stagger={6} tap={78} /></Frame480>
      </div>
      <BFine text={C.fine.tokens} t={capFade(f, d)} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * The film
 * ========================================================================================= */
const EndScene: React.FC = () => { const f = useCurrentFrame(); return <AbsoluteFill style={{ opacity: ramp(f, 0, 10) }}><BordrlessPosterArt f={f} /></AbsoluteFill>; };
export const TweetpadBordrlessHome: React.FC = () => {
  loadFonts();
  const f = useCurrentFrame();
  const paper = ramp(f, R.open.from + START_AT + 6, R.open.from + R.open.dur);   // the home's grey gives way to Bordrless's paper after Start
  return (
    <AbsoluteFill style={{ background: "#e6e6e6" }}>
      <AbsoluteFill style={{ opacity: paper }}><Paper pic="bordrless/workshop.png" picT={0.06} zoom={1.05} /></AbsoluteFill>
      <Sequence from={R.home.from} durationInFrames={R.home.dur}><Home /></Sequence>
      <Sequence from={R.open.from} durationInFrames={R.open.dur}><Open /></Sequence>
      <Sequence from={R.fig.from} durationInFrames={R.fig.dur}><Fig /></Sequence>
      <Sequence from={R.launch.from} durationInFrames={R.launch.dur}><LaunchScene /></Sequence>
      <Sequence from={R.trade.from} durationInFrames={R.trade.dur}><TradeScene /></Sequence>
      <Sequence from={R.tokens.from} durationInFrames={R.tokens.dur}><TokensScene /></Sequence>
      <Sequence from={R.end.from} durationInFrames={R.end.dur}><EndScene /></Sequence>
    </AbsoluteFill>
  );
};
