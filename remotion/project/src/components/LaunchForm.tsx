/**
 * The launch panel (#launch in embed.html), copy verbatim from embed.html + assets/tweetpad.js.
 * chain="solana" launches on pump.fun. chain="robinhood" is the shipped EVM flow (renderLaunch, renderEvmWallet,
 * renderFeeBox, renderDevBuy, onLaunchEvm): Launch Party's live solo launcher on Robinhood Chain, a flat 1% trading fee
 * (10% of it to Launch Party, the rest split between creator and holders), a launch fee + gas, dev buy 0–1 ETH, every
 * launch checked against the live launcher before the wallet signs. The network is picked in the tab bar (Hud) and in
 * the Launch header (NetSeg); the two stay in sync.
 */
import React from "react";
import { Img, staticFile } from "remotion";
import { Btn, EvmNet, EVM_NETS, Input, Net, NetSeg, Panel, Seg, useSkin } from "./ui";
export { EVM_NETS };
export type { EvmNet };
import { JitoRow } from "./Views";

export type Chain = Net;

export const NOTE_SOLANA = "Launches on pump.fun · 0 pad fee · network fees apply"; // verbatim, renderLaunch #launch-note
/** renderLaunch #launch-note on an EVM chain: "Launches on <name> · 1% trading fee · 0.0005 <symbol> launch fee + gas" */
export const noteEvm = (c: EvmNet) => `Launches on ${EVM_NETS[c].name} · 1% trading fee · 0.0005 ${EVM_NETS[c].symbol} launch fee + gas`;
export const NOTE_EVM = noteEvm("robinhood");
/** renderLaunch #launch-note on Ethereum (Launch Party's custom launch): the creator's own fee, no trading-fee split */
export const noteEth = (feePct: number) => `Launches on Ethereum through Launch Party · ${feePct}% fee to you · 0.001 ETH launch fee + gas`;
/** #eth-box chips, verbatim (embed.html data-ethfee / data-ethstart); tweetpad.js ethOpts starts at 2% and 10 ETH */
export const ETH_FEES = [0, 1, 2, 3, 5] as const;
export const ETH_STARTS = ["2", "5", "10", "25"] as const;

/** dev-buy presets per network (renderDevBuy: EVM_NETS presets) */
export const PRESETS: Record<Chain, string[]> = { solana: ["0", "0.1", "0.5", "1"], robinhood: EVM_NETS.robinhood.presets, bnb: EVM_NETS.bnb.presets, base: EVM_NETS.base.presets,
  ethereum: EVM_NETS.ethereum.presets };
