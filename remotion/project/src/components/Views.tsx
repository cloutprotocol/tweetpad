/**
 * Tokens list, coin screen and feed, rebuilt from embed.html (#tab-tokens, #tab-coin, #tab-feed) with the 2012 skin.
 * DEMO DATA ONLY: names are made up for the film and no market figures are shown. Where the app would print a
 * market cap, the film shows the app's own empty state "—". Never put real or invented prices / volumes here.
 */
import React from "react";
import { Img, staticFile } from "remotion";
import { FONTS } from "../brand/tokens";
import { Btn, EVM_NETS, EvmNet, Net, NetLogo, Panel, Seg, Tag, useSkin } from "./ui";

export type DemoCoin = { name: string; symbol: string; age: string; img?: string; color?: string; robinhood?: boolean; chain?: Net };
/** a demo coin's chain (coinChain): chain, else the older robinhood flag, else Solana */
export const chainOf = (c: DemoCoin): Net => c.chain ?? (c.robinhood ? "robinhood" : "solana");
export const DEMO_COINS: DemoCoin[] = [
  { name: "Such Launch", symbol: "WOW", age: "now", img: "brand/agent-inu.jpg" },
  { name: "Hello Timeline", symbol: "GM", age: "4m", color: "#1DA1F2" },
  { name: "Pixel Pup", symbol: "PUP", age: "9m", color: "#e8a33c" },
  { name: "tweetpad", symbol: "TP", age: "", img: "brand/tweetpad-hash-256.png" },
  { name: "Night Sky", symbol: "SKY", age: "31m", color: "#2b3a67" },
  { name: "Hashtag", symbol: "HASH", age: "48m", color: "#2e9e4f" },
];

/** .chain-badge (tweetpad.css): Solana mark on black, black feather on lime, dark BNB mark on #f0b90b, small white square on #0000ff */
const BADGE: Record<Net, { bg: string; fg: string; k: number }> = {
  solana: { bg: "#000", fg: "", k: 0.62 }, robinhood: { bg: "#ccff00", fg: "#000", k: 0.62 }, bnb: { bg: "#f0b90b", fg: "#1e2026", k: 0.62 }, base: { bg: "#0000ff", fg: "#fff", k: 0.46 },
  ethereum: { bg: "#627eea", fg: "#fff", k: 0.62 }, // .chain-badge.eth: white mark on Ethereum blue
};
/** per-film override of a badge's mark colour. Empty (films 1–5): the marks above. Film 6 sets { bnb: "#fff" }, the app's current
 * .chain-badge.bnb (BNB yellow, white mark). */
export const BadgeMarkCtx = React.createContext<Partial<Record<Net, string>>>({});
/** diam: an explicit badge size (film px chips, e.g. film 5's mention avatars); otherwise the CSS clamp(11px, 42%, 18px) */
export const ChainBadge: React.FC<{ chain?: Net; rh?: boolean; size: number; left?: boolean; diam?: number }> = ({ chain, rh, size, left, diam }) => {
  const s = useSkin();
  const net: Net = chain ?? (rh ? "robinhood" : "solana");
  const b = BADGE[net];
  const d = diam ?? Math.max(11, Math.min(18, size * 0.42));
  const fg = React.useContext(BadgeMarkCtx)[net] ?? b.fg;
  return (
    <span style={{ position: "absolute", ...(left ? { left: -4 } : { right: -3 }), bottom: -3, width: d, height: d, borderRadius: "50%", display: "grid", placeItems: "center",
      background: b.bg, boxShadow: s.name === "2012" ? "0 0 0 2px #fff, 0 1px 2px rgba(0,0,0,.3)" : `0 0 0 1.5px ${s.panelLo}` }}>
      {net === "solana" ? <Img src={staticFile("brand/solana.svg")} style={{ width: d * b.k, height: d * b.k, objectFit: "contain" }} />
        : <NetLogo net={net} c={fg} size={d * b.k} />}
    </span>
  );
};

/** badge: the .coin-ico wrapper with its chain badge (badgeLeft: the coin page, where the zoom + sits bottom-right) */
export const CoinImg: React.FC<{ c: DemoCoin; size: number; badge?: boolean; badgeLeft?: boolean }> = ({ c, size, badge, badgeLeft }) => {
  const s = useSkin();
  const r = s.name === "2012" ? 5 : 0;
  const pic = c.img
    ? <Img src={staticFile(c.img)} style={{ width: size, height: size, borderRadius: r, objectFit: "cover", flex: "none" }} />
    : <span style={{ width: size, height: size, borderRadius: r, flex: "none", display: "grid", placeItems: "center", background: c.color, color: "#fff", font: `bold ${size * 0.4}px/1 ${s.px}` }}>{c.symbol[0]}</span>;
  if (!badge) return pic;
  return <span style={{ position: "relative", display: "inline-flex", flex: "none", lineHeight: 0 }}>{pic}<ChainBadge chain={chainOf(c)} size={size} left={badgeLeft} /></span>;
};

