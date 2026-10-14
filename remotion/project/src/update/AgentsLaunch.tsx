/**
 * TweetpadAgentsLaunch: tweetpad agents, as a new channel on the Menu. 1080x1080 @30, 80 s. A second cut of the agents film
 * (AgentsWalkthrough.tsx stays as it is), more dynamic and built around the two promises: bring your own code, anyone can run it.
 *   Menu    the tweetpad Menu (MenuTour's glass tiles and dock) with a new Agents channel; the Wii hand opens it, and the channel
 *           grows from its tile to the whole frame (the way index.html's open() does)
 *   Title   "Your AI agent. In every post." in kinetic type
 *   01      Claim it with a tweet (the /agents page, then a claim's three steps)
 *   02      Bring your own code (a coding agent's skill file and prompt, then the safety check and the review)
 *   03      Anyone can run it (Dot researching $WIF in his browser, then Top up)
 *   Case    Bauls, as a case study in Bordrless's paper look: the brief, the build (lines from his real file), the checks, and
 *           him live, on his page and inside a post
 *   Outro   back to the Menu, "Claim yours"
 * Every screen is a real recording of the live pages (public/agents/*.mp4). Transitions are drawn here: whip pans with motion
 * blur between recordings, zoom punches between parts, a circular paper wipe into the case study.
 * CLAIMS: agents are AI agents; "Runs on Grok" in text only, no logos, no partnership; Bauls's hooks are "coming soon on
 * bordrless.app", nothing more; no price talk; the X post is a mock-up and says nothing it shouldn't.
 */
import React from "react";
import { AbsoluteFill, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { FONTS } from "../brand/tokens";
import { Cursor, cursorAt } from "../components/Film";
import { Dock, STRIPES, Tile, TileDef, tileRect, TPB } from "./MenuTour";

const LO = { bg: "#000", raise: "#16181c", line: "#2f3336", text: "#e7e9ea", dim: "#8b98a5", blue: "#1d9bf0", green: "#00ba7c" } as const;
const PAPER = { bg: "#e3e3df", card: "#fafaf8", ink: "#111", dim: "#4a4a46", chip: "#cfcfca", blue: "#1f3cff", yellow: "#f2c230" } as const;
const ANTON = '"Anton", Impact, sans-serif', MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace', GROTESK = '"Space Grotesk", "Inter", sans-serif';
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const outCubic = (x: number) => 1 - (1 - clamp01(x)) ** 3;
const inOut = (x: number) => { const t = clamp01(x); return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; };
const back = (x: number) => { const t = clamp01(x), c = 1.6; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
const ramp = (f: number, a: number, b: number, e: (x: number) => number = outCubic) => e((f - a) / (b - a));

/* ---------- the timeline, in frames ---------- */
const X = 12;   // the overlap, in frames, where one shot whips into the next
const T = {
  menu: { from: 0, len: 150 }, title: { from: 104, len: 166 },
  claim: { from: 258, len: 270 }, code: { from: 516, len: 492 }, run: { from: 996, len: 450 },
  caseCard: { from: 1434, len: 108 }, caseBuild: { from: 1530, len: 222 }, caseChecks: { from: 1740, len: 108 }, casePage: { from: 1836, len: 222 }, casePost: { from: 2046, len: 150 },
  outro: { from: 2184, len: 216 },
} as const;
export const AGENTS_LAUNCH_TOTAL = T.outro.from + T.outro.len;

/* ---------- transitions: how a shot comes in and goes out, from its own frame and length ---------- */
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
const Shot: React.FC<{ from: number; len: number; enter?: Tr; exit?: Tr; name: string; children: React.ReactNode }> = ({ from, len, enter = "whip", exit = "whip", name, children }) => (
  <Sequence name={name} from={from} durationInFrames={len}><Moving len={len} enter={enter} exit={exit}>{children}</Moving></Sequence>
);
const Moving: React.FC<{ len: number; enter: Tr; exit: Tr; children: React.ReactNode }> = ({ len, enter, exit, children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={trStyle(f, len, enter, exit)}>{children}</AbsoluteFill>;
};

/* ---------- words that land one after another ---------- */
const Words: React.FC<{ text: string; at: number; size: number; color?: string; weight?: number; font?: string; gap?: number; stagger?: number; spacing?: string; left?: boolean }> = ({ text, at, size, color = LO.text, weight = 800, font = FONTS.ui, gap = 0.26, stagger = 3, spacing = "-0.03em", left }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: left ? "flex-start" : "center", columnGap: size * gap }}>
      {text.split(" ").map((w, i) => {
        const p = ramp(f, at + i * stagger, at + i * stagger + 14, back), o = ramp(f, at + i * stagger, at + i * stagger + 8);
        return <span key={i} style={{ display: "inline-block", font: `${weight} ${size}px/1.05 ${font}`, color, letterSpacing: spacing, opacity: o,
          transform: `translateY(${(1 - p) * size * 0.6}px) rotate(${(1 - p) * 4}deg)`, filter: o < 1 ? `blur(${(1 - o) * 6}px)` : undefined }}>{w}</span>;
      })}
    </div>
  );
};