const fmtAmount = (n: number) => (n >= 1e9 ? (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : Math.round(n).toString());
/** renderDevBuy's EVM estimate: the pool opens at the chain's valuation V (1 ETH Robinhood, 3.5 BNB, 1.3 ETH Base) over 1B tokens;
 * after the 1% fee b gets ≈ 1B × 0.99b / (V + 0.99b) */
export const evmEstimate = (eth: number, fdv = 1) => { const net = eth * 0.99, out = 1e9 * net / (fdv + net); return { amount: fmtAmount(out), pct: (out / 1e7).toFixed(2) }; };

const SolIco: React.FC<{ s: number }> = ({ s }) => (
  <span style={{ display: "inline-grid", placeItems: "center", width: s, height: s, borderRadius: "50%", background: "#000", flex: "none" }}>
    <Img src={staticFile("brand/solana.svg")} style={{ width: s * 0.58 }} />
  </span>
);

/** #evm-wallet: the line under the Launch head on Robinhood (renderEvmWallet) */
export type EvmLine = { found: number } | { address: string; wallet: string } | "none";

export type LaunchFormProps = {
  chain: Chain;
  image?: string | null;
  imageT?: number; // 0..1 drop-in
  name?: string; ticker?: string; caret?: "name" | "ticker" | null;
  desc?: string;
  devBuy?: number; // index into presets
  button: string; pressed?: boolean;
  /** renderLaunch drops .primary while the button names a problem */
  buttonPrimary?: boolean;
  /** Robinhood only: the EVM wallet line */
  evmLine?: EvmLine;
  /** Robinhood only: the holders' share of the creator fees, 0–100 (the slider; may be mid-drag) */
  holders?: number;
  checks?: { text: string; done: boolean; link?: string }[];
  width?: number;
  /** overrides the dev-buy line under the presets (e.g. the app's no-estimate string "Buying 0.1 SOL of $WOW at launch.") */
  est?: string;
  /** "+ Social links" disclosure: open shows the X / TG / WEB fields (embed.html #socials) */
  socialsOpen?: boolean;
  socials?: { x?: string; tg?: string; web?: string };
  socialCaret?: "x" | "tg" | "web" | null;
  descCaret?: boolean;
  /** the chains in the header switch (default Solana · Robinhood, as films 1–3 show it) */
  nets?: readonly Net[];
  /** Solana only: the "⚡ Bundle with Jito" row under the estimate (#jito-row, checked by default). Left out = not drawn (films 1–3). */
  jito?: boolean;
  /** Ethereum only (#eth-box, renderEthBox): the creator fee in %, the starting value in ETH, and the chip being tapped */
  ethFee?: number; ethStart?: string; ethPressed?: { fee?: number; start?: string } | null;
  /** highlight ring around a block, for tutorials */
  ring?: "image" | "name" | "ticker" | "desc" | "socials" | "fees" | "devbuy" | "jito" | "button" | "eth" | null;
};

export const LaunchForm: React.FC<LaunchFormProps> = ({ chain, image, imageT = 1, name = "", ticker = "", caret = null, desc = "launched on tweetpad.io", devBuy = 0, button, pressed, buttonPrimary = true, evmLine = { found: 1 }, holders = 0, checks, width = 330, est, socialsOpen, socials = {}, socialCaret = null, descCaret, jito, nets, ethFee = 2, ethStart = "10", ethPressed = null, ring = null }) => {
  const s = useSkin();
  const craft = s.name !== "2012";
  const evm = chain !== "solana";
  const en = evm ? EVM_NETS[chain] : null;
  const custom = !!en?.custom; // Ethereum: the eth-box instead of the fee box and the dev buy (renderFeeBox / renderDevBuy hide them)
  const unit = en ? en.symbol : "SOL";
  const left = 140 - desc.length;
  const R = (k: string): React.CSSProperties => (ring === k ? { outline: "3px solid rgba(29,161,242,.85)", outlineOffset: 3, borderRadius: craft ? 0 : 6 } : {});
  const filled = [socials.x, socials.tg, socials.web].filter(Boolean).length;
  const small = craft ? `14px/1.1 ${s.mono}` : `12px/1.3 ${s.px}`;
  const presets = PRESETS[chain];
  const amount = presets[devBuy];
  const pair = evm ? null : (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 7px 3px 5px", borderRadius: craft ? 0 : 12, background: craft ? "rgba(5,12,14,.75)" : "linear-gradient(#fff,#f0f0f0)",
      border: `1px solid ${craft ? s.panelLo : "#ccc"}`, fontWeight: "normal", textShadow: "none" }}>
      <small style={{ font: `11px/1 ${s.px}`, color: "#999" }}>Pair</small>
      <SolIco s={18} />
      <b style={{ font: `bold 12px/1 ${s.px}`, color: craft ? s.text : "#333" }}>SOL</b>
      <span style={{ font: `10px/1 ${s.px}`, color: "#999" }}>▾</span>
    </span>
  );
  return (
    <Panel head="Launch" right={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><NetSeg net={chain} nets={nets} />{pair}</span>} width={width}>
      {evm ? <EvmWallet line={evmLine} /> : null}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ ...R("image"), position: "relative", width: 84, height: 84, flex: "none", display: "grid", placeItems: "center", overflow: "hidden", borderRadius: craft ? 0 : 5,
          background: craft ? "rgba(5,12,14,.7)" : "#f7f7f7", border: image && imageT > 0.5 ? `1px solid ${craft ? s.panelLo : "#ccc"}` : `${craft ? 2 : 1}px dashed ${craft ? "rgba(140,200,210,.45)" : "#bbb"}` }}>
          <div style={{ display: "grid", justifyItems: "center", font: craft ? `600 22px/1 ${s.px}` : `300 26px/1 ${s.px}`, color: s.accent, opacity: 1 - imageT }}>
            +<small style={{ font: small, color: s.dim }}>image</small>
          </div>
          {image ? <Img src={staticFile(image)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: imageT, transform: `scale(${1.25 - 0.25 * imageT})` }} /> : null}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <Input value={name} placeholder="Name" focus={caret === "name"} caret={caret === "name"} style={R("name")} />
          <Input value={ticker} placeholder="TICKER" focus={caret === "ticker"} caret={caret === "ticker"} upper style={R("ticker")} />
          <div style={{ font: small, color: s.dim }}>PNG, JPG, GIF or WebP · up to 4 MB · drop or paste</div>
        </div>
      </div>
      <div style={{ position: "relative", ...R("desc") }}>
        <Input value={desc} focus={descCaret} caret={descCaret} style={{ paddingRight: 34, height: 44, whiteSpace: "normal" }} />
        <span style={{ position: "absolute", right: 7, bottom: 6, font: `11px/1 ${s.px}`, color: left <= 10 ? s.bad : "#aaa" }}>{left}</span>
      </div>
      <div style={{ ...R("socials") }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, font: craft ? `15px/1 ${s.mono}` : `bold 12px/1.2 ${s.px}`, color: craft ? s.accent : "#0084b4", textTransform: craft ? "uppercase" : undefined }}>
          <span style={{ width: 10 }}>{socialsOpen ? "−" : "+"}</span> Social links <span style={{ fontWeight: "normal", color: "#999", textTransform: "none" }}>(optional)</span>
          {filled ? <span style={{ padding: "2px 6px", font: `bold 10px/1.1 ${s.px}`, color: "#fff", background: craft ? s.accent : "#0084b4", borderRadius: 8 }}>{filled}</span> : null}
        </div>
        {socialsOpen ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
            {([["x", "X", "@handle or x.com link"], ["tg", "TG", "@group or t.me link"], ["web", "WEB", "yoursite.com"]] as const).map(([k, pre, ph]) => (
              <div key={k} style={{ display: "flex", alignItems: "stretch", background: s.input, border: `1px solid ${socialCaret === k ? "#56b4ef" : craft ? s.panelLo : "#ccc"}`, borderRadius: craft ? 0 : 4, overflow: "hidden",
                boxShadow: socialCaret === k ? "0 0 5px rgba(82,168,236,.6)" : "inset 0 1px 2px rgba(0,0,0,.1)" }}>
                <span style={{ width: 42, display: "grid", placeItems: "center", font: `bold 11px/1 ${s.px}`, color: craft ? s.dim : "#777", background: craft ? "transparent" : "linear-gradient(#fafafa,#eaeaea)", borderRight: `1px solid ${craft ? s.line : "#ccc"}` }}>{pre}</span>
                <span style={{ flex: 1, padding: "7px 8px", font: craft ? `16px/1 ${s.mono}` : `13px/1.2 ${s.px}`, color: socials[k] ? s.text : "#aaa" }}>
                  {socials[k] || ph}{socialCaret === k ? <span style={{ display: "inline-block", width: 1.5, height: "1em", background: s.text, marginLeft: 1, verticalAlign: "-2px" }} /> : null}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {en && !custom ? <FeeBox holders={holders} symbol={en.symbol} style={R("fees")} /> : null}
      {custom ? <EthBox fee={ethFee} start={ethStart} pressed={ethPressed} style={R("eth")} /> : null}
      {custom ? null : <div style={{ ...R("devbuy"), display: "flex", flexDirection: "column", gap: 6, padding: 10, background: craft ? "rgba(5,12,14,.45)" : "#f7f9fa", border: craft ? `1px dashed ${s.line}` : "1px solid #e3e3e3", borderRadius: craft ? 0 : 5 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ font: craft ? `15px/1 ${s.mono}` : `bold 12px/1 ${s.px}`, color: craft ? s.dim : "#666", textTransform: craft ? "uppercase" : undefined }}>Dev buy</span>
          <span style={{ font: craft ? `13px/1 ${s.mono}` : `11px/1.2 ${s.px}`, color: "#999" }}>optional · bought in the launch transaction</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Seg items={presets.map((p, i) => (i ? p : "None"))} on={devBuy} size={12} />
          <div style={{ flex: 1, display: "flex", alignItems: "center", background: s.input, border: `1px solid ${craft ? s.panelLo : "#ccc"}`, borderRadius: craft ? 0 : 4, boxShadow: "inset 0 1px 2px rgba(0,0,0,.1)" }}>
            <span style={{ flex: 1, padding: "7px 8px", font: craft ? `17px/1 ${s.mono}` : `14px/1.2 ${s.px}`, color: devBuy ? s.text : "#aaa" }}>{amount}</span>
            <span style={{ paddingRight: 6, font: small, color: s.dim }}>{unit}</span>
          </div>
        </div>
        <div style={{ font: craft ? `15px/1.15 ${s.mono}` : `12px/1.35 ${s.px}`, color: craft ? s.dim : "#777" }}>
          {est ? est : devBuy === 0 ? "No dev buy: you launch holding none of your coin." : en ? <EvmEst eth={Number(amount)} fdv={en.fdv} ticker={ticker} /> : `Buying ${amount} SOL of ${ticker ? "$" + ticker : "your coin"} at launch.`}
        </div>
        {jito !== undefined && !evm ? <JitoRow on={jito} style={R("jito")} /> : null}
      </div>}
      <Btn primary={buttonPrimary} pressed={pressed} style={{ padding: "10px 12px", fontSize: 14, ...R("button") }}>{button}</Btn>
      {checks && checks.length ? null : <p style={{ margin: "-2px 0 0", textAlign: "center", font: craft ? `14px/1.15 ${s.mono}` : `11px/1.3 ${s.px}`, color: s.dim }}>{custom ? noteEth(ethFee) : evm ? noteEvm(chain as EvmNet) : NOTE_SOLANA}</p>}
      {checks && checks.length ? (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {checks.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 24, borderTop: `1px solid ${craft ? s.line : "#eee"}`, font: small, color: c.done ? s.ok : s.text }}>
              <span style={{ width: 14, height: 14, borderRadius: craft ? 0 : 3, border: `1px solid ${c.done ? s.ok : "#bbb"}`,
                background: c.done ? (craft ? s.ok : "radial-gradient(circle, #fff 0 2px, transparent 2.5px), linear-gradient(#5ccc6f, #2e9e4f)") : "linear-gradient(#fff,#eee)" }} />
              <span style={{ flex: 1 }}>{c.text}</span>
              {c.link ? <span style={{ padding: "3px 7px 3px 7px", font: `bold 11px/1 ${s.px}`, color: craft ? s.text : "#333", background: craft ? "rgba(40,72,82,.55)" : "linear-gradient(#fff,#ededed)", border: `1px solid ${craft ? s.line : "#ccc"}`, borderRadius: 4 }}>{c.link}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </Panel>
  );
};

const EvmWallet: React.FC<{ line: EvmLine }> = ({ line }) => {
  const s = useSkin();
  const craft = s.name !== "2012";
  const base: React.CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, font: craft ? `14px/1.2 ${s.mono}` : `12px/1.3 ${s.px}`, color: craft ? s.dim : "#999" };
  if (line === "none") return <div style={base}>No EVM wallet here. Install MetaMask, Rabby or Phantom, or open tweetpad in your wallet’s browser.</div>;
  if ("found" in line) return <div style={base}>{line.found} EVM wallet{line.found > 1 ? "s" : ""} found</div>;
  return (
    <div style={base}>
      <span>EVM wallet</span>
      <b style={{ font: craft ? `600 12px/1 ${s.px}` : `bold 12px/1 ${s.px}`, color: craft ? s.text : "#333" }}>{line.address}</b>
      <small style={{ font: "inherit" }}>{line.wallet}</small>
      <span style={{ color: craft ? s.accent : "#0084b4" }}>Disconnect</span>
    </div>
  );
};

/** renderDevBuy, Robinhood: "You get ≈ 989.0K $WOW · 0.10% of supply after the 1% fee, guarded at 99% when you sign" */
const EvmEst: React.FC<{ eth: number; fdv: number; ticker: string }> = ({ eth, fdv, ticker }) => {
  const s = useSkin();
  const craft = s.name !== "2012";
  const e = evmEstimate(eth, fdv);
  return (
    <span>You get ≈ <b style={{ color: s.ok, fontWeight: craft ? "normal" : "bold" }}>{e.amount} {ticker ? "$" + ticker : "tokens"}</b> · {e.pct}% of supply
      <small style={{ fontSize: craft ? 13 : 11, color: craft ? s.dim : "#aaa" }}> after the 1% fee, guarded at 99% when you sign</small></span>
  );
};

/** renderFeeBox: the creator / holders split of the 1% fee (10% of each fee goes to Launch Party first), fixed at launch */
const FeeBox: React.FC<{ holders: number; symbol: string; style?: React.CSSProperties }> = ({ holders, symbol, style }) => {
  const s = useSkin();
  const craft = s.name !== "2012";
  const hp = Math.round(holders / 10) * 10, cp = 100 - hp; // the range snaps to 10% steps
  const share = (p: number) => (0.9 * p / 100).toFixed(2).replace(/\.?0+$/, "") + "%";
  const k = Math.max(0, Math.min(1, holders / 100));
  const side: React.CSSProperties = { flex: "none", font: craft ? `14px/1 ${s.mono}` : `bold 12px/1 ${s.px}`, color: craft ? s.text : "#333" };
  const accent = craft ? s.accent : "#2c8fd6";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: craft ? 8 : 10, background: craft ? "rgba(5,12,14,.45)" : "#f7f9fa", border: craft ? `1px dashed ${s.line}` : "1px solid #e3e3e3", borderRadius: craft ? 0 : 5, ...style }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ font: craft ? `15px/1 ${s.mono}` : `bold 12px/1 ${s.px}`, color: craft ? s.dim : "#666", textTransform: craft ? "uppercase" : undefined }}>Creator fees</span>
        <span style={{ font: craft ? `13px/1 ${s.mono}` : `11px/1.2 ${s.px}`, color: "#999" }}>1% of every trade, for the coin's life</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ ...side, minWidth: 74 }}>Creator {cp}%</span>
        {/* input[type=range] with accent-color: a filled track and a round thumb */}
        <span style={{ position: "relative", flex: 1, height: 16 }}>
          <span style={{ position: "absolute", left: 0, right: 0, top: 6, height: 4, borderRadius: 2, background: craft ? "rgba(140,200,210,.25)" : "#d6d6d6" }} />
          <span style={{ position: "absolute", left: 0, width: `${k * 100}%`, top: 6, height: 4, borderRadius: 2, background: accent }} />
          <span style={{ position: "absolute", top: 0, left: `calc(${k} * (100% - 16px))`, width: 16, height: 16, borderRadius: "50%", background: accent, boxShadow: "0 1px 2px rgba(0,0,0,.3)" }} />
        </span>
        <span style={{ ...side, minWidth: 116, textAlign: "right" }}>Holder rewards {hp}%</span>
      </div>
      <div style={{ font: craft ? `15px/1.15 ${s.mono}` : `12px/1.35 ${s.px}`, color: craft ? s.dim : "#777" }}>
        Each trade: <b>{share(cp)} to you</b>{hp ? ` · ${share(hp)} to holders (${symbol}, claimed on the coin page)` : ""}
        <small style={{ fontSize: craft ? 13 : 11, color: craft ? s.dim : "#aaa" }}> Fixed at launch.</small>
        <span style={{ display: "block", marginTop: 3, font: craft ? `13px/1.2 ${s.mono}` : `11px/1.3 ${s.px}`, color: craft ? s.dim : "#aaa" }}>
          0.1% to <span style={{ color: craft ? s.accent : "#0084b4" }}>Launch Party SDK ↗</span></span>
      </div>
    </div>
  );
};

