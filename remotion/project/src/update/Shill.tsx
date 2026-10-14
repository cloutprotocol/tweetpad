/**
 * TweetpadShill: "The new way to shill a token." 1080x1080 @30, 38.7 s.
 * The old way: a shill typed out in X's composer (the CA and a chart link), posted with a plain link preview and nothing to buy. The new way: one tweetpad link (tweetpad.io/<chain>/<address>,
 * api/t.js) that X plays as the token's own card (its image: api/t.js img=1); the card is the token's page (?embed), and Open to
 * trade brings up tweetpad's window, where the wallet signs. Then the same post on all five chains; launching your own (five chains,
 * custom Uniswap v4 hooks, Bordrless tokens); and the three steps.
 * The cast: the old way is typed by ETH Guy (film 11's shades-wearing Ethereum diamond, a cartoon, named for no one), the new way
 * is posted by Agent Inu, the doge of the app's welcome post; both open the film and see it out.
 * Demo tokens, links and numbers only.
 */
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { BRAND, FONTS, SKIN_2012 } from "../brand/tokens";
import { Caption, Cursor, cursorAt, Fine } from "../components/Film";
import { Net, SkinCtx } from "../components/ui";
import { CoinImg, DemoCoin, TradeBox } from "../components/Views";
import { pop, ramp, settle, typed } from "../lib/motion";
import { End } from "../scenes/End";
import { SHILL as R, SHILL_COPY as C } from "../timeline";
import { Diamond, talk } from "./ThreeNew";
import { ChainDisc } from "./WelcomeBnbBase";

const ROUND = FONTS.round, UI = FONTS.ui;
const XF = '"Inter", -apple-system, "Segoe UI", sans-serif';
const STRIPES = "repeating-linear-gradient(#f7f9fa 0 3px, #eef1f3 3px 5px)";
const inWin = (f: number, a: number, b: number) => f >= a && f < b;
const BAR = "linear-gradient(#63b8ee, #3c9ad9 50%, #2b86cc)";

/* ---------- the tokens, one per chain (demo) ---------- */
type Tok = { net: Net; short: string; chain: string; pill: [string, string]; coin: DemoCoin; addr: string; mcap: string; ch: string; liq: string; holders: string;
  native: string; router: string };
const TOKS: Tok[] = [
  { net: "solana", short: "sol", chain: "Solana", pill: ["#000", "#fff"], coin: { name: "Such Launch", symbol: "WOW", age: "", img: "brand/agent-inu.jpg" },
    addr: "7xKX…gAsU", mcap: "$1.86M", ch: "▲ 8.2%", liq: "$204K", holders: "3.2K", native: "SOL", router: "Jupiter" },
  { net: "robinhood", short: "rh", chain: "Robinhood Chain", pill: ["#ccff00", "#000"], coin: { name: "Hello Timeline", symbol: "GM", age: "", color: "#1DA1F2" },
    addr: "0x9c2d…41be", mcap: "$642K", ch: "▲ 3.9%", liq: "$88K", holders: "940", native: "ETH", router: "KyberSwap" },
  { net: "bnb", short: "bnb", chain: "BNB Chain", pill: ["#f0b90b", "#1e2026"], coin: { name: "Pixel Pup", symbol: "PUP", age: "", color: "#e8a33c" },
    addr: "0x77af…0d13", mcap: "$918K", ch: "▼ 1.4%", liq: "$121K", holders: "1.6K", native: "BNB", router: "KyberSwap" },
  { net: "base", short: "base", chain: "Base", pill: ["#0000ff", "#fff"], coin: { name: "Frog", symbol: "FROG", age: "", color: "#3fae5a" },
    addr: "0x4e1f…a7c2", mcap: "$2.41M", ch: "▲ 12.4%", liq: "$310K", holders: "4.1K", native: "ETH", router: "KyberSwap" },
  { net: "ethereum", short: "eth", chain: "Ethereum", pill: ["#627eea", "#fff"], coin: { name: "Ether Cat", symbol: "ECAT", age: "", img: "brand/ether-cat.svg" },
    addr: "0x1b5e…c6f0", mcap: "$3.07M", ch: "▲ 5.1%", liq: "$690K", holders: "7.8K", native: "ETH", router: "KyberSwap" },
];
const FROG = TOKS[3];
const linkOf = (t: Tok) => `tweetpad.io/${t.short}/${t.addr}`;

