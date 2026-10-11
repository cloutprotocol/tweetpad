/**
 * TweetpadTradePanel: "The trading terminal inside a tweet." 1080x1080 @30, 20.0 s. A high-end promo for trading + Jito bundles.
 * A field of 2012-blue # glyphs drifts in parallax behind the $JACK coin page, which orbits in CSS 3D (perspective + translateZ,
 * no WebGL, so the UI stays crisp). Its parts lift off as glassy floating panels (chart, trades, trade controls, quote + balance,
 * Jito speed, button + status), one beat per feature, then snap back into the card.
 * Every app string is verbatim from assets/tweetpad.js renderTrade / jitoSpeedPicker / runTrade / renderTrades and the "trade extras,
 * 2012 style" CSS. Figures: 0.1 SOL → ≈ 2.7M $JACK (≈ $11.4), 2.7M → ≈ 0.097 SOL (owner-supplied); demo balance 1.2 SOL · $148.
 * Studio: scenes are named Sequences; headlines, captions and the 3D rig are Interactive.Div with inline interpolate() styles.
 */
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, Interactive, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { FONTS, skinOf } from "../brand/tokens";
import { Fine } from "../components/Film";
import { BadgeMarkCtx, CoinView, DemoCoin, JitoRow, JitoSpeed, TradeAction, TradeAmountRow, TradeBal, TradeBalance, TradeBox, TradeEst, TradeQuote, TradeSide, TradeStatus, TradeTop } from "../components/Views";
import { AppFrame, SkinCtx } from "../components/ui";
import { lerp, ramp, settle } from "../lib/motion";
import { PANEL as R, PANEL_COPY as C, PANEL_T as T } from "../timeline";
import { ChainRow } from "./WelcomeBnbBase";

const JACK: DemoCoin = { name: "Jumping Jack", symbol: "JACK", age: "2m", color: "#e8a33c" };
const CHIPS = ["0.05", "0.1", "0.5", "Max"] as const; // BUY_PRESETS.slice(0, 3) + Max (balance minus a fee reserve)
const NAVY = "#06132a";
const springy = Easing.bezier(0.34, 1.56, 0.64, 1); // a confident overshoot
const inWin = (f: number, a: number, b: number) => f >= a && f < b;