export type ChainFilter = "all" | Net;
/** .chain-filter (2012): All · one chip per chain (logo), each with its count of the coins loaded (renderTokens: an empty count hides) */
const ChainFilterRow: React.FC<{ on: ChainFilter; coins: DemoCoin[]; chains: readonly Net[]; pressed?: ChainFilter | null }> = ({ on, coins, chains, pressed }) => {
  const s = useSkin();
  const craft = s.name !== "2012";
  const items: [ChainFilter, React.ReactNode, number][] = [
    ["all", "All", coins.length],
    ...chains.map((n): [ChainFilter, React.ReactNode, number] => [n, null, coins.filter((c) => chainOf(c) === n).length]),
  ];
  return (
    <div style={{ display: "flex", margin: "0 -10px", padding: "0 10px 8px", borderBottom: `1px solid ${craft ? s.line : "#e8e8e8"}` }}>
      {items.map(([k, label, n], i) => {
        const sel = k === on;
        const col = sel ? "#fff" : "#555";
        return (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, marginLeft: i ? -1 : 0, padding: "5px 10px", font: `bold 11px/1 ${s.px}`, color: col,
            textShadow: sel ? "0 -1px 0 rgba(0,0,0,.25)" : "0 1px 0 #fff", background: sel ? s.segOn : s.segOff, border: `1px solid ${sel ? "#1d6aa5" : "#bbb"}`,
            borderRadius: i === 0 ? "4px 0 0 4px" : i === items.length - 1 ? "0 4px 4px 0" : 0, boxShadow: sel || pressed === k ? "inset 0 1px 3px rgba(0,0,0,.3)" : undefined }}>
            {label ?? <NetLogo net={k as Net} c={col} size={12} />}{n ? <span>{n}</span> : null}
          </span>
        );
      })}
    </div>
  );
};

