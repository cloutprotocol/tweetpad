/**
 * Rebuilt tweetpad card UI (embed.html + assets/tweetpad.css + assets/skin-2012.css) in React.
 * All sizes are the app's own CSS px. Wrap in <AppFrame scale> to blow it up for 1080x1080.
 * Brand rule: the 2012 skin's header normally shows the old bird as a mask (twitter-2012-bird.svg).
 * The film NEVER uses it: the header uses the tweetpad # icon instead.
 */
import React, { createContext, useContext } from "react";
import { Img, staticFile } from "remotion";
import { FONTS, Skin, SKIN_2012 } from "../brand/tokens";

export const SkinCtx = createContext<Skin>(SKIN_2012);
export const useSkin = () => useContext(SkinCtx);
const is2012 = (s: Skin) => s.name === "2012";

/* ---------- icons, verbatim paths from embed.html ---------- */
export const IcoLaunch = (p: { s?: number; c?: string }) => (
  <svg viewBox="0 0 16 16" width={p.s ?? 15} height={p.s ?? 15} fill={p.c ?? "currentColor"}>
    <path fillRule="evenodd" d="M8 .8c2.7 1.7 3.9 4.6 3.5 7.8l1.9 2.4v3l-2.9-1.5h-5L3.6 14v-3l1.9-2.4C5.1 5.4 6.3 2.5 8 .8zm0 4.1a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM6.6 13.2h2.8L8 15.6z" />
  </svg>
);
export const IcoTokens = (p: { s?: number; c?: string }) => (
  <svg viewBox="0 0 16 16" width={p.s ?? 15} height={p.s ?? 15} fill={p.c ?? "currentColor"}>
    <path fillRule="evenodd" d="M8 .5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z" />
    <path d="M7.3 3.6h1.4v1c.9.1 1.7.5 2.1 1.1l-1 .9c-.4-.4-.9-.7-1.6-.7-.6 0-1 .3-1 .7 0 .5.5.6 1.4.9 1.3.3 2.4.8 2.4 2.1 0 1-.8 1.8-2.3 2v1H7.3v-1c-1-.1-1.9-.6-2.4-1.3l1-.9c.5.5 1.1.9 1.9.9.7 0 1.1-.3 1.1-.7 0-.5-.5-.7-1.5-.9-1.2-.3-2.3-.7-2.3-2 0-.9.8-1.7 2.2-1.9z" />
  </svg>
);
export const IcoFeed = (p: { s?: number; c?: string }) => (
  <svg viewBox="0 0 16 16" width={p.s ?? 13} height={p.s ?? 13} fill={p.c ?? "currentColor"}>
    <path fillRule="evenodd" d="M6 1h2l-.6 3.5h3L11 1h2l-.6 3.5H15v2h-2.95l-.5 3H14v2h-2.8L10.6 15h-2l.6-3.5h-3L5.6 15h-2l.6-3.5H1v-2h3.55l.5-3H2v-2h3.4zm1.05 5.5-.5 3h3l.5-3z" />
  </svg>
);
const IcoShare = () => <svg viewBox="0 0 16 16" width={15} height={15} fill="currentColor"><path d="M6.5 3 1 7.5 6.5 12V9.2c3.6 0 6 .9 8 3.8-.6-4.3-3.2-7.2-8-7.6z" /></svg>;
const IcoRepost = () => <svg viewBox="0 0 16 16" width={15} height={15} fill="currentColor"><path d="M4 2 .8 5.5H3V12h7v-2H5V5.5h2.2zm8 12 3.2-3.5H13V4H6v2h5v4.5H8.8z" /></svg>;
const IcoStar = () => <svg viewBox="0 0 16 16" width={15} height={15} fill="currentColor"><path d="m8 1.5 1.9 4.1 4.5.5-3.4 3 1 4.4L8 11.2 4 13.5l1-4.4-3.4-3 4.5-.5z" /></svg>;

