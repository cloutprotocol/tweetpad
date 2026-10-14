/**
 * TweetpadMenuTour: "One Menu. Every chain." 1080x1080 @30, 55 s.
 * The update and a walk through the app in one: tweetpad's new home, the Menu (index.html, rebuilt here at the card's 480 units in
 * its current look: glass tiles with reflected icons, the dock's glowing blue line, the embossed clock, the raised round buttons),
 * is the segue between every part. The Wii hand opens a channel the way index.html's open() does (the home scales ×1.12 toward
 * the tile and blurs out while the screen grows from the tile's own shape, 520 ms on cubic-bezier(.45,0,.2,1); the banner breathes
 * until the app is in; then Menu | name | Start), shows that app in the 2012 skin (the default), and presses Menu, which runs it
 * all backwards into the tile (420 ms). Launch on five chains, Tokens and the new any-token pages, Feed, Hooks Launch, Games,
 * Profile, Bordrless, then More → Themes. Demo coins and numbers only.
 * Cut to the trading story: Tokens (paste any token's address, its page), the link posted on X playing as a card and traded
 * from the post, then Launch on five chains.
 */
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { BRAND, FONTS, SKIN_2012 } from "../brand/tokens";
import { Caption, Cursor, cursorAt, Fine } from "../components/Film";
import { LaunchForm } from "../components/LaunchForm";
import { AppFrame, Btn, Input, Net, NETS_5, netXY, Panel, SkinCtx } from "../components/ui";
import { CoinImg, CoinView, DEMO_COINS, DemoCoin, TokenList, TradeBox } from "../components/Views";
import { ramp, settle, typed } from "../lib/motion";
import { End } from "../scenes/End";
import { TOUR as R, TOUR_COPY as C } from "../timeline";
import { ChainDisc } from "./WelcomeBnbBase";

const ROUND = FONTS.round;
const TPB = "#1DA1F2", BEZEL = "#d2d9de";
const STRIPES = "repeating-linear-gradient(#f7f9fa 0 3px, #eef1f3 3px 5px)";
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const inWin = (f: number, a: number, b: number) => f >= a && f < b;
/** index.html's one easing, cubic-bezier(.45, 0, .2, 1) */
const ease = (x: number) => {
  const bz = (t: number, a: number, b: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (bz(m, 0.45, 0.2) < x) lo = m; else hi = m; }
  return bz((lo + hi) / 2, 0, 1);
};

/* =========================================================================================
 * The Menu (index.html) at 480 units, scaled into the film
 * ========================================================================================= */
const FS = 1.75, FX = (1080 - 480 * FS) / 2, FY = 196;
const toFilm = (ux: number, uy: number) => ({ x: FX + ux * FS, y: FY + uy * FS });
type TileDef = { name: string; icon: string; bordr?: boolean };
const TILES: TileDef[] = [
  { name: "Launch", icon: "menu/launch.svg" }, { name: "Tokens", icon: "menu/tokens.svg" }, { name: "Feed", icon: "menu/feed.svg" },
  { name: "Hooks Launch", icon: "menu/custom.svg" }, { name: "Games", icon: "menu/games.svg" }, { name: "Profile", icon: "menu/profile.svg" },
  { name: "Bordrless", icon: "menu/bordrless.png", bordr: true }, { name: "$TP", icon: "brand/tweetpad-hash-256.png" }, { name: "More", icon: "menu/more.svg" },
];
const T = { launch: 0, tokens: 1, feed: 2, hooks: 3, games: 4, profile: 5, bordrless: 6, tp: 7, more: 8 } as const;
/* .menu: 14 units in from each side, three 144-unit columns 10 apart, 106-unit rows 10 apart, from 16 down */
const tileRect = (i: number) => ({ x: 14 + (i % 3) * 154, y: 16 + Math.floor(i / 3) * 116, w: 144, h: 106 });
const tileCentre = (i: number) => { const r = tileRect(i); return toFilm(r.x + r.w / 2, r.y + r.h / 2); };