/** badges: the chain badge on every image (and no " · Robinhood" text, which the badge replaced); filter: the chain-filter chips */
export const TokenList: React.FC<{ rows: number; highlight?: number; appear?: (i: number) => number; coins?: DemoCoin[]; badges?: boolean; filter?: ChainFilter;
  /** the chips after All (default Solana · Robinhood); the chip being tapped */
  filterChains?: readonly Net[]; filterPressed?: ChainFilter | null }> = ({ rows, highlight = -1, appear = () => 1, coins = DEMO_COINS, badges, filter, filterChains = ["solana", "robinhood"], filterPressed }) => {
  const s = useSkin();
  const craft = s.name !== "2012";
  // the filter only narrows the list; the counts are of every coin loaded
  const shown = filter && filter !== "all" ? coins.filter((c) => chainOf(c) === filter) : coins;
  return (
    <Panel head="Launched on tweetpad" right={<Seg items={["New", "Hot", "Mcap", "↻"]} on={0} />} width={363} style={{ paddingBottom: 4 }}>
      {filter ? <ChainFilterRow on={filter} coins={coins} chains={filterChains} pressed={filterPressed} /> : null}
      <div style={{ margin: filter ? "-8px -10px 0" : "0 -10px" }}>
        {shown.slice(0, rows).map((c, i) => {
          const a = appear(i);
          return (
            <div key={c.symbol} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderTop: i ? `1px solid ${craft ? s.line : "#e8e8e8"}` : undefined,
              background: i === highlight ? (craft ? "rgba(60,110,120,.35)" : "#f5f8fa") : undefined, opacity: a, transform: `translateY(${(1 - a) * -14}px)` }}>
              <CoinImg c={c} size={40} badge={badges} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <b style={{ font: `bold 14px/1.2 ${s.px}`, color: craft ? s.text : "#333" }}>{c.name}</b>
                <span style={{ font: `12px/1 ${s.px}`, color: "#999" }}>${c.symbol}{c.age ? ` · ${c.age}` : ""}{c.robinhood && !badges ? <span style={{ color: craft ? "#ccff00" : "#5a7a00" }}> · Robinhood</span> : null}</span>
              </div>
              <b style={{ font: `bold 12px/1 ${s.px}`, color: craft ? s.gold : "#333" }}>—</b>
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

/** deterministic illustrative candles. No axis labels, no prices. */
const candles = Array.from({ length: 26 }, (_, i) => {
  const base = 70 - i * 1.6 - Math.sin(i * 0.9) * 8;
  const o = base + Math.sin(i * 2.1) * 6, c = base - Math.cos(i * 1.7) * 7;
  return { o, c, h: Math.min(o, c) - 4 - (i % 3) * 3, l: Math.max(o, c) + 3 + (i % 4) * 2 };
});

/** the coin screen. chain="robinhood": 0x address, "Trade on Uniswap ↗" + "Explorer ↗" (renderCoinHead), no pump.fun link,
 * then renderCoinFees: the fee split and the viewer's holder rewards (a DEMO amount: never a real figure) */
export const CoinView: React.FC<{ drawT: number; chain?: Net; holders?: number; rewards?: string; rewardsClaimable?: boolean;
  /** another demo coin than $WOW, its chain badge on the image, and the trade box (renderTrade) that sits right under the chart */
  coin?: DemoCoin; badge?: boolean; trade?: React.ReactNode;
  /** Ethereum only: the creator's fee in % (renderCoinFees' ethereum branch) */
  feePct?: number }> = ({ drawT, chain = "solana", holders = 30, rewards = "0.00120 ETH", rewardsClaimable = true, coin, badge, trade, feePct = 1 }) => {
  const s = useSkin();
  const craft = s.name !== "2012";
  const c = coin ?? DEMO_COINS[0];
  const shown = Math.floor(candles.length * drawT);
  const rh = chain !== "solana"; // any EVM chain: 0x address, the fee split, holder rewards
  // BNB Chain / Base show the shipped renderCoinHead: "[logo] BNB Chain · 10m · 0x…" and the "Uniswap ↗" / "Explorer ↗" chips
  // (the Robinhood scenes of films 3–4 keep the strings they were made with)
  const newHead = chain === "bnb" || chain === "base" || chain === "ethereum";
  const chip = (t: string) => <span key={t} style={{ padding: "3px 7px", font: `bold 11px/1 ${s.px}`, color: craft ? s.text : "#333", background: craft ? "rgba(40,72,82,.55)" : "linear-gradient(#fff,#ededed)", border: `1px solid ${craft ? s.line : "#ccc"}`, borderRadius: 4 }}>{t}</span>;
  return (
    <Panel width={330} style={{ padding: "8px 10px 10px", gap: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ font: `12px/1 ${s.px}`, color: s.accent }}>← Tokens</span>
        <Seg items={["1m", "5m", "15m", "1h"]} on={1} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <CoinImg c={c} size={44} badge={badge} badgeLeft />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
            <b style={{ font: `bold 17px/1.1 ${s.px}`, color: craft ? s.text : "#333" }}>{c.symbol}</b>
            <span style={{ font: `14px/1.1 ${s.px}`, color: "#999" }}>{c.name}</span>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center", font: `12px/1 ${s.px}`, color: "#999" }}>
            {newHead ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><NetLogo net={chain} c="#999" size={12} />{EVM_NETS[chain as EvmNet].name}</span> : null}
            {c.age || "now"} <span style={{ padding: "2px 6px", color: s.accent, background: craft ? "rgba(111,231,216,.08)" : "#f2f8fc", border: `1px solid ${craft ? "rgba(111,231,216,.3)" : "#cfe3f1"}`, borderRadius: 3 }}>{rh ? "0xxx…xxxx" : "xxxx…xxxx"} ⧉</span>
          </div>
        </div>
      </div>
      <svg width={306} height={140} style={{ background: craft ? "rgba(5,12,14,.6)" : "#fff", border: `1px solid ${craft ? s.panelLo : "#e3e3e3"}`, borderRadius: craft ? 0 : 4 }}>
        {[35, 70, 105].map((y) => <line key={y} x1={0} x2={306} y1={y} y2={y} stroke={craft ? "rgba(140,200,210,.12)" : "#eee"} />)}
        {candles.slice(0, shown).map((k, i) => {
          const x = 14 + i * 11; const up = k.c < k.o; const col = up ? s.ok : s.bad;
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={k.h} y2={k.l} stroke={col} strokeWidth={1} />
              <rect x={x - 3.5} width={7} y={Math.min(k.o, k.c)} height={Math.max(2, Math.abs(k.o - k.c))} fill={col} />
            </g>
          );
        })}
      </svg>
      {trade}
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        {/* the live-trades chip is Solana-only (PumpPortal); Robinhood coins would read OFFLINE, so the film leaves it out */}
        {rh ? null : <span style={{ padding: "2px 6px", font: `bold 10px/1 ${s.px}`, letterSpacing: ".04em", color: s.ok, border: `1px solid ${craft ? "rgba(125,255,154,.5)" : "#a9dcb5"}`, borderRadius: 3 }}>LIVE</span>}
        {newHead ? [chip("Uniswap ↗"), chip("Explorer ↗")] : rh ? [chip("Trade on Uniswap ↗"), chip("Explorer ↗")] : chip("Trade on pump.fun ↗")}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 10px", background: craft ? "rgba(5,12,14,.45)" : "#f5f8fa", border: `1px solid ${craft ? s.line : "#e1e8ed"}`, borderRadius: craft ? 0 : 5 }}>
        <span style={{ flex: 1, padding: "6px 8px", font: `12px/1.2 ${FONTS.code}`, color: s.accent, background: craft ? "rgba(0,0,0,.35)" : "#fff", border: `1px solid ${craft ? s.line : "#cfe3f1"}`, borderRadius: 4 }}>{rh ? "tweetpad.io/c/0x…" : "tweetpad.io/c/xxxx…"}</span>
        <Btn style={{ padding: "5px 9px", fontSize: 11 }}>Copy</Btn>
        <Btn primary style={{ padding: "5px 9px", fontSize: 11, whiteSpace: "nowrap" }}>Post on X</Btn>
      </div>
      {chain === "ethereum" ? (
        // renderCoinFees, Ethereum: the creator's fee from the fixed fee hook (no holder split, no holder rewards)
        <div style={{ font: craft ? `14px/1.2 ${s.mono}` : `12px/1.3 ${s.px}`, color: craft ? s.dim : "#999" }}>
          <b style={{ color: craft ? s.text : "#333" }}>{feePct}% trading fee</b> · to its creator, in ETH and ${c.symbol}
          <span style={{ display: "block", marginTop: 3, font: craft ? `13px/1.2 ${s.mono}` : `11px/1.3 ${s.px}`, color: craft ? s.dim : "#aaa" }}>
            Fixed fee hook, launched through <span style={{ textDecoration: "underline", textDecorationColor: craft ? "currentColor" : "#ccc", textUnderlineOffset: 2 }}>Launch Party</span></span>
        </div>
      ) : rh ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ font: craft ? `14px/1.2 ${s.mono}` : `12px/1.3 ${s.px}`, color: craft ? s.dim : "#999" }}>
            <b style={{ color: craft ? s.text : "#333" }}>1% trading fee</b> · creator {100 - holders}% · holders {holders}%
            <span style={{ display: "block", marginTop: 3, font: craft ? `13px/1.2 ${s.mono}` : `11px/1.3 ${s.px}`, color: craft ? s.dim : "#aaa" }}>
              10% of the fee to <span style={{ color: craft ? s.accent : "#0084b4" }}>Launch Party SDK ↗</span></span>
          </div>
          {holders > 0 ? <Rewards label="Your holder rewards" amount={rewards} compact claimable={rewardsClaimable} /> : null}
        </div>
      ) : null}
    </Panel>
  );
};

