/**
 * TweetpadRobinhoodUpdate: "Now on Robinhood Chain", the feature-update film. 1080x1080 @30, 2012 skin, 44.5 s.
 * Opens on a STATIC title card (tweetpad # × the Robinhood feather) so the first frame works as the thumbnail, then keeps
 * TweetpadSquare's look (centred captions, the app at ×1.55) with the how-to's camera for close-ups.
 * Every app string is verbatim from embed.html + assets/tweetpad.js: the chain switch (tab bar + Launch header),
 * renderLaunch / renderEvmWallet / renderFeeBox / renderDevBuy, onLaunchEvm's check lines (a pending line is replaced by
 * the next check()), setVerdict toasts, renderCoinHead / renderCoinFees and the Robinhood profile (evmProfileSection,
 * claimEvmRewards). Demo coin and demo reward amounts only, 0xxx…xxxx addresses.
 */
import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { BRAND, FONTS, skinOf } from "../brand/tokens";
import { Caption, Cursor, cursorAt, Fine, Ground } from "../components/Film";
import { EvmLine, LaunchForm, LaunchFormProps } from "../components/LaunchForm";
import { CoinView, DEMO_COINS, RobinhoodProfile, TokenList } from "../components/Views";
import { AppFrame, Net, NetNew, NET_XY, NetTip, OfficialStrip, SkinCtx, Tab, Toast, WelcomeTweet } from "../components/ui";
import { DragFile } from "../howto/HowTo";
import { Cam, camLerp, camMap, CaptionBand, NO_CAM, Stage, WALLET_OK } from "../howto/parts";
import { lerp, ramp, settle, typed } from "../lib/motion";
import { End } from "../scenes/End";
import { Hook } from "../scenes/Hook";
import { APP, CARD } from "../scenes/layout";
import { ROBINHOOD as R, ROBINHOOD_COPY as C } from "../timeline";

const NAME = "Such Launch", TICK = "WOW";
const IMG = "brand/agent-inu.jpg";
const W = C.wallet;
const FS = 216;        // scroll that puts the launch form at the top of the card (Solana form)
const FS_RH = 240;     // …on Robinhood, where the EVM wallet line adds a row under the head
const FS_BTN = 360;    // …with the Launch button in view (below Creator fees and Dev buy)
const FS_BUY = 300;    // …with the dev-buy presets and the estimate in view
const FS_FEES = 340;   // …with the Creator fees box near the top
const FS_CHECKS = 420; // …while the launch check lines run
const HOLDERS = C.holders;

/** app-px click targets, each at the scroll its scene uses (checked against stills) */
const T = {
  drop: [117, 120], name: [270, 97], ticker: [270, 135], // FS_RH
  button: [230, 405],                                     // FS_BTN: "Connect EVM wallet"
  preset1: [158, 392],                                    // FS_BUY
  slider0: [185, 224], slider30: [195, 224],              // FS_FEES, the range thumb at 0% / 30%
  buttonLaunch: [230, 445],                               // FS_FEES, the button under a 2-line estimate
  tokens: [242, 19], more: [344, 19], // header tabs, not connected ("Connect ▾" stays: that menu is the Solana wallet)
  claim: [363, 210],                  // Profile: Claim in the creator rewards box
} as const;

const inWin = (f: number, a: number, b: number) => f >= a && f < b;
const capFade = (f: number, dur: number) => ramp(f, 0, 12) * (1 - ramp(f, dur - 10, dur, settle));
const form = (p: Partial<LaunchFormProps>): LaunchFormProps => ({ chain: "robinhood", button: "Connect EVM wallet", ...p });
const connectedLine: EvmLine = { address: W.address, wallet: W.name };
const LaunchTab: React.FC<{ fp: LaunchFormProps }> = ({ fp }) => (<><OfficialStrip /><WelcomeTweet /><LaunchForm {...fp} /></>);