/* ---------- frame ---------- */
export const APP_W = 460;
export const APP_H = 520;

/** The card iframe: header / stage / tab bar, at app px, scaled. */
export const AppFrame: React.FC<{ scale: number; tab: Tab; children: React.ReactNode; scrollY?: number; toast?: React.ReactNode; tokenCount?: number; connected?: boolean; style?: React.CSSProperties; h?: number; overlay?: React.ReactNode; net?: Net; netHover?: Net | null; netT?: number; nets?: readonly Net[] }> = ({ scale, tab, children, scrollY = 0, toast, tokenCount, connected, style, h = APP_H, overlay, net = "solana", netHover = null, netT, nets }) => {
  const s = useSkin();
  const craft = !is2012(s);
  return (
    <div style={{ width: APP_W, height: h, transform: `scale(${scale})`, transformOrigin: "top left", position: "relative", overflow: "hidden",
      background: craft ? `radial-gradient(120% 70% at 80% -10%, rgba(111,231,216,.14), transparent 60%), linear-gradient(rgba(5,10,12,.55), rgba(5,10,12,.2) 40%, rgba(5,10,12,.75)), ${s.bg}` : s.bg,
      color: s.text, fontFamily: s.px, fontSize: 13, lineHeight: 1.35, textShadow: s.textShadow, display: "flex", flexDirection: "column", ...style }}>
      <AppHeader tab={tab} tokenCount={tokenCount} connected={connected} />
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, padding: "10px 10px 40px", transform: `translateY(${-scrollY}px)`, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {children}
        </div>
        {toast}
      </div>
      <Hud net={net} hover={netHover} t={netT} nets={nets} />
      {overlay ? <div style={{ position: "absolute", inset: 0, zIndex: 30 }}>{overlay}</div> : null}
    </div>
  );
};

export type Tab = "launch" | "tokens" | "feed" | "more" | "none";

const BarBtn: React.FC<{ on?: boolean; children: React.ReactNode; primary?: boolean }> = ({ on, children, primary }) => {
  const s = useSkin();
  if (!is2012(s)) {
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 6px", font: `600 11px/1 ${s.px}`, color: on ? s.text : s.dim,
      background: primary ? s.primaryBtn : on ? s.panel : "transparent", border: `2px solid ${on || primary ? s.panelLo : "transparent"}`,
      boxShadow: on ? `inset 0 2px 0 ${s.accent}` : undefined, ...(primary ? { color: s.primaryBtnText, textShadow: "1px 1px 0 rgba(255,255,255,.3)" } : {}) }}>{children}</span>;
  }
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 9px", whiteSpace: "nowrap", color: "#fff", font: `bold 12px/1 ${s.px}`, textShadow: "0 -1px 0 rgba(0,0,0,.35)",
    background: on ? s.barBtnActive : s.barBtn, border: `1px solid ${on ? "#17558a" : s.barBtnBorder}`, borderRadius: 5,
    boxShadow: on ? "inset 0 1px 3px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.2)" : "inset 0 1px 0 rgba(255,255,255,.3), 0 1px 0 rgba(255,255,255,.2)" }}>{children}</span>;
};

