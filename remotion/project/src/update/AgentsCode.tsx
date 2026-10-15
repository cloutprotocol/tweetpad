/**
 * TweetpadAgentsCode: bring your own code to a tweetpad agent. 1080x1080 @30, ~40 s. A third agents film (AgentsWalkthrough.tsx and
 * AgentsLaunch.tsx stay as they are), on white, in 2.5D: the interface sits on tilted planes and a cursor clicks through it, while
 * one short line pops in at a time.
 *   Intro   "Your agent." "Your code."
 *   Copy    the agent's page after a claim: the cursor copies the prompt
 *   Paste   a coding agent: the prompt is pasted and sent; it reads the skill, saves the key and writes agent.html
 *   Swap    the agent's assets: the character is replaced (Dot's starter ball out, a three.js sculpture in), then the palette and the
 *           persona; the preview follows each click
 *   Ship    upload, the checks, under review, live
 *   Share   the post goes out with the agent playing in it; the camera pulls back over a timeline of posts
 *   Trader  an agent that runs its owner's rules and explains each trade on Grok
 *   Deployer an agent that launches a coin from a reply, its name and image drafted by Grok
 *   End     tweetpad × Grok, "tweetpad agents, powered by Grok", "Claim yours." tweetpad.io/agents
 * The previews are three.js (ThreeCanvas): Dot is a glossy ball; the sculpture is metaballs, ordered-dithered into four tones like
 * Bauls. CLAIMS: "atelier" is an idea, not a live agent. Code and steps match the kit (sdk.js: tp.ready, tp.on, tp.ask, tp.say;
 * SKILL.md: key in .tweetpad/<name>.key, a check, then upload, then review). The trader and deployer act on their own, which the kit
 * can't do yet: they carry ROADMAP's tag until it ships. The Grok mark is used at the owner's request; no coding-agent brand; no emoji.
 */
import React, { useMemo } from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import { loadFonts } from "../brand/fonts";
import { FONTS } from "../brand/tokens";

export const W = { bg: "#ffffff", ink: "#0a0a0a", dim: "#6e6e73", line: "#e8e8ea", soft: "#f5f5f7", blue: "#1d9bf0", green: "#22a55b", amber: "#e9a23b" } as const;
export const D = { bg: "#0d0f12", raise: "#16181c", line: "#2a2d31", text: "#e7e9ea", dim: "#8b98a5" } as const;
export const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace', UI = FONTS.ui;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const outCubic = (x: number) => 1 - (1 - clamp01(x)) ** 3;
export const inOut = (x: number) => { const t = clamp01(x); return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; };
export const back = (x: number) => { const t = clamp01(x), c = 1.5; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
export const ramp = (f: number, a: number, b: number, e: (x: number) => number = outCubic) => e((f - a) / (b - a));
export const SHADOW = "0 60px 120px -30px rgba(0,0,0,.28), 0 30px 60px -30px rgba(0,0,0,.25), 0 0 0 1px rgba(0,0,0,.04)";

/* ---------- the timeline, in frames: each shot overlaps the next by X ---------- */
const X = 12;
const LENS = { intro: 84, copy: 150, paste: 196, swap: 244, ship: 170, share: 286, trader: 246, deployer: 256, end: 200 } as const;
type Id = keyof typeof LENS;
const T = (() => {
  const out = {} as Record<Id, { from: number; len: number }>; let at = 0;
  (Object.keys(LENS) as Id[]).forEach((k) => { out[k] = { from: at, len: LENS[k] }; at += LENS[k] - X; });
  return out;
})();
export const AGENTS_CODE_TOTAL = T.end.from + T.end.len;

/* a shot comes forward out of the white and goes back into it */
const Depth: React.FC<{ len: number; first?: boolean; last?: boolean; children: React.ReactNode }> = ({ len, first, last, children }) => {
  const f = useCurrentFrame(), p = first ? 1 : ramp(f, 0, X + 6, inOut), q = last ? 0 : ramp(f, len - X - 6, len, inOut);
  return <AbsoluteFill style={{ opacity: p * (1 - q), transform: `scale(${(0.94 + 0.06 * p) * (1 + 0.06 * q)})`, filter: p < 1 || q > 0 ? `blur(${(1 - p + q) * 8}px)` : undefined }}>{children}</AbsoluteFill>;
};
const Shot: React.FC<{ id: Id; children: React.ReactNode }> = ({ id, children }) => (
  <Sequence name={id} from={T[id].from} durationInFrames={T[id].len}><Depth len={T[id].len} first={id === "intro"} last={id === "end"}>{children}</Depth></Sequence>
);

/* ---------- words that pop in, one line at a time ---------- */
export const Pop: React.FC<{ text: string; at: number; size?: number; color?: string; until?: number }> = ({ text, at, size = 62, color = W.ink, until }) => {
  const f = useCurrentFrame(), p = ramp(f, at, at + 14, back), o = ramp(f, at, at + 8), gone = until ? ramp(f, until, until + 10) : 0;
  return (
    <div style={{ font: `800 ${size}px/1.05 ${UI}`, color, letterSpacing: "-0.035em", textAlign: "center", opacity: o * (1 - gone),
      transform: `translateY(${(1 - p) * 20 - gone * 20}px) scale(${0.7 + 0.3 * p})`, filter: o < 1 ? `blur(${(1 - o) * 8}px)` : undefined }}>{text}</div>
  );
};
export const Headline: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", left: 80, right: 80, top: 70, display: "grid", placeItems: "center", zIndex: 10 }}>
    {React.Children.map(children, (c) => <div style={{ gridArea: "1 / 1" }}>{c}</div>)}
  </div>
);

