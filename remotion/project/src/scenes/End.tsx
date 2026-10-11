/** Scene 6: end card. # icon, white wordmark, tagline, tweetpad.io, $TP. Fees in small type. */
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { FONTS } from "../brand/tokens";
import { Fine } from "../components/Film";
import { pop, ramp } from "../lib/motion";
import { COPY, EVM_STATUS } from "../timeline";

/** row: an optional line of content under the tagline (film 6: the four chain logos); cc: a small line under the pills */
export const End: React.FC<{ tagline?: string; tagline2?: string; row?: React.ReactNode; cc?: string; fine?: string; fineSize?: number }> = ({ tagline = COPY.end.tagline, tagline2, row, cc, fine = COPY.end.fine(EVM_STATUS), fineSize }) => {
  const f = useCurrentFrame();
  const icon = pop(f, 4);
  const wm = ramp(f, 14, 30);
  const tl = ramp(f, 26, 42);
  const pill = ramp(f, 36, 52);
  return (
    <AbsoluteFill>
      {/* faint # pattern, as on banner B */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.1, color: "#fff", font: `800 64px/90px ${FONTS.ui}`, letterSpacing: 56, overflow: "hidden", whiteSpace: "pre-wrap", padding: 20,
        transform: `translateY(${-f * 0.3}px)` }}>
        {Array.from({ length: 14 }, (_, i) => (i % 2 ? "  " : "") + "# # # # # # # # #\n").join("")}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 150, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 260, height: 260, transform: `scale(${icon}) rotate(${(1 - icon) * -20}deg)`, filter: "drop-shadow(0 18px 30px rgba(0,40,80,.35))" }} />
        <Img src={staticFile("brand/wordmark-white-1600.png")} style={{ width: 620, marginTop: 34, opacity: wm, transform: `translateY(${(1 - wm) * 20}px)` }} />
        <div style={{ marginTop: 30, font: `700 38px/1.2 ${FONTS.ui}`, color: "#fff", opacity: tl, letterSpacing: "-.01em", textAlign: "center" }}>{tagline}{tagline2 ? <><br />{tagline2}</> : null}</div>
        {row ? <div style={{ marginTop: 26, opacity: ramp(f, 32, 46) }}>{row}</div> : null}
        <div style={{ marginTop: 30, display: "flex", gap: 16, opacity: pill, transform: `translateY(${(1 - pill) * 14}px)` }}>
          <span style={{ padding: "14px 30px", borderRadius: 999, background: "#fff", color: "#1a8bd6", font: `800 34px/1 ${FONTS.ui}` }}>{COPY.end.url}</span>
          <span style={{ padding: "14px 26px", borderRadius: 999, border: "3px solid rgba(255,255,255,.85)", color: "#fff", font: `800 34px/1 ${FONTS.ui}` }}>{COPY.end.ticker}</span>
        </div>
        {cc ? <div style={{ marginTop: 26, font: `600 24px/1.2 ${FONTS.ui}`, color: "rgba(255,255,255,.85)", opacity: ramp(f, 46, 60) }}>{cc}</div> : null}
      </div>
      <Fine text={fine} size={fineSize} color="rgba(255,255,255,.88)" t={ramp(f, 40, 56)} />
    </AbsoluteFill>
  );
};