export const AppHeader: React.FC<{ tab: Tab; tokenCount?: number; connected?: boolean }> = ({ tab, tokenCount, connected }) => {
  const s = useSkin();
  const craft = !is2012(s);
  const glow = (on: boolean) => (on && !craft ? "#9fdcff" : "currentColor");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: craft ? "7px 8px" : "6px 7px", background: s.headerBg, borderBottom: craft ? undefined : `1px solid ${s.headerBorder}`,
      boxShadow: craft ? undefined : "inset 0 1px 0 rgba(255,255,255,.35), 0 1px 3px rgba(0,0,0,.25)", position: "relative", zIndex: 10 }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, color: "#fff",
        font: craft ? `600 13px/1 ${s.px}` : `600 20px/1 ${FONTS.round}`, letterSpacing: craft ? ".02em" : "-.02em", textShadow: craft ? s.textShadow : "0 -1px 0 rgba(0,0,0,.3)" }}>
        {craft
          ? <span style={{ display: "inline-block", width: 9, height: 9, margin: "0 7px 0 3px", background: s.accent, transform: "rotate(45deg)", boxShadow: `0 0 0 2px ${s.panelLo}, 0 0 10px ${s.accent}` }} />
          : <Img src={staticFile("brand/tweetpad-hash-256.png")} style={{ width: 24, height: 24 }} />}
        tweetpad
      </div>
      {/* card widths (<=480px): skin-2012.css shows Launch and Tokens as icons only */}
      <BarBtn on={tab === "launch"}><IcoLaunch s={17} c={glow(tab === "launch")} /></BarBtn>
      <BarBtn on={tab === "tokens"}><IcoTokens s={17} c={glow(tab === "tokens")} />{tokenCount ? <span style={{ font: `bold 11px/1 ${s.px}`, background: "rgba(0,0,0,.2)", padding: "2px 5px", borderRadius: 8 }}>{tokenCount}</span> : null}</BarBtn>
      <BarBtn on={tab === "feed"}><IcoFeed s={17} c={glow(tab === "feed")} /></BarBtn>
      <BarBtn on={tab === "more"}>More</BarBtn>
      <BarBtn primary={craft}>{connected ? <span style={{ width: 16, height: 16, borderRadius: 3, background: "linear-gradient(135deg,#ffd27a,#e8a33c)" }} /> : "Connect"}<span style={{ fontSize: 10, opacity: 0.85 }}>▾</span></BarBtn>
    </div>
  );
};