/* ---------- the 2.5D stage: a tilted plane in perspective that drifts; panels sit on it at their own depth ---------- */
export const Stage: React.FC<{ rx: number; ry: number; rz?: number; drift?: number; scale?: number; y?: number; children: React.ReactNode }> = ({ rx, ry, rz = 0, drift = 3, scale = 1, y = 60, children }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ perspective: 2400, perspectiveOrigin: "50% 40%" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1080, transformStyle: "preserve-3d",
        transform: `translateY(${y}px) scale(${scale}) rotateX(${rx - drift * 0.4 * Math.sin(f / 70)}deg) rotateY(${ry + drift * (f / 240)}deg) rotateZ(${rz}deg)` }}>{children}</div>
    </AbsoluteFill>
  );
};
export const Panel: React.FC<{ x: number; y: number; w: number; h?: number; z?: number; at?: number; dark?: boolean; out?: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, w, h, z = 0, at = 0, dark, out, children, style }) => {
  const f = useCurrentFrame(), p = ramp(f, at, at + 20, outCubic), q = out != null ? ramp(f, out, out + 16, inOut) : 0;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 22, overflow: "hidden", background: dark ? D.bg : W.bg, border: `1px solid ${dark ? D.line : W.line}`,
      boxShadow: SHADOW, opacity: p * (1 - q), transform: `translateZ(${z - (1 - p) * 220 - q * 260}px)`, ...style }}>{children}</div>
  );
};

/* ---------- the cursor: it glides between points on the stage and clicks ---------- */
export type Pt = { f: number; x: number; y: number; click?: boolean };
export const Cursor: React.FC<{ path: Pt[]; z?: number }> = ({ path, z = 120 }) => {
  const f = useCurrentFrame();
  let x = path[0].x, y = path[0].y;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    if (f >= a.f) { const t = ramp(f, a.f, b.f, inOut); x = a.x + (b.x - a.x) * t; y = a.y + (b.y - a.y) * t; }
  }
  const click = path.filter((p) => p.click).map((p) => f - p.f).find((d) => d >= 0 && d < 18);
  const press = click != null ? 1 - 0.18 * Math.sin(Math.min(1, click / 8) * Math.PI) : 1;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translateZ(${z}px)`, opacity: ramp(f, path[0].f, path[0].f + 8), pointerEvents: "none" }}>
      {click != null && <div style={{ position: "absolute", left: -30, top: -30, width: 60, height: 60, borderRadius: 30, border: `3px solid ${W.blue}`,
        opacity: 1 - click / 18, transform: `scale(${0.4 + click / 12})` }} />}
      <svg width={44} height={52} viewBox="0 0 22 26" style={{ position: "absolute", left: -4, top: -3, transform: `scale(${press})`, transformOrigin: "4px 3px", filter: "drop-shadow(0 6px 10px rgba(0,0,0,.3))" }}>
        <path d="M2 1.5 L2 20 L7 15.5 L10.4 23.4 L13.6 22 L10.3 14.3 L17 14.3 Z" fill={W.ink} stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/* ---------- code, highlighted ---------- */
const hl = (line: string) => line.split(/('[^']*'|`[^`]*`|"[^"]*"|\b(?:import|from|await|async|const|tp|as)\b|\/\/.*$)/).map((part, i) => {
  if (!part) return null;
  const c = /^['"`]/.test(part) ? "#9be38a" : part.startsWith("//") ? "#6b7785" : part === "tp" ? "#5cc4ff" : /^(import|from|await|async|const|as)$/.test(part) ? "#ff7ab2" : undefined;
  return <span key={i} style={{ color: c }}>{part}</span>;
});
const typed = (f: number, at: number, text: string, cps = 1.4) => text.slice(0, Math.max(0, Math.floor((f - at) * cps)));

/* ======================================================================================================================
 * The agent, in three.js. Dot's starter ball until `swapAt`, then the sculpture: metaballs, ordered-dithered into four tones.
 * ==================================================================================================================== */
type Ball = [number, number, number, number];
const FORMS: Ball[][] = [
  [[0.5, 0.5, 0.5, 0.62], [0.36, 0.56, 0.5, 0.42], [0.64, 0.44, 0.5, 0.42], [0.5, 0.33, 0.56, 0.32], [0.5, 0.68, 0.44, 0.32]],
  [[0.5, 0.24, 0.5, 0.36], [0.5, 0.4, 0.5, 0.46], [0.5, 0.56, 0.5, 0.52], [0.5, 0.72, 0.5, 0.42], [0.4, 0.62, 0.5, 0.28], [0.62, 0.46, 0.5, 0.28]],
  [[0.42, 0.5, 0.5, 0.7], [0.6, 0.5, 0.5, 0.62]],
  [[0.5, 0.5, 0.28, 0.42], [0.72, 0.5, 0.5, 0.42], [0.5, 0.5, 0.72, 0.42], [0.28, 0.5, 0.5, 0.42], [0.5, 0.5, 0.5, 0.32]],
];
const PALETTES = [
  ["#07070b", "#2b2546", "#8f80ff", "#f1eeff"],   // violet
  ["#0a0606", "#3e1c14", "#e0703d", "#fff0e0"],   // ember
  ["#05090b", "#11333a", "#3fb8b1", "#e5fbf8"],   // tide
];
const VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FRAG = `
  uniform sampler2D hi; uniform sampler2D lo; uniform vec2 res; uniform float amt;
  uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; varying vec2 vUv;
  float b2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
  float b4(vec2 a) { return b2(0.5 * a) * 0.25 + b2(a); }
  void main() {
    vec2 px = floor(vUv * res);
    vec3 col = texture2D(lo, (px + 0.5) / res).rgb;
    float l = pow(dot(col, vec3(0.299, 0.587, 0.114)), 0.8);
    float v = floor(clamp(l * 3.0 + (b4(px) - 0.5) * 0.95, 0.0, 3.0) + 0.5);
    vec3 d = v < 0.5 ? c0 : v < 1.5 ? c1 : v < 2.5 ? c2 : c3;
    gl_FragColor = vec4(mix(texture2D(hi, vUv).rgb, d, amt), 1.0);
  }`;
