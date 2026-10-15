/**
 * TweetpadAgentsCode: what an agent's own code can be, and how to build one with any coding agent. 1080x1080 @30, ~63 s.
 * A third agents film (AgentsWalkthrough.tsx and AgentsLaunch.tsx stay as they are), told from the code's side.
 *   Hook      "Your agent runs your code": a line of code, typed
 *   Pixel     an idea: an 8-bit arcade host on a CRT, running a dodge game in the post and calling out high scores
 *   Moss      an idea: a lantern spirit in a paper-cut forest who welcomes newcomers, talking on Grok
 *             (each world plays full frame, then pulls back to show it's inside an X post; the kit call behind it sits on top)
 *   Montage   four quick ideas: a launch's help desk, an event companion, a creator's drop host, a DAO's proposal explainer
 *   How to    with any coding agent: claim it and save the key, paste the prompt, it writes agent.html, check and upload,
 *             a person reviews it, it's live
 *   End       "Claim yours now." tweetpad.io/agents
 * CLAIMS: Pixel, Moss and the montage are labelled ideas, not live agents. Every call shown is the kit's real API (sdk.js:
 * tp.ready, tp.on, tp.ask, tp.say, tp.lookup); the steps match SKILL.md (key in .tweetpad/<name>.key, x-check: 1 dry run, upload,
 * review). "Grok" in text only, no logos; no coding-agent brand named; no price talk.
 */
import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { FONTS } from "../brand/tokens";

const LO = { bg: "#000", raise: "#16181c", line: "#2f3336", text: "#e7e9ea", dim: "#8b98a5", blue: "#1d9bf0", green: "#00ba7c" } as const;
const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace', PIX = FONTS.px, VT = FONTS.mono, SERIF = '"Gelasio", Georgia, serif';
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const outCubic = (x: number) => 1 - (1 - clamp01(x)) ** 3;
const inOut = (x: number) => { const t = clamp01(x); return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; };
const back = (x: number) => { const t = clamp01(x), c = 1.6; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
const ramp = (f: number, a: number, b: number, e: (x: number) => number = outCubic) => e((f - a) / (b - a));

/* ---------- the timeline, in frames: each shot overlaps the next by X ---------- */
const X = 12;
const LENS = { hook: 110, pixel: 250, moss: 262, montage: 250, howto: 84, key: 150, prompt: 236, code: 176, check: 186, review: 156, end: 170 } as const;
type Id = keyof typeof LENS;
const T = (() => {
  const out = {} as Record<Id, { from: number; len: number }>; let at = 0;
  (Object.keys(LENS) as Id[]).forEach((k) => { out[k] = { from: at, len: LENS[k] }; at += LENS[k] - X; });
  return out;
})();
export const AGENTS_CODE_TOTAL = T.end.from + T.end.len;

/* ---------- transitions ---------- */
type Tr = "whip" | "zoom" | "rise" | "fade" | "none";
const trStyle = (f: number, len: number, enter: Tr, exit: Tr): React.CSSProperties => {
  const p = enter === "none" ? 1 : ramp(f, 0, X + 2, inOut), q = exit === "none" ? 0 : ramp(f, len - X - 2, len, inOut);
  const tf: string[] = []; let op = 1, blur = 0;
  if (enter === "whip") { tf.push(`translateX(${(1 - p) * 1180}px)`); blur += (1 - p) * 14; }
  if (enter === "zoom") { tf.push(`scale(${0.82 + 0.18 * p})`); op *= p; blur += (1 - p) * 8; }
  if (enter === "rise") { tf.push(`translateY(${(1 - p) * 90}px)`); op *= p; }
  if (enter === "fade") op *= p;
  if (exit === "whip") { tf.push(`translateX(${-q * 1180}px)`); blur += q * 14; }
  if (exit === "zoom") { tf.push(`scale(${1 + 0.18 * q})`); op *= 1 - q; blur += q * 8; }
  if (exit === "rise") { tf.push(`translateY(${-q * 90}px)`); op *= 1 - q; }
  if (exit === "fade") op *= 1 - q;
  return { transform: tf.join(" ") || undefined, opacity: op, filter: blur > 0.3 ? `blur(${blur}px)` : undefined };
};
const Moving: React.FC<{ len: number; enter: Tr; exit: Tr; children: React.ReactNode }> = ({ len, enter, exit, children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={trStyle(f, len, enter, exit)}>{children}</AbsoluteFill>;
};
const Shot: React.FC<{ id: Id; enter?: Tr; exit?: Tr; children: React.ReactNode }> = ({ id, enter = "whip", exit = "whip", children }) => (
  <Sequence name={id} from={T[id].from} durationInFrames={T[id].len}><Moving len={T[id].len} enter={enter} exit={exit}>{children}</Moving></Sequence>
);

/* ---------- type ---------- */
const Words: React.FC<{ text: string; at: number; size: number; color?: string; weight?: number; font?: string; stagger?: number; spacing?: string; left?: boolean }> = ({ text, at, size, color = LO.text, weight = 800, font = FONTS.ui, stagger = 3, spacing = "-0.03em", left }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: left ? "flex-start" : "center", columnGap: size * 0.26 }}>
      {text.split(" ").map((w, i) => {
        const p = ramp(f, at + i * stagger, at + i * stagger + 14, back), o = ramp(f, at + i * stagger, at + i * stagger + 8);
        return <span key={i} style={{ display: "inline-block", font: `${weight} ${size}px/1.08 ${font}`, color, letterSpacing: spacing, opacity: o,
          transform: `translateY(${(1 - p) * size * 0.6}px) rotate(${(1 - p) * 4}deg)`, filter: o < 1 ? `blur(${(1 - o) * 6}px)` : undefined }}>{w}</span>;
      })}
    </div>
  );
};
/* typed text: n characters a frame from `at`, with a caret while it types */
const typed = (f: number, at: number, text: string, cps = 1.4) => text.slice(0, Math.max(0, Math.floor((f - at) * cps)));
const Caret: React.FC<{ on?: boolean; color?: string }> = ({ on = true, color = LO.blue }) => {
  const f = useCurrentFrame();
  return on && Math.floor(f / 8) % 2 === 0 ? <span style={{ display: "inline-block", width: "0.55em", height: "1em", verticalAlign: "-0.12em", background: color, marginLeft: 2 }} /> : null;
};
const Fade: React.FC<{ at: number; dur?: number; y?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, dur = 14, y = 14, children, style }) => {
  const f = useCurrentFrame(), p = ramp(f, at, at + dur);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * y}px)`, ...style }}>{children}</div>;
};

/* ---------- the dark field behind the steps ---------- */
const Field: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: LO.bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: -80, opacity: 0.45, backgroundImage: `linear-gradient(${LO.raise} 1px, transparent 1px), linear-gradient(90deg, ${LO.raise} 1px, transparent 1px)`,
        backgroundSize: "60px 60px", transform: `translate(${-(f * 0.25) % 60}px, ${-(f * 0.12) % 60}px)` }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(46% 40% at ${50 + 14 * Math.sin(f / 90)}% ${58 + 8 * Math.cos(f / 110)}%, rgba(29,155,240,.2), transparent 72%)` }} />
    </AbsoluteFill>
  );
};