const GLASS = "linear-gradient(162deg, rgba(255,255,255,.95) 0 34%, rgba(255,255,255,0) 34.4%), linear-gradient(#fbfcfd, #e8edf0)";
const Tile: React.FC<{ t: TileDef; r: { x: number; y: number; w: number; h: number }; hover: number; arrive?: number; small?: boolean }> = ({ t, r, hover, arrive = 1, small }) => (
  <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, boxSizing: "border-box", display: "grid", placeItems: "center", alignContent: "center", gap: 7,
    borderRadius: 16, background: GLASS, border: `2.5px solid ${hover > 0.5 ? TPB : BEZEL}`, opacity: Math.min(1, arrive * 1.4),
    transform: `scale(${(0.86 + 0.14 * arrive) * (1 + 0.035 * hover)})`,
    boxShadow: `inset 0 0 0 1.5px #fff, inset 0 -6px 10px rgba(150,170,185,.14), 0 0 0 ${1 + 2 * hover}px rgba(${hover > 0.3 ? "29,161,242,.25" : "160,175,185,.25"}), 0 ${2 + hover}px ${5 + 9 * hover}px rgba(${hover > 0.5 ? "29,161,242,.3" : "40,60,75,.16"})` }}>
    <Img src={staticFile(t.icon)} style={{ width: t.bordr ? 64 : small ? 50 : 58, height: t.bordr ? 64 : small ? 50 : 58, margin: t.bordr ? "-3px 0" : undefined, objectFit: "contain",
      mixBlendMode: t.bordr ? "multiply" : undefined, filter: t.bordr ? undefined : "drop-shadow(0 2px 2.5px rgba(30,45,60,.22))",
      WebkitBoxReflect: t.bordr ? undefined : "below 1px linear-gradient(transparent 74%, rgba(255,255,255,.2))" } as React.CSSProperties} />
    <span style={{ position: "relative", font: `600 ${small ? 15 : 16}px/1 ${ROUND}`, color: "#3b4146", textShadow: "0 1px 0 #fff" }}>{t.name}</span>
  </div>
);
const Dock: React.FC<{ rise?: number }> = ({ rise = 1 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 114, transform: `translateY(${(1 - rise) * 120}px)` }}>
    <svg viewBox="0 0 480 114" width={480} height={114} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <defs>
        <linearGradient id="tdk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fdfefe" /><stop offset=".55" stopColor="#eef2f4" /><stop offset="1" stopColor="#dce3e7" /></linearGradient>
        <filter id="tglow" x="-5%" y="-100%" width="110%" height="300%"><feGaussianBlur stdDeviation="2.2" /></filter>
      </defs>
      <path d="M0 36H86C116 36 120 10 150 10H330C360 10 364 36 394 36H480V114H0Z" fill="url(#tdk)" />
      <path d="M0 36H86C116 36 120 10 150 10H330C360 10 364 36 394 36H480" fill="none" stroke={TPB} strokeOpacity={0.45} strokeWidth={4} filter="url(#tglow)" />
      <path d="M0 38.5H86C117 38.5 121 12.5 150 12.5H330C359 12.5 363 38.5 394 38.5H480" fill="none" stroke="#fff" strokeWidth={2} />
      <path d="M0 36H86C116 36 120 10 150 10H330C360 10 364 36 394 36H480" fill="none" stroke={TPB} strokeWidth={2.2} />
    </svg>
    {[0, 1].map((i) => (
      <div key={i} style={{ position: "absolute", bottom: 14, left: i ? undefined : 18, right: i ? 18 : undefined, width: 64, height: 64, borderRadius: "50%", boxSizing: "border-box",
        display: "grid", placeItems: "center", background: "radial-gradient(circle at 50% 28%, #fff 0 30%, #f1f4f6 62%, #dfe5e9)", border: "2px solid #c6ced3",
        boxShadow: "inset 0 2px 2px #fff, inset 0 -3px 6px rgba(120,140,155,.18), 0 0 0 4px #f6f8f9, 0 0 0 5px #d3dade, 0 4px 9px rgba(40,60,75,.22)" }}>
        {i === 0 ? <Img src={staticFile("brand/tweetpad-hash-256.png")} style={{ width: 34, height: 34, filter: "drop-shadow(0 1.5px 1.5px rgba(20,60,100,.3))" }} />
          : <span style={{ font: `400 32px/1 ${FONTS.ui}`, color: "#4d565c", textShadow: "0 1px 0 #fff" }}>𝕏</span>}
      </div>
    ))}
    <div style={{ position: "absolute", left: "50%", bottom: 15, transform: "translateX(-50%)", textAlign: "center", color: "#8f9aa1", whiteSpace: "nowrap", textShadow: "0 1.5px 0 #fff" }}>
      <div style={{ font: `600 40px/1 ${ROUND}`, letterSpacing: ".02em" }}>1:42</div>
      <div style={{ marginTop: 5, font: `500 14px/1 ${ROUND}` }}>Wed 10/14</div>
    </div>
  </div>
);

/* =========================================================================================
 * The visits: which channel is open at a frame, and how far
 * ========================================================================================= */
type Key = "tokens" | "launch";
const VISITS: Key[] = ["tokens", "launch"];
const OPEN = 16, CLOSE = 13, LOAD = 12;
/** the frame Menu is pressed in a visit */
const menuAt = (k: Key) => R[k].at + R[k].len - CLOSE - 6;
const visitAt = (f: number) => {
  for (const k of VISITS) {
    const { at, len } = R[k];
    if (f >= at && f < at + len) {
      const press = menuAt(k);
      const o = ease(clamp01((f - at) / OPEN));
      const c = ease(clamp01((f - press - 4) / CLOSE));
      return { k, rel: f - at, o, c, press, closing: f >= press };
    }
  }
  return null;
};