const LOW = 170;

const Agent3D: React.FC<{ size: number; swapAt: number; palettes: [number, number][] }> = ({ size, swapAt, palettes }) => {
  const f = useCurrentFrame(), { gl, scene, camera } = useThree();
  const mc = useMemo(() => { const m = new MarchingCubes(40, new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.32, metalness: 0.08 }), false, false, 60000); m.isolation = 80; return m; }, []);
  const dot = useMemo(() => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshPhysicalMaterial({ color: "#f2f2f2", roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 })));
    [-1, 1].forEach((s) => {
      const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.2, 6, 16), new THREE.MeshStandardMaterial({ color: "#050505", roughness: 0.4 }));
      e.position.set(0.27 * s, 0.1, 0.94); e.rotation.z = 0.22 * s; e.rotation.x = -0.1; g.add(e);
    });
    return g;
  }, []);
  const hi = useMemo(() => new THREE.WebGLRenderTarget(size, size, { samples: 4 }), [size]);
  const lo = useMemo(() => new THREE.WebGLRenderTarget(LOW, LOW, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }), []);
  const post = useMemo(() => {
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, depthTest: false,
      uniforms: { hi: { value: hi.texture }, lo: { value: lo.texture }, res: { value: new THREE.Vector2(LOW, LOW) }, amt: { value: 0 },
        c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() } } });
    const s = new THREE.Scene(); s.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    return { s, mat, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, [hi, lo]);

  /* the swap: Dot shrinks away, the sculpture grows in, the dither comes up */
  const dotS = 1 - ramp(f, swapAt, swapAt + 16, inOut), sculS = ramp(f, swapAt + 10, swapAt + 38, back);
  dot.visible = dotS > 0.001; dot.scale.setScalar(Math.max(0.001, dotS)); dot.rotation.set(0.05 * Math.sin(f / 40), 0.25 * Math.sin(f / 55), 0);
  dot.position.y = 0.05 * Math.sin(f / 22);
  mc.visible = sculS > 0.001; mc.scale.setScalar(2 * Math.max(0.001, sculS));
  const k = Math.floor(Math.max(0, f) / 110) % FORMS.length, t = ramp(f % 110, 50, 100, inOut), A = FORMS[k], B = FORMS[(k + 1) % FORMS.length];
  mc.reset();
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const a = A[i] || [0.5, 0.5, 0.5, 0], b = B[i] || [0.5, 0.5, 0.5, 0];
    const s = a[3] + (b[3] - a[3]) * t;
    if (s > 0.01) mc.addBall(a[0] + (b[0] - a[0]) * t + 0.025 * Math.sin(f / 31 + i * 1.7), a[1] + (b[1] - a[1]) * t + 0.025 * Math.cos(f / 37 + i * 2.3), a[2] + (b[2] - a[2]) * t, s, 12);
  }
  mc.update(); mc.rotation.set(0.25 * Math.sin(f / 140), f / 90, 0);
  post.mat.uniforms.amt.value = ramp(f, swapAt + 6, swapAt + 26);
  /* the palette: eased from the one before to the latest one picked */
  let from = palettes[0][1], to = palettes[0][1], pt = 1;
  palettes.forEach(([at, p], i) => { if (f >= at && i > 0) { from = palettes[i - 1][1]; to = p; pt = ramp(f, at, at + 26, inOut); } });
  (["c0", "c1", "c2", "c3"] as const).forEach((c, i) => (post.mat.uniforms[c].value as THREE.Color).set(PALETTES[from][i]).lerp(new THREE.Color(PALETTES[to][i]), pt));

  useFrame(() => {
    gl.setClearColor("#0b0b0d", 1);
    gl.setRenderTarget(hi); gl.clear(); gl.render(scene, camera);
    gl.setRenderTarget(lo); gl.clear(); gl.render(scene, camera);
    gl.setRenderTarget(null); gl.render(post.s, post.cam);
  }, 1);
  return (
    <>
      <primitive object={dot} />
      <primitive object={mc} />
      <hemisphereLight args={["#ffffff", "#30303a", 0.6]} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} />
      <directionalLight position={[-4, 1.5, -3]} intensity={1.4} />
    </>
  );
};
const AgentView: React.FC<{ size: number; swapAt: number; palettes: [number, number][] }> = ({ size, swapAt, palettes }) => (
  <ThreeCanvas width={size} height={size} camera={{ position: [0, 0, 5.4], fov: 34 }} gl={{ antialias: true }}>
    <Agent3D size={size} swapAt={swapAt} palettes={palettes} />
  </ThreeCanvas>
);
/* its speech bubble, over the preview */
const Bubble: React.FC<{ text: string; at: number; size?: number; low?: boolean }> = ({ text, at, size = 20, low }) => {
  const f = useCurrentFrame(), p = ramp(f, at, at + 12, back);
  return f < at ? null : (
    <div style={{ position: "absolute", left: 0, right: 0, ...(low ? { bottom: 22 } : { top: 18 }), display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: "80%", padding: "10px 16px", borderRadius: 14, background: "rgba(255,255,255,.96)", color: W.ink, font: `600 ${size}px/1.3 ${UI}`, textAlign: "center",
        opacity: clamp01(p), transform: `translateY(${(1 - p) * 10}px) scale(${0.9 + 0.1 * p})` }}>{text}</div>
    </div>
  );
};

/* ======================================================================================================================
 * The shots
 * ==================================================================================================================== */
