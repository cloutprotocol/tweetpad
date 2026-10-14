/**
 * The Bordrless poster: "Launch & trade Bordrless tokens (inside a tweet)". 1080x1080, a still (TweetpadBordrlessPoster) and film
 * 15's end card (animated in by `f`). Film 14's end card, refined: the monument full bleed and darker at the foot, the sphere
 * read like Bordrless's own diagram (three callouts: the token program, the hook, the DEX), the headline stacked in Anton with
 * "(inside a tweet)" as a tilted sticker, a small post on the panel's edge playing a coin's card, and a ticker of the two links.
 * Bordrless is named in words and its sphere shown as the art; the small type says it doesn't run or endorse tweetpad.
 */
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { pop, ramp } from "../lib/motion";
import { BLUE, Hash, HEAD, INK, MON, MONO, PAPER, Pic, YEL } from "./Bordrless";

const SANS = '"Space Grotesk", "Inter", sans-serif';
const TPB = "#1DA1F2";

/** a callout: a square node on the art, a leader line, a numbered label (Bordrless's diagram, drawn in its manner) */
const Callout: React.FC<{ x: number; y: number; to: [number, number]; n: string; kicker: string; title: string; t: number; left?: boolean }> = ({ x, y, to, n, kicker, title, t, left }) => {
  const [lx, ly] = to;
  const knee = left ? lx + 40 : lx - 40;
  return (
    <>
      <svg width={1080} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: t }}>
        <polyline points={`${x},${y} ${knee},${y} ${knee + (left ? -1 : 1) * 30},${ly} ${lx},${ly}`} fill="none" stroke={INK} strokeWidth={3}
          strokeDasharray="1000" strokeDashoffset={1000 * (1 - t)} />
        <rect x={x - 9} y={y - 9} width={18} height={18} fill="#fff" stroke={INK} strokeWidth={3} />
        <rect x={x - 3} y={y - 3} width={6} height={6} fill={INK} />
      </svg>
      <div style={{ position: "absolute", left: left ? undefined : lx + 10, right: left ? 1080 - lx + 10 : undefined, top: ly - 26, opacity: t,
        display: "flex", flexDirection: "column", alignItems: left ? "flex-end" : "flex-start", gap: 6, whiteSpace: "nowrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 28, height: 28, display: "grid", placeItems: "center", background: "#cfcfca", font: `700 15px/1 ${MONO}`, color: INK }}>{n}</span>
          <span style={{ font: `400 15px/1 ${MONO}`, color: INK, background: "rgba(227,227,223,.85)", padding: "3px 5px" }}>{kicker}</span>
        </span>
        <span style={{ font: `400 30px/1 ${HEAD}`, color: INK, background: "rgba(227,227,223,.9)", padding: "4px 7px 6px" }}>{title}</span>
      </div>
    </>
  );
};