/** #eth-box (renderEthBox): Launch Party's custom launch on Ethereum. The creator's fee (0–5% of every trade, paid in ETH and in the
 * coin) and the starting value (the market cap the pool opens at), both fixed at launch; no dev buy and no holders split. */
const EthBox: React.FC<{ fee: number; start: string; pressed?: { fee?: number; start?: string } | null; style?: React.CSSProperties }> = ({ fee, start, pressed, style }) => {
  const s = useSkin();
  const craft = s.name !== "2012";
  const head = (label: string, hint: string) => (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
      <span style={{ flex: "none", font: craft ? `15px/1 ${s.mono}` : `bold 12px/1 ${s.px}`, color: craft ? s.dim : "#666", textTransform: craft ? "uppercase" : undefined }}>{label}</span>
      <span style={{ font: craft ? `13px/1 ${s.mono}` : `11px/1.2 ${s.px}`, color: "#999" }}>{hint}</span>
    </div>
  );
  // .buy-chips, 2012: the segmented control; #eth-box gives its buttons 5px of vertical padding
  const chips = (items: string[], on: number, down: number) => (
    <span style={{ display: "flex" }}>
      {items.map((t, i) => {
        const sel = i === on;
        return (
          <span key={t} style={{ padding: "5px 10px", marginLeft: i ? -1 : 0, font: craft ? `15px/1 ${s.mono}` : `bold 12px/1 ${s.px}`, position: "relative", zIndex: sel ? 1 : 0,
            color: sel ? (craft ? "#04200e" : "#fff") : craft ? s.dim : "#555", textShadow: sel ? (craft ? "none" : "0 -1px 0 rgba(0,0,0,.25)") : craft ? s.textShadow : "0 1px 0 #fff",
            background: sel ? s.segOn : s.segOff, border: `1px solid ${sel ? (craft ? s.accent : "#1d6aa5") : craft ? s.line : "#bbb"}`,
            borderRadius: craft ? 0 : i === 0 ? "4px 0 0 4px" : i === items.length - 1 ? "0 4px 4px 0" : 0,
            boxShadow: (sel || i === down) && !craft ? "inset 0 1px 3px rgba(0,0,0,.3)" : undefined }}>{t}</span>
        );
      })}
    </span>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: craft ? 8 : 10, background: craft ? "rgba(5,12,14,.45)" : "#f7f9fa", border: craft ? `1px dashed ${s.line}` : "1px solid #e3e3e3", borderRadius: craft ? 0 : 5, ...style }}>
      {head("Creator fee", "of every trade, to your wallet, for the coin's life")}
      {chips(ETH_FEES.map((p) => p + "%"), ETH_FEES.indexOf(fee as (typeof ETH_FEES)[number]), pressed?.fee !== undefined ? ETH_FEES.indexOf(pressed.fee as (typeof ETH_FEES)[number]) : -1)}
      {head("Starting value", "the coin's market cap when it opens")}
      {chips(ETH_STARTS.map((v) => v + " ETH"), ETH_STARTS.indexOf(start as (typeof ETH_STARTS)[number]), pressed?.start !== undefined ? ETH_STARTS.indexOf(pressed.start as (typeof ETH_STARTS)[number]) : -1)}
      <div style={{ font: craft ? `15px/1.15 ${s.mono}` : `12px/1.35 ${s.px}`, color: craft ? s.dim : "#777" }}>
        Each trade: <b>{fee}% to you</b>, in ETH and in the coin, claimed on your profile.
        <small style={{ fontSize: craft ? 13 : 11, color: craft ? s.dim : "#aaa" }}> Fixed at launch: the fee hook can never be changed.</small>
        <span style={{ display: "block", marginTop: 3, font: craft ? `13px/1.2 ${s.mono}` : `11px/1.3 ${s.px}`, color: craft ? s.dim : "#aaa" }}>
          Reviewed and launched by <span style={{ textDecoration: "underline", textDecorationColor: craft ? "currentColor" : "#ccc", textUnderlineOffset: 2 }}>Launch Party</span> · 0.001 ETH launch fee</span>
      </div>
    </div>
  );
};