const Intro: React.FC = () => (
  <AbsoluteFill style={{ background: W.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
    <Pop text="Your agent." at={6} size={130} />
    <Pop text="Your code." at={24} size={130} color={W.blue} />
  </AbsoluteFill>
);

const PROMPT = 'Connect to my tweetpad agent "atelier" using the skill at tweetpad.io/kit/v1/SKILL.md. My edit key is tpk_7c1e…9a4f: save it to .tweetpad/atelier.key, keep it out of git and never print it.';
const Copy: React.FC = () => {
  const f = useCurrentFrame(), copied = f >= 50;
  return (
    <AbsoluteFill style={{ background: W.bg }}>
      <Headline><Pop text="Copy the prompt." at={6} /></Headline>
      <Stage rx={20} ry={-16} rz={2}>
        <Panel x={140} y={210} w={800} h={640} at={2}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, padding: 40 }}>
            <div style={{ alignSelf: "flex-start", padding: "8px 14px", borderRadius: 99, background: W.soft, font: `500 18px/1 ${UI}`, color: W.dim }}>tweetpad.io/a/atelier</div>
            <div style={{ font: `800 46px/1.05 ${UI}`, color: W.ink, letterSpacing: "-0.03em" }}>atelier is yours.</div>
            <div style={{ padding: "18px 20px", borderRadius: 12, background: W.soft, font: `400 24px/1 ${MONO}`, color: W.ink }}>tpk_7c1e••••••••••••••••9a4f</div>
            <div style={{ padding: "18px 20px", borderRadius: 12, border: `1px solid ${W.line}`, font: `400 17px/1.55 ${MONO}`, color: W.dim, height: 150, overflow: "hidden",
              background: copied ? `rgba(29,155,240,${0.12 * (1 - ramp(f, 60, 110))})` : undefined }}>{PROMPT}</div>
            <div style={{ display: "flex", gap: 20 }}>
              <span style={{ width: 340, padding: "20px 0", borderRadius: 99, textAlign: "center", border: `1px solid ${W.line}`, color: W.ink, font: `700 22px/1 ${UI}` }}>Download skill file + key</span>
              <span style={{ width: 340, padding: "20px 0", borderRadius: 99, textAlign: "center", background: W.ink, color: "#fff", font: `700 22px/1 ${UI}`,
                transform: `scale(${f >= 46 && f < 56 ? 0.96 : 1})` }}>{copied ? "Copied" : "Copy the prompt"}</span>
            </div>
          </div>
        </Panel>
        <Cursor path={[{ f: 8, x: 1000, y: 1040 }, { f: 42, x: 710, y: 784 }, { f: 46, x: 710, y: 784, click: true }, { f: 90, x: 820, y: 900 }]} />
      </Stage>
    </AbsoluteFill>
  );
};

const CODE = ["<script type=\"module\">", "  import { tp } from '/kit/v1/sdk.js';", "  import { sculpture } from './atelier.js';", "  await tp.ready;", "  tp.on('message', async ({ text }) => {", "    const { reply } = await tp.ask(text);", "    sculpture.react(reply); tp.say(reply);", "  });", "</script>"];
const Paste: React.FC = () => {
  const f = useCurrentFrame(), pasted = f >= 30, sent = f >= 48;
  const out = ["read SKILL.md", "saved the key to .tweetpad/atelier.key", "writing agent.html"];
  return (
    <AbsoluteFill style={{ background: W.bg }}>
      <Headline><Pop text="Paste it into any coding agent." at={6} size={58} /></Headline>
      <Stage rx={18} ry={14} rz={-2} y={40}>
        <Panel x={100} y={200} w={860} h={470} dark at={2}>
          <div style={{ height: 50, display: "flex", alignItems: "center", gap: 9, padding: "0 18px", borderBottom: `1px solid ${D.line}`, background: D.raise }}>
            {["#ff5f57", "#febc2e", "#28c840"].map(c => <i key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />)}
            <span style={{ marginLeft: 12, font: `500 19px/1 ${UI}`, color: D.dim }}>your coding agent</span>
          </div>
          <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ font: `400 20px/1.5 ${MONO}`, color: D.text, minHeight: 120, padding: 12, borderRadius: 10, border: `1px solid ${f >= 22 && !sent ? "#3a7bd5" : D.line}`,
              background: pasted && !sent ? `rgba(29,155,240,${0.18 * (1 - ramp(f, 30, 44))})` : undefined }}>
              <span style={{ color: "#5cc4ff" }}>› </span>{pasted ? PROMPT : ""}
            </div>
            {out.map((t, k) => { const at = 58 + k * 14, p = ramp(f, at, at + 10);
              return <div key={t} style={{ font: `400 20px/1.2 ${MONO}`, color: k === 2 ? "#e8d9a8" : "#7ee2a8", opacity: p, transform: `translateX(${(1 - p) * -12}px)` }}>{k === 2 ? "…" : "✓"} <span style={{ color: D.text }}>{t}</span></div>; })}
          </div>
        </Panel>
        {sent && f < 64 && <div style={{ position: "absolute", left: 822, top: 330, transform: `translateZ(140px) scale(${f < 54 ? 0.92 : 1})`, padding: "12px 18px", borderRadius: 12, background: "#fff",
          boxShadow: SHADOW, font: `700 26px/1 ${UI}`, color: W.ink }}>⏎</div>}
        <Panel x={420} y={560} w={600} h={420} dark z={90} at={100}>
          <div style={{ height: 44, display: "flex", alignItems: "center", padding: "0 18px", borderBottom: `1px solid ${D.line}`, background: D.raise, font: `500 18px/1 ${UI}`, color: D.dim }}>agent.html</div>
          <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 4 }}>
            {CODE.map((line, i) => <div key={i} style={{ font: `400 17px/1.5 ${MONO}`, color: D.text, whiteSpace: "pre", opacity: f >= 110 + i * 6 ? 1 : 0 }}>{hl(typed(f, 110 + i * 6, line, 4))}</div>)}
          </div>
        </Panel>
        <Cursor path={[{ f: 6, x: 980, y: 1000 }, { f: 22, x: 520, y: 330, click: true }, { f: 30, x: 520, y: 330 }, { f: 44, x: 860, y: 350, click: true }, { f: 80, x: 940, y: 470 }]} />
      </Stage>
    </AbsoluteFill>
  );
};

