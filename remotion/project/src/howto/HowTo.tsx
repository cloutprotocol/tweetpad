/**
 * TweetpadHowToLaunch: "How to launch a token on tweetpad". 1080x1080 @30, SOLANA ONLY (the shipped flow).
 * Every app string is verbatim from src/embed.html + src/assets/tweetpad.js (renderLaunch, onLaunch, renderDevBuy,
 * renderWallets/setVerdict). Coin data is demo only: no prices, volumes or users.
 */
import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { skinOf } from "../brand/tokens";
import { Cursor, cursorAt, Fine, Ground } from "../components/Film";
import { LaunchForm, LaunchFormProps } from "../components/LaunchForm";
import { CoinView, TokenList } from "../components/Views";
import { AppFrame, OfficialStrip, SkinCtx, Tab, Toast, WelcomeTweet } from "../components/ui";
import { lerp, ramp, settle, typed } from "../lib/motion";
import { End } from "../scenes/End";
import { Hook } from "../scenes/Hook";
import { APP, CARD } from "../scenes/layout";
import { HOWTO, HOWTO_COPY } from "../timeline";
import { Cam, camLerp, camMap, CaptionBand, NO_CAM, Stage, StepCaption, TabRing, WALLET_OK, WalletMenu, WalletWindow } from "./parts";


/* ---------- demo coin + form state ---------- */
const NAME = "Such Launch", TICK = "WOW";
const DESC0 = "launched on tweetpad.io"; // the field's prefill (embed.html #tk-desc)
const DESC = DESC0 + " · such launch, very wow";
const X_HANDLE = "@yourhandle";
const IMG = "brand/agent-inu.jpg";
const FS = 216;            // scroll that puts the launch form at the top of the card (2012)
const FS_SOC = 300;        // …once the social fields are open
const FS_CHECKS = 380;     // …while the launch check lines run

/** app-px click targets in the scrolled form (checked against stills) */
const T = {
  drop: [117, 120], name: [270, 97], ticker: [270, 135], desc: [230, 196], socials: [92, 238],
  x: [250, 200], button: [230, 383], buyPreset01: [154, 338],
  // header, not connected ("Connect ▾"); once connected the avatar is narrower and the tabs sit further right
  tabs: { launch: [190, 19], tokens: [242, 19], feed: [296, 19], more: [344, 19], connect: [414, 19] }, tokensConnected: [276, 19],
  phantom: [300, 103],
} as const;
const TAB_RECT: Record<string, [number, number]> = { launch: [173, 35], tokens: [214, 57], feed: [278, 35], more: [320, 48] };

/** the full form at a given point in the walkthrough */
const form = (p: Partial<LaunchFormProps>): LaunchFormProps => ({ chain: "solana", button: "Connect wallet", ...p });
const FILLED = { image: IMG, name: NAME, ticker: TICK, desc: DESC };

/* ---------- one shot of the app with camera, caption and cursor ---------- */
type ShotProps = {
  cam: Cam; tab?: Tab; scroll: number; connected?: boolean; tokenCount?: number;
  toast?: React.ReactNode; overlay?: React.ReactNode; children: React.ReactNode;
  step?: { n?: number; head: string; sub?: string }; capT: number;
  cursor?: { keys: [number, number, number][]; down: boolean; t: number } | null;
  extra?: React.ReactNode; f: number;
};
const Shot: React.FC<ShotProps> = ({ cam, tab = "launch", scroll, connected, tokenCount = 5, toast, overlay, children, step, capT, cursor, extra, f }) => {
  const m = camMap(cam);
  let cur: { x: number; y: number } | null = null;
  if (cursor) {
    // cursor keys are in APP px (x,y) unless x < 0: then (-x, y) are raw film px (for the wallet window)
    const mapped = cursor.keys.map(([k, x, y]) => (x < 0 ? [k, -x, y] : [k, m(x, y).x, m(x, y).y]) as [number, number, number]);
    cur = cursorAt(f, mapped);
  }
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <AppFrame scale={APP.scale} tab={tab} tokenCount={tokenCount} connected={connected} scrollY={scroll} toast={toast} overlay={overlay}>
          {children}
        </AppFrame>
      </Stage>
      <CaptionBand />
      {step ? <StepCaption n={step.n} head={step.head} sub={step.sub} t={capT} /> : null}
      {extra}
      {cur && cursor ? <Cursor x={cur.x} y={cur.y} down={cursor.down} t={cursor.t} /> : null}
    </AbsoluteFill>
  );
};
const LaunchTab: React.FC<{ fp: LaunchFormProps }> = ({ fp }) => (<><OfficialStrip /><WelcomeTweet /><LaunchForm {...fp} /></>);
const S = HOWTO_COPY.steps;
const inWin = (f: number, a: number, b: number) => f >= a && f < b;
/** zoom in, hold, zoom out: z=1 at both ends so cuts between steps are seamless */
const zoomCam = (f: number, dur: number, to: Cam, inAt = 14, outAt = dur - 22) =>
  camLerp(NO_CAM, to, ramp(f, inAt, inAt + 22, settle) * (1 - ramp(f, outAt, outAt + 20, settle)));