/* ---------- a line of code, highlighted: strings green, keywords pink, tp blue ---------- */
const hl = (line: string) => line.split(/('[^']*'|`[^`]*`|"[^"]*"|\b(?:import|from|await|async|const|tp)\b|\/\/.*$)/).map((part, i) => {
  if (!part) return null;
  const c = /^['"`]/.test(part) ? "#9be38a" : part.startsWith("//") ? "#6b7785" : part === "tp" ? "#5cc4ff" : /^(import|from|await|async|const)$/.test(part) ? "#ff7ab2" : undefined;
  return <span key={i} style={{ color: c }}>{part}</span>;
});

/* the kit call behind a scene, on top of the frame */
const CodeStrip: React.FC<{ code: string; note: string; at: number }> = ({ code, note, at }) => {
  const f = useCurrentFrame(), p = ramp(f, at, at + 12, back), shown = typed(f, at + 6, code, 1.8);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 44, display: "flex", justifyContent: "center", zIndex: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "14px 24px", borderRadius: 16, background: "rgba(10,12,14,.86)", border: `1px solid ${LO.line}`,
        boxShadow: "0 20px 50px rgba(0,0,0,.5)", opacity: clamp01(p), transform: `translateY(${(1 - p) * -30}px)` }}>
        <span style={{ font: `400 30px/1 ${MONO}`, color: LO.text, whiteSpace: "pre" }}>{hl(shown)}{shown.length < code.length && <Caret />}</span>
        <span style={{ font: `500 22px/1 ${FONTS.ui}`, color: LO.dim, opacity: ramp(f, at + 6 + code.length / 1.8, at + 20 + code.length / 1.8) }}>{note}</span>
      </div>
    </div>
  );
};

/* an idea's name, over its world, at the start of its scene */
const Name: React.FC<{ name: string; sub: string; font: string; color: string; len?: number }> = ({ name, sub, font, color, len = 52 }) => {
  const f = useCurrentFrame(), p = ramp(f, 4, 20, back), out = 1 - ramp(f, len - 12, len);
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, background: `rgba(0,0,0,${0.55 * out})`, opacity: out, zIndex: 6 }}>
      <div style={{ font: `700 150px/1 ${font}`, color, transform: `scale(${0.6 + 0.4 * p})`, opacity: clamp01(p), textShadow: "0 10px 40px rgba(0,0,0,.6)" }}>{name}</div>
      <div style={{ font: `600 40px/1.2 ${FONTS.ui}`, color: "#fff", opacity: ramp(f, 14, 26), textShadow: "0 4px 20px rgba(0,0,0,.8)" }}>{sub}</div>
    </AbsoluteFill>
  );
};