/** the channel screen: grows out of the tile, the app inside, its banner over it while it loads, the bar */
const Screen: React.FC<{ f: number; tile: number; name: string; icon: string; bordr?: boolean; children: React.ReactNode }> = ({ f, tile, name, icon, bordr, children }) => {
  const v = visitAt(f)!;
  const r = tileRect(tile);
  // the clip: from the tile's own inset (radius 16) to the whole frame, and back
  const e = v.closing ? 1 - v.c : v.o;
  const ins = { t: r.y * (1 - e), r: (480 - r.x - r.w) * (1 - e), b: (480 - r.y - r.h) * (1 - e), l: r.x * (1 - e), rad: 16 * (1 - e) };
  const op = v.closing ? (v.c < 0.7 ? 1 : 1 - (v.c - 0.7) / 0.3) : Math.min(1, clamp01((f - R[v.k].at) / OPEN) / 0.25);
  const loaded = ramp(f, R[v.k].at + OPEN + LOAD, R[v.k].at + OPEN + LOAD + 10) * (1 - (v.closing ? 1 : 0));
  const bar = ramp(f, R[v.k].at + OPEN, R[v.k].at + OPEN + 9) * (1 - ramp(f, v.press, v.press + 6));
  const breathe = 1 + 0.05 * Math.sin((f / 48) * Math.PI * 2) ** 2;
  const pressing = inWin(f, v.press - 12, v.press + 6);
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 10, opacity: op, clipPath: `inset(${ins.t}px ${ins.r}px ${ins.b}px ${ins.l}px round ${ins.rad}px)`, background: STRIPES }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 432, overflow: "hidden", background: "#e6e6e6", borderBottom: `1px solid ${BEZEL}` }}>
        {children}
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", alignContent: "center", gap: 10, background: STRIPES, opacity: 1 - loaded }}>
          <Img src={staticFile(icon)} style={{ width: 104, height: 104, objectFit: "contain", mixBlendMode: bordr ? "multiply" : undefined, transform: `scale(${loaded > 0 ? 1 : breathe})`,
            filter: "drop-shadow(0 4px 10px rgba(40,60,75,.2))" }} />
          <b style={{ font: `600 22px/1 ${ROUND}`, color: "#3b4146" }}>{name}</b>
        </div>
      </div>
      <div style={{ position: "absolute", left: 8, right: 8, bottom: 7, height: 34, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10,
        opacity: bar, transform: `translateY(${(1 - bar) * 8}px)` }}>
        {["Menu", name, "Start"].map((w, i) => i === 1 ? <b key={i} style={{ font: `600 16px/1 ${ROUND}`, color: "#3b4146", textAlign: "center", whiteSpace: "nowrap" }}>{w}</b> : (
          <span key={i} style={{ height: 34, boxSizing: "border-box", display: "grid", placeItems: "center", borderRadius: 99, font: `600 14px/1 ${ROUND}`,
            color: i === 0 && pressing ? TPB : "#6b767d", background: "linear-gradient(#fff, #eef2f4)", border: `2px solid ${i === 0 && pressing ? TPB : "#c9d0d5"}`,
            boxShadow: i === 0 && pressing ? "0 0 0 3px rgba(29,161,242,.22)" : "0 1px 4px rgba(40,60,75,.15)" }}>{w}</span>
        ))}
      </div>
    </div>
  );
};
const MENU_PILL = toFilm(94, 456);

/* =========================================================================================
 * Inside each channel: the app at its real 480-unit width, in the 2012 skin
 * ========================================================================================= */
const K = 480 / 460, AH = 432 / K;                  // the card (460 app px wide) fills the tv
const appToFilm = (ax: number, ay: number) => toFilm(ax * K, ay * K);
const App: React.FC<Omit<React.ComponentProps<typeof AppFrame>, "scale">> = (p) => <AppFrame {...p} scale={K} h={AH} />;
const CHAINS: Net[] = ["solana", "robinhood", "bnb", "base", "ethereum"];
const SWITCH = [44, 80, 116, 152];                  // rel frames: the chain switches to the next one
const chainIdx = (rel: number) => SWITCH.filter((s) => rel >= s).length;
const netHud = (rel: number) => SWITCH.reduce((a, s) => a + ramp(rel, s, s + 8, settle), 0);
const hudXY = (net: Net) => { const [x] = netXY(net, NETS_5); return appToFilm(x, AH - 22); };

const LaunchApp: React.FC<{ rel: number }> = ({ rel }) => {
  const net = CHAINS[chainIdx(rel)];
  return (
    <App tab="launch" net={net} nets={NETS_5} netT={netHud(rel)} tokenCount={15}>
      <LaunchForm chain={net} nets={NETS_5} image="brand/agent-inu.jpg" name="Such Launch" ticker="WOW" button="Launch $WOW" width={440} devBuy={1} jito={net === "solana"} />
    </App>
  );
};