const capFade = (f: number, dur: number) => ramp(f, 0, 12) * (1 - ramp(f, dur - 10, dur, settle));

/* ---------- 1. intro ---------- */
const Intro: React.FC = () => <Hook head={HOWTO_COPY.intro.head} head2={HOWTO_COPY.intro.head2} tweet={HOWTO_COPY.intro.tweet} />;

/* ---------- 2. open + header tour ---------- */
const Tour: React.FC = () => {
  const f = useCurrentFrame();
  const g = ramp(f, 0, 26, settle);
  const x = lerp(CARD.x, APP.x, g), y = lerp(CARD.y, APP.y, g);
  const w = lerp(CARD.w, APP.w * APP.scale, g), h = lerp(CARD.h, APP.h * APP.scale, g);
  const scale = w / APP.w;
  const cover = 1 - ramp(f, 4, 18);
  const tabs = HOWTO_COPY.tour.tabs;
  const t0 = 62, per = 30;
  const idx = Math.floor((f - t0) / per);
  const active = f >= t0 && idx < tabs.length ? tabs[idx] : null;
  const ringT = active ? ramp(f - t0 - idx * per, 0, 6) * (1 - ramp(f - t0 - idx * per, per - 5, per)) : 0;
  const scroll = lerp(0, FS, ramp(f, 186, 208, settle));
  const camT = ramp(f, 48, 66, settle) * (1 - ramp(f, 182, 202, settle));
  const cam = camLerp(NO_CAM, { z: 1.45, fx: 290, fy: 40, k: 0.55 }, camT);
  const m = camMap(cam);
  const tabXY = (k: string) => { const p = (T.tabs as Record<string, readonly [number, number]>)[k]; return m(p[0], p[1] + 4); };
  const keys: [number, number, number][] = [[40, 900, 1060]];
  tabs.forEach((tb, i) => { const p = tabXY(tb.key); keys.push([t0 + i * per - 6, p.x, p.y], [t0 + i * per + 18, p.x, p.y]); });
  const cur = cursorAt(f, keys);
  const capT = ramp(f, 22, 40) * (1 - ramp(f, 200, 210, settle));
  const inner = (
    <AppFrame scale={g < 1 ? scale : APP.scale} h={g < 1 ? h / scale : APP.h} tab="launch" tokenCount={5} scrollY={scroll}
      overlay={active ? <TabRing x={TAB_RECT[active.key][0]} w={TAB_RECT[active.key][1]} label={active.label} title={active.title} t={ringT} /> : null}>
      <LaunchTab fp={form({})} />
    </AppFrame>
  );
  return (
    <AbsoluteFill>
      {g < 1 ? (
        <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: lerp(16, 10, g), overflow: "hidden", border: "1px solid #c8c8c8", boxShadow: `0 ${20 * g}px ${60 * g}px rgba(20,23,26,${0.18 * g})` }}>
          {inner}
          <Img src={staticFile("brand/card-preview.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: cover }} />
        </div>
      ) : (
        <Stage cam={cam}>{inner}</Stage>
      )}
      <CaptionBand />
      <StepCaption head={HOWTO_COPY.tour.head} sub={HOWTO_COPY.tour.sub} t={capT} />
      <Cursor x={cur.x} y={cur.y} down={tabs.some((_, i) => inWin(f, t0 + i * per - 2, t0 + i * per + 3))} t={ramp(f, 40, 52) * (1 - ramp(f, 196, 206))} />
    </AbsoluteFill>
  );
};

