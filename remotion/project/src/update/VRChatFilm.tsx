/**
 * TweetpadVRChat: VRChat avatars on tweetpad agents. 1080x1080 @30, ~45 s. White, one short line popping in at a time, the
 * interface on tilted 2.5D planes (the helpers come from AgentsCode.tsx).
 *   Open    the tweetpad mark, "VRChat Support", the tagline, and all ten avatars popping in on a tilted grid
 *   Drop    a .unitypackage is dragged onto an agent: rig, lip-sync, blink, packed; the avatar appears
 *   Cast    ten avatars, one after another, each inside an X post: a visitor types in tweetpad's message box, the avatar reacts,
 *           answers in tweetpad's speech bubble with lip-sync, and acts (shrug, cheer, wave, nod, dance); each card flips to the next
 *   Grid    all of them at once, as the camera pulls back: "Any VRChat avatar."
 *   How     the one command (kit/v1/tools/vrc-to-glb.py)
 *   End     "VRChat avatars" "on tweetpad agents" tweetpad.io/agents
 * The avatars are real recordings of /kit/v1/avatar.js (cel shading, outline, contact shadow) over /kit/v1/backdrop.js scenes, recorded
 * in a headless browser with scripted speech and actions (public/vrc/*.mp4: speech starts 1.3 s in, a surprised look at 0.9 s).
 * CLAIMS: "VRChat" in text only, no logo, no partnership. The avatars are fan-made community uploads used for a demo.
 */
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { FONTS } from "../brand/tokens";
import { back, clamp01, Cursor, D, Headline, inOut, MONO, Panel, Pop, ramp, SHADOW, Stage, UI, W } from "./AgentsCode";

/* ---------- the cast: who says what, over which backdrop, doing what ---------- */
type Who = { id: string; name: string; ask: string; reply: string; line: string; tint: string };
const CAST: Who[] = [
  { id: "kaito", name: "kaito", ask: "who are you?", reply: "Dinner, apparently. And your agent.", line: "It talks.", tint: "#3a5bd9" },
  { id: "pikachu", name: "pika", ask: "say hi!", reply: "Pika! I live in this post now.", line: "It lip-syncs.", tint: "#f2c230" },
  { id: "robot", name: "drip", ask: "what can you do?", reply: "Answer questions. Read charts. Wave.", line: "It waves.", tint: "#1a2357" },
  { id: "skeleton", name: "bones", ask: "are you real?", reply: "Real enough to talk. Ask me anything.", line: "Jaw and all.", tint: "#b8506e" },
  { id: "itachi", name: "itachi", ask: "say something cool", reply: "You're already in my post.", line: "Anime, too.", tint: "#3b3550" },
  { id: "kermit", name: "lord k", ask: "dark lord?", reply: "Only on weekends. Top me up.", line: "It reacts.", tint: "#5f9b3a" },
  { id: "steve", name: "steve", ask: "what are you building?", reply: "I built this agent out of blocks.", line: "Blocky, too.", tint: "#2fa3a3" },
  { id: "pooh", name: "pooh", ask: "honey or credits?", reply: "Credits. Then honey.", line: "It dances.", tint: "#d9a21b" },
  { id: "chief", name: "chief", ask: "finish the fight?", reply: "Finish the fight? I'd rather finish this chat.", line: "Helmets, too.", tint: "#4d6b3a" },
  { id: "miku", name: "miku", ask: "sing for us?", reply: "Every post is a stage now.", line: "It's yours.", tint: "#3fb8b1" },
];
const CLIP_FROM = 6;          // frames into each recording where its shot starts (0.2 s)
const SPEAK_AT = 33;          // the recording's speech, 1.3 s in, in shot frames
const SENT_AT = 21;           // the visitor's message leaves the box just before the surprised look (0.9 s)

/* ---------- the timeline, in frames: each shot overlaps the next by X ---------- */
const X = 12, SHOT = 110;
const LENS: [string, number][] = [["open", 156], ["drop", 196], ...CAST.map((c) => [c.id, SHOT] as [string, number]), ["grid", 160], ["how", 118], ["end", 160]];
const T: Record<string, { from: number; len: number }> = {};
{ let at = 0; for (const [k, len] of LENS) { T[k] = { from: at, len }; at += len - X; } }
export const VRCHAT_TOTAL = T.end.from + T.end.len;