const TokImg: React.FC<{ t: Tok; size: number; badge?: number }> = ({ t, size, badge = 0 }) => (
  <span style={{ position: "relative", width: size, height: size, flex: "none", display: "inline-block" }}>
    <CoinImg c={t.coin} size={size} />
    {badge ? <span style={{ position: "absolute", right: -badge * 0.25, bottom: -badge * 0.25, borderRadius: "50%", border: `${badge * 0.1}px solid #fff`, display: "flex" }}>
      <ChainDisc net={t.net} size={badge} /></span> : null}
  </span>
);

/* ---------- X, light mode ---------- */
type Who = "eth" | "inu";
/* ETH Guy: the diamond on its blue tile, talking while it types (jaw); Agent Inu: the welcome post's doge */
const Avatar: React.FC<{ size: number; who: Who; jaw?: number }> = ({ size, who, jaw = 0 }) => (
  <span style={{ width: size, height: size, borderRadius: "50%", flex: "none", overflow: "hidden", display: "flex", border: "1px solid #eff3f4" }}>
    {who === "eth" ? <Diamond size={size} framed jaw={jaw} /> : <Img src={staticFile("brand/agent-inu.jpg")} style={{ width: size, height: size, objectFit: "cover" }} />}
  </span>
);
const PostShell: React.FC<{ x: number; y: number; w: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, w, children, style }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, background: "#fff", border: "1px solid #e1e8ed", borderRadius: 18, boxShadow: "0 12px 40px rgba(0,0,0,.1)",
    overflow: "hidden", fontFamily: XF, color: "#0f1419", ...style }}>{children}</div>
);
const Composer: React.FC<{ text: string; caret: boolean; press: boolean; who: Who; jaw?: number; size?: number; ready: boolean; color?: string }> = ({ text, caret, press, who, jaw, size = 26, ready, color = "#0f1419" }) => (
  <div style={{ display: "flex", gap: 14, padding: 22 }}>
    <Avatar size={52} who={who} jaw={jaw} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ minHeight: 70, font: `400 ${size}px/1.35 ${XF}`, color: text ? color : "#8b98a5", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
        {text || "What's happening?"}{caret ? <span style={{ borderLeft: "2px solid #0f1419", marginLeft: 1 }} /> : null}</div>
      <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #eff3f4", paddingTop: 14 }}>
        <span style={{ padding: "12px 26px", borderRadius: 99, background: press ? "#000" : "#272c30", color: "#fff", font: `700 20px/1 ${XF}`, opacity: ready ? 1 : 0.5,
          transform: press ? "scale(.96)" : undefined }}>Post</span>
      </div>
    </div>
  </div>
);
const Head: React.FC<{ who: Who }> = ({ who }) => (
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <Avatar size={48} who={who} />
    <div style={{ font: `400 21px/1.2 ${XF}` }}>{who === "inu" ? <><b>Agent Inu</b> <span style={{ color: "#536471" }}>@tweetpad_io · now</span></>
      : <><b>ETH Guy</b> <span style={{ color: "#536471" }}>@eth_guy_tp · now</span></>}</div>
  </div>
);