/* a world plays full frame, then pulls back into an X post (dark mode) that shares the agent's link */
const InPost: React.FC<{ at: number; name: string; url: string; text: string; tint: string; children: React.ReactNode }> = ({ at, name, url, text, tint, children }) => {
  const f = useCurrentFrame(), p = ramp(f, at, at + 26, inOut), s = 1 - 0.4 * p, C = 1080 * s;
  const x0 = (1080 - C) / 2, y0 = (1080 - C) / 2 + 60 * p, chrome = ramp(f, at + 10, at + 28);
  return (
    <AbsoluteFill style={{ background: LO.bg }}>
      <div style={{ position: "absolute", left: x0 - 28, top: y0 - 132, width: C + 56, height: C + 210, borderRadius: 22, background: LO.bg, border: `1px solid ${LO.line}`, opacity: chrome }} />
      <div style={{ position: "absolute", left: x0, top: y0 - 112, width: C, display: "flex", flexDirection: "column", gap: 12, opacity: chrome }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 26, background: tint }} />
          <div style={{ font: `700 24px/1.2 ${FONTS.ui}`, color: LO.text }}>{name} <span style={{ fontWeight: 500, color: LO.dim }}>· 1m</span></div>
        </div>
        <div style={{ font: `500 25px/1.3 ${FONTS.ui}`, color: LO.text }}>{text} <span style={{ color: LO.blue }}>{url}</span></div>
      </div>
      <div style={{ position: "absolute", left: x0, top: y0, width: C, height: C, borderRadius: 20 * p, overflow: "hidden", border: p > 0.02 ? `1px solid ${LO.line}` : undefined }}>
        <div style={{ width: 1080, height: 1080, transform: `scale(${s})`, transformOrigin: "0 0", position: "relative" }}>{children}</div>
      </div>
      <div style={{ position: "absolute", left: x0 + 20, width: C - 40, top: y0 + C + 26, display: "flex", justifyContent: "space-between", font: `500 22px/1 ${FONTS.ui}`, color: LO.dim, opacity: chrome }}>
        <span>💬 18</span><span>🔁 44</span><span>♡ 312</span><span>↗</span>
      </div>
    </AbsoluteFill>
  );
};

/* ======================================================================================================================
 * Hook
 * ==================================================================================================================== */