const COINS: DemoCoin[] = DEMO_COINS.map((c, i) => ({ ...c, chain: (["solana", "robinhood", "bnb", "solana", "base", "ethereum"] as Net[])[i] }));
const FROG: DemoCoin = { name: "Frog", symbol: "FROG", age: "", color: "#3fae5a", chain: "base" };
const CA = "0x4e1f…a7c2";
const TK = { type: 92, open: 118, page: 128 } as const;      // rel frames in the Tokens visit
const TokensApp: React.FC<{ rel: number }> = ({ rel }) => {
  const page = ramp(rel, TK.page, TK.page + 10);
  const typedCa = typed("0x4e1f8c0b2d97a7c2", rel, TK.type - 30, 0.6);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - page }}>
        <App tab="tokens" tokenCount={15} nets={NETS_5}>
          <Panel head="Launched on tweetpad" width={440}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Input value={rel >= TK.type - 30 ? (rel >= TK.type ? CA : typedCa) : ""} placeholder="Trade any token: paste its address" focus={rel >= TK.type - 34} style={{ flex: 1, borderRadius: 99 }} />
              <Btn pressed={inWin(rel, TK.open, TK.open + 5)}>Open</Btn>
            </div>
            <TokenList rows={5} coins={COINS} badges filterChains={NETS_5} filter="all" appear={(i) => ramp(rel, OPEN + LOAD + i * 3, OPEN + LOAD + 8 + i * 3)} />
          </Panel>
        </App>
      </div>
      <div style={{ position: "absolute", inset: 0, opacity: page }}>
        <App tab="tokens" tokenCount={15} nets={NETS_5} net="base">
          <CoinView drawT={ramp(rel, TK.page + 4, TK.page + 40)} chain="base" coin={FROG} badge
            trade={<TradeBox side="buy" symbol="FROG" chain="base" amount="0.01" chip={2} est={{ kind: "quote", out: "1.24M", min: "1.18M", usd: "$25.10" }} button="Buy $FROG" />} />
        </App>
      </div>
    </>
  );
};

const CHANNEL: Record<Key, { tile: number }> = { tokens: { tile: T.tokens }, launch: { tile: T.launch } };
const content = (k: Key, rel: number) => (k === "launch" ? <LaunchApp rel={rel} /> : <TokensApp rel={rel} />);

/* =========================================================================================
 * The post: the token's link (tweetpad.io/<chain>/<address>, api/t.js) posted on X plays as its own card; the card is the token's
 * page (?embed), and Open to trade brings up tweetpad's window to sign in. Drawn as X draws a post, light mode.
 * ========================================================================================= */