/* ---------- the card: its image (api/t.js img=1, 1080²), then the page it plays (?embed, 480²) ---------- */
const CardImage: React.FC<{ t: Tok; size: number }> = ({ t, size }) => (
  <div style={{ width: 1080, height: 1080, transform: `scale(${size / 1080})`, transformOrigin: "0 0", background: "radial-gradient(60% 50% at 50% 50%, #fff, #e3e8ec)", fontFamily: UI, position: "relative" }}>
    <div style={{ height: 104, display: "flex", alignItems: "center", padding: "0 44px", gap: 16, background: BAR, borderBottom: "3px solid #1d6aa5" }}>
      <Img src={staticFile("brand/tweetpad-hash-256.png")} style={{ width: 62, height: 62 }} />
      <span style={{ font: `600 46px/1 ${ROUND}`, color: "#fff" }}>tweetpad</span>
      <span style={{ marginLeft: "auto", padding: "14px 30px", borderRadius: 40, background: t.pill[0], color: t.pill[1], font: `700 40px/1 ${UI}`, border: "2px solid rgba(0,0,0,.25)" }}>{t.chain}</span>
    </div>
    <div style={{ position: "absolute", top: 200, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 44 }}>
      <TokImg t={t} size={184} badge={64} />
      <div><div style={{ font: `700 110px/1 ${UI}`, color: "#2f2f2f", letterSpacing: -2 }}>${t.coin.symbol}</div>
        <div style={{ font: `400 46px/1.3 ${UI}`, color: "#777" }}>{t.coin.name}</div><div style={{ font: `400 34px/1.3 ${UI}`, color: "#999" }}>{t.addr}</div></div>
    </div>
    <div style={{ position: "absolute", left: 100, right: 100, top: 750, display: "flex", alignItems: "center", padding: "30px 34px", background: "#fff", border: "2px solid #c8c8c8", borderRadius: 14,
      boxShadow: "0 4px 10px rgba(0,0,0,.12)" }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}><b style={{ font: `700 66px/1 ${UI}`, color: "#2f2f2f" }}>{t.mcap}</b>
          <b style={{ font: `700 40px/1 ${UI}`, color: t.ch.startsWith("▼") ? "#d0343a" : "#2e9e4f" }}>{t.ch} 1h</b></div>
        <div style={{ marginTop: 12, font: `400 30px/1 ${UI}`, color: "#999" }}>market cap · {t.liq} liq · {t.holders} holders</div>
      </div>
      <div style={{ padding: "16px 22px", borderRadius: 10, background: "linear-gradient(#33bcef, #019ad2)", color: "#fff", font: `800 30px/1.1 ${UI}`, textAlign: "center" }}>TRADE IN<br />THIS POST</div>
    </div>
  </div>
);
const PlayBtn: React.FC<{ pressed?: boolean }> = ({ pressed }) => (
  <span style={{ position: "absolute", left: "50%", top: "50%", width: 84, height: 84, marginLeft: -42, marginTop: -42, borderRadius: "50%", background: "#1d9bf0", border: "4px solid #fff",
    display: "grid", placeItems: "center", boxShadow: "0 4px 14px rgba(0,0,0,.3)", transform: `scale(${pressed ? 0.92 : 1})` }}>
    <span style={{ width: 0, height: 0, marginLeft: 8, borderLeft: "28px solid #fff", borderTop: "17px solid transparent", borderBottom: "17px solid transparent" }} /></span>
);
const LINE = [0.3, 0.34, 0.31, 0.4, 0.38, 0.45, 0.42, 0.5, 0.47, 0.55, 0.6, 0.57, 0.64, 0.62, 0.7, 0.68, 0.74, 0.79, 0.76, 0.82];
const TokenPage: React.FC<{ t: Tok; size: number; draw: number; pressOpen?: boolean }> = ({ t, size, draw, pressOpen }) => {
  const n = Math.max(2, Math.round(LINE.length * draw));
  const pts = LINE.slice(0, n).map((v, i) => `${i ? "L" : "M"}${8 + i * 22} ${110 - v * 100}`).join(" ");
  return (
    <div style={{ width: 480, height: 480, transform: `scale(${size / 480})`, transformOrigin: "0 0", background: "#e6e6e6", fontFamily: UI, color: "#333" }}>
      <div style={{ height: 42, display: "flex", alignItems: "center", gap: 6, padding: "0 10px", background: BAR, borderBottom: "1px solid #1d6aa5", color: "#fff" }}>
        <span style={{ font: `700 17px/1 ${UI}`, opacity: 0.85 }}>‹</span><Img src={staticFile("brand/tweetpad-hash-256.png")} style={{ width: 24, height: 24 }} />
        <span style={{ font: `600 19px/1 ${ROUND}` }}>tweetpad</span>
        <span style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: 14, background: "rgba(0,0,0,.18)", border: "1px solid rgba(255,255,255,.35)", font: `bold 13px/1 ${UI}` }}>${t.coin.symbol}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "#fff", border: "1px solid #c8c8c8", borderRadius: 5 }}>
          <TokImg t={t} size={44} badge={18} />
          <div style={{ flex: 1 }}><b style={{ font: `bold 17px/1.2 ${UI}` }}>{t.coin.name}</b>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}><span style={{ padding: "2px 7px", borderRadius: 9, background: t.pill[0], color: t.pill[1], font: `bold 10px/1.2 ${UI}` }}>{t.chain}</span>
              <span style={{ font: "11px/1 Menlo, monospace", color: "#999" }}>{t.addr}</span></div></div>
          <div style={{ textAlign: "right" }}><b style={{ font: `bold 19px/1.2 ${UI}` }}>{t.mcap}</b><div style={{ font: `12px/1.2 ${UI}`, color: t.ch.startsWith("▼") ? "#d0343a" : "#2e9e4f" }}>{t.ch} 24h</div></div>
        </div>
        <div style={{ padding: 8, background: "#fff", border: "1px solid #c8c8c8", borderRadius: 5 }}><svg width={440} height={118}><path d={pts} fill="none" stroke="#2e9e4f" strokeWidth={2} /></svg></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, background: "#fff", border: "1px solid #c8c8c8", borderRadius: 5 }}>
          <div style={{ display: "flex" }}>{["Buy", "Sell"].map((w, i) => <span key={w} style={{ padding: "7px 16px", font: `bold 13px/1 ${UI}`, color: i ? "#555" : "#fff",
            background: i ? "linear-gradient(#fff,#e6e6e6)" : "linear-gradient(#5cc46f,#2e9e4f)", border: "1px solid #bbb", borderRadius: i ? "0 4px 4px 0" : "4px 0 0 4px" }}>{w}</span>)}</div>
          <div style={{ font: `12px/1.2 ${UI}`, color: "#999" }}>Routed by {t.router} · tweetpad takes nothing</div>
          <div style={{ padding: "11px 0", textAlign: "center", borderRadius: 5, color: "#fff", font: `bold 15px/1 ${UI}`, border: "1px solid #057ed0",
            background: pressOpen ? "#0287c6" : "linear-gradient(#33bcef, #019ad2)", boxShadow: pressOpen ? "inset 0 2px 4px rgba(0,0,0,.25)" : undefined }}>Open to trade ↗</div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================================
 * 0. The hook
 * ========================================================================================= */
