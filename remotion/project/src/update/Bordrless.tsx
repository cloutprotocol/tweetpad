/**
 * TweetpadBordrless: "Bordrless tokens. Tradeable in a tweet." 1080x1080 @30, 47.0 s, in Bordrless's look blended with tweetpad's.
 * Bordrless tokens live in a token standard of their own, so wallets don't list them and swap aggregators don't route them. tweetpad
 * gives every one a trading page at tweetpad.io/b/<token CA> (api/b.js, assets/b.js, b.css) that plays as its own X card, so a
 * posted link is the coin, tradeable in the post. The page is rebuilt here from assets/b.css + assets/scan.css at the card's 480 px
 * width; the card is api/b.js's card image, redrawn; the list and the launch form are the app's Bordrless list and Bordrless box
 * in its Bordrless skin. Every in-app string is verbatim from assets/b.js, assets/tweetpad.js and api/b.js.
 * Look: paper #e3e3df, ink #111, Anton headlines, JetBrains Mono labels, Space Grotesk text, square cards on hard offset shadows,
 * "Fig." tags, and the 1-bit dithered pictures in public/bordrless/ (the ringed sphere's monument and the sculptor's workshop),
 * with tweetpad's # icon and its blue in the shadows. Demo coin $RING (its picture is the sphere) and demo numbers only.
 * Taps are ThreeNew's Tap (hand + ripple inside the tapped control); the cursor appears only on the generic wallet window.
 */
import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { BRAND } from "../brand/tokens";
import { Cursor, cursorAt } from "../components/Film";
import { WALLET_OK, WalletWindow } from "../howto/parts";
import { lerp, pop, ramp, settle, typed } from "../lib/motion";
import { BORDR as R, BORDR_COPY as C, BORDR_T as IT } from "../timeline";
import { Tap } from "./ThreeNew";

export const INK = "#111", PAPER = "#e3e3df", CARD = "#f4f4f2", LINE = "#d4d4cf", DIM = "#6b6b66", SOFT = "#3b3b38";
export const BLUE = "#1f3cff", YEL = "#f2c230", OK = "#1f9d47", BAD = "#d92d2d", WARN = "#e0731a", TP = BRAND.primary;
export const HEAD = '"Anton", Impact, sans-serif', MONO = '"JetBrains Mono", Menlo, monospace', SANS = '"Space Grotesk", "Inter", sans-serif';
export const MON = "bordrless/monument.png", WS = "bordrless/workshop.png";
const CO = C.coin;

const inWin = (f: number, a: number, b: number) => f >= a && f < b;
const capFade = (f: number, dur: number) => ramp(f, 0, 12) * (1 - ramp(f, dur - 10, dur, settle));

/* =========================================================================================
 * Bordrless's look: the paper, a crop of a dithered picture, the caption, the small type
 * ========================================================================================= */
/** a square crop of one of the 1200x675 dithered pictures: the region [x, y, side] drawn at `size` px */
export const Crop: React.FC<{ src: string; x: number; y: number; side: number; size: number; style?: React.CSSProperties }> = ({ src, x, y, side, size, style }) => {
  const k = size / side;
  return <div style={{ width: size, height: size, flex: "none", backgroundImage: `url(${staticFile(src)})`, backgroundSize: `${1200 * k}px ${675 * k}px`,
    backgroundPosition: `${-x * k}px ${-y * k}px`, imageRendering: "pixelated", ...style }} />;
};
/** the demo coins' pictures: crops of the two pictures */
export const PICS = {
  RING: { src: MON, x: 440, y: 18, side: 320 },   // the ringed sphere
  MONO: { src: MON, x: 470, y: 300, side: 260 },  // the plinth and the walk
  CHSL: { src: WS, x: 640, y: 150, side: 300 },   // the sculptor at the stone
  PLTH: { src: MON, x: 0, y: 330, side: 340 },    // the drums
  DUST: { src: WS, x: 180, y: 420, side: 250 },   // the tools on the bench
} as const;
export const Pic: React.FC<{ k: keyof typeof PICS; size: number; border?: number; shadow?: number }> = ({ k, size, border = 2, shadow = 0 }) => (
  <Crop {...PICS[k]} size={size} style={{ border: `${border}px solid ${INK}`, boxShadow: shadow ? `${shadow}px ${shadow}px 0 ${INK}` : undefined, boxSizing: "border-box" }} />
);

/** the paper: faint rules, corner brackets; optionally a dithered picture laid in */
export const Paper: React.FC<{ pic?: string; picT?: number; zoom?: number }> = ({ pic, picT = 0, zoom = 1 }) => (
  <AbsoluteFill style={{ background: PAPER }}>
    {pic ? <Img src={staticFile(pic)} style={{ position: "absolute", left: "50%", top: "50%", height: 1080 * zoom, transform: "translate(-50%, -50%)", opacity: picT, imageRendering: "pixelated" }} /> : null}
    <AbsoluteFill style={{ backgroundImage: `linear-gradient(rgba(17,17,17,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(17,17,17,.045) 1px, transparent 1px)`, backgroundSize: "54px 54px" }} />
    {[[24, 24, "0 0"], [1056, 24, "1 0"], [24, 1056, "0 1"], [1056, 1056, "1 1"]].map(([x, y, o]) => {
      const [ox, oy] = String(o).split(" ").map(Number);
      return <div key={String(o)} style={{ position: "absolute", left: (x as number) - ox * 22, top: (y as number) - oy * 22, width: 22, height: 22,
        borderLeft: ox ? undefined : `3px solid ${INK}`, borderRight: ox ? `3px solid ${INK}` : undefined, borderTop: oy ? undefined : `3px solid ${INK}`, borderBottom: oy ? `3px solid ${INK}` : undefined }} />;
    })}
  </AbsoluteFill>
);

/** a mono chip: ink (the tag) or grey (the "Fig." tag) */
export const Chip: React.FC<{ children: React.ReactNode; ink?: boolean; size?: number; style?: React.CSSProperties }> = ({ children, ink, size = 18, style }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: `${size * 0.36}px ${size * 0.6}px`, font: `700 ${size}px/1 ${MONO}`, letterSpacing: ".04em",
    color: ink ? "#fff" : INK, background: ink ? INK : "#cfcfca", ...style }}>{children}</span>
);