/* a shot comes forward out of the white and goes back into it */
const Depth: React.FC<{ len: number; first?: boolean; last?: boolean; children: React.ReactNode }> = ({ len, first, last, children }) => {
  const f = useCurrentFrame(), p = first ? 1 : ramp(f, 0, X + 6, inOut), q = last ? 0 : ramp(f, len - X - 6, len, inOut);
  return <AbsoluteFill style={{ opacity: p * (1 - q), transform: `scale(${(0.94 + 0.06 * p) * (1 + 0.06 * q)})`, filter: p < 1 || q > 0 ? `blur(${(1 - p + q) * 8}px)` : undefined }}>{children}</AbsoluteFill>;
};
const Shot: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <Sequence name={id} from={T[id].from} durationInFrames={T[id].len}><Depth len={T[id].len} first={id === "open"} last={id === "end"}>{children}</Depth></Sequence>
);

/* ---------- tweetpad's pieces over an agent: the speech bubble and the message box ---------- */
const Bubble: React.FC<{ text: string; at: number; size?: number }> = ({ text, at, size = 26 }) => {
  const f = useCurrentFrame(), p = ramp(f, at, at + 12, back);
  if (f < at) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: "6%", display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ position: "relative", maxWidth: "78%", padding: "14px 20px", borderRadius: 22, background: "#fff", color: "#111", font: `600 ${size}px/1.25 ${FONTS.round}`, textAlign: "center",
        boxShadow: "0 10px 30px rgba(0,0,0,.18)", opacity: clamp01(p), transform: `translateY(${(1 - p) * 12}px) scale(${0.86 + 0.14 * p})`, transformOrigin: "50% 100%" }}>
        {text}
        <i style={{ position: "absolute", left: "50%", bottom: -9, width: 18, height: 18, background: "#fff", transform: "translateX(-50%) rotate(45deg)", borderRadius: 3 }} />
      </div>
    </div>
  );
};
const MessageBox: React.FC<{ name: string; ask: string; typeAt: number; sentAt: number; size?: number }> = ({ name, ask, typeAt, sentAt, size = 20 }) => {
  const f = useCurrentFrame(), shown = f < sentAt ? ask.slice(0, Math.max(0, Math.floor((f - typeAt) * 1.3))) : "";
  const chip = f >= sentAt ? ramp(f, sentAt, sentAt + 10, back) * (1 - ramp(f, sentAt + 40, sentAt + 52)) : 0;
  return (
    <>
      {chip > 0 && <div style={{ position: "absolute", right: 18, bottom: 86, padding: "10px 16px", borderRadius: 16, background: W.blue, color: "#fff", font: `600 ${size}px/1.2 ${UI}`,
        opacity: clamp01(chip), transform: `translateY(${(1 - chip) * 14}px)` }}>{ask}</div>}
      <div style={{ position: "absolute", left: 12, right: 12, bottom: 12, display: "flex", gap: 8, padding: 6, borderRadius: 16, background: "rgba(20,22,24,.9)", border: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ flex: 1, padding: "12px 14px", font: `500 ${size}px/1 ${UI}`, color: shown ? "#e7e9ea" : "#7b8088", whiteSpace: "nowrap", overflow: "hidden" }}>
          {shown || `Say something to ${name}…`}{shown && f < sentAt && Math.floor(f / 8) % 2 === 0 ? <span style={{ display: "inline-block", width: 2, height: "1em", verticalAlign: "-0.15em", background: "#5cc4ff", marginLeft: 2 }} /> : null}
        </div>
        <div style={{ padding: "12px 18px", borderRadius: 11, background: "#fff", color: "#000", font: `700 ${size - 2}px/1 ${UI}`, transform: `scale(${f >= sentAt - 3 && f < sentAt + 3 ? 0.93 : 1})` }}>Send</div>
      </div>
    </>
  );
};
/* the agent's card: a recording, with tweetpad's bubble and box over it */
const AgentCard: React.FC<{ who: Who; size: number; talk?: boolean; from?: number }> = ({ who, size, talk = true, from = CLIP_FROM }) => (
  <div style={{ position: "relative", width: size, height: size, borderRadius: 16, overflow: "hidden", background: "#111" }}>
    <OffthreadVideo src={staticFile(`vrc/${who.id}.mp4`)} startFrom={from} muted style={{ width: size, height: size, display: "block" }} />
    {talk && <><Bubble text={who.reply} at={SPEAK_AT} size={Math.round(size / 22)} /><MessageBox name={who.name} ask={who.ask} typeAt={2} sentAt={SENT_AT} size={Math.round(size / 28)} /></>}
  </div>
);
/* the X post around it, light mode */
const Post: React.FC<{ who: Who; card: number; talk?: boolean; from?: number }> = ({ who, card, talk, from }) => (
  <div style={{ width: card + 40, padding: "18px 20px 14px", display: "flex", flexDirection: "column", gap: 12, background: "#fff", borderRadius: 22, boxShadow: SHADOW }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <i style={{ width: 44, height: 44, borderRadius: 22, background: who.tint, flex: "none" }} />
      <div style={{ font: `700 20px/1.2 ${UI}`, color: W.ink }}>{who.name} <span style={{ fontWeight: 500, color: W.dim }}>· a tweetpad agent</span></div>
    </div>
    <div style={{ font: `500 20px/1.3 ${UI}`, color: W.ink }}>Talk to me. <span style={{ color: W.blue }}>tweetpad.io/a/{who.id}</span></div>
    <AgentCard who={who} size={card} talk={talk} from={from} />
    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 14px 0", font: `500 16px/1 ${UI}`, color: W.dim }}><span>Reply</span><span>Repost</span><span>Like</span><span>Share</span></div>
  </div>
);

/* ======================================================================================================================
 * Shots
 * ==================================================================================================================== */
/* the opening: the mark and the name over the whole cast, each avatar popping in */
const Open: React.FC = () => {
  const f = useCurrentFrame(), mark = ramp(f, 2, 18, back);
  return (
    <AbsoluteFill style={{ background: W.bg }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 70, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: clamp01(mark), transform: `scale(${0.7 + 0.3 * mark})` }}>
          <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 84, height: 84 }} />
          <span style={{ font: `600 64px/1 ${FONTS.round}`, color: W.ink }}>tweet<span style={{ color: W.blue }}>pad</span></span>
        </div>
        <Pop text="VRChat Support" at={14} size={104} />
        <Pop text={TAGLINE} at={30} size={40} color={W.dim} />
      </div>
      <Stage rx={16} ry={-6} rz={2} y={150} scale={0.8} drift={2}>
        <div style={{ position: "absolute", left: -70, top: 200 }}>
          {CAST.map((c, i) => { const p = ramp(f, 34 + i * 5, 50 + i * 5, back);
            return <div key={c.id} style={{ position: "absolute", left: (i % 5) * 244, top: Math.floor(i / 5) * 268, transform: `translateZ(${(1 - p) * -200}px)`, opacity: clamp01(p), borderRadius: 18, boxShadow: SHADOW, overflow: "hidden" }}>
              <AgentCard who={c} size={232} talk={false} from={45 + (i % 5) * 7} />
            </div>; })}
        </div>
      </Stage>
    </AbsoluteFill>
  );
};

