import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { loadFonts } from "./brand/fonts";
import { SkinName, skinOf } from "./brand/tokens";
import { Ground } from "./components/Film";
import { SkinCtx } from "./components/ui";
import { ramp } from "./lib/motion";
import { End } from "./scenes/End";
import { Evm } from "./scenes/Evm";
import { Hook } from "./scenes/Hook";
import { Open } from "./scenes/Open";
import { Solana } from "./scenes/Solana";
import { Tokens } from "./scenes/Tokens";
import { SCENES } from "./timeline";

loadFonts();

export type TweetpadProps = { skin: SkinName };

export const Tweetpad: React.FC<TweetpadProps> = ({ skin }) => {
  const f = useCurrentFrame();
  return (
    <SkinCtx.Provider value={skinOf(skin)}>
      <AbsoluteFill>
        <Ground blue={ramp(f, SCENES.end.from - 6, SCENES.end.from + 10)} />
        <Sequence from={SCENES.hook.from} durationInFrames={SCENES.hook.dur} name="1 Hook"><Hook /></Sequence>
        <Sequence from={SCENES.open.from} durationInFrames={SCENES.open.dur} name="2 Card opens"><Open /></Sequence>
        <Sequence from={SCENES.solana.from} durationInFrames={SCENES.solana.dur} name="3 Solana launch"><Solana /></Sequence>
        <Sequence from={SCENES.tokens.from} durationInFrames={SCENES.tokens.dur} name="4 Tokens, chart, feed"><Tokens /></Sequence>
        <Sequence from={SCENES.evm.from} durationInFrames={SCENES.evm.dur} name="5 Robinhood Chain (EVM)"><Evm /></Sequence>
        <Sequence from={SCENES.end.from} durationInFrames={SCENES.end.dur} name="6 End card"><End /></Sequence>
      </AbsoluteFill>
    </SkinCtx.Provider>
  );
};