/** launch network, picked in the tab bar (embed.html .net-switch) */
export type Net = "solana" | "robinhood" | "bnb" | "base" | "ethereum";
/** the switch as films 1–3 show it (Solana · Robinhood), and as shipped now (embed.html: Solana · Robinhood · BNB · Base) */
export const NETS_2: readonly Net[] = ["solana", "robinhood"];
export const NETS_4: readonly Net[] = ["solana", "robinhood", "bnb", "base"];
/** the Launch header switch since Ethereum shipped (embed.html .launch-head .net-switch). The tab-bar switch keeps NETS_4. */
export const NETS_5: readonly Net[] = ["solana", "robinhood", "bnb", "base", "ethereum"];
const LOGO_SRC: Record<Net, string> = { solana: "brand/solana.svg", robinhood: "brand/robinhood.png", bnb: "brand/bnb.svg", base: "brand/base.svg", ethereum: "brand/ethereum.svg" };
/** tweetpad.js EVM_NETS: name, short (button), native symbol, openingFdv (the pool's opening valuation, for the estimate), presets */
export type EvmNet = Exclude<Net, "solana">;
export const EVM_NETS: Record<EvmNet, { name: string; short: string; symbol: string; fdv: number; presets: string[]; tradePresets: string[]; custom?: boolean }> = {
  robinhood: { name: "Robinhood Chain", short: "Robinhood", symbol: "ETH", fdv: 1, presets: ["0", "0.001", "0.005", "0.01"], tradePresets: ["0.001", "0.005", "0.01", "0.05"] },
  bnb: { name: "BNB Chain", short: "BNB", symbol: "BNB", fdv: 3.5, presets: ["0", "0.005", "0.01", "0.05"], tradePresets: ["0.005", "0.01", "0.05", "0.1"] },
  base: { name: "Base", short: "Base", symbol: "ETH", fdv: 1.3, presets: ["0", "0.001", "0.005", "0.01"], tradePresets: ["0.001", "0.005", "0.01", "0.05"] },
  // Launch Party's custom launch (film 10): no dev buy (maxDevBuy 0, the form hides the box), trades in ETH
  ethereum: { name: "Ethereum", short: "Ethereum", symbol: "ETH", fdv: 10, presets: ["0", "0", "0", "0"], tradePresets: ["0.005", "0.01", "0.05", "0.1"], custom: true },
};
/** chain logos are masks coloured by the button, as .net-logo does */
export const NetLogo: React.FC<{ net: Net; c: string; size?: number }> = ({ net, c, size = 16 }) => {
  const url = `url(${staticFile(LOGO_SRC[net])})`;
  return <span style={{ width: size, height: size, background: c, WebkitMaskImage: url, maskImage: url, WebkitMaskSize: "contain", maskSize: "contain",
    WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" }} />;
};
/** title attributes, verbatim from embed.html */
export const NET_TITLE: Record<Net, string> = { solana: "Launch on Solana (pump.fun)", robinhood: "Launch on Robinhood Chain", bnb: "Launch on BNB Chain", base: "Launch on Base",
  ethereum: "Launch on Ethereum (Launch Party custom launch)" };
/** app-px centres of the two switch buttons (2012 layout below), for cursor targets */
export const NET_XY: Record<"solana" | "robinhood", [number, number]> = { solana: [349, 498], robinhood: [381, 498] };
/** the same for any switch: the hud row is centred, so each extra chain moves the pill 16 px left (32 px buttons) */
export const netXY = (net: Net, nets: readonly Net[] = NETS_2): [number, number] => {
  const first = 349 - 16 * (nets.length - 2);
  return [first + 32 * nets.indexOf(net), 498];
};

/** bottom bar: chat slot + coin hotbar + the chain switch opposite chat */
export const Hud: React.FC<{ net?: Net; hover?: Net | null; t?: number; nets?: readonly Net[] }> = ({ net = "solana", hover = null, t, nets = NETS_2 }) => {
  const s = useSkin();
  const craft = !is2012(s);
  const slots = ["brand/tweetpad-hash-256.png", "brand/agent-inu.jpg", null, null, null, null];
  return (
    <div style={{ position: "relative", padding: "6px 10px 7px", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, background: s.hudBg, borderTop: craft ? undefined : "1px solid #000",
      boxShadow: craft ? undefined : "inset 0 1px 0 rgba(255,255,255,.14)" }}>
      <div style={{ width: 30, height: 30, display: "grid", placeItems: "center", color: craft ? s.accent : "#4bb4ef" }}>
        <svg viewBox="0 0 8 8" width={16} height={16}><path d="M1 1h6v4H4L2 7V5H1z" fill="currentColor" /></svg>
      </div>
      {slots.map((src, i) => (
        <div key={i} style={{ width: 30, height: 30, padding: 3, borderRadius: craft ? 0 : 5,
          background: i === 0 ? (craft ? "rgba(60,110,120,.8)" : "radial-gradient(ellipse at 50% 100%, rgba(95,185,240,.45), transparent 70%), rgba(255,255,255,.1)") : craft ? "rgba(30,56,64,.7)" : "rgba(255,255,255,.03)",
          boxShadow: craft ? "inset 2px 2px 0 rgba(0,0,0,.45), inset -1px -1px 0 rgba(140,200,210,.35)" : "inset 0 1px 1px rgba(0,0,0,.5)" }}>
          {src ? <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: craft ? 0 : 4 }} /> : null}
        </div>
      ))}
      {craft ? (
        <span style={{ display: "inline-flex", gap: 2 }}>
          {nets.map((n) => {
            const on = n === net;
            return (
              <span key={n} style={{ width: 30, height: 24, display: "grid", placeItems: "center", background: on ? s.accent : "transparent", border: `1px solid ${on ? s.accent : s.line}` }}>
                <NetLogo net={n} c={on ? "#04200e" : s.dim} size={15} />
              </span>
            );
          })}
        </span>
      ) : <NetPill net={net} hover={hover} t={t} nets={nets} />}
    </div>
  );
};