/* ---------- one shot: the app under a camera, a centred caption, a cursor ---------- */
type Key = [number, number, number] | [number, number, number, "film"]; // app px, or raw film px (wallet window)
type ShotProps = {
  f: number; cam: Cam; scroll: number; net?: Net; netHover?: Net | null; netT?: number; tab?: Tab; tokenCount?: number;
  toast?: React.ReactNode; overlay?: React.ReactNode; extra?: React.ReactNode; children: React.ReactNode;
  cap: { head: string; head2?: string; sub?: string }; capT: number;
  cursor?: { keys: Key[]; down: boolean; t: number; hand?: boolean; size?: number };
  /** the scene's small type */
  fine: string;
};
const Shot: React.FC<ShotProps> = ({ f, cam, scroll, net = "robinhood", netHover, netT, tab = "launch", tokenCount = 5, toast, overlay, extra, children, cap, capT, cursor, fine }) => {
  const m = camMap(cam);
  const cur = cursor ? cursorAt(f, cursor.keys.map(([k, x, y, film]) => (film ? [k, x, y] : [k, m(x, y).x, m(x, y).y]) as [number, number, number])) : null;
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <AppFrame scale={APP.scale} tab={tab} tokenCount={tokenCount} scrollY={scroll} net={net} netHover={netHover} netT={netT} toast={toast} overlay={overlay}>{children}</AppFrame>
      </Stage>
      <CaptionBand />
      <Caption head={cap.head} head2={cap.head2} sub={cap.sub} t={capT} y={30} />
      <Fine text={fine} t={0.9} />
      {extra}
      {cur && cursor ? <Cursor x={cur.x} y={cur.y} down={cursor.down} t={cursor.t} hand={cursor.hand} size={cursor.size} /> : null}
    </AbsoluteFill>
  );
};

/* ---------- generic EVM wallet window (film px). Unbranded: no wallet logo or colours. ---------- */
type WinKind = "connect" | "network" | "approve" | "claim";
const WIN: Record<WinKind, { title: string; body: string; ok: string }> = {
  connect: { title: "Connect to tweetpad.io?", body: "tweetpad.io wants to see your public address.", ok: "Connect" },
  // ensureRobinhood(): wallet_addEthereumChain, chain 4663, native currency ETH
  network: { title: "Add Robinhood Chain?", body: "tweetpad.io wants to add a network: Robinhood Chain · ETH.", ok: "Approve" },
  approve: { title: "Approve transaction", body: "tweetpad.io · Robinhood Chain. Review what your wallet shows before you approve.", ok: "Approve" },
  claim: { title: "Approve transaction", body: "tweetpad.io · Robinhood Chain. Claim 1 of 1 ($WOW): your creator fees.", ok: "Approve" },
};
/** chain: the network the approve window names (film 5 reuses it for BNB Chain); Robinhood Chain by default */
export const EvmWalletWindow: React.FC<{ t: number; kind: WinKind; pressed?: boolean; chain?: string }> = ({ t, kind, pressed, chain = "Robinhood Chain" }) => {
  const w = { ...WIN[kind], body: WIN[kind].body.replace("Robinhood Chain", chain) };
  return (
    <div style={{ position: "absolute", right: 70, top: 250, width: 400, zIndex: 50, background: "#fff", borderRadius: 18, overflow: "hidden", fontFamily: FONTS.ui,
      boxShadow: "0 30px 80px rgba(20,23,26,.35)", border: `1px solid ${BRAND.border}`, opacity: t, transform: `translateY(${(1 - t) * 24}px) scale(${0.96 + 0.04 * t})` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "#f3f5f7", borderBottom: `1px solid ${BRAND.border}` }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, background: "#d5dee5", display: "grid", placeItems: "center" }}>
          <svg viewBox="0 0 16 16" width={20} height={20}><path d="M2 4.5A1.5 1.5 0 0 1 3.5 3H12v2h1.5A1.5 1.5 0 0 1 15 6.5v6a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 2 12.5zM11 9a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" fill={BRAND.darkGray} /></svg>
        </span>
        <b style={{ font: `700 22px/1 ${FONTS.ui}`, color: BRAND.ink }}>Your wallet</b>
        <span style={{ marginLeft: "auto", font: `500 16px/1 ${FONTS.ui}`, color: BRAND.darkGray }}>{kind === "connect" ? "EVM" : chain}</span>
      </div>
      <div style={{ padding: "22px 22px 18px" }}>
        <div style={{ font: `800 28px/1.15 ${FONTS.ui}`, color: BRAND.ink }}>{w.title}</div>
        <div style={{ marginTop: 10, minHeight: 52, font: `500 19px/1.35 ${FONTS.ui}`, color: BRAND.darkGray }}>{w.body}</div>
        <div style={{ marginTop: 22, display: "flex", gap: 12 }}>
          <span style={{ flex: 1, textAlign: "center", padding: "14px 0", borderRadius: 12, background: "#eef1f4", font: `700 20px/1 ${FONTS.ui}`, color: BRAND.ink }}>Cancel</span>
          <span style={{ flex: 1, textAlign: "center", padding: "14px 0", borderRadius: 12, background: pressed ? "#1a8bd6" : BRAND.primary, font: `700 20px/1 ${FONTS.ui}`, color: "#fff" }}>{w.ok}</span>
        </div>
        <div style={{ marginTop: 14, font: `500 13px/1.3 ${FONTS.ui}`, color: BRAND.lightGray, textAlign: "center" }}>Illustration. Your wallet's own window looks different.</div>
      </div>
    </div>
  );
};
export type { WinKind };
const OK: Key = [0, WALLET_OK.x, WALLET_OK.y, "film"];
const okAt = (k: number, dx = 0, dy = 0): Key => [k, OK[1] + dx, OK[2] + dy, "film"];