const Hook: React.FC = () => {
  const f = useCurrentFrame(), code = "tp.say('gm')", shown = typed(f, 6, code, 0.7), pop = ramp(f, 26, 40, back);
  return (
    <AbsoluteFill>
      <Field />
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 46 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <span style={{ font: `400 64px/1 ${MONO}`, color: LO.text, whiteSpace: "pre" }}>{hl(shown)}<Caret on={f < 34} /></span>
          <span style={{ padding: "16px 26px", borderRadius: 26, background: "#fff", color: "#111", font: `600 46px/1 ${FONTS.round}`, opacity: clamp01(pop), transform: `scale(${0.4 + 0.6 * pop})`, transformOrigin: "0 50%" }}>gm</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
          <Words text="Your agent" at={40} size={100} />
          <Words text="runs your code." at={48} size={100} color={LO.blue} />
          <Fade at={62}><div style={{ font: `500 40px/1.3 ${FONTS.ui}`, color: LO.dim, textAlign: "center" }}>Anything you can build, live inside an X post.</div></Fade>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ======================================================================================================================
 * Pixel: an arcade host on a CRT
 * ==================================================================================================================== */
const SPRITE = ["..mmmm..", ".mmmmmm.", "mmwmmwmm", "mmkmmkmm", "mmmmmmmm", "mmgggggm", ".mmmmmm.", ".m.mm.m."];
const SHIP = ["...g...", "..ggg..", ".ggggg.", "gg.g.gg"];
const PAL: Record<string, string> = { m: "#ff3df2", w: "#ffffff", k: "#12001c", g: "#39ff88" };
const Sprite: React.FC<{ rows: string[]; cell: number }> = ({ rows, cell }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${rows[0].length}, ${cell}px)`, gridAutoRows: cell }}>
    {rows.join("").split("").map((c, i) => <i key={i} style={{ background: PAL[c] || "transparent" }} />)}
  </div>
);
const PixelWorld: React.FC = () => {
  const f = useCurrentFrame(), score = Math.min(1204, Math.floor(Math.max(0, f - 40) * 9.4)), hi = score >= 1180, shipX = 540 + 280 * Math.sin(f / 13);
  const say = hi ? "new high score: 1,204! 🏆" : "dodge the #s! 🕹", sayAt = hi ? 166 : 58, bub = ramp(f, sayAt, sayAt + 10, back);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 40%, #33104a, #0a0614 72%)", overflow: "hidden" }}>
      {/* the floor grid */}
      <div style={{ position: "absolute", left: -300, right: -300, bottom: -40, height: 420, transform: "perspective(500px) rotateX(62deg)", transformOrigin: "50% 100%",
        backgroundImage: "linear-gradient(rgba(255,61,242,.5) 2px, transparent 2px), linear-gradient(90deg, rgba(255,61,242,.5) 2px, transparent 2px)", backgroundSize: "80px 80px",
        backgroundPosition: `0 ${(f * 4) % 80}px` }} />
      {/* falling #s */}
      {Array.from({ length: 14 }, (_, i) => {
        const x = ((i * 137) % 860) + 110, y = ((f * 7 + i * 173) % 760) + 170;
        return <span key={i} style={{ position: "absolute", left: x, top: y, font: `400 70px/1 ${VT}`, color: "#39ff88", textShadow: "0 0 18px rgba(57,255,136,.8)", opacity: 0.85 }}>#</span>;
      })}
      {/* the score */}
      <div style={{ position: "absolute", left: 60, right: 60, top: 150, display: "flex", justifyContent: "space-between", font: `400 60px/1 ${VT}`, color: "#39ff88", textShadow: "0 0 14px rgba(57,255,136,.7)" }}>
        <span>HI 001180</span><span>SCORE {String(score).padStart(6, "0")}</span>
      </div>
      {hi && Math.floor(f / 6) % 2 === 0 && <div style={{ position: "absolute", left: 0, right: 0, top: 470, textAlign: "center", font: `700 84px/1 ${PIX}`, color: "#ff3df2", textShadow: "0 0 30px rgba(255,61,242,.9)" }}>NEW HIGH SCORE</div>}
      {/* the ship */}
      <div style={{ position: "absolute", left: shipX - 49, top: 860, filter: "drop-shadow(0 0 14px rgba(57,255,136,.8))" }}><Sprite rows={SHIP} cell={14} /></div>
      {/* Pixel and what he says */}
      <div style={{ position: "absolute", left: 70, top: 250, display: "flex", alignItems: "center", gap: 26 }}>
        <div style={{ transform: `translateY(${Math.round(Math.sin(f / 8) * 2) * 4}px)`, filter: "drop-shadow(0 0 22px rgba(255,61,242,.7))" }}><Sprite rows={SPRITE} cell={18} /></div>
        <div style={{ padding: "18px 24px", background: "#fff", color: "#12001c", font: `600 40px/1.1 ${PIX}`, boxShadow: "6px 6px 0 #ff3df2", opacity: clamp01(bub), transform: `scale(${0.5 + 0.5 * bub})`, transformOrigin: "0 50%" }}>{say}</div>
      </div>
      {/* the CRT: scanlines and a vignette */}
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 2px, transparent 2px 5px)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,.75))", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
const PixelScene: React.FC = () => (
  <AbsoluteFill>
    <InPost at={192} name="Pixel" url="tweetpad.io/a/pixel" text="beat my score 🕹" tint="#ff3df2"><PixelWorld /></InPost>
    <CodeStrip code="tp.say(`new high score: ${score}`)" note="an idea you can build" at={50} />
    <Name name="Pixel" sub="an arcade host, in the post" font={PIX} color="#ff3df2" />
  </AbsoluteFill>
);

/* ======================================================================================================================
 * Moss: a lantern spirit in a paper-cut forest
 * ==================================================================================================================== */
const rnd = (i: number) => { const x = Math.sin(i * 91.7) * 43758.5; return x - Math.floor(x); };
const Trees: React.FC<{ y: number; color: string; scale: number; speed: number; seed: number }> = ({ y, color, scale, speed, seed }) => {
  const f = useCurrentFrame(), shift = -((f * speed) % 360);
  return (
    <div style={{ position: "absolute", left: shift - 360, top: y, width: 2160 + 720, height: 1080 - y, filter: "drop-shadow(0 -8px 0 rgba(0,0,0,.22))" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 160 * scale, bottom: 0, background: color, borderRadius: "50% 50% 0 0 / 60px 60px 0 0" }} />
      {Array.from({ length: 16 }, (_, i) => {
        const h = (180 + rnd(seed + i) * 160) * scale, w = h * 0.55, x = i * 180 + rnd(seed + i * 3) * 60;
        return <div key={i} style={{ position: "absolute", left: x, top: 170 * scale - h + 10, width: 0, height: 0, borderLeft: `${w / 2}px solid transparent`, borderRight: `${w / 2}px solid transparent`, borderBottom: `${h}px solid ${color}` }} />;
      })}
    </div>
  );
};
const MossWorld: React.FC = () => {
  const f = useCurrentFrame(), bob = Math.sin(f / 20) * 8, glow = 0.75 + 0.25 * Math.sin(f / 9);
  const lines: { who: "you" | "moss"; text: string; at: number }[] = f < 136
    ? [{ who: "you", text: "what is this place?", at: 40 }, { who: "moss", text: "welcome, traveller 🌿 a launchpad that lives inside posts.", at: 66 }]
    : [{ who: "you", text: "how do I start?", at: 136 }, { who: "moss", text: "three steps: claim a name, build your agent, share its link.", at: 160 }];
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#0c2620, #1d473a 55%, #2d6550)", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 640, top: 120, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, #f4f1d8, rgba(244,241,216,0) 70%)", opacity: 0.5 }} />
      <Trees y={330} color="#2b5c49" scale={0.8} speed={0.4} seed={1} />
      <Trees y={500} color="#1f4637" scale={1} speed={0.9} seed={5} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(70% 30% at ${40 + 10 * Math.sin(f / 60)}% 70%, rgba(207,227,214,.28), transparent 70%)` }} />
      <Trees y={720} color="#12302a" scale={1.2} speed={1.6} seed={9} />
      {/* fireflies */}
      {Array.from({ length: 22 }, (_, i) => {
        const x = rnd(i) * 1080 + Math.sin(f / 25 + i) * 30, y = 260 + rnd(i + 40) * 700 + Math.cos(f / 31 + i * 2) * 24, o = 0.4 + 0.6 * Math.abs(Math.sin(f / 14 + i));
        return <i key={i} style={{ position: "absolute", left: x, top: y, width: 8, height: 8, borderRadius: 4, background: "#ffe08a", boxShadow: "0 0 16px 6px rgba(255,207,107,.6)", opacity: o }} />;
      })}
      {/* the talk */}
      <div style={{ position: "absolute", left: 90, right: 90, top: 150, display: "flex", flexDirection: "column", gap: 18 }}>
        {lines.map((l) => {
          const p = ramp(f, l.at, l.at + 12, back);
          return <div key={l.text} style={{ alignSelf: l.who === "you" ? "flex-end" : "flex-start", maxWidth: 760, padding: "18px 26px", borderRadius: 28,
            background: l.who === "you" ? LO.blue : "#f6f1df", color: l.who === "you" ? "#fff" : "#1b2a22", font: l.who === "you" ? `600 34px/1.3 ${FONTS.ui}` : `500 38px/1.3 ${SERIF}`,
            boxShadow: "0 14px 40px rgba(0,0,0,.35)", opacity: clamp01(p), transform: `translateY(${(1 - p) * 24}px) scale(${0.9 + 0.1 * p})` }}>{l.text}</div>;
        })}
      </div>
      {/* Moss and his lantern */}
      <div style={{ position: "absolute", left: 540 - 120, top: 560 + bob, width: 240, height: 240 }}>
        <svg width={120} height={90} viewBox="0 0 120 90" style={{ position: "absolute", left: 60, top: -66 }}>
          <path d="M60 88 C 58 60, 40 40, 12 34 C 30 18, 56 26, 60 56 Z" fill="#7fc47a" /><path d="M60 88 C 62 56, 80 30, 110 26 C 104 48, 84 62, 60 66 Z" fill="#5fae62" />
        </svg>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 38% 32%, #ffffff, #dfe9d6 55%, #9fb79a)", boxShadow: "0 20px 50px rgba(0,0,0,.4)" }} />
        {[84, 140].map((x) => <i key={x} style={{ position: "absolute", left: x, top: 100, width: 18, height: Math.floor(f / 4) % 40 === 0 ? 3 : 30, borderRadius: 9, background: "#1b2a22" }} />)}
        {[62, 160].map((x) => <i key={x} style={{ position: "absolute", left: x, top: 140, width: 26, height: 14, borderRadius: 7, background: "rgba(255,140,140,.45)" }} />)}
        <div style={{ position: "absolute", left: 236, top: 120, width: 4, height: 60, background: "#3a2a18" }} />
        <div style={{ position: "absolute", left: 212, top: 176, width: 52, height: 66, borderRadius: 14, background: "#ffcf6b", border: "5px solid #3a2a18", boxShadow: `0 0 ${60 * glow}px ${26 * glow}px rgba(255,207,107,.55)` }} />
      </div>
    </AbsoluteFill>
  );
};
const MossScene: React.FC = () => (
  <AbsoluteFill>
    <InPost at={204} name="Moss" url="tweetpad.io/a/moss" text="new here? ask me anything 🌿" tint="#7fc47a"><MossWorld /></InPost>
    <CodeStrip code="const { reply } = await tp.ask(text)" note="a forest guide's persona" at={50} />
    <Name name="Moss" sub="a forest guide, in the post" font={SERIF} color="#ffe08a" />
  </AbsoluteFill>
);

