import React from "react";
import { Composition } from "remotion";
import { VIDEO } from "./brand/tokens";
import { HOWTO_TOTAL, MULTI_TOTAL, ROBINHOOD_TOTAL, TOTAL, TRADE_TOTAL, WELCOME_TOTAL, PANEL_TOTAL, AGENTS_TOTAL, WINAMP_TOTAL, ETH_TOTAL, THREE_TOTAL, STONK_TOTAL, GAMES_TOTAL, BORDR_TOTAL, BHOME_TOTAL, TOUR_TOTAL, SHILL_TOTAL } from "./timeline";
import { TweetpadHowToLaunch } from "./howto/HowTo";
import { Tweetpad, TweetpadProps } from "./Tweetpad";
import { TweetpadRobinhoodUpdate } from "./update/RobinhoodUpdate";
import { TweetpadTradeUpdate } from "./update/TradeUpdate";
import { TweetpadMultichainUpdate } from "./update/MultichainUpdate";
import { TweetpadWelcomeBnbBase } from "./update/WelcomeBnbBase";
import { TweetpadTradePanel } from "./update/TradePanel";
import { TweetpadAgentsTeaser } from "./update/AgentsTeaser";
import { TweetpadWinamp } from "./update/Winamp";
import { TweetpadEthereum } from "./update/EthereumUpdate";
import { TweetpadThreeNew } from "./update/ThreeNew";
import { TweetpadStonks } from "./update/Stonks";
import { TweetpadGames } from "./update/Games";
import { TweetpadBordrless } from "./update/Bordrless";
import { TweetpadBordrlessPoster } from "./update/BordrlessPoster";
import { TweetpadBordrlessHome } from "./update/BordrlessHome";
import { TweetpadMenuTour } from "./update/MenuTour";
import { TweetpadShill } from "./update/Shill";

export const Root: React.FC = () => (
  <>
    <Composition id="TweetpadSquare" component={Tweetpad} durationInFrames={TOTAL} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height}
      defaultProps={{ skin: "2012" } satisfies TweetpadProps} />
    {/* optional: the same film in the Tweetcraft pixel skin */}
    <Composition id="TweetpadSquareCraft" component={Tweetpad} durationInFrames={TOTAL} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height}
      defaultProps={{ skin: "tweetcraft" } satisfies TweetpadProps} />
    {/* film 2: "How to launch a token on tweetpad" (Solana only, the shipped flow) */}
    <Composition id="TweetpadHowToLaunch" component={TweetpadHowToLaunch} durationInFrames={HOWTO_TOTAL} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height}
      defaultProps={{ skin: "2012" as const }} />
    {/* film 3: "Now on Robinhood Chain", the feature update (the shipped tab-bar switch + EVM launch) */}
    <Composition id="TweetpadRobinhoodUpdate" component={TweetpadRobinhoodUpdate} durationInFrames={ROBINHOOD_TOTAL} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height}
      defaultProps={{ skin: "2012" as const }} />
    {/* film 4: "Now: buy and sell inside the tweet.", trading on the coin page + Jito bundles */}
    <Composition id="TweetpadTradeUpdate" component={TweetpadTradeUpdate} durationInFrames={TRADE_TOTAL} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height}
      defaultProps={{ skin: "2012" as const }} />
    {/* film 5: "Now on BNB Chain and Base.", the four-chain switch */}
    <Composition id="TweetpadMultichainUpdate" component={TweetpadMultichainUpdate} durationInFrames={MULTI_TOTAL} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height}
      defaultProps={{ skin: "2012" as const }} />
    {/* film 6: the BNB Chain + Base announcement (Now live, welcome posts, one montage) */}
    <Composition id="TweetpadWelcomeBnbBase" component={TweetpadWelcomeBnbBase} durationInFrames={WELCOME_TOTAL} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height}
      defaultProps={{ skin: "2012" as const }} />
    {/* film 7: "The trading terminal inside a tweet." (trading + Jito, 3D floating panels over a # field) */}
    <Composition id="TweetpadTradePanel" component={TweetpadTradePanel} durationInFrames={PANEL_TOTAL} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height}
      defaultProps={{ skin: "2012" as const }} />
    {/* film 8: "Agents, coming soon, powered by Grok" (Lights out look) */}
    <Composition id="TweetpadAgentsTeaser" component={TweetpadAgentsTeaser} durationInFrames={AGENTS_TOTAL} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    {/* film 9: "Winamp, inside a tweet." (tweetpad.io/winamp over the # spectrum, scored with Space Debris) */}
    <Composition id="TweetpadWinamp" component={TweetpadWinamp} durationInFrames={WINAMP_TOTAL} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    {/* film 10: "Now on Ethereum." (Launch Party's custom launch, the fifth chain) + Auto-claim as a side note */}
    <Composition id="TweetpadEthereum" component={TweetpadEthereum} durationInFrames={ETH_TOTAL} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height}
      defaultProps={{ skin: "2012" as const }} />
    {/* film 11: "Three new things on tweetpad." (a parody diamond spells out Ethereum, custom launches and Auto-claim) */}
    <Composition id="TweetpadThreeNew" component={TweetpadThreeNew} durationInFrames={THREE_TOTAL} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height}
      defaultProps={{ skin: "2012" as const }} />
    {/* film 12: "Stocks meet memes. Stonkfun, inside the tweet." (Stonkfun launches: the switch, stock pairs, holder rewards) */}
    <Composition id="TweetpadStonks" component={TweetpadStonks} durationInFrames={STONK_TOTAL} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height}
      defaultProps={{ skin: "2012" as const }} />
    {/* film 13: "Casino games, inside the tweet. Built on Gamba." (Pump or Dump, Mines, Instant play, provably fair) */}
    <Composition id="TweetpadGames" component={TweetpadGames} durationInFrames={GAMES_TOTAL} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height}
      defaultProps={{ skin: "2012" as const }} />
    {/* film 14: "Bordrless tokens. Tradeable in a tweet." (tweetpad.io/b/<token CA>, in Bordrless's look blended with tweetpad's) */}
    <Composition id="TweetpadBordrless" component={TweetpadBordrless} durationInFrames={BORDR_TOTAL} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    {/* the Bordrless poster: "Launch & trade Bordrless tokens (inside a tweet)", a still, and film 15's end card */}
    <Composition id="TweetpadBordrlessPoster" component={TweetpadBordrlessPoster} durationInFrames={120} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    {/* film 15: "Launch & trade Bordrless tokens (inside a tweet)." (from the new home's Menu: the Bordrless channel, then launch and trade) */}
    <Composition id="TweetpadBordrlessHome" component={TweetpadBordrlessHome} durationInFrames={BHOME_TOTAL} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    {/* film 16: "One Menu. Every chain." (the new home Menu as the segue: Launch on five chains, Tokens and any token, Feed, Hooks Launch,
        Games, Profile, Bordrless, then More → Themes and the Wii skin, now the default) */}
    <Composition id="TweetpadMenuTour" component={TweetpadMenuTour} durationInFrames={TOUR_TOTAL} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    {/* film 17: "The new way to shill a token." (the old typed-out shill and its four tabs, then one tweetpad link that trades in the
        post, on all five chains, and the three steps) */}
    <Composition id="TweetpadShill" component={TweetpadShill} durationInFrames={SHILL_TOTAL} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
  </>
);