/* ---------- 0. static title card: the first frame is the thumbnail, so nothing moves until it hands over ---------- */
const Title: React.FC = () => {
  const f = useCurrentFrame(); const d = R.title.dur;
  const out = 1 - ramp(f, d - 12, d, settle);
  const feather = `url(${staticFile("brand/robinhood.png")})`;
  return (
    <AbsoluteFill style={{ opacity: out }}>
      {/* the end card's faint # pattern, held still */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.1, color: "#fff", font: `800 64px/90px ${FONTS.ui}`, letterSpacing: 56, overflow: "hidden", whiteSpace: "pre-wrap", padding: 20 }}>
        {Array.from({ length: 14 }, (_, i) => (i % 2 ? "  " : "") + "# # # # # # # # #\n").join("")}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 290, display: "flex", alignItems: "center", justifyContent: "center", gap: 46 }}>
        <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 280, height: 280, filter: "drop-shadow(0 18px 30px rgba(0,40,80,.35))" }} />
        <svg width={64} height={64} viewBox="0 0 64 64" style={{ opacity: 0.9 }}><path d="M12 12l40 40M52 12L12 52" stroke="#fff" strokeWidth={7} strokeLinecap="round" /></svg>
        <span style={{ width: 230, height: 230, background: "#fff", WebkitMaskImage: feather, maskImage: feather, WebkitMaskSize: "contain", maskSize: "contain",
          WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center", filter: "drop-shadow(0 18px 30px rgba(0,40,80,.35))" }} />
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 660, textAlign: "center", font: `800 54px/1.1 ${FONTS.ui}`, letterSpacing: "-.02em", color: "#fff" }}>{C.title.tagline}</div>
    </AbsoluteFill>
  );
};

/* ---------- 1. hook ---------- */
const HookScene: React.FC = () => <Hook tag={C.hook.tag} head={C.hook.head} head2={C.hook.head2} tweet={C.hook.tweet} />;

