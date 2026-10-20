/**
 * TweetpadParty: a tweetpad update for launch parties. 1080x1080 @30, ~40 s. Borrowed from Launch Party's own film
 * (launchparty-film src/pump4, "Launch with your friends on pump.fun" v4): its light canvas and pump.fun green, its words that
 * resolve out of a blur, its crew of Nouns (CC0, public/party/noun-*.svg; the handles are invented), its bonding-curve chart and its
 * "market buys after" scene, recomposed square and around a post:
 *   Open    tweetpad update: launch parties
 *   Post    a host's tweet with tweetpad's party card in it; the timeline takes the seats, and the card's pump.fun curve climbs
 *   Gate    who can join: anyone, a whitelist, or a token's holders (Launch Party's on-chain whitelist, built from $TP holders here);
 *           a wallet without $TP is refused, and a holder who buys in later asks to join and is added on the host's refresh
 *   Curve   Launch Party's chart: every seat moves the curve; the host picks the seats (2 to 1,000) and the price, and the chart is one
 *           example, tagged as one (10 seats × 1 SOL is 33.5%); launch on pump.fun, one buy for the crew
 *   Vest    the host picks when the coins unlock (at launch, or evenly over 1, 3 or 7 days; party_pump allows up to 30): one seat's
 *           coins (the example's 26.6M) unlock day by day from launch, the same for every seat, the host's too; claim as they unlock
 *   After   the market buys after (an illustration, tagged as one, as in Launch Party's film)
 *   End     tweetpad, launch parties, powered by the @launchpartyV4 SDK
 * NUMBERS: pump.fun's mainnet curve (30 SOL / 1,073M coins virtual, 793.1M sold before PumpSwap, 1.25% fee), checked against the
 * party SDK's firstBuyCoins: seat by seat 4.31% … 33.51%, 26.58M coins a seat, a 49.4 SOL market cap at launch.
 * CLAIMS (Launch Party's spec §8): no "first", no "no snipers", nothing implying a partnership with pump.fun (text only, no pump.fun
 * logo); "refundable until launch"; the not-affiliated line; mainnet isn't deployed, so the end card says devnet now, mainnet soon.
 */
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { FONTS } from "../brand/tokens";

/* ---------- Launch Party's pump.fun world (launchparty-film src/pump4/world.tsx) ---------- */
const W = { white: "#fbfdfb", ink: "#0b0d10", dim: "#5d6660", faint: "rgba(11,13,16,0.07)", green: "#22c55e", deep: "#15803d", pill: "#5eeb9b", gold: "#f5c451", blue: "#1d9bf0" };
const inter = '"Inter", system-ui, sans-serif', mono = '"JetBrains Mono", ui-monospace, Menlo, monospace';
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const settle = Easing.bezier(0.16, 1, 0.3, 1);
const ramp = (f: number, at: number, d = 16) => interpolate(f, [at, at + d], [0, 1], { ...clamp, easing: ease });
const hand = (frame: number, seed = 0, amp = 0.35) => Math.sin((frame + seed * 37) / 47) * amp + Math.sin((frame + seed * 11) / 23) * amp * 0.35;

const Canvas: React.FC<{ glow?: number }> = ({ glow = 1 }) => (
  <AbsoluteFill style={{ background: W.white }}>
    <AbsoluteFill style={{ backgroundImage: "radial-gradient(rgba(11,13,16,0.06) 1.3px, transparent 1.4px)", backgroundSize: "30px 30px",
      maskImage: "radial-gradient(ellipse 75% 70% at 50% 45%, black, transparent 90%)" }} />
    <AbsoluteFill style={{ opacity: glow, background: "radial-gradient(ellipse 65% 42% at 50% 108%, rgba(94,235,155,0.42), transparent 70%)" }} />
  </AbsoluteFill>
);
/* a line that resolves word by word out of a blur, and leaves at `to` */
const Words: React.FC<{ text: string; at: number; to?: number; size: number; color?: string; weight?: number }> = ({ text, at, to, size, color = W.ink, weight = 800 }) => {
  const f = useCurrentFrame(), out = to === undefined ? 1 : interpolate(f, [to - 10, to], [1, 0], clamp);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: size * 0.26, rowGap: size * 0.05, opacity: out,
      fontFamily: inter, fontWeight: weight, fontSize: size, lineHeight: 1.02, letterSpacing: "-0.035em", color, textAlign: "center" }}>
      {text.split(" ").map((w, i) => {
        const t = interpolate(f, [at + i * 3, at + i * 3 + 14], [0, 1], { ...clamp, easing: ease });
        return <span key={i} style={{ opacity: t, filter: `blur(${(1 - t) * 14}px)`, translate: `0px ${(1 - t) * size * 0.25}px` }}>{w}</span>;
      })}
    </div>
  );
};
/* a green chip (Launch Party's); a dot where their film draws pump.fun's pill: text only here */
const Chip: React.FC<{ children: React.ReactNode; size: number; dot?: boolean; o?: number }> = ({ children, size, dot = false, o = 1 }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: size * 0.4, padding: `${size * 0.32}px ${size * 0.7}px`, borderRadius: 999, opacity: o,
    fontFamily: inter, fontWeight: 800, fontSize: size, letterSpacing: "-0.02em", color: W.ink,
    background: `linear-gradient(180deg, #a6f7c6, ${W.pill})`, boxShadow: `0 ${size * 0.4}px ${size}px -${size * 0.4}px rgba(21,128,61,0.55), inset 0 2px 0 rgba(255,255,255,0.7)` }}>
    {dot && <i style={{ width: size * 0.45, height: size * 0.45, borderRadius: "50%", background: W.deep }} />}{children}
  </span>
);
const CREW = ["miladyfren", "noun_enjoyer", "gm_kai", "wagmi_jo", "pillpopper", "curvecat", "degen_ava", "frenly", "sendooor", "onepricemax"];
const Pfp: React.FC<{ i: number; size: number; ring?: string }> = ({ i, size, ring = "#ffffff" }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0, boxShadow: `0 0 0 ${Math.max(3, size * 0.05)}px ${ring}, 0 ${size * 0.12}px ${size * 0.3}px -${size * 0.1}px rgba(11,13,16,0.35)` }}>
    <Img src={staticFile(`party/noun-${i}.svg`)} style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} />
  </div>
);

