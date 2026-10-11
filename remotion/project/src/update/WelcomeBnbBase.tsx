/**
 * TweetpadWelcomeBnbBase: the BNB Chain + Base announcement. 1080x1080 @30, 2012 skin, 19.0 s. A tight announcement, not a
 * walkthrough: Now live (pure white) → two welcome posts → one montage that shows each thing tweetpad does once → end.
 * FRAMING (real people): @cz_binance and @jessepollak are WELCOMED in posts by Agent Inu @tweetpad. They are never authors:
 * their avatars appear only as mention chips, each with its chain badge. No quotes, replies, likes, invented checks or
 * "joined" / "partnered" / "backed by" wording.
 * Montage strings are verbatim app copy, as in films 4–5 (renderTrade, onLaunchEvm, renderFeeBox, #jito-row); the BNB badge uses the
 * app's current mark (BNB yellow, white mark) through BadgeMarkCtx, so films 1–5 keep theirs.
 */
import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { BRAND, FONTS, skinOf } from "../brand/tokens";
import { Caption, Cursor, cursorAt, Fine, Ground } from "../components/Film";
import { EvmLine, LaunchForm, LaunchFormProps } from "../components/LaunchForm";
import { BadgeMarkCtx, ChainBadge, CoinView, DemoCoin, TradeBox, TradeEst } from "../components/Views";
import { AppFrame, Net, NetLogo, NETS_4, netXY, OfficialStrip, SkinCtx, Tab, Toast, WelcomeTweet } from "../components/ui";
import { Cam, camMap, CaptionBand, Stage } from "../howto/parts";
import { lerp, pop, ramp, settle } from "../lib/motion";
import { End } from "../scenes/End";
import { APP } from "../scenes/layout";
import { WELCOME as R, WELCOME_BEAT_DUR as BD, WELCOME_BEATS, WELCOME_COPY as C } from "../timeline";

const BADGE_MARKS = { bnb: "#fff" }; // .chain-badge.bnb today: BNB yellow, white mark
const inWin = (f: number, a: number, b: number) => f >= a && f < b;

/* ---------- a chain logo on its badge colours (.chain-badge, large) ---------- */
const DISC_BG: Record<Net, string> = { solana: "#000", robinhood: "#ccff00", bnb: "#f0b90b", base: "#0000ff", ethereum: "#627eea" };
const DISC_FG: Record<Net, string> = { solana: "", robinhood: "#000", bnb: "#fff", base: "#fff", ethereum: "#fff" };
export const ChainDisc: React.FC<{ net: Net; size: number }> = ({ net, size }) => {
  const k = net === "base" ? 0.46 : 0.58;
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", background: DISC_BG[net], display: "grid", placeItems: "center", boxShadow: "0 6px 16px rgba(20,23,26,.18)" }}>
      {net === "solana" ? <Img src={staticFile("brand/solana.svg")} style={{ width: size * k, height: size * k, objectFit: "contain" }} /> : <NetLogo net={net} c={DISC_FG[net]} size={size * k} />}
    </span>
  );
};
/** the four chains, logos with names under them (pop: per-item 0..1) */
export const ChainRow: React.FC<{ size: number; color: string; font: number; pop?: (i: number) => number }> = ({ size, color, font, pop: p = () => 1 }) => (
  <div style={{ display: "flex", justifyContent: "center", gap: size * 0.42 }}>
    {C.chains.map((c, i) => {
      const t = p(i);
      return (
        <div key={c.net} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.16, width: size * 1.6, transform: `scale(${t})`, opacity: Math.min(1, t * 1.5) }}>
          <ChainDisc net={c.net} size={size} />
          <span style={{ font: `700 ${font}px/1 ${FONTS.ui}`, color, whiteSpace: "nowrap" }}>{c.name}</span>
        </div>
      );
    })}
  </div>
);