/** the small post on the panel's edge: a coin's card, playing in it */
const MiniPost: React.FC<{ t: number; f: number }> = ({ t, f }) => (
  <div style={{ position: "absolute", right: 40, top: 600, width: 290, padding: 14, background: "#fff", border: `3px solid ${INK}`, boxShadow: `9px 9px 0 ${INK}`,
    transform: `rotate(${3 + (1 - t) * 8}deg) translateY(${(1 - t) * 60}px)`, opacity: t, fontFamily: SANS }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 34, height: 34, display: "grid", placeItems: "center", border: `2px solid ${INK}`, background: "#fff" }}><Hash size={26} /></span>
      <span style={{ display: "flex", flexDirection: "column" }}><b style={{ font: `700 15px/1.1 ${SANS}` }}>tweetpad</b><span style={{ font: `400 11px/1.2 ${MONO}`, color: "#6b6b66" }}>@tweetpad_io · now</span></span>
    </div>
    <div style={{ marginTop: 8, font: `500 15px/1.3 ${SANS}`, color: INK }}>$RING trades right inside this post</div>
    <div style={{ position: "relative", marginTop: 8, border: `2px solid ${INK}`, background: PAPER, height: 150, overflow: "hidden" }}>
      <div style={{ height: 22, background: INK, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 7px" }}>
        <span style={{ font: `400 12px/1 ${HEAD}`, color: "#fff" }}>tweetpad</span>
        <span style={{ padding: "2px 4px", background: YEL, font: `700 7px/1 ${MONO}` }}>TRADE IN THIS POST</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 9px" }}>
        <Pic k="RING" size={44} border={2} shadow={3} />
        <span style={{ font: `400 34px/1 ${HEAD}` }}>$RING</span>
      </div>
      {/* X's play button, breathing */}
      <div style={{ position: "absolute", left: "50%", top: 88, width: 48, height: 48, marginLeft: -24, borderRadius: "50%", background: TPB, display: "grid", placeItems: "center",
        boxShadow: `0 0 0 ${4 + 3 * Math.abs(Math.sin(f / 14))}px rgba(255,255,255,.85)` }}>
        <svg width={18} height={20} viewBox="0 0 7 8"><path d="M0 0l7 4-7 4z" fill="#fff" /></svg>
      </div>
    </div>
    <div style={{ marginTop: 6, font: `400 11px/1 ${MONO}`, color: "#6b6b66" }}>tweetpad.io/b/RiNG…xxxx</div>
  </div>
);

/** the ticker along the foot: the two links and what they do, scrolling */
const TICK = ["LAUNCH", "tweetpad.io/borderless", "TRADE", "tweetpad.io/b/<token CA>", "ON BORDRLESS'S DEX", "INSIDE A TWEET"];
const Ticker: React.FC<{ f: number; t: number }> = ({ f, t }) => {
  const row = [...TICK, ...TICK, ...TICK];
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 64, height: 56, background: YEL, borderTop: `4px solid ${INK}`, borderBottom: `4px solid ${INK}`,
      overflow: "hidden", opacity: t, transform: `rotate(-1.2deg) scaleX(1.03)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 26, height: "100%", whiteSpace: "nowrap", transform: `translateX(${-((f * 2.2) % 1240)}px)`, paddingLeft: 20 }}>
        {row.map((w, i) => (
          <React.Fragment key={i}>
            <span style={{ font: w.includes("/") ? `700 24px/1 ${MONO}` : `400 30px/1 ${HEAD}`, color: INK, letterSpacing: w.includes("/") ? 0 : ".02em" }}>{w}</span>
            <span style={{ width: 12, height: 12, flex: "none", background: INK }} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

/** the poster. `f` is the frame its entrance counts from (a still renders it settled) */
export const BordrlessPosterArt: React.FC<{ f: number; still?: boolean }> = ({ f, still }) => {
  const at = (a: number, b: number) => (still ? 1 : ramp(f, a, b));
  const sticker = still ? 1 : Math.min(1.1, pop(f, 46));
  const zoom = 1.04 + (still ? 0 : f * 0.0005);
  return (
    <AbsoluteFill style={{ background: "#0d0d0d", overflow: "hidden" }}>
      {/* the monument, full bleed, its foot falling to ink */}
      <Img src={staticFile(MON)} style={{ position: "absolute", left: "50%", top: "47%", height: 1080 * zoom, transform: "translate(-50%, -50%)", imageRendering: "pixelated" }} />
      <AbsoluteFill style={{ background: "linear-gradient(rgba(13,13,13,0) 40%, rgba(13,13,13,.55) 58%, rgba(13,13,13,.96) 78%)" }} />
      <AbsoluteFill style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)", backgroundSize: "54px 54px" }} />
      {/* the corner marks and the masthead */}
      {[[24, 24, 0, 0], [1056, 24, 1, 0], [24, 1056, 0, 1], [1056, 1056, 1, 1]].map(([x, y, ox, oy]) => (
        <div key={`${x}${y}`} style={{ position: "absolute", left: x - ox * 26, top: y - oy * 26, width: 26, height: 26, borderColor: oy ? "#e3e3df" : INK,
          borderStyle: "solid", borderWidth: `${oy ? 0 : 4}px ${ox ? 4 : 0}px ${oy ? 4 : 0}px ${ox ? 0 : 4}px` }} />
      ))}
      <div style={{ position: "absolute", left: 50, top: 44, display: "flex", alignItems: "center", gap: 12, opacity: at(0, 14) }}>
        <Hash size={52} />
        <span style={{ font: `400 46px/1 ${HEAD}`, color: INK, background: "rgba(227,227,223,.92)", padding: "4px 10px 6px" }}>tweetpad</span>
      </div>
      <div style={{ position: "absolute", right: 50, top: 52, display: "flex", gap: 8, opacity: at(4, 18) }}>
        <span style={{ padding: "8px 10px", background: "#cfcfca", font: `700 16px/1 ${MONO}`, color: INK }}>Fig. 3</span>
        <span style={{ padding: "8px 12px", background: INK, font: `700 16px/1 ${MONO}`, color: "#fff", letterSpacing: ".06em" }}>ON BORDRLESS</span>
      </div>
      {/* the sphere, read as Bordrless reads it */}
      <Callout x={600} y={92} to={[790, 168]} n="1" kicker="Upper ring" title="The token program" t={at(14, 34)} />
      <Callout x={690} y={250} to={[790, 300]} n="2" kicker="The band" title="The hook: its rules" t={at(22, 42)} />
      <Callout x={560} y={452} to={[790, 432]} n="3" kicker="Lower ring" title="The Bordrless DEX" t={at(30, 50)} />
      {/* the headline panel */}
      <div style={{ position: "absolute", left: 50, top: 584, padding: "24px 30px 26px", background: "#f4f4f2", border: `4px solid ${INK}`, boxShadow: `14px 14px 0 ${TPB}`,
        transform: `translateY(${(1 - at(8, 30)) * 50}px)`, opacity: at(8, 26) }}>
        <div style={{ font: `400 80px/.95 ${HEAD}`, color: INK, letterSpacing: "-.005em", whiteSpace: "nowrap" }}>Launch &amp; trade</div>
        <div style={{ display: "inline-block", marginTop: 10, padding: "6px 16px 10px", background: INK, color: "#fff", font: `400 80px/.95 ${HEAD}`, whiteSpace: "nowrap" }}>Bordrless tokens</div>
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ display: "inline-flex", alignItems: "center", padding: "9px 12px", border: `3px solid ${INK}`, background: "#fff", font: `700 21px/1 ${MONO}`, color: INK }}>
            tweetpad.io/b/<span style={{ marginLeft: 2, padding: "2px 5px", background: YEL }}>&lt;token CA&gt;</span></span>
        </div>
      </div>
      <MiniPost t={at(34, 56)} f={f} />
      {/* the sticker */}
      <div style={{ position: "absolute", left: 318, top: 520, padding: "10px 16px 12px", background: YEL, border: `4px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}`,
        transform: `rotate(-7deg) scale(${sticker})`, font: `700 30px/1 ${MONO}`, color: INK, whiteSpace: "nowrap" }}>(inside a tweet)</div>
      <Ticker f={f} t={at(40, 54)} />
      <div style={{ position: "absolute", left: 40, right: 40, bottom: 16, textAlign: "center", font: `400 13px/1.3 ${MONO}`, color: "#9a9a95", opacity: at(44, 58) }}>
        Demo coin. Trades run on Bordrless's DEX: its LP fee and each coin's rules apply · tweetpad takes nothing · network fees apply · Bordrless doesn't run or endorse tweetpad.
      </div>
    </AbsoluteFill>
  );
};

export const TweetpadBordrlessPoster: React.FC = () => {
  loadFonts();
  const f = useCurrentFrame();
  return <BordrlessPosterArt f={f + 60} still />;
};