/** 2012 tab-bar switch (skin-2012.css .hud-row .net-switch): a recessed dark track, the picked chain on the old blue
 * gradient with a white logo, the others grey. t is the blue's position as an index into nets (0 = Solana, 1 = Robinhood, …). */
const NetPill: React.FC<{ net: Net; hover: Net | null; t?: number; nets: readonly Net[] }> = ({ net, hover, t, nets }) => {
  const k = t ?? nets.indexOf(net);
  // a chain the tab bar doesn't list (Ethereum: only the Launch header has it) leaves every button unpicked, as aria-checked does
  const off = t === undefined && !nets.includes(net);
  const c = (n: Net) => {
    const on = Math.max(0, 1 - Math.abs(nets.indexOf(n) - k));
    const g = Math.round(138 + (255 - 138) * on + (hover === n && on < 0.5 ? 66 : 0));
    return `rgb(${g},${g},${g})`;
  };
  return (
    <span style={{ position: "relative", display: "inline-flex", marginLeft: 4, padding: 2, borderRadius: 15, background: "rgba(0,0,0,.45)", border: "1px solid #000",
      boxShadow: "inset 0 1px 2px rgba(0,0,0,.8), 0 1px 0 rgba(255,255,255,.1)" }}>
      {off ? null : <span style={{ position: "absolute", top: 2, left: 2 + 32 * k, width: 32, height: 24, borderRadius: 12, background: "linear-gradient(#4aa9e9, #2c8fd6)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 1px 2px rgba(0,0,0,.5)" }} />}
      {nets.map((n) => (
        <span key={n} style={{ position: "relative", width: 32, height: 24, display: "grid", placeItems: "center" }}><NetLogo net={n} c={c(n)} size={15} /></span>
      ))}
    </span>
  );
};

/** the same switch in the Launch header (.launch-head .net-switch): the light segmented control the filters use */
export const NetSeg: React.FC<{ net: Net; nets?: readonly Net[] }> = ({ net, nets = NETS_2 }) => {
  const s = useSkin();
  const craft = !is2012(s);
  return (
    <span style={{ display: "inline-flex", gap: craft ? 2 : 0 }}>
      {nets.map((n, i) => {
        const on = n === net;
        return (
          <span key={n} style={{ width: craft ? 26 : 30, height: craft ? 20 : 24, marginLeft: craft || i === 0 ? 0 : -1, display: "grid", placeItems: "center", textShadow: "none",
            ...(craft ? { background: on ? s.accent : "transparent", border: `1px solid ${on ? s.accent : s.line}` }
              : { background: on ? "linear-gradient(#2c8fd6, #4aa9e9)" : "linear-gradient(#fff, #e6e6e6)", border: `1px solid ${on ? "#1d6aa5" : "#bbb"}`,
                borderRadius: i === 0 ? "12px 0 0 12px" : i === nets.length - 1 ? "0 12px 12px 0" : 0, boxShadow: on ? "inset 0 1px 3px rgba(0,0,0,.3)" : undefined, position: "relative", zIndex: on ? 1 : 0 }) }}>
            <NetLogo net={n} c={craft ? (on ? "#04200e" : s.dim) : on ? "#fff" : "#888"} size={craft ? 13 : 15} />
          </span>
        );
      })}
    </span>
  );
};

/** the browser tooltip for a hovered switch button (title attribute), in app px above the tab bar */
export const NetTip: React.FC<{ net: Net; t: number }> = ({ net, t }) => {
  const s = useSkin();
  return (
    <div style={{ position: "absolute", right: 8, bottom: 72, padding: "6px 9px", background: "rgba(20,20,20,.92)", color: "#fff", borderRadius: 5, whiteSpace: "nowrap",
      font: `12px/1.2 ${s.name === "2012" ? s.px : s.mono}`, boxShadow: "0 4px 12px rgba(0,0,0,.3)", opacity: t, transform: `translateY(${(1 - t) * 6}px)` }}>{NET_TITLE[net]}</div>
  );
};