/* ---------- pump.fun's real curve (Launch Party's math, checked against the party SDK) ---------- */
const SEAT_PCT = [4.31, 8.36, 12.16, 15.74, 19.12, 22.32, 25.34, 28.2, 30.92, 33.51];
const AT_LAUNCH = SEAT_PCT[9] / 100;
const SOL_USD = 104.24;   // SOL in dollars on 2026-10-14, as in Launch Party's film
const SOLD = 793.1 / 1073;
const price = (x: number) => (1 / (1 - SOLD * x) ** 2 - 1) / (1 / (1 - SOLD) ** 2 - 1);
const mcapAt = (x: number) => { const vs = (30 * 1073) / (1073 - x * 793.1); return ((vs * vs * 1e9) / (1.073e9 * 30)) * SOL_USD; };
const usd = (v: number) => (v >= 10_000 ? `$${Math.round(v / 1000)}K` : `$${(v / 1000).toFixed(1)}K`);

/* ---------- the timeline ---------- */
const X = 14;
const LENS: [string, number][] = [["open", 120], ["post", 330], ["gate", 270], ["curve", 330], ["vest", 240], ["after", 160], ["end", 170]];
const T: Record<string, { from: number; len: number }> = {};
{ let at = 0; for (const [k, len] of LENS) { T[k] = { from: at, len }; at += len - X; } }
export const PARTY_TOTAL = T.end.from + T.end.len;
const Fader: React.FC<{ len: number; first?: boolean; last?: boolean; children: React.ReactNode }> = ({ len, first, last, children }) => {
  const f = useCurrentFrame(), a = first ? 1 : interpolate(f, [0, X], [0, 1], clamp), b = last ? 1 : interpolate(f, [len - X, len], [1, 0], clamp);
  return <AbsoluteFill style={{ opacity: a * b }}>{children}</AbsoluteFill>;
};
const Shot: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <Sequence name={id} from={T[id].from} durationInFrames={T[id].len}><Fader len={T[id].len} first={id === "open"} last={id === "end"}>{children}</Fader></Sequence>
);

/* ======================================================================================================================
 * Open
 * ==================================================================================================================== */
/* the poster: composed from frame 0 (X shows the first frame before the post plays), so nothing resolves in. The crew sits in a ring
   of seats around the coin, a party seen from above; the ring turns slowly, ripples run out from the table, then every seat sends its
   gold line into the middle (one buy) as the shot hands over to the post. */