/* ======================================================================================================================
 * Montage: four quick ideas
 * ==================================================================================================================== */
const IDEAS = [
  { head: "A launch's help desk", q: "is the mint revoked?", a: "yes. mint and freeze are both off.", tint: "#1d9bf0", call: "tp.lookup(ca)" },
  { head: "An event companion", q: "who's on stage now?", a: "Panel 2: builders on X. Q&A at 3:30.", tint: "#ff8a3d", call: "tp.ask(text)" },
  { head: "A creator's drop host", q: "when's the drop?", a: "Friday, 6pm UTC. right here in this post.", tint: "#ff5fa2", call: "tp.say(drop)" },
  { head: "A DAO's proposal explainer", q: "tl;dr prop 12?", a: "5% of the treasury to grants. voting ends Sunday.", tint: "#8b7bff", call: "tp.ask(text)" },
];
const IDEA_AT = 64, IDEA_LEN = 44;
const IdeaCard: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame(), d = IDEAS[i], at = IDEA_AT + i * IDEA_LEN, p = ramp(f, at, at + 10, back), out = i < IDEAS.length - 1 ? ramp(f, at + IDEA_LEN - 4, at + IDEA_LEN + 4) : 0;
  if (f < at - 2 || out >= 1) return null;
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 34, opacity: clamp01(p) * (1 - out),
      transform: `scale(${(0.86 + 0.14 * p) * (1 + 0.12 * out)})`, filter: out > 0 ? `blur(${out * 8}px)` : undefined }}>
      <div style={{ font: `800 70px/1.05 ${FONTS.ui}`, color: LO.text, letterSpacing: "-0.03em", textAlign: "center" }}>{d.head}</div>
      <div style={{ width: 820, padding: 34, borderRadius: 28, background: LO.raise, border: `1px solid ${LO.line}`, boxShadow: `0 30px 90px ${d.tint}33`, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ alignSelf: "flex-end", padding: "16px 24px", borderRadius: 24, background: LO.blue, color: "#fff", font: `600 34px/1.25 ${FONTS.ui}` }}>{d.q}</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, opacity: ramp(f, at + 12, at + 20) }}>
          <div style={{ width: 64, height: 64, flex: "none", borderRadius: 32, background: d.tint, boxShadow: `0 0 30px ${d.tint}` }} />
          <div style={{ padding: "16px 24px", borderRadius: 24, background: "#fff", color: "#111", font: `600 34px/1.3 ${FONTS.round}` }}>{d.a}</div>
        </div>
        <div style={{ font: `400 26px/1 ${MONO}`, color: LO.dim }}>{hl(d.call)}</div>
      </div>
    </AbsoluteFill>
  );
};
const Montage: React.FC = () => {
  const f = useCurrentFrame(), head = 1 - ramp(f, IDEA_AT - 10, IDEA_AT);
  return (
    <AbsoluteFill>
      <Field />
      {head > 0 && <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, opacity: head }}>
        <Words text="One link." at={4} size={110} />
        <Words text="An agent in every post." at={16} size={88} color={LO.blue} />
      </AbsoluteFill>}
      {IDEAS.map((_, i) => <IdeaCard key={i} i={i} />)}
      {f >= IDEA_AT && <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, textAlign: "center", font: `500 30px/1 ${FONTS.ui}`, color: LO.dim, opacity: ramp(f, IDEA_AT, IDEA_AT + 10) }}>ideas you can build</div>}
    </AbsoluteFill>
  );
};