/* ---------- 3. Step 1: connect ---------- */
const Connect: React.FC = () => {
  const f = useCurrentFrame(); const d = HOWTO.connect.dur;
  const clickBtn = 26, menuIn = 32, clickPh = 70, winIn = 78, clickOk = 124, done = 132;
  const menuT = ramp(f, menuIn, menuIn + 8) * (1 - ramp(f, clickPh + 4, clickPh + 10));
  const winT = ramp(f, winIn, winIn + 10) * (1 - ramp(f, clickOk + 4, clickOk + 12));
  const connected = f >= done;
  const cam = camLerp(NO_CAM, { z: 1.3, fx: 330, fy: 110, k: 0.35 }, ramp(f, menuIn, menuIn + 18, settle) * (1 - ramp(f, d - 40, d - 18, settle)));
  return (
    <Shot f={f} cam={cam} scroll={FS} connected={connected} step={S[0]} capT={capFade(f, d)}
      toast={<Toast title="Connected!" text="Phantom · xxxx…xxxx" t={ramp(f, done, done + 8) * (1 - ramp(f, d - 14, d - 4))} />}
      overlay={menuT > 0 ? <WalletMenu t={menuT} hover={f >= clickPh - 8} /> : null}
      extra={winT > 0 ? <WalletWindow kind="connect" t={winT} pressed={inWin(f, clickOk, clickOk + 6)} /> : null}
      cursor={{ keys: [[0, 900, 1060], [clickBtn - 4, ...T.button], [clickBtn + 8, ...T.button], [clickPh - 10, ...T.phantom], [clickPh + 6, ...T.phantom], [winIn + 16, -(WALLET_OK.x + 20), WALLET_OK.y + 40], [clickOk - 4, -WALLET_OK.x, WALLET_OK.y], [clickOk + 20, -WALLET_OK.x, WALLET_OK.y], [d - 10, 230, 383]],
        down: inWin(f, clickBtn, clickBtn + 5) || inWin(f, clickPh, clickPh + 5) || inWin(f, clickOk, clickOk + 5), t: ramp(f, 2, 12) }}>
      <LaunchTab fp={form({ button: connected ? "Add an image" : "Connect wallet", pressed: inWin(f, clickBtn, clickBtn + 5), ring: f < menuIn ? "button" : null })} />
    </Shot>
  );
};