/* ---------- 2. the card opens; one tap on the feather ---------- */
const Switch: React.FC = () => {
  const f = useCurrentFrame(); const d = R.switch.dur;
  const g = ramp(f, 0, 26, settle);
  const click = 72;
  const net: Net = f >= click ? "robinhood" : "solana";
  const slide = ramp(f, click + 1, click + 9, settle); // the blue thumb slides under the feather
  const hover = inWin(f, 58, click) ? "robinhood" : null;
  const newT = ramp(f, 44, 54) * (1 - ramp(f, 92, 100));
  const tipT = ramp(f, 60, 66) * (1 - ramp(f, click + 8, click + 14));
  const scroll = lerp(0, FS, ramp(f, 20, 52, settle)) + (FS_BTN - FS) * ramp(f, 94, 116, settle); // down to the new button
  // a close-up on the switch: the camera lands on it, then pulls back to show the form change
  const cam = camLerp(NO_CAM, { z: 3, fx: 363, fy: 490, k: 0.8 }, ramp(f, 30, 54, settle) * (1 - ramp(f, 86, 106, settle)));
  const fp = net === "solana" ? form({ chain: "solana", button: "Connect wallet" }) : form({});
  const capT = ramp(f, 14, 30) * (1 - ramp(f, d - 10, d, settle));
  if (g < 1) {
    // the card grows into the app, as in TweetpadSquare's Open scene
    const x = lerp(CARD.x, APP.x, g), y = lerp(CARD.y, APP.y, g);
    const w = lerp(CARD.w, APP.w * APP.scale, g), h = lerp(CARD.h, APP.h * APP.scale, g);
    const scale = w / APP.w;
    return (
      <AbsoluteFill>
        <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: lerp(16, 10, g), overflow: "hidden", border: "1px solid #c8c8c8", boxShadow: `0 ${20 * g}px ${60 * g}px rgba(20,23,26,${0.18 * g})` }}>
          <AppFrame scale={scale} h={h / scale} tab="launch" tokenCount={5} scrollY={scroll}><LaunchTab fp={fp} /></AppFrame>
          <Img src={staticFile("brand/card-preview.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 1 - ramp(f, 4, 18) }} />
        </div>
        <Caption head={C.switch.head} sub={C.switch.sub} t={capT} y={30} />
        <Fine text={C.fine.launch} t={0.9 * ramp(f, 10, 20)} />
      </AbsoluteFill>
    );
  }
  return (
    <Shot f={f} cam={cam} scroll={scroll} net={net} netT={slide} netHover={hover} cap={C.switch} capT={capT} fine={C.fine.launch}
      overlay={<>{newT > 0 ? <NetNew t={newT} /> : null}{tipT > 0 ? <NetTip net="robinhood" t={tipT} /> : null}</>}
      cursor={{ keys: [[28, 1000, 1060, "film"], [58, NET_XY.robinhood[0], NET_XY.robinhood[1] + 2], [click + 14, NET_XY.robinhood[0], NET_XY.robinhood[1] + 2], [d, ...T.button]],
        down: inWin(f, click, click + 6), t: ramp(f, 28, 38), hand: f < click + 24, size: 1 + 0.9 * cam.k / 0.8 }}>
      <LaunchTab fp={fp} />
    </Shot>
  );
};

/* ---------- 3. connect: one EVM wallet found, so the button connects it straight away ---------- */
const Connect: React.FC = () => {
  const f = useCurrentFrame(); const d = R.connect.dur;
  const click = 16, winIn = 22, okConnect = 54, toNet = 60, okNet = 92, done = 100;
  const winT = ramp(f, winIn, winIn + 10) * (1 - ramp(f, okNet + 4, okNet + 12));
  const kind: WinKind = f >= toNet ? "network" : "connect";
  const connected = f >= done;
  const cam = camLerp(NO_CAM, { z: 1.45, fx: 230, fy: 70, k: 0.3 }, ramp(f, done + 10, done + 26, settle) * (1 - ramp(f, d - 26, d - 6, settle)));
  const scroll = lerp(FS_BTN, FS_RH, ramp(f, done + 2, done + 20, settle)); // back up to the wallet line
  return (
    <Shot f={f} cam={cam} scroll={scroll} cap={C.connect} capT={capFade(f, d)} fine={C.fine.launch}
      toast={<Toast title="Connected!" text={`${W.name} · ${W.address}`} t={ramp(f, done, done + 8) * (1 - ramp(f, d - 16, d - 6))} />}
      extra={winT > 0 ? <EvmWalletWindow kind={kind} t={winT} pressed={inWin(f, okConnect, okConnect + 6) || inWin(f, okNet, okNet + 6)} /> : null}
      cursor={{ keys: [[0, ...T.button], [click + 8, ...T.button], okAt(winIn + 18, 30, 50), okAt(okConnect - 4), okAt(okConnect + 10), okAt(okNet - 4), okAt(okNet + 8), [d, ...T.drop]],
        down: inWin(f, click, click + 5) || inWin(f, okConnect, okConnect + 5) || inWin(f, okNet, okNet + 5), t: 1 }}>
      <LaunchTab fp={form({ evmLine: connected ? connectedLine : { found: 1 }, button: connected ? "Add an image" : "Connect EVM wallet", buttonPrimary: !connected, pressed: inWin(f, click, click + 5) })} />
    </Shot>
  );
};

