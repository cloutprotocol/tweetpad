/**
 * TweetpadAgentsWalkthrough: how tweetpad agents work, with Dot and Bauls. 1080x1080 @30, ~66 s, in the Lights out look (black,
 * hairlines, Inter, accent #1d9bf0). Every screen is a real recording of the live pages (public/agents/*.mp4, recorded in a
 * headless browser with scripted typing and clicks): the /agents claim page, a claim's three steps, Dot researching $WIF in his
 * browser, Top up, a demo agent's editor and its "Build it with your coding agent" view, the review dashboard, and Bauls, in his
 * own code, on his page and inside an X post.
 * CLAIMS: agents are AI agents and say so; "Runs on Grok" in text only, no X / xAI / Grok logos, no partnership; Bauls's hooks are
 * "coming soon on bordrless.app", nothing more; no price talk. The demo agent (demo-bot) and its key were made for this film and
 * removed after.
 */
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFonts } from "../brand/fonts";
import { FONTS } from "../brand/tokens";

const LO = { bg: "#000", raise: "#16181c", line: "#2f3336", text: "#e7e9ea", dim: "#71767b", blue: "#1d9bf0", green: "#00ba7c" } as const;
const ease = Easing.bezier(0.22, 0.61, 0.36, 1);
const fade = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

/* the scenes, in frames: each a recording (clip, from second, length) under a caption */
type Scene = { id: string; n?: string; head: string; sub: string; clip?: string; from?: number; url?: string; len: number; post?: boolean };
const SCENES: Scene[] = [
  { id: "title", head: "tweetpad agents", sub: "AI agents that live inside X posts.", len: 90 },
  { id: "landing", n: "1", head: "Claim one with a tweet", sub: "Pick a name. No wallet needed.", clip: "landing", from: 0.4, url: "tweetpad.io/agents", len: 135 },
  { id: "claim", n: "1", head: "Claim one with a tweet", sub: "Hold the name, post the tweet, paste its link. It’s yours.", clip: "claim", from: 0.8, url: "tweetpad.io/a/my-agent", len: 195 },
  { id: "dot", n: "2", head: "Talk to it, in the post", sub: "Dot, a starter agent: runs on Grok, researches tokens in its own live browser.", clip: "dot", from: 2.5, url: "tweetpad.io/a/dot", len: 390 },
  { id: "topup", n: "3", head: "Anyone keeps it running", sub: "Top it up with SOL, or burn $TP for 20% more.", clip: "topup", from: 0.6, url: "tweetpad.io/a/dot", len: 180 },
  { id: "build", n: "4", head: "Bring your own code", sub: "Give the skill file and prompt to your coding agent. It builds, checks and uploads.", clip: "build", from: 0.6, url: "tweetpad.io/a/demo-bot", len: 360 },
  { id: "review", n: "5", head: "Checked before it goes live", sub: "A locked sandbox, a safety check, then a person approves it.", clip: "review", from: 0.8, url: "tweetpad.io/agents/review", len: 225 },
  { id: "bauls", n: "★", head: "Bauls, in his own code", sub: "3D, dithered, swinging from his stem. His hooks: coming soon on bordrless.app.", clip: "bauls", from: 1.5, url: "tweetpad.io/a/bauls", len: 330 },
  { id: "post", n: "★", head: "Living inside the post", sub: "Every post with his link plays him, right on the timeline.", clip: "bauls-embed", from: 1, len: 210, post: true },
  { id: "end", head: "Claim yours", sub: "tweetpad.io/agents", len: 120 },
];
export const AGENTS_WALK_TOTAL = SCENES.reduce((t, s) => t + s.len, 0);
const STARTS = SCENES.map((_, i) => SCENES.slice(0, i).reduce((t, s) => t + s.len, 0));

const Field: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: LO.bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: -60, opacity: 0.5, backgroundImage: `linear-gradient(${LO.raise} 1px, transparent 1px), linear-gradient(90deg, ${LO.raise} 1px, transparent 1px)`,
        backgroundSize: "60px 60px", translate: `${-(f * 0.08) % 60}px ${-(f * 0.08) % 60}px` }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(48% 42% at 50% 62%, rgba(29,155,240,.18), transparent 72%)" }} />
    </AbsoluteFill>
  );
};

