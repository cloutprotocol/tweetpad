/** Scene 3: the shipped Solana flow. Image → name → ticker → Launch → "Token launched!" toast (verbatim app strings). */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption, Cursor, cursorAt, Fine } from "../components/Film";
import { LaunchForm } from "../components/LaunchForm";
import { AppFrame, OfficialStrip, Toast, useSkin, WelcomeTweet } from "../components/ui";
import { ramp, settle, typed } from "../lib/motion";
import { COPY } from "../timeline";
import { APP, toFilm } from "./layout";

/** app-px targets inside the launch form once scrolled (checked against stills) */
export const SCROLL_TO_FORM = 216;
/** Tweetcraft hides the welcome post, so the form sits higher there */
export const useFormScroll = () => (useSkin().name === "2012" ? SCROLL_TO_FORM : 50);
export const T = { drop: [117, 120], name: [270, 97], ticker: [270, 135], button: [230, 383] } as const;

export const Solana: React.FC = () => {
  const f = useCurrentFrame();
  const formScroll = useFormScroll();
  const name = typed("Such Launch", f, 48, 0.45);
  const ticker = typed("WOW", f, 100, 0.3);
  const caret = f >= 44 && f < 96 ? "name" : f >= 96 && f < 128 ? "ticker" : null;
  const clickAt = 150;
  const busy = f >= clickAt + 6 && f < 192;
  const done = f >= 192;
  // renderLaunch() in tweetpad.js: the button names the first problem until the form is complete
  const hasImg = f >= 24;
  const button = done ? "Launch another" : busy ? "Launching…" : !hasImg ? "Add an image" : !name ? "Add a name"
    : ticker.length < 2 ? "Ticker: 2–10 letters or numbers" : "Launch $" + ticker;
  const p = (k: readonly [number, number]) => { const q = toFilm(k[0], k[1]); return [q.x, q.y] as const; };
  const c = cursorAt(f, [[0, 900, 1060], [18, ...p(T.drop)], [40, ...p(T.drop)], [44, ...p(T.name)], [96, ...p(T.name)], [100, ...p(T.ticker)], [128, ...p(T.ticker)], [146, ...p(T.button)]]);
  const down = (f >= 20 && f < 26) || (f >= 42 && f < 46) || (f >= 98 && f < 102) || (f >= clickAt && f < clickAt + 6);
  const fade = ramp(f, 0, 10) * (1 - ramp(f, 228, 240, settle));
  const appFade = 1;
  return (
    <AbsoluteFill>
      <div style={{ opacity: appFade, position: "absolute", left: APP.x, top: APP.y, width: APP.w * APP.scale, height: APP.h * APP.scale, borderRadius: 10, overflow: "hidden", boxShadow: "0 20px 60px rgba(20,23,26,.18)", border: "1px solid #c8c8c8" }}>
        <AppFrame scale={APP.scale} tab="launch" tokenCount={6} connected scrollY={formScroll}
          toast={<Toast title="Token launched!" text="$WOW is live on pump.fun" t={ramp(f, 192, 202) * (1 - ramp(f, 226, 236))} />}>
          <OfficialStrip />
          <WelcomeTweet />
          <LaunchForm chain="solana" image="brand/agent-inu.jpg" imageT={ramp(f, 24, 36)} name={name} ticker={ticker} caret={caret}
            button={button} pressed={f >= clickAt && f < clickAt + 6} />
        </AppFrame>
      </div>
      <Caption head={COPY.solana.head} head2={COPY.solana.head2} t={fade * ramp(f, 6, 22)} y={40} />
      <Cursor x={c.x} y={c.y} down={down} t={ramp(f, 4, 14) * (1 - ramp(f, 200, 212))} />
      <Fine text={COPY.solana.fine} t={fade * ramp(f, 20, 34)} />
    </AbsoluteFill>
  );
};