const P = { type: 6, post: 46, posted: 56, play: 86, page: 94, open: 120, win: 126, buy: 148, done: 155 } as const;   // rel frames
const LINK = "tweetpad.io/base/0x4e1f…a7c2";
const PX = 180, PW = 720, CARD = 640, CX = PX + 40, CY = 372;            // the post and its card, in film px
const XFONT = '"Inter", -apple-system, "Segoe UI", sans-serif';
const XAvatar: React.FC<{ size: number }> = ({ size }) => (
  <span style={{ width: size, height: size, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", background: "#fff", border: "1px solid #eff3f4" }}>
    <Img src={staticFile("brand/tweetpad-hash-256.png")} style={{ width: size * 0.82, height: size * 0.82 }} />
  </span>
);
const FrogImg: React.FC<{ size: number; badge?: number }> = ({ size, badge = 0 }) => (
  <span style={{ position: "relative", width: size, height: size, flex: "none" }}>
    <CoinImg c={FROG} size={size} />
    {badge ? <span style={{ position: "absolute", right: -badge * 0.2, bottom: -badge * 0.2, width: badge, height: badge, borderRadius: "50%", background: "#0000ff",
      border: `${badge * 0.12}px solid #fff`, display: "grid", placeItems: "center", boxSizing: "border-box" }}><span style={{ width: badge * 0.34, height: badge * 0.34, background: "#fff", borderRadius: 2 }} /></span> : null}
  </span>
);
/* the card image (api/t.js img=1, 1080×1080), drawn at CARD px */
const CardImage: React.FC = () => {
  const k = CARD / 1080;
  return (
    <div style={{ width: 1080, height: 1080, transform: `scale(${k})`, transformOrigin: "0 0", background: "radial-gradient(60% 50% at 50% 50%, #fff, #e3e8ec)", fontFamily: FONTS.ui, position: "relative" }}>
      <div style={{ height: 104, display: "flex", alignItems: "center", padding: "0 44px", gap: 16, background: "linear-gradient(#63b8ee, #3c9ad9 50%, #2b86cc)", borderBottom: "3px solid #1d6aa5" }}>
        <Img src={staticFile("brand/tweetpad-hash-256.png")} style={{ width: 62, height: 62 }} />
        <span style={{ font: `600 46px/1 ${ROUND}`, color: "#fff" }}>tweetpad</span>
        <span style={{ marginLeft: "auto", padding: "14px 30px", borderRadius: 40, background: "#0000ff", color: "#fff", font: `700 40px/1 ${FONTS.ui}` }}>Base</span>
      </div>
      <div style={{ position: "absolute", top: 190, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 40 }}>
        <FrogImg size={184} badge={64} />
        <div><div style={{ font: `700 110px/1 ${FONTS.ui}`, color: "#2f2f2f", letterSpacing: -2 }}>$FROG</div>
          <div style={{ font: `400 46px/1.3 ${FONTS.ui}`, color: "#777" }}>Frog</div><div style={{ font: `400 34px/1.3 ${FONTS.ui}`, color: "#999" }}>0x4e1f…a7c2</div></div>
      </div>
      <div style={{ position: "absolute", left: 100, right: 100, top: 750, display: "flex", alignItems: "center", padding: "30px 34px", background: "#fff", border: "2px solid #c8c8c8", borderRadius: 14,
        boxShadow: "0 4px 10px rgba(0,0,0,.12)" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}><b style={{ font: `700 66px/1 ${FONTS.ui}`, color: "#2f2f2f" }}>$2.41M</b><b style={{ font: `700 40px/1 ${FONTS.ui}`, color: "#2e9e4f" }}>▲ 12.4% 1h</b></div>
          <div style={{ marginTop: 12, font: `400 30px/1 ${FONTS.ui}`, color: "#999" }}>market cap · $310K liq · 4.1K holders</div>
        </div>
        <div style={{ padding: "16px 22px", borderRadius: 10, background: "linear-gradient(#33bcef, #019ad2)", color: "#fff", font: `800 30px/1.1 ${FONTS.ui}`, textAlign: "center" }}>TRADE IN<br />THIS POST</div>
      </div>
    </div>
  );
};
/* the card, playing: the token's own page (?embed) at 480 px, the 2012 skin as t.css draws it */
const LINE_PTS = [0.3, 0.34, 0.31, 0.4, 0.38, 0.45, 0.42, 0.5, 0.47, 0.55, 0.6, 0.57, 0.64, 0.62, 0.7, 0.68, 0.74, 0.79, 0.76, 0.82];
const TokenPage: React.FC<{ rel: number }> = ({ rel }) => {
  const draw = ramp(rel, P.page + 2, P.page + 30);
  const n = Math.max(2, Math.round(LINE_PTS.length * draw));
  const pts = LINE_PTS.slice(0, n).map((v, i) => `${i ? "L" : "M"}${8 + i * 22} ${110 - v * 100}`).join(" ");
  const press = inWin(rel, P.open, P.open + 5);
  return (
    <div style={{ width: 480, height: 480, transform: `scale(${CARD / 480})`, transformOrigin: "0 0", background: "#e6e6e6", fontFamily: FONTS.ui, color: "#333" }}>
      <div style={{ height: 42, display: "flex", alignItems: "center", gap: 6, padding: "0 10px", background: "linear-gradient(#63b8ee, #3c9ad9 50%, #2b86cc)", borderBottom: "1px solid #1d6aa5", color: "#fff" }}>
        <span style={{ font: `700 17px/1 ${FONTS.ui}`, opacity: 0.85 }}>‹</span><Img src={staticFile("brand/tweetpad-hash-256.png")} style={{ width: 24, height: 24 }} />
        <span style={{ font: `600 19px/1 ${ROUND}` }}>tweetpad</span>
        <span style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: 14, background: "rgba(0,0,0,.18)", border: "1px solid rgba(255,255,255,.35)", font: `bold 13px/1 ${FONTS.ui}` }}>$FROG</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "#fff", border: "1px solid #c8c8c8", borderRadius: 5 }}>
          <FrogImg size={44} badge={18} />
          <div style={{ flex: 1 }}><b style={{ font: `bold 17px/1.2 ${FONTS.ui}` }}>Frog</b>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}><span style={{ padding: "2px 7px", borderRadius: 9, background: "#0000ff", color: "#fff", font: `bold 10px/1.2 ${FONTS.ui}` }}>Base</span>
              <span style={{ font: `11px/1 Menlo, monospace`, color: "#999" }}>0x4e1f…a7c2</span></div></div>
          <div style={{ textAlign: "right" }}><b style={{ font: `bold 19px/1.2 ${FONTS.ui}` }}>$2.41M</b><div style={{ font: `12px/1.2 ${FONTS.ui}`, color: "#2e9e4f" }}>▲ 12.4% 24h</div></div>
        </div>
        <div style={{ padding: 8, background: "#fff", border: "1px solid #c8c8c8", borderRadius: 5 }}>
          <svg width={440} height={118}><path d={pts} fill="none" stroke="#2e9e4f" strokeWidth={2} /></svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, background: "#fff", border: "1px solid #c8c8c8", borderRadius: 5 }}>
          <div style={{ display: "flex", gap: 0 }}>{["Buy", "Sell"].map((w, i) => <span key={w} style={{ padding: "7px 16px", font: `bold 13px/1 ${FONTS.ui}`, color: i ? "#555" : "#fff",
            background: i ? "linear-gradient(#fff,#e6e6e6)" : "linear-gradient(#5cc46f,#2e9e4f)", border: "1px solid #bbb", borderRadius: i ? "0 4px 4px 0" : "4px 0 0 4px" }}>{w}</span>)}</div>
          <div style={{ font: `12px/1.2 ${FONTS.ui}`, color: "#999" }}>Routed by KyberSwap · tweetpad takes nothing</div>
          <div style={{ padding: "11px 0", textAlign: "center", borderRadius: 5, color: "#fff", font: `bold 15px/1 ${FONTS.ui}`, border: "1px solid #057ed0",
            background: press ? "#0287c6" : "linear-gradient(#33bcef, #019ad2)", boxShadow: press ? "inset 0 2px 4px rgba(0,0,0,.25)" : undefined }}>Open to trade ↗</div>
        </div>
      </div>
    </div>
  );
};
const OPEN_BTN = { x: CX + 240 * (CARD / 480), y: CY + 368 * (CARD / 480) };
const PLAY = { x: CX + CARD / 2, y: CY + CARD / 2 };
const BUY_BTN = { x: 560, y: 694 };
const Post: React.FC<{ f: number }> = ({ f }) => {
  const rel = f - R.post.from, d = R.post.dur;
  const show = ramp(rel, 0, 12) * (1 - ramp(rel, d - 12, d));
  const composing = rel < P.posted;
  const posted = ramp(rel, P.posted, P.posted + 12);
  const playing = rel >= P.page;
  const win = ramp(rel, P.win, P.win + 10, settle);
  const text = typed(LINK, rel, P.type, 0.9);
  const hand = cursorAt(rel, [[0, 980, 900], [P.post - 14, 836, 300], [P.post, 820, 292], [P.play - 16, PLAY.x + 40, PLAY.y + 30], [P.play, PLAY.x, PLAY.y],
    [P.open - 14, OPEN_BTN.x + 30, OPEN_BTN.y + 26], [P.open, OPEN_BTN.x, OPEN_BTN.y], [P.buy - 12, BUY_BTN.x + 30, BUY_BTN.y + 24], [P.buy, BUY_BTN.x, BUY_BTN.y]]);
  const taps = [P.post, P.play, P.open, P.buy];
  return (
    <AbsoluteFill style={{ background: STRIPES, opacity: show }}>
      {/* the composer, then the post */}
      <div style={{ position: "absolute", left: PX, top: 210, width: PW, background: "#fff", border: "1px solid #e1e8ed", borderRadius: 18, boxShadow: "0 12px 40px rgba(0,0,0,.1)",
        overflow: "hidden", fontFamily: XFONT, color: "#0f1419" }}>
        {composing ? (
          <div style={{ display: "flex", gap: 14, padding: 22 }}>
            <XAvatar size={52} />
            <div style={{ flex: 1 }}>
              <div style={{ minHeight: 70, font: `400 26px/1.35 ${XFONT}`, color: text ? "#1d9bf0" : "#8b98a5" }}>{text || "What's happening?"}{text && rel < P.type + LINK.length / 0.9 ? <span style={{ borderLeft: "2px solid #0f1419", marginLeft: 1 }} /> : null}</div>
              <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #eff3f4", paddingTop: 14 }}>
                <span style={{ padding: "12px 26px", borderRadius: 99, background: inWin(rel, P.post, P.post + 5) ? "#0f1419" : "#272c30", color: "#fff", font: `700 20px/1 ${XFONT}`,
                  opacity: text.length > 10 ? 1 : 0.5 }}>Post</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: "18px 20px 20px", opacity: posted, transform: `translateY(${(1 - posted) * 16}px)` }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <XAvatar size={48} />
              <div style={{ font: `400 21px/1.2 ${XFONT}` }}><b>tweetpad</b> <span style={{ color: "#536471" }}>@tweetpad_io · now</span></div>
            </div>
            <div style={{ margin: "10px 0 12px 60px", font: `400 22px/1.35 ${XFONT}`, color: "#1d9bf0" }}>{LINK}</div>
            <div style={{ position: "relative", marginLeft: 20, width: CARD, height: CARD, borderRadius: 16, overflow: "hidden", border: "1px solid #cfd9de" }}>
              {playing ? <TokenPage rel={rel} /> : <CardImage />}
              {!playing ? <span style={{ position: "absolute", left: "50%", top: "50%", width: 84, height: 84, marginLeft: -42, marginTop: -42, borderRadius: "50%", background: "#1d9bf0",
                border: "4px solid #fff", display: "grid", placeItems: "center", boxShadow: "0 4px 14px rgba(0,0,0,.3)", transform: `scale(${inWin(rel, P.play, P.play + 5) ? 0.92 : 1})` }}>
                <span style={{ width: 0, height: 0, marginLeft: 8, borderLeft: "28px solid #fff", borderTop: "17px solid transparent", borderBottom: "17px solid transparent" }} /></span> : null}
            </div>
          </div>
        )}
      </div>
      {/* tweetpad's window, where the wallet signs */}
      <div style={{ position: "absolute", left: 250, top: 470, width: 600, opacity: win, transform: `translateY(${(1 - win) * 40}px) scale(${0.96 + 0.04 * win})`, borderRadius: 12, overflow: "hidden",
        background: "#e6e6e6", border: "1px solid #b9c1c6", boxShadow: "0 24px 60px rgba(0,0,0,.28)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 12px", background: "linear-gradient(#f4f6f7, #dfe4e7)", borderBottom: "1px solid #c3cacf" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />)}
          <span style={{ marginLeft: 10, font: `500 14px/1 ${FONTS.ui}`, color: "#59636a" }}>{LINK}</span>
        </div>
        <SkinCtx.Provider value={SKIN_2012}>
          <div style={{ padding: 12, zoom: 1.3 }}>
            <TradeBox side="buy" symbol="FROG" chain="base" amount="0.01" chip={2} est={{ kind: "quote", out: "1.24M", min: "1.18M", usd: "$25.10" }}
              button="Buy $FROG" pressed={inWin(rel, P.buy, P.buy + 6)}
              status={rel >= P.done ? { tone: "ok", text: "Bought 1.24M $FROG", tx: true } : null} />
          </div>
        </SkinCtx.Provider>
      </div>
      <Cursor x={hand.x} y={hand.y} hand size={1.3} down={taps.some((k) => inWin(rel, k, k + 5))} t={show} />
    </AbsoluteFill>
  );
};