/* ---------- panels ---------- */
export const Panel: React.FC<{ head?: React.ReactNode; right?: React.ReactNode; width?: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({ head, right, width = 330, children, style }) => {
  const s = useSkin();
  const craft = !is2012(s);
  return (
    <div style={{ width, padding: 10, background: s.panel, border: craft ? `2px solid ${s.panelLo}` : "1px solid #c8c8c8", borderTop: craft ? `2px solid ${s.gold}` : "1px solid #c8c8c8",
      borderRadius: s.radius, boxShadow: s.shadow, display: "flex", flexDirection: "column", gap: 8, ...style }}>
      {head !== undefined && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
          ...(craft ? { font: `15px/1 ${s.mono}`, letterSpacing: ".08em", textTransform: "uppercase", color: s.gold }
            : { margin: "-10px -10px 0", padding: "8px 10px", font: `bold 13px/1.2 ${s.px}`, color: "#555", textShadow: "0 1px 0 #fff", background: s.headStrip, borderBottom: "1px solid #ddd", borderRadius: "5px 5px 0 0" }) }}>
          <span>{head}</span>{right}
        </div>
      )}
      {children}
    </div>
  );
};

export const Btn: React.FC<{ primary?: boolean; children: React.ReactNode; style?: React.CSSProperties; pressed?: boolean }> = ({ primary, children, style, pressed }) => {
  const s = useSkin();
  const craft = !is2012(s);
  return (
    <div style={{ textAlign: "center", padding: "7px 12px", font: `bold 12px/1 ${s.px}`, borderRadius: craft ? 0 : 4,
      color: primary ? s.primaryBtnText : craft ? s.text : "#333",
      textShadow: primary ? (craft ? "1px 1px 0 rgba(255,255,255,.3)" : "0 -1px 0 rgba(0,0,0,.25)") : craft ? s.textShadow : "0 1px 0 #fff",
      background: pressed ? (primary ? "#0287c6" : "#e0e0e0") : primary ? s.primaryBtn : s.btn,
      border: craft ? "2px solid #050b0d" : `1px solid ${primary ? s.primaryBorder : "#bbb"}`, borderBottomColor: craft ? undefined : primary ? "#0466a8" : "#a2a2a2",
      boxShadow: pressed ? "inset 0 2px 4px rgba(0,0,0,.25)" : craft ? "inset 0 2px 0 rgba(255,255,255,.22), inset 0 -3px 0 rgba(0,0,0,.38)" : "inset 0 1px 0 rgba(255,255,255,.6), 0 1px 1px rgba(0,0,0,.08)", ...style }}>
      {children}
    </div>
  );
};

/** segmented control (.sort / .tf / .buy-chips) */
export const Seg: React.FC<{ items: string[]; on: number; size?: number; style?: React.CSSProperties }> = ({ items, on, size = 11, style }) => {
  const s = useSkin();
  const craft = !is2012(s);
  return (
    <span style={{ display: "inline-flex", gap: craft ? 2 : 0, ...style }}>
      {items.map((t, i) => (
        <span key={t + i} style={{ padding: "4px 8px", marginLeft: craft || i === 0 ? 0 : -1, font: craft ? `14px/1 ${s.mono}` : `bold ${size}px/1 ${s.px}`,
          display: "grid", placeItems: "center",
          color: i === on ? (craft ? "#04200e" : "#fff") : craft ? s.dim : "#555", textShadow: i === on ? (craft ? "none" : "0 -1px 0 rgba(0,0,0,.25)") : craft ? s.textShadow : "0 1px 0 #fff",
          background: i === on ? s.segOn : s.segOff, border: `1px solid ${i === on ? (craft ? s.accent : "#1d6aa5") : craft ? s.line : "#bbb"}`,
          borderRadius: craft ? 0 : i === 0 ? "4px 0 0 4px" : i === items.length - 1 ? "0 4px 4px 0" : 0,
          boxShadow: i === on && !craft ? "inset 0 1px 3px rgba(0,0,0,.3)" : undefined }}>{t}</span>
      ))}
    </span>
  );
};