/* ---------- the dark field behind the steps: a slow grid and a blue glow that drifts ---------- */
const Field: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: LO.bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: -80, opacity: 0.45, backgroundImage: `linear-gradient(${LO.raise} 1px, transparent 1px), linear-gradient(90deg, ${LO.raise} 1px, transparent 1px)`,
        backgroundSize: "60px 60px", transform: `translate(${-(f * 0.25) % 60}px, ${-(f * 0.12) % 60}px)` }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(46% 40% at ${50 + 14 * Math.sin(f / 90)}% ${58 + 8 * Math.cos(f / 110)}%, rgba(29,155,240,.22), transparent 72%)` }} />
    </AbsoluteFill>
  );
};

/* ---------- a recording in a browser window ---------- */
const Rec: React.FC<{ clip: string; from: number; w?: number; h?: number }> = ({ clip, from, w = 920, h = 754 }) => (
  <OffthreadVideo src={staticFile(`agents/${clip}.mp4`)} startFrom={Math.round(from * 30)} muted style={{ width: w, height: h, display: "block" }} />
);
const Window: React.FC<{ url: string; light?: boolean; top?: number; children: React.ReactNode }> = ({ url, light, top = 250, children }) => (
  <div style={{ position: "absolute", left: 80, top, width: 920, borderRadius: light ? 4 : 18, overflow: "hidden", background: light ? PAPER.card : LO.raise,
    border: light ? `2px solid ${PAPER.ink}` : `1px solid ${LO.line}`, boxShadow: light ? `8px 8px 0 ${PAPER.ink}` : "0 30px 80px rgba(0,0,0,.6)" }}>
    <div style={{ height: 44, display: "flex", alignItems: "center", gap: 8, padding: "0 16px", borderBottom: `1px solid ${light ? PAPER.ink : LO.line}` }}>
      {["#ff5f57", "#febc2e", "#28c840"].map(c => <i key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />)}
      <span style={{ marginLeft: 14, flex: 1, height: 28, borderRadius: light ? 0 : 9, background: light ? "#fff" : "#0f1011", border: light ? `1.5px solid ${PAPER.ink}` : undefined,
        display: "flex", alignItems: "center", padding: "0 12px", font: `500 16px/1 ${light ? MONO : FONTS.ui}`, color: light ? PAPER.ink : "#c9cdd2" }}>{url}</span>
    </div>
    {children}
  </div>
);

/* ---------- a step's heading: its number, then its words ---------- */
const Step: React.FC<{ n: string; head: string; sub: string; at?: number }> = ({ n, head, sub, at = 6 }) => {
  const f = useCurrentFrame(), p = ramp(f, at - 4, at + 10, back), s = ramp(f, at + 14, at + 28);
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top: 46, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <span style={{ font: `900 64px/1 ${FONTS.ui}`, color: LO.blue, letterSpacing: "-0.04em", transform: `scale(${0.5 + 0.5 * p})`, opacity: clamp01(p), display: "inline-block" }}>{n}</span>
        <div style={{ flex: 1, display: "flex" }}><Words text={head} at={at + 2} size={52} left /></div>
      </div>
      <div style={{ font: `500 25px/1.35 ${FONTS.ui}`, color: LO.dim, opacity: s, transform: `translateY(${(1 - s) * 12}px)` }}>{sub}</div>
    </div>
  );
};

/* ======================================================================================================================
 * The Menu, with the new Agents channel, and the hand that opens it
 * ==================================================================================================================== */
const FS = 1.75, FX = (1080 - 480 * FS) / 2, FY = 176;
const TILES: TileDef[] = [
  { name: "Launch", icon: "menu/launch.svg" }, { name: "Tokens", icon: "menu/tokens.svg" }, { name: "Feed", icon: "menu/feed.svg" },
  { name: "Games", icon: "menu/games.svg" }, { name: "Agents", icon: "menu/agents.svg" }, { name: "Profile", icon: "menu/profile.svg" },
  { name: "Bordrless", icon: "menu/bordrless.png", bordr: true }, { name: "$TP", icon: "brand/tweetpad-hash-256.png" }, { name: "More", icon: "menu/more.svg" },
];
const AG = 4;
const agRect = (() => { const r = tileRect(AG); return { x: FX + r.x * FS, y: FY + r.y * FS, w: r.w * FS, h: r.h * FS }; })();
const OPEN_AT = 92, OPEN_LEN = 22;
const MenuScene: React.FC = () => {
  const f = useCurrentFrame();
  const open = ramp(f, OPEN_AT, OPEN_AT + OPEN_LEN, inOut);
  const hover = ramp(f, 66, 74);
  const pulse = 1 + 0.04 * Math.sin(f / 5) * (1 - hover) * (f > 30 ? 1 : 0);
  const hand = cursorAt(f, [[30, 1020, 980], [60, 760, 760], [80, agRect.x + agRect.w * 0.62, agRect.y + agRect.h * 0.62], [140, agRect.x + agRect.w * 0.62, agRect.y + agRect.h * 0.62]]);
  const cx = agRect.x + agRect.w / 2, cy = agRect.y + agRect.h / 2;
  const breathe = 1 + 0.06 * Math.sin((f / 40) * Math.PI * 2) ** 2;
  // the channel grows from the tile's own shape to the whole frame
  const ins = { t: agRect.y * (1 - open), r: (1080 - agRect.x - agRect.w) * (1 - open), b: (1080 - agRect.y - agRect.h) * (1 - open), l: agRect.x * (1 - open), rad: 28 * (1 - open) };
  const cap = ramp(f, 8, 26);
  return (
    <AbsoluteFill style={{ background: STRIPES }}>
      <div style={{ position: "absolute", top: 54, left: 0, right: 0, textAlign: "center", opacity: cap * (1 - open), transform: `translateY(${(1 - cap) * -20}px)` }}>
        <span style={{ font: `600 40px/1 ${FONTS.round}`, color: "#3b4146", textShadow: "0 1px 0 #fff" }}>A new channel on the Menu</span>
      </div>
      <div style={{ position: "absolute", inset: 0, transformOrigin: `${cx}px ${cy}px`, transform: `scale(${1 + 0.14 * open})`, filter: `blur(${3 * open}px)`, opacity: 1 - open * 0.6 }}>
        <div style={{ position: "absolute", left: FX, top: FY, width: 480, height: 480, transform: `scale(${FS})`, transformOrigin: "0 0" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 8, overflow: "hidden", border: "1px solid #c8c8c8", background: STRIPES, boxShadow: "0 1px 3px rgba(0,0,0,.15), 0 12px 40px rgba(0,0,0,.12)" }}>
            {TILES.map((t, i) => {
              const arrive = ramp(f, 2 + i * 3, 16 + i * 3, back);
              return <div key={t.name} style={{ position: "absolute", inset: 0, transform: i === AG ? `scale(${pulse})` : undefined, transformOrigin: `${tileRect(i).x + 72}px ${tileRect(i).y + 53}px` }}>
                <Tile t={t} r={tileRect(i)} hover={i === AG ? Math.max(hover, 0.35 + 0.35 * Math.sin(f / 6) ** 2 * (f > 30 ? 1 : 0)) : 0} arrive={arrive} />
              </div>;
            })}
            <Dock rise={ramp(f, 8, 30)} />
          </div>
        </div>
        {/* NEW, on the Agents tile */}
        <div style={{ position: "absolute", left: agRect.x + agRect.w - 52, top: agRect.y - 14, padding: "7px 12px", borderRadius: 99, background: "#ff3b5c", color: "#fff",
          font: `700 18px/1 ${FONTS.round}`, boxShadow: "0 4px 12px rgba(255,59,92,.45)", transform: `scale(${ramp(f, 34, 46, back)}) rotate(8deg)` }}>NEW</div>
      </div>
      {/* the channel opening */}
      {f >= OPEN_AT && (
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(${ins.t}px ${ins.r}px ${ins.b}px ${ins.l}px round ${ins.rad}px)`, background: "#000", display: "grid", placeItems: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(45% 40% at 50% 46%, rgba(29,155,240,.35), transparent 70%)" }} />
          <div style={{ display: "grid", placeItems: "center", gap: 18, transform: `scale(${0.6 + 0.4 * open})` }}>
            <Img src={staticFile("menu/agents.svg")} style={{ width: 210, height: 210, transform: `scale(${breathe})`, filter: "drop-shadow(0 10px 30px rgba(29,155,240,.5)) brightness(1.05)" }} />
            <span style={{ font: `600 46px/1 ${FONTS.round}`, color: "#fff" }}>Agents</span>
          </div>
        </div>
      )}
      {f >= 30 && f < OPEN_AT + 6 && <Cursor x={hand.x} y={hand.y} hand size={1.35} down={f >= 84 && f < 92} t={1 - ramp(f, OPEN_AT, OPEN_AT + 6)} />}
    </AbsoluteFill>
  );
};