/* ---------- 1. Now live, on pure white ---------- */
const Live: React.FC = () => {
  const f = useCurrentFrame(); const d = R.live.dur;
  // frame 0 is the thumbnail: the lockup and "Now live" are already there and only settle; the chains pop in after
  const lock = 0.75 + 0.25 * ramp(f, 0, 12, settle), head = 0.75 + 0.25 * ramp(f, 4, 16, settle);
  const out = 1 - ramp(f, d - 8, d, settle);
  return (
    <AbsoluteFill style={{ background: "#fff", opacity: out }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 130, display: "flex", alignItems: "center", justifyContent: "center", gap: 22,
        opacity: 1, transform: `translateY(${(1 - lock) * 14}px)` }}>
        <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 130, height: 130, filter: "drop-shadow(0 10px 18px rgba(0,60,120,.22))" }} />
        <Img src={staticFile("brand/wordmark-cyan-1600.png")} style={{ width: 400 }} />
      </div>
      <div style={{ position: "absolute", left: 40, right: 40, top: 330, textAlign: "center", font: `900 150px/1 ${FONTS.ui}`, letterSpacing: "-.045em", color: BRAND.ink,
        transform: `translateY(${(1 - head) * 24}px) scale(${0.94 + 0.06 * head})` }}>{C.live.head}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 580 }}>
        <ChainRow size={104} color={BRAND.darkGray} font={28} pop={(i) => pop(f, 22 + i * 7)} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 60, textAlign: "center", font: `700 30px/1 ${FONTS.ui}`, color: BRAND.lightGray, opacity: ramp(f, 40, 52) }}>{C.live.url}</div>
    </AbsoluteFill>
  );
};

