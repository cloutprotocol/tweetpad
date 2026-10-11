/** Scene 4: Tokens list → coin screen (chart + /c/<contract> share link) → Feed (140-char composer). Demo data, no figures. */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption, Cursor, cursorAt, Fine } from "../components/Film";
import { CoinView, FeedView, TokenList } from "../components/Views";
import { AppFrame, Tab } from "../components/ui";
import { ramp, settle, typed } from "../lib/motion";
import { COPY } from "../timeline";
import { APP, toFilm } from "./layout";

const FEED_TAB_X = 330;

export const Tokens: React.FC = () => {
  const f = useCurrentFrame();
  const view: "list" | "coin" | "feed" = f < 58 ? "list" : f < 118 ? "coin" : "feed";
  const tab: Tab = view === "feed" ? "feed" : "tokens";
  const q = (x: number, y: number) => { const p = toFilm(x, y); return [p.x, p.y] as const; };
  const c = cursorAt(f, [[0, 760, 1060], [40, ...q(200, 76)], [104, ...q(200, 76)], [114, ...q(FEED_TAB_X, 19)], [124, ...q(FEED_TAB_X, 19)], [142, ...q(100, 170)], [150, ...q(100, 170)], [158, ...q(350, 192)]]);
  const down = (f >= 50 && f < 56) || (f >= 114 && f < 120) || (f >= 144 && f < 150) || (f >= 160 && f < 166);
  const text = typed("gm from inside the tweet #tweetpad", f, 124, 1.1);
  const fade = ramp(f, 0, 10) * (1 - ramp(f, 170, 180, settle));
  const appFade = 1;
  return (
    <AbsoluteFill>
      <div style={{ opacity: appFade, position: "absolute", left: APP.x, top: APP.y, width: APP.w * APP.scale, height: APP.h * APP.scale, borderRadius: 10, overflow: "hidden", boxShadow: "0 20px 60px rgba(20,23,26,.18)", border: "1px solid #c8c8c8" }}>
        <AppFrame scale={APP.scale} tab={tab} tokenCount={6} connected>
          {view === "list" ? <TokenList rows={6} highlight={f > 44 ? 0 : -1} appear={(i) => ramp(f, 4 + i * 4, 16 + i * 4)} /> : null}
          {view === "coin" ? <CoinView drawT={ramp(f, 60, 100)} /> : null}
          {view === "feed" ? <FeedView text={text} tagged={f >= 150} posted={ramp(f, 166, 176)} /> : null}
        </AppFrame>
      </div>
      <Caption head={COPY.tokens.head} head2={COPY.tokens.head2} t={fade * ramp(f, 6, 22)} y={40} />
      <Cursor x={c.x} y={c.y} down={down} t={ramp(f, 4, 14)} />
      <Fine text={COPY.tokens.fine} t={fade * ramp(f, 20, 34)} />
    </AbsoluteFill>
  );
};