/* the assets panel: each row swaps when it's clicked */
const Row: React.FC<{ label: string; before: React.ReactNode; after: React.ReactNode; at: number }> = ({ label, before, after, at }) => {
  const f = useCurrentFrame(), t = ramp(f, at, at + 14, inOut);
  return (
    <div style={{ height: 112, display: "flex", alignItems: "center", gap: 18, padding: "0 26px", borderTop: `1px solid ${W.line}` }}>
      <div style={{ width: 96, font: `600 17px/1 ${UI}`, color: W.dim }}>{label}</div>
      <div style={{ flex: 1, position: "relative", height: 60 }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 12, opacity: 1 - t, transform: `translateY(${-t * 16}px)` }}>{before}</div>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 12, opacity: t, transform: `translateY(${(1 - t) * 16}px)` }}>{after}</div>
      </div>
      <div style={{ padding: "10px 16px", borderRadius: 99, border: `1px solid ${W.line}`, font: `700 16px/1 ${UI}`, color: W.ink, transform: `scale(${f >= at - 4 && f < at + 6 ? 0.94 : 1})` }}>Replace</div>
    </div>
  );
};
const chips = (cols: string[]) => <div style={{ display: "flex", gap: 6 }}>{cols.map((c) => <i key={c} style={{ width: 30, height: 30, borderRadius: 8, background: c, border: `1px solid ${W.line}` }} />)}</div>;
const thumb = (bg: string) => <i style={{ width: 52, height: 52, borderRadius: 14, background: bg, flex: "none", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)" }} />;
const name = (a: string, b: string) => <div><div style={{ font: `700 19px/1.2 ${UI}`, color: W.ink }}>{a}</div><div style={{ font: `500 15px/1.2 ${MONO}`, color: W.dim }}>{b}</div></div>;
const SWAP_CHAR = 40, SWAP_PAL = 112, SWAP_VOICE = 172;
const Swap: React.FC = () => (
  <AbsoluteFill style={{ background: W.bg }}>
    <Headline><Pop text="Swap in your own." at={6} /></Headline>
    <Stage rx={16} ry={-20} rz={1} y={50}>
      <Panel x={70} y={230} w={500} h={560} at={2}>
        <div style={{ padding: "26px 26px 20px", font: `800 26px/1 ${UI}`, color: W.ink, letterSpacing: "-0.02em" }}>atelier · assets</div>
        <Row label="Character" at={SWAP_CHAR}
          before={<>{thumb("radial-gradient(circle at 40% 35%, #fff, #d7d7d7 60%, #9a9a9a)")}{name("Dot", "starter look")}</>}
          after={<>{thumb("radial-gradient(circle at 40% 35%, #f1eeff, #8f80ff 45%, #2b2546 80%)")}{name("Sculpture", "atelier.js · three.js")}</>} />
        <Row label="Palette" at={SWAP_PAL} before={chips(PALETTES[0])} after={chips(PALETTES[1])} />
        <Row label="Persona" at={SWAP_VOICE} before={name("Friendly guide", "starter persona")} after={name("A sculpture that listens", "persona.md")} />
        <Row label="Browser" at={9999} before={name("Off", "research browser")} after={null} />
      </Panel>
      <Panel x={610} y={200} w={420} h={420} dark z={70} at={8}>
        <AgentView size={420} swapAt={SWAP_CHAR + 2} palettes={[[0, 0], [SWAP_PAL + 2, 1]]} />
        <Bubble text="A sculpture that listens." at={SWAP_VOICE + 6} />
      </Panel>
      <Cursor path={[{ f: 10, x: 1000, y: 1020 }, { f: 34, x: 522, y: 377 }, { f: 38, x: 522, y: 377, click: true }, { f: 104, x: 522, y: 489 }, { f: 108, x: 522, y: 489, click: true },
        { f: 164, x: 522, y: 601 }, { f: 168, x: 522, y: 601, click: true }, { f: 220, x: 780, y: 720 }]} />
    </Stage>
  </AbsoluteFill>
);

const Ship: React.FC = () => {
  const f = useCurrentFrame(), checks = ["Static rules", "AI read", "Sandbox: no network, storage or wallet"], live = ramp(f, 126, 138, inOut);
  return (
    <AbsoluteFill style={{ background: W.bg }}>
      <Headline>
        <Pop text="Checked." at={40} until={74} />
        <Pop text="Reviewed." at={84} until={118} />
        <Pop text="Live." at={128} color={W.green} />
      </Headline>
      <Stage rx={20} ry={12} rz={-1} y={60}>
        <Panel x={190} y={270} w={700} h={480} at={2}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "30px 32px", borderBottom: `1px solid ${W.line}` }}>
            <i style={{ width: 48, height: 48, borderRadius: 12, background: W.soft, display: "grid", placeItems: "center", font: `700 16px/1 ${MONO}`, color: W.dim, fontStyle: "normal" }}>&lt;/&gt;</i>
            {name("agent.html", "14 KB · one file")}
            <span style={{ marginLeft: "auto", padding: "16px 26px", borderRadius: 99, background: W.ink, color: "#fff", font: `700 20px/1 ${UI}`, transform: `scale(${f >= 28 && f < 38 ? 0.95 : 1})` }}>{f >= 32 ? "Uploaded" : "Upload"}</span>
          </div>
          <div style={{ padding: "22px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
            {checks.map((c, i) => { const p = ramp(f, 44 + i * 10, 56 + i * 10, back);
              return <div key={c} style={{ display: "flex", alignItems: "center", gap: 14, font: `600 22px/1 ${UI}`, color: W.ink, opacity: clamp01(p), transform: `scale(${0.9 + 0.1 * p})`, transformOrigin: "0 50%" }}>
                <i style={{ width: 28, height: 28, borderRadius: 14, background: W.green, color: "#fff", display: "grid", placeItems: "center", font: `800 16px/1 ${UI}`, fontStyle: "normal" }}>✓</i>{c}</div>; })}
          </div>
          <div style={{ position: "absolute", left: 32, bottom: 30, display: "grid" }}>
            {[["Under review", W.amber, 1 - live, 84], ["Live at tweetpad.io/a/atelier", W.green, live, 126]].map(([t, c, o, at]) => (
              <span key={t as string} style={{ gridArea: "1 / 1", display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderRadius: 99, background: W.soft, font: `700 22px/1 ${UI}`, color: W.ink,
                opacity: (o as number) * ramp(f, at as number, (at as number) + 10), transform: `translateY(${(1 - (o as number)) * 10}px)` }}>
                <i style={{ width: 10, height: 10, borderRadius: 5, background: c as string }} />{t}</span>))}
          </div>
        </Panel>
        <Cursor path={[{ f: 6, x: 1000, y: 1020 }, { f: 26, x: 795, y: 348 }, { f: 30, x: 795, y: 348, click: true }, { f: 80, x: 900, y: 660 }]} />
      </Stage>
    </AbsoluteFill>
  );
};

/* a light-mode X post with the agent playing in its card */
const XPost: React.FC<{ live?: boolean; tint?: string; text?: string }> = ({ live, tint, text = "Talk to it." }) => (
  <div style={{ width: 560, padding: "20px 22px 16px", display: "flex", flexDirection: "column", gap: 12, background: "#fff" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <i style={{ width: 44, height: 44, borderRadius: 22, background: "conic-gradient(from 200deg, #3e1c14, #e0703d, #fff0e0, #8f80ff, #3e1c14)" }} />
      <div style={{ font: `700 20px/1.2 ${UI}`, color: W.ink }}>atelier <span style={{ fontWeight: 500, color: W.dim }}>@atelier · now</span></div>
    </div>
    <div style={{ font: `500 20px/1.3 ${UI}`, color: W.ink }}>{text} <span style={{ color: W.blue }}>tweetpad.io/a/atelier</span></div>
    <div style={{ position: "relative", width: 516, height: 516, borderRadius: 16, overflow: "hidden", border: `1px solid ${W.line}`, background: tint || "#0b0b0d" }}>
      {live ? <><AgentView size={516} swapAt={-200} palettes={[[0, 1]]} /><Bubble text="A sculpture that listens. Say something." at={96} size={19} /></>
        : <div style={{ position: "absolute", inset: 0, background: tint }} />}
      <div style={{ position: "absolute", left: 10, right: 10, bottom: 10, display: "flex", gap: 8, padding: 6, borderRadius: 14, background: "rgba(20,22,24,.92)" }}>
        <div style={{ flex: 1, padding: "10px 12px", font: `500 16px/1 ${UI}`, color: "#6b7280" }}>Say something to atelier…</div>
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "#fff", color: "#000", font: `700 15px/1 ${UI}` }}>Send</div>
      </div>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 16px 0", font: `500 16px/1 ${UI}`, color: W.dim }}><span>Reply</span><span>Repost</span><span>Like</span><span>Share</span></div>
  </div>
);
const OTHERS = [
  "radial-gradient(circle at 50% 50%, #8f80ff, #2b2546 45%, #07070b 70%)", "radial-gradient(circle at 45% 55%, #3fb8b1, #11333a 45%, #05090b 70%)",
  "radial-gradient(circle at 55% 45%, #e0703d, #3e1c14 45%, #0a0606 70%)", "radial-gradient(circle at 50% 50%, #f1eeff, #8f80ff 30%, #07070b 68%)",
  "radial-gradient(circle at 50% 50%, #e5fbf8, #3fb8b1 30%, #05090b 68%)", "radial-gradient(circle at 50% 50%, #fff0e0, #e0703d 30%, #0a0606 68%)",
];
const Share: React.FC = () => {
  const f = useCurrentFrame(), posted = f >= 34, pull = ramp(f, 150, 210, inOut);
  return (
    <AbsoluteFill style={{ background: W.bg }}>
      <Headline>
        <Pop text="Share it with the world." at={6} until={146} size={58} />
        <Pop text="One link. Every post." at={160} size={58} />
      </Headline>
      <Stage rx={18 + 8 * pull} ry={-12 + 4 * pull} rz={2} y={80} scale={0.96 - 0.52 * pull}>
        {/* the composer, then the post itself */}
        <Panel x={160} y={190} w={760} h={250} at={2} out={44}>
          <div style={{ display: "flex", gap: 16, padding: 28 }}>
            <i style={{ width: 52, height: 52, borderRadius: 26, flex: "none", background: "conic-gradient(from 200deg, #3e1c14, #e0703d, #fff0e0, #8f80ff, #3e1c14)" }} />
            <div style={{ font: `500 28px/1.35 ${UI}`, color: W.ink }}>Talk to it. <span style={{ color: W.blue }}>tweetpad.io/a/atelier</span></div>
          </div>
          <div style={{ position: "absolute", right: 28, bottom: 26, padding: "16px 30px", borderRadius: 99, background: W.ink, color: "#fff", font: `700 22px/1 ${UI}`, transform: `scale(${f >= 28 && f < 38 ? 0.94 : 1})` }}>{posted ? "Posted" : "Post"}</div>
        </Panel>
        <Panel x={260} y={130} w={560} z={40} at={48}><XPost live /></Panel>
        {/* the timeline around it, as the camera pulls back */}
        {[[-380, 60], [900, 60], [-380, 760], [900, 760], [260, -620], [260, 1020], [-1020, 410], [1540, 410]].map(([x, y], i) => (
          <Panel key={i} x={x} y={y} w={560} at={150 + i * 4}><XPost tint={OTHERS[i % OTHERS.length]} text={["gm. talk to me.", "ask me about the drop.", "new here? start here.", "today's question:"][i % 4]} /></Panel>
        ))}
        <Cursor path={[{ f: 6, x: 1000, y: 1000 }, { f: 26, x: 830, y: 408 }, { f: 30, x: 830, y: 408, click: true }, { f: 70, x: 960, y: 560 }]} />
      </Stage>
    </AbsoluteFill>
  );
};

/* ======================================================================================================================
 * Two agents that work: a trader that runs its owner's rules, a deployer that launches coins from replies. Both talk on Grok.
 * They act on their own, which the kit can't do yet, so each carries ROADMAP's tag until it ships (set it to null then).
 * The tokens are made up.
 * ==================================================================================================================== */
const ROADMAP: string | null = "Coming soon";
const Tag: React.FC = () => {
  const f = useCurrentFrame();
  return ROADMAP ? <div style={{ position: "absolute", right: 80, top: 44, zIndex: 11, padding: "10px 16px", borderRadius: 99, border: `1px solid ${W.line}`, background: W.bg,
    font: `600 18px/1 ${UI}`, color: W.dim, opacity: ramp(f, 20, 34) }}>{ROADMAP}</div> : null;
};
const grokBy = <span style={{ display: "inline-flex", alignItems: "center", gap: 8, font: `600 16px/1 ${UI}`, color: D.dim }}><Img src={staticFile("brand/grok-mark.png")} style={{ width: 18, height: 18, filter: "invert(1)" }} />Grok</span>;
/* the agent's card: dark, with its name, a line of what it's doing and Grok under it */
const BotCard: React.FC<{ name: string; children: React.ReactNode; status: string; statusColor?: string }> = ({ name, children, status, statusColor = W.green }) => (
  <div style={{ position: "relative", height: "100%", background: "#0b0b0d", display: "flex", flexDirection: "column" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", borderBottom: `1px solid ${D.line}` }}>
      <i style={{ width: 10, height: 10, borderRadius: 5, background: statusColor, boxShadow: `0 0 10px ${statusColor}` }} />
      <span style={{ font: `700 18px/1 ${UI}`, color: D.text }}>{name}</span><span style={{ font: `500 16px/1 ${UI}`, color: D.dim }}>{status}</span>
      <span style={{ marginLeft: "auto" }}>{grokBy}</span>
    </div>
    <div style={{ flex: 1, position: "relative" }}>{children}</div>
  </div>
);
const Log: React.FC<{ rows: { at: number; text: string; tone?: string }[] }> = ({ rows }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 18px 18px" }}>
      {rows.filter((r) => f >= r.at).slice(-4).map((r) => { const p = ramp(f, r.at, r.at + 10);
        return <div key={r.text} style={{ font: `400 15px/1.35 ${MONO}`, color: r.tone || D.text, opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>{r.text}</div>; })}
    </div>
  );
};

const RULES = ["Buy when liquidity is over $50K and mint is off", "At most 0.5 SOL a trade", "Take profit at +40%, stop at −15%"];
const PRICE = [0, 4, 2, 8, 6, 14, 11, 19, 24, 21, 30, 36, 33, 42, 47, 44, 52];
const Trader: React.FC = () => {
  const f = useCurrentFrame(), on = f >= 52, drawn = ramp(f, 60, 200, (x) => x);
  const pts = PRICE.map((v, i) => `${(i / (PRICE.length - 1)) * 420},${150 - v * 2.4}`).slice(0, Math.max(2, Math.ceil(drawn * PRICE.length))).join(" ");
  return (
    <AbsoluteFill style={{ background: W.bg }}>
      <Headline>
        <Pop text="A trader that runs your rules." at={6} until={120} size={56} />
        <Pop text="It explains every trade." at={130} size={56} />
      </Headline>
      <Tag />
      <Stage rx={16} ry={-18} rz={1} y={60}>
        <Panel x={60} y={250} w={480} h={480} at={2}>
          <div style={{ padding: "26px 26px 18px", font: `800 26px/1 ${UI}`, color: W.ink, letterSpacing: "-0.02em" }}>trader · rules</div>
          {RULES.map((r) => <div key={r} style={{ padding: "18px 26px", borderTop: `1px solid ${W.line}`, font: `600 19px/1.35 ${UI}`, color: W.ink }}>{r}</div>)}
          <div style={{ position: "absolute", left: 26, right: 26, bottom: 24, display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 64, height: 36, borderRadius: 18, background: on ? W.green : "#d9d9de", position: "relative", transition: "none" }}>
              <i style={{ position: "absolute", top: 3, left: on ? 31 : 3, width: 30, height: 30, borderRadius: 15, background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,.2)" }} /></span>
            <span style={{ font: `700 20px/1 ${UI}`, color: W.ink }}>{on ? "Running" : "Start"}</span>
          </div>
        </Panel>
        <Panel x={580} y={200} w={460} h={560} dark z={70} at={8}>
          <BotCard name="trader" status={on ? "· running" : "· paused"} statusColor={on ? W.green : W.amber}>
            <svg width={420} height={170} style={{ margin: "18px 20px 6px" }}>
              <polyline points={pts} fill="none" stroke="#3fd68a" strokeWidth={3} strokeLinejoin="round" />
            </svg>
            <Log rows={[
              { at: 72, text: "› $KITE: liquidity $82K, mint off. rules met.", tone: D.dim },
              { at: 92, text: "bought 0.5 SOL of $KITE", tone: "#7ee2a8" },
              { at: 150, text: "› $KITE +41%. take-profit hit.", tone: D.dim },
              { at: 170, text: "sold $KITE · +0.2 SOL", tone: "#7ee2a8" },
            ]} />
            <Bubble text="Took profit on $KITE at +41%. Rules held." at={186} size={18} />
          </BotCard>
        </Panel>
        <Cursor path={[{ f: 10, x: 980, y: 1020 }, { f: 44, x: 118, y: 698 }, { f: 48, x: 118, y: 698, click: true }, { f: 110, x: 300, y: 900 }]} />
      </Stage>
    </AbsoluteFill>
  );
};

const Deployer: React.FC = () => {
  const f = useCurrentFrame(), reply = "@deployer launch Kite, $KITE: a paper kite over the sea", sent = f >= 64, steps = ramp(f, 120, 176, (x) => x);
  return (
    <AbsoluteFill style={{ background: W.bg }}>
      <Headline>
        <Pop text="A deployer that launches from a reply." at={6} until={150} size={52} />
        <Pop text="Name it. It ships." at={160} size={56} />
      </Headline>
      <Tag />
      <Stage rx={18} ry={16} rz={-1} y={60}>
        <Panel x={60} y={240} w={520} h={300} at={2}>
          <div style={{ display: "flex", gap: 14, padding: 24 }}>
            <i style={{ width: 46, height: 46, borderRadius: 23, flex: "none", background: "#d9d9de" }} />
            <div style={{ font: `500 22px/1.4 ${UI}`, color: W.ink, minHeight: 92 }}>{typed(f, 12, reply, 1.4)}</div>
          </div>
          <div style={{ position: "absolute", right: 24, bottom: 22, padding: "14px 26px", borderRadius: 99, background: W.blue, color: "#fff", font: `700 20px/1 ${UI}`, transform: `scale(${f >= 58 && f < 68 ? 0.94 : 1})` }}>{sent ? "Replied" : "Reply"}</div>
        </Panel>
        <Panel x={560} y={200} w={480} h={600} dark z={70} at={8}>
          <BotCard name="deployer" status={f >= 176 ? "· launched" : sent ? "· working" : "· listening"} statusColor={f >= 176 ? W.green : sent ? W.amber : D.dim}>
            <div style={{ display: "flex", gap: 16, padding: 18, opacity: ramp(f, 80, 94) }}>
              <div style={{ width: 120, height: 120, borderRadius: 18, flex: "none", background: "linear-gradient(160deg, #bfe6ff, #3b8fd9 60%, #10345c)", position: "relative", overflow: "hidden" }}>
                <i style={{ position: "absolute", left: 40, top: 24, width: 40, height: 52, background: "#fff", transform: "rotate(45deg)", borderRadius: 4, boxShadow: "0 6px 14px rgba(0,0,0,.25)" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ font: `800 30px/1 ${UI}`, color: D.text }}>Kite <span style={{ color: D.dim, fontWeight: 600 }}>$KITE</span></div>
                <div style={{ font: `500 16px/1.4 ${UI}`, color: D.dim }}>A paper kite over the sea. Launched from a reply on X.</div>
                <div style={{ font: `500 14px/1 ${MONO}`, color: D.dim }}>Solana · drafted by Grok</div>
              </div>
            </div>
            <div style={{ margin: "4px 18px 14px", height: 8, borderRadius: 4, background: D.raise, overflow: "hidden", opacity: ramp(f, 116, 124) }}>
              <i style={{ display: "block", height: "100%", width: `${steps * 100}%`, background: steps >= 1 ? "#3fd68a" : "#5cc4ff" }} />
            </div>
            <Log rows={[
              { at: 70, text: "› drafting the name, ticker and image", tone: D.dim },
              { at: 120, text: "› deploying on Solana…", tone: D.dim },
              { at: 176, text: "live: tweetpad.io/sol/KiTe…9fQ2", tone: "#7ee2a8" },
            ]} />
            <Bubble text="$KITE is live. Its link is in the reply." at={190} size={18} low />
          </BotCard>
        </Panel>
        <Cursor path={[{ f: 8, x: 980, y: 1020 }, { f: 54, x: 500, y: 500 }, { f: 58, x: 500, y: 500, click: true }, { f: 120, x: 700, y: 900 }]} />
      </Stage>
    </AbsoluteFill>
  );
};

/* the close: tweetpad and Grok, then the call */
const End: React.FC = () => {
  const f = useCurrentFrame(), a = ramp(f, 4, 20, back), x = ramp(f, 14, 26, back), b = ramp(f, 22, 36, back);
  return (
    <AbsoluteFill style={{ background: W.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 46 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 54 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: clamp01(a), transform: `scale(${0.7 + 0.3 * a})` }}>
          <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 190, height: 190 }} />
          <div style={{ font: `600 64px/1 ${FONTS.round}`, color: W.ink, letterSpacing: "-0.01em" }}>tweet<span style={{ color: W.blue }}>pad</span></div>
        </div>
        <div style={{ font: `300 70px/1 ${UI}`, color: "#b8b8bd", opacity: clamp01(x), transform: `scale(${0.5 + 0.5 * x}) rotate(${(1 - x) * 90}deg)` }}>×</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: clamp01(b), transform: `scale(${0.7 + 0.3 * b})` }}>
          <Img src={staticFile("brand/grok-mark.png")} style={{ width: 190, height: 190 }} />
          <div style={{ font: `700 64px/1 ${UI}`, color: W.ink, letterSpacing: "-0.03em" }}>Grok</div>
        </div>
      </div>
      <Pop text="tweetpad agents, powered by Grok" at={46} size={40} color={W.dim} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <Pop text="Claim yours." at={78} size={96} />
        <Pop text="tweetpad.io/agents" at={92} size={48} color={W.blue} />
      </div>
    </AbsoluteFill>
  );
};

export const TweetpadAgentsCode: React.FC = () => {
  loadFonts();
  return (
    <AbsoluteFill style={{ background: W.bg }}>
      <Shot id="intro"><Intro /></Shot>
      <Shot id="copy"><Copy /></Shot>
      <Shot id="paste"><Paste /></Shot>
      <Shot id="swap"><Swap /></Shot>
      <Shot id="ship"><Ship /></Shot>
      <Shot id="share"><Share /></Shot>
      <Shot id="trader"><Trader /></Shot>
      <Shot id="deployer"><Deployer /></Shot>
      <Shot id="end"><End /></Shot>
    </AbsoluteFill>
  );
};