/* ---------- 2. welcome posts by Agent Inu @tweetpad, each MENTIONING an account (never authored by it) ---------- */
type WelcomeKey = "cz" | "jesse";
const linkify = (t: string) => t.split(/([@#][A-Za-z0-9_]+)/g).map((p, i) => (/^[@#]/.test(p) ? <span key={i} style={{ color: "#0084b4" }}>{p}</span> : p));
const WelcomePost: React.FC<{ who: WelcomeKey; t: number; chipT: number; top: number }> = ({ who, t, chipT, top }) => {
  const w = C.welcome[who], a = C.welcome.author;
  return (
    <div style={{ position: "absolute", left: 110, width: 860, top, display: "flex", gap: 20, padding: 22, background: "#fff", border: "2px solid #c8c8c8", borderRadius: 10,
      boxShadow: "0 16px 44px rgba(20,23,26,.12)", opacity: t, transform: `translateY(${(1 - t) * 50}px)` }}>
      <Img src={staticFile("brand/agent-inu.jpg")} style={{ width: 84, height: 84, borderRadius: 10, objectFit: "cover", flex: "none", boxShadow: "0 2px 4px rgba(0,0,0,.25)" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <b style={{ font: `700 28px/1.2 ${FONTS.ui}`, color: "#333" }}>{a.name}</b>
          <span style={{ font: `24px/1.2 ${FONTS.ui}`, color: "#999" }}>{a.handle}</span>
          <span style={{ marginLeft: "auto", font: `24px/1.2 ${FONTS.ui}`, color: "#999" }}>{a.time}</span>
        </div>
        <p style={{ margin: "6px 0 0", font: `30px/1.36 ${FONTS.serif}`, color: "#333" }}>{linkify(w.tweet)}</p>
        {/* the mentioned account as a chip: its avatar with its chain badge (like a coin image) and its handle */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginTop: 16, padding: "7px 20px 7px 7px", background: "#f5f8fa", border: "2px solid #e1e8ed", borderRadius: 999,
          transform: `scale(${chipT})`, transformOrigin: "0 50%", opacity: Math.min(1, chipT * 1.5) }}>
          <span style={{ position: "relative", display: "inline-flex", lineHeight: 0 }}>
            <Img src={staticFile(w.pfp)} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", imageRendering: w.pixel ? "pixelated" : "auto" }} />
            <ChainBadge chain={w.chain} size={64} diam={26} />
          </span>
          <b style={{ font: `700 28px/1 ${FONTS.ui}`, color: "#0084b4" }}>{w.handle}</b>
        </div>
      </div>
    </div>
  );
};
const Welcome: React.FC = () => {
  const f = useCurrentFrame(); const d = R.welcome.dur;
  const second = 84; // the Base post stacks in
  const out = 1 - ramp(f, d - 10, d, settle);
  const capA = ramp(f, 6, 16) * (1 - ramp(f, second - 8, second, settle));
  const capB = ramp(f, second + 2, second + 12) * out;
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <WelcomePost who="cz" t={ramp(f, 0, 16, settle)} chipT={pop(f, 18)} top={lerp(330, 220, ramp(f, second - 6, second + 12, settle))} />
      <WelcomePost who="jesse" t={ramp(f, second, second + 16, settle)} chipT={pop(f, second + 18)} top={560} />
      <Caption head={C.welcome.cz.cap} t={capA} y={70} />
      <Caption head={C.welcome.jesse.cap} t={capB} y={70} />
      <Fine text={C.welcome.fine} t={0.9 * ramp(f, 0, 16)} />
    </AbsoluteFill>
  );
};

/* ---------- 3. the montage: each thing tweetpad does, once ---------- */
type Key = [number, number, number];
const Beat: React.FC<{ cam: Cam; scroll: number; tab?: Tab; net?: Net; netT?: number; toast?: React.ReactNode; children: React.ReactNode;
  cursor?: { keys: Key[]; down: boolean; t?: number; hand?: boolean; size?: number } }> = ({ cam, scroll, tab = "launch", net = "bnb", netT, toast, children, cursor }) => {
  const f = useCurrentFrame();
  const m = camMap(cam);
  const cur = cursor ? cursorAt(f, cursor.keys.map(([k, x, y]) => [k, m(x, y).x, m(x, y).y] as [number, number, number])) : null;
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <AppFrame scale={APP.scale} tab={tab} tokenCount={6} scrollY={scroll} connected net={net} netT={netT} nets={NETS_4} toast={toast}>{children}</AppFrame>
      </Stage>
      {cur && cursor ? <Cursor x={cur.x} y={cur.y} down={cursor.down} t={cursor.t ?? 1} hand={cursor.hand ?? true} size={cursor.size ?? 1.25} /> : null}
    </AbsoluteFill>
  );
};
const evmLine: EvmLine = { address: "0xxx…xxxx", wallet: "MetaMask" };
const bnbForm = (p: Partial<LaunchFormProps>): LaunchFormProps => ({ chain: "bnb", nets: NETS_4, evmLine, holders: 30, image: "brand/agent-inu.jpg", name: "Diamond Paws", ticker: "PAWS",
  devBuy: 3, button: "Launch $PAWS on BNB · buy 0.05 BNB", ...p });
const LaunchTab: React.FC<{ fp: LaunchFormProps }> = ({ fp }) => (<><OfficialStrip /><WelcomeTweet /><LaunchForm {...fp} /></>);

/** a. one tap in the tab bar: Solana → BNB Chain; the form follows (unit, presets, note, Creator fees) */
const BeatChain: React.FC = () => {
  const f = useCurrentFrame(); const tap = 14;
  const bnb = f >= tap;
  const xy = netXY("bnb", NETS_4);
  const fp: LaunchFormProps = bnb ? bnbForm({ image: null, name: "", ticker: "", devBuy: 0, button: "Add an image", buttonPrimary: false })
    : { chain: "solana", nets: NETS_4, button: "Add an image", buttonPrimary: false };
  return (
    <Beat cam={{ z: 1.25, fx: 230, fy: 380, k: 0.4 }} scroll={lerp(300, 400, ramp(f, tap + 1, tap + 10, settle))} net={bnb ? "bnb" : "solana"} netT={lerp(0, 2, ramp(f, tap + 1, tap + 8, settle))}
      cursor={{ keys: [[0, xy[0] + 30, xy[1] - 40], [tap - 3, xy[0], xy[1] + 2], [BD, xy[0] + 6, xy[1] + 6]], down: inWin(f, tap, tap + 5) }}>
      <LaunchTab fp={fp} />
    </Beat>
  );
};
/** b. Launch: onLaunchEvm's last lines on BNB Chain */
type Chk = { text: string; done: boolean; link?: string };
const IPFS: Chk = { text: "Image and metadata on IPFS", done: true, link: "JSON ↗" };
const BUILT: Chk = { text: "Transaction built and checked against the live launcher", done: true };
const BeatLaunch: React.FC = () => {
  const f = useCurrentFrame(); const live = 16;
  const checks: Chk[] = [IPFS, BUILT, f >= live ? { text: "$PAWS is live on BNB Chain", done: true, link: "Explorer ↗" } : { text: "Confirming on BNB Chain…", done: false, link: "Tx ↗" }];
  return (
    <Beat cam={{ z: 1.3, fx: 230, fy: 370, k: 0.4 }} scroll={440} toast={<Toast title="Token launched!" text="Share it: the link plays as its own card on X" t={ramp(f, live, live + 8)} />}>
      <LaunchTab fp={bnbForm({ button: f >= live ? "Launch another" : "Launching…", checks })} />
    </Beat>
  );
};
/** c. Jito: the Solana launch form's "⚡ Bundle with Jito" row (checked by default) */
const BeatJito: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Beat cam={{ z: 1.5, fx: 230, fy: 330, k: 0.5 }} scroll={270} net="solana" cursor={{ keys: [[0, 300, 300], [16, 76, 318], [BD, 76, 318]], down: false, t: ramp(f, 0, 6) }}>
      <LaunchTab fp={{ chain: "solana", nets: NETS_4, image: "brand/agent-inu.jpg", name: "Such Launch", ticker: "WOW", devBuy: 1, jito: true, button: "Launch $WOW · buy 0.1 SOL", ring: f >= 4 ? "jito" : null }} />
    </Beat>
  );
};
/** d. Buy | Sell on a Solana coin: the bought quote, then Sell → 100% → the sell quote (owner-supplied live-curve figures) */
const JACK: DemoCoin = { name: "Jumping Jack", symbol: "JACK", age: "2m", color: "#e8a33c" };
const BeatTrade: React.FC = () => {
  const f = useCurrentFrame(); const sellAt = 14, pctAt = 24, quoted = 32;
  const sell = f >= sellAt, picked = f >= pctAt;
  const est: TradeEst = !sell ? { kind: "quote", out: "2.7M", min: "2.6M" } : !picked ? { kind: "hold", qty: "2.7M" } : f >= quoted ? { kind: "quote", out: "0.097", min: "0.0921" } : { kind: "quoting" };
  return (
    <Beat cam={{ z: 1.4, fx: 230, fy: 230, k: 0.55 }} scroll={150} tab="tokens" net="bnb"
      cursor={{ keys: [[0, 230, 313], [sellAt - 4, 174, 164], [sellAt + 4, 174, 164], [pctAt - 3, 346, 202], [BD, 346, 202]], down: inWin(f, sellAt, sellAt + 4) || inWin(f, pctAt, pctAt + 4) }}>
      <CoinView drawT={1} coin={JACK} badge trade={<TradeBox side={sell ? "sell" : "buy"} symbol="JACK" jito est={est}
        amount={!sell ? "0.1" : picked ? "2.7M" : ""} chip={!sell ? 1 : picked ? 2 : -1} button={sell ? "Sell $JACK" : "Buy $JACK"} disabled={sell && !picked}
        sidePressed={inWin(f, sellAt - 2, sellAt + 3) ? "sell" : null} />} />
    </Beat>
  );
};
/** e. Creator fees: drag the holders' share 0% → 30% (renderFeeBox; holders claim in BNB on BNB Chain) */
const BeatFees: React.FC = () => {
  const f = useCurrentFrame(); const grab = 6, release = 30;
  const holders = 30 * ramp(f, grab, release, settle);
  return (
    <Beat cam={{ z: 1.85, fx: 220, fy: 180, k: 0.6 }} scroll={340}
      cursor={{ keys: [[0, 185, 240], [grab, 185, 224], [release, 195, 224], [BD, 200, 240]], down: f >= grab && f < release + 2, size: 2 }}>
      <LaunchTab fp={bnbForm({ holders })} />
    </Beat>
  );
};
const BEATS: Record<(typeof WELCOME_BEATS)[number], React.FC> = { chain: BeatChain, launch: BeatLaunch, jito: BeatJito, trade: BeatTrade, fees: BeatFees };

