/**
 * Scene 5: chain switch to Robinhood Chain (EVM) on Launch Party's solo launcher. Shipped: the feather in the tab bar
 * (.net-switch) picks the network, and the form, wallet line, presets, button and check lines are the app's own.
 * Facts are backed by api/_evm.js / api/evm-create.js: chain 4663, gateway createIn solo (kind 1), feeEndBps 100
 * (a flat 1% fee, 10% of it to Launch Party, the rest creator/holders), launch fee + gas, dev buy 0–1 ETH, server dry-run.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BRAND, FONTS } from "../brand/tokens";
import { Caption, Cursor, cursorAt, Fine } from "../components/Film";
import { LaunchForm } from "../components/LaunchForm";
import { AppFrame, NET_XY, NetTip, OfficialStrip, WelcomeTweet } from "../components/ui";
import { ramp, settle } from "../lib/motion";
import { COPY, EVM_STATUS } from "../timeline";
import { APP, toFilm } from "./layout";
import { useFormScroll } from "./Solana";

const EVM_DY = 124; // scroll on Robinhood: the EVM wallet line and the Creator fees box push the dev buy and button down

export const Evm: React.FC = () => {
  const f = useCurrentFrame();
  const formScroll = useFormScroll();
  const switchAt = 44;
  const evm = f >= switchAt;
  const devBuy = f >= 92 ? 1 : 0;
  const clickAt = 126;
  // onLaunchEvm: each check() replaces the pending line before it
  const ipfs = { text: "Image and metadata on IPFS", done: true, link: "JSON ↗" };
  const built = { text: "Transaction built and checked against the live launcher", done: true };
  const checks = f >= clickAt + 34 ? [ipfs, built, { text: "Approve in MetaMask…", done: false }]
    : f >= clickAt + 22 ? [ipfs, { text: "Building the Robinhood launch…", done: false }]
    : f >= clickAt + 6 ? [{ text: "Uploading image and metadata to IPFS…", done: false }] : [];
  const q = (x: number, y: number) => { const p = toFilm(x, y); return [p.x, p.y] as const; };
  const c = cursorAt(f, [[0, 900, 1060], [34, ...q(...NET_XY.robinhood)], [70, ...q(...NET_XY.robinhood)], [86, ...q(158, 352)], [110, ...q(158, 352)], [122, ...q(230, 445)]]);
  const down = (f >= switchAt && f < switchAt + 6) || (f >= 90 && f < 96) || (f >= clickAt && f < clickAt + 6);
  const tipT = ramp(f, 34, 40) * (1 - ramp(f, switchAt + 8, switchAt + 14));
  const facts = ramp(f, 186, 200, settle);
  const fade = ramp(f, 0, 10) * (1 - ramp(f, 258, 270, settle));
  const tag = COPY.evm.tag(EVM_STATUS);
  const appFade = 1 - ramp(f, 258, 270, settle);
  return (
    <AbsoluteFill>
      <div style={{ opacity: appFade, position: "absolute", left: APP.x, top: APP.y, width: APP.w * APP.scale, height: APP.h * APP.scale, borderRadius: 10, overflow: "hidden", boxShadow: "0 20px 60px rgba(20,23,26,.18)", border: "1px solid #c8c8c8",
        filter: `blur(${facts * 3}px)`, transform: `scale(${1 - facts * 0.03})` }}>
        <AppFrame scale={APP.scale} tab="launch" tokenCount={6} connected scrollY={formScroll + ramp(f, 60, 80, settle) * EVM_DY + ramp(f, 140, 170, settle) * 60}
          net={evm ? "robinhood" : "solana"} netT={ramp(f, switchAt + 1, switchAt + 9, settle)} netHover={f >= 34 && f < switchAt ? "robinhood" : null} overlay={tipT > 0 ? <NetTip net="robinhood" t={tipT} /> : null}>
          <OfficialStrip />
          <WelcomeTweet />
          <LaunchForm chain={evm ? "robinhood" : "solana"} image="brand/agent-inu.jpg" name="Such Launch" ticker="WOW" devBuy={devBuy}
            evmLine={{ address: "0xxx…xxxx", wallet: "MetaMask" }}
            button={f >= clickAt + 6 ? "Launching…" : evm ? "Launch $WOW on Robinhood" + (devBuy ? " · buy 0.001 ETH" : "") : "Launch $WOW"} pressed={f >= clickAt && f < clickAt + 6} checks={checks} />
        </AppFrame>
      </div>
      {/* the fact card, over the blurred app */}
      <div style={{ position: "absolute", left: 150, right: 150, top: 300, padding: "34px 40px", background: "#fff", borderRadius: 22, border: `1px solid ${BRAND.border}`,
        boxShadow: "0 30px 80px rgba(20,23,26,.22)", opacity: facts * appFade, transform: `translateY(${(1 - facts) * 30}px) scale(${0.96 + 0.04 * facts})`, fontFamily: FONTS.ui }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ font: `900 120px/1 ${FONTS.ui}`, letterSpacing: "-.05em", color: BRAND.primary }}>1%</span>
          <span style={{ font: `800 38px/1.05 ${FONTS.ui}`, color: BRAND.ink }}>creator<br />fee</span>
        </div>
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          {COPY.evm.facts.map((t, i) => {
            const a = ramp(f, 196 + i * 6, 206 + i * 6);
            return (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, font: `600 26px/1.2 ${FONTS.ui}`, color: BRAND.ink, opacity: a, transform: `translateX(${(1 - a) * 16}px)` }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", background: BRAND.primary, color: "#fff", display: "grid", placeItems: "center", font: `800 16px/1 ${FONTS.ui}`, flex: "none" }}>✓</span>{t}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 18, font: `500 18px/1.3 ${FONTS.ui}`, color: BRAND.darkGray }}>{COPY.evm.factsFine}</div>
      </div>
      <Caption tag={tag} head={COPY.evm.head} head2={COPY.evm.head2} t={fade * ramp(f, 6, 22)} y={16} />
      <Cursor x={c.x} y={c.y} down={down} hand={f < switchAt + 20} t={ramp(f, 4, 14) * (1 - ramp(f, 160, 172))} />
      <Fine text={COPY.evm.fine(EVM_STATUS)} t={fade * ramp(f, 20, 34)} />
    </AbsoluteFill>
  );
};