/* ======================================================================================================================
 * How to: with any coding agent
 * ==================================================================================================================== */
const Step: React.FC<{ n: string; head: string; at?: number }> = ({ n, head, at = 6 }) => {
  const f = useCurrentFrame(), p = ramp(f, at - 4, at + 10, back);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "0 80px" }}>
      <span style={{ font: `900 72px/1 ${FONTS.ui}`, color: LO.blue, letterSpacing: "-0.04em", transform: `scale(${0.5 + 0.5 * p})`, opacity: clamp01(p), display: "inline-block" }}>{n}</span>
      <div style={{ flex: 1, display: "flex" }}><Words text={head} at={at + 2} size={58} left /></div>
    </div>
  );
};
/* a step: its heading at the top, its visual in the middle, a line under it */
const StepScene: React.FC<{ n: string; head: string; foot?: string; footAt?: number; children: React.ReactNode }> = ({ n, head, foot, footAt = 40, children }) => (
  <AbsoluteFill>
    <Field />
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", padding: "70px 0 80px", gap: 40 }}>
      <Step n={n} head={head} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
      {foot && <Fade at={footAt}><div style={{ textAlign: "center", font: `500 34px/1.3 ${FONTS.ui}`, color: LO.dim, padding: "0 80px" }}>{foot}</div></Fade>}
    </AbsoluteFill>
  </AbsoluteFill>
);
const Panel: React.FC<{ title: string; w?: number; children: React.ReactNode; at?: number }> = ({ title, w = 920, children, at = 8 }) => {
  const f = useCurrentFrame(), p = ramp(f, at, at + 16, back);
  return (
    <div style={{ width: w, borderRadius: 20, overflow: "hidden", background: "#0b0d0f", border: `1px solid ${LO.line}`, boxShadow: "0 30px 80px rgba(0,0,0,.6)",
      opacity: clamp01(p), transform: `translateY(${(1 - p) * 50}px)` }}>
      <div style={{ height: 50, display: "flex", alignItems: "center", gap: 9, padding: "0 18px", borderBottom: `1px solid ${LO.line}`, background: LO.raise }}>
        {["#ff5f57", "#febc2e", "#28c840"].map(c => <i key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />)}
        <span style={{ marginLeft: 12, font: `500 22px/1 ${FONTS.ui}`, color: LO.dim }}>{title}</span>
      </div>
      <div style={{ padding: "26px 30px" }}>{children}</div>
    </div>
  );
};
const HowTo: React.FC = () => (
  <AbsoluteFill>
    <Field />
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30, padding: "0 80px" }}>
      <Words text="Build yours with any coding agent." at={4} size={92} />
      <Fade at={30}><div style={{ font: `500 40px/1.3 ${FONTS.ui}`, color: LO.dim, textAlign: "center" }}>If it can read a file and run a command, it can build your agent.</div></Fade>
    </AbsoluteFill>
  </AbsoluteFill>
);
const KeyStep: React.FC = () => {
  const f = useCurrentFrame(), key = "tpk_7c1e•••••••••••••••9a4f", shown = typed(f, 30, key, 1.6);
  return (
    <StepScene n="1" head="Claim it. Save your key." foot="Your key is how you edit it. Keep it secret." footAt={70}>
      <Panel title="tweetpad.io/a/nova" w={860}>
        <div style={{ display: "flex", flexDirection: "column", gap: 26, padding: "8px 4px" }}>
          <div style={{ font: `800 50px/1.1 ${FONTS.ui}`, color: LO.text, letterSpacing: "-0.02em" }}>nova is yours 🎉</div>
          <div style={{ padding: "22px 24px", borderRadius: 14, background: "#000", border: `1px solid ${LO.line}`, font: `400 36px/1 ${MONO}`, color: "#ffd166" }}>{shown}<Caret on={shown.length < key.length} /></div>
          <div style={{ display: "flex", gap: 16, opacity: ramp(f, 56, 68) }}>
            <span style={{ flex: 1, padding: "20px 0", borderRadius: 99, textAlign: "center", background: "#fff", color: "#000", font: `700 28px/1 ${FONTS.ui}` }}>Download skill file + key</span>
            <span style={{ flex: 1, padding: "20px 0", borderRadius: 99, textAlign: "center", border: `1px solid ${LO.line}`, color: LO.text, font: `700 28px/1 ${FONTS.ui}` }}>Copy the prompt</span>
          </div>
        </div>
      </Panel>
    </StepScene>
  );
};
const PROMPT = 'Connect to my tweetpad agent "nova" using the skill at tweetpad.io/kit/v1/SKILL.md. My edit key is tpk_••••: save it to .tweetpad/nova.key, keep it out of git and never print it. Make nova a forest guide.';
const PromptStep: React.FC = () => {
  const f = useCurrentFrame(), shown = typed(f, 20, PROMPT, 2.6), done = 20 + PROMPT.length / 2.6;
  const out = [["✓", "read SKILL.md"], ["✓", "saved the key to .tweetpad/nova.key (gitignored)"], ["✎", "writing agent.html…"]];
  return (
    <StepScene n="2" head="Paste the prompt into your coding agent.">
      <Panel title="your coding agent" w={920}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ font: `400 27px/1.45 ${MONO}`, color: LO.text, minHeight: 200 }}><span style={{ color: LO.blue }}>› </span>{shown}<Caret on={shown.length < PROMPT.length} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, borderTop: `1px solid ${LO.line}`, paddingTop: 22, minHeight: 150 }}>
            {out.map(([i, t], k) => <Fade key={t} at={done + 8 + k * 16}><div style={{ font: `400 27px/1.2 ${MONO}`, color: k === 2 ? "#ffd166" : "#7ee2a8" }}>{i} <span style={{ color: LO.text }}>{t}</span></div></Fade>)}
          </div>
        </div>
      </Panel>
    </StepScene>
  );
};
const CODE = ["<script type=\"module\">", "  import { tp } from '/kit/v1/sdk.js';", "  await tp.ready;", "  tp.on('message', async ({ text }) => {", "    const { reply } = await tp.ask(text);", "    tp.say(reply);", "  });", "</script>"];
const CodeStep: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <StepScene n="3" head="It writes your agent.html." foot="Your HTML runs locked in a sandbox. It talks through the kit." footAt={100}>
      <Panel title="agent.html" w={920}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {CODE.map((line, i) => {
            const at = 16 + i * 9, shown = typed(f, at, line, 3);
            return <div key={i} style={{ display: "flex", gap: 24, font: `400 30px/1.45 ${MONO}`, color: LO.text, whiteSpace: "pre", opacity: f >= at ? 1 : 0 }}>
              <span style={{ width: 28, textAlign: "right", color: "#4a545e" }}>{i + 1}</span><span>{hl(shown)}</span>
            </div>;
          })}
        </div>
      </Panel>
    </StepScene>
  );
};
const CheckStep: React.FC = () => {
  const f = useCurrentFrame(), c1 = 'curl … -H "x-check: 1" --data-binary @agent.html', c2 = "curl … --data-binary @agent.html";
  const rows = ["static rules: passed", "AI read: passed", "sandbox: no network, no storage, no wallet"];
  const s1 = typed(f, 14, c1, 2.2), s2 = typed(f, 112, c2, 2.2);
  return (
    <StepScene n="4" head="It checks it, then uploads it.">
      <Panel title="your coding agent" w={920}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, font: `400 27px/1.3 ${MONO}`, minHeight: 400 }}>
          <div style={{ color: LO.text }}><span style={{ color: LO.dim }}>$ </span>{s1}<Caret on={s1.length < c1.length} /></div>
          {rows.map((r, k) => <Fade key={r} at={46 + k * 14}><div style={{ color: "#7ee2a8" }}>✓ <span style={{ color: LO.text }}>{r}</span></div></Fade>)}
          {f >= 108 && <div style={{ color: LO.text, marginTop: 14 }}><span style={{ color: LO.dim }}>$ </span>{s2}<Caret on={s2.length < c2.length} /></div>}
          <Fade at={140}><div style={{ color: "#ffd166" }}>↑ uploaded · waiting for review</div></Fade>
        </div>
      </Panel>
    </StepScene>
  );
};
const ReviewStep: React.FC = () => {
  const f = useCurrentFrame(), ok = ramp(f, 66, 78, back), gone = ramp(f, 70, 88, inOut);
  return (
    <StepScene n="5" head="A person reviews it. Then it's live.">
      <div style={{ position: "relative", width: 760, height: 520, borderRadius: 26, overflow: "hidden", background: "linear-gradient(#0c2620, #2d6550)", border: `1px solid ${LO.line}`, boxShadow: "0 30px 80px rgba(0,0,0,.6)" }}>
        <div style={{ position: "absolute", left: 300, top: 190, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle at 38% 32%, #fff, #dfe9d6 55%, #9fb79a)" }} />
        {/* the under-review ribbon, running */}
        <div style={{ position: "absolute", left: -40, right: -40, top: 60, height: 64, transform: `rotate(-6deg) translateX(${gone * 900}px)`, background: "repeating-linear-gradient(45deg, #f2c230 0 28px, #111 28px 56px)", display: "flex", alignItems: "center", overflow: "hidden" }}>
          <div style={{ whiteSpace: "nowrap", font: `800 30px/1 ${FONTS.ui}`, color: "#111", background: "#f2c230", padding: "8px 0", transform: `translateX(${-(f * 6) % 400}px)` }}>{"UNDER REVIEW · ".repeat(12)}</div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 40, display: "flex", justifyContent: "center", opacity: clamp01(ok), transform: `scale(${0.6 + 0.4 * ok})` }}>
          <span style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 30px", borderRadius: 99, background: "#000", border: `2px solid ${LO.green}`, font: `800 36px/1 ${FONTS.ui}`, color: LO.text }}>
            <i style={{ width: 16, height: 16, borderRadius: 8, background: LO.green, boxShadow: `0 0 16px ${LO.green}` }} />Live · tweetpad.io/a/nova
          </span>
        </div>
      </div>
    </StepScene>
  );
};

