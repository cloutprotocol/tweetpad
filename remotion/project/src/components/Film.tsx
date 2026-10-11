/** Film-level pieces: background, captions, fine print, cursor. Sizes are 1080x1080 px. */
import React from "react";
import { BRAND, FONTS } from "../brand/tokens";

export const Ground: React.FC<{ blue?: number }> = ({ blue = 0 }) => (
  <div style={{ position: "absolute", inset: 0, background: BRAND.bg }}>
    <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(${BRAND.border} 1.6px, transparent 1.7px)`, backgroundSize: "28px 28px" }} />
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(70% 55% at 50% 45%, rgba(255,255,255,.9), rgba(255,255,255,0))` }} />
    <div style={{ position: "absolute", inset: 0, opacity: blue, background: `linear-gradient(160deg, ${BRAND.light}, ${BRAND.primary} 60%, #1a8bd6)` }} />
  </div>
);

export const Caption: React.FC<{ head: string; head2?: string; sub?: string; t: number; tag?: string; y?: number }> = ({ head, head2, sub, t, tag, y = 54 }) => (
  <div style={{ position: "absolute", left: 60, right: 60, top: y, textAlign: "center", opacity: t, transform: `translateY(${(1 - t) * 18}px)`, fontFamily: FONTS.ui }}>
    {tag ? (
      <div style={{ display: "inline-block", marginBottom: 10, padding: "6px 14px", borderRadius: 999, background: BRAND.primary, color: "#fff", font: `800 20px/1 ${FONTS.ui}`, letterSpacing: ".08em" }}>{tag}</div>
    ) : null}
    <div style={{ font: `800 52px/1.05 ${FONTS.ui}`, letterSpacing: "-.03em", color: BRAND.ink }}>{head}</div>
    {head2 ? <div style={{ font: `800 52px/1.08 ${FONTS.ui}`, letterSpacing: "-.03em", color: BRAND.primary }}>{head2}</div> : null}
    {sub ? <div style={{ marginTop: 10, font: `500 26px/1.2 ${FONTS.ui}`, color: BRAND.darkGray }}>{sub}</div> : null}
  </div>
);

/** small-type disclaimer line. Keep every fee mention paired with this. */
export const Fine: React.FC<{ text: string; t?: number; color?: string; size?: number }> = ({ text, t = 1, color = BRAND.darkGray, size = 17 }) => (
  <div style={{ position: "absolute", left: 40, right: 40, bottom: 16, textAlign: "center", font: `500 ${size}px/1.25 ${FONTS.ui}`, color, opacity: t }}>{text}</div>
);

/** hand: the pointing hand a browser shows over buttons; its fingertip sits on (x, y) */
export const Cursor: React.FC<{ x: number; y: number; down?: boolean; t?: number; hand?: boolean; size?: number }> = ({ x, y, down, t = 1, hand, size = 1 }) => (
  <div style={{ position: "absolute", left: x, top: y, zIndex: 100, opacity: t, pointerEvents: "none" }}>
    {down ? <div style={{ position: "absolute", left: -22, top: -22, width: 44, height: 44, borderRadius: "50%", background: "rgba(29,161,242,.28)" }} /> : null}
    {hand ? (
      <svg width={44} height={46} viewBox="0 0 22 23" style={{ position: "absolute", left: -14, top: -3, transform: `scale(${(down ? 0.9 : 1) * size})`, transformOrigin: "14px 3px", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.35))" }}>
        <path d="M7 1.5c1 0 1.8.8 1.8 1.8V9h.4V7.6c0-1 .8-1.7 1.7-1.7s1.7.7 1.7 1.7v1.8h.4v-.8c0-1 .8-1.6 1.6-1.6.9 0 1.6.7 1.6 1.6v1.2h.3c0-.9.7-1.5 1.5-1.5s1.5.7 1.5 1.5v5.4c0 3.9-2.6 6.8-6.4 6.8H11c-2 0-3.4-.8-4.6-2.4L2.6 14c-.6-.8-.4-1.9.4-2.4.7-.5 1.7-.3 2.3.3l.9 1V3.3C6.2 2.3 6 1.5 7 1.5z"
          fill="#fff" stroke={BRAND.ink} strokeWidth={1.1} strokeLinejoin="round" />
      </svg>
    ) : <svg width={34} height={44} viewBox="0 0 17 22" style={{ transform: `scale(${down ? 0.9 : 1})`, transformOrigin: "0 0", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.35))" }}>
      <path d="M1 1v17l4.5-4 3 7 3-1.3-3-6.9H15z" fill="#fff" stroke={BRAND.ink} strokeWidth={1.4} strokeLinejoin="round" />
    </svg>}
  </div>
);

/** cursor path through keyframes [frame, x, y] with eased moves */
export const cursorAt = (f: number, keys: [number, number, number][]) => {
  if (f <= keys[0][0]) return { x: keys[0][1], y: keys[0][2] };
  for (let i = 1; i < keys.length; i++) {
    const [f1, x1, y1] = keys[i];
    const [f0, x0, y0] = keys[i - 1];
    if (f <= f1) {
      const u = (f - f0) / Math.max(1, f1 - f0);
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      return { x: x0 + (x1 - x0) * e, y: y0 + (y1 - y0) * e };
    }
  }
  const l = keys[keys.length - 1];
  return { x: l[1], y: l[2] };
};