/* ---------- 4. Step 2: image ---------- */
const ImageStep: React.FC = () => {
  const f = useCurrentFrame(); const d = HOWTO.image.dur;
  const drop = 46;
  return (
    <Shot f={f} cam={zoomCam(f, d, { z: 1.6, fx: 117, fy: 120, k: 0.5 })} scroll={FS} connected step={S[1]} capT={capFade(f, d)}
      cursor={{ keys: [[0, 230, 383], [drop - 6, ...T.drop], [drop + 30, ...T.drop], [d, 200, 97]], down: inWin(f, drop, drop + 6), t: 1 }}
      extra={f < drop + 4 && f > 18 ? <DragFile f={f} drop={drop} /> : null}>
      <LaunchTab fp={form({ image: f >= drop ? IMG : null, imageT: ramp(f, drop, drop + 12), button: f >= drop ? "Add a name" : "Add an image", ring: f > 14 && f < drop + 30 ? "image" : null })} />
    </Shot>
  );
};
/** a file thumbnail riding the cursor into the drop zone */
export const DragFile: React.FC<{ f: number; drop: number }> = ({ f, drop }) => {
  const t = ramp(f, 18, drop - 6, settle);
  return (
    <div style={{ position: "absolute", left: lerp(900, 330, t), top: lerp(1000, 520, t), width: 120, height: 120, borderRadius: 14, overflow: "hidden", zIndex: 40,
      boxShadow: "0 16px 40px rgba(0,0,0,.3)", border: "4px solid #fff", transform: `rotate(${lerp(10, -4, t)}deg)`, opacity: 1 - ramp(f, drop - 2, drop + 3) }}>
      <Img src={staticFile(IMG)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
};

/* ---------- 5. Step 3: name + ticker ---------- */
const Names: React.FC = () => {
  const f = useCurrentFrame(); const d = HOWTO.names.dur;
  const name = typed(NAME, f, 22, 0.45);
  const ticker = typed(TICK, f, 82, 0.25);
  const caret = f >= 18 && f < 76 ? "name" : f >= 78 && f < 122 ? "ticker" : null;
  const button = !name ? "Add a name" : ticker.length < 2 ? "Ticker: 2–10 letters or numbers" : "Launch $" + ticker;
  const cam = zoomCam(f, d, { z: 1.55, fx: 250, fy: 118, k: 0.5 });
  return (
    <Shot f={f} cam={cam} scroll={FS} connected step={S[2]} capT={capFade(f, d)}
      cursor={{ keys: [[0, 200, 97], [14, ...T.name], [74, ...T.name], [80, ...T.ticker], [d, ...T.ticker]], down: inWin(f, 16, 20) || inWin(f, 78, 82), t: 1 }}>
      <LaunchTab fp={form({ image: IMG, name, ticker, caret, button })} />
    </Shot>
  );
};

/* ---------- 6. Step 4: description, 140 ---------- */
const Desc: React.FC = () => {
  const f = useCurrentFrame(); const d = HOWTO.desc.dur;
  const desc = DESC0 + typed(DESC.slice(DESC0.length), f, 26, 0.5);
  return (
    <Shot f={f} cam={zoomCam(f, d, { z: 1.7, fx: 230, fy: 200, k: 0.5 })} scroll={FS} connected step={S[3]} capT={capFade(f, d)}
      cursor={{ keys: [[0, ...T.ticker], [16, ...T.desc], [d, ...T.desc]], down: inWin(f, 18, 22), t: 1 }}
      extra={<CounterNote f={f} />}>
      <LaunchTab fp={form({ image: IMG, name: NAME, ticker: TICK, desc, descCaret: f >= 18 && f < d - 16, button: "Launch $" + TICK, ring: f > 16 && f < d - 20 ? "desc" : null })} />
    </Shot>
  );
};
const CounterNote: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ position: "absolute", right: 70, bottom: 70, padding: "12px 18px", borderRadius: 14, background: "#14171A", color: "#fff", font: "600 22px/1.2 Inter, sans-serif",
    opacity: ramp(f, 40, 52) * (1 - ramp(f, 100, 112)), boxShadow: "0 12px 30px rgba(0,0,0,.25)" }}>
    The counter shows what's left of 140.
  </div>
);

/* ---------- 7. Step 5: social links ---------- */
const Socials: React.FC = () => {
  const f = useCurrentFrame(); const d = HOWTO.socials.dur;
  const open = f >= 24;
  const x = typed(X_HANDLE, f, 62, 0.4);
  const scroll = lerp(FS, FS_SOC, ramp(f, 30, 50, settle));
  return (
    <Shot f={f} cam={zoomCam(f, d, { z: 1.55, fx: 200, fy: 238 - (scroll - FS) + 40, k: 0.5 }, 10)} scroll={scroll} connected step={S[4]} capT={capFade(f, d)}
      cursor={{ keys: [[0, ...T.desc], [18, ...T.socials], [26, ...T.socials], [52, ...T.x], [d, ...T.x]], down: inWin(f, 20, 25) || inWin(f, 56, 60), t: 1 }}>
      <LaunchTab fp={form({ ...FILLED, button: "Launch $" + TICK, socialsOpen: open, socials: { x }, socialCaret: f >= 58 && f < d - 14 ? "x" : null, ring: f > 12 && f < 24 ? "socials" : null })} />
    </Shot>
  );
};

/* ---------- 8. Step 6: dev buy ---------- */
const DevBuy: React.FC = () => {
  const f = useCurrentFrame(); const d = HOWTO.devbuy.dur;
  const tap = 40, on = f >= tap;
  return (
    <Shot f={f} cam={zoomCam(f, d, { z: 1.55, fx: 200, fy: T.buyPreset01[1], k: 0.5 }, 10)} scroll={FS_SOC} connected step={S[5]} capT={capFade(f, d)}
      cursor={{ keys: [[0, ...T.x], [tap - 6, ...T.buyPreset01], [d, ...T.buyPreset01]], down: inWin(f, tap, tap + 5), t: 1 }}>
      <LaunchTab fp={form({ ...FILLED, socialsOpen: true, socials: { x: X_HANDLE }, devBuy: on ? 1 : 0, est: on ? `Buying 0.1 SOL of $${TICK} at launch.` : undefined,
        button: "Launch $" + TICK + (on ? " · buy 0.1 SOL" : ""), ring: f > 12 && f < d - 20 ? "devbuy" : null })} />
    </Shot>
  );
};