/* ---------- 4. fill the form: image, name, ticker, a 0.001 ETH dev buy ---------- */
const Fill: React.FC = () => {
  const f = useCurrentFrame(); const d = R.fill.dur;
  const drop = 24, tap = 106;
  const name = typed(NAME, f, 38, 0.5);
  const ticker = typed(TICK, f, 72, 0.3);
  const caret = f >= 34 && f < 68 ? "name" : f >= 68 && f < 96 ? "ticker" : null;
  const hasImg = f >= drop, buy = f >= tap;
  // renderLaunch, Robinhood: the first problem, else "Launch $T on Robinhood" (+ " · buy N ETH")
  const problem = !hasImg ? "Add an image" : !name ? "Add a name" : ticker.length < 2 ? "Ticker: 2–10 letters or numbers" : null;
  const button = problem ?? `Launch $${ticker} on Robinhood` + (buy ? " · buy 0.001 ETH" : "");
  const camT = ramp(f, 10, 30, settle) * (1 - ramp(f, d - 26, d - 6, settle));
  const fy = lerp(118, 400, ramp(f, 84, 104, settle));
  const cam = camLerp(NO_CAM, { z: 1.4, fx: 220, fy, k: 0.5 }, camT);
  return (
    <Shot f={f} cam={cam} scroll={lerp(FS_RH, FS_BUY, ramp(f, 84, 104, settle))} cap={C.fill} capT={capFade(f, d)} fine={C.fine.launch}
      extra={f < drop + 4 && f > 4 ? <DragFile f={f + 14} drop={drop + 14} /> : null}
      cursor={{ keys: [[0, ...T.drop], [drop - 2, ...T.drop], [30, ...T.name], [66, ...T.name], [70, ...T.ticker], [92, ...T.ticker], [tap - 4, ...T.preset1], [d, ...T.preset1]],
        down: inWin(f, drop, drop + 5) || inWin(f, 32, 36) || inWin(f, 68, 72) || inWin(f, tap, tap + 5), t: 1 }}>
      <LaunchTab fp={form({ evmLine: connectedLine, image: hasImg ? IMG : null, imageT: ramp(f, drop, drop + 12), name, ticker, caret, devBuy: buy ? 1 : 0, button, buttonPrimary: !problem })} />
    </Shot>
  );
};

/* ---------- 5. Creator fees: drag the holders' share from 0% to 30% ---------- */
const Fees: React.FC = () => {
  const f = useCurrentFrame(); const d = R.fees.dur;
  const grab = 44, release = 84;
  const holders = HOLDERS * ramp(f, grab, release, settle);
  const scroll = lerp(FS_BUY, FS_FEES, ramp(f, 4, 26, settle));
  const cam = camLerp(NO_CAM, { z: 1.85, fx: 220, fy: 180, k: 0.6 }, ramp(f, 16, 38, settle) * (1 - ramp(f, d - 28, d - 8, settle)));
  return (
    <Shot f={f} cam={cam} scroll={scroll} cap={C.fees} capT={capFade(f, d)} fine={C.fine.fees}
      cursor={{ keys: [[0, ...T.preset1], [grab - 8, ...T.slider0], [grab, ...T.slider0], [release, T.slider30[0], T.slider30[1]], [d, T.slider30[0] + 10, T.slider30[1] + 30]],
        down: f >= grab && f < release + 2, t: 1, hand: true, size: 1 + 0.7 * cam.k / 0.6 }}
>
      <LaunchTab fp={form({ evmLine: connectedLine, image: IMG, name: NAME, ticker: TICK, devBuy: 1, holders, button: `Launch $${TICK} on Robinhood · buy 0.001 ETH`,
        ring: f > 20 && f < d - 24 ? "fees" : null })} />
    </Shot>
  );
};

