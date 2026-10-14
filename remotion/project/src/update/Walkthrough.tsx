/**
 * TweetpadWalkthrough: everything tweetpad does, one channel at a time. 1080x1080 @30, 52.8 s.
 * The home Menu (index.html at the card's 480 units: glass tiles with reflected icons, the dock's glowing line, the clock) is the
 * segue: the Wii hand opens each channel the way index.html's open() does (the home scales ×1.12 toward the tile and blurs out
 * while the screen grows from the tile's shape, 520 ms on cubic-bezier(.45,0,.2,1); the banner breathes until the app is in; then
 * Menu | name | Start) and presses Menu to run it backwards into the tile. Launch on five chains, Hooks Launch, Bordrless, Games
 * on Gamba, Feed, Profile; the app in the 2012 skin, the default. Any-token links are film 17's. Demo coins and numbers only.
 * Film 16's Menu, rebuilt here rather than shared, so neither film's file changes the other.
 */
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { BRAND, FONTS, SKIN_2012 } from "../brand/tokens";
import { Caption, Cursor, cursorAt, Fine } from "../components/Film";
import { LaunchForm } from "../components/LaunchForm";
import { AppFrame, Net, NETS_5, netXY, SkinCtx } from "../components/ui";
import { DEMO_COINS, DemoCoin, FeedView, RobinhoodProfile } from "../components/Views";
import { ramp, settle, typed } from "../lib/motion";
import { End } from "../scenes/End";
import { WALK as R, WALK_COPY as C } from "../timeline";
import { SectionHead, TokensTab } from "./BordrlessHome";
import { GambaCard, GameFrame, HubTile, PodMark } from "./Games";
import { Diamond, talk } from "./ThreeNew";
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
 * The Menu at 480 units, scaled into the film
 * ========================================================================================= */
const FS = 1.75, FX = (1080 - 480 * FS) / 2, FY = 196;
const toFilm = (ux: number, uy: number) => ({ x: FX + ux * FS, y: FY + uy * FS });
type TileDef = { name: string; icon: string; bordr?: boolean };
const TILES: TileDef[] = [
  { name: "Launch", icon: "menu/launch.svg" }, { name: "Tokens", icon: "menu/tokens.svg" }, { name: "Feed", icon: "menu/feed.svg" },
  { name: "Hooks Launch", icon: "menu/custom.svg" }, { name: "Games", icon: "menu/games.svg" }, { name: "Profile", icon: "menu/profile.svg" },
  { name: "Bordrless", icon: "menu/bordrless.png", bordr: true }, { name: "$TP", icon: "brand/tweetpad-hash-256.png" }, { name: "More", icon: "menu/more.svg" },
];
const tileRect = (i: number) => ({ x: 14 + (i % 3) * 154, y: 16 + Math.floor(i / 3) * 116, w: 144, h: 106 });
const tileCentre = (i: number) => { const r = tileRect(i); return toFilm(r.x + r.w / 2, r.y + r.h / 2); };
const GLASS = "linear-gradient(162deg, rgba(255,255,255,.95) 0 34%, rgba(255,255,255,0) 34.4%), linear-gradient(#fbfcfd, #e8edf0)";
const Tile: React.FC<{ t: TileDef; r: { x: number; y: number; w: number; h: number }; hover: number; arrive?: number }> = ({ t, r, hover, arrive = 1 }) => (
  <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, boxSizing: "border-box", display: "grid", placeItems: "center", alignContent: "center", gap: 7,
    borderRadius: 16, background: GLASS, border: `2.5px solid ${hover > 0.5 ? TPB : BEZEL}`, opacity: Math.min(1, arrive * 1.4),
    transform: `scale(${(0.86 + 0.14 * arrive) * (1 + 0.035 * hover)})`,
    boxShadow: `inset 0 0 0 1.5px #fff, inset 0 -6px 10px rgba(150,170,185,.14), 0 0 0 ${1 + 2 * hover}px rgba(${hover > 0.3 ? "29,161,242,.25" : "160,175,185,.25"}), 0 ${2 + hover}px ${5 + 9 * hover}px rgba(${hover > 0.5 ? "29,161,242,.3" : "40,60,75,.16"})` }}>
    <Img src={staticFile(t.icon)} style={{ width: t.bordr ? 64 : 58, height: t.bordr ? 64 : 58, margin: t.bordr ? "-3px 0" : undefined, objectFit: "contain",
      mixBlendMode: t.bordr ? "multiply" : undefined, filter: t.bordr ? undefined : "drop-shadow(0 2px 2.5px rgba(30,45,60,.22))",
      WebkitBoxReflect: t.bordr ? undefined : "below 1px linear-gradient(transparent 74%, rgba(255,255,255,.2))" } as React.CSSProperties} />
    <span style={{ position: "relative", font: `600 16px/1 ${ROUND}`, color: "#3b4146", textShadow: "0 1px 0 #fff" }}>{t.name}</span>
  </div>
);
const Dock: React.FC<{ rise?: number }> = ({ rise = 1 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 114, transform: `translateY(${(1 - rise) * 120}px)` }}>
    <svg viewBox="0 0 480 114" width={480} height={114} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <defs>
        <linearGradient id="wdk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fdfefe" /><stop offset=".55" stopColor="#eef2f4" /><stop offset="1" stopColor="#dce3e7" /></linearGradient>
        <filter id="wglow" x="-5%" y="-100%" width="110%" height="300%"><feGaussianBlur stdDeviation="2.2" /></filter>
      </defs>
      <path d="M0 36H86C116 36 120 10 150 10H330C360 10 364 36 394 36H480V114H0Z" fill="url(#wdk)" />
      <path d="M0 36H86C116 36 120 10 150 10H330C360 10 364 36 394 36H480" fill="none" stroke={TPB} strokeOpacity={0.45} strokeWidth={4} filter="url(#wglow)" />
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
 * The visits
 * ========================================================================================= */