/* the hand: from tile to tile, into each channel and onto Menu */
const handKeys = (): [number, number, number][] => {
  const k: [number, number, number][] = [[R.menu.from + 20, 1000, 1060]];
  const near = (p: { x: number; y: number }, dx = 34, dy = -8) => [p.x + dx, p.y + dy] as const;
  for (const v of VISITS) {
    const { at } = R[v];
    const c = tileCentre(CHANNEL[v].tile);
    k.push([at - 22, ...near(c, 44, 10)], [at - 2, ...near(c)]);
    if (v === "launch") for (const s of SWITCH) { const p = hudXY(CHAINS[SWITCH.indexOf(s) + 1]); k.push([at + s - 12, p.x + 6, p.y + 10], [at + s - 1, p.x, p.y]); }
    if (v === "tokens") { const o = appToFilm(400, 96); k.push([at + TK.open - 14, o.x + 10, o.y + 12], [at + TK.open - 1, o.x, o.y]); }
    const press = menuAt(v);
    k.push([press - 12, MENU_PILL.x + 16, MENU_PILL.y - 20], [press, MENU_PILL.x, MENU_PILL.y]);
  }
  k.push([R.outro.from + 30, 960, 1100]);
  return k;
};
const HAND = handKeys();
const CLICKS = VISITS.flatMap((v) => [R[v].at, menuAt(v), ...(v === "launch" ? SWITCH.map((s) => R[v].at + s) : [R[v].at + TK.open])]);