const Caption: React.FC<{ s: Scene; t: number }> = ({ s, t }) => (
  <div style={{ position: "absolute", left: 80, right: 80, top: 52, opacity: t, transform: `translateY(${(1 - t) * 18}px)` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      {s.n && <span style={{ width: 52, height: 52, borderRadius: 14, display: "grid", placeItems: "center", background: LO.blue, color: "#fff", font: `800 28px/1 ${FONTS.ui}` }}>{s.n}</span>}
      <span style={{ font: `800 50px/1.05 ${FONTS.ui}`, color: LO.text, letterSpacing: "-0.02em" }}>{s.head}</span>
    </div>
    <div style={{ marginTop: 14, font: `500 26px/1.35 ${FONTS.ui}`, color: LO.dim, maxWidth: 900 }}>{s.sub}</div>
  </div>
);

/* a browser window around a recording: 1000×820 pages shown at 920 wide */
const Window: React.FC<{ s: Scene; t: number }> = ({ s, t }) => {
  const W = 920, H = Math.round(W * 820 / 1000);
  return (
    <div style={{ position: "absolute", left: (1080 - W) / 2, top: 236, width: W, borderRadius: 18, overflow: "hidden", background: LO.raise, border: `1px solid ${LO.line}`,
      boxShadow: "0 30px 80px rgba(0,0,0,.6)", opacity: t, transform: `translateY(${(1 - t) * 40}px) scale(${0.97 + 0.03 * t})` }}>
      <div style={{ height: 44, display: "flex", alignItems: "center", gap: 8, padding: "0 16px", borderBottom: `1px solid ${LO.line}` }}>
        {["#ff5f57", "#febc2e", "#28c840"].map(c => <i key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />)}
        <span style={{ marginLeft: 14, flex: 1, height: 28, borderRadius: 9, background: "#0f1011", display: "flex", alignItems: "center", padding: "0 12px", font: `500 16px/1 ${FONTS.ui}`, color: "#c9cdd2" }}>🔒 {s.url}</span>
      </div>
      <div style={{ width: W, height: H, position: "relative" }}>
        <OffthreadVideo src={staticFile(`agents/${s.clip}.mp4`)} startFrom={Math.round((s.from || 0) * 30)} muted style={{ width: W, height: H, display: "block" }} />
      </div>
    </div>
  );
};

/* an X post, Lights out, with Bauls's card playing in it */
const Post: React.FC<{ s: Scene; t: number }> = ({ s, t }) => {
  const C = 560;
  return (
    <div style={{ position: "absolute", left: (1080 - 640) / 2, top: 230, width: 640, padding: "18px 22px 14px", borderRadius: 18, background: LO.bg, border: `1px solid ${LO.line}`,
      boxShadow: "0 30px 80px rgba(0,0,0,.6)", opacity: t, transform: `translateY(${(1 - t) * 40}px)` }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 24, background: "#e3e3df", display: "grid", placeItems: "center", font: `800 22px/1 ${FONTS.ui}`, color: "#111" }}>b</div>
        <div><div style={{ font: `700 19px/1.2 ${FONTS.ui}`, color: LO.text }}>bauls</div><div style={{ font: `500 17px/1.2 ${FONTS.ui}`, color: LO.dim }}>@contractbauls · 2m</div></div>
      </div>
      <div style={{ margin: "12px 0 12px", font: `500 21px/1.35 ${FONTS.ui}`, color: LO.text }}>hey, it’s me. say hi <span style={{ color: LO.blue }}>tweetpad.io/a/bauls</span></div>
      <div style={{ width: C, height: C, margin: "0 auto", borderRadius: 16, overflow: "hidden", border: `1px solid ${LO.line}` }}>
        <OffthreadVideo src={staticFile(`agents/${s.clip}.mp4`)} startFrom={Math.round((s.from || 0) * 30)} muted style={{ width: C, height: C, display: "block" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 30px 0", font: `500 17px/1 ${FONTS.ui}`, color: LO.dim }}>
        <span>💬 12</span><span>🔁 31</span><span>♡ 208</span><span>↗</span>
      </div>
    </div>
  );
};

const Title: React.FC<{ s: Scene; end?: boolean }> = ({ s, end }) => {
  const f = useCurrentFrame(), t = fade(f, 4, 26), u = fade(f, 16, 40), out = 1 - fade(f, s.len - 12, s.len);
  return (
    <AbsoluteFill style={{ display: "grid", placeItems: "center", opacity: out }}>
      <div style={{ textAlign: "center" }}>
        <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 150, height: 150, opacity: t, transform: `scale(${0.8 + 0.2 * t})` }} />
        <div style={{ marginTop: 26, font: `800 ${end ? 92 : 86}px/1 ${FONTS.ui}`, color: LO.text, letterSpacing: "-0.03em", opacity: t, transform: `translateY(${(1 - t) * 20}px)` }}>{s.head}</div>
        <div style={{ marginTop: 22, font: `600 ${end ? 40 : 34}px/1.3 ${FONTS.ui}`, color: end ? LO.blue : LO.dim, opacity: u }}>{s.sub}</div>
        {!end && <div style={{ marginTop: 34, display: "inline-flex", gap: 12, opacity: u }}>
          {["Claim with a tweet", "Bring your own code", "Runs on Grok"].map(x => <span key={x} style={{ padding: "10px 18px", borderRadius: 99, border: `1px solid ${LO.line}`, font: `600 20px/1 ${FONTS.ui}`, color: LO.text }}>{x}</span>)}
        </div>}
      </div>
    </AbsoluteFill>
  );
};

const Shot: React.FC<{ s: Scene; caption: boolean }> = ({ s, caption }) => {
  const f = useCurrentFrame(), t = fade(f, 0, 16), out = 1 - fade(f, s.len - 10, s.len);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Caption s={s} t={caption ? t : 1} />
      {s.post ? <Post s={s} t={t} /> : <Window s={s} t={t} />}
    </AbsoluteFill>
  );
};

export const TweetpadAgentsWalkthrough: React.FC = () => {
  loadFonts();
  return (
    <AbsoluteFill style={{ background: LO.bg }}>
      <Field />
      {SCENES.map((s, i) => (
        <Sequence key={s.id} name={s.id} from={STARTS[i]} durationInFrames={s.len}>
          {s.id === "title" ? <Title s={s} /> : s.id === "end" ? <Title s={s} end /> : <Shot s={s} caption={!SCENES[i - 1] || SCENES[i - 1].head !== s.head} />}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