/** .rewards: "CREATOR REWARDS · 0.00340 ETH · [Claim]" (amounts in the film are demo values) */
export const Rewards: React.FC<{ label: string; amount: string; compact?: boolean; claimable?: boolean; claiming?: boolean; pressed?: boolean }> = ({ label, amount, compact, claimable = true, claiming, pressed }) => {
  const s = useSkin();
  const craft = s.name !== "2012";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: compact ? 0 : 10, padding: "9px 10px", background: craft ? "rgba(5,12,14,.45)" : "#f7f9fa", border: `1px solid ${craft ? s.line : "#e3e3e3"}`, borderRadius: craft ? 0 : 5 }}>
      <span style={{ flex: 1, font: craft ? `14px/1 ${s.mono}` : `bold 11px/1 ${s.px}`, color: craft ? s.gold : "#999", textTransform: "uppercase", letterSpacing: ".03em" }}>{label}</span>
      <b style={{ font: craft ? `16px/1.2 ${s.mono}` : `bold 15px/1.2 ${s.px}`, color: craft ? s.text : "#333" }}>{amount}</b>
      <Btn primary={claimable && !claiming} pressed={pressed} style={{ padding: "5px 10px", fontSize: 11, opacity: claimable || claiming ? 1 : 0.6 }}>{claiming ? "Claiming…" : "Claim"}</Btn>
    </div>
  );
};

/** the Profile tab with no Solana wallet connected and an EVM wallet connected (renderProfile + evmProfileSection) */
export const RobinhoodProfile: React.FC<{ address: string; rewards: string; claimable: boolean; claiming?: boolean; pressed?: boolean;
  status?: { tone: "ok" | "warn"; text: string; tx?: boolean } | null; coin: DemoCoin; holders: number }> = ({ address, rewards, claimable, claiming, pressed, status, coin, holders }) => {
  const s = useSkin();
  const craft = s.name !== "2012";
  const sec = (children: React.ReactNode) => <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "12px 2px 5px", font: craft ? `14px/1 ${s.mono}` : `bold 12px/1.2 ${s.px}`, color: craft ? s.dim : "#666", textTransform: craft ? "uppercase" : undefined }}>{children}</div>;
  const rh = `url(${staticFile("brand/robinhood.png")})`;
  return (
    <Panel head="Profile" width={363}>
      <Btn primary style={{ padding: "9px 12px", fontSize: 13 }}>Connect a Solana wallet</Btn>
      <div>
        {sec(<><span style={{ width: 15, height: 15, background: craft ? s.text : "#333", WebkitMaskImage: rh, maskImage: rh, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }} />Robinhood Chain</>)}
        <div style={{ display: "flex", alignItems: "center", gap: 6, font: craft ? `15px/1 ${s.mono}` : `12px/1.2 ${s.px}`, color: craft ? s.accent : "#999" }}>
          {address}<span style={{ color: s.accent }}>⧉</span><span style={{ color: s.accent }}>↗</span>
        </div>
        <Rewards label="Creator rewards" amount={rewards} claimable={claimable} claiming={claiming} pressed={pressed} />
        {status ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, font: craft ? `15px/1.15 ${s.mono}` : `12px/1.3 ${s.px}`, color: status.tone === "ok" ? s.ok : craft ? s.gold : "#b07a00" }}>
            {status.text}
            {status.tx ? <span style={{ padding: "3px 7px", font: `bold 11px/1 ${s.px}`, color: craft ? s.text : "#333", background: craft ? "rgba(40,72,82,.55)" : "linear-gradient(#fff,#ededed)", border: `1px solid ${craft ? s.line : "#ccc"}`, borderRadius: 4 }}>Tx ↗</span> : null}
          </div>
        ) : null}
        {sec(<>Your Robinhood coins · 1</>)}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: `1px solid ${craft ? s.line : "#e8e8e8"}` }}>
          <CoinImg c={coin} size={40} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <b style={{ font: `bold 14px/1.2 ${s.px}`, color: craft ? s.text : "#333" }}>{coin.name}</b>
            <span style={{ font: `12px/1 ${s.px}`, color: "#999" }}>${coin.symbol} · {coin.age} · {100 - holders}% yours</span>
          </div>
          <b style={{ font: `bold 12px/1 ${s.px}`, color: craft ? s.gold : "#333" }}>—</b>
          <span style={{ font: `bold 11px/1 ${s.px}`, color: s.accent }}>Share</span>
        </div>
      </div>
    </Panel>
  );
};

/** the Profile tab with a Solana wallet connected (renderProfile): profileCard, rewardsBox and autoClaimBox (auto-claim, film 10).
 * auto: null = Off / "Turn on"; else "On · from <minSol> SOL" / "Turn off". Amounts are demo values. */