/* =========================== background: the # field =========================== */
/** a grid of # glyphs (one template, intentionally edited as one item) */
const HashGrid: React.FC<{ step: number; size: number; color: string; glow: string; stagger?: boolean }> = ({ step, size, color, glow, stagger }) => {
  const n = Math.ceil(1800 / step);
  return (
    <div style={{ position: "absolute", left: -360, top: -360, width: 1800, height: 1800 }}>
      {Array.from({ length: n * n }, (_, i) => {
        const r = Math.floor(i / n), c = i % n;
        return <span key={i} style={{ position: "absolute", left: c * step + (stagger && r % 2 ? step / 2 : 0), top: r * step, font: `800 ${size}px/1 ${FONTS.ui}`, color, textShadow: glow }}>#</span>;
      })}
    </div>
  );
};
const BOKEH: [number, number, number][] = [[80, 140, 150], [860, 90, 110], [960, 620, 170], [40, 760, 120], [520, 980, 140], [700, 330, 90], [300, 470, 80], [1100, 1100, 160]];
const HashField: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 40%, #0d2c5c 0%, ${NAVY} 62%, #030a17 100%)`, overflow: "hidden" }}>
      <Interactive.Div name="Hash layer (far)" style={{ position: "absolute", inset: 0, opacity: 0.32,
        translate: interpolate(frame, [0, 600], ["0px 0px", "-150px -150px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        <HashGrid step={74} size={26} color="#1d6aa5" glow="none" stagger />
      </Interactive.Div>
      <Interactive.Div name="Hash layer (mid)" style={{ position: "absolute", inset: 0, opacity: 0.38,
        translate: interpolate(frame, [0, 600], ["0px 0px", "-320px -320px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        <HashGrid step={168} size={58} color="#2c8fd6" glow="0 0 18px rgba(74,169,233,.8)" />
      </Interactive.Div>
      <Interactive.Div name="Hash layer (near, bokeh)" style={{ position: "absolute", inset: 0, opacity: 0.5, filter: "blur(4px)",
        translate: interpolate(frame, [0, 600], ["0px 0px", "-560px -560px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        {BOKEH.map(([x, y, s], i) => <Img key={i} src={staticFile("brand/hash-blue.png")} style={{ position: "absolute", left: x, top: y, width: s, height: s, opacity: 0.55, filter: "drop-shadow(0 0 24px #4aa9e9)" }} />)}
      </Interactive.Div>
      {/* glow, scanlines, vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(50% 42% at 50% 52%, rgba(44,143,214,.28), transparent 70%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(159,220,255,.045) 0 1px, transparent 1px 4px)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(75% 75% at 50% 50%, transparent 55%, rgba(0,0,0,.65) 100%)" }} />
    </AbsoluteFill>
  );
};

/* =========================== the app state over the terminal scene =========================== */
type St = { side: TradeSide; amount: string; chip: number; est: TradeEst; bal: TradeBalance; speed: JitoSpeed; button: string; disabled: boolean; pressed: boolean;
  status: TradeStatus | null; sidePressed: TradeSide | null; speedPressed: JitoSpeed | null; chipPressed: number | null; bought: boolean };
/** numbers tick up as the quote lands */
const tick = (f: number, a: number, to: number, digits: number) => (to * ramp(f, a, a + 12, settle)).toFixed(digits);
const stateAt = (f: number): St => {
  const sell = f >= T.sellTab;
  const bought = f >= T.bought;
  const busyBuy = f >= T.enter + 2 && f < T.bought;
  const buyPicked = f >= T.chip && f < T.bought;
  const sellPicked = f >= T.pct;
  const est: TradeEst = !sell
    ? (buyPicked ? (f >= T.quoted ? { kind: "quote", out: tick(f, T.quoted, 2.7, 1) + "M", usd: "$" + tick(f, T.quoted, 11.4, 1), min: tick(f, T.quoted, 2.6, 1) + "M" } : { kind: "quoting" }) : { kind: "idle" })
    : (sellPicked ? (f >= T.sellQuoted ? { kind: "quote", out: tick(f, T.sellQuoted, 0.097, 3), min: tick(f, T.sellQuoted, 0.0921, 4) } : { kind: "quoting" }) : { kind: "idle" });
  const status: TradeStatus | null = sell ? (f >= T.sellPress + 2 ? { tone: "warn", text: "Approve in Phantom…" } : null)
    : bought ? { tone: "ok", text: "Bought ≈ 2.7M $JACK", tx: true }
    : f >= T.confirming ? { tone: "warn", text: "Confirming…", tx: true }
    : f >= T.sending ? { tone: "warn", text: "Sending as a Jito bundle (Turbo)…" }
    : f >= T.enter + 2 ? { tone: "warn", text: "Approve in Phantom…" } : null;
  return {
    side: sell ? "sell" : "buy",
    amount: sell ? (sellPicked ? "2.7M" : "") : buyPicked ? "0.1" : "",
    chip: sell ? (sellPicked ? 2 : -1) : buyPicked ? 1 : -1,
    est,
    bal: sell ? { label: "You hold", value: "2.7M $JACK", usd: "$11.4" } : { label: "Balance", value: "1.2 SOL", usd: "$148" },
    speed: f >= T.turbo ? "turbo" : "fast",
    button: busyBuy || (sell && f >= T.sellPress + 2) ? "Working…" : sell ? "Sell $JACK" : "Buy $JACK",
    disabled: sell ? !sellPicked : !buyPicked && !busyBuy,
    pressed: inWin(f, T.sellPress, T.sellPress + 5),
    status,
    sidePressed: inWin(f, T.sellTab - 2, T.sellTab + 3) ? "sell" : null,
    speedPressed: inWin(f, T.turbo - 2, T.turbo + 3) ? "turbo" : null,
    chipPressed: inWin(f, T.chip - 2, T.chip + 3) ? 1 : inWin(f, T.pct - 2, T.pct + 3) ? 2 : null,
    bought,
  };
};

/* =========================== floating panels =========================== */
/** a tap: a blue ripple at app px inside a panel */
const Ripple: React.FC<{ f: number; at: number; x: number; y: number }> = ({ f, at, x, y }) => {
  const t = ramp(f, at - 1, at + 12);
  if (f < at - 1 || f > at + 13) return null;
  return <span style={{ position: "absolute", left: x - 18, top: y - 18, width: 36, height: 36, borderRadius: "50%", border: "3px solid #4aa9e9", background: "rgba(74,169,233,.25)",
    opacity: 1 - t, scale: String(0.4 + 1.4 * t), pointerEvents: "none" }} />;
};
type Win = [number, number];
/**
 * One part of the card, lifted off. home: where it sits in the card (stage px from the card centre, at the card's scale);
 * slot: where it floats (x, y, z, rotateY deg, scale). focus: windows when it comes forward; while another panel has focus, it recedes.
 */
const FloatPanel: React.FC<{ name: string; f: number; home: [number, number]; slot: [number, number, number, number, number]; width: number;
  focus?: Win[]; anyFocus: boolean; pad?: number; children: React.ReactNode }> = ({ f, home, slot, width, focus = [], anyFocus, pad = 10, children }) => {
  const out = ramp(f, T.explode + slot[2] * 0.02, T.explode + 22 + slot[2] * 0.02, springy) * (1 - ramp(f, T.snap, T.snap + 26, Easing.bezier(0.7, 0, 0.84, 0)));
  const foc = Math.max(0, ...focus.map(([a, b]) => ramp(f, a, a + 8, settle) * (1 - ramp(f, b - 8, b, settle))));
  const dim = anyFocus && foc < 0.5 ? 1 : 0;
  const k = out, CARD_S = 1.25;
  const x = lerp(home[0], slot[0], k), y = lerp(home[1], slot[1], k) - 6 * foc;
  const z = slot[2] * k + 90 * foc - 140 * dim * k;
  const sc = lerp(CARD_S, slot[4], k) * (1 + 0.07 * foc);
  const vis = ramp(out, 0, 0.18); // fades in as it leaves the card and out as it lands back
  return (
    <div style={{ position: "absolute", left: 540 + x, top: 600 + y, width: 0, height: 0, transformStyle: "preserve-3d",
      transform: `translateZ(${z}px) rotateY(${slot[3] * k}deg) rotateX(${-4 * k}deg)` }}>
      <div style={{ position: "absolute", left: (-width * sc) / 2, top: 0, width, translate: "0 -50%", transformOrigin: "0 0", scale: String(sc), opacity: vis, filter: `brightness(${1 - 0.42 * dim * k}) saturate(${1 - 0.3 * dim * k})`,
        padding: pad, borderRadius: 8, background: "linear-gradient(180deg, rgba(255,255,255,.97), rgba(240,246,251,.95))",
        boxShadow: `0 0 0 1px rgba(159,220,255,${0.65 + 0.35 * foc}), 0 0 ${14 + 26 * foc}px rgba(74,169,233,${0.35 + 0.45 * foc}), 0 ${18 + 14 * foc}px ${40 + 20 * foc}px rgba(0,0,0,.55)` }}>
        {/* the glass edge: a thin top highlight */}
        <div style={{ position: "absolute", left: 6, right: 6, top: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,1), transparent)" }} />
        <div style={{ position: "relative" }}>{children}</div>
      </div>
    </div>
  );
};

/** illustrative candles (no axis, no prices); the last one keeps ticking */
const Candles: React.FC<{ f: number }> = ({ f }) => {
  const cs = Array.from({ length: 26 }, (_, i) => {
    const base = 70 - i * 1.6 - Math.sin(i * 0.9) * 8;
    const o = base + Math.sin(i * 2.1) * 6, c = base - Math.cos(i * 1.7) * 7 - (i === 25 ? Math.sin(f / 6) * 5 : 0);
    return { o, c, h: Math.min(o, c) - 4 - (i % 3) * 3, l: Math.max(o, c) + 3 + (i % 4) * 2 };
  });
  return (
    <svg width={306} height={140} style={{ display: "block", background: "#fff", border: "1px solid #e3e3e3", borderRadius: 4 }}>
      {[35, 70, 105].map((y) => <line key={y} x1={0} x2={306} y1={y} y2={y} stroke="#eee" />)}
      {cs.map((k, i) => {
        const x = 14 + i * 11, col = k.c < k.o ? "#2e9e4f" : "#d0343a";
        return <g key={i}><line x1={x} x2={x} y1={k.h} y2={k.l} stroke={col} /><rect x={x - 3.5} width={7} y={Math.min(k.o, k.c)} height={Math.max(2, Math.abs(k.o - k.c))} fill={col} /></g>;
      })}
    </svg>
  );
};
/** renderTrades (2012): BUY / SELL, amount ("—" without market data), wallet, age; your trade slides in on top */
const Trades: React.FC<{ f: number }> = ({ f }) => {
  const mine = ramp(f, T.bought + 2, T.bought + 12, settle);
  const row = (kind: "buy" | "sell", amt: string, when: string, hi = false) => (
    <div style={{ display: "grid", gridTemplateColumns: "38px 1fr 1fr 30px", gap: 4, alignItems: "center", padding: "5px 2px", borderTop: "1px solid #eee", font: `11px/1 ${FONTS.ui}`,
      background: hi ? `rgba(98,196,98,${0.18 * (1 - ramp(f, T.bought + 30, T.bought + 60))})` : undefined }}>
      <span style={{ font: `bold 10px/1 ${FONTS.ui}`, letterSpacing: ".03em", color: kind === "buy" ? "#2e9e4f" : "#d0343a" }}>{kind === "buy" ? "BUY" : "SELL"}</span>
      <span style={{ color: kind === "buy" ? "#2e9e4f" : "#d0343a", fontWeight: hi ? "bold" : "normal" }}>{amt}</span>
      <span style={{ color: "#999" }}>xxxx…xxxx</span>
      <span style={{ color: "#999", textAlign: "right" }}>{when}</span>
    </div>
  );
  return (
    <div style={{ width: 240 }}>
      <div style={{ overflow: "hidden", height: 23 * mine }}>{row("buy", "$11.4", "1s", true)}</div>
      {row("sell", "—", "1m")}{row("buy", "—", "2m")}{row("buy", "—", "4m")}{row("sell", "—", "7m")}
    </div>
  );
};

/** the Enter keycap ("Enter key trades"), pressed to buy */
const Keycap: React.FC<{ f: number }> = ({ f }) => {
  const t = ramp(f, T.enter - 18, T.enter - 8, springy) * (1 - ramp(f, T.enter + 22, T.enter + 30));
  const down = inWin(f, T.enter - 1, T.enter + 4);
  if (t <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 836, top: 668, opacity: Math.min(1, t * 1.4), scale: String(0.7 + 0.3 * t), translate: down ? "0 6px" : "0 0",
      padding: "18px 26px", borderRadius: 16, background: "linear-gradient(#2b3e5c, #15233a)", border: "2px solid #4aa9e9",
      boxShadow: down ? "0 2px 0 #0b1526, 0 0 30px rgba(74,169,233,.8)" : "0 8px 0 #0b1526, 0 0 22px rgba(74,169,233,.5)",
      font: `800 40px/1 ${FONTS.ui}`, color: "#fff", letterSpacing: ".02em" }}>Enter ⏎</div>
  );
};

/* =========================== scenes =========================== */
const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
      <Interactive.Div name="Intro icon" style={{ width: 150, height: 150,
        scale: interpolate(frame, [0, 16], [0.9, 1], { easing: Easing.bezier(0.34, 1.56, 0.64, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        opacity: interpolate(frame, [0, 64, 76], [1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 150, height: 150, filter: "drop-shadow(0 0 30px rgba(74,169,233,.7))" }} />
      </Interactive.Div>
      <Interactive.Div name="Intro headline" style={{ font: `900 96px/1.02 ${FONTS.ui}`, letterSpacing: "-.035em", color: "#fff", textAlign: "center", textShadow: "0 6px 30px rgba(0,0,0,.6)",
        translate: interpolate(frame, [0, 18], ["0px 14px", "0px 0px"], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        opacity: interpolate(frame, [0, 64, 76], [1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        {C.intro.head}<br /><span style={{ color: "#9fdcff" }}>{C.intro.head2}</span>
      </Interactive.Div>
    </AbsoluteFill>
  );
};

/** a beat's caption, top centre */
const Beat: React.FC<{ name: string; text: string }> = ({ name, text }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", flexDirection: "column", paddingTop: 70 }}>
      <Interactive.Div name={name} style={{ font: `900 64px/1.05 ${FONTS.ui}`, letterSpacing: "-.03em", color: "#fff", textAlign: "center", padding: "0 80px", textShadow: "0 4px 24px rgba(0,0,0,.7)",
        translate: interpolate(frame, [0, 10], ["0px 24px", "0px 0px"], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        {text}
      </Interactive.Div>
    </AbsoluteFill>
  );
};

const Terminal: React.FC = () => {
  const f = useCurrentFrame();
  const st = stateAt(f);
  const exploded = ramp(f, T.explode, T.explode + 20) * (1 - ramp(f, T.snap, T.snap + 26));
  const focusQuote: Win[] = [[T.chip - 12, T.turbo - 14], [T.sellTab - 10, T.snap]];
  const focusTop: Win[] = [[T.chip - 12, T.chip + 14], [T.sellTab - 10, T.pct + 12]];
  const focusJito: Win[] = [[T.turbo - 14, T.enter - 14]];
  const focusAction: Win[] = [[T.enter - 14, T.sellTab - 10], [T.pct + 14, T.snap]];
  const anyFocus = f >= T.chip - 12 && f < T.snap;
  // the card's own parts fade out as their panels lift off, and back as they land
  const ghost = 1 - ramp(exploded, 0, 0.3);
  const card = (
    <AppFrame scale={1.25} tab="tokens" tokenCount={6} scrollY={90} connected>
      <CoinView drawT={1} coin={JACK} badge trade={
        <TradeBox side={st.side} symbol="JACK" jito est={st.est} amount={st.amount} chip={st.chip} chips={CHIPS} bal={st.bal} jitoSpeed={st.speed}
          button={st.button} disabled={st.disabled} pressed={st.pressed} status={st.status}
          ghost={{ top: ghost, amount: ghost, quote: ghost, bal: ghost, jito: ghost, action: ghost }} />} />
    </AppFrame>
  );
  return (
    <AbsoluteFill>
      {/* calm the pattern behind the UI */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(46% 44% at 50% 56%, rgba(3,10,23,${0.75 * ramp(f, 0, 20)}), transparent 75%)` }} />
      <AbsoluteFill style={{ perspective: 1600, perspectiveOrigin: "50% 52%" }}>
        <Interactive.Div name="Terminal rig (orbit)" style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d",
          rotate: interpolate(f, [0, 30, 375, 440], ["0 1 0 32deg", "0 1 0 -10deg", "0 1 0 8deg", "0 1 0 0deg"], { easing: Easing.bezier(0.22, 1, 0.36, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          translate: interpolate(f, [0, 30, 410, 440], ["0px 80px -1400px", "0px 0px 0px", "0px 0px 0px", "0px 30px -900px"], { easing: Easing.bezier(0.22, 1, 0.36, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          opacity: interpolate(f, [0, 8, 418, 440], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          {/* the card: recedes and dims while its parts float */}
          <div style={{ position: "absolute", left: 540 - 287.5, top: 600 - 325, width: 575, height: 650, borderRadius: 12, overflow: "hidden", transformStyle: "preserve-3d",
            transform: `translateZ(${-420 * exploded}px) rotateX(${8 * exploded}deg)`, filter: `brightness(${1 - 0.62 * exploded}) blur(${1.5 * exploded}px)`,
            boxShadow: "0 0 0 1px rgba(159,220,255,.6), 0 0 40px rgba(74,169,233,.35), 0 40px 80px rgba(0,0,0,.6)" }}>{card}</div>
          {/* the parts, lifted off (home = their place in the card at its 1.25 scale) */}
          <FloatPanel name="Chart" f={f} home={[0, -181]} slot={[-270, -318, -30, 16, 1.25]} width={326} anyFocus={anyFocus}><Candles f={f} /></FloatPanel>
          <FloatPanel name="Recent trades" f={f} home={[0, 300]} slot={[275, -312, -40, -16, 1.5]} width={260} focus={[[T.bought, T.sellTab - 10]]} anyFocus={anyFocus}><Trades f={f} /></FloatPanel>
          <FloatPanel name="Trade controls" f={f} home={[0, -30]} slot={[-40, -150, 130, 6, 1.6]} width={306} focus={focusTop} anyFocus={anyFocus}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <TradeTop side={st.side} sidePressed={st.sidePressed} />
              <TradeAmountRow side={st.side} symbol="JACK" amount={st.amount} chip={st.chip} chips={st.side === "buy" ? CHIPS : undefined} chipPressed={st.chipPressed} />
            </div>
            <Ripple f={f} at={T.chip} x={200} y={62} /><Ripple f={f} at={T.sellTab} x={95} y={23} /><Ripple f={f} at={T.pct} x={272} y={62} />
          </FloatPanel>
          <FloatPanel name="Quote + balance" f={f} home={[0, 52]} slot={[50, -22, 170, -6, 1.75]} width={306} focus={focusQuote} anyFocus={anyFocus}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <TradeQuote est={st.est} side={st.side} symbol="JACK" />
              <TradeBal bal={st.bal} />
            </div>
          </FloatPanel>
          <FloatPanel name="Jito speed" f={f} home={[0, 109]} slot={[-40, 98, 140, 6, 1.6]} width={306} focus={focusJito} anyFocus={anyFocus}>
            <JitoRow on compact speed={st.speed} speedPressed={st.speedPressed} />
            <Ripple f={f} at={T.turbo} x={194} y={9} />
          </FloatPanel>
          <FloatPanel name="Button + status" f={f} home={[0, 175]} slot={[40, 222, 180, -6, 1.6]} width={306} focus={focusAction} anyFocus={anyFocus}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <TradeAction button={st.button} sell={st.side === "sell"} pressed={st.pressed} disabled={st.disabled} status={st.status} />
            </div>
            <Ripple f={f} at={T.sellPress} x={153} y={16} />
          </FloatPanel>
        </Interactive.Div>
      </AbsoluteFill>
      <Keycap f={f} />
      {/* the setVerdict toast, floating */}
      {/* in the headline slot: the buy caption hands over to it */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 74, display: "flex", justifyContent: "center",
        opacity: ramp(f, T.bought, T.bought + 6) * (1 - ramp(f, T.sellTab - 12, T.sellTab - 4)), scale: String(0.9 + 0.1 * ramp(f, T.bought, T.bought + 10, springy)) }}>
        <div style={{ display: "flex", gap: 12, padding: "14px 26px", borderRadius: 10, background: "rgba(20,20,20,.94)", boxShadow: "0 0 0 1px rgba(159,220,255,.5), 0 0 30px rgba(74,169,233,.45)",
          font: `bold 40px/1.2 ${FONTS.ui}`, color: "#fff" }}>Bought $JACK!<span style={{ fontWeight: 400, color: "#ddd" }}>Bought ≈ 2.7M $JACK</span></div>
      </div>
      <Fine text={C.fine} color="rgba(220,236,255,.82)" t={ramp(f, 30, 44) * (1 - ramp(f, 410, 430))} />
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 34, paddingBottom: 40 }}>
        <Interactive.Div name="End icon" style={{ width: 130, height: 130,
          scale: interpolate(frame, [0, 14], [0.5, 1], { easing: Easing.bezier(0.34, 1.56, 0.64, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 130, height: 130, filter: "drop-shadow(0 0 30px rgba(74,169,233,.7))" }} />
        </Interactive.Div>
        <Interactive.Div name="End headline" style={{ font: `900 92px/1.04 ${FONTS.ui}`, letterSpacing: "-.035em", color: "#fff", textAlign: "center", textShadow: "0 6px 30px rgba(0,0,0,.6)",
          translate: interpolate(frame, [4, 20], ["0px 30px", "0px 0px"], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          opacity: interpolate(frame, [4, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          {C.end.head}<br /><span style={{ color: "#9fdcff" }}>{C.end.head2}</span>
        </Interactive.Div>
        <Interactive.Div name="End url" style={{ padding: "16px 36px", borderRadius: 999, background: "#fff", color: "#1a8bd6", font: `800 40px/1 ${FONTS.ui}`,
          opacity: interpolate(frame, [16, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          scale: interpolate(frame, [16, 28], [0.85, 1], { easing: Easing.bezier(0.34, 1.56, 0.64, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          {C.end.url}
        </Interactive.Div>
        <Interactive.Div name="End chain row" style={{ opacity: interpolate(frame, [26, 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <ChainRow size={70} color="#dcecff" font={24} />
        </Interactive.Div>
      </AbsoluteFill>
      <Fine text={C.end.fine} color="rgba(220,236,255,.8)" t={ramp(frame, 30, 44)} />
    </AbsoluteFill>
  );
};

export const TweetpadTradePanel: React.FC<{ skin?: "2012" | "tweetcraft" }> = ({ skin = "2012" }) => {
  loadFonts();
  const t = (k: keyof typeof T) => R.terminal.from + T[k];
  return (
    <SkinCtx.Provider value={skinOf(skin)}>
      <BadgeMarkCtx.Provider value={{ bnb: "#fff" }}>
        <AbsoluteFill style={{ background: NAVY }}>
          <Sequence name="# field">
            <HashField />
          </Sequence>
          <Sequence name="1 Intro: headline" from={R.intro.from} durationInFrames={R.intro.dur}>
            <Intro />
          </Sequence>
          <Sequence name="2 Terminal (3D)" from={R.terminal.from} durationInFrames={R.terminal.dur}>
            <Terminal />
          </Sequence>
          <Sequence name="Caption: quote" from={t("chip") - 12} durationInFrames={T.turbo - T.chip - 2}>
            <Beat name="Caption: quote" text={C.beats.quote} />
          </Sequence>
          <Sequence name="Caption: Jito" from={t("turbo") - 14} durationInFrames={T.enter - T.turbo}>
            <Beat name="Caption: Jito" text={C.beats.jito} />
          </Sequence>
          <Sequence name="Caption: buy" from={t("enter") - 14} durationInFrames={T.bought - T.enter + 14}>
            <Beat name="Caption: buy" text={C.beats.buy} />
          </Sequence>
          <Sequence name="Caption: sell" from={t("sellTab") - 10} durationInFrames={T.snap - T.sellTab + 10}>
            <Beat name="Caption: sell" text={C.beats.sell} />
          </Sequence>
          <Sequence name="3 End card" from={R.end.from} durationInFrames={R.end.dur}>
            <EndCard />
          </Sequence>
        </AbsoluteFill>
      </BadgeMarkCtx.Provider>
    </SkinCtx.Provider>
  );
};