const capFor = (f: number) => {
  const v = visitAt(f);
  if (f < R.tokens.at) return { cap: C.menu, t: ramp(f, R.menu.from + 10, R.menu.from + 24), fine: C.fine.menu };
  if (inWin(f, R.post.from, R.post.from + R.post.dur)) {
    const rel = f - R.post.from;
    return { cap: C.post, t: ramp(rel, 4, 16) * (1 - ramp(rel, R.post.dur - 14, R.post.dur - 2)), fine: C.fine.post };
  }
  if (!v) return f >= R.outro.from ? { cap: { tag: undefined, head: C.outro.head, head2: C.outro.head2 }, t: ramp(f, R.outro.from, R.outro.from + 12), fine: C.fine.menu } : null;
  const fade = ramp(f, R[v.k].at + 4, R[v.k].at + 16) * (1 - ramp(f, v.press + 4, v.press + 14));
  if (v.k === "tokens" && v.rel >= TK.type - 30) return { cap: C.anyToken, t: fade, fine: C.fine.tokens };
  if (v.k === "tokens") return { cap: C.tokens, t: fade, fine: C.fine.tokens };
  return { cap: C[v.k], t: fade, fine: C.fine[v.k] };
};

const Title: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ background: STRIPES, opacity: 1 - ramp(f, R.title.dur - 12, R.title.dur), display: "grid", placeItems: "center", alignContent: "center", gap: 26 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 168, height: 168, filter: "drop-shadow(0 10px 22px rgba(20,60,100,.28))" }} />
      <span style={{ font: `600 132px/1 ${ROUND}`, letterSpacing: "-.03em", color: "#3b4146", textShadow: "0 2px 0 #fff" }}>tweetpad</span>
    </div>
    <div style={{ font: `500 40px/1.2 ${FONTS.ui}`, color: BRAND.darkGray }}>{C.title.line}</div>
    <div style={{ padding: "10px 22px", borderRadius: 999, background: "linear-gradient(#5cc4ff, #1a8fe0)", color: "#fff", font: `800 24px/1 ${FONTS.ui}`, letterSpacing: ".08em",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,.45), 0 4px 12px rgba(29,120,200,.35)" }}>{C.title.tag}</div>
  </AbsoluteFill>
);