export const Input: React.FC<{ value?: string; placeholder?: string; focus?: boolean; style?: React.CSSProperties; caret?: boolean; upper?: boolean }> = ({ value, placeholder, focus, style, caret, upper }) => {
  const s = useSkin();
  const craft = !is2012(s);
  return (
    <div style={{ padding: craft ? "6px 7px" : 8, minHeight: craft ? 0 : 34, color: s.text, font: craft ? `17px/1 ${s.mono}` : `14px/1.2 ${s.px}`, background: s.input,
      border: craft ? `2px solid ${focus ? s.accent : s.panelLo}` : `1px solid ${focus ? "#56b4ef" : s.inputBorder}`, borderRadius: craft ? 0 : 4,
      boxShadow: craft ? "inset 2px 2px 0 rgba(0,0,0,.4)" : focus ? "inset 0 1px 2px rgba(0,0,0,.1), 0 0 5px rgba(82,168,236,.6)" : "inset 0 1px 2px rgba(0,0,0,.1)",
      textTransform: upper ? "uppercase" : undefined, whiteSpace: "nowrap", overflow: "hidden", ...style }}>
      {value ? value : <span style={{ color: craft ? "#6f8a8e" : "#aaa" }}>{placeholder}</span>}
      {caret ? <span style={{ display: "inline-block", width: 1.5, height: "1em", background: s.text, marginLeft: 1, verticalAlign: "-2px" }} /> : null}
    </div>
  );
};

export const Tag: React.FC<{ children: React.ReactNode; color?: string; dim?: boolean; style?: React.CSSProperties }> = ({ children, color, dim, style }) => {
  const s = useSkin();
  const craft = !is2012(s);
  return (
    <span style={{ padding: craft ? "1px 3px 0" : "2px 5px", font: craft ? `13px/1 ${s.mono}` : `bold 10px/1.1 ${s.px}`, letterSpacing: ".02em", borderRadius: craft ? 0 : 3,
      color: dim ? "#888" : craft ? "#04200e" : "#fff", background: dim ? "#f3f3f3" : color ?? (craft ? s.accent : "#0084b4"), textShadow: "none", ...style }}>{children}</span>
  );
};

/* ---------- the welcome post ---------- */
export const WelcomeTweet: React.FC<{ width?: number }> = ({ width = 330 }) => {
  const s = useSkin();
  if (!is2012(s)) return null; // Tweetcraft hides it (tweetpad.css .welcome {display:none})
  return (
    <div style={{ width, display: "flex", gap: 10, marginBottom: 10, padding: 10, background: "#fff", border: "1px solid #c8c8c8", borderRadius: 5, boxShadow: s.shadow }}>
      <Img src={staticFile("brand/agent-inu.jpg")} style={{ width: 48, height: 48, borderRadius: 5, boxShadow: "0 1px 2px rgba(0,0,0,.25)", objectFit: "cover", flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, whiteSpace: "nowrap" }}>
          <b style={{ font: `bold 14px/1.2 ${s.px}`, color: "#333" }}>Agent Inu</b>
          <span style={{ font: `12px/1.2 ${s.px}`, color: "#999" }}>@tweetpad</span>
          <span style={{ marginLeft: "auto", font: `12px/1.2 ${s.px}`, color: "#999" }}>2m</span>
        </div>
        <p style={{ margin: "3px 0 0", font: `14px/1.35 ${FONTS.serif}`, color: "#333" }}>
          Welcome to <span style={{ color: "#0084b4" }}>#tweetpad</span>. Drop an image, pick a ticker, hit Launch, and your coin goes live without leaving the tweet. Such launch. Very wow.
        </p>
        <div style={{ display: "flex", gap: 6, margin: "6px 0 -4px -6px", color: "#b3b3b3" }}>
          {[IcoShare, IcoRepost, IcoStar].map((I, i) => <span key={i} style={{ minWidth: 52, padding: "4px 6px" }}><I /></span>)}
        </div>
      </div>
    </div>
  );
};