export const SolanaProfile: React.FC<{ address: string; rewards: string; auto: { minSol: string } | null; pressed?: boolean;
  status?: { tone: "ok" | "warn"; text: string } | null; coin: DemoCoin }> = ({ address, rewards, auto, pressed, status, coin }) => {
  const s = useSkin();
  const craft = s.name !== "2012";
  const row = (label: string, value: string, btn: React.ReactNode, info?: boolean, top = 10) => (
    // .rewards (2012): the label on the left, the value right-aligned and filling the row, then its buttons
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: top, padding: "9px 10px", background: craft ? "rgba(5,12,14,.45)" : "#f7f9fa", border: `1px solid ${craft ? s.line : "#e3e3e3"}`, borderRadius: craft ? 0 : 5 }}>
      <span style={{ flex: "none", font: craft ? `14px/1 ${s.mono}` : `bold 11px/1 ${s.px}`, color: craft ? s.gold : "#999", textTransform: "uppercase", letterSpacing: ".03em" }}>{label}</span>
      <b style={{ flex: 1, minWidth: 0, textAlign: "right", whiteSpace: "nowrap", font: craft ? `16px/1.2 ${s.mono}` : `bold 15px/1.2 ${s.px}`, color: craft ? s.text : "#333" }}>{value}</b>
      {info ? <span style={{ padding: "3px 6px", font: `bold 11px/1 ${s.px}`, color: craft ? s.text : "#333", background: craft ? "rgba(40,72,82,.55)" : "linear-gradient(#fff,#ededed)", border: `1px solid ${craft ? s.line : "#ccc"}`, borderRadius: 4 }}>ⓘ</span> : null}
      {btn}
    </div>
  );
  return (
    <Panel head="Profile" right={<Tag dim style={{ background: "#fff", boxShadow: "inset 0 0 0 1px #ddd" }}>UNVERIFIED</Tag>} width={420}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 48, height: 48, flex: "none", borderRadius: craft ? 0 : 5, background: "linear-gradient(135deg,#ffd27a,#e8a33c)", boxShadow: "0 1px 2px rgba(0,0,0,.2)" }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
          <b style={{ font: `bold 15px/1.2 ${s.px}`, color: craft ? s.text : "#333" }}>Anonymous</b>
          <Btn style={{ padding: "4px 8px", fontSize: 11 }}>Verify with X</Btn>
          <span style={{ display: "inline-flex", gap: 4, font: craft ? `15px/1 ${s.mono}` : `12px/1.2 ${s.px}`, color: "#999" }}>{address}<span style={{ color: s.accent }}>⧉</span><span style={{ color: s.accent }}>↗</span></span>
        </div>
      </div>
      <div>
        {row("Creator rewards", rewards, <Btn primary style={{ padding: "5px 10px", fontSize: 11 }}>Claim</Btn>)}
        {/* .rewards.auto: right under the creator rewards it claims */}
        {row("Auto-claim", auto ? `On · from ${auto.minSol} SOL` : "Off", <Btn primary={!auto} pressed={pressed} style={{ padding: "5px 10px", fontSize: 11, whiteSpace: "nowrap" }}>{auto ? "Turn off" : "Turn on"}</Btn>, true, 6)}
        {status ? <div style={{ marginTop: 7, font: craft ? `15px/1.15 ${s.mono}` : `12px/1.3 ${s.px}`, color: status.tone === "ok" ? s.ok : craft ? s.gold : "#b07a00" }}>{status.text}</div> : null}
        <div style={{ margin: "12px 2px 5px", font: craft ? `14px/1 ${s.mono}` : `bold 12px/1.2 ${s.px}`, color: craft ? s.dim : "#666" }}>Your coins · 1</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: `1px solid ${craft ? s.line : "#e8e8e8"}` }}>
          <CoinImg c={coin} size={40} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <b style={{ font: `bold 14px/1.2 ${s.px}`, color: craft ? s.text : "#333" }}>{coin.name}</b>
            <span style={{ font: `12px/1 ${s.px}`, color: "#999" }}>${coin.symbol} · {coin.age}</span>
          </div>
          <b style={{ font: `bold 12px/1 ${s.px}`, color: craft ? s.gold : "#333" }}>—</b>
        </div>
      </div>
    </Panel>
  );
};

