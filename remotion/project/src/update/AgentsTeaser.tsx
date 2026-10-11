/**
 * TweetpadAgentsTeaser: "Agents, coming soon, powered by Grok". 1080x1080 @30, 21.2 s, in the Lights out look (pure black,
 * hairlines #2f3336, text #e7e9ea / #71767b, accent #1d9bf0, green #00ba7c, flat pills, Inter).
 * The agent card is rebuilt from embed.html #tab-agents + the "Agents (coming soon)" CSS block in assets/tweetpad.css, and
 * its log plays AGENT_DEMO (assets/tweetpad.js). The skill panel quotes agents/examples/agent-inu/ (coin address left out).
 * CLAIMS: coming soon (the card is labelled Preview; small print says agents aren't live yet); "Powered by Grok" in text only:
 * no X / xAI / Grok logos, no partnership or endorsement; agents read as agents; no price predictions; @tweetpad_io.
 * Studio: named Sequences; headlines, captions and the 3D rig are Interactive.Div with inline interpolate() styles.
 */
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, Interactive, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { FONTS } from "../brand/tokens";
import { Fine } from "../components/Film";
import { BadgeMarkCtx, ChainBadge } from "../components/Views";
import { lerp, ramp, settle } from "../lib/motion";
import { AGENTS as R, AGENTS_COPY as C, AGENTS_P as P } from "../timeline";
import { ChainRow } from "./WelcomeBnbBase";

/** Lights out tokens (skin-lights.css "Lights out tuning" + the Agents block) */
const LO = { bg: "#000", raise: "#16181c", line: "#2f3336", text: "#e7e9ea", dim: "#71767b", dim2: "#8b98a5", foot: "#536471", blue: "#1d9bf0", green: "#00ba7c", pill: "#eff3f4", pillText: "#0f1419" } as const;
const MONO = 'ui-monospace, Menlo, Monaco, "DejaVu Sans Mono", monospace';
const springy = Easing.bezier(0.34, 1.56, 0.64, 1);