/** "Official $TP contract" strip. The address is shortened as the app shows it. */
export const OfficialStrip: React.FC<{ width?: number }> = ({ width = 330 }) => {
  const s = useSkin();
  const craft = !is2012(s);
  return (
    <div style={{ width, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "8px 10px", background: s.panel,
      border: craft ? `2px solid ${s.panelLo}` : "1px solid #c8c8c8", borderRadius: s.radius, boxShadow: s.shadow }}>
      <span style={{ font: craft ? `15px/1 ${s.mono}` : `12px/1.2 ${s.px}`, color: craft ? s.dim : "#777", textTransform: craft ? "uppercase" : undefined }}>
        Official <b style={{ color: craft ? s.gold : "#333" }}>$TP</b> contract</span>
      <span style={{ padding: "2px 6px", font: `12px/1 ${s.px}`, color: s.accent, background: craft ? "rgba(111,231,216,.08)" : "#f2f8fc", border: `1px solid ${craft ? "rgba(111,231,216,.3)" : "#cfe3f1"}`, borderRadius: 3 }}>BctF…EQDN ⧉</span>
    </div>
  );
};

/** the 2012 status-bar toast ("Token launched!") that rises from behind the tab bar */
export const Toast: React.FC<{ title: string; text: string; t: number }> = ({ title, text, t }) => {
  const s = useSkin();
  const craft = !is2012(s);
  if (craft) {
    return (
      <div style={{ position: "absolute", top: 2, right: 8, zIndex: 5, display: "flex", alignItems: "center", gap: 9, padding: "6px 14px 6px 7px", background: s.panel, border: `2px solid ${s.panelLo}`,
        boxShadow: s.shadow, transform: `translateX(${(1 - t) * 110}%)`, opacity: t }}>
        <span style={{ width: 26, height: 26, border: `2px solid ${s.panelLo}`, background: "linear-gradient(#5fbf3f 0 34%, #7a5434 34%)" }} />
        <div><b style={{ display: "block", font: `600 12px/1.2 ${s.px}`, color: "#ff74e6" }}>{title}</b><span style={{ font: `16px/1.05 ${s.mono}` }}>{text}</span></div>
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 5, display: "flex", justifyContent: "center", gap: 6, padding: "5px 10px", background: "rgba(20,20,20,.92)",
      boxShadow: "0 -1px 3px rgba(0,0,0,.3)", transform: `translateY(${(1 - t) * 100}%)` }}>
      <b style={{ font: `bold 12px/1.2 ${s.px}`, color: "#fff" }}>{title}</b>
      <span style={{ font: `12px/1.2 ${s.px}`, color: "#ddd" }}>{text}</span>
    </div>
  );
};

/** a NEW tag popping above the Robinhood feather in the tab bar (film callout, app px) */
export const NetNew: React.FC<{ t: number }> = ({ t }) => (
  <div style={{ position: "absolute", left: NET_XY.robinhood[0] - 17, top: NET_XY.robinhood[1] - 40, padding: "3px 6px", borderRadius: 999, background: "linear-gradient(#ffb54a, #f08a1c)",
    color: "#fff", font: `800 10px/1 ${FONTS.ui}`, letterSpacing: ".08em", boxShadow: "0 2px 6px rgba(0,0,0,.35)", opacity: Math.min(1, t * 1.5),
    transform: `translateY(${(1 - t) * 6}px) scale(${0.6 + 0.4 * t})`, transformOrigin: "50% 100%" }}>NEW</div>
);