export const FeedView: React.FC<{ text: string; tagged: boolean; posted: number }> = ({ text, tagged, posted }) => {
  const s = useSkin();
  const craft = s.name !== "2012";
  const c = DEMO_COINS[0];
  const post = (t: string, who: string, time: string, coin?: DemoCoin, a = 1) => (
    <div style={{ display: "flex", gap: 10, padding: 10, borderTop: `1px solid ${craft ? s.line : "#e8e8e8"}`, opacity: a, transform: `translateY(${(1 - a) * -20}px)` }}>
      {who === "Agent Inu" ? <Img src={staticFile("brand/agent-inu.jpg")} style={{ width: 36, height: 36, borderRadius: craft ? 0 : 5, objectFit: "cover", flex: "none" }} />
        : <span style={{ width: 36, height: 36, borderRadius: craft ? 0 : 5, background: craft ? "#1d3a3f" : "linear-gradient(135deg,#ffd27a,#e8a33c)", flex: "none" }} />}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex" }}>
          <b style={{ font: `bold 13px/1.2 ${s.px}`, color: craft ? s.text : "#333" }}>{who}</b>
          <span style={{ marginLeft: "auto", font: `12px/1 ${s.px}`, color: "#999" }}>{time}</span>
        </div>
        <p style={{ margin: "2px 0 0", font: craft ? `15px/1.1 ${s.mono}` : `14px/1.3 ${FONTS.serif}`, color: craft ? s.text : "#333" }}
          dangerouslySetInnerHTML={{ __html: t.replace(/([#$][A-Za-z0-9]+)/g, `<span style="color:${s.accent}">$1</span>`) }} />
        {coin ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, padding: 8, background: craft ? "rgba(5,12,14,.45)" : "#fff", border: `1px solid ${craft ? s.line : "#e1e8ed"}`, borderRadius: craft ? 0 : 5 }}>
            <CoinImg c={coin} size={36} />
            <div style={{ flex: 1 }}><b style={{ display: "block", font: `bold 13px/1.2 ${s.px}` }}>${coin.symbol}</b><small style={{ font: `12px/1.2 ${s.px}`, color: "#999" }}>{coin.name}</small></div>
            <b style={{ font: `bold 12px/1 ${s.px}` }}>—</b>
          </div>
        ) : null}
      </div>
    </div>
  );
  return (
    <Panel head="Feed" right={<Seg items={["↻"]} on={-1} />} width={363} style={{ paddingBottom: 0, gap: 0 }}>
      <div style={{ margin: "0 -10px", padding: 10, display: "flex", flexDirection: "column", gap: 6, background: craft ? "transparent" : "#f5f8fa", borderBottom: `1px solid ${craft ? s.line : "#e8e8e8"}` }}>
        <div style={{ minHeight: 48, padding: 8, font: craft ? `16px/1.1 ${s.mono}` : `14px/1.3 ${s.px}`, color: text ? s.text : "#aaa", background: s.input, border: `1px solid ${text ? "#56b4ef" : "#ccc"}`, borderRadius: craft ? 0 : 4 }}>
          {text || "What’s happening?"}
        </div>
        {tagged ? (
          <span style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 6px 3px 3px", font: `bold 12px/1 ${s.px}`, background: craft ? "rgba(40,72,82,.6)" : "#fff", border: `1px solid ${craft ? s.line : "#cfe3f1"}`, borderRadius: 12 }}>
            <Img src={staticFile(c.img!)} style={{ width: 18, height: 18, borderRadius: "50%" }} />${c.symbol} <span style={{ color: "#aaa" }}>×</span>
          </span>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ padding: "5px 9px", font: `bold 11px/1 ${s.px}`, color: s.accent, background: craft ? "transparent" : "linear-gradient(#fff,#ededed)", border: `1px solid ${craft ? s.line : "#ccc"}`, borderRadius: 12 }}>$ {tagged ? "Change coin" : "Tag a coin"}</span>
          <span style={{ flex: 1 }} />
          <span style={{ font: `12px/1 ${s.px}`, color: "#999" }}>{140 - text.length}</span>
          <Btn primary style={{ padding: "5px 9px", fontSize: 11 }}>Tweet</Btn>
        </div>
      </div>
      <div style={{ margin: "0 -10px" }}>
        {posted > 0 ? post("gm from inside the tweet #tweetpad $WOW", "you", "now", c, posted) : null}
        {post("Such launch. Very wow. #tweetpad", "Agent Inu", "2m")}
      </div>
    </Panel>
  );
};

export { Tag };

/* ---------- the trade box on the coin page (renderTrade), 2012 skin: the dev buy box's look, green Buy and red Sell ----------
 * Built from exported parts (TradeTop, TradeAmountRow, TradeQuote, TradeBal, JitoRow, TradeAction) so a film can lift each part
 * out on its own (film 7's floating panels). TradeBox with no new props renders exactly as films 4–6 were made. */
export type TradeSide = "buy" | "sell";
/** .trade-est: idle hint, "Quoting…", a quote (≈ out [$usd] · min [· −x% vs market]), or what you hold (Sell, idle) */
export type TradeEst = { kind: "idle" } | { kind: "quoting" } | { kind: "quote"; out: string; min: string; usd?: string; gap?: string } | { kind: "hold"; qty: string };
export type TradeStatus = { tone: "warn" | "ok" | "bad"; text: string; tx?: boolean };
/** BUY_PRESETS (sol / rh) and the Sell chips */
export const TRADE_CHIPS = { sol: ["0.05", "0.1", "0.5", "1"], rh: ["0.001", "0.005", "0.01", "0.05"], sell: ["25%", "50%", "100%"] } as const;
/** JITO_SPEEDS (tweetpad.js): the tip per speed */
export type JitoSpeed = "fast" | "turbo" | "ultra";
export const JITO_SPEEDS: Record<JitoSpeed, { label: string; sol: string }> = { fast: { label: "Fast", sol: "0.0001" }, turbo: { label: "Turbo", sol: "0.0005" }, ultra: { label: "Ultra", sol: "0.001" } };

/** the jito-row checkbox: a native checkbox with the 2012 accent (#0084b4) */
export const Check: React.FC<{ on: boolean; pressed?: boolean }> = ({ on, pressed }) => (
  <span style={{ flex: "none", width: 13, height: 13, borderRadius: 3, display: "grid", placeItems: "center", boxSizing: "border-box",
    background: on ? "#0084b4" : "#fff", border: `1px solid ${on ? "#0084b4" : "#767676"}`, transform: pressed ? "scale(.88)" : undefined }}>
    {on ? <svg width={9} height={9} viewBox="0 0 10 10"><path d="M1.8 5.2 4 7.4 8.4 2.6" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
  </span>
);
/** .jito-speed (trade extras, 2012 style): Fast · Turbo · Ultra, the picked one in 2012 blue */
export const JitoSpeedPicker: React.FC<{ speed: JitoSpeed; pressed?: JitoSpeed | null }> = ({ speed, pressed }) => {
  const s = useSkin();
  const keys: JitoSpeed[] = ["fast", "turbo", "ultra"];
  return (
    <span style={{ display: "inline-flex" }}>
      {keys.map((k, i) => {
        const on = k === speed;
        return (
          <span key={k} style={{ marginLeft: i ? -1 : 0, padding: "3px 8px", font: `bold 11px/1 ${s.px}`, color: on ? "#fff" : "#555", textShadow: on ? "0 -1px 0 rgba(0,0,0,.25)" : "0 1px 0 #fff",
            background: on ? "linear-gradient(#2c8fd6, #4aa9e9)" : "linear-gradient(#fff, #e6e6e6)", border: `1px solid ${on ? "#1d6aa5" : "#bbb"}`,
            borderRadius: i === 0 ? "4px 0 0 4px" : i === keys.length - 1 ? "0 4px 4px 0" : 0, boxShadow: on || pressed === k ? "inset 0 1px 3px rgba(0,0,0,.3)" : undefined,
            position: "relative", zIndex: on ? 1 : 0 }}>{JITO_SPEEDS[k].label}</span>
        );
      })}
    </span>
  );
};
/** .jito-row: "⚡ Bundle with Jito" (launch, under the dev-buy estimate) or "⚡ Jito bundle" (compact, the trade box).
 * speed: the shipped speed picker and its tip in the hint (renderJitoRow / renderTrade); left out = the row as films 4–6 show it. */
export const JitoRow: React.FC<{ on: boolean; compact?: boolean; pressed?: boolean; style?: React.CSSProperties; speed?: JitoSpeed; speedPressed?: JitoSpeed | null }> = ({ on, compact, pressed, style, speed, speedPressed }) => {
  const s = useSkin();
  const craft = s.name !== "2012";
  const tip = speed ? JITO_SPEEDS[speed].sol : "0.0001";
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px 8px", font: craft ? `14px/1.2 ${s.mono}` : `12px/1.3 ${s.px}`, color: craft ? s.dim : "#999", ...style }}>
      <Check on={on} pressed={pressed} />
      <span style={{ fontWeight: craft ? "normal" : "bold", color: on ? (craft ? s.text : "#333") : craft ? s.dim : "#999" }}>{compact ? "⚡ Jito bundle" : "⚡ Bundle with Jito"}</span>
      {speed ? <JitoSpeedPicker speed={speed} pressed={speedPressed} /> : null}
      <span>{compact ? `+${tip} SOL tip · first in its block, private` : `+${tip} SOL tip · lands first in its block, out of the public mempool`}</span>
    </div>
  );
};

/** .trade-top: Buy | Sell and the Slippage pill */
export const TradeTop: React.FC<{ side: TradeSide; slip?: number; sidePressed?: TradeSide | null }> = ({ side, slip = 5, sidePressed }) => {
  const s = useSkin();
  const tab = (k: TradeSide) => {
    const on = k === side;
    const grad = k === "buy" ? "linear-gradient(#62c462, #51a351)" : "linear-gradient(#ee5f5b, #bd362f)";
    return (
      <span key={k} style={{ padding: "6px 16px", marginLeft: k === "sell" ? -1 : 0, font: `bold 13px/1 ${s.px}`, borderRadius: k === "buy" ? "4px 0 0 4px" : "0 4px 4px 0",
        color: on ? "#fff" : "#555", textShadow: on ? "0 -1px 0 rgba(0,0,0,.25)" : "0 1px 0 #fff", background: on ? grad : "linear-gradient(#fff, #e6e6e6)",
        border: `1px solid ${on ? (k === "buy" ? "#3e8a3e" : "#a02622") : "#bbb"}`, boxShadow: on || sidePressed === k ? "inset 0 1px 3px rgba(0,0,0,.25)" : undefined,
        position: "relative", zIndex: on ? 1 : 0 }}>{k === "buy" ? "Buy" : "Sell"}</span>
    );
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ display: "inline-flex" }}>{tab("buy")}{tab("sell")}</span>
      <span style={{ marginLeft: "auto", padding: "5px 8px", font: `11px/1 ${s.px}`, color: "#777", background: "#fff", border: "1px solid #ddd", borderRadius: 4 }}>Slippage {slip}%</span>
    </div>
  );
};
/** .trade-row: the amount (unit inside) and the preset chips. chips: override the presets (e.g. the shipped 0.05 · 0.1 · 0.5 · Max) */
export const TradeAmountRow: React.FC<{ side: TradeSide; symbol: string; chain?: Net; amount?: string; caret?: boolean; chip?: number; chipsDisabled?: boolean;
  chips?: readonly string[]; chipPressed?: number | null }> = ({ side, symbol, chain = "solana", amount = "", caret, chip = -1, chipsDisabled, chips: chipsOverride, chipPressed }) => {
  const s = useSkin();
  const buy = side === "buy";
  const en = chain === "solana" ? null : EVM_NETS[chain];
  const unit = buy ? (en ? en.symbol : "SOL") : "$" + symbol;
  const chips: readonly string[] = chipsOverride ?? (buy ? (en ? en.tradePresets : TRADE_CHIPS.sol) : TRADE_CHIPS.sell);
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <div style={{ flex: 1, minWidth: 80, display: "flex", alignItems: "center", background: "#fff", border: `1px solid ${caret ? "#56b4ef" : "#ccc"}`, borderRadius: 4,
        boxShadow: caret ? "inset 0 1px 2px rgba(0,0,0,.1), 0 0 5px rgba(82,168,236,.6)" : "inset 0 1px 2px rgba(0,0,0,.1)" }}>
        <span style={{ flex: 1, minWidth: 0, padding: "8px 4px 8px 10px", font: `16px/1 ${s.px}`, color: amount ? "#333" : "#aaa", whiteSpace: "nowrap" }}>
          {amount || "0"}{caret ? <span style={{ display: "inline-block", width: 1.5, height: "1em", background: "#333", marginLeft: 1, verticalAlign: "-2px" }} /> : null}
        </span>
        <span style={{ flex: "none", paddingRight: 6, font: `bold 12px/1 ${s.px}`, color: "#999" }}>{unit}</span>
      </div>
      <span style={{ display: "inline-flex", opacity: chipsDisabled ? 0.5 : 1 }}>
        {chips.map((t, i) => {
          const on = i === chip;
          return (
            <span key={t} style={{ display: "grid", placeItems: "center", padding: "0 10px", marginLeft: i ? -1 : 0, font: `bold 12px/1 ${s.px}`, color: on ? "#fff" : "#555",
              textShadow: on ? "0 -1px 0 rgba(0,0,0,.25)" : "0 1px 0 #fff", background: on ? "linear-gradient(#2c8fd6, #4aa9e9)" : "linear-gradient(#fff, #e6e6e6)",
              border: `1px solid ${on ? "#1d6aa5" : "#bbb"}`, borderRadius: i === 0 ? "4px 0 0 4px" : i === chips.length - 1 ? "0 4px 4px 0" : 0,
              boxShadow: on || chipPressed === i ? "inset 0 1px 3px rgba(0,0,0,.3)" : undefined, position: "relative", zIndex: on ? 1 : 0 }}>{t}</span>
          );
        })}
      </span>
    </div>
  );
};
/** .trade-est */
export const TradeQuote: React.FC<{ est: TradeEst; side: TradeSide; symbol: string; chain?: Net; feePct?: number }> = ({ est, side, symbol, chain = "solana", feePct = 1 }) => {
  const s = useSkin();
  const buy = side === "buy", rh = chain !== "solana";
  const native = chain === "solana" ? "SOL" : EVM_NETS[chain].symbol;
  return (
    <div style={{ minHeight: 18, font: `13px/1.35 ${s.px}`, color: "#333" }}>
      {est.kind === "quoting" ? <span style={{ color: "#999" }}>Quoting…</span>
        : est.kind === "quote" ? <span>≈ <b style={{ color: "#3e8a3e" }}>{est.out} {buy ? "$" + symbol : native}</b><span style={{ color: "#999" }}>{est.usd ? " " + est.usd : ""} · min {est.min}</span>
            {est.gap ? <span style={{ color: "#999" }}> · −{est.gap}% vs market</span> : null}</span>
        : est.kind === "hold" ? <span style={{ color: "#999" }}>You hold <b style={{ color: "#333" }}>{est.qty} ${symbol}</b></span>
        : <span style={{ color: "#999" }}>{chain === "ethereum" ? `${feePct}% coin fee, to its creator · tweetpad takes nothing`
          : rh ? "1% coin fee, to its creator and holders · tweetpad takes nothing" : "pump.fun’s fees only · tweetpad takes nothing"}</span>}
    </div>
  );
};
/** .trade-bal: "Balance 1.2 SOL · $148" (buy) / "You hold 2.7M $JACK · $11.4" (sell) */
export type TradeBalance = { label: "Balance" | "You hold"; value: string; usd?: string };
export const TradeBal: React.FC<{ bal: TradeBalance }> = ({ bal }) => {
  const s = useSkin();
  return <div style={{ font: `12px/1.3 ${s.px}`, color: "#999" }}>{bal.label} <b style={{ color: "#333" }}>{bal.value}</b>{bal.usd ? " · " + bal.usd : ""}</div>;
};
/** the trade button and the status line under it */
export const TradeAction: React.FC<{ button: string; sell?: boolean; pressed?: boolean; disabled?: boolean; status?: TradeStatus | null }> = ({ button, sell, pressed, disabled, status }) => {
  const s = useSkin();
  return (
    <>
      <Btn primary={!sell} pressed={pressed} style={{ padding: "9px 12px", fontSize: 13, opacity: disabled ? 0.55 : 1,
        ...(sell ? { color: "#fff", background: pressed ? "#b0302a" : "linear-gradient(#ee5f5b, #bd362f)", border: "1px solid #a02622", borderBottomColor: "#a02622", textShadow: "0 -1px 0 rgba(0,0,0,.25)" } : {}) }}>{button}</Btn>
      {status ? (
        <div style={{ marginTop: -2, font: `12px/1.35 ${s.px}`, color: status.tone === "ok" ? "#3e8a3e" : status.tone === "bad" ? "#bd362f" : "#c09853" }}>
          {status.text}{status.tx ? <span style={{ color: "#0084b4" }}> Tx ↗</span> : null}
        </div>
      ) : null}
    </>
  );
};