/* =========================== background: black, a hairline grid, dark # glyphs, a blue glow =========================== */
const GlyphGrid: React.FC<{ step: number; size: number; color: string }> = ({ step, size, color }) => {
  const n = Math.ceil(1800 / step);
  return (
    <div style={{ position: "absolute", left: -360, top: -360, width: 1800, height: 1800 }}>
      {Array.from({ length: n * n }, (_, i) => {
        const r = Math.floor(i / n), c = i % n;
        return <span key={i} style={{ position: "absolute", left: c * step + (r % 2 ? step / 2 : 0), top: r * step, font: `800 ${size}px/1 ${FONTS.ui}`, color }}>#</span>;
      })}
    </div>
  );
};
const Field: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: LO.bg, overflow: "hidden" }}>
      <Interactive.Div name="Grid" style={{ position: "absolute", inset: -60, opacity: 0.55,
        backgroundImage: "linear-gradient(#16181c 1px, transparent 1px), linear-gradient(90deg, #16181c 1px, transparent 1px)", backgroundSize: "60px 60px",
        translate: interpolate(frame, [0, 635], ["0px 0px", "-60px -60px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />
      <Interactive.Div name="Glyphs (far)" style={{ position: "absolute", inset: 0,
        translate: interpolate(frame, [0, 635], ["0px 0px", "-140px -140px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        <GlyphGrid step={120} size={34} color="#121417" />
      </Interactive.Div>
      <Interactive.Div name="Glyphs (near)" style={{ position: "absolute", inset: 0, filter: "blur(1.5px)",
        translate: interpolate(frame, [0, 635], ["0px 0px", "-320px -320px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        <GlyphGrid step={260} size={84} color="#1a1d21" />
      </Interactive.Div>
      <Interactive.Div name="Blue glow" style={{ position: "absolute", inset: 0, background: "radial-gradient(42% 38% at 50% 55%, rgba(29,155,240,.22), transparent 72%)",
        opacity: interpolate(frame, [0, 120, 400, 635], [0.6, 1, 0.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(75% 75% at 50% 50%, transparent 55%, rgba(0,0,0,.8) 100%)" }} />
    </AbsoluteFill>
  );
};

/* =========================== the agent card (#agent-preview), Lights out =========================== */
type LogKind = "think" | "tool" | "post";
const LogLine: React.FC<{ kind: LogKind; text: string; t: number }> = ({ kind, text, t }) => (
  <li style={{ display: "flex", gap: 8, alignItems: "baseline", color: LO.text, font: `14px/1.35 ${FONTS.ui}`, opacity: t, translate: `0 ${(1 - t) * 6}px` }}>
    <span style={{ flex: "none", minWidth: 58, color: kind === "post" ? LO.blue : LO.dim, font: `600 11px/1 ${MONO}`, textTransform: "uppercase" }}>{kind === "think" ? "thinking" : kind === "tool" ? "tool" : "posted"}</span>
    <span style={kind === "tool" ? { color: LO.dim2, font: `13px/1.35 ${MONO}` } : kind === "think" ? { color: LO.dim2, fontStyle: "italic" } : { padding: "6px 10px", borderRadius: 12, background: LO.raise }}>{text}</span>
  </li>
);
/** lines: how many log lines are in (0..5, may be fractional for the newest one's entrance); f drives the pulsing dot */
const AgentCard: React.FC<{ f: number; lines: number; headT?: number }> = ({ f, lines, headT = 1 }) => (
  <div style={{ width: 331, border: `1px solid ${LO.line}`, borderRadius: 16, background: LO.bg, overflow: "hidden", fontFamily: FONTS.ui }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderBottom: `1px solid ${LO.line}`, opacity: headT }}>
      <Img src={staticFile("brand/agent-inu.jpg")} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
      <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
        <b style={{ color: LO.text, font: `700 15px/1.2 ${FONTS.ui}` }}>Agent Inu</b>
        <small style={{ color: LO.dim, font: `13px/1.2 ${FONTS.ui}` }}>$AI · runs on Grok</small>
      </span>
      {/* .agent-live: the dot pulses (agent-pulse 1.4 s) */}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", color: LO.green, font: `700 12px/1 ${FONTS.ui}`, border: "1px solid #00ba7c55", borderRadius: 9999 }}>
        <i style={{ width: 7, height: 7, borderRadius: "50%", background: LO.green, opacity: 0.65 + 0.35 * Math.cos((f / 42) * Math.PI * 2), scale: String(0.85 + 0.15 * Math.cos((f / 42) * Math.PI * 2)) }} />Live
      </span>
    </div>
    <ol style={{ listStyle: "none", margin: 0, padding: "10px 12px", minHeight: 170, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 8 }}>
      {C.log.slice(0, Math.ceil(lines)).map(([k, text], i) => <LogLine key={i} kind={k} text={text} t={Math.min(1, lines - i)} />)}
    </ol>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", padding: "8px 12px", color: LO.foot, font: `12px/1.3 ${FONTS.ui}`, borderTop: `1px solid ${LO.line}` }}>
      <span>Preview · demo activity</span><span>skill: SKILL.md · tools: x_search, chart, post</span>
    </div>
  </div>
);
/** when each AGENT_DEMO line lands (stage frames) */
const LINE_AT = [26, 50, 74, 98, 126];
const linesAt = (f: number) => LINE_AT.reduce((n, at) => n + ramp(f, at, at + 10, settle), 0);

/* =========================== the skill panel: an editor with agent.json, then SKILL.md, typing in =========================== */
/** JSON: keys in blue, strings in white, punctuation dim (a key is a string followed by ":") */
const jsonLine = (l: string) => {
  const parts = l.split(/("[^"]*"?)/g);
  return parts.map((p, i) => {
    if (!p.startsWith('"')) return <span key={i} style={{ color: LO.dim }}>{p}</span>;
    const key = (parts[i + 1] ?? "").trimStart().startsWith(":");
    return <span key={i} style={{ color: key ? LO.blue : LO.text }}>{p}</span>;
  });
};
const mdLine = (l: string) => /^##/.test(l) ? <span style={{ color: LO.text, fontWeight: 700 }}>{l}</span> : /^-/.test(l) ? <span style={{ color: LO.dim2 }}>{l}</span> : <span style={{ color: LO.text }}>{l}</span>;
/** type out lines at cps chars per frame from `start` */
const typeLines = (lines: readonly string[], f: number, start: number, cpf: number) => {
  let left = Math.max(0, Math.floor((f - start) * cpf));
  const out: string[] = [];
  for (const l of lines) { if (left <= 0) break; out.push(l.slice(0, left)); left -= l.length + 1; }
  return out;
};
const SkillPanel: React.FC<{ f: number }> = ({ f }) => {
  const toMd = 62; // the editor flips from agent.json to SKILL.md
  const md = f >= toMd;
  const shown = md ? typeLines(C.skillMd, f, toMd + 4, 3.2) : typeLines(C.agentJson, f, 6, 3.2);
  const caretOn = Math.floor(f / 8) % 2 === 0;
  const tab = (name: string, on: boolean) => (
    <span style={{ padding: "8px 14px", font: `600 13px/1 ${FONTS.ui}`, color: on ? LO.text : LO.dim, borderBottom: `2px solid ${on ? LO.blue : "transparent"}` }}>{name}</span>
  );
  return (
    <div style={{ width: 384, borderRadius: 14, background: LO.raise, border: `1px solid ${LO.line}`, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "0 8px", borderBottom: `1px solid ${LO.line}`, background: "#0b0c0e" }}>
        <span style={{ display: "inline-flex", gap: 5, padding: "0 8px 0 2px" }}>{["#f4212e", "#ffd400", "#00ba7c"].map((c) => <i key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.7 }} />)}</span>
        {tab("agent.json", !md)}{tab("SKILL.md", md)}
        <span style={{ marginLeft: "auto", color: LO.foot, font: `11px/1 ${MONO}` }}>agents/examples/agent-inu</span>
      </div>
      <pre style={{ margin: 0, padding: "12px 14px", minHeight: 196, font: `14px/1.6 ${MONO}`, whiteSpace: "pre-wrap" }}>
        {shown.map((l, i) => <div key={i}>{md ? mdLine(l) : jsonLine(l)}{i === shown.length - 1 && caretOn ? <span style={{ display: "inline-block", width: 7, height: 15, background: LO.blue, verticalAlign: "-3px", marginLeft: 1 }} /> : null}</div>)}
      </pre>
    </div>
  );
};

/* =========================== the coin: $AI with its chain badge =========================== */
const CoinChip: React.FC = () => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 18, padding: "14px 30px 14px 14px", borderRadius: 9999, background: LO.bg, border: `1px solid ${LO.line}`,
    boxShadow: "0 0 0 1px rgba(29,155,240,.25), 0 0 40px rgba(29,155,240,.25)" }}>
    <span style={{ position: "relative", display: "inline-flex", lineHeight: 0 }}>
      <Img src={staticFile("brand/agent-inu.jpg")} style={{ width: 84, height: 84, borderRadius: "50%", objectFit: "cover" }} />
      <ChainBadge chain="solana" size={84} diam={32} />
    </span>
    <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <b style={{ color: LO.text, font: `800 44px/1 ${FONTS.ui}` }}>$AI</b>
      <span style={{ color: LO.dim, font: `500 28px/1 ${FONTS.ui}` }}>Agent Inu · its agent</span>
    </span>
  </div>
);

/* =========================== the post: a Lights out tweet with the agent card embedded =========================== */
const ICONS = [
  "M14.05 6c1.17 0 2.27.45 3.1 1.27a4.33 4.33 0 0 1 0 6.15l-.01.01-4.82 4.6a.5.5 0 0 1-.69 0l-4.82-4.6a4.33 4.33 0 0 1 0-6.16A4.35 4.35 0 0 1 12 6.6 4.38 4.38 0 0 1 14.05 6z",
];
const Tweet: React.FC<{ f: number; children: React.ReactNode }> = ({ children }) => {
  const t = C.tweet;
  return (
    <div style={{ width: 860, display: "flex", gap: 18, padding: "22px 24px", background: LO.bg, border: `1px solid ${LO.line}`, borderRadius: 18, fontFamily: FONTS.ui }}>
      <Img src={staticFile("brand/agent-inu.jpg")} style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, font: `27px/1.2 ${FONTS.ui}` }}>
          <b style={{ color: LO.text, fontWeight: 700 }}>{t.name}</b><span style={{ color: LO.dim }}>{t.handle} · {t.time}</span>
        </div>
        <p style={{ margin: "6px 0 16px", color: LO.text, font: `28px/1.35 ${FONTS.ui}` }}>
          {t.text.split(/(#[a-z]+)/g).map((p, i) => (p.startsWith("#") ? <span key={i} style={{ color: LO.blue }}>{p}</span> : p))}
        </p>
        {children}
        <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 520, marginTop: 16, color: LO.dim }}>
          {["M1.75 10a8 8 0 0 1 8-8h4.36a8.13 8.13 0 0 1 5.85 13.77l-6.71 6.64-.01-3.66H9.75a8 8 0 0 1-8-8.75z",
            "M4.5 3.88l4.43 4.14-1.36 1.46L5.5 7.55V16c0 1.1.9 2 2 2H13v2H7.5a4 4 0 0 1-4-4V7.55L1.43 9.48.07 8.02 4.5 3.88zM16.5 6H11V4h5.5a4 4 0 0 1 4 4v8.45l2.07-1.93 1.36 1.46-4.43 4.14-4.43-4.14 1.36-1.46 2.07 1.93V8a2 2 0 0 0-2-2z",
            ICONS[0], "M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"].map((d, i) => (
            <svg key={i} viewBox="0 0 24 24" width={30} height={30}><path d={d} fill="none" stroke={LO.dim} strokeWidth={1.6} strokeLinejoin="round" /></svg>
          ))}
        </div>
      </div>
    </div>
  );
};

/* =========================== scenes =========================== */
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
      <Interactive.Div name="Hook mark" style={{ width: 120, height: 120, background: LO.text, WebkitMaskImage: `url(${staticFile("brand/hash-white.png")})`, maskImage: `url(${staticFile("brand/hash-white.png")})`,
        WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center",
        opacity: interpolate(frame, [0, 66, 78], [1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />
      <Interactive.Div name="Hook headline" style={{ font: `800 96px/1.04 ${FONTS.ui}`, letterSpacing: "-.035em", color: LO.text, textAlign: "center",
        translate: interpolate(frame, [0, 18], ["0px 12px", "0px 0px"], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        opacity: interpolate(frame, [0, 66, 78], [1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        {C.hook.head}<br />{C.hook.head2}
      </Interactive.Div>
      <Interactive.Div name="Hook kicker" style={{ font: `700 34px/1 ${FONTS.ui}`, letterSpacing: ".06em", textTransform: "uppercase", color: LO.dim,
        opacity: interpolate(frame, [8, 20, 66, 78], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        {C.hook.kicker}
      </Interactive.Div>
    </AbsoluteFill>
  );
};

const Caption: React.FC<{ name: string; head: string; sub: string }> = ({ name, head, sub }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 64, gap: 12 }}>
      <Interactive.Div name={name} style={{ font: `800 64px/1.05 ${FONTS.ui}`, letterSpacing: "-.03em", color: LO.text, textAlign: "center", padding: "0 80px",
        translate: interpolate(frame, [0, 10], ["0px 20px", "0px 0px"], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{head}</Interactive.Div>
      {sub ? <Interactive.Div name={name + " (sub)"} style={{ font: `500 34px/1.2 ${FONTS.ui}`, color: LO.dim, textAlign: "center",
        opacity: interpolate(frame, [4, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{sub}</Interactive.Div> : null}
    </AbsoluteFill>
  );
};

/** a floating copy of a tool line, popping off the card toward the viewer */
const ToolChip: React.FC<{ f: number; at: number; text: string; x: number; y: number }> = ({ f, at, text, x, y }) => {
  const t = ramp(f, at, at + 14, springy), out = 1 - ramp(f, at + 40, at + 54);
  if (f < at || out <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 540 + x * t, top: 600 + y * t, transform: `translate(-50%, -50%) translateZ(${220 * t}px)`, opacity: Math.min(1, t * 1.5) * out,
      padding: "14px 22px", borderRadius: 14, background: "rgba(22,24,28,.96)", border: `1px solid ${LO.line}`, color: LO.dim2, font: `24px/1.2 ${MONO}`, whiteSpace: "nowrap",
      boxShadow: "0 0 0 1px rgba(29,155,240,.35), 0 0 30px rgba(29,155,240,.35), 0 20px 40px rgba(0,0,0,.7)" }}>
      <span style={{ color: LO.blue, fontWeight: 700, marginRight: 12 }}>TOOL</span>{text}
    </div>
  );
};

const Stage: React.FC = () => {
  const f = useCurrentFrame();
  // where the card is in each phase (stage px from the centre; z; rotateY; scale)
  const toSkill = ramp(f, P.skill, P.skill + 24, settle), toCoin = ramp(f, P.coin, P.coin + 22, settle), toPost = ramp(f, P.post, P.post + 26, settle);
  const cx = lerp(lerp(0, -215, toSkill), 0, toCoin);
  const cy = lerp(lerp(lerp(66, 66, toSkill), -112, toCoin), 30, toPost);
  const cz = lerp(lerp(0, -260, toSkill), -40, toCoin);
  const cry = lerp(0, 22, toSkill) * (1 - toCoin);
  const cs = lerp(lerp(1.85, 1.85, toSkill), 1.2, toCoin) * (1 - toPost) + 1.45 * toPost;
  const cardBuild = ramp(f, 0, 18, springy);
  const tweetT = ramp(f, P.post + 10, P.post + 30, settle);
  const skillIn = ramp(f, P.skill + 6, P.skill + 28, springy) * (1 - ramp(f, P.coin - 6, P.coin + 14, settle));
  const coinIn = ramp(f, P.coin + 10, P.coin + 30, springy) * (1 - ramp(f, P.post, P.post + 16, settle));
  const out = 1 - ramp(f, P.out - 4, P.out + 8);
  const card = <AgentCard f={f} lines={linesAt(f)} headT={ramp(f, 4, 14)} />;
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <AbsoluteFill style={{ perspective: 1700, perspectiveOrigin: "50% 55%" }}>
        <Interactive.Div name="Rig (orbit)" style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d",
          rotate: interpolate(f, [0, 160, 300, 470], ["0 1 0 -9deg", "0 1 0 7deg", "0 1 0 -5deg", "0 1 0 0deg"], { easing: Easing.inOut(Easing.sin), extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          {/* the agent card (fades into the tweet's embed in the post phase) */}
          <div style={{ position: "absolute", left: 540 + cx, top: 600 + cy, transformStyle: "preserve-3d",
            transform: `translate(-50%, -50%) translateZ(${cz + (1 - cardBuild) * -600}px) rotateY(${cry}deg) scale(${cs})`, opacity: Math.min(1, cardBuild * 1.4) * (1 - tweetT) }}>
            <div style={{ position: "absolute", left: 0, top: -30, display: "flex", width: 331, justifyContent: "center" }}>
              <span style={{ padding: "4px 12px", borderRadius: 9999, background: "rgba(29,155,240,.12)", color: LO.blue, font: `700 12px/1 ${FONTS.ui}`, letterSpacing: ".06em" }}>PREVIEW · COMING SOON</span>
            </div>
            <div style={{ boxShadow: "0 0 0 1px rgba(29,155,240,.3), 0 0 50px rgba(29,155,240,.28), 0 30px 60px rgba(0,0,0,.8)", borderRadius: 16 }}>{card}</div>
          </div>
          {/* the skill file, floating beside the card */}
          {skillIn > 0 ? (
            <div style={{ position: "absolute", left: 540 + lerp(400, 165, skillIn), top: 650, transform: `translate(-50%, -50%) translateZ(${lerp(-200, 120, skillIn)}px) rotateY(-14deg) scale(1.45)`, opacity: Math.min(1, skillIn * 1.5),
              borderRadius: 14, boxShadow: "0 0 0 1px rgba(29,155,240,.35), 0 0 40px rgba(29,155,240,.3), 0 30px 60px rgba(0,0,0,.8)" }}>
              <SkillPanel f={f - P.skill} />
            </div>
          ) : null}
          {/* the coin and the chains */}
          {coinIn > 0 ? (
            <div style={{ position: "absolute", left: 0, right: 0, top: 742, display: "flex", flexDirection: "column", alignItems: "center", gap: 26, transform: `translateZ(${lerp(-200, 80, coinIn)}px)`, opacity: Math.min(1, coinIn * 1.5) }}>
              <CoinChip />
              <ChainRow size={64} color={LO.dim2} font={22} pop={(i) => ramp(f, P.coin + 22 + i * 5, P.coin + 34 + i * 5, springy)} />
            </div>
          ) : null}
        </Interactive.Div>
      </AbsoluteFill>
      {/* tool calls pop off the card */}
      <AbsoluteFill style={{ perspective: 1700 }}>
        <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}>
          <ToolChip f={f} at={LINE_AT[1] + 4} text="x_search → 14 new posts" x={-225} y={-330} />
          <ToolChip f={f} at={LINE_AT[2] + 4} text="chart($AI, 1h)" x={245} y={-330} />
        </div>
      </AbsoluteFill>
      {/* the post: the card, now inside a tweet */}
      {tweetT > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 200, display: "flex", justifyContent: "center", opacity: tweetT, scale: String(0.94 + 0.06 * tweetT) }}>
          <Tweet f={f}><div style={{ zoom: 1.45 }}>{card}</div></Tweet>
        </div>
      ) : null}
      <Fine text={C.fine} color="rgba(139,152,165,.9)" t={ramp(f, 10, 24)} />
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26, paddingBottom: 30 }}>
        <Interactive.Div name="End headline" style={{ font: `800 88px/1.04 ${FONTS.ui}`, letterSpacing: "-.035em", color: LO.text, textAlign: "center",
          translate: interpolate(frame, [0, 16], ["0px 24px", "0px 0px"], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          {C.end.head}<br />{C.end.head2}
        </Interactive.Div>
        <Interactive.Div name="End sub" style={{ padding: "10px 22px", borderRadius: 9999, background: "rgba(29,155,240,.12)", color: LO.blue, font: `700 34px/1 ${FONTS.ui}`,
          opacity: interpolate(frame, [8, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{C.end.sub}</Interactive.Div>
        <Interactive.Div name="End url" style={{ marginTop: 10, padding: "16px 38px", borderRadius: 9999, background: LO.pill, color: LO.pillText, font: `800 40px/1 ${FONTS.ui}`,
          opacity: interpolate(frame, [14, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          scale: interpolate(frame, [14, 26], [0.88, 1], { easing: Easing.bezier(0.34, 1.56, 0.64, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{C.end.url}</Interactive.Div>
        <Interactive.Div name="End kit + handle" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, font: `500 30px/1.2 ${FONTS.ui}`, color: LO.dim,
          opacity: interpolate(frame, [22, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <span>{C.end.kit}</span><span style={{ color: LO.blue, fontWeight: 700 }}>{C.end.handle}</span>
        </Interactive.Div>
      </AbsoluteFill>
      <Fine text={C.end.fine} color="rgba(139,152,165,.9)" t={ramp(frame, 24, 36)} />
    </AbsoluteFill>
  );
};

export const TweetpadAgentsTeaser: React.FC = () => {
  loadFonts();
  return (
    <BadgeMarkCtx.Provider value={{ bnb: "#fff" }}>
      <AbsoluteFill style={{ background: LO.bg }}>
        <Sequence name="Black field">
          <Field />
        </Sequence>
        <Sequence name="1 Hook" from={R.hook.from} durationInFrames={R.hook.dur}>
          <Hook />
        </Sequence>
        <Sequence name="2–5 Agent stage (3D)" from={R.stage.from} durationInFrames={R.stage.dur}>
          <Stage />
        </Sequence>
        <Sequence name="Caption: card" from={R.stage.from + P.card + 8} durationInFrames={P.skill - P.card - 6}>
          <Caption name="Caption: card" head={C.caps.card.head} sub={C.caps.card.sub} />
        </Sequence>
        <Sequence name="Caption: skill" from={R.stage.from + P.skill + 4} durationInFrames={P.coin - P.skill - 2}>
          <Caption name="Caption: skill" head={C.caps.skill.head} sub={C.caps.skill.sub} />
        </Sequence>
        <Sequence name="Caption: coin" from={R.stage.from + P.coin + 4} durationInFrames={P.post - P.coin - 2}>
          <Caption name="Caption: coin" head={C.caps.coin.head} sub={C.caps.coin.sub} />
        </Sequence>
        <Sequence name="Caption: post" from={R.stage.from + P.post + 4} durationInFrames={P.out - P.post + 4}>
          <Caption name="Caption: post" head={C.caps.post.head} sub={C.caps.post.sub} />
        </Sequence>
        <Sequence name="6 End card" from={R.end.from} durationInFrames={R.end.dur}>
          <EndCard />
        </Sequence>
      </AbsoluteFill>
    </BadgeMarkCtx.Provider>
  );
};
