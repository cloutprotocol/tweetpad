/** Scene 2: the card opens into the full launchpad (2012 skin): header, $TP strip, welcome post, launch form. */
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Caption } from "../components/Film";
import { LaunchForm } from "../components/LaunchForm";
import { AppFrame, OfficialStrip, WelcomeTweet } from "../components/ui";
import { lerp, ramp, settle } from "../lib/motion";
import { COPY } from "../timeline";
import { APP, CARD } from "./layout";
import { useFormScroll } from "./Solana";

export const Open: React.FC = () => {
  const f = useCurrentFrame();
  const formScroll = useFormScroll();
  const g = ramp(f, 0, 26, settle);
  const x = lerp(CARD.x, APP.x, g), y = lerp(CARD.y, APP.y, g);
  const w = lerp(CARD.w, APP.w * APP.scale, g), h = lerp(CARD.h, APP.h * APP.scale, g);
  const scale = w / APP.w;
  const hApp = h / scale;
  const cover = 1 - ramp(f, 4, 18);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: lerp(16, 10, g), overflow: "hidden", boxShadow: `0 ${20 * g}px ${60 * g}px rgba(20,23,26,${0.18 * g})`, border: "1px solid #c8c8c8" }}>
        <AppFrame scale={scale} h={hApp} tab="launch" tokenCount={6} scrollY={lerp(0, formScroll, ramp(f, 50, 145, settle))}>
          <OfficialStrip />
          <WelcomeTweet />
          <LaunchForm chain="solana" button="Connect wallet" />
        </AppFrame>
        <Img src={staticFile("brand/card-preview.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: cover }} />
      </div>
      <Caption head={COPY.open.head} head2={COPY.open.head2} sub={COPY.open.sub} t={ramp(f, 22, 40) * (1 - ramp(f, 138, 150, settle))} y={22} />
    </AbsoluteFill>
  );
};