const STEPS = ["Rig found · 33 bones", "Lip-sync · aa, oh, ih", "Blink · smile · surprised", "Packed for the post"];
const Drop: React.FC = () => {
  const f = useCurrentFrame(), dropAt = 62;
  // the file chip rides the cursor until it's dropped
  const path = [{ f: 6, x: 940, y: 960 }, { f: 22, x: 860, y: 860, click: true }, { f: 58, x: 520, y: 470 }, { f: 62, x: 520, y: 470, click: true }, { f: 120, x: 860, y: 900 }];
  const at = (fr: number) => { let x = path[0].x, y = path[0].y; for (let i = 1; i < path.length; i++) { const a = path[i - 1], b = path[i]; if (fr >= a.f) { const t = ramp(fr, a.f, b.f, inOut); x = a.x + (b.x - a.x) * t; y = a.y + (b.y - a.y) * t; } } return { x, y }; };
  const c = at(Math.min(f, dropAt)), carried = f >= 22, show = ramp(f, 140, 158, back);
  return (
    <AbsoluteFill style={{ background: W.bg }}>
      <Headline><Pop text="Drop in a .unitypackage." at={6} size={60} /></Headline>
      <Stage rx={16} ry={-14} rz={1} y={50}>
        <Panel x={180} y={200} w={720} h={640} at={2}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: 32 }}>
            <div style={{ alignSelf: "flex-start", padding: "8px 14px", borderRadius: 99, background: W.soft, font: `500 18px/1 ${UI}`, color: W.dim }}>tweetpad.io/a/kaito · Edit</div>
            <div style={{ height: 240, borderRadius: 18, border: `2px dashed ${f >= 40 && f < dropAt + 6 ? W.blue : W.line}`, background: f >= 40 && f < dropAt + 6 ? "rgba(29,155,240,.06)" : W.soft,
              display: "grid", placeItems: "center", position: "relative", overflow: "hidden" }}>
              {show < 0.02 && <div style={{ font: `600 24px/1.3 ${UI}`, color: W.dim, textAlign: "center" }}>Drop a VRChat avatar<br /><span style={{ font: `400 18px/1 ${MONO}` }}>.unitypackage · .fbx · .glb</span></div>}
              {show > 0 && <div style={{ position: "absolute", inset: 0, opacity: clamp01(show), transform: `scale(${0.85 + 0.15 * show})` }}>
                <OffthreadVideo src={staticFile("vrc/kaito.mp4")} startFrom={60} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {STEPS.map((s, i) => { const a = dropAt + 14 + i * 16, p = ramp(f, a, a + 10, back);
                return <div key={s} style={{ display: "flex", alignItems: "center", gap: 12, font: `600 22px/1 ${UI}`, color: W.ink, opacity: clamp01(p), transform: `translateX(${(1 - p) * -16}px)` }}>
                  <i style={{ width: 26, height: 26, borderRadius: 13, background: W.green, color: "#fff", display: "grid", placeItems: "center", font: `800 15px/1 ${UI}`, fontStyle: "normal" }}>✓</i>{s}</div>; })}
            </div>
          </div>
        </Panel>
        {carried && f < dropAt + 8 && <div style={{ position: "absolute", left: c.x + 18, top: c.y + 22, transform: `translateZ(110px) scale(${f < dropAt ? 1 : 1 - ramp(f, dropAt, dropAt + 8)})`,
          display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: "#fff", boxShadow: SHADOW, font: `600 20px/1 ${MONO}`, color: W.ink, whiteSpace: "nowrap" }}>
          <i style={{ width: 28, height: 34, borderRadius: 5, background: "#e9edf3", border: `1px solid ${W.line}` }} />kaito.unitypackage</div>}
        <Cursor path={path} z={130} />
      </Stage>
    </AbsoluteFill>
  );
};