/** the caption: the tags, a headline in Anton, its second line white on ink, on tweetpad's blue shadow */
export const BCap: React.FC<{ tag?: string; fig?: string; head: string; head2?: string; t: number; y?: number }> = ({ tag, fig, head, head2, t, y = 40 }) => (
  <div style={{ position: "absolute", left: 60, right: 60, top: y, display: "flex", flexDirection: "column", alignItems: "center", opacity: t, transform: `translateY(${(1 - t) * 16}px)` }}>
    {tag || fig ? <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>{fig ? <Chip>{fig}</Chip> : null}{tag ? <Chip ink>{tag === "NEW" ? <span style={{ width: 9, height: 9, background: YEL }} /> : null}{tag}</Chip> : null}</div> : null}
    <div style={{ font: `400 66px/1 ${HEAD}`, color: INK, letterSpacing: "-.005em", textAlign: "center" }}>{head}</div>
    {head2 ? <div style={{ marginTop: 10, padding: "8px 18px 10px", font: `400 46px/1 ${HEAD}`, color: "#fff", background: INK, boxShadow: `7px 7px 0 ${TP}` }}>{head2}</div> : null}
  </div>
);
export const BFine: React.FC<{ text: string; t?: number }> = ({ text, t = 1 }) => (
  <div style={{ position: "absolute", left: 50, right: 50, bottom: 34, textAlign: "center", font: `400 15px/1.3 ${MONO}`, color: DIM, opacity: t }}>{text}</div>
);
/** a framed plate: the card of bordrless.app (paper, ink border, hard shadow, corner brackets) */
export const Plate: React.FC<{ style?: React.CSSProperties; shadow?: number; children: React.ReactNode }> = ({ style, shadow = 8, children }) => (
  <div style={{ position: "absolute", background: CARD, border: `3px solid ${INK}`, boxShadow: `${shadow}px ${shadow}px 0 ${INK}`, boxSizing: "border-box", ...style }}>{children}</div>
);
/** the tweetpad # icon */
export const Hash: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => <Img src={staticFile("brand/tweetpad-hash-256.png")} style={{ width: size, height: size, ...style }} />;

/* =========================================================================================
 * 0. Intro: tweetpad's own post spells out what's new, beside the ringed sphere (as film 11's diamond did)
 * ========================================================================================= */