/* ---------- 9. Step 7: launch + approve ---------- */
type Chk = { text: string; done: boolean; link?: string };
const LAUNCH_LINES: [number, Chk[]][] = [
  // onLaunch() in tweetpad.js, verbatim; a pending ('warn') line is replaced by the next check()
  [20, [{ text: "Uploading image and metadata to IPFS…", done: false }]],
  [42, [{ text: "Image and metadata on IPFS", done: true, link: "JSON ↗" }, { text: "Building the pump.fun transaction…", done: false }]],
  [66, [{ text: "Image and metadata on IPFS", done: true, link: "JSON ↗" }, { text: "Transaction built · mint xxxx…xxxx", done: true }, { text: "Approve in Phantom…", done: false }]],
];
const Launch: React.FC = () => {
  const f = useCurrentFrame(); const d = HOWTO.launch.dur;
  const click = 14, winIn = 84, ok = 128, signed = 138;
  const base: Chk[] = [{ text: "Image and metadata on IPFS", done: true, link: "JSON ↗" }, { text: "Transaction built · mint xxxx…xxxx", done: true }, { text: "Signed by Phantom and the new mint", done: true }];
  let checks: Chk[] = [];
  for (const [at, c] of LAUNCH_LINES) if (f >= at) checks = c;
  if (f >= signed) checks = [...base, { text: "Sending to Solana…", done: false }];
  if (f >= signed + 14) checks = [...base, { text: "Confirming…", done: false, link: "Tx ↗" }];
  if (f >= signed + 40) checks = [...base, { text: "Confirmed on mainnet", done: true, link: "Tx ↗" }];
  const live = signed + 56;
  if (f >= live) checks = [...checks, { text: `$${TICK} is live`, done: true, link: "pump.fun ↗" }];
  const busy = f >= click + 4 && f < live, done = f >= live;
  const button = done ? "Launch another" : busy ? "Launching…" : `Launch $${TICK} · buy 0.1 SOL`;
  const winT = ramp(f, winIn, winIn + 10) * (1 - ramp(f, ok + 4, ok + 12));
  const scroll = lerp(FS_SOC, FS_CHECKS, ramp(f, 18, 40, settle)) + 56 * ramp(f, signed, live + 12, settle); // keep the newest check line above the dock
  const camT = ramp(f, 22, 44, settle) * (1 - ramp(f, d - 30, d - 10, settle));
  const cam = camLerp(NO_CAM, { z: 1.25, fx: 230, fy: 370, k: 0.4 }, camT);
  const sim = ramp(f, 46, 56) * (1 - ramp(f, winIn - 4, winIn + 4));
  const btnY = 385; // the button at FS_SOC with the socials open
  return (
    <Shot f={f} cam={cam} scroll={scroll} connected tokenCount={done ? 6 : 5} step={S[6]} capT={capFade(f, d)}
      toast={<Toast title="Token launched!" text={`$${TICK} is live on pump.fun`} t={ramp(f, live, live + 10)} />}
      extra={<>
        {winT > 0 ? <WalletWindow kind="approve" t={winT} pressed={inWin(f, ok, ok + 6)} /> : null}
        <div style={{ position: "absolute", left: 80, bottom: 70, padding: "14px 20px", borderRadius: 14, background: "#14171A", color: "#fff", font: "600 22px/1.25 Inter, sans-serif",
          opacity: sim, boxShadow: "0 12px 30px rgba(0,0,0,.25)", maxWidth: 560 }}>
          ✓ Simulated before you sign: a launch that would fail never reaches your wallet.
        </div>
      </>}
      cursor={{ keys: [[0, ...T.buyPreset01], [click - 6, 230, btnY], [click + 30, 230, btnY], [winIn + 14, -(WALLET_OK.x + 30), WALLET_OK.y + 50], [ok - 4, -WALLET_OK.x, WALLET_OK.y], [ok + 30, -WALLET_OK.x, WALLET_OK.y], [d, -900, 1000]],
        down: inWin(f, click, click + 5) || inWin(f, ok, ok + 5), t: 1 - ramp(f, d - 30, d - 15) }}>
      <LaunchTab fp={form({ ...FILLED, socialsOpen: true, socials: { x: X_HANDLE }, devBuy: 1, est: `Buying 0.1 SOL of $${TICK} at launch.`, button, pressed: inWin(f, click, click + 5), checks })} />
    </Shot>
  );
};