const Montage: React.FC = () => {
  const f = useCurrentFrame(); const d = R.montage.dur;
  const idx = Math.min(WELCOME_BEATS.length - 1, Math.floor(f / BD));
  const key = WELCOME_BEATS[idx], local = f - idx * BD;
  const capT = ramp(f, 0, 12) * (1 - ramp(f, d - 10, d, settle));
  const labelT = ramp(local, 0, 6) * (idx === WELCOME_BEATS.length - 1 ? 1 - ramp(f, d - 10, d) : 1);
  const b = C.montage.beats[key];
  return (
    <AbsoluteFill style={{ opacity: ramp(f, 0, 8) }}>
      {WELCOME_BEATS.map((k, i) => { const B = BEATS[k]; return <Sequence key={k} from={i * BD} durationInFrames={BD} name={`3${"abcde"[i]} ${k}`}><B /></Sequence>; })}
      <CaptionBand />
      <Caption head={C.montage.head} head2={C.montage.head2} t={capT} y={22} />
      {/* the beat's label, a pill under the headline */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 158, display: "flex", justifyContent: "center", opacity: labelT, transform: `translateY(${(1 - labelT) * 8}px)` }}>
        <span style={{ padding: "8px 18px", borderRadius: 999, background: BRAND.primary, color: "#fff", font: `800 22px/1 ${FONTS.ui}`, letterSpacing: ".04em" }}>
          {idx + 1} · {b.label}
        </span>
      </div>
      <Fine text={b.fine} t={0.9} />
    </AbsoluteFill>
  );
};

