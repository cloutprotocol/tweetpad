/**
 * TweetpadDexBanner: the DexScreener header, animated. 1500x500 @30, 5 s, a seamless loop (rendered to GIF and animated WebP).
 * The same crop as the static banner in use: the card's 2012 header and the top of the Launch panel on the dotted ground, the
 * arrow cursor in the form. Agent Inu drops in, Such Launch $WOW is typed and held, then the form clears and it begins again.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { SKIN_2012 } from "../brand/tokens";
import { Cursor, cursorAt, Ground } from "../components/Film";
import { LaunchForm } from "../components/LaunchForm";
import { AppFrame, NETS_5, SkinCtx } from "../components/ui";
import { ramp, typed } from "../lib/motion";

export const DEX_BANNER = { width: 1500, height: 500, frames: 150 } as const;
const S = 2.14, X = (1500 - 460 * S) / 2, Y = 106;           // the card: 984 px wide, its header from y 106
const app = (ax: number, ay: number) => ({ x: X + ax * S, y: Y + ay * S });
/* the image drops in, the name and ticker are typed, a long hold, then cleared to loop */
const COINS = [{ name: "Such Launch", ticker: "WOW", img: "brand/agent-inu.jpg" }];
const SLOT = 150, NAME_AT = 6, TICK_AT = 34, CLEAR = 136;
const NAME_XY: [number, number] = [262, 106], TICK_XY: [number, number] = [262, 144];

export const TweetpadDexBanner: React.FC = () => {
  loadFonts();
  const f = useCurrentFrame();
  const i = Math.min(COINS.length - 1, Math.floor(f / SLOT)), r = f - i * SLOT, c = COINS[i];
  const gone = r >= CLEAR;
  const name = gone ? "" : typed(c.name, r, NAME_AT, 0.75);
  const ticker = gone ? "" : typed(c.ticker, r, TICK_AT, 0.5);
  const caret = gone ? null : r >= TICK_AT - 2 ? "ticker" : r >= NAME_AT - 2 ? "name" : null;
  const imageT = ramp(r, 0, 8) * (1 - ramp(r, CLEAR, CLEAR + 6));
  // the cursor rests by the field being typed, nudging over as it changes; the loop starts and ends on the name field
  const n = app(...NAME_XY), t = app(...TICK_XY);
  const cur = cursorAt(r, [[0, n.x + 80, n.y + 18], [NAME_AT, n.x + 90, n.y + 14], [TICK_AT - 6, t.x + 70, t.y + 12], [CLEAR, t.x + 70, t.y + 12], [SLOT, n.x + 80, n.y + 18]]);
  return (
    <SkinCtx.Provider value={SKIN_2012}>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Ground />
        <div style={{ position: "absolute", left: X, top: Y }}>
          <AppFrame scale={S} tab="launch" tokenCount={15} connected h={520} nets={NETS_5} style={{ borderRadius: 5, boxShadow: "0 5px 18px rgba(20,23,26,.18), 0 0 0 .5px rgba(20,23,26,.1)" }}>
            <LaunchForm chain="solana" nets={NETS_5} image={c.img} imageT={imageT} name={name} ticker={ticker} caret={caret} button={"Launch $" + (ticker || "…")} />
          </AppFrame>
        </div>
        <Cursor x={cur.x} y={cur.y} />
      </AbsoluteFill>
    </SkinCtx.Provider>
  );
};
