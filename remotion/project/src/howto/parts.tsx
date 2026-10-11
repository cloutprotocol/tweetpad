/**
 * Tutorial-only pieces for TweetpadHowToLaunch: step chip caption, camera (gentle zoom on the field in use),
 * the app's "Connect a wallet" menu (embed.html #wc-menu, as captured in site/13), a GENERIC wallet window mock
 * (no wallet branding, no addresses), and a highlight ring + tooltip for the header tour.
 */
import React from "react";
import { BRAND, FONTS } from "../brand/tokens";
import { Tag, useSkin } from "../components/ui";
import { APP, toFilm } from "../scenes/layout";

/* ---------- camera ---------- */
export type Cam = { z: number; fx: number; fy: number; k: number };
export const NO_CAM: Cam = { z: 1, fx: 230, fy: 260, k: 0 };
const TARGET = { x: 540, y: 640 };
/** app px -> film px through the camera */
export const camMap = (cam: Cam) => (ax: number, ay: number) => {
  const F = toFilm(cam.fx, cam.fy);
  const C = { x: F.x + (TARGET.x - F.x) * cam.k, y: F.y + (TARGET.y - F.y) * cam.k };
  const p = toFilm(ax, ay);
  return { x: C.x + (p.x - F.x) * cam.z, y: C.y + (p.y - F.y) * cam.z };
};
/** blend between two cameras */
export const camLerp = (a: Cam, b: Cam, t: number): Cam => ({ z: a.z + (b.z - a.z) * t, fx: a.fx + (b.fx - a.fx) * t, fy: a.fy + (b.fy - a.fy) * t, k: a.k + (b.k - a.k) * t });

/** the app rect, clipped below the caption band, with the camera applied */
export const Stage: React.FC<{ cam: Cam; children: React.ReactNode }> = ({ cam, children }) => {
  const F = toFilm(cam.fx, cam.fy);
  const C = { x: F.x + (TARGET.x - F.x) * cam.k, y: F.y + (TARGET.y - F.y) * cam.k };
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 214, bottom: 38, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: -214, width: 1080, height: 1080, transformOrigin: "0 0",
        transform: `translate(${C.x}px, ${C.y}px) scale(${cam.z}) translate(${-F.x}px, ${-F.y}px)` }}>
        <div style={{ position: "absolute", left: APP.x, top: APP.y, width: APP.w * APP.scale, height: APP.h * APP.scale, borderRadius: 10, overflow: "hidden",
          boxShadow: "0 20px 60px rgba(20,23,26,.18)", border: "1px solid #c8c8c8" }}>
          {children}
        </div>
      </div>
    </div>
  );
};

/* ---------- step chip + caption ---------- */
export const StepCaption: React.FC<{ n?: number; head: string; sub?: string; t: number }> = ({ n, head, sub, t }) => (
  <div style={{ position: "absolute", left: 56, right: 56, top: 44, display: "flex", alignItems: "center", gap: 26, opacity: t, transform: `translateY(${(1 - t) * 16}px)`, fontFamily: FONTS.ui }}>
    {n ? (
      <div style={{ flex: "none", width: 112, height: 112, borderRadius: 30, display: "grid", placeItems: "center", color: "#fff", font: `900 68px/1 ${FONTS.ui}`,
        background: `linear-gradient(${BRAND.light}, ${BRAND.primary})`, boxShadow: "inset 0 2px 0 rgba(255,255,255,.45), 0 10px 24px rgba(29,161,242,.35)",
        transform: `scale(${0.6 + 0.4 * t})` }}>{n}</div>
    ) : null}
    <div style={{ minWidth: 0 }}>
      {n ? <div style={{ font: `800 20px/1 ${FONTS.ui}`, letterSpacing: ".14em", color: BRAND.primary }}>STEP {n}</div> : null}
      <div style={{ marginTop: 6, font: `800 46px/1.05 ${FONTS.ui}`, letterSpacing: "-.03em", color: BRAND.ink }}>{head}</div>
      {sub ? <div style={{ marginTop: 8, font: `500 23px/1.25 ${FONTS.ui}`, color: BRAND.darkGray }}>{sub}</div> : null}
    </div>
  </div>
);

/** band behind the caption so a zoomed app never fights the text */
export const CaptionBand: React.FC = () => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 214, background: `linear-gradient(${BRAND.bg} 88%, rgba(245,248,250,0))` }} />
);