/* ---------- 4. end ---------- */
const EndScene: React.FC = () => (
  <End tagline={C.end.tagline} row={<ChainRow size={58} color="#fff" font={18} />} cc={C.end.cc} fine={C.end.fine} />
);

export const TweetpadWelcomeBnbBase: React.FC<{ skin?: "2012" | "tweetcraft" }> = ({ skin = "2012" }) => {
  loadFonts();
  const f = useCurrentFrame();
  const e = R.end;
  return (
    <SkinCtx.Provider value={skinOf(skin)}>
      <BadgeMarkCtx.Provider value={BADGE_MARKS}>
        <AbsoluteFill>
          <Ground blue={ramp(f, e.from - 6, e.from + 10)} />
          <Sequence from={R.live.from} durationInFrames={R.live.dur} name="1 Now live (white)"><Live /></Sequence>
          <Sequence from={R.welcome.from} durationInFrames={R.welcome.dur} name="2 Welcome posts"><Welcome /></Sequence>
          <Sequence from={R.montage.from} durationInFrames={R.montage.dur} name="3 Montage"><Montage /></Sequence>
          <Sequence from={e.from} durationInFrames={e.dur} name="4 End"><EndScene /></Sequence>
        </AbsoluteFill>
      </BadgeMarkCtx.Provider>
    </SkinCtx.Provider>
  );
};