/* ---------- 6. launch: onLaunchEvm's check lines, the approve window, live ---------- */
type Chk = { text: string; done: boolean; link?: string };
const IPFS: Chk = { text: "Image and metadata on IPFS", done: true, link: "JSON ↗" };
const BUILT: Chk = { text: "Transaction built and checked against the live launcher", done: true };
const LINES: [number, Chk[]][] = [
  [16, [{ text: "Uploading image and metadata to IPFS…", done: false }]],
  [34, [IPFS, { text: "Building the Robinhood launch…", done: false }]],
  [54, [IPFS, BUILT, { text: `Approve in ${W.name}…`, done: false }]],
  [108, [IPFS, BUILT, { text: "Confirming on Robinhood Chain…", done: false, link: "Tx ↗" }]],
  [146, [IPFS, BUILT, { text: `$${TICK} is live on Robinhood Chain`, done: true, link: "Explorer ↗" }]],
];
const Launch: React.FC = () => {
  const f = useCurrentFrame(); const d = R.launch.dur;
  const click = 12, winIn = 62, ok = 98, live = 146;
  let checks: Chk[] = [];
  for (const [at, c] of LINES) if (f >= at) checks = c;
  const done = f >= live;
  const button = done ? "Launch another" : f >= click + 4 ? "Launching…" : `Launch $${TICK} on Robinhood · buy 0.001 ETH`;
  const winT = ramp(f, winIn, winIn + 10) * (1 - ramp(f, ok + 4, ok + 12));
  const scroll = lerp(FS_FEES, FS_CHECKS, ramp(f, 16, 40, settle));
  const cam = camLerp(NO_CAM, { z: 1.3, fx: 230, fy: 380, k: 0.4 }, ramp(f, 24, 46, settle) * (1 - ramp(f, d - 30, d - 10, settle)));
  return (
    <Shot f={f} cam={cam} scroll={scroll} tokenCount={done ? 6 : 5} cap={C.launch} capT={capFade(f, d)} fine={C.fine.launch}
      toast={<Toast title="Token launched!" text="Share it: the link plays as its own card on X" t={ramp(f, live, live + 10)} />}
      extra={winT > 0 ? <EvmWalletWindow kind="approve" t={winT} pressed={inWin(f, ok, ok + 6)} /> : null}
      cursor={{ keys: [[0, ...T.slider30], [click - 4, ...T.buttonLaunch], [click + 24, ...T.buttonLaunch], okAt(winIn + 16, 30, 50), okAt(ok - 4), okAt(ok + 24), [d, 900, 1000, "film"]],
        down: inWin(f, click, click + 5) || inWin(f, ok, ok + 5), t: 1 - ramp(f, d - 40, d - 26) }}>
      <LaunchTab fp={form({ evmLine: connectedLine, image: IMG, name: NAME, ticker: TICK, devBuy: 1, holders: HOLDERS, button, pressed: inWin(f, click, click + 5), checks })} />
    </Shot>
  );
};

/* ---------- 7. the coin page opens by itself (openCoin): share box, fee split, holder rewards; then Tokens ---------- */
const COINS = DEMO_COINS.map((c, i) => (i === 0 ? { ...c, robinhood: true } : c));
const Coin: React.FC = () => {
  const f = useCurrentFrame(); const d = R.coin.dur;
  const toTokens = 104;
  const list = f >= toTokens;
  // the share box first, then down to the fee split and the holder rewards
  const cam = camLerp(NO_CAM, { z: 1.5, fx: 230, fy: lerp(318, 380, ramp(f, 46, 66, settle)), k: 0.5 }, ramp(f, 10, 30, settle) * (1 - ramp(f, 82, 98, settle)));
  return (
    <Shot f={f} cam={cam} tab="tokens" scroll={0} tokenCount={6} cap={C.coin} capT={capFade(f, d)} fine={C.fine.amounts}
      toast={<Toast title="Token launched!" text="Share it: the link plays as its own card on X" t={1 - ramp(f, 30, 40)} />}
      cursor={{ keys: [[0, 900, 1000, "film"], [36, 278, 318], [58, 278, 318], [76, 360, 392], [92, 360, 392], [toTokens - 6, ...T.tokens], [toTokens + 10, ...T.tokens], [toTokens + 30, 200, 76], [d, 200, 76]],
        down: inWin(f, toTokens, toTokens + 5), t: ramp(f, 24, 34) * (1 - ramp(f, d - 12, d - 2)) }}>
      {list ? <TokenList rows={6} highlight={0} coins={COINS} appear={(i) => ramp(f, toTokens + 2 + i * 3, toTokens + 12 + i * 3)} /> : <CoinView chain="robinhood" holders={HOLDERS} rewards={C.rewards.holder} drawT={ramp(f, 0, 40) * 0.35} />}
    </Shot>
  );
};