const Open: React.FC = () => {
  const f = useCurrentFrame();
  const cx = 540, cy = 488, R = 352, seat = 118, disc = 268;
  const turn = f * 0.14;   // degrees
  const gold = interpolate(f, [58, 92], [0, 1], { ...clamp, easing: settle });
  const glow = 0.5 + 0.5 * Math.sin(f / 9);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #ecfdf3 0%, #c9f7dc 55%, #9eeec0 100%)" }}>
      {/* depth: a light pool behind the table, a fine dot grid, ripples running out from the table */}
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${cx}px ${cy}px, rgba(255,255,255,0.95) 0, rgba(255,255,255,0.55) ${disc + 40}px, transparent ${R + 220}px)` }} />
      <AbsoluteFill style={{ backgroundImage: "radial-gradient(rgba(11,13,16,0.07) 1.3px, transparent 1.4px)", backgroundSize: "30px 30px",
        maskImage: `radial-gradient(circle at ${cx}px ${cy}px, transparent ${R - 40}px, black ${R + 60}px, transparent ${R + 420}px)` }} />
      <svg width={1080} height={1080} style={{ position: "absolute", inset: 0 }}>
        {[0, 1, 2, 3].map((k) => {
          const u = ((f + k * 45) % 180) / 180, r = R + 40 + u * 420;
          return <circle key={k} cx={cx} cy={cy} r={r} fill="none" stroke="#ffffff" strokeWidth={2.5} opacity={(1 - u) * 0.8} />;
        })}
        {/* the ring of seats: a full pump.fun-green track (every seat taken) */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={22} />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="url(#ring)" strokeWidth={10} style={{ filter: `drop-shadow(0 0 ${8 + glow * 8}px rgba(34,197,94,0.55))` }} />
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={W.pill} /><stop offset="1" stopColor={W.green} /></linearGradient>
        </defs>
        {/* every seat into the one buy */}
        {CREW.map((_, i) => {
          const a = ((i / 10) * 360 + turn - 90) * Math.PI / 180, x = cx + Math.cos(a) * (R - seat / 2), y = cy + Math.sin(a) * (R - seat / 2);
          const ex = cx + Math.cos(a) * disc, ey = cy + Math.sin(a) * disc;
          return <path key={i} d={`M${x} ${y} L${ex} ${ey}`} stroke="#e0a21a" strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - gold}
            style={{ filter: "drop-shadow(0 0 8px rgba(224,162,26,0.6))" }} />;
        })}
      </svg>
      {/* the table: the coin, with the title on it */}
      <div style={{ position: "absolute", left: cx - disc, top: cy - disc, width: disc * 2, height: disc * 2, borderRadius: "50%", background: "#ffffff",
        boxShadow: `0 0 0 ${10 + gold * 4}px rgba(255,255,255,0.6), 0 0 0 2px rgba(21,128,61,0.14) inset, 0 50px 90px -40px rgba(21,128,61,0.55), 0 0 ${gold * 70}px rgba(245,196,81,${gold * 0.55})`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 46, height: 46 }} />
          <span style={{ fontFamily: FONTS.round, fontWeight: 600, fontSize: 34, color: W.ink }}>tweetpad</span>
          <span style={{ padding: "6px 13px", borderRadius: 999, background: W.ink, color: "#fff", fontFamily: inter, fontWeight: 700, fontSize: 18 }}>update</span>
        </div>
        <div style={{ fontFamily: inter, fontWeight: 900, fontSize: 104, lineHeight: 0.92, letterSpacing: "-0.045em", color: W.ink, textAlign: "center" }}>Launch<br />parties</div>
        <Chip size={21} dot>Up to 1,000 seats · whole crew, same entry</Chip>
      </div>
      {/* the crew in their seats, upright while the ring turns */}
      {CREW.map((name, i) => {
        const a = ((i / 10) * 360 + turn - 90) * Math.PI / 180;
        const bob = Math.sin(f / 11 + i * 1.3) * 3;
        return (
          <div key={name} style={{ position: "absolute", left: cx + Math.cos(a) * R - seat / 2, top: cy + Math.sin(a) * R - seat / 2 + bob }}>
            <Pfp i={i} size={seat} ring={gold > 0.5 ? W.gold : "#ffffff"} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 46, textAlign: "center", fontFamily: inter, fontWeight: 700, fontSize: 38, letterSpacing: "-0.02em", color: W.ink }}>
        Launch a coin on pump.fun with your friends,<br />right from a post.
      </div>
    </AbsoluteFill>
  );
};

/* ======================================================================================================================
 * The post, with tweetpad's party card in it (dark, as on tweetpad), filling seat by seat
 * ==================================================================================================================== */
const seatAt = (i: number) => 70 + i * 18;   // in the post shot: friend i takes a seat
const PartyCard: React.FC<{ seatsIn: number; live?: number }> = ({ seatsIn, live = 0 }) => {
  const f = useCurrentFrame(), pct = live ? SEAT_PCT[9] : seatsIn ? SEAT_PCT[seatsIn - 1] : 0;
  const card = { bg: "#0c1015", line: "rgba(255,255,255,0.1)", ink: "#f3f5f8", dim: "#8d96a3", mint: "#3fe0a0" };
  return (
    <div style={{ width: 620, borderRadius: 22, padding: 20, display: "flex", flexDirection: "column", gap: 14, background: `radial-gradient(70% 60% at 15% 0%, rgba(29,155,240,.22), transparent 70%), ${card.bg}`,
      color: card.ink, fontFamily: inter, border: `1px solid ${card.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 11px 5px 5px", borderRadius: 99, border: `1px solid ${card.line}`, fontFamily: FONTS.round, fontWeight: 600, fontSize: 16 }}>
          <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 22, height: 22 }} />tweetpad</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, padding: "6px 11px", borderRadius: 99, border: `1px solid ${live ? "rgba(63,224,160,.5)" : "rgba(29,155,240,.5)"}`, fontWeight: 600, fontSize: 14 }}>
          <i style={{ width: 8, height: 8, borderRadius: 4, background: live ? card.mint : W.blue }} />{live ? "Launched" : `Open · ${seatsIn} of 10`}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ width: 62, height: 62, borderRadius: 18, display: "grid", placeItems: "center", background: `linear-gradient(135deg, ${W.pill}, ${W.green})`, color: W.ink, fontWeight: 900, fontSize: 30 }}>C</span>
        <div>
          <div style={{ fontFamily: FONTS.round, fontWeight: 600, fontSize: 28, lineHeight: 1.1 }}>Crew</div>
          <div style={{ fontSize: 15, color: card.dim }}><b style={{ color: card.ink }}>$CREW</b> · hosted by @you</div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6, padding: "4px 10px", borderRadius: 99, fontSize: 13, color: "#c9f5e2", background: "rgba(63,224,160,.1)", border: "1px solid rgba(63,224,160,.3)" }}>
            <i style={{ width: 7, height: 7, borderRadius: 4, background: card.mint }} />{live ? "Live on " : "Launches on "}<b style={{ color: card.mint }}>pump.fun</b></span>
        </div>
      </div>
      {live ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[["A seat got", "26.6M", "$CREW"], ["Market cap", usd(mcapAt(AT_LAUNCH)), ""], ["Party of", "10", "seats"]].map(([k, v, u]) => (
            <div key={k} style={{ padding: "10px 12px", borderRadius: 14, border: `1px solid ${card.line}`, background: "rgba(255,255,255,.035)" }}>
              <div style={{ fontSize: 12, color: card.dim }}>{k}</div>
              <div style={{ fontFamily: FONTS.round, fontWeight: 600, fontSize: 22 }}>{v} <span style={{ fontFamily: inter, fontSize: 13, color: card.dim }}>{u}</span></div>
            </div>))}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          {CREW.map((_, i) => {
            const t = interpolate(f, [seatAt(i), seatAt(i) + 12], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 1.45, 0.5, 1) });
            return (
              <div key={i} style={{ position: "relative", width: 46, height: 46 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px dashed rgba(255,255,255,.22)" }} />
                {i < seatsIn && <div style={{ position: "absolute", inset: 0, opacity: t, scale: interpolate(t, [0, 1], [0.4, 1]) }}><Pfp i={i} size={46} ring={W.blue} /></div>}
              </div>);
          })}
        </div>
      )}
      <div style={{ padding: "12px 14px", borderRadius: 16, background: "rgba(63,224,160,.05)", border: "1px solid rgba(63,224,160,.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontWeight: 600, fontSize: 15 }}>
          <span><b style={{ color: card.mint }}>pump.fun</b> bonding curve</span>
          <span style={{ fontFamily: FONTS.round, fontSize: 24, color: card.mint }}>{pct.toFixed(1)}%</span>
        </div>
        <div style={{ marginTop: 8, height: 12, borderRadius: 8, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 8, background: "linear-gradient(90deg, #2bc4d9, #3fe0a0)", boxShadow: "0 0 16px rgba(63,224,160,.45)" }} />
        </div>
      </div>
      <div style={{ padding: 15, borderRadius: 15, textAlign: "center", fontFamily: FONTS.round, fontWeight: 600, fontSize: 21, color: W.ink, background: "linear-gradient(180deg, #fff, #e7eef6)" }}>
        {live ? "Claim 26.6M $CREW" : seatsIn >= 10 ? "Every seat is taken: launch now" : "Take a seat · 1 SOL"}
      </div>
    </div>
  );
};
const XPost: React.FC<{ seatsIn: number; live?: number }> = ({ seatsIn, live }) => (
  <div style={{ width: 680, padding: "22px 30px 18px", borderRadius: 30, background: "#ffffff", boxShadow: "0 0 0 1px rgba(11,13,16,0.07), 0 60px 110px -50px rgba(21,128,61,0.4)", fontFamily: inter }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <span style={{ width: 48, height: 48, borderRadius: 24, background: W.ink, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 22 }}>Y</span>
      <div><div style={{ fontWeight: 800, fontSize: 20, color: W.ink }}>you</div><div style={{ fontSize: 16, color: W.dim }}>@you · now</div></div>
    </div>
    <div style={{ fontSize: 20, lineHeight: 1.35, color: W.ink, marginBottom: 14 }}>
      Throwing a launch party: <b>$CREW</b> on <span style={{ color: W.blue }}>@pumpfun</span>. 10 seats at 1 SOL, refundable until launch. Take a seat 👇 <span style={{ color: W.blue }}>tweetpad.io/p/…</span>
    </div>
    <div style={{ display: "flex", justifyContent: "center" }}><PartyCard seatsIn={seatsIn} live={live} /></div>
  </div>
);
const Post: React.FC = () => {
  const f = useCurrentFrame();
  const seatsIn = CREW.filter((_, i) => f >= seatAt(i)).length, joining = seatsIn - 1;
  return (
    <AbsoluteFill>
      <Canvas glow={0.7} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 50, display: "flex", justifyContent: "center" }}>
        <Words text="Your timeline takes the seats." at={6} size={62} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 150, display: "flex", justifyContent: "center", rotate: `${hand(f, 2, 0.15)}deg`,
        opacity: ramp(f, 8, 16), translate: `0px ${(1 - ramp(f, 8, 16)) * 40}px`, scale: 1.28, transformOrigin: "50% 0" }}>
        <XPost seatsIn={seatsIn} />
      </div>
      {joining >= 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, display: "flex", justifyContent: "center" }}>
          <div key={joining} style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "10px 24px 10px 10px", borderRadius: 999, background: "#ffffff",
            boxShadow: "0 0 0 1px rgba(11,13,16,0.08), 0 16px 30px -18px rgba(11,13,16,0.4)", fontFamily: inter, fontWeight: 700, fontSize: 26, color: W.ink,
            opacity: ramp(f, seatAt(joining), 8), translate: `0px ${(1 - ramp(f, seatAt(joining), 8)) * 14}px` }}>
            <Pfp i={joining} size={44} ring={W.pill} />@{CREW[joining]} <span style={{ color: W.dim, fontWeight: 600 }}>took a seat</span>
            <span style={{ fontFamily: mono, fontWeight: 600, color: W.deep }}>{seatsIn}/10</span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ======================================================================================================================
 * Gate: who can join. Launch Party's whitelist, enforced by the party's program; tweetpad builds it from a token's holders
 * ==================================================================================================================== */