/* ---------- 10. Step 8: share: the coin page (opens by itself) → Tokens ---------- */
const live6 = 6; // 5 demo coins + the one just launched
const Share: React.FC = () => {
  const f = useCurrentFrame(); const d = HOWTO.share.dur;
  const toTokens = 92;
  const list = f >= toTokens;
  const camCoin = camLerp(NO_CAM, { z: 1.55, fx: 230, fy: 318, k: 0.5 }, ramp(f, 16, 36, settle) * (1 - ramp(f, 66, 84, settle)));
  return (
    <Shot f={f} cam={camCoin} tab={list ? "tokens" : "tokens"} scroll={0} connected tokenCount={live6} step={S[7]} capT={capFade(f, d)}
      toast={<Toast title="Token launched!" text={`$${TICK} is live on pump.fun`} t={1 - ramp(f, 26, 36)} />}
      extra={<div style={{ position: "absolute", left: 0, right: 0, bottom: 60, textAlign: "center", opacity: ramp(f, 36, 46) * (1 - ramp(f, 80, 88)) }}>
        <span style={{ padding: "12px 22px", borderRadius: 999, background: "#14171A", color: "#fff", font: "700 26px/1 Inter, sans-serif" }}>tweetpad.io/c/&lt;contract&gt;</span>
      </div>}
      cursor={{ keys: [[0, 1000, 1000], [40, 278, 318], [70, 278, 318], [toTokens - 6, ...T.tokensConnected], [toTokens + 10, ...T.tokensConnected], [toTokens + 30, 200, 76], [d, 200, 76]], down: inWin(f, 52, 56) || inWin(f, toTokens, toTokens + 5), t: ramp(f, 30, 40) }}>
      {list ? <TokenList rows={6} highlight={0} appear={(i) => ramp(f, toTokens + 2 + i * 3, toTokens + 12 + i * 3)} /> : <CoinView drawT={ramp(f, 0, 40) * 0.35} />}
    </Shot>
  );
};

/* ---------- 11. end ---------- */
const HowEnd: React.FC = () => <End tagline={HOWTO_COPY.end.tagline} fine={HOWTO_COPY.end.fee} fineSize={22} />;

export const TweetpadHowToLaunch: React.FC<{ skin?: "2012" | "tweetcraft" }> = ({ skin = "2012" }) => {
  loadFonts();
  const f = useCurrentFrame();
  const e = HOWTO.end;
  return (
    <SkinCtx.Provider value={skinOf(skin)}>
      <AbsoluteFill>
        <Ground blue={ramp(f, e.from - 6, e.from + 10)} />
        <Sequence from={HOWTO.intro.from} durationInFrames={HOWTO.intro.dur}><Intro /></Sequence>
        <Sequence from={HOWTO.tour.from} durationInFrames={HOWTO.tour.dur}><Tour /></Sequence>
        <Sequence from={HOWTO.connect.from} durationInFrames={HOWTO.connect.dur}><Connect /></Sequence>
        <Sequence from={HOWTO.image.from} durationInFrames={HOWTO.image.dur}><ImageStep /></Sequence>
        <Sequence from={HOWTO.names.from} durationInFrames={HOWTO.names.dur}><Names /></Sequence>
        <Sequence from={HOWTO.desc.from} durationInFrames={HOWTO.desc.dur}><Desc /></Sequence>
        <Sequence from={HOWTO.socials.from} durationInFrames={HOWTO.socials.dur}><Socials /></Sequence>
        <Sequence from={HOWTO.devbuy.from} durationInFrames={HOWTO.devbuy.dur}><DevBuy /></Sequence>
        <Sequence from={HOWTO.launch.from} durationInFrames={HOWTO.launch.dur}><Launch /></Sequence>
        <Sequence from={HOWTO.share.from} durationInFrames={HOWTO.share.dur}><Share /></Sequence>
        <Sequence from={e.from} durationInFrames={e.dur}><HowEnd /></Sequence>
        <Sequence from={HOWTO.connect.from} durationInFrames={e.from - HOWTO.connect.from}>
          <Fine text={HOWTO_COPY.demo} t={0.9} />
        </Sequence>
      </AbsoluteFill>
    </SkinCtx.Provider>
  );
};