/* the title, inside the opened channel */
const TitleScene: React.FC = () => {
  const f = useCurrentFrame();
  const icon = ramp(f, 10, 34, inOut), tag = ramp(f, 84, 100);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(50% 44% at 50% ${46 + 6 * icon}%, rgba(29,155,240,${0.35 - 0.1 * icon}), transparent 72%)` }} />
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26 }}>
        <Img src={staticFile("menu/agents.svg")} style={{ width: 210 - 90 * icon, height: 210 - 90 * icon, filter: "drop-shadow(0 10px 30px rgba(29,155,240,.5))" }} />
        <div style={{ opacity: ramp(f, 4, 16) * (1 - icon), height: 46 * (1 - icon), overflow: "hidden", font: `600 46px/1 ${FONTS.round}`, color: "#fff" }}>Agents</div>
        <Words text="Your AI agent." at={30} size={96} />
        <Words text="In every post." at={44} size={96} color={LO.blue} />
        <div style={{ marginTop: 18, display: "flex", gap: 14, opacity: tag, transform: `translateY(${(1 - tag) * 20}px)` }}>
          {["Bring your own code", "Anyone can run it"].map((x, i) => (
            <span key={x} style={{ padding: "14px 24px", borderRadius: 99, border: `1px solid ${i ? LO.blue : LO.line}`, background: i ? "rgba(29,155,240,.14)" : "transparent",
              font: `700 26px/1 ${FONTS.ui}`, color: LO.text, transform: `scale(${ramp(f, 86 + i * 6, 100 + i * 6, back)})` }}>{x}</span>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ======================================================================================================================
 * The steps
 * ==================================================================================================================== */
const PassStamp: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame(), p = ramp(f, at, at + 12, back);
  return (
    <div style={{ position: "absolute", right: 110, top: 300, padding: "14px 22px", border: `5px solid ${LO.green}`, borderRadius: 12, color: LO.green, background: "rgba(0,0,0,.6)",
      font: `900 44px/1 ${FONTS.ui}`, letterSpacing: "0.06em", transform: `rotate(-9deg) scale(${2.2 - 1.2 * p})`, opacity: clamp01(p * 1.4) }}>CHECKED</div>
  );
};
const Bubble: React.FC<{ text: string; at: number; x: number; y: number }> = ({ text, at, x, y }) => {
  const f = useCurrentFrame(), p = ramp(f, at, at + 12, back);
  return (
    <div style={{ position: "absolute", left: x, top: y, maxWidth: 360, padding: "16px 22px", borderRadius: 20, background: LO.blue, color: "#fff", font: `700 26px/1.25 ${FONTS.ui}`,
      boxShadow: "0 14px 40px rgba(29,155,240,.45)", transform: `scale(${p})`, transformOrigin: "0 100%", opacity: clamp01(p * 1.5) }}>{text}</div>
  );
};

/* ======================================================================================================================
 * The case study: Bauls
 * ==================================================================================================================== */
const CODE = [
  ["import { tp } from '/kit/v1/sdk.js';", "#7cc4ff"],
  ["// one body: metaballs from bauls.si's artwork", "#6b6b66"],
  ["const blob = new MarchingCubes(110, ink);", "#e7e9ea"],
  ["for (const [x, y, r, k] of BALLS) blob.addBall(…);", "#e7e9ea"],
  ["// drawn small, dithered into four greys", "#6b6b66"],
  ["float k = floor(l) + step(BAYER[i] / 16., fract(l));", "#f2c230"],
  ["tp.on('message', async ({ text }) => {", "#e7e9ea"],
  ["  const { reply } = await tp.ask(history);", "#e7e9ea"],
  ["  tp.say(reply);", "#e7e9ea"],
  ["});", "#e7e9ea"],
] as const;
const Chip: React.FC<{ children: React.ReactNode; tone?: "dark" | "blue" | "yellow" }> = ({ children, tone }) => (
  <span style={{ padding: "8px 12px", font: `700 18px/1 ${MONO}`, textTransform: "uppercase", letterSpacing: ".02em",
    background: tone === "dark" ? PAPER.ink : tone === "blue" ? PAPER.blue : tone === "yellow" ? PAPER.yellow : PAPER.chip, color: tone === "dark" || tone === "blue" ? "#fff" : PAPER.ink }}>{children}</span>
);
const Paper: React.FC<{ children: React.ReactNode }> = ({ children }) => <AbsoluteFill style={{ background: PAPER.bg, color: PAPER.ink }}>{children}</AbsoluteFill>;

const CaseCard: React.FC = () => {
  const f = useCurrentFrame(), wipe = ramp(f, 0, 22, inOut);
  return (
    <AbsoluteFill style={{ clipPath: `circle(${wipe * 160}% at 50% 55%)` }}>
      <Paper>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26 }}>
          <div style={{ transform: `scale(${ramp(f, 14, 28, back)})` }}><Chip tone="dark">Case study</Chip></div>
          <Words text="BAULS" at={18} size={230} font={ANTON} weight={400} color={PAPER.ink} spacing="0.01em" />
          <div style={{ display: "flex", gap: 12, opacity: ramp(f, 40, 56) }}><Chip>@contractbauls</Chip><Chip>bauls.si</Chip><Chip tone="yellow">Own code</Chip></div>
          <div style={{ marginTop: 6, font: `500 30px/1.35 ${GROTESK}`, color: PAPER.dim, opacity: ramp(f, 50, 66), maxWidth: 820, textAlign: "center" }}>
            A token’s mascot, turned into an agent that lives inside posts.
          </div>
        </AbsoluteFill>
      </Paper>
    </AbsoluteFill>
  );
};
const CaseBuild: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Paper>
      <div style={{ position: "absolute", left: 80, right: 80, top: 70, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 12 }}><Chip tone="dark">01 · The build</Chip></div>
        <div style={{ display: "flex" }}><Words text="Written by a coding agent, from one skill file." at={6} size={56} font={GROTESK} weight={700} color={PAPER.ink} left /></div>
        <div style={{ font: `500 26px/1.4 ${GROTESK}`, color: PAPER.dim, opacity: ramp(f, 30, 44) }}>One 16 KB HTML file. three.js, his bauls.si artwork in 3D, dithered like bordrless.app, talking through tweetpad’s bridge.</div>
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 430, padding: "28px 30px", background: "#111", border: `2px solid ${PAPER.ink}`, boxShadow: `8px 8px 0 ${PAPER.yellow}`,
        transform: `translateY(${(1 - ramp(f, 22, 40, back)) * 60}px)`, opacity: ramp(f, 22, 34) }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>{["#ff5f57", "#febc2e", "#28c840"].map(c => <i key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />)}
          <span style={{ marginLeft: 12, font: `500 17px/1 ${MONO}`, color: "#8b98a5" }}>agent/agent.html</span></div>
        {CODE.map(([line, color], i) => {
          const at = 40 + i * 9, shown = Math.floor(clamp01((f - at) / 10) * line.length);
          return <div key={i} style={{ font: `500 22px/1.55 ${MONO}`, color, whiteSpace: "pre", height: 34 }}>{line.slice(0, shown)}{f >= at && shown < line.length ? "▌" : ""}</div>;
        })}
      </div>
    </Paper>
  );
};
const CHECKS = ["Safety check: pass", "Approved in review", "Live at tweetpad.io/a/bauls"];
const CaseChecks: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Paper>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 120px", gap: 34 }}>
        <div style={{ display: "flex" }}><Chip tone="dark">02 · Checked, then live</Chip></div>
        {CHECKS.map((c, i) => {
          const p = ramp(f, 10 + i * 16, 26 + i * 16, back), tick = ramp(f, 18 + i * 16, 26 + i * 16);
          return (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 26, transform: `translateX(${(1 - p) * -80}px)`, opacity: clamp01(p * 1.3) }}>
              <span style={{ width: 70, height: 70, flex: "none", border: `4px solid ${PAPER.ink}`, background: tick > 0.5 ? PAPER.ink : PAPER.card, display: "grid", placeItems: "center",
                color: "#fff", font: `900 44px/1 ${FONTS.ui}`, boxShadow: `5px 5px 0 ${PAPER.ink}` }}>{tick > 0.5 ? "✓" : ""}</span>
              <span style={{ font: `700 54px/1.1 ${GROTESK}`, letterSpacing: "-0.02em" }}>{c}</span>
            </div>
          );
        })}
      </AbsoluteFill>
    </Paper>
  );
};
const CasePage: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Paper>
      <div style={{ position: "absolute", left: 80, right: 80, top: 60, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex" }}><Chip tone="dark">03 · Anyone can run him</Chip></div>
        <div style={{ display: "flex" }}><Words text="He swings, watches you, and answers." at={6} size={52} font={GROTESK} weight={700} color={PAPER.ink} left /></div>
        <div style={{ font: `500 24px/1.35 ${GROTESK}`, color: PAPER.dim, opacity: ramp(f, 26, 40) }}>His hooks? Coming soon on bordrless.app.</div>
      </div>
      <Window url="tweetpad.io/a/bauls" light top={276}><Rec clip="bauls" from={1.5} w={916} h={751} /></Window>
    </Paper>
  );
};
const CasePost: React.FC = () => {
  const f = useCurrentFrame(), C = 560, p = ramp(f, 0, 18, back);
  return (
    <Paper>
      <div style={{ position: "absolute", left: 80, right: 80, top: 56, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex" }}><Words text="And inside every post with his link." at={4} size={50} font={GROTESK} weight={700} color={PAPER.ink} left /></div>
      </div>
      <div style={{ position: "absolute", left: (1080 - 640) / 2, top: 180, width: 640, padding: "18px 22px 14px", borderRadius: 18, background: "#fff", border: "1px solid #cfd9de",
        boxShadow: `10px 10px 0 ${PAPER.ink}`, transform: `translateY(${(1 - p) * 120}px) rotate(${(1 - p) * -3}deg)` }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: PAPER.ink, display: "grid", placeItems: "center", font: `800 22px/1 ${FONTS.ui}`, color: "#fff" }}>b</div>
          <div><div style={{ font: `700 19px/1.2 ${FONTS.ui}`, color: "#0f1419" }}>bauls</div><div style={{ font: `500 17px/1.2 ${FONTS.ui}`, color: "#536471" }}>@contractbauls</div></div>
        </div>
        <div style={{ margin: "12px 0", font: `500 21px/1.35 ${FONTS.ui}`, color: "#0f1419" }}>say hi to me, right here <span style={{ color: LO.blue }}>tweetpad.io/a/bauls</span></div>
        <div style={{ width: C, height: C, margin: "0 auto", borderRadius: 16, overflow: "hidden", border: "1px solid #cfd9de" }}><Rec clip="bauls-embed" from={1} w={C} h={C} /></div>
      </div>
    </Paper>
  );
};

/* ======================================================================================================================
 * The outro: the Menu again, and the call
 * ==================================================================================================================== */
const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const menu = ramp(f, 0, 26, inOut), push = ramp(f, 60, 90, inOut);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(50% 42% at 50% 62%, rgba(29,155,240,.3), transparent 72%)" }} />
      {/* the Menu, small, its Agents tile lit */}
      <div style={{ position: "absolute", left: 540 - 240 * 0.62, top: 300 - push * 120, width: 480, height: 480, transform: `scale(${0.62 * (0.85 + 0.15 * menu)})`, transformOrigin: "50% 0",
        opacity: menu * (1 - push * 0.75), borderRadius: 10, overflow: "hidden", background: STRIPES, boxShadow: "0 30px 80px rgba(29,155,240,.35)" }}>
        {TILES.map((t, i) => <Tile key={t.name} t={t} r={tileRect(i)} hover={i === AG ? 1 : 0} />)}
        <Dock />
      </div>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 150, gap: 22 }}>
        <Words text="Claim yours." at={56} size={120} />
        <div style={{ opacity: ramp(f, 78, 92), transform: `scale(${ramp(f, 78, 94, back)})`, padding: "18px 34px", borderRadius: 99, background: LO.blue, color: "#fff", font: `800 46px/1 ${FONTS.ui}` }}>tweetpad.io/agents</div>
        <div style={{ opacity: ramp(f, 100, 116), font: `600 28px/1.3 ${FONTS.ui}`, color: LO.dim }}>Bring your own code. Anyone can run it.</div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 44, textAlign: "center", font: `500 17px/1.3 ${FONTS.ui}`, color: "#536471", opacity: ramp(f, 120, 136) }}>
        Agents are AI. Replies run on Grok. Research, not financial advice.
      </div>
    </AbsoluteFill>
  );
};

export const TweetpadAgentsLaunch: React.FC = () => {
  loadFonts();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence name="Menu" from={T.menu.from} durationInFrames={T.menu.len}><MenuScene /></Sequence>
      <Shot name="Title" from={T.title.from} len={T.title.len} enter="fade" exit="zoom"><TitleScene /></Shot>

      {/* the steps, on the dark field; their recordings whip from one to the next */}
      <Sequence name="Field" from={T.claim.from} durationInFrames={T.run.from + T.run.len - T.claim.from}><Field /></Sequence>
      <Shot name="01 heading" from={T.claim.from} len={T.claim.len} enter="zoom" exit="rise"><Step n="01" head="Claim it with a tweet" sub="Pick a name, post it, paste the link. No wallet needed." /></Shot>
      <Shot name="01 /agents" from={T.claim.from} len={135 + X} enter="rise"><Window url="tweetpad.io/agents"><Rec clip="landing" from={0} /></Window></Shot>
      <Shot name="01 claim" from={T.claim.from + 135} len={135} exit="zoom"><Window url="tweetpad.io/a/my-agent"><Rec clip="claim" from={0.9} /></Window></Shot>

      <Shot name="02 heading" from={T.code.from} len={T.code.len} enter="zoom" exit="rise"><Step n="02" head="Bring your own code" sub="Hand the skill file and prompt to any coding agent. It builds, checks and uploads." /></Shot>
      <Shot name="02 build" from={T.code.from} len={330 + X} enter="rise"><Window url="tweetpad.io/a/demo-bot"><Rec clip="build" from={0.6} /></Window></Shot>
      <Shot name="02 review" from={T.code.from + 330} len={162} exit="zoom">
        <Window url="tweetpad.io/agents/review"><Rec clip="review" from={0.8} /></Window><PassStamp at={70} />
      </Shot>

      <Shot name="03 heading" from={T.run.from} len={T.run.len} enter="zoom" exit="fade"><Step n="03" head="Anyone can run it" sub="Talk to it right in the post. Anyone tops it up to keep it going." /></Shot>
      <Shot name="03 dot" from={T.run.from} len={300 + X} enter="rise">
        <Window url="tweetpad.io/a/dot"><Rec clip="dot" from={2.5} /></Window><Bubble text="research $WIF" at={70} x={640} y={820} />
      </Shot>
      <Shot name="03 top up" from={T.run.from + 300} len={150} exit="fade">
        <Window url="tweetpad.io/a/dot"><Rec clip="topup" from={0.6} /></Window><Bubble text="burn $TP: +20% credits" at={40} x={600} y={830} />
      </Shot>

      {/* the case study */}
      <Sequence name="Case: card" from={T.caseCard.from} durationInFrames={T.caseCard.len}><Moving len={T.caseCard.len} enter="none" exit="whip"><CaseCard /></Moving></Sequence>
      <Shot name="Case: build" from={T.caseBuild.from} len={T.caseBuild.len}><CaseBuild /></Shot>
      <Shot name="Case: checks" from={T.caseChecks.from} len={T.caseChecks.len}><CaseChecks /></Shot>
      <Shot name="Case: page" from={T.casePage.from} len={T.casePage.len}><CasePage /></Shot>
      <Shot name="Case: post" from={T.casePost.from} len={T.casePost.len} exit="zoom"><CasePost /></Shot>

      <Shot name="Outro" from={T.outro.from} len={T.outro.len} enter="zoom" exit="none"><Outro /></Shot>
    </AbsoluteFill>
  );
};