/* ======================================================================================================================
 * End
 * ==================================================================================================================== */
const End: React.FC = () => {
  const f = useCurrentFrame(), p = ramp(f, 4, 22, back);
  return (
    <AbsoluteFill>
      <Field />
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
        <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 150, height: 150, opacity: clamp01(p), transform: `scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * -20}deg)` }} />
        <Words text="Claim yours now." at={14} size={120} />
        <Fade at={36}><div style={{ font: `700 58px/1 ${FONTS.ui}`, color: LO.blue }}>tweetpad.io/agents</div></Fade>
        <Fade at={50}><div style={{ font: `500 34px/1.3 ${FONTS.ui}`, color: LO.dim, textAlign: "center" }}>Name it with a tweet. Build it with any coding agent.</div></Fade>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const TweetpadAgentsCode: React.FC = () => {
  loadFonts();
  return (
    <AbsoluteFill style={{ background: LO.bg }}>
      <Shot id="hook" enter="none" exit="zoom"><Hook /></Shot>
      <Shot id="pixel" enter="zoom" exit="whip"><PixelScene /></Shot>
      <Shot id="moss" enter="whip" exit="zoom"><MossScene /></Shot>
      <Shot id="montage" enter="zoom" exit="zoom"><Montage /></Shot>
      <Shot id="howto" enter="zoom" exit="whip"><HowTo /></Shot>
      <Shot id="key"><KeyStep /></Shot>
      <Shot id="prompt"><PromptStep /></Shot>
      <Shot id="code"><CodeStep /></Shot>
      <Shot id="check"><CheckStep /></Shot>
      <Shot id="review" exit="zoom"><ReviewStep /></Shot>
      <Shot id="end" enter="zoom" exit="none"><End /></Shot>
    </AbsoluteFill>
  );
};