const SPELL = 1.25; // chars per frame
const gmEnd = IT.gm + Math.ceil(C.intro.gm.length / 1.3);
const Intro: React.FC = () => {
  const f = useCurrentFrame(); const d = R.intro.dur;
  const out = ramp(f, d - 14, d, settle);
  const hop = IT.items.reduce((a, at) => a + (f >= at && f < at + 12 ? Math.sin(((f - at) / 12) * Math.PI) : 0), 0);
  const bob = Math.sin(f * 0.09) * 9 - hop * 20;
  const tilt = Math.sin(f * 0.06) * 2.5;
  // a scan line across the sphere's plate, like a reading being taken
  const scan = (f * 3.2) % 420;
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <BCap tag={C.intro.tag} head={C.intro.head} head2={C.intro.head2} t={1} />
      {/* the sphere, the token "with a brain", on its plate */}
      <Plate style={{ left: 44, top: 330, width: 330, height: 470 }}>
        <div style={{ position: "absolute", left: 12, top: 12 }}><Chip size={15}>Fig. 0</Chip></div>
        <div style={{ position: "absolute", left: 14, right: 14, top: 52, height: 330, overflow: "hidden", background: "#d8d8d4", border: `2px solid ${INK}` }}>
          <div style={{ position: "absolute", left: -18, top: -10, transform: `translateY(${bob}px) rotate(${tilt}deg) scale(${1 + hop * 0.05})`, transformOrigin: "50% 60%" }}>
            <Crop src={MON} x={398} y={0} side={404} size={332} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: scan - 60, height: 2, background: "rgba(31,60,255,.55)", boxShadow: "0 0 10px rgba(31,60,255,.5)" }} />
        </div>
        <div style={{ position: "absolute", left: 16, right: 16, bottom: 18, font: `400 15px/1.35 ${MONO}`, color: SOFT }}>
          A token with its own rules,<br />run on every trade.
        </div>
      </Plate>
      {/* its post */}
      <Plate style={{ left: 404, top: 330, width: 632, padding: "20px 22px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 58, height: 58, display: "grid", placeItems: "center", background: "#fff", border: `2px solid ${INK}` }}><Hash size={46} /></span>
          <b style={{ font: `700 26px/1.1 ${SANS}`, color: INK }}>{C.intro.author}</b>
          <span style={{ font: `400 18px/1 ${MONO}`, color: DIM }}>{C.intro.handle} · now</span>
        </div>
        <div style={{ position: "relative", marginTop: 14, font: `500 27px/1.3 ${SANS}` }}>
          <span style={{ color: "rgba(17,17,17,.14)" }}>{C.intro.gm}</span>
          <span style={{ position: "absolute", left: 0, top: 0, color: INK }}>{typed(C.intro.gm, f, IT.gm, 1.3)}{f >= IT.gm && f < gmEnd + 6 && Math.floor(f / 8) % 2 === 0 ? <span style={{ color: BLUE }}>|</span> : null}</span>
        </div>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {C.intro.items.map((label, i) => {
            const at = IT.items[i];
            const p = f < at ? 0 : Math.min(1, pop(f, at));
            const txt = typed(label, f, at, SPELL);
            const live = f >= at && txt.length < label.length;
            const hi = ramp(f, at, at + 4) * (1 - ramp(f, at + 30, at + 44));
            return (
              // not spelled yet: a faint ghost (so frame 0, the thumbnail, shows every line), lit letter by letter as it is said
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 10px", border: `2px solid ${hi > 0.02 ? INK : "transparent"}`,
                background: `rgba(242,194,48,${0.35 * hi})`, transform: `translateX(${(1 - p) * -6}px)` }}>
                <span style={{ width: 36, height: 36, flex: "none", display: "grid", placeItems: "center", font: `700 18px/1 ${MONO}`, color: f >= at ? "#fff" : DIM,
                  background: f >= at ? INK : "transparent", border: `2px solid ${f >= at ? INK : "#bdbdb8"}` }}>{String(i + 1).padStart(2, "0")}</span>
                <b style={{ position: "relative", font: `700 23px/1.15 ${SANS}`, whiteSpace: "nowrap" }}>
                  <span style={{ color: "rgba(17,17,17,.14)" }}>{label}</span>
                  <span style={{ position: "absolute", left: 0, top: 0, color: INK }}>{txt}{live && Math.floor(f / 6) % 2 === 0 ? <span style={{ color: BLUE, fontWeight: 400 }}>|</span> : null}</span>
                </b>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 12, font: `500 22px/1.3 ${SANS}`, color: TP, opacity: ramp(f, IT.items[4] + 34, IT.items[4] + 44) }}>#tweetpad #Bordrless</div>
      </Plate>
      <BFine text={C.fine.intro} t={0.9} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * 1. Why: a token standard of its own; wallets don't list it, aggregators don't route it. Until now.
 * ========================================================================================= */
const Row: React.FC<{ left: React.ReactNode; right?: React.ReactNode; dashed?: boolean; tone?: string }> = ({ left, right, dashed, tone }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 4px", borderTop: `${dashed ? 2 : 1}px ${dashed ? "dashed" : "solid"} ${dashed ? INK : LINE}`, font: `500 22px/1.2 ${SANS}`, color: tone || INK }}>
    {left}<span style={{ marginLeft: "auto", font: `700 20px/1 ${MONO}` }}>{right}</span>
  </div>
);
const Why: React.FC = () => {
  const f = useCurrentFrame(); const d = R.why.dur;
  const t = capFade(f, d);
  const a = ramp(f, 14, 30), b = ramp(f, 34, 50), x1 = ramp(f, 46, 54), x2 = ramp(f, 62, 70);
  const st = f < 92 ? 0 : Math.min(1.08, pop(f, 92));
  return (
    <AbsoluteFill style={{ opacity: t }}>
      <BCap fig={C.why.fig} tag={C.why.tag} head={C.why.head} head2={C.why.head2} t={1} />
      <Plate style={{ left: 44, top: 300, width: 470, height: 620, overflow: "hidden", padding: 0 }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <Img src={staticFile(WS)} style={{ position: "absolute", height: 620, left: -380 - f * 0.4, top: 0, imageRendering: "pixelated" }} />
        </div>
        <div style={{ position: "absolute", left: 14, bottom: 14 }}><Chip size={15} style={{ background: "#fff" }}>A standard built from scratch for hooks</Chip></div>
      </Plate>
      <Plate style={{ left: 548, top: 300, width: 488, padding: "16px 20px", opacity: a, transform: `translateY(${(1 - a) * 20}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Chip size={15}>A</Chip><b style={{ font: `400 30px/1 ${HEAD}` }}>{C.why.wallet}</b></div>
        <div style={{ marginTop: 10 }}>
          <Row left={<><span style={{ width: 30, height: 30, background: "linear-gradient(135deg,#9945ff,#14f195)", borderRadius: "50%" }} />SOL</>} right={CO.balance} />
          <Row left={<><span style={{ width: 30, height: 30, background: "#2775ca", borderRadius: "50%" }} />USDC</>} right="25.00" />
          <Row dashed tone={x1 > 0.5 ? BAD : DIM} left={<><span style={{ font: `700 26px/1 ${MONO}` }}>✕</span>{C.why.walletNote}</>} />
        </div>
      </Plate>
      <Plate style={{ left: 548, top: 610, width: 488, padding: "16px 20px", opacity: b, transform: `translateY(${(1 - b) * 20}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Chip size={15}>B</Chip><b style={{ font: `400 30px/1 ${HEAD}` }}>{C.why.router}</b></div>
        <div style={{ marginTop: 10 }}>
          <Row left={<>SOL <span style={{ font: `700 22px/1 ${MONO}` }}>→</span> <Pic k="RING" size={30} border={2} /> ${CO.ticker}</>} right="0.1" />
          <Row dashed tone={x2 > 0.5 ? BAD : DIM} left={<><span style={{ font: `700 26px/1 ${MONO}` }}>✕</span>{C.why.routerNote}</>} />
        </div>
      </Plate>
      {/* the stamp */}
      {f >= 92 ? <div style={{ position: "absolute", left: 540, top: 600, transform: `translate(-50%, -50%) rotate(-6deg) scale(${st})`, padding: "18px 38px 22px", background: YEL,
        border: `5px solid ${INK}`, boxShadow: `12px 12px 0 ${INK}`, font: `400 92px/1 ${HEAD}`, color: INK, whiteSpace: "nowrap" }}>{C.why.stamp}</div> : null}
      <BFine text={C.fine.why} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * The coin's card (api/b.js card(): 1080x1080 design px), drawn at any size
 * ========================================================================================= */
const RULE_CHIPS = ["1% creator fee", "0.5% to holders", "0.5% burned"];
export const CoinCard: React.FC<{ size: number; play?: number }> = ({ size, play = 0 }) => {
  const s = size / 1080;
  const stat = (label: string, value: string, color = INK) => (
    <div style={{ display: "flex", flexDirection: "column", marginRight: 46 }}>
      <span style={{ font: `700 24px/1 ${MONO}`, color: DIM }}>{label}</span><span style={{ marginTop: 6, font: `700 46px/1.1 ${MONO}`, color }}>{value}</span>
    </div>
  );
  return (
    <div style={{ width: size, height: size, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1080, transform: `scale(${s})`, transformOrigin: "0 0", background: PAPER, fontFamily: SANS }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 92, background: INK, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 56px" }}>
          <span style={{ font: `400 46px/1 ${HEAD}`, color: "#fff" }}>tweetpad</span>
          <span style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", background: YEL, font: `700 24px/1 ${MONO}`, color: INK }}><span style={{ width: 14, height: 14, background: INK }} />TRADE IN THIS POST</span>
        </div>
        <div style={{ position: "absolute", top: 150, left: 70, right: 70, display: "flex", alignItems: "center" }}>
          <Pic k="RING" size={200} border={6} shadow={12} />
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 50 }}>
            <span style={{ font: `400 136px/1 ${HEAD}`, color: INK }}>${CO.ticker}</span>
            <span style={{ marginTop: 12, font: `500 40px/1 ${SANS}`, color: SOFT }}>{CO.name}</span>
            <span style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ padding: "6px 10px", background: INK, color: "#fff", font: `700 22px/1 ${MONO}` }}>BORDRLESS</span>
              <span style={{ font: `700 24px/1 ${MONO}`, color: DIM }}>{CO.addr}</span></span>
          </div>
        </div>
        <div style={{ position: "absolute", left: 70, right: 70, top: 690, padding: "28px 36px", background: CARD, border: `5px solid ${INK}`, boxShadow: `14px 14px 0 ${INK}`, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "flex-end" }}>{stat("MARKET CAP", CO.cap)}{stat("24H", "+12.4%", OK)}{stat("HOLDERS", CO.holders)}</div>
          <div style={{ marginTop: 20, height: 30, border: `4px solid ${INK}`, background: "#d4d4cf", position: "relative" }}>
            <div style={{ width: `${CO.curve * 100}%`, height: "100%", background: INK }} />
            <span style={{ position: "absolute", right: 10, top: 2, font: `700 20px/1 ${MONO}`, color: INK }}>{Math.round(CO.curve * 100)}% TO GRADUATION</span>
          </div>
          <div style={{ marginTop: 22, display: "flex", gap: 12 }}>{RULE_CHIPS.map((w) => <span key={w} style={{ padding: "6px 10px", background: "#cfcfca", font: `700 22px/1 ${MONO}`, color: INK }}>{w.toUpperCase()}</span>)}</div>
        </div>
        {/* X's play button over the middle */}
        {play > 0 ? <div style={{ position: "absolute", left: 540 - 85, top: 540 - 85, width: 170, height: 170, borderRadius: "50%", background: TP, opacity: play,
          boxShadow: "0 0 0 10px rgba(255,255,255,.85)", display: "grid", placeItems: "center" }}>
          <svg width={70} height={80} viewBox="0 0 7 8"><path d="M0 0l7 4-7 4z" fill="#fff" /></svg></div> : null}
      </div>
    </div>
  );
};

/* =========================================================================================
 * 2. Share: tweetpad.io/b/<token CA> typed into a post becomes the coin's card
 * ========================================================================================= */
const POST_AT = 96, PLAY_AT = 156;
const Share: React.FC = () => {
  const f = useCurrentFrame(); const d = R.share.dur;
  const t = ramp(f, 0, 12);
  const out = ramp(f, d - 12, d, settle);
  const text = typed(C.share.post, f, 10, 1.4), link = typed(C.share.link, f, 48, 1.2);
  const posted = f >= POST_AT + 6;
  const cardIn = ramp(f, POST_AT + 6, POST_AT + 26);
  const zoom = ramp(f, PLAY_AT + 6, d, settle);   // the card grows toward the page that opens from it
  return (
    <AbsoluteFill style={{ opacity: t }}>
      <BCap tag={C.share.tag} head={C.share.head} head2={C.share.head2} t={capFade(f, d)} />
      <div style={{ position: "absolute", left: 180, top: 268, width: 720, transform: `scale(${1 + zoom * 0.18})`, transformOrigin: "50% 60%", opacity: 1 - out * 0.9 }}>
        <Plate style={{ position: "relative", padding: "18px 22px 20px" }}>
          <div style={{ display: "flex", gap: 14 }}>
            <span style={{ width: 52, height: 52, flex: "none", background: "#cfcfca", border: `2px solid ${INK}`, display: "grid", placeItems: "center", font: `400 26px/1 ${HEAD}` }}>Y</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `400 17px/1 ${MONO}`, color: DIM }}>{posted ? "you · now" : "What's happening?"}</div>
              <div style={{ marginTop: 8, font: `500 25px/1.3 ${SANS}`, color: INK }}>{text}</div>
              <div style={{ marginTop: 2, font: `700 25px/1.3 ${MONO}`, color: BLUE }}>{link}{!posted && f >= 48 && Math.floor(f / 8) % 2 === 0 ? <span style={{ color: INK }}>|</span> : null}</div>
            </div>
          </div>
          {!posted ? (
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14 }}>
              <span style={{ font: `400 17px/1 ${MONO}`, color: DIM }}>{280 - C.share.post.length - C.share.link.length - 1}</span>
              <span style={{ position: "relative", padding: "12px 26px", background: INK, color: "#fff", font: `700 20px/1 ${SANS}`, boxShadow: `4px 4px 0 ${TP}` }}>Post<Tap f={f} at={POST_AT} /></span>
            </div>
          ) : (
            <div style={{ position: "relative", marginTop: 14, marginLeft: 66, width: 470, height: 470 * cardIn, overflow: "hidden", border: `2px solid ${INK}`, opacity: cardIn }}>
              <CoinCard size={470} play={ramp(f, POST_AT + 30, POST_AT + 40) * (1 - ramp(f, PLAY_AT + 4, PLAY_AT + 12))} />
              <div style={{ position: "absolute", left: 235 - 30, top: 235 - 30, width: 60, height: 60 }}><Tap f={f} at={PLAY_AT} /></div>
            </div>
          )}
          {posted ? <div style={{ marginTop: 8, marginLeft: 66, font: `400 16px/1 ${MONO}`, color: DIM }}>tweetpad.io</div> : null}
        </Plate>
      </div>
      <BFine text={C.fine.trade} t={capFade(f, d)} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * The coin's page (/b/<mint>: assets/b.js + b.css + scan.css), at the card's 480 px, ×1.5
 * ========================================================================================= */
const PW = 480, PS = 1.5, PX = (1080 - PW * PS) / 2, PY = 262, PH = (972 - PY) / PS;
export type PageState = {
  amount?: string; quoting?: boolean; quote?: boolean; wallet?: boolean; busy?: boolean;
  status?: { tone: "warn" | "ok"; text: string; tx?: boolean } | null; taps?: { chip01?: number; go?: number; claim?: number };
};
const pbtn = (extra?: React.CSSProperties): React.CSSProperties => ({ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "7px 12px",
  font: `700 12px/1 ${SANS}`, color: INK, background: "#fff", border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, ...extra });
const PCard: React.FC<{ fig: string; title: string; children: React.ReactNode }> = ({ fig, title, children }) => (
  <section style={{ display: "flex", flexDirection: "column", padding: "9px 10px 6px", background: CARD, border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 6, marginBottom: 2, borderBottom: `2px solid ${INK}` }}>
      <span style={{ padding: "3px 6px", font: `700 10px/1 ${MONO}`, background: "#cfcfca" }}>{fig}</span><b style={{ font: `400 17px/1 ${HEAD}` }}>{title}</b>
    </div>
    {children}
  </section>
);
const KV: React.FC<{ k: string; v: React.ReactNode; tone?: "gone" | "held"; first?: boolean }> = ({ k, v, tone, first }) => (
  <div style={{ display: "grid", gridTemplateColumns: "104px 1fr", gap: 8, padding: "6px 0", borderTop: first ? undefined : `1px solid ${LINE}`, font: `500 12px/1.35 ${SANS}` }}>
    <span style={{ color: DIM, font: `400 11px/1.4 ${MONO}` }}>{k}</span>
    <b style={{ fontWeight: 500 }}>{tone ? <span style={{ color: tone === "gone" ? OK : WARN, fontSize: 9, verticalAlign: 1 }}>■ </span> : null}{v}</b>
  </div>
);
/* the last eight hours, a demo line drawn as b.js renderChart draws it */
const CHART = [0.44, 0.47, 0.46, 0.5, 0.49, 0.53, 0.52, 0.5, 0.55, 0.58, 0.56, 0.6, 0.59, 0.63, 0.61, 0.64, 0.68, 0.66, 0.7, 0.69, 0.73, 0.76, 0.74, 0.79, 0.83, 0.81, 0.86];
const Chart: React.FC<{ draw: number }> = ({ draw }) => {
  const w = PW - 20, h = 104, pad = 8, n = Math.max(2, Math.round(CHART.length * draw));
  const pts = CHART.slice(0, n).map((v, i) => [pad + (i / (CHART.length - 1)) * (w - pad * 2 - 46), pad + (1 - v) * (h - pad * 2)]);
  const line = pts.map(([x, y], i) => (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1)).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} style={{ display: "block", background: "#fff", border: `2px solid ${INK}`, boxSizing: "border-box",
      backgroundImage: "linear-gradient(#ececea 1px, transparent 1px)", backgroundSize: "100% 25%" }}>
      <path d={line + ` L${last[0]} ${h} L${pts[0][0]} ${h}Z`} fill="rgba(31,157,71,.12)" />
      <path d={line} fill="none" stroke={INK} strokeWidth={2} />
      <rect x={w - pad - 44} y={last[1] - 8} width={44} height={16} fill={INK} />
      <text x={w - pad - 22} y={last[1] + 3.5} fill="#fff" fontFamily={MONO} fontWeight={700} fontSize={10} textAnchor="middle">4.8e-5</text>
    </svg>
  );
};
export const BPage: React.FC<{ f: number; scroll: number; s: PageState; chart?: number }> = ({ f, scroll, s, chart = 1 }) => {
  const tp = s.taps || {};
  const chipOn = s.amount === "0.1";
  return (
    <div style={{ position: "absolute", left: PX, top: PY, width: PW * PS, height: PH * PS, overflow: "hidden", border: `3px solid ${INK}`, boxShadow: `10px 10px 0 ${INK}`, background: PAPER }}>
      <div style={{ width: PW, transform: `scale(${PS})`, transformOrigin: "0 0", fontFamily: SANS, color: INK }}>
        {/* the bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: 44, padding: "0 10px", background: INK, position: "relative", zIndex: 2 }}>
          <span style={{ color: "#fff", font: `700 18px/1 ${SANS}`, opacity: 0.85 }}>‹</span><Hash size={24} />
          <span style={{ font: `400 19px/1 ${HEAD}`, color: "#fff" }}>tweetpad</span>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, padding: "5px 10px", background: YEL, font: `700 11px/1 ${MONO}`, letterSpacing: ".04em" }}>
            <span style={{ width: 7, height: 7, background: INK, opacity: Math.floor(f / 18) % 2 ? 0.2 : 1 }} />${CO.ticker}</span>
        </div>
        <div style={{ transform: `translateY(${-scroll}px)`, display: "flex", flexDirection: "column", gap: 8, padding: 10 }}>
          {/* the coin */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Pic k="RING" size={46} shadow={3} />
            <div style={{ flex: 1 }}>
              <b style={{ display: "block", font: `400 23px/1.05 ${HEAD}` }}>{CO.name}</b>
              <span style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}><span style={{ padding: "2px 5px", color: "#fff", background: INK, font: `700 9px/1 ${MONO}` }}>BORDRLESS</span>
                <span style={{ font: `400 11px/1 ${MONO}`, color: DIM }}>{CO.addr} ⧉</span></span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}><b style={{ font: `700 19px/1.1 ${MONO}` }}>{CO.cap}</b><span style={{ font: `700 11px/1.3 ${MONO}`, color: OK }}>{CO.change}</span></div>
          </div>
          <Chart draw={chart} />
          {/* the buy and sell box */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, background: CARD, border: `2px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex" }}>
                <span style={pbtn({ padding: "7px 18px", boxShadow: "none", color: "#fff", background: OK })}>Buy</span>
                <span style={pbtn({ padding: "7px 18px", boxShadow: "none", marginLeft: -2 })}>Sell</span>
              </div>
              <span style={pbtn({ padding: "5px 8px", font: `700 10px/1 ${MONO}`, boxShadow: `2px 2px 0 ${INK}` })}>Slippage 5%</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center", padding: "9px 10px", background: "#fff", border: `2px solid ${INK}`, font: `700 15px/1.2 ${MONO}`, color: s.amount ? INK : "#aaa" }}>
                {s.amount || "0"}<span style={{ position: "absolute", right: 9, font: `700 11px/1 ${MONO}`, color: DIM }}>SOL</span></div>
              <div style={{ display: "flex" }}>
                {["0.05", "0.1", "0.5", "Max"].map((v, i) => (
                  <span key={v} style={pbtn({ padding: "6px 8px", marginLeft: i ? -2 : 0, boxShadow: "none", font: `700 11px/1 ${MONO}`, color: v === "0.1" && chipOn ? "#fff" : v === "Max" && !s.wallet ? "#aaa" : INK,
                    background: v === "0.1" && chipOn ? INK : "#fff" })}>{v}{v === "0.1" && tp.chip01 !== undefined ? <Tap f={f} at={tp.chip01} /> : null}</span>
                ))}
              </div>
            </div>
            <div style={{ minHeight: 16, font: `500 12px/1.3 ${SANS}`, color: DIM }}>
              {s.quoting ? "Quoting…" : s.quote ? <span style={{ color: INK }}>≈ <b style={{ fontFamily: MONO }}>{CO.quote} ${CO.ticker}</b><span style={{ color: DIM }}> · min {CO.min}</span></span>
                : "1% to its creator, holder rewards, a burn, Bordrless's 0.3% LP fee · tweetpad takes nothing"}
            </div>
            <span style={pbtn({ width: "100%", boxSizing: "border-box", padding: "11px 12px", font: `700 14px/1 ${SANS}`, color: "#fff", background: BLUE, opacity: s.busy ? 0.6 : 1 })}>
              {s.busy ? "Working…" : s.wallet ? `Buy $${CO.ticker}` : "Connect wallet to trade"}{tp.go !== undefined ? <Tap f={f} at={tp.go} /> : null}</span>
            {s.wallet ? <div style={{ display: "flex", justifyContent: "space-between", font: `400 11px/1.2 ${MONO}`, color: DIM }}>
              <span>Balance <b style={{ color: INK }}>{CO.balance} SOL</b></span><span style={{ textDecoration: "underline" }}>{CO.addr} ×</span></div> : null}
            {s.status ? <div style={{ padding: "7px 8px", font: `500 12px/1.2 ${SANS}`, background: "#fff", border: `2px ${s.status.tone === "warn" ? "dashed" : "solid"} ${s.status.tone === "ok" ? OK : INK}`,
              color: s.status.tone === "ok" ? OK : INK }}>{s.status.text}{s.status.tx ? <b> Tx ↗</b> : null}</div> : null}
          </div>
          {/* yours to claim */}
          {s.wallet ? <PCard fig="$" title="Yours to claim">
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0" }}>
              <span style={{ flex: 1, color: DIM, font: `400 11px/1 ${MONO}` }}>Holder rewards</span><b style={{ font: `700 13px/1 ${MONO}` }}>0.0021 SOL</b>
              <span style={pbtn({ padding: "6px 12px", color: "#fff", background: BLUE, boxShadow: `2px 2px 0 ${INK}` })}>Claim{tp.claim !== undefined ? <Tap f={f} at={tp.claim} /> : null}</span>
            </div>
          </PCard> : null}
          <PCard fig="A" title="Rules on every trade">
            <KV first k="Creator fee" v="1% of each trade, in SOL" />
            <KV k="Holder rewards" v="0.5% of buys · 0.5% of sells" />
            <KV k="Burn" v="0.5% of buys · 0.5% of sells" />
            <KV k="Pool fee" v="0.3% (Bordrless's) · all in 2.6% a buy, 2.6% a sell" />
            <KV k="Paid so far" v="0.42 SOL to its creator · 0.21 SOL to holders · 1.2M burned" />
          </PCard>
          <PCard fig="B" title="On its bonding curve">
            <div style={{ position: "relative", height: 18, margin: "6px 0", border: `2px solid ${INK}`, background: "repeating-linear-gradient(45deg, #d4d4cf 0 2px, #e9e9e5 2px 4px)" }}>
              <i style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${CO.curve * 100}%`, background: INK }} />
              <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", mixBlendMode: "difference", font: `700 10px/1 ${MONO}` }}>{CO.raised} / {CO.grad} SOL · {Math.round(CO.curve * 100)}.0%</span>
            </div>
            <p style={{ margin: "4px 0", color: SOFT, font: `500 12px/1.4 ${SANS}` }}>At {CO.grad} SOL raised it graduates into the same pool: nothing to migrate, the rules keep running.</p>
          </PCard>
          <PCard fig="C" title="Who can change it">
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "6px 0 2px", padding: 8, border: `2px solid ${WARN}` }}>
              <span style={{ flex: "none", padding: "3px 6px", color: "#fff", background: WARN, font: `700 10px/1 ${MONO}`, whiteSpace: "nowrap" }}>MEDIUM RISK</span>
              <span style={{ font: `500 12px/1.35 ${SANS}` }}>Bordrless's own code, not audited here. Bordrless can change it.</span>
            </div>
            {["Mint", "Freeze", "Hook", "Metadata"].map((k) => <KV key={k} k={k} v="Nobody" tone="gone" />)}
            <KV k="Hook program" v={<span><u style={{ fontFamily: MONO, fontSize: 11 }}>14RJ…maEH</u> · Bordrless's rules kit</span>} />
          </PCard>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================================
 * 3. Trade: the card opens into the page; 0.1 SOL, connect, approve, bought
 * ========================================================================================= */
const TR = { chip: 30, connect: 64, connectOk: 94, buy: 120, approveOk: 166, done: 196 } as const;
const Trade: React.FC = () => {
  const f = useCurrentFrame(); const d = R.trade.dur;
  const open = ramp(f, 0, 16);
  const s: PageState = {
    amount: inWin(f, TR.chip + 2, TR.done) ? "0.1" : "", quoting: inWin(f, TR.chip + 2, TR.chip + 16), quote: inWin(f, TR.chip + 16, TR.done),
    wallet: f >= TR.connectOk + 4, busy: inWin(f, TR.buy + 2, TR.done),
    status: f < TR.buy + 2 ? null : f < TR.buy + 12 ? { tone: "warn", text: "Getting the price…" } : f < TR.approveOk + 4 ? { tone: "warn", text: "Approve in Phantom…" }
      : f < TR.done ? { tone: "warn", text: "Confirming…" } : { tone: "ok", text: `Bought ≈ ${CO.quote} $${CO.ticker}`, tx: true },
    taps: { chip01: TR.chip, go: f < TR.connectOk ? TR.connect : TR.buy },
  };
  const conn = inWin(f, TR.connect + 4, TR.connectOk + 8) ? ramp(f, TR.connect + 4, TR.connect + 14) * (1 - ramp(f, TR.connectOk + 2, TR.connectOk + 8)) : 0;
  const appr = inWin(f, TR.buy + 12, TR.approveOk + 8) ? ramp(f, TR.buy + 12, TR.buy + 22) * (1 - ramp(f, TR.approveOk + 2, TR.approveOk + 8)) : 0;
  const okAt = conn > 0 ? TR.connectOk : TR.approveOk;
  const cur = cursorAt(f, [[okAt - 22, WALLET_OK.x + 120, WALLET_OK.y + 160], [okAt - 2, WALLET_OK.x, WALLET_OK.y]]);
  return (
    <AbsoluteFill>
      <BCap tag={C.trade.tag} head={C.trade.head} head2={C.trade.head2} t={capFade(f, d)} />
      <div style={{ opacity: open, transform: `scale(${0.92 + 0.08 * open})`, transformOrigin: "540px 600px" }}>
        <BPage f={f} scroll={0} s={s} chart={ramp(f, 4, 30)} />
      </div>
      {conn > 0 ? <WalletWindow t={conn} kind="connect" pressed={inWin(f, TR.connectOk, TR.connectOk + 5)} /> : null}
      {appr > 0 ? <WalletWindow t={appr} kind="approve" pressed={inWin(f, TR.approveOk, TR.approveOk + 5)} /> : null}
      {conn > 0.5 || appr > 0.5 ? <Cursor x={cur.x} y={cur.y} down={inWin(f, okAt, okAt + 5)} /> : null}
      <BFine text={C.fine.trade} t={capFade(f, d)} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * 4. On chain: the page scrolls through what is yours to claim, its rules, its curve, who can change it
 * ========================================================================================= */
const BOUGHT: PageState = { amount: "", wallet: true, status: { tone: "ok", text: `Bought ≈ ${CO.quote} $${CO.ticker}`, tx: true } };
const Chain: React.FC = () => {
  const f = useCurrentFrame(); const d = R.chain.dur;
  const scroll = lerp(0, 330, ramp(f, 8, 46, settle)) + lerp(0, 300, ramp(f, 72, 108, settle));
  return (
    <AbsoluteFill>
      <BCap tag={C.chain.tag} head={C.chain.head} head2={C.chain.head2} t={capFade(f, d)} />
      <BPage f={f} scroll={scroll} s={{ ...BOUGHT, taps: { claim: 54 } }} />
      <BFine text={C.fine.chain} t={capFade(f, d)} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * 5. Every token by market cap (the app's Bordrless list), then the launch form's Bordrless setup
 * ========================================================================================= */
const LIST: { k: keyof typeof PICS; name: string; age: string; holders: number; cap: string; ch: string; up: boolean }[] = [
  { k: "MONO", name: "Monolith", age: "4d", holders: 188, cap: "$131.2K", ch: "+41.0%", up: true },
  { k: "RING", name: "Ring", age: "2d", holders: 96, cap: "$48.2K", ch: "+12.4%", up: true },
  { k: "CHSL", name: "Chisel", age: "6d", holders: 71, cap: "$22.9K", ch: "−3.1%", up: false },
  { k: "PLTH", name: "Plinth", age: "1d", holders: 40, cap: "$9.6K", ch: "+5.8%", up: true },
  { k: "DUST", name: "Dust", age: "3h", holders: 12, cap: "$5.1K", ch: "+0.9%", up: true },
];
const SW = 560, SS = 1.45;
const List: React.FC = () => {
  const f = useCurrentFrame(); const d = R.list.dur;
  const half = 75;
  const a = 1 - ramp(f, half - 8, half, settle), b = ramp(f, half, half + 10);
  const bordr = f >= 88, preset = f >= 112 ? "Burn" : "Plain";
  const chip = (label: string, on: boolean, tap?: number, ml = 0) => (
    <span style={{ position: "relative", padding: "5px 9px", marginLeft: ml, font: `600 11px/1 ${SANS}`, color: on ? "#fff" : INK, background: on ? INK : "#fff", border: `1px solid ${INK}` }}>
      {label}{tap !== undefined ? <Tap f={f} at={tap} /> : null}</span>
  );
  return (
    <AbsoluteFill>
      {f < half ? <BCap tag={C.list.tag} head={C.list.head} head2={C.list.head2} t={ramp(f, 0, 12) * a} />
        : <BCap tag={C.launch.tag} head={C.launch.head} head2={C.launch.head2} t={b * (1 - ramp(f, d - 10, d, settle))} />}
      {/* the list */}
      {a > 0 ? <div style={{ position: "absolute", left: (1080 - SW * SS) / 2, top: 292, width: SW, transform: `scale(${SS})`, transformOrigin: "0 0", opacity: a, fontFamily: SANS }}>
        <div style={{ background: "#fff", border: `2px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}` }}>
          <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", borderBottom: `2px solid ${INK}` }}>
            <b style={{ font: `400 20px/1 ${HEAD}` }}>Every Bordrless token</b>
            <span style={{ marginLeft: "auto", display: "flex" }}>{chip("New", false)}{chip("Hot", false, undefined, -1)}{chip("Mcap", true, undefined, -1)}</span>
          </div>
          {LIST.map((c, i) => {
            const p = ramp(f, 6 + i * 6, 16 + i * 6);
            return (
              <div key={c.k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderTop: i ? `1px solid ${LINE}` : undefined, opacity: p, transform: `translateY(${(1 - p) * 10}px)`,
                background: c.k === "RING" ? "rgba(242,194,48,.18)" : undefined }}>
                <Pic k={c.k} size={36} />
                <div style={{ flex: 1 }}><b style={{ display: "block", font: `600 14px/1.2 ${SANS}` }}>{c.name}</b>
                  <span style={{ font: `400 11px/1.3 ${MONO}`, color: DIM }}>${c.k} · {c.age} · {c.holders} holders</span></div>
                <span style={{ font: `700 11px/1 ${MONO}`, color: DIM }}>#{i + 1}</span>
                <div style={{ width: 84, textAlign: "right" }}><b style={{ display: "block", font: `700 14px/1.2 ${MONO}` }}>{c.cap}</b>
                  <span style={{ font: `700 11px/1.2 ${MONO}`, color: c.up ? OK : BAD }}>{c.ch}</span></div>
              </div>
            );
          })}
        </div>
      </div> : null}
      {/* the launch form's Bordrless setup */}
      {b > 0 ? <div style={{ position: "absolute", left: (1080 - SW * SS) / 2, top: 292, width: SW, transform: `scale(${SS})`, transformOrigin: "0 0", opacity: b, fontFamily: SANS }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, padding: 14, background: "#fff", border: `2px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <b style={{ font: `400 22px/1 ${HEAD}` }}>Launch</b>
            <span style={{ marginLeft: "auto", font: `400 11px/1 ${MONO}`, color: DIM }}>Launchpad</span>
            <span style={{ display: "flex" }}>{chip("pump.fun", false)}{chip("Stonkfun", false, undefined, -1)}{chip("Bordrless", bordr, 86, -1)}</span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Pic k="RING" size={58} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ padding: "7px 9px", border: `1px solid ${INK}`, font: `500 13px/1 ${SANS}` }}>{CO.name}</span>
              <span style={{ padding: "7px 9px", border: `1px solid ${INK}`, font: `500 13px/1 ${SANS}` }}>{CO.ticker}</span>
            </div>
          </div>
          <div style={{ opacity: bordr ? 1 : 0.25, display: "flex", flexDirection: "column", gap: 7, padding: 10, background: CARD, border: `1px solid ${LINE}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", font: `700 11px/1 ${MONO}` }}><span>Creator fee</span><span style={{ color: DIM, fontWeight: 400 }}>of every trade, to you in SOL</span></div>
            <span style={{ display: "flex" }}>{chip("0.5%", false)}{chip("1%", true, undefined, -1)}{chip("2%", false, undefined, -1)}</span>
            <div style={{ display: "flex", justifyContent: "space-between", font: `700 11px/1 ${MONO}` }}><span>Token rules</span><span style={{ color: DIM, fontWeight: 400 }}>run by the token itself, on every trade</span></div>
            <span style={{ display: "flex" }}>{["Plain", "Diamond hands", "Burn", "Paid to hold"].map((p, i) => <React.Fragment key={p}>{chip(p, preset === p, p === "Burn" ? 110 : undefined, i ? -1 : 0)}</React.Fragment>)}</span>
            <span style={{ font: `500 12px/1.4 ${SANS}`, color: SOFT }}>Each trade: <b style={{ color: INK }}>1% to you</b> in SOL, claimed on the coin page{preset === "Burn"
              ? <> · the token itself runs <b style={{ color: INK }}>holder rewards 0.5%, burn 0.5%</b>.</> : " · no token rules."}</span>
          </div>
          <span style={{ padding: "11px", textAlign: "center", color: "#fff", background: BLUE, border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, font: `700 14px/1 ${SANS}` }}>
            {bordr ? `Launch $${CO.ticker} on Bordrless` : `Launch $${CO.ticker}`}</span>
          <span style={{ textAlign: "center", font: `400 10px/1.3 ${MONO}`, color: DIM }}>{bordr ? "Launches on Bordrless, paired with SOL · 1% fee to you · about 0.035 SOL" : "Launches on pump.fun · 0 pad fee · network fees apply"}</span>
        </div>
      </div> : null}
      <BFine text={f < half ? C.fine.list : C.fine.launch} t={f < half ? ramp(f, 0, 12) * a : b * (1 - ramp(f, d - 10, d, settle))} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * 6. How to: any Bordrless token, tradeable in a post, in four steps
 * ========================================================================================= */
const STEP_AT = [14, 46, 78, 110];
const HowTo: React.FC = () => {
  const f = useCurrentFrame(); const d = R.howto.dur;
  const t = capFade(f, d);
  const ca = typed("<token CA>", f, STEP_AT[1] + 8, 0.7);
  return (
    <AbsoluteFill style={{ opacity: t }}>
      <BCap fig={C.howto.fig} tag={C.howto.tag} head={C.howto.head} head2={C.howto.head2} t={1} />
      <div style={{ position: "absolute", left: 70, right: 70, top: 300, display: "flex", flexDirection: "column", gap: 18 }}>
        {C.howto.steps.map(([title, sub], i) => {
          const p = ramp(f, STEP_AT[i], STEP_AT[i] + 12);
          const lit = f >= STEP_AT[i];
          return (
            <div key={title} style={{ display: "flex", alignItems: "center", gap: 22, padding: "16px 20px", background: CARD, border: `3px solid ${INK}`, boxShadow: `${lit ? 7 : 0}px ${lit ? 7 : 0}px 0 ${i === 1 ? TP : INK}`,
              opacity: 0.25 + 0.75 * p, transform: `translateX(${(1 - p) * 24}px)` }}>
              <span style={{ width: 64, height: 64, flex: "none", display: "grid", placeItems: "center", background: lit ? INK : "transparent", color: lit ? "#fff" : INK, border: `3px solid ${INK}`, font: `700 28px/1 ${MONO}` }}>{String(i + 1).padStart(2, "0")}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                <b style={{ font: `400 36px/1 ${HEAD}`, color: INK }}>{title}</b>
                {i === 1 ? (
                  <span style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", padding: "8px 12px", background: "#fff", border: `2px solid ${INK}`, font: `700 26px/1 ${MONO}` }}>
                    tweetpad.io/b/<span style={{ marginLeft: 2, padding: "2px 4px", background: YEL }}>{ca || " "}</span></span>
                ) : <span style={{ font: `400 20px/1.2 ${MONO}`, color: DIM }}>{sub}</span>}
              </div>
            </div>
          );
        })}
        <div style={{ textAlign: "center", font: `700 20px/1.3 ${MONO}`, color: SOFT, opacity: ramp(f, STEP_AT[3] + 20, STEP_AT[3] + 32) }}>{C.howto.or}</div>
      </div>
      <BFine text={C.fine.howto} />
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * 7. End: the monument, tweetpad on Bordrless, the link
 * ========================================================================================= */
const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const t = ramp(f, 0, 14);
  const p = Math.min(1, pop(f, 10));
  return (
    <AbsoluteFill style={{ opacity: t }}>
      <AbsoluteFill style={{ background: "#0d0d0d", overflow: "hidden" }}>
        <Img src={staticFile(MON)} style={{ position: "absolute", left: "50%", top: "50%", height: 1080 * (1.02 + f * 0.0006), transform: "translate(-50%, -50%)", imageRendering: "pixelated", opacity: 0.9 }} />
        <AbsoluteFill style={{ background: "linear-gradient(rgba(13,13,13,0) 35%, rgba(13,13,13,.75) 70%, rgba(13,13,13,.92))" }} />
      </AbsoluteFill>
      <Plate style={{ left: 110, right: 110, top: 520, padding: "30px 34px 28px", transform: `translateY(${(1 - p) * 40}px)`, boxShadow: `12px 12px 0 ${TP}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Hash size={74} />
          <span style={{ font: `400 64px/1 ${HEAD}`, color: INK }}>tweetpad</span>
          <span style={{ marginLeft: "auto" }}><Chip size={18} ink>ON BORDRLESS</Chip></span>
        </div>
        <div style={{ marginTop: 20, font: `400 60px/1.02 ${HEAD}`, color: INK }}>{C.end.tagline}</div>
        <div style={{ marginTop: 8, display: "inline-block", padding: "6px 14px 8px", font: `400 46px/1 ${HEAD}`, color: "#fff", background: INK }}>{C.end.tagline2}</div>
        <div style={{ marginTop: 22, display: "inline-flex", alignItems: "center", padding: "10px 14px", border: `3px solid ${INK}`, background: "#fff", font: `700 30px/1 ${MONO}` }}>
          tweetpad.io/b/<span style={{ marginLeft: 2, padding: "2px 5px", background: YEL }}>&lt;token CA&gt;</span></div>
      </Plate>
      <div style={{ position: "absolute", left: 50, right: 50, bottom: 26, textAlign: "center", font: `400 15px/1.45 ${MONO}`, color: "#cfcfca", opacity: ramp(f, 30, 44) }}>
        {C.end.fine.map((l) => <div key={l}>{l}</div>)}
      </div>
    </AbsoluteFill>
  );
};

/* =========================================================================================
 * The film
 * ========================================================================================= */
export const TweetpadBordrless: React.FC = () => {
  loadFonts();
  const f = useCurrentFrame();
  // the paper carries a faint dithered picture behind every app scene, the workshop early, the monument late
  const picT = f < R.share.from ? 0 : f < R.howto.from ? 0.06 : 0.1;
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <Paper pic={f < R.chain.from ? WS : MON} picT={picT} zoom={1.05} />
      <Sequence from={R.intro.from} durationInFrames={R.intro.dur}><Intro /></Sequence>
      <Sequence from={R.why.from} durationInFrames={R.why.dur}><Why /></Sequence>
      <Sequence from={R.share.from} durationInFrames={R.share.dur}><Share /></Sequence>
      <Sequence from={R.trade.from} durationInFrames={R.trade.dur}><Trade /></Sequence>
      <Sequence from={R.chain.from} durationInFrames={R.chain.dur}><Chain /></Sequence>
      <Sequence from={R.list.from} durationInFrames={R.list.dur}><List /></Sequence>
      <Sequence from={R.howto.from} durationInFrames={R.howto.dur}><HowTo /></Sequence>
      <Sequence from={R.end.from} durationInFrames={R.end.dur}><EndCard /></Sequence>
    </AbsoluteFill>
  );
};