const HEAT = "#f97316";
const WHO = ["Anyone", "Whitelist", "Token holders"];
const G = { slide: 34, token: 62, rows: [96, 116, 136, 166], cap2: 150, add: 214 };
const Gate: React.FC = () => {
  const f = useCurrentFrame();
  const pick = interpolate(f, [G.slide, G.slide + 22], [0, 2], { ...clamp, easing: Easing.bezier(0.65, 0, 0.25, 1) });
  const token = ramp(f, G.token, 16);
  const segW = 700, opt = (segW - 12) / 3;
  /* the wallets that try: two holders in, a wallet without $TP refused, then a later buyer who asks and is added on the refresh */
  const rows = [
    { i: 2, who: "gm_kai", note: "holds $TP", tone: "in" },
    { i: 4, who: "pillpopper", note: "holds $TP", tone: "in" },
    { i: -1, who: "7xQp…f3Rk", note: "no $TP", tone: "out" },
    { i: 5, who: "curvecat", note: "bought $TP · asked to join", tone: "wait" },
  ];
  const added = ramp(f, G.add, 12);
  return (
    <AbsoluteFill>
      <Canvas glow={0.7} />
      <div style={{ position: "absolute", left: 60, right: 60, top: 44, height: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {f < G.cap2 && <Words text="Keep it to your crew." at={6} to={G.cap2} size={72} />}
        {f >= G.cap2 && <Words text="Or let a token's holders in." at={G.cap2} size={72} />}
      </div>
      {/* the host's choice: who can join */}
      <div style={{ position: "absolute", left: 540 - 400, top: 184, width: 800, padding: "30px 50px 32px", borderRadius: 32, background: "#ffffff", opacity: ramp(f, 4, 18), translate: `0px ${(1 - ramp(f, 4, 18)) * 30}px`,
        boxShadow: "0 0 0 1px rgba(11,13,16,0.07), 0 60px 110px -50px rgba(21,128,61,0.4)", fontFamily: inter, rotate: `${hand(f, 3, 0.1)}deg` }}>
        <div style={{ fontWeight: 700, fontSize: 28, color: W.ink, marginBottom: 16 }}>Who can join</div>
        <div style={{ position: "relative", width: segW, height: 74, borderRadius: 22, background: "rgba(11,13,16,0.05)", padding: 6 }}>
          <div style={{ position: "absolute", top: 6, left: 6 + pick * opt, width: opt, height: 62, borderRadius: 17, background: W.ink, boxShadow: "0 10px 24px -12px rgba(11,13,16,0.6)" }} />
          {WHO.map((w, k) => (
            <div key={w} style={{ position: "absolute", top: 6, left: 6 + k * opt, width: opt, height: 62, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 25,
              color: Math.abs(pick - k) < 0.5 ? "#ffffff" : W.dim }}>{w}</div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 20, opacity: token, translate: `0px ${(1 - token) * 12}px`, height: token * 84, overflow: "hidden" }}>
          <div style={{ flex: 2, display: "flex", alignItems: "center", gap: 12, padding: "0 20px", height: 76, borderRadius: 18, border: "2px solid rgba(11,13,16,0.08)" }}>
            <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 40, height: 40 }} />
            <span style={{ fontWeight: 800, fontSize: 30, color: W.ink }}>$TP</span>
            <span style={{ fontFamily: mono, fontSize: 20, color: W.dim }}>BctF…EQDN</span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 20px", height: 76, borderRadius: 18, border: "2px solid rgba(11,13,16,0.08)" }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: W.dim }}>Hold at least</span>
            <span style={{ fontFamily: mono, fontWeight: 700, fontSize: 26, color: W.ink }}>1,000,000</span>
          </div>
        </div>
        <div style={{ marginTop: 14 * token, fontSize: 20, fontWeight: 600, color: W.dim, opacity: ramp(f, G.token + 10, 14) }}>
          The party's program checks a whitelist. tweetpad builds it from the holders.
        </div>
      </div>
      {/* who tries to take a seat */}
      <div style={{ position: "absolute", left: 540 - 400, top: 640, width: 800, display: "flex", flexDirection: "column", gap: 14 }}>
        {rows.map((r, k) => {
          const t = interpolate(f, [G.rows[k], G.rows[k] + 12], [0, 1], { ...clamp, easing: ease });
          const shake = r.tone === "out" ? Math.sin((f - G.rows[k]) * 1.6) * interpolate(f, [G.rows[k] + 10, G.rows[k] + 26], [10, 0], clamp) : 0;
          const wait = r.tone === "wait" && added < 1;
          const color = r.tone === "out" ? HEAT : wait ? W.blue : W.deep;
          const tag = r.tone === "out" ? "Not on the whitelist" : wait ? (f >= G.rows[k] + 20 ? "Waiting for the host" : "Checking…") : r.tone === "wait" ? "Added on refresh" : "On the whitelist";
          return (
            <div key={r.who} style={{ opacity: t, translate: `${shake}px ${(1 - t) * 20}px`, display: "flex", alignItems: "center", gap: 16, padding: "12px 22px 12px 12px", borderRadius: 999, background: "#ffffff",
              boxShadow: `0 0 0 ${r.tone === "out" ? 2 : 1}px ${r.tone === "out" ? "rgba(249,115,22,0.35)" : "rgba(11,13,16,0.08)"}, 0 16px 30px -18px rgba(11,13,16,0.35)`, fontFamily: inter }}>
              {r.i >= 0 ? <Pfp i={r.i} size={52} ring={W.pill} /> : <span style={{ width: 52, height: 52, borderRadius: 26, background: "#e8ebe8", display: "grid", placeItems: "center", fontWeight: 800, color: "#9aa09a", fontSize: 24 }}>?</span>}
              <span style={{ fontWeight: 800, fontSize: 26, color: r.tone === "out" ? "#9aa09a" : W.ink, textDecoration: r.tone === "out" && f > G.rows[k] + 18 ? "line-through" : "none" }}>{r.i >= 0 ? "@" + r.who : r.who}</span>
              <span style={{ fontWeight: 600, fontSize: 22, color: W.dim }}>{r.note}</span>
              <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 22, color }}>
                <i style={{ width: 12, height: 12, borderRadius: 6, background: color, boxShadow: wait ? `0 0 0 ${4 + 3 * Math.sin(f / 4)}px rgba(29,155,240,0.18)` : "none" }} />{tag}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ======================================================================================================================
 * The curve (Launch Party's chart): every seat moves it; you pick the seats and the price (10 × 1 SOL is the example); one buy for the crew
 * ==================================================================================================================== */
const C = { cap1: [6, 92], cap2: [94, 180], band: 120, cap3: [182, 250], button: 196, press: 222, buy: 232, cap4: [252, 330], after: 140 };
const Chart: React.FC<{ w: number; h: number; p: number; band: number }> = ({ w, h, p, band }) => {
  const f = useCurrentFrame();
  const pad = { l: 40, r: 40, t: 190, b: 56 };
  const Xp = (x: number) => pad.l + x * (w - pad.l - pad.r);
  const Yp = (x: number) => h - pad.b - price(x) * (h - pad.t - pad.b);
  const line = (to: number) => Array.from({ length: 81 }, (_, i) => (i / 80) * to).map((x, i) => `${i ? "L" : "M"}${Xp(x).toFixed(1)} ${Yp(x).toFixed(1)}`).join(" ");
  const area = `${line(p)} L${Xp(p).toFixed(1)} ${h - pad.b} L${Xp(0)} ${h - pad.b} Z`;
  const draw = ramp(f, 0, 24);
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 32, background: "#ffffff", opacity: draw, translate: `0px ${(1 - draw) * 30}px`,
      boxShadow: "0 0 0 1px rgba(11,13,16,0.07), 0 60px 110px -50px rgba(21,128,61,0.4)" }}>
      <div style={{ position: "absolute", left: 40, right: 40, top: 30, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontFamily: inter, fontWeight: 700, fontSize: 30, color: W.ink }}><span style={{ color: W.deep }}>pump.fun</span> bonding curve at launch</span>
        <span style={{ fontFamily: mono, fontWeight: 600, fontSize: 78, color: W.deep, lineHeight: 1 }}>{(p * 100).toFixed(1)}%</span>
      </div>
      <div style={{ position: "absolute", left: 40, right: 40, top: 122, height: 24, borderRadius: 999, background: W.faint, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${p * 100}%`, borderRadius: 999, background: `linear-gradient(90deg, ${W.green}, ${W.pill})`, boxShadow: "0 0 18px rgba(34,197,94,0.55)" }} />
        {SEAT_PCT.map((v) => <div key={v} style={{ position: "absolute", top: 0, bottom: 0, left: `${v}%`, width: 2, background: "rgba(255,255,255,0.85)" }} />)}
      </div>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs><linearGradient id="pfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={W.pill} stopOpacity="0.75" /><stop offset="1" stopColor={W.pill} stopOpacity="0.12" /></linearGradient></defs>
        <line x1={Xp(0)} x2={Xp(1)} y1={h - pad.b} y2={h - pad.b} stroke="rgba(11,13,16,0.1)" strokeWidth={2} />
        <path d={line(1)} fill="none" stroke="rgba(11,13,16,0.16)" strokeWidth={4} strokeDasharray="3 12" strokeLinecap="round" />
        <rect x={Xp(0)} y={pad.t - 10} width={Xp(AT_LAUNCH) - Xp(0)} height={h - pad.t - pad.b + 10} rx={14} fill={W.pill} opacity={band * 0.16} />
        <path d={area} fill="url(#pfill)" />
        <path d={line(p)} fill="none" stroke={W.green} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={Xp(p)} cy={Yp(p)} r={17} fill={W.green} stroke="#ffffff" strokeWidth={5} style={{ filter: `drop-shadow(0 0 ${10 + 6 * Math.sin(f / 6)}px rgba(34,197,94,0.7))` }} />
        <text x={Xp(1)} y={h - pad.b + 40} textAnchor="end" style={{ fontFamily: mono, fontSize: 20, fill: W.dim }}>PumpSwap at 100%</text>
        <text x={Xp(0)} y={h - pad.b + 40} style={{ fontFamily: mono, fontSize: 20, fill: W.ink }}>Example: 10 seats × 1 SOL</text>
      </svg>
      <div style={{ position: "absolute", left: Xp(0), top: pad.t + 6, opacity: band, translate: `0px ${(1 - band) * 10}px` }}>
        <span style={{ display: "inline-block", padding: "8px 16px", borderRadius: 999, background: W.ink, color: "#fff", fontFamily: inter, fontWeight: 700, fontSize: 22, whiteSpace: "nowrap" }}>Your crew · one price</span>
      </div>
    </div>
  );
};
const Curve: React.FC = () => {
  const f = useCurrentFrame();
  const FW = 1080, seat = 70, gapX = 18, rowW = 10 * seat + 9 * gapX, rowY = 900, slotY = 790;
  const p = interpolate(f, [10, 90], [0, AT_LAUNCH], { ...clamp, easing: settle });
  const band = ramp(f, C.band, 18), button = ramp(f, C.button, 14), press = interpolate(f, [C.press, C.press + 5, C.press + 12], [0, 1, 0], clamp);
  const buy = ramp(f, C.buy, 14), flow = interpolate(f, [C.buy, C.buy + 36], [0, 1], { ...clamp, easing: settle }), flash = interpolate(f, [C.buy, C.buy + 3, C.buy + 22], [0, 0.5, 0], clamp);
  const seatXY = (i: number) => ({ x: FW / 2 - rowW / 2 + seat / 2 + i * (seat + gapX), y: rowY });
  return (
    <AbsoluteFill>
      <Canvas glow={0.8 + flash} />
      <div style={{ position: "absolute", left: 70, right: 70, top: 40, height: 170, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {f < C.cap1[1] && <Words text="Every seat moves the curve." at={C.cap1[0]} to={C.cap1[1]} size={70} />}
        {f >= C.cap2[0] && f < C.cap2[1] && <Words text="You pick the seats and the price." at={C.cap2[0]} to={C.cap2[1]} size={70} />}
        {f >= C.cap3[0] && f < C.cap3[1] && <Words text="Every seat buys at launch, at the same price." at={C.cap3[0]} to={C.cap3[1]} size={64} />}
        {f >= C.cap4[0] && <Words text="One buy. The whole crew." at={C.cap4[0]} size={74} />}
      </div>
      <div style={{ position: "absolute", left: FW / 2 - 470, top: 220, rotate: `${hand(f, 4, 0.12)}deg` }}><Chart w={940} h={520} p={p} band={band} /></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: slotY - 46, height: 92, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {f >= C.cap2[0] && f < C.cap2[1] && (() => {
          /* the host's picks: any number of seats from 2 to 1,000, any price; the chart is the 10 × 1 SOL example */
          const o = ramp(f, C.cap2[0] + 8, 12) * interpolate(f, [C.cap2[1] - 10, C.cap2[1]], [1, 0], clamp);
          const pill = (label: string, on: boolean, k: number) => (
            <span key={label} style={{ padding: "12px 20px", borderRadius: 999, fontFamily: inter, fontWeight: 700, fontSize: 24, opacity: ramp(f, C.cap2[0] + 8 + k * 3, 10),
              color: on ? "#fff" : W.dim, background: on ? W.ink : "#ffffff", boxShadow: on ? "0 12px 24px -12px rgba(11,13,16,0.6)" : "0 0 0 1px rgba(11,13,16,0.09)" }}>{label}</span>
          );
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: o }}>
              {["5", "10 seats", "20", "50", "… 1,000"].map((s, k) => pill(s, s === "10 seats", k))}
              <span style={{ fontFamily: inter, fontWeight: 800, fontSize: 30, color: W.dim, margin: "0 6px" }}>×</span>
              {["0.1", "1 SOL", "2"].map((s, k) => pill(s, s === "1 SOL", k + 5))}
            </div>
          );
        })()}
        {f >= C.button && f < C.buy && (
          <div style={{ opacity: button, scale: (0.9 + button * 0.1) * (1 - press * 0.05) }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "18px 42px", borderRadius: 999, fontFamily: inter, fontWeight: 800, fontSize: 34, color: "#fff",
              background: W.ink, boxShadow: `0 20px 40px -18px rgba(11,13,16,${0.5 + press * 0.3})` }}><i style={{ width: 14, height: 14, borderRadius: 7, background: W.pill }} />Launch on pump.fun</span>
          </div>
        )}
        {f >= C.buy && <div style={{ opacity: buy, scale: interpolate(buy, [0, 1], [0.6, 1]) }}><Chip size={40} dot>BUY $CREW</Chip></div>}
      </div>
      <svg width={FW} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: interpolate(flow, [0, 0.08, 0.9, 1], [0, 1, 1, 0.5]) }}>
        {CREW.map((_, i) => { const s = seatXY(i); const d = `M${s.x} ${s.y - seat / 2} C ${s.x} ${s.y - 120}, ${FW / 2} ${slotY + 120}, ${FW / 2} ${slotY + 26}`;
          return <path key={i} d={d} fill="none" stroke="#e0a21a" strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - flow} style={{ filter: "drop-shadow(0 0 8px rgba(224,162,26,0.55))" }} />; })}
      </svg>
      {CREW.map((name, i) => { const s = seatXY(i);
        return <div key={name} style={{ position: "absolute", left: s.x - seat / 2, top: s.y - seat / 2 }}><Pfp i={i} size={seat} ring={f >= C.buy ? W.gold : "#ffffff"} /></div>; })}
      <AbsoluteFill style={{ background: "#ffffff", opacity: flash, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

/* ======================================================================================================================
 * Vest: when the coins unlock. A room's vest is linear from launch (party_pump `claim`: per_seat × elapsed / vest), every seat alike
 * ==================================================================================================================== */
const VEST = ["At launch", "1 day", "3 days", "7 days"];
const PER_SEAT = 26.58;   // M coins a seat, the 10 × 1 SOL example
const V = { slide: 30, chart: 54, run: [70, 214] as [number, number], press: 132, cap2: 120 };
const Vest: React.FC = () => {
  const f = useCurrentFrame();
  const pick = interpolate(f, [V.slide, V.slide + 24], [0, 3], { ...clamp, easing: Easing.bezier(0.65, 0, 0.25, 1) });
  const chart = ramp(f, V.chart, 16);
  const day = interpolate(f, V.run, [0, 7], clamp), u = day / 7;
  const unlocked = PER_SEAT * u;
  const claimedAt = PER_SEAT * interpolate(V.press, V.run, [0, 1], clamp);   // what the claim took, when it was pressed
  const claimed = f >= V.press + 6 ? claimedAt : 0;
  const press = interpolate(f, [V.press, V.press + 5, V.press + 12], [0, 1, 0], clamp);
  const segW = 720, opt = (segW - 12) / 4, cw = 720, ch = 200;
  const X = (d: number) => (d / 7) * cw, Y = (v: number) => ch - (v / PER_SEAT) * ch;
  return (
    <AbsoluteFill>
      <Canvas />
      <div style={{ position: "absolute", left: 60, right: 60, top: 44, height: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {f < V.cap2 && <Words text="Unlock at launch, or over days." at={6} to={V.cap2} size={68} />}
        {f >= V.cap2 && <Words text="Claim as they unlock." at={V.cap2} size={72} />}
      </div>
      <div style={{ position: "absolute", left: 540 - 410, top: 196, width: 820, padding: "30px 50px 34px", borderRadius: 32, background: "#ffffff", opacity: ramp(f, 4, 18),
        translate: `0px ${(1 - ramp(f, 4, 18)) * 30}px`, boxShadow: "0 0 0 1px rgba(11,13,16,0.07), 0 60px 110px -50px rgba(21,128,61,0.4)", fontFamily: inter, rotate: `${hand(f, 5, 0.1)}deg` }}>
        <div style={{ fontWeight: 700, fontSize: 28, color: W.ink, marginBottom: 16 }}>Coins unlock</div>
        <div style={{ position: "relative", width: segW, height: 70, borderRadius: 22, background: "rgba(11,13,16,0.05)" }}>
          <div style={{ position: "absolute", top: 6, left: 6 + pick * opt, width: opt, height: 58, borderRadius: 17, background: W.ink, boxShadow: "0 10px 24px -12px rgba(11,13,16,0.6)" }} />
          {VEST.map((v, k) => (
            <div key={v} style={{ position: "absolute", top: 6, left: 6 + k * opt, width: opt, height: 58, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 24,
              color: Math.abs(pick - k) < 0.5 ? "#ffffff" : W.dim }}>{v}</div>
          ))}
        </div>
        {/* one seat's coins, unlocking evenly from launch */}
        <div style={{ opacity: chart, height: chart * 340, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 28 }}>
            <span style={{ fontWeight: 700, fontSize: 24, color: W.ink }}>A seat’s coins <span style={{ color: W.dim, fontWeight: 600 }}>· example: {PER_SEAT.toFixed(1)}M $CREW</span></span>
            <span style={{ fontFamily: mono, fontWeight: 600, fontSize: 44, color: W.deep }}>{Math.round(u * 100)}%</span>
          </div>
          <svg width={cw} height={ch + 46} style={{ marginTop: 14, overflow: "visible" }}>
            <defs><linearGradient id="vfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={W.pill} stopOpacity="0.7" /><stop offset="1" stopColor={W.pill} stopOpacity="0.1" /></linearGradient></defs>
            {[1, 2, 3, 4, 5, 6].map((d) => <line key={d} x1={X(d)} x2={X(d)} y1={0} y2={ch} stroke="rgba(11,13,16,0.06)" strokeWidth={2} />)}
            <line x1={0} x2={cw} y1={ch} y2={ch} stroke="rgba(11,13,16,0.12)" strokeWidth={2} />
            <path d={`M0 ${ch} L${cw} 0`} stroke="rgba(11,13,16,0.16)" strokeWidth={4} strokeDasharray="3 12" strokeLinecap="round" />
            <path d={`M0 ${ch} L${X(day)} ${Y(unlocked)} L${X(day)} ${ch} Z`} fill="url(#vfill)" />
            <path d={`M0 ${ch} L${X(day)} ${Y(unlocked)}`} stroke={W.green} strokeWidth={7} strokeLinecap="round" />
            {claimed > 0 && <line x1={0} x2={cw} y1={Y(claimed)} y2={Y(claimed)} stroke={W.gold} strokeWidth={3} strokeDasharray="8 8" />}
            {claimed > 0 && <text x={8} y={Y(claimed) - 10} style={{ fontFamily: mono, fontWeight: 700, fontSize: 18, fill: "#b7801a" }}>claimed</text>}
            <circle cx={X(day)} cy={Y(unlocked)} r={15} fill={W.green} stroke="#fff" strokeWidth={5} style={{ filter: "drop-shadow(0 0 10px rgba(34,197,94,0.6))" }} />
            <text x={0} y={ch + 36} style={{ fontFamily: mono, fontSize: 20, fill: W.dim }}>Launch</text>
            <text x={cw} y={ch + 36} textAnchor="end" style={{ fontFamily: mono, fontSize: 20, fill: W.dim }}>Day 7 · all yours</text>
            <text x={X(day)} y={ch + 36} textAnchor="middle" opacity={day > 0.8 && day < 5.6 ? 1 : 0} style={{ fontFamily: mono, fontWeight: 700, fontSize: 20, fill: W.ink }}>Day {day.toFixed(1)}</text>
          </svg>
        </div>
      </div>
      {/* the claim: whatever has unlocked, any time */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 770, height: 110, display: "flex", alignItems: "center", justifyContent: "center", gap: 18, opacity: ramp(f, V.run[0], 14) }}>
        {f < V.press + 6 ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "20px 44px", borderRadius: 999, fontFamily: inter, fontWeight: 800, fontSize: 34, color: "#fff",
            background: W.ink, scale: 1 - press * 0.05, boxShadow: `0 20px 40px -18px rgba(11,13,16,${0.5 + press * 0.3})` }}>Claim {unlocked.toFixed(1)}M $CREW</span>
        ) : (
          <>
            <Chip size={30} dot>Claimed {claimed.toFixed(1)}M $CREW</Chip>
            <span style={{ fontFamily: inter, fontWeight: 700, fontSize: 26, color: W.dim }}>{Math.max(0, unlocked - claimed).toFixed(1)}M more unlocked · {(PER_SEAT - unlocked).toFixed(1)}M to come</span>
          </>
        )}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 120, textAlign: "center", fontFamily: inter, fontWeight: 600, fontSize: 24, color: W.dim, opacity: ramp(f, V.cap2 + 20, 14) }}>
        Every seat unlocks on the same schedule, the host’s too.
      </div>
    </AbsoluteFill>
  );
};

/* ======================================================================================================================
 * After: the market buys after (an illustration, tagged as one, from Launch Party's film)
 * ==================================================================================================================== */
const After: React.FC = () => {
  const f = useCurrentFrame(), t = interpolate(f, [18, 130], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 0, 0.2, 1) });
  const pct = AT_LAUNCH * 100 + t * (80 - AT_LAUNCH * 100), mcap = mcapAt(pct / 100), cw = 880;
  const pts = Array.from({ length: 70 }, (_, i) => { const x = i / 69; const y = 0.92 - (x * x * 0.72 + Math.sin(i * 1.7) * 0.025 + Math.sin(i * 0.6) * 0.03); return { x: x * cw, y: y * 300, shown: x <= t }; }).filter((q) => q.shown);
  const pills = Array.from({ length: 9 }, (_, k) => { const start = 20 + k * 11; const u = interpolate(f, [start, start + 50], [0, 1], clamp); return { k, u, x: (k % 2 ? 1 : -1) * (cw / 2 - 40 + (k % 3) * 30) }; });
  return (
    <AbsoluteFill>
      <Canvas />
      <AbsoluteFill style={{ alignItems: "center", flexDirection: "column", gap: 40, paddingTop: 60 }}>
        <Words text="Then the market buys after you." at={6} size={66} />
        <div style={{ position: "relative" }}>
          {pills.map(({ k, u, x }) => (
            <div key={k} style={{ position: "absolute", left: "50%", top: "50%", translate: `${x}px ${180 - u * 420}px`, opacity: interpolate(u, [0, 0.15, 0.8, 1], [0, 1, 1, 0]) }}><Chip size={20}>BUY $CREW</Chip></div>
          ))}
          <div style={{ position: "relative", zIndex: 1, width: cw, borderRadius: 32, padding: 38, display: "flex", flexDirection: "column", gap: 18, background: "#ffffff", opacity: ramp(f, 4, 18),
            boxShadow: "0 0 0 1px rgba(11,13,16,0.07), 0 60px 110px -50px rgba(21,128,61,0.4)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: inter, fontWeight: 800, fontSize: 34, color: W.ink }}>
                <span style={{ width: 54, height: 54, borderRadius: "50%", display: "grid", placeItems: "center", background: W.pill, fontSize: 26 }}>C</span>Crew <span style={{ fontFamily: mono, fontWeight: 500, fontSize: 22, color: W.dim }}>$CREW</span>
              </span>
              <span style={{ fontFamily: mono, fontSize: 16, letterSpacing: "0.1em", textTransform: "uppercase", color: W.dim }}>Illustration · SOL at $104</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <span style={{ fontFamily: mono, fontWeight: 600, fontSize: 80, color: W.deep, lineHeight: 1 }}>{usd(mcap)}</span>
              <span style={{ fontFamily: inter, fontWeight: 600, fontSize: 24, color: W.dim }}>market cap</span>
            </div>
            <svg width={cw - 76} height={260} viewBox={`0 0 ${cw} 300`} preserveAspectRatio="none">
              <path d={pts.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" ")} fill="none" stroke={W.green} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: inter, fontWeight: 700, fontSize: 26, color: W.ink }}>
              <span><span style={{ color: W.deep }}>pump.fun</span> bonding curve</span><span style={{ fontFamily: mono }}>{Math.round(pct)}%</span>
            </div>
            <div style={{ position: "relative", height: 22, borderRadius: 999, background: W.faint, overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, width: `${pct}%`, borderRadius: 999, background: `linear-gradient(90deg, ${W.green}, ${W.pill})` }} />
              <div style={{ position: "absolute", top: 0, bottom: 0, left: `${AT_LAUNCH * 100}%`, width: 3, background: W.ink, opacity: 0.5 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 18, color: W.dim }}><span>▲ your crew in at 33.5%</span><span>PumpSwap at 100%</span></div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ======================================================================================================================
 * End
 * ==================================================================================================================== */
const End: React.FC = () => {
  const f = useCurrentFrame(), p = ramp(f, 2, 18);
  return (
    <AbsoluteFill>
      <Canvas />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 26, padding: "0 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: p, scale: 0.8 + 0.2 * p }}>
          <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 110, height: 110 }} />
          <span style={{ fontFamily: FONTS.round, fontWeight: 600, fontSize: 84, color: W.ink }}>tweetpad</span>
        </div>
        <Words text="Launch parties" at={16} size={110} weight={900} />
        <Words text="Launch with your friends, right from a post." at={32} size={38} weight={700} color={W.dim} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: ramp(f, 50, 14) }}>
          <Chip size={26}>Live on devnet now · mainnet soon · tweetpad.io/party</Chip>
          <span style={{ fontFamily: inter, fontWeight: 600, fontSize: 24, color: W.dim }}>Powered by the <b style={{ color: W.ink }}>@launchpartyV4</b> SDK</span>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 54, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: mono, fontSize: 20, letterSpacing: "0.12em", textTransform: "uppercase", color: W.dim, opacity: ramp(f, 64, 14) }}>
          Launches on <i style={{ width: 12, height: 12, borderRadius: 6, background: W.pill }} /><span style={{ color: W.ink, fontWeight: 600, letterSpacing: "0.02em", textTransform: "none", fontFamily: inter, fontSize: 24 }}>pump.fun</span>
        </div>
        <div style={{ fontFamily: inter, fontSize: 15, color: "#8a928c", opacity: ramp(f, 70, 14) }}>Refundable until launch. Not affiliated with pump.fun; parties launch through pump.fun's public programs.</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const TweetpadParty: React.FC = () => {
  loadFonts();
  return (
    <AbsoluteFill style={{ background: W.white }}>
      <Shot id="open"><Open /></Shot>
      <Shot id="post"><Post /></Shot>
      <Shot id="gate"><Gate /></Shot>
      <Shot id="curve"><Curve /></Shot>
      <Shot id="vest"><Vest /></Shot>
      <Shot id="after"><After /></Shot>
      <Shot id="end"><End /></Shot>
    </AbsoluteFill>
  );
};