/** the cast side by side: ETH Guy (talking in `talkAt`, peeking over its shades) and Agent Inu, popping in at `at` */
const Cast: React.FC<{ f: number; at: number; size: number; talkAt?: [number, number][]; peekAt?: number }> = ({ f, at, size, talkAt = [], peekAt }) => {
  const a = pop(f, at), b = pop(f, at + 6);
  const bob = (k: number) => Math.sin((f + k) / 9) * 6;
  const peek = peekAt === undefined ? 0 : ramp(f, peekAt, peekAt + 6) * (1 - ramp(f, peekAt + 18, peekAt + 24));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: size * 0.3 }}>
      <div style={{ transform: `translateY(${bob(0)}px) scale(${a})`, filter: "drop-shadow(0 16px 24px rgba(40,60,120,.25))" }}>
        <Diamond size={size} jaw={talk(f, talkAt)} peek={peek} blink={Math.max(0, 1 - Math.abs(f - (at + 30)) / 3)} /></div>
      <div style={{ width: size * 0.82, height: size * 0.82, marginBottom: size * 0.09, borderRadius: size * 0.16, overflow: "hidden", transform: `translateY(${bob(14)}px) scale(${b}) rotate(${(1 - b) * 8}deg)`,
        border: "6px solid #fff", boxShadow: "0 16px 30px rgba(0,0,0,.22)" }}><Img src={staticFile("brand/agent-inu.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
    </div>
  );
};
const Hook: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ background: STRIPES, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 150, gap: 18, opacity: 1 - ramp(f, R.hook.dur - 10, R.hook.dur) }}>
    <div style={{ font: `800 76px/1.05 ${UI}`, letterSpacing: "-.03em", color: BRAND.ink, textAlign: "center", transform: `scale(${0.94 + 0.06 * pop(f, 2)})` }}>{C.hook.head}</div>
    <div style={{ font: `800 76px/1.05 ${UI}`, letterSpacing: "-.03em", color: BRAND.primary, opacity: ramp(f, 16, 28) }}>{C.hook.head2}</div>
    <div style={{ marginTop: 50 }}><Cast f={f} at={8} size={330} talkAt={[[10, 34]]} peekAt={44} /></div>
  </AbsoluteFill>
);