export const TweetpadMenuTour: React.FC = () => {
  loadFonts();
  const f = useCurrentFrame();
  if (f >= R.end.from) {
    return (
      <AbsoluteFill style={{ background: `linear-gradient(160deg, ${BRAND.light}, ${BRAND.primary} 60%, #1a8bd6)` }}>
        <End tagline={C.end.tagline} fine={C.fine.end}
          row={<div style={{ display: "flex", gap: 18 }}>{CHAINS.map((n) => <ChainDisc key={n} net={n} size={64} />)}</div>} />
      </AbsoluteFill>
    );
  }
  const v = visitAt(f);
  const zoom = v ? (v.closing ? 1 - v.c : v.o) : 0;
  const c = v ? tileRect(CHANNEL[v.k].tile) : tileRect(4);
  const arrive = (i: number) => ramp(f, R.menu.from + 4 + i * 4, R.menu.from + 18 + i * 4);
  const hover = (i: number) => {
    // the tile under the hand lights: the one about to be clicked, from 16 frames before
    for (const k of VISITS) if (CHANNEL[k].tile === i && f >= R[k].at - 16 && f < R[k].at + OPEN) return ramp(f, R[k].at - 16, R[k].at - 10);
    return 0;
  };
  const cap = capFor(f);
  const hand = cursorAt(f, HAND);
  const outro = ramp(f, R.outro.from + 20, R.end.from, settle);
  const inPost = inWin(f, R.post.from, R.post.from + R.post.dur);
  const lastChain = v?.k === "launch" ? chainIdx(v.rel) : 0;
  return (
    <SkinCtx.Provider value={SKIN_2012}>
      <AbsoluteFill style={{ background: STRIPES }}>
        {/* the Menu, in its frame */}
        <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + outro * 0.08})`, transformOrigin: "540px 600px", opacity: 1 - outro }}>
          <div style={{ position: "absolute", left: FX, top: FY, width: 480, height: 480, transform: `scale(${FS})`, transformOrigin: "0 0" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 8, overflow: "hidden", border: "1px solid #c8c8c8", background: STRIPES,
              boxShadow: "0 1px 3px rgba(0,0,0,.15), 0 12px 40px rgba(0,0,0,.12)" }}>
              <div style={{ position: "absolute", inset: 0, transformOrigin: `${c.x + c.w / 2}px ${c.y + c.h / 2}px`, transform: `scale(${1 + 0.12 * zoom})`, opacity: 1 - zoom, filter: `blur(${2 * zoom}px)` }}>
                {TILES.map((t, i) => <Tile key={t.name} t={t} r={tileRect(i)} hover={hover(i)} arrive={arrive(i)} />)}
                <Dock rise={ramp(f, R.menu.from + 6, R.menu.from + 26)} />
              </div>
              {v ? (
                <Screen f={f} tile={CHANNEL[v.k].tile} name={TILES[CHANNEL[v.k].tile].name} icon={TILES[CHANNEL[v.k].tile].icon}>
                  {content(v.k, v.rel)}
                </Screen>
              ) : null}
            </div>
          </div>
        </div>
        {inPost ? <Post f={f} /> : null}
        {cap ? <Caption tag={cap.cap.tag} head={cap.cap.head} head2={v?.k === "launch" ? C.launch.chains[lastChain] : cap.cap.head2} t={cap.t} y={18} /> : null}
        {cap ? <Fine text={cap.fine} t={cap.t} size={16} /> : null}
        {f >= R.menu.from + 20 && !inPost ? <Cursor x={hand.x} y={hand.y} hand size={1.3} down={CLICKS.some((k) => inWin(f, k, k + 5))} t={1 - outro} /> : null}
        {f < R.title.dur ? <Title f={f} /> : null}
      </AbsoluteFill>
    </SkinCtx.Provider>
  );
};