/* ---------- 8. Profile: claim the creator fees (claimEvmRewards) ---------- */
const Profile: React.FC = () => {
  const f = useCurrentFrame(); const d = R.profile.dur;
  const click = 26, winIn = 38, ok = 72, confirm = 80, claimed = 102;
  const claiming = f >= click + 2 && f < claimed;
  const status = f >= claimed ? { tone: "ok" as const, text: "Rewards claimed to your wallet", tx: true }
    : f >= confirm ? { tone: "warn" as const, text: "Confirming…" }
    : f >= click + 4 ? { tone: "warn" as const, text: `Approve claim 1 of 1 ($${TICK}) in ${W.name}…` } : null;
  const winT = ramp(f, winIn, winIn + 10) * (1 - ramp(f, ok + 4, ok + 12));
  const cam = camLerp(NO_CAM, { z: 1.5, fx: 230, fy: 200, k: 0.5 }, ramp(f, 6, 24, settle) * (1 - ramp(f, claimed - 4, claimed + 14, settle)));
  return (
    <Shot f={f} cam={cam} tab="more" scroll={0} tokenCount={6} cap={C.profile} capT={capFade(f, d)} fine={C.fine.amounts}
      toast={<Toast title="Rewards claimed!" text={`Creator fees sent to ${W.address}`} t={ramp(f, claimed, claimed + 8) * (1 - ramp(f, d - 14, d - 4))} />}
      extra={winT > 0 ? <EvmWalletWindow kind="claim" t={winT} pressed={inWin(f, ok, ok + 6)} /> : null}
      cursor={{ keys: [[0, 200, 76], [click - 6, ...T.claim], [click + 8, ...T.claim], okAt(winIn + 14, 30, 50), okAt(ok - 4), okAt(ok + 20), [d, ...T.claim]],
        down: inWin(f, click, click + 5) || inWin(f, ok, ok + 5), t: ramp(f, 0, 8) * (1 - ramp(f, d - 12, d - 2)) }}>
      <RobinhoodProfile address={W.address} rewards={f >= claimed + 6 ? C.rewards.claimed : C.rewards.creator} claimable={f < claimed + 6} claiming={claiming}
        pressed={inWin(f, click, click + 5)} status={status} coin={COINS[0]} holders={HOLDERS} />
    </Shot>
  );
};

/* ---------- 9. end ---------- */
const EndScene: React.FC = () => <End tagline={C.end.tagline} fine={C.end.fine} />;

export const TweetpadRobinhoodUpdate: React.FC<{ skin?: "2012" | "tweetcraft" }> = ({ skin = "2012" }) => {
  loadFonts();
  const f = useCurrentFrame();
  const e = R.end;
  // blue under the title card, light for the app, blue again for the end card
  const blue = Math.max(1 - ramp(f, R.title.dur - 10, R.title.dur + 6, settle), ramp(f, e.from - 6, e.from + 10));
  return (
    <SkinCtx.Provider value={skinOf(skin)}>
      <AbsoluteFill>
        <Ground blue={blue} />
        <Sequence from={R.title.from} durationInFrames={R.title.dur} name="0 Title (static)"><Title /></Sequence>
        <Sequence from={R.hook.from} durationInFrames={R.hook.dur} name="1 Hook"><HookScene /></Sequence>
        <Sequence from={R.switch.from} durationInFrames={R.switch.dur} name="2 Switch"><Switch /></Sequence>
        <Sequence from={R.connect.from} durationInFrames={R.connect.dur} name="3 Connect"><Connect /></Sequence>
        <Sequence from={R.fill.from} durationInFrames={R.fill.dur} name="4 Fill"><Fill /></Sequence>
        <Sequence from={R.fees.from} durationInFrames={R.fees.dur} name="5 Creator fees"><Fees /></Sequence>
        <Sequence from={R.launch.from} durationInFrames={R.launch.dur} name="6 Launch"><Launch /></Sequence>
        <Sequence from={R.coin.from} durationInFrames={R.coin.dur} name="7 Coin page"><Coin /></Sequence>
        <Sequence from={R.profile.from} durationInFrames={R.profile.dur} name="8 Profile claim"><Profile /></Sequence>
        <Sequence from={e.from} durationInFrames={e.dur} name="9 End"><EndScene /></Sequence>
      </AbsoluteFill>
    </SkinCtx.Provider>
  );
};
