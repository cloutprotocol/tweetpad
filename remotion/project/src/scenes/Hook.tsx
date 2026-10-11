/** Scene 1, hook: a post in a timeline carrying the tweetpad player card (preview.png = the real X card image). */
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { BRAND, FONTS } from "../brand/tokens";
import { Caption, Cursor, cursorAt } from "../components/Film";
import { ramp, settle } from "../lib/motion";
import { COPY } from "../timeline";
import { CARD } from "./layout";

const Skeleton: React.FC<{ y: number; lines: number }> = ({ y, lines }) => (
  <div style={{ position: "absolute", left: 220, width: 640, top: y, padding: 22, background: "#fff", border: `1px solid ${BRAND.border}`, borderRadius: 18, display: "flex", gap: 16 }}>
    <div style={{ width: 56, height: 56, borderRadius: "50%", background: BRAND.border, flex: "none" }} />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, paddingTop: 6 }}>
      <div style={{ width: 200, height: 14, borderRadius: 7, background: "#d5dee5" }} />
      {Array.from({ length: lines }, (_, i) => <div key={i} style={{ width: `${92 - i * 18}%`, height: 12, borderRadius: 6, background: BRAND.border }} />)}
    </div>
  </div>
);

export const Hook: React.FC<{ head?: string; head2?: string; tweet?: string; tag?: string }> = ({ head = COPY.hook.head, head2 = COPY.hook.head2, tweet = COPY.hook.tweet, tag }) => {
  const f = useCurrentFrame();
  const scroll = (1 - ramp(f, 0, 55)) * 520; // the timeline scrolls up and lands on the post
  const play = ramp(f, 60, 70);
  const c = cursorAt(f, [[0, 900, 1100], [55, 900, 1000], [88, CARD.x + CARD.w / 2 + 8, CARD.y + CARD.h / 2 + 10]]);
  const down = f >= 92 && f < 100;
  const capT = ramp(f, 8, 26);
  const out = 1 - ramp(f, 108, 120, settle);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${scroll}px)` }}>
        <div style={{ opacity: out }}><Skeleton y={-60} lines={1} /><Skeleton y={970} lines={2} /></div>
        {/* the post */}
        <div style={{ opacity: out, position: "absolute", left: 220, width: 640, top: 300, height: 640, padding: 22, background: "#fff", border: `1px solid ${BRAND.border}`, borderRadius: 18, boxShadow: "0 10px 40px rgba(20,23,26,.08)" }}>
          <div style={{ display: "flex", gap: 16 }}>
            <Img src={staticFile("brand/agent-inu.jpg")} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
            <div style={{ fontFamily: FONTS.ui }}>
              <div style={{ font: `700 22px/1.2 ${FONTS.ui}`, color: BRAND.ink }}>Agent Inu <span style={{ fontWeight: 400, color: BRAND.darkGray }}>@tweetpad · 2m</span></div>
              <div style={{ marginTop: 4, font: `400 22px/1.3 ${FONTS.ui}`, color: BRAND.ink }}>{tweet} <span style={{ color: BRAND.primary }}>{COPY.hook.link}</span></div>
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: 16, overflow: "hidden", border: `1px solid ${BRAND.border}` }}>
          <Img src={staticFile("brand/card-preview.png")} style={{ width: "100%", height: "100%" }} />
          {/* the player card's play button (X shows one on player cards) */}
          <div style={{ position: "absolute", left: "50%", top: "50%", width: 96, height: 96, marginLeft: -48, marginTop: -48, borderRadius: "50%", background: "rgba(20,23,26,.72)",
            display: "grid", placeItems: "center", opacity: play, transform: `scale(${0.7 + 0.3 * play + (down ? -0.06 : 0)})`, border: "4px solid #fff" }}>
            <svg width={34} height={38} viewBox="0 0 34 38"><path d="M4 2l28 17L4 36z" fill="#fff" /></svg>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 250, background: `linear-gradient(${BRAND.bg} 75%, rgba(245,248,250,0))` }} />
      <Caption tag={tag} head={head} head2={head2} t={capT * out} y={tag ? 30 : 54} />
      <Cursor x={c.x} y={c.y} down={down} t={ramp(f, 40, 50) * out} />
    </AbsoluteFill>
  );
};