/* ---------- the app's wallet menu (Connect ▾), 2012 skin ---------- */
export const WalletMenu: React.FC<{ t: number; hover?: boolean }> = ({ t, hover }) => {
  const s = useSkin();
  const row = (letter: string, name: string, color: string, badge: React.ReactNode, on = false) => (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: 8, marginBottom: 4, border: "1px solid #e3e3e3", borderRadius: 5,
      background: on ? "linear-gradient(#3fa9ea, #1b88d6)" : "#fff", color: on ? "#fff" : "#333", font: `bold 13px/1.2 ${s.px}` }}>
      <span style={{ width: 24, height: 24, borderRadius: 4, display: "grid", placeItems: "center", background: color, color: "#fff", font: `bold 12px/1 ${s.px}` }}>{letter}</span>
      <span style={{ flex: 1 }}>{name}</span>{badge}
    </div>
  );
  return (
    <div style={{ position: "absolute", right: 7, top: 44, width: 290, padding: 10, background: "#fff", border: "1px solid rgba(0,0,0,.2)", borderRadius: 6,
      boxShadow: "0 4px 12px rgba(0,0,0,.25)", opacity: t, transform: `translateY(${(1 - t) * -6}px)` }}>
      <div style={{ display: "flex", justifyContent: "space-between", font: `bold 12px/1.2 ${s.px}`, color: "#666", marginBottom: 6 }}>Connect a wallet<span style={{ color: "#aaa", fontSize: 16 }}>×</span></div>
      <div style={{ font: `bold 12px/1.2 ${s.px}`, color: "#666", margin: "8px 2px 5px" }}>Detected</div>
      {row("P", "Phantom", "#ab9ff2", <Tag>DETECTED</Tag>, hover)}
      <div style={{ font: `bold 12px/1.2 ${s.px}`, color: "#666", margin: "10px 2px 5px" }}>More wallets</div>
      {row("S", "Solflare", "#f0a060", <Tag dim>INSTALL ↗</Tag>)}
      {row("B", "Backpack", "#e07070", <Tag dim>INSTALL ↗</Tag>)}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 6, borderTop: "1px solid #e3e3e3", font: `11px/1.2 ${s.px}`, color: "#999" }}>
        <span>mainnet · top-level</span><span style={{ color: "#0084b4" }}>Wallet missing? Popup</span>
      </div>
    </div>
  );
};

/* ---------- generic wallet window (film px). Deliberately unbranded. ---------- */
export const WalletWindow: React.FC<{ t: number; kind: "connect" | "approve"; pressed?: boolean }> = ({ t, kind, pressed }) => (
  <div style={{ position: "absolute", right: 70, top: 250, width: 400, zIndex: 50, background: "#fff", borderRadius: 18, overflow: "hidden", fontFamily: FONTS.ui,
    boxShadow: "0 30px 80px rgba(20,23,26,.35)", border: `1px solid ${BRAND.border}`, opacity: t, transform: `translateY(${(1 - t) * 24}px) scale(${0.96 + 0.04 * t})` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "#f2f0fb", borderBottom: `1px solid ${BRAND.border}` }}>
      <span style={{ width: 34, height: 34, borderRadius: 9, background: "#ab9ff2", color: "#fff", display: "grid", placeItems: "center", font: `800 18px/1 ${FONTS.ui}` }}>P</span>
      <b style={{ font: `700 22px/1 ${FONTS.ui}`, color: BRAND.ink }}>Phantom</b>
      <span style={{ marginLeft: "auto", font: `500 16px/1 ${FONTS.ui}`, color: BRAND.darkGray }}>wallet</span>
    </div>
    <div style={{ padding: "22px 22px 18px" }}>
      <div style={{ font: `800 28px/1.15 ${FONTS.ui}`, color: BRAND.ink }}>{kind === "connect" ? "Connect to tweetpad.io?" : "Approve transaction"}</div>
      <div style={{ marginTop: 10, font: `500 19px/1.35 ${FONTS.ui}`, color: BRAND.darkGray }}>
        {kind === "connect" ? "tweetpad.io wants to see your public address." : "tweetpad.io · Solana mainnet. Review what your wallet shows before you approve."}
      </div>
      <div style={{ marginTop: 22, display: "flex", gap: 12 }}>
        <span style={{ flex: 1, textAlign: "center", padding: "14px 0", borderRadius: 12, background: "#eef1f4", font: `700 20px/1 ${FONTS.ui}`, color: BRAND.ink }}>Cancel</span>
        <span style={{ flex: 1, textAlign: "center", padding: "14px 0", borderRadius: 12, background: pressed ? "#8a7de0" : "#ab9ff2", font: `700 20px/1 ${FONTS.ui}`, color: "#fff" }}>{kind === "connect" ? "Connect" : "Approve"}</span>
      </div>
      <div style={{ marginTop: 14, font: `500 13px/1.3 ${FONTS.ui}`, color: BRAND.lightGray, textAlign: "center" }}>Illustration. Your wallet's own window looks different.</div>
    </div>
  </div>
);
/** film-px centre of the wallet window's right (confirm) button */
export const WALLET_OK = { x: 1080 - 70 - 22 - 89, y: 250 + 70 + 22 + 74 + 66 };

/* ---------- tour ring + tooltip (app px, rendered in the AppFrame overlay) ---------- */
export const TabRing: React.FC<{ x: number; w: number; label: string; title: string; t: number }> = ({ x, w, label, title, t }) => {
  const s = useSkin();
  return (
    <div style={{ opacity: t }}>
      <div style={{ position: "absolute", left: x - 3, top: 4, width: w + 6, height: 31, borderRadius: 8, border: "2.5px solid #fff", boxShadow: "0 0 0 3px rgba(29,161,242,.9), 0 0 14px rgba(255,255,255,.9)" }} />
      <div style={{ position: "absolute", left: Math.min(Math.max(x + w / 2 - 95, 8), 460 - 198), top: 44, width: 190, padding: "8px 10px", background: "rgba(20,20,20,.92)", color: "#fff", borderRadius: 6,
        font: `12px/1.3 ${s.px}`, boxShadow: "0 4px 12px rgba(0,0,0,.3)", transform: `translateY(${(1 - t) * -6}px)` }}>
        <b style={{ display: "block", font: `bold 14px/1.2 ${s.px}` }}>{label}</b>{title}
      </div>
    </div>
  );
};