const CastShot: React.FC<{ who: Who; i: number }> = ({ who, i }) => {
  const f = useCurrentFrame(), flipIn = 1 - ramp(f, 0, 16, inOut), flipOut = ramp(f, SHOT - 16, SHOT, inOut), dir = i % 2 ? -1 : 1;
  return (
    <AbsoluteFill style={{ background: W.bg }}>
      <Headline><Pop text={who.line} at={SPEAK_AT - 6} size={64} /></Headline>
      <AbsoluteFill style={{ perspective: 2400 }}>
        <div style={{ position: "absolute", left: "50%", top: 150, transformStyle: "preserve-3d",
          transform: `translateX(-50%) rotateX(${8 - 2 * Math.sin(f / 40)}deg) rotateY(${dir * (8 - f * 0.05) + dir * 90 * flipIn - dir * 90 * flipOut}deg)` }}>
          <Post who={who} card={600} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Grid: React.FC = () => {
  const f = useCurrentFrame(), pull = ramp(f, 0, 70, inOut);
  const cells = CAST.map((c, i) => ({ c, x: (i % 5) * 244, y: Math.floor(i / 5) * 268 }));
  return (
    <AbsoluteFill style={{ background: W.bg }}>
      <Headline>
        <Pop text="Any VRChat avatar." at={10} until={84} size={64} />
        <Pop text="In every post." at={94} size={64} />
      </Headline>
      <Stage rx={22 - 6 * pull} ry={-10 + 4 * pull} rz={2} y={90} scale={1.25 - 0.45 * pull} drift={2}>
        <div style={{ position: "absolute", left: -70, top: 200 }}>
          {cells.map(({ c, x, y }, i) => { const p = ramp(f, i * 4, i * 4 + 16, back);
            return <div key={c.id} style={{ position: "absolute", left: x, top: y, transform: `translateZ(${(1 - p) * -200}px)`, opacity: clamp01(p), borderRadius: 18, boxShadow: SHADOW, overflow: "hidden" }}>
              <AgentCard who={c} size={232} talk={false} from={45 + (i % 5) * 7} />
            </div>; })}
        </div>
      </Stage>
    </AbsoluteFill>
  );
};

const CMD = "blender -b -P vrc-to-glb.py -- avatar.unitypackage avatar.glb";
const How: React.FC = () => {
  const f = useCurrentFrame(), shown = CMD.slice(0, Math.max(0, Math.floor((f - 10) * 2.4)));
  const rows = ["rig · 33 bones", "lip-sync · blink · smile", "textures · 512 px", "ready to embed"];
  return (
    <AbsoluteFill style={{ background: W.bg }}>
      <Headline><Pop text="One command." at={6} size={64} /></Headline>
      <Stage rx={18} ry={12} rz={-1} y={60}>
        <Panel x={110} y={260} w={860} h={420} dark at={2}>
          <div style={{ height: 48, display: "flex", alignItems: "center", gap: 9, padding: "0 18px", borderBottom: `1px solid ${D.line}`, background: D.raise }}>
            {["#ff5f57", "#febc2e", "#28c840"].map(c => <i key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />)}
            <span style={{ marginLeft: 12, font: `500 19px/1 ${UI}`, color: D.dim }}>any coding agent</span>
          </div>
          <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 14, font: `400 22px/1.4 ${MONO}` }}>
            <div style={{ color: D.text }}><span style={{ color: D.dim }}>$ </span>{shown}</div>
            {rows.map((r, k) => { const p = ramp(f, 52 + k * 10, 62 + k * 10); return <div key={r} style={{ color: "#7ee2a8", opacity: p }}>✓ <span style={{ color: D.text }}>{r}</span></div>; })}
          </div>
        </Panel>
      </Stage>
    </AbsoluteFill>
  );
};

const End: React.FC = () => {
  const f = useCurrentFrame(), p = ramp(f, 4, 22, back);
  return (
    <AbsoluteFill style={{ background: W.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
      <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 150, height: 150, opacity: clamp01(p), transform: `scale(${0.7 + 0.3 * p})` }} />
      <Pop text="VRChat avatars" at={14} size={110} />
      <Pop text="on tweetpad agents" at={26} size={64} color={W.dim} />
      <div style={{ height: 14 }} />
      <Pop text="tweetpad.io/agents" at={44} size={54} color={W.blue} />
    </AbsoluteFill>
  );
};

export const TAGLINE = "Bring your avatar. It talks back.";
export const TweetpadVRChat: React.FC = () => {
  loadFonts();
  return (
    <AbsoluteFill style={{ background: W.bg }}>
      <Shot id="open"><Open /></Shot>
      <Shot id="drop"><Drop /></Shot>
      {CAST.map((c, i) => <Shot key={c.id} id={c.id}><CastShot who={c} i={i} /></Shot>)}
      <Shot id="grid"><Grid /></Shot>
      <Shot id="how"><How /></Shot>
      <Shot id="end"><End /></Shot>
    </AbsoluteFill>
  );
};