/* =========================================================================================
 * 1. The old way: the shill typed out, posted, then the reader's four tabs
 * ========================================================================================= */
const SHILL_TEXT = "$FROG is about to send 🐸🚀\nCA: 0x4e1f8c0b2d974d1e9a0f3b6c55a7c2\nChart: dexscreener.com/base/0x4e1f8c0b…";
const O = { type: 6, post: 62, posted: 70 } as const;
const Old: React.FC<{ f: number }> = ({ f }) => {
  const rel = f - R.old.from, d = R.old.dur;
  const show = ramp(rel, 0, 10) * (1 - ramp(rel, d - 10, d));
  const text = typed(SHILL_TEXT, rel, O.type, 2.2);
  const posted = ramp(rel, O.posted, O.posted + 10);
  const hand = cursorAt(rel, [[0, 980, 980], [O.post - 14, 905, 520], [O.post, 890, 508], [O.posted + 30, 860, 900]]);
  return (
    <AbsoluteFill style={{ background: STRIPES, opacity: show, filter: `grayscale(${0.35 * ramp(rel, O.posted + 20, O.posted + 50)})` }}>
      {rel < O.posted ? (
        <PostShell x={55} y={200} w={720} style={{ zoom: 1.3 }}><Composer who="eth" jaw={talk(rel, [[O.type, O.post - 6]])} text={text} caret={rel < O.post} press={inWin(rel, O.post, O.post + 5)} ready size={25} /></PostShell>
      ) : (
        <PostShell x={55} y={200} w={720} style={{ zoom: 1.3, opacity: posted, transform: `translateY(${(1 - posted) * 14}px)` }}>
          <div style={{ padding: "18px 20px 20px" }}>
            <Head who="eth" />
            <div style={{ margin: "10px 0 12px 60px", font: `400 22px/1.38 ${XF}`, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {SHILL_TEXT.split("\n").map((l, i) => <div key={i} style={{ color: i === 2 ? "#1d9bf0" : "#0f1419" }}>{l}</div>)}</div>
            {/* the only preview X makes of it: a plain link card */}
            <div style={{ marginLeft: 60, display: "flex", alignItems: "center", gap: 14, padding: 12, border: "1px solid #cfd9de", borderRadius: 14 }}>
              <span style={{ width: 80, height: 80, borderRadius: 10, background: "#e7ecf0", flex: "none" }} />
              <div><div style={{ font: `400 17px/1.3 ${XF}`, color: "#536471" }}>dexscreener.com</div><div style={{ font: `400 19px/1.3 ${XF}` }}>FROG/WETH on Base</div></div>
            </div>
          </div>
        </PostShell>
      )}
      <Cursor x={hand.x} y={hand.y} hand size={1.3} down={inWin(rel, O.post, O.post + 5)} t={1 - ramp(rel, O.posted + 20, O.posted + 30)} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * 2. The new way: one link, posted; the card plays; Open to trade; bought
 * ========================================================================================= */
const N = { type: 6, post: 42, posted: 50, play: 80, page: 88, open: 114, win: 120, buy: 142, done: 149 } as const;
const PX = 180, CARD = 640, CX = PX + 40, CY = 372;
const OPEN_BTN = { x: CX + 240 * (CARD / 480), y: CY + 368 * (CARD / 480) };
const PLAY = { x: CX + CARD / 2, y: CY + CARD / 2 };
const BUY_BTN = { x: 560, y: 694 };
const New: React.FC<{ f: number }> = ({ f }) => {
  const rel = f - R.neu.from, d = R.neu.dur;
  const show = ramp(rel, 0, 10) * (1 - ramp(rel, d - 10, d));
  const link = linkOf(FROG);
  const text = typed(link, rel, N.type, 0.9);
  const posted = ramp(rel, N.posted, N.posted + 12);
  const win = ramp(rel, N.win, N.win + 10, settle);
  const hand = cursorAt(rel, [[0, 980, 900], [N.post - 14, 836, 300], [N.post, 820, 292], [N.play - 16, PLAY.x + 40, PLAY.y + 30], [N.play, PLAY.x, PLAY.y],
    [N.open - 14, OPEN_BTN.x + 30, OPEN_BTN.y + 26], [N.open, OPEN_BTN.x, OPEN_BTN.y], [N.buy - 12, BUY_BTN.x + 30, BUY_BTN.y + 24], [N.buy, BUY_BTN.x, BUY_BTN.y]]);
  const taps = [N.post, N.play, N.open, N.buy];
  return (
    <AbsoluteFill style={{ background: STRIPES, opacity: show }}>
      {rel < N.posted ? (
        <PostShell x={PX} y={210} w={720}><Composer who="inu" text={text} color="#1d9bf0" caret={rel < N.post} press={inWin(rel, N.post, N.post + 5)} ready={text.length > 10} /></PostShell>
      ) : (
        <PostShell x={PX} y={210} w={720}>
          <div style={{ padding: "18px 20px 20px", opacity: posted, transform: `translateY(${(1 - posted) * 16}px)` }}>
            <Head who="inu" />
            <div style={{ margin: "10px 0 12px 60px", font: `400 22px/1.35 ${XF}`, color: "#1d9bf0" }}>{link}</div>
            <div style={{ position: "relative", marginLeft: 20, width: CARD, height: CARD, borderRadius: 16, overflow: "hidden", border: "1px solid #cfd9de" }}>
              {rel >= N.page ? <TokenPage t={FROG} size={CARD} draw={ramp(rel, N.page + 2, N.page + 30)} pressOpen={inWin(rel, N.open, N.open + 5)} /> : <CardImage t={FROG} size={CARD} />}
              {rel < N.page ? <PlayBtn pressed={inWin(rel, N.play, N.play + 5)} /> : null}
            </div>
          </div>
        </PostShell>
      )}
      {/* tweetpad's window, where the wallet signs */}
      <div style={{ position: "absolute", left: 250, top: 470, width: 600, opacity: win, transform: `translateY(${(1 - win) * 40}px) scale(${0.96 + 0.04 * win})`, borderRadius: 12, overflow: "hidden",
        background: "#e6e6e6", border: "1px solid #b9c1c6", boxShadow: "0 24px 60px rgba(0,0,0,.28)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 12px", background: "linear-gradient(#f4f6f7, #dfe4e7)", borderBottom: "1px solid #c3cacf" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />)}
          <span style={{ marginLeft: 10, font: `500 14px/1 ${UI}`, color: "#59636a" }}>{link}</span>
        </div>
        <SkinCtx.Provider value={SKIN_2012}>
          <div style={{ padding: 12, zoom: 1.3 }}>
            <TradeBox side="buy" symbol="FROG" chain="base" amount="0.01" chip={2} est={{ kind: "quote", out: "1.24M", min: "1.18M", usd: "$25.10" }}
              button="Buy $FROG" pressed={inWin(rel, N.buy, N.buy + 6)} status={rel >= N.done ? { tone: "ok", text: "Bought 1.24M $FROG", tx: true } : null} />
          </div>
        </SkinCtx.Provider>
      </div>
      <Cursor x={hand.x} y={hand.y} hand size={1.3} down={taps.some((k) => inWin(rel, k, k + 5))} t={show} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * 3. Any token, five chains: the same post, chain after chain
 * ========================================================================================= */
const FLIP = 44;
const Chains: React.FC<{ f: number }> = ({ f }) => {
  const rel = f - R.chains.from, d = R.chains.dur;
  const show = ramp(rel, 0, 10) * (1 - ramp(rel, d - 10, d));
  const i = Math.min(TOKS.length - 1, Math.floor(rel / FLIP));
  const t = TOKS[i];
  const flip = ramp(rel % FLIP, 0, 8);
  const S = 520;
  return (
    <AbsoluteFill style={{ background: STRIPES, opacity: show }}>
      <div style={{ position: "absolute", top: 200, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 22 }}>
        {TOKS.map((x, k) => (
          <span key={x.net} style={{ display: "grid", justifyItems: "center", gap: 8, opacity: k === i ? 1 : 0.4, transform: `scale(${k === i ? 1.12 : 1})` }}>
            <ChainDisc net={x.net} size={58} /><b style={{ font: `700 16px/1 ${UI}`, color: k === i ? BRAND.ink : BRAND.darkGray }}>{x.chain}</b></span>
        ))}
      </div>
      <PostShell x={(1080 - 600) / 2} y={318} w={600}>
        <div style={{ padding: "16px 18px 18px" }}>
          <Head who="inu" />
          <div style={{ margin: "8px 0 10px 60px", font: `400 21px/1.35 ${XF}`, color: "#1d9bf0" }}>tweetpad.io/<b>{t.short}</b>/{t.addr}</div>
          <div style={{ position: "relative", marginLeft: 22, width: S, height: S, borderRadius: 16, overflow: "hidden", border: "1px solid #cfd9de",
            opacity: 0.4 + 0.6 * flip, transform: `scale(${0.97 + 0.03 * flip})` }}>
            <CardImage t={t} size={S} /><PlayBtn />
          </div>
        </div>
      </PostShell>
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * 4. Launch yours too: five chains, custom Uniswap v4 hooks, Bordrless tokens (the Menu's glass tiles)
 * ========================================================================================= */
const Launch: React.FC<{ f: number }> = ({ f }) => {
  const rel = f - R.launch.from, d = R.launch.dur;
  const show = ramp(rel, 0, 10) * (1 - ramp(rel, d - 10, d));
  return (
    <AbsoluteFill style={{ background: STRIPES, opacity: show }}>
      <div style={{ position: "absolute", top: 250, left: 60, right: 60, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 26 }}>
        {C.launch.tiles.map(([icon, head, sub], i) => {
          const t = pop(rel, 8 + i * 14);
          const bordr = icon.endsWith(".png");
          return (
            <div key={head} style={{ display: "grid", justifyItems: "center", alignContent: "start", gap: 18, padding: "34px 22px 30px", textAlign: "center", borderRadius: 28,
              background: "linear-gradient(162deg, rgba(255,255,255,.95) 0 34%, rgba(255,255,255,0) 34.4%), linear-gradient(#fbfcfd, #e8edf0)", border: "4px solid #d2d9de",
              boxShadow: "inset 0 0 0 2px #fff, 0 6px 16px rgba(40,60,75,.16)", transform: `scale(${t})`, opacity: Math.min(1, t * 1.4) }}>
              <Img src={staticFile(icon)} style={{ width: bordr ? 150 : 132, height: bordr ? 150 : 132, margin: bordr ? "-9px 0" : 0, objectFit: "contain", mixBlendMode: bordr ? "multiply" : undefined,
                filter: bordr ? undefined : "drop-shadow(0 5px 6px rgba(30,45,60,.25))" }} />
              <b style={{ font: `600 36px/1.1 ${ROUND}`, color: "#3b4146" }}>{head}</b>
              <span style={{ font: `500 22px/1.35 ${UI}`, color: BRAND.darkGray }}>{sub}</span>
              {i === 0 ? <div style={{ display: "flex", gap: 8, marginTop: 4 }}>{TOKS.map((x) => <ChainDisc key={x.net} net={x.net} size={36} />)}</div> : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * 5. How to: three steps
 * ========================================================================================= */
const How: React.FC<{ f: number }> = ({ f }) => {
  const rel = f - R.how.from, d = R.how.dur;
  const show = ramp(rel, 0, 10) * (1 - ramp(rel, d - 10, d));
  return (
    <AbsoluteFill style={{ background: STRIPES, opacity: show }}>
      <div style={{ position: "absolute", top: 230, left: 120, right: 120, display: "grid", gap: 26 }}>
        {C.steps.map(([n, head, sub], i) => {
          const t = ramp(rel, 10 + i * 46, 24 + i * 46, settle);
          return (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 26, padding: "26px 30px", background: "linear-gradient(162deg, rgba(255,255,255,.95) 0 34%, rgba(255,255,255,0) 34.4%), linear-gradient(#fbfcfd, #e8edf0)",
              border: "3px solid #d2d9de", borderRadius: 26, boxShadow: "inset 0 0 0 2px #fff, 0 4px 12px rgba(40,60,75,.14)", opacity: t, transform: `translateY(${(1 - t) * 26}px)` }}>
              <span style={{ width: 76, height: 76, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", color: "#fff", font: `700 40px/1 ${ROUND}`,
                background: "linear-gradient(#5cc4ff, #1a8fe0)", boxShadow: "inset 0 2px 0 rgba(255,255,255,.4), 0 4px 10px rgba(29,120,200,.35)" }}>{n}</span>
              <div>
                <div style={{ font: `600 38px/1.15 ${ROUND}`, color: "#3b4146" }}>{head}</div>
                <div style={{ marginTop: 6, font: `500 24px/1.3 ${UI}`, color: BRAND.darkGray }}>{sub}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * The film
 * ========================================================================================= */
const capOf = (f: number) => {
  const at = (s: { from: number; dur: number }) => { const r = f - s.from; return ramp(r, 4, 16) * (1 - ramp(r, s.dur - 14, s.dur - 2)); };
  if (inWin(f, R.old.from, R.old.from + R.old.dur)) return { c: C.old, t: at(R.old), fine: C.fine.old };
  if (inWin(f, R.neu.from, R.neu.from + R.neu.dur)) return { c: C.neu, t: at(R.neu), fine: C.fine.neu };
  if (inWin(f, R.chains.from, R.chains.from + R.chains.dur)) {
    const i = Math.min(TOKS.length - 1, Math.floor((f - R.chains.from) / FLIP));
    return { c: { ...C.chains, head2: TOKS[i].chain }, t: at(R.chains), fine: C.fine.chains };
  }
  if (inWin(f, R.launch.from, R.launch.from + R.launch.dur)) return { c: C.launch, t: at(R.launch), fine: C.fine.launch };
  if (inWin(f, R.how.from, R.how.from + R.how.dur)) return { c: C.how, t: at(R.how), fine: C.fine.how };
  return null;
};

export const TweetpadShill: React.FC = () => {
  loadFonts();
  const f = useCurrentFrame();
  if (f >= R.end.from) {
    return (
      <AbsoluteFill style={{ background: `linear-gradient(160deg, ${BRAND.light}, ${BRAND.primary} 60%, #1a8bd6)` }}>
        <End tagline={C.end.tagline} tagline2={C.end.tagline2} fine={C.fine.end}
          row={<div style={{ display: "flex", gap: 18 }}>{TOKS.map((t) => <ChainDisc key={t.net} net={t.net} size={64} />)}</div>} />
        {/* the cast sees it out from the corners */}
        <div style={{ position: "absolute", left: 30, bottom: 70, transform: `translateY(${(1 - ramp(f - R.end.from, 50, 66, settle)) * 260}px) rotate(-8deg)` }}>
          <Diamond size={190} jaw={talk(f - R.end.from, [[70, 96]])} /></div>
        <div style={{ position: "absolute", right: 40, bottom: 80, width: 150, height: 150, borderRadius: 26, overflow: "hidden", border: "6px solid #fff", boxShadow: "0 14px 30px rgba(0,30,60,.3)",
          transform: `translateY(${(1 - ramp(f - R.end.from, 58, 74, settle)) * 280}px) rotate(7deg)` }}><Img src={staticFile("brand/agent-inu.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
      </AbsoluteFill>
    );
  }
  const cap = capOf(f);
  const oldTag = cap?.c === C.old;
  return (
    <AbsoluteFill style={{ background: STRIPES }}>
      {f < R.hook.from + R.hook.dur ? <Hook f={f} /> : null}
      {inWin(f, R.old.from, R.old.from + R.old.dur) ? <Old f={f} /> : null}
      {inWin(f, R.neu.from, R.neu.from + R.neu.dur) ? <New f={f} /> : null}
      {inWin(f, R.chains.from, R.chains.from + R.chains.dur) ? <Chains f={f} /> : null}
      {inWin(f, R.launch.from, R.launch.from + R.launch.dur) ? <Launch f={f} /> : null}
      {inWin(f, R.how.from, R.how.from + R.how.dur) ? <How f={f} /> : null}
      {cap ? (
        <div style={{ filter: oldTag ? "grayscale(1)" : undefined }}>
          <Caption tag={cap.c.tag} head={cap.c.head} head2={"head2" in cap.c ? cap.c.head2 : undefined} t={cap.t} y={18} />
        </div>
      ) : null}
      {cap ? <Fine text={cap.fine} t={cap.t} size={16} /> : null}
    </AbsoluteFill>
  );
};