type Key = "launch" | "hooks" | "bordrless" | "games" | "feed" | "profile";
const VISITS: Key[] = ["launch", "hooks", "bordrless", "games", "feed", "profile"];
const TILE_OF: Record<Key, number> = { launch: 0, hooks: 3, bordrless: 6, games: 4, feed: 2, profile: 5 };
const OPEN = 16, CLOSE = 13, LOAD = 12;
const menuAt = (k: Key) => R[k].at + R[k].len - CLOSE - 6;
const visitAt = (f: number) => {
  for (const k of VISITS) {
    const { at, len } = R[k];
    if (f >= at && f < at + len) {
      const press = menuAt(k);
      return { k, rel: f - at, o: ease(clamp01((f - at) / OPEN)), c: ease(clamp01((f - press - 4) / CLOSE)), press, closing: f >= press };
    }
  }
  return null;
};
const Screen: React.FC<{ f: number; tile: number; children: React.ReactNode }> = ({ f, tile, children }) => {
  const v = visitAt(f)!;
  const r = tileRect(tile), t = TILES[tile];
  const e = v.closing ? 1 - v.c : v.o;
  const ins = { t: r.y * (1 - e), r: (480 - r.x - r.w) * (1 - e), b: (480 - r.y - r.h) * (1 - e), l: r.x * (1 - e), rad: 16 * (1 - e) };
  const op = v.closing ? (v.c < 0.7 ? 1 : 1 - (v.c - 0.7) / 0.3) : Math.min(1, clamp01((f - R[v.k].at) / OPEN) / 0.25);
  const loaded = ramp(f, R[v.k].at + OPEN + LOAD, R[v.k].at + OPEN + LOAD + 10) * (v.closing ? 0 : 1);
  const bar = ramp(f, R[v.k].at + OPEN, R[v.k].at + OPEN + 9) * (1 - ramp(f, v.press, v.press + 6));
  const breathe = 1 + 0.05 * Math.sin((f / 48) * Math.PI * 2) ** 2;
  const pressing = inWin(f, v.press - 12, v.press + 6);
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 10, opacity: op, clipPath: `inset(${ins.t}px ${ins.r}px ${ins.b}px ${ins.l}px round ${ins.rad}px)`, background: STRIPES }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 432, overflow: "hidden", background: "#e6e6e6", borderBottom: `1px solid ${BEZEL}` }}>
        {children}
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", alignContent: "center", gap: 10, background: STRIPES, opacity: 1 - loaded }}>
          <Img src={staticFile(t.icon)} style={{ width: 104, height: 104, objectFit: "contain", mixBlendMode: t.bordr ? "multiply" : undefined, transform: `scale(${loaded > 0 ? 1 : breathe})`,
            filter: "drop-shadow(0 4px 10px rgba(40,60,75,.2))" }} />
          <b style={{ font: `600 22px/1 ${ROUND}`, color: "#3b4146" }}>{t.name}</b>
        </div>
      </div>
      <div style={{ position: "absolute", left: 8, right: 8, bottom: 7, height: 34, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10,
        opacity: bar, transform: `translateY(${(1 - bar) * 8}px)` }}>
        {["Menu", t.name, "Start"].map((w, i) => i === 1 ? <b key={i} style={{ font: `600 16px/1 ${ROUND}`, color: "#3b4146", textAlign: "center", whiteSpace: "nowrap" }}>{w}</b> : (
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
 * Inside each channel, at the card's real 480-unit width
 * ========================================================================================= */
const K = 480 / 460, AH = 432 / K;
const appToFilm = (ax: number, ay: number) => toFilm(ax * K, ay * K);
const App: React.FC<Omit<React.ComponentProps<typeof AppFrame>, "scale">> = (p) => <AppFrame {...p} scale={K} h={AH} />;
const CHAINS: Net[] = ["solana", "robinhood", "bnb", "base", "ethereum"];
const SWITCH = [56, 96, 136, 176];
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

/* Hooks Launch (/custom): the bar back to the Menu, the page's Ethereum mark, the form with its fee and starting value */
const HK = { fee: 70, start: 104 } as const;
const HooksApp: React.FC<{ rel: number }> = ({ rel }) => (
  <div style={{ width: 480, height: 432, background: "#e6e6e6" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 7, height: 42, padding: "0 10px", background: "linear-gradient(#63b8ee, #3c9ad9 50%, #2b86cc)", borderBottom: "1px solid #1d6aa5", color: "#fff" }}>
      <span style={{ font: `700 18px/1 ${FONTS.ui}`, opacity: 0.85 }}>‹</span>
      <Img src={staticFile("brand/tweetpad-hash-256.png")} style={{ width: 24, height: 24 }} />
      <span style={{ font: `600 19px/1 ${ROUND}` }}>tweetpad</span>
      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 12, font: `bold 13px/1 ${FONTS.ui}`,
        background: "rgba(0,0,0,.18)", border: "1px solid rgba(255,255,255,.35)" }}><ChainDisc net="ethereum" size={16} />Hooks Launch</span>
    </div>
    <div style={{ height: 390, overflow: "hidden" }}><div style={{ display: "flex", justifyContent: "center", paddingTop: 10, transform: "translateY(-150px)" }}>
      <LaunchForm chain="ethereum" nets={NETS_5} image="brand/ether-cat.svg" name="Ether Cat" ticker="ECAT" button="Launch $ECAT" width={440}
        ethFee={rel >= HK.fee ? 3 : 2} ethStart={rel >= HK.start ? "25" : "10"}
        ethPressed={inWin(rel, HK.fee, HK.fee + 6) ? { fee: 3 } : inWin(rel, HK.start, HK.start + 6) ? { start: "25" } : null} ring={rel >= HK.fee - 20 ? "eth" : null} />
    </div></div>
  </div>
);

const BordrApp: React.FC<{ rel: number }> = ({ rel }) => (
  <div style={{ width: 480, height: 432, background: "#e3e3df", fontFamily: '"Space Grotesk", "Inter", sans-serif', color: "#111" }}>
    <SectionHead tab="tokens" /><TokensTab f={rel} stagger={OPEN + LOAD} />
  </div>
);

const GM = { tap: 100 } as const;
const GamesApp: React.FC<{ rel: number }> = ({ rel }) => (
  <GameFrame title="Games" mark={PodMark} sound={false}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <HubTile img="games/pumpordump.jpg" title="Pump or Dump" text="Call the next candle, up to 5×" play="▶ Play" f={rel} at={GM.tap} />
      <HubTile img="games/mines.jpg" title="Mines" text="Find gems, cash out before a mine" play="▶ Play" f={rel} />
    </div>
    <GambaCard text="Solana's on-chain casino protocol: every result settled on chain and checked in your browser" />
  </GameFrame>
);

const FD = { type: 30, tag: 84, tweet: 112, posted: 118 } as const;
const POST = "gm from inside the tweet #tweetpad";
const FeedApp: React.FC<{ rel: number }> = ({ rel }) => (
  <App tab="feed" nets={NETS_5}>
    <FeedView text={rel >= FD.posted ? "" : typed(POST, rel, FD.type, 0.9)} tagged={rel >= FD.tag && rel < FD.posted} posted={ramp(rel, FD.posted, FD.posted + 12)} />
  </App>
);

const RH_COIN: DemoCoin = { ...DEMO_COINS[1], chain: "robinhood" };
const PF = { claim: 80, done: 92 } as const;
const ProfileApp: React.FC<{ rel: number }> = ({ rel }) => (
  <App tab="more" nets={NETS_5} net="robinhood" connected>
    <RobinhoodProfile address="0x7a3e…c91e" rewards="0.0042 ETH" claimable={rel < PF.done} claiming={inWin(rel, PF.claim + 4, PF.done)} pressed={inWin(rel, PF.claim, PF.claim + 4)}
      status={rel >= PF.done ? { tone: "ok", text: "Claimed 0.0042 ETH", tx: true } : null} coin={RH_COIN} holders={128} />
  </App>
);

const content = (k: Key, rel: number) => {
  switch (k) {
    case "launch": return <LaunchApp rel={rel} />;
    case "hooks": return <HooksApp rel={rel} />;
    case "bordrless": return <BordrApp rel={rel} />;
    case "games": return <GamesApp rel={rel} />;
    case "feed": return <FeedApp rel={rel} />;
    case "profile": return <ProfileApp rel={rel} />;
  }
};

/* =========================================================================================
 * The hand, the captions, the film
 * ========================================================================================= */
/* in-channel targets, in film px (measured from stills) */
const TARGETS: Partial<Record<Key, [number, { x: number; y: number }][]>> = {
  hooks: [[HK.fee, { x: 442, y: 542 }], [HK.start, { x: 554, y: 628 }]],
  games: [[GM.tap, toFilm(123, 130)]],
  feed: [[FD.tweet, { x: 802, y: 505 }]],
  profile: [[PF.claim, { x: 764, y: 589 }]],
};
const handKeys = (): [number, number, number][] => {
  const k: [number, number, number][] = [[R.menu.from + 20, 1000, 1060]];
  for (const v of VISITS) {
    const { at } = R[v];
    const c = tileCentre(TILE_OF[v]);
    k.push([at - 22, c.x + 44, c.y + 2], [at - 2, c.x + 34, c.y - 8]);
    if (v === "launch") SWITCH.forEach((s, i) => { const p = hudXY(CHAINS[i + 1]); k.push([at + s - 12, p.x + 6, p.y + 10], [at + s - 1, p.x, p.y]); });
    for (const [rel, p] of TARGETS[v] ?? []) k.push([at + rel - 14, p.x + 14, p.y + 14], [at + rel - 1, p.x, p.y]);
    const press = menuAt(v);
    k.push([press - 12, MENU_PILL.x + 16, MENU_PILL.y - 20], [press, MENU_PILL.x, MENU_PILL.y]);
  }
  k.push([R.outro.from + 30, 960, 1100]);
  return k;
};
const HAND = handKeys();
const CLICKS = VISITS.flatMap((v) => [R[v].at, menuAt(v), ...(v === "launch" ? SWITCH.map((s) => R[v].at + s) : []), ...(TARGETS[v] ?? []).map(([rel]) => R[v].at + rel)]);

const capFor = (f: number) => {
  const v = visitAt(f);
  if (f < R.launch.at) return { cap: C.menu, t: ramp(f, R.menu.from + 10, R.menu.from + 24) * (1 - ramp(f, R.launch.at - 10, R.launch.at)), fine: C.fine.menu };
  if (!v) return f >= R.outro.from ? { cap: { tag: undefined, head: C.outro.head, head2: C.outro.head2 }, t: ramp(f, R.outro.from, R.outro.from + 12), fine: C.fine.menu } : null;
  const fade = ramp(f, R[v.k].at + 4, R[v.k].at + 16) * (1 - ramp(f, v.press + 4, v.press + 14));
  if (v.k === "launch") return { cap: { tag: C.launch.tag, head: C.launch.head, head2: C.launch.chains[chainIdx(v.rel)] }, t: fade, fine: C.fine.launch };
  return { cap: C[v.k], t: fade, fine: C.fine[v.k] };
};

/* the title card: the # and the wordmark, the line, ETH Guy and Agent Inu */
const Title: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ background: STRIPES, opacity: 1 - ramp(f, R.title.dur - 12, R.title.dur), display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 170, gap: 26 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 150, height: 150, filter: "drop-shadow(0 10px 22px rgba(20,60,100,.28))" }} />
      <span style={{ font: `600 120px/1 ${ROUND}`, letterSpacing: "-.03em", color: "#3b4146", textShadow: "0 2px 0 #fff" }}>tweetpad</span>
    </div>
    <div style={{ font: `700 42px/1.2 ${FONTS.ui}`, color: BRAND.ink, letterSpacing: "-.01em" }}>{C.title.line}</div>
    <div style={{ display: "flex", alignItems: "flex-end", gap: 70, marginTop: 40 }}>
      <Diamond size={250} jaw={talk(f, [[8, 34]])} blink={Math.max(0, 1 - Math.abs(f - 46) / 3)} />
      <div style={{ width: 210, height: 210, marginBottom: 20, borderRadius: 34, overflow: "hidden", border: "6px solid #fff", boxShadow: "0 16px 30px rgba(0,0,0,.22)" }}>
        <Img src={staticFile("brand/agent-inu.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
    </div>
  </AbsoluteFill>
);

export const TweetpadWalkthrough: React.FC = () => {
  loadFonts();
  const f = useCurrentFrame();
  if (f >= R.end.from) {
    const e = f - R.end.from;
    return (
      <AbsoluteFill style={{ background: `linear-gradient(160deg, ${BRAND.light}, ${BRAND.primary} 60%, #1a8bd6)` }}>
        <End tagline={C.end.tagline} cc={C.end.cc} fine={C.fine.end}
          row={<div style={{ display: "flex", gap: 18 }}>{CHAINS.map((n) => <ChainDisc key={n} net={n} size={64} />)}</div>} />
        <div style={{ position: "absolute", left: 30, bottom: 70, transform: `translateY(${(1 - ramp(e, 50, 66, settle)) * 260}px) rotate(-8deg)` }}>
          <Diamond size={190} jaw={talk(e, [[70, 96]])} /></div>
        <div style={{ position: "absolute", right: 40, bottom: 80, width: 150, height: 150, borderRadius: 26, overflow: "hidden", border: "6px solid #fff", boxShadow: "0 14px 30px rgba(0,30,60,.3)",
          transform: `translateY(${(1 - ramp(e, 58, 74, settle)) * 280}px) rotate(7deg)` }}><Img src={staticFile("brand/agent-inu.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
      </AbsoluteFill>
    );
  }
  const v = visitAt(f);
  const zoom = v ? (v.closing ? 1 - v.c : v.o) : 0;
  const c = v ? tileRect(TILE_OF[v.k]) : tileRect(4);
  const arrive = (i: number) => ramp(f, R.menu.from + 4 + i * 4, R.menu.from + 18 + i * 4);
  const hover = (i: number) => {
    for (const k of VISITS) if (TILE_OF[k] === i && f >= R[k].at - 16 && f < R[k].at + OPEN) return ramp(f, R[k].at - 16, R[k].at - 10);
    return 0;
  };
  const cap = capFor(f);
  const hand = cursorAt(f, HAND);
  const outro = ramp(f, R.outro.from + 20, R.end.from, settle);
  return (
    <SkinCtx.Provider value={SKIN_2012}>
      <AbsoluteFill style={{ background: STRIPES }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + outro * 0.08})`, transformOrigin: "540px 600px", opacity: 1 - outro }}>
          <div style={{ position: "absolute", left: FX, top: FY, width: 480, height: 480, transform: `scale(${FS})`, transformOrigin: "0 0" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 8, overflow: "hidden", border: "1px solid #c8c8c8", background: STRIPES,
              boxShadow: "0 1px 3px rgba(0,0,0,.15), 0 12px 40px rgba(0,0,0,.12)" }}>
              <div style={{ position: "absolute", inset: 0, transformOrigin: `${c.x + c.w / 2}px ${c.y + c.h / 2}px`, transform: `scale(${1 + 0.12 * zoom})`, opacity: 1 - zoom, filter: `blur(${2 * zoom}px)` }}>
                {TILES.map((t, i) => <Tile key={t.name} t={t} r={tileRect(i)} hover={hover(i)} arrive={arrive(i)} />)}
                <Dock rise={ramp(f, R.menu.from + 6, R.menu.from + 26)} />
              </div>
              {v ? <Screen f={f} tile={TILE_OF[v.k]}>{content(v.k, v.rel)}</Screen> : null}
            </div>
          </div>
        </div>
        {cap ? <Caption tag={cap.cap.tag} head={cap.cap.head} head2={cap.cap.head2} t={cap.t} y={18} /> : null}
        {cap ? <Fine text={cap.fine} t={cap.t} size={16} /> : null}
        {f >= R.menu.from + 20 ? <Cursor x={hand.x} y={hand.y} hand size={1.3} down={CLICKS.some((k) => inWin(f, k, k + 5))} t={1 - outro} /> : null}
        {f < R.title.dur ? <Title f={f} /> : null}
      </AbsoluteFill>
    </SkinCtx.Provider>
  );
};