export type TradeBoxProps = {
  side: TradeSide; symbol: string; chain?: Net;
  slip?: number; amount?: string; caret?: boolean; chip?: number; est: TradeEst;
  /** Solana, not graduated: the Jito row */
  jito?: boolean;
  /** "Buy $JACK" / "Sell $JACK", "Connect wallet to trade", "Working…" */
  button: string; buttonKind?: "trade" | "connect"; pressed?: boolean; disabled?: boolean;
  status?: TradeStatus | null;
  /** the Sell chips with nothing held (disabled) */
  chipsDisabled?: boolean;
  /** film-only: the tab being tapped */
  sidePressed?: TradeSide | null;
  /** shipped extras (film 7; left out = films 4–6): preset override (0.05 · 0.1 · 0.5 · Max), the balance line, the Jito speed */
  chips?: readonly string[]; bal?: TradeBalance | null; jitoSpeed?: JitoSpeed;
  /** film 7: a part's opacity while it is lifted out as a floating panel (0 = gone from the card); keeps the box's layout */
  ghost?: Partial<Record<"top" | "amount" | "quote" | "bal" | "jito" | "action", number>>;
  /** Ethereum (film 10): the coin's creator fee in %, for the idle fee line */
  feePct?: number;
};
export const TradeBox: React.FC<TradeBoxProps> = ({ side, symbol, chain = "solana", slip = 5, amount = "", caret, chip = -1, est, jito, button, buttonKind = "trade", pressed, disabled, status, chipsDisabled, sidePressed, chips, bal, jitoSpeed, ghost = {}, feePct }) => {
  const s = useSkin();
  const craft = s.name !== "2012";
  const rh = chain !== "solana"; // rh: any EVM chain (its own symbol and tradePresets)
  const sell = buttonKind === "trade" && side !== "buy";
  const g = (k: keyof NonNullable<TradeBoxProps["ghost"]>, el: React.ReactNode) =>
    (ghost[k] === undefined ? el : <div style={{ opacity: ghost[k], display: "flex", flexDirection: "column", gap: 8 }}>{el}</div>);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, background: craft ? "rgba(5,12,14,.45)" : "#f7f9fa", border: `1px solid ${craft ? s.line : "#e3e3e3"}`, borderRadius: craft ? 0 : 5 }}>
      {g("top", <TradeTop side={side} slip={slip} sidePressed={sidePressed} />)}
      {g("amount", <TradeAmountRow side={side} symbol={symbol} chain={chain} amount={amount} caret={caret} chip={chip} chipsDisabled={chipsDisabled} chips={chips} />)}
      {g("quote", <TradeQuote est={est} side={side} symbol={symbol} chain={chain} feePct={feePct} />)}
      {bal ? g("bal", <TradeBal bal={bal} />) : null}
      {jito !== undefined && !rh ? g("jito", <JitoRow on={jito} compact speed={jitoSpeed} />) : null}
      {g("action", <TradeAction button={button} sell={sell} pressed={pressed} disabled={disabled} status={status} />)}
    </div>
  );
};
