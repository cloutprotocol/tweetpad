/**
 * TweetpadWinamp: "Winamp, inside a tweet." 1080x1080 @30, 25.0 s. tweetpad.io/winamp: Webamp in a tweet, over the site's # spectrum.
 * The backdrop is the live page's visualizer rebuilt: a grid of tweetpad # glyphs lit column by column from the bottom like Winamp's
 * spectrum analyser (log-spaced bands, mirrored from the centre out, smooth fall, a peak glyph per column) in the classic VISCOLOR
 * ramp. It reacts to the real soundtrack ("Space Debris" by Captain) through @remotion/media-utils useAudioData + visualizeAudio.
 * The player is one of ten skin stills (public/winamp/, 275x348 logical at 4x), drawn pixelated.
 * CLAIMS: not affiliated with Winamp (end card); no "official"; no Winamp / Nullsoft logos beyond what is inside the skin stills;
 * never name or label a skin; no third-party brands in text; the music credit is on the end card; @tweetpad_io.
 * Studio: named Sequences; headlines, captions, the counter and the 3D rig are Interactive.Div with inline interpolate() styles.
 */
import React, { useMemo } from "react";
import { AbsoluteFill, Easing, Img, interpolate, Interactive, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { MediaUtilsAudioData, useAudioData, visualizeAudio } from "@remotion/media-utils";
import { loadFonts } from "../brand/fonts";
import { FONTS, SKIN_2012 } from "../brand/tokens";
import { lerp, ramp, settle } from "../lib/motion";
import { WINAMP as R, WINAMP_COPY as C, WINAMP_CUTS as CUTS, WINAMP_SKINS as SKINS, WINAMP_TOTAL } from "../timeline";

const BG = "#050b10";
const BLUE = "#1da1f2";
const MONO = 'ui-monospace, Menlo, Monaco, "DejaVu Sans Mono", monospace';
const springy = Easing.bezier(0.34, 1.56, 0.64, 1);
const TRACK = staticFile("winamp/space-debris.mp3");
const skinSrc = (file: string) => staticFile("winamp/" + file);

/* =========================== the # spectrum (the live page's backdrop) =========================== */
const COLS = 25, ROWS = 25, CELL = 1080 / COLS; // ≈ 43 px cells
const BANDS = (COLS + 1) / 2; // 13: the centre column is the bass, mirrored outwards
type RGB = [number, number, number];
/** Winamp's classic viscolor.txt, spectrum colours 17 → 2 (bottom green → top red), and colour 23 for the peak dots */
const VIS: RGB[] = [
  [24, 132, 8], [41, 148, 0], [49, 156, 8], [57, 181, 16], [50, 190, 16], [41, 206, 16], [50, 255, 0], [148, 222, 33],
  [189, 222, 41], [214, 181, 33], [222, 165, 24], [198, 123, 8], [214, 115, 0], [214, 102, 0], [214, 90, 0], [239, 49, 16],
];
const PEAK: RGB = [190, 196, 204];
/** each skin's dominant colour (same order as WINAMP_SKINS); the classic skin keeps the classic ramp */
const TINTS: (RGB | null)[] = [[79, 224, 200], [200, 70, 255], [40, 220, 255], [90, 140, 220], [160, 120, 200], [200, 205, 215], [70, 220, 70], [230, 140, 60], [150, 170, 190], null];
const mix = (a: RGB, b: RGB | null, t: number): string => {
  const c = b ? a.map((v, i) => Math.round(v + (b[i] - v) * t)) : a;
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

type Levels = { bar: Float32Array[]; peak: Float32Array[] };
/** Every frame's 13 band levels, computed once: log-spaced bands, dB per band against its own loud level, a smooth fall and a
 * peak that holds then drops. Deterministic (a pass from frame 0), seeded with frame 24's levels so it is moving at frame 0. */
const analyse = (audioData: MediaUtilsAudioData, fps: number, total: number): Levels => {
  const N = 1024, binHz = audioData.sampleRate / 2 / N;
  const edges = Array.from({ length: BANDS + 1 }, (_, i) => Math.max(1, Math.round((45 * Math.pow(14000 / 45, i / BANDS)) / binHz)));
  const db: number[][] = [];
  for (let f = 0; f < total; f++) {
    const v = visualizeAudio({ fps, frame: f, audioData, numberOfSamples: N, optimizeFor: "speed" });
    db.push(Array.from({ length: BANDS }, (_, b) => {
      let m = 0;
      for (let k = edges[b]; k < Math.max(edges[b] + 1, edges[b + 1]); k++) m = Math.max(m, v[k] ?? 0);
      return 20 * Math.log10(m + 1e-9);
    }));
  }
  // each band's loud level (the 96th percentile) maps near the top; 30 dB under it is dark
  const top = Array.from({ length: BANDS }, (_, b) => {
    const s = db.map((r) => r[b]).sort((x, y) => x - y);
    return s[Math.floor(s.length * 0.96)];
  });
  const level = (f: number, b: number) => Math.min(1, Math.max(0, (db[f][b] - (top[b] - 30)) / 30)) * (0.92 - 0.12 * (b / BANDS));
  const bar: Float32Array[] = [], peak: Float32Array[] = [];
  const cur = new Float32Array(BANDS), pk = new Float32Array(BANDS), hold = new Float32Array(BANDS);
  for (let b = 0; b < BANDS; b++) { cur[b] = level(Math.min(24, total - 1), b); pk[b] = cur[b]; hold[b] = 8; }
  for (let f = 0; f < total; f++) {
    for (let b = 0; b < BANDS; b++) {
      cur[b] = Math.max(level(f, b), cur[b] - 0.03);
      if (cur[b] >= pk[b]) { pk[b] = cur[b]; hold[b] = 12; } else if (hold[b] > 0) hold[b]--; else pk[b] = Math.max(cur[b], pk[b] - 0.012);
    }
    bar.push(Float32Array.from(cur)); peak.push(Float32Array.from(pk));
  }
  return { bar, peak };
};

/** which skin is up at a global frame (index into WINAMP_SKINS), or -1 before the skins scene */
const skinAt = (f: number) => {
  if (f < R.skins.from) return -1;
  let i = 0;
  for (let k = 0; k < CUTS.length; k++) if (f >= R.skins.from + CUTS[k]) i = k;
  return i;
};

const Spectrum: React.FC<{ frame: number; levels: Levels | null }> = ({ frame, levels }) => {
  const f = Math.min(frame, WINAMP_TOTAL - 1);
  const k = skinAt(f);
  const tint = k >= 0 && f < R.tracker.from ? TINTS[k] : null;
  const cells: React.ReactNode[] = [];
  for (let c = 0; c < COLS; c++) {
    const b = Math.abs(c - (COLS - 1) / 2);
    const h = levels ? levels.bar[f][b] * ROWS : 0;
    const p = levels ? Math.ceil(levels.peak[f][b] * ROWS) - 1 : -1;
    for (let r = 0; r < ROWS; r++) {
      const lit = Math.min(1, Math.max(0, h - r)); // the top glyph lights partly, so the fall is smooth
      const isPeak = r === p && p >= Math.ceil(h);
      const col = mix(VIS[Math.floor((r / ROWS) * VIS.length)], tint, 0.55);
      cells.push(
        <span key={c * ROWS + r} style={{ position: "absolute", left: c * CELL, top: (ROWS - 1 - r) * CELL, width: CELL, height: CELL, display: "flex", alignItems: "center", justifyContent: "center",
          font: `800 31px/1 ${FONTS.ui}`, color: "rgba(120,160,190,.09)" }}>
          #
          {lit > 0 || isPeak ? (
            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              color: isPeak ? mix(PEAK, null, 0) : col, opacity: isPeak ? 0.9 : 0.35 + 0.65 * lit, textShadow: isPeak ? "none" : `0 0 12px ${col}` }}>#</span>
          ) : null}
        </span>,
      );
    }
  }
  return <div style={{ position: "absolute", inset: 0 }}>{cells}</div>;
};

const Backdrop: React.FC<{ levels: Levels | null }> = ({ levels }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      <Interactive.Div name="# spectrum" style={{ position: "absolute", inset: 0,
        opacity: interpolate(frame, [0, 660, 690], [1, 1, 0.55], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        <Spectrum frame={frame} levels={levels} />
      </Interactive.Div>
      {/* calm behind the captions and the player, and a vignette */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(5,11,16,.82) 0, rgba(5,11,16,.45) 230px, transparent 320px)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(38% 40% at 50% 56%, rgba(5,11,16,.55), transparent 75%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 80% at 50% 50%, transparent 60%, rgba(0,0,0,.55) 100%)" }} />
    </AbsoluteFill>
  );
};

/* =========================== the player: a skin still, pixelated =========================== */
const Player: React.FC<{ src: string; scale: number; flash?: number }> = ({ src, scale, flash = 0 }) => (
  <div style={{ position: "relative", width: 275 * scale, height: 348 * scale, lineHeight: 0 }}>
    <Img src={src} style={{ width: 275 * scale, height: 348 * scale, imageRendering: "pixelated" }} />
    {flash > 0 ? <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash }} /> : null}
  </div>
);

/** hook → skins → tracker: one player in a 3D rig (global frames 0 … tracker end) */
const PlayerStage: React.FC = () => {
  const f = useCurrentFrame();
  const k = skinAt(f);
  const src = skinSrc(k < 0 ? "skin-01-classic.png" : SKINS[k]);
  const s = k < 0 ? 999 : f - (R.skins.from + CUTS[k]); // frames since the last cut
  const flash = interpolate(s, [0, 2, 4], [0.85, 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const t0 = R.tracker.from;
  const zoom = ramp(f, t0, t0 + 40, settle);
  const out = 1 - ramp(f, R.popout.from - 8, R.popout.from + 2);
  return (
    <AbsoluteFill style={{ perspective: 1600, perspectiveOrigin: "50% 50%", opacity: out }}>
      {/* the push into the playlist: 1 → 1.8, the playlist rises to mid-frame */}
      <Interactive.Div name="Tracker push" style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d",
        translate: `0px ${lerp(0, -290, zoom)}px`, scale: String(lerp(1, 1.8, zoom)) }}>
        <Interactive.Div name="Rig tilt (X)" style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d",
          rotate: interpolate(f, [0, 26, 200, 330, 448, 488], ["1 0 0 24deg", "1 0 0 8deg", "1 0 0 4deg", "1 0 0 9deg", "1 0 0 6deg", "1 0 0 1deg"], { easing: Easing.inOut(Easing.sin), extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <Interactive.Div name="Rig sway (Y)" style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d",
            rotate: interpolate(f, [0, 90, 170, 250, 330, 410, 448, 488], ["0 1 0 0deg", "0 1 0 -6deg", "0 1 0 7deg", "0 1 0 -7deg", "0 1 0 6deg", "0 1 0 -4deg", "0 1 0 -2deg", "0 1 0 0deg"], { easing: Easing.inOut(Easing.sin), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            translate: interpolate(f, [0, 22, 150, 300, 448], ["0px -70px", "0px 0px", "0px -10px", "0px 8px", "0px 0px"], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            <div style={{ position: "absolute", left: 540, top: 604, translate: "-50% -50%",
              scale: String(interpolate(s, [0, 3, 9], [1, 1.03, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })),
              boxShadow: "0 0 0 1px rgba(29,161,242,.4), 0 0 70px rgba(29,161,242,.38), 0 40px 80px rgba(0,0,0,.75)" }}>
              <Player src={src} scale={2} flash={flash} />
            </div>
          </Interactive.Div>
        </Interactive.Div>
      </Interactive.Div>
      {/* a soft flash over the whole frame on each cut */}
      <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash * 0.12 }} />
    </AbsoluteFill>
  );
};

/* =========================== text =========================== */
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", flexDirection: "column", paddingTop: 58 }}>
      <Interactive.Div name="Hook headline" style={{ font: `900 82px/1.02 ${FONTS.ui}`, letterSpacing: "-.035em", color: "#fff", textAlign: "center", textShadow: "0 6px 30px rgba(0,0,0,.8)",
        translate: interpolate(frame, [0, 18], ["0px 10px", "0px 0px"], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        opacity: interpolate(frame, [0, 80, 90], [1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        {C.hook.head}<br /><span style={{ color: BLUE }}>{C.hook.head2}</span>
      </Interactive.Div>
    </AbsoluteFill>
  );
};

/** the caption slot of films 7–8: top, 64 px headline, an optional sub (sub may arrive later) */
const Caption: React.FC<{ name: string; head: string; sub?: string; subAt?: number; dur: number; scrim?: boolean }> = ({ name, head, sub, subAt = 4, dur, scrim }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 64, gap: 12 }}>
      {scrim ? <Interactive.Div name={name + " (scrim)"} style={{ position: "absolute", left: 0, right: 0, top: 0, height: 330, background: "linear-gradient(rgba(5,11,16,.96) 0, rgba(5,11,16,.9) 62%, rgba(5,11,16,0) 100%)",
        opacity: interpolate(frame, [0, 12, dur - 8, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} /> : null}
      <Interactive.Div name={name} style={{ font: `900 64px/1.05 ${FONTS.ui}`, letterSpacing: "-.03em", color: "#fff", textAlign: "center", padding: "0 80px", textShadow: "0 4px 24px rgba(0,0,0,.8)",
        translate: interpolate(frame, [0, 10], ["0px 24px", "0px 0px"], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        opacity: interpolate(frame, [0, 8, dur - 8, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{head}</Interactive.Div>
      {sub ? <Interactive.Div name={name + " (sub)"} style={{ font: `600 34px/1.25 ${FONTS.ui}`, color: "#cfe9fb", textAlign: "center", padding: "0 96px", textShadow: "0 3px 18px rgba(0,0,0,.9)",
        translate: interpolate(frame, [subAt, subAt + 10], ["0px 14px", "0px 0px"], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        opacity: interpolate(frame, [subAt, subAt + 10, dur - 8, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{sub}</Interactive.Div> : null}
    </AbsoluteFill>
  );
};

/** "skin 31377 / 90,000": scrambles for a few frames after each cut, then lands on the cut's number (sequence-local frames) */
const SkinCounter: React.FC = () => {
  const frame = useCurrentFrame();
  let i = 0;
  for (let k = 0; k < CUTS.length; k++) if (frame >= CUTS[k]) i = k;
  const s = frame - CUTS[i];
  const num = s < 6 ? String((Math.floor(Math.abs(Math.sin((frame + 1) * 12.9898) * 43758.5453)) % 90000) + 1).padStart(5, "0") : C.skins.nums[i];
  return (
    <AbsoluteFill>
      <Interactive.Div name="Skin counter" style={{ position: "absolute", left: 0, right: 0, top: 972, display: "flex", justifyContent: "center",
        opacity: interpolate(frame, [0, 8, 350, 358], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        <span style={{ padding: "10px 20px", borderRadius: 999, background: "rgba(5,11,16,.88)", border: "1px solid rgba(29,161,242,.55)", color: "#cfe9fb", font: `600 26px/1 ${MONO}`,
          boxShadow: "0 0 24px rgba(29,161,242,.25)" }}>
          skin <b style={{ color: BLUE }}>{num}</b> / {C.skins.total}
        </span>
      </Interactive.Div>
    </AbsoluteFill>
  );
};

/** .mod .xm .s3m .it .mp3 .wsz drift in from the edges and drop onto the player (sequence-local frames) */
const CHIP_FROM: [number, number, number][] = [[-120, 420, 28], [1200, 380, 36], [-120, 820, 46], [1200, 860, 54], [300, 1180, 64], [800, 1180, 72]];
const FileChips: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      {C.tracker.chips.map((label, i) => {
        const [x0, y0, at] = CHIP_FROM[i];
        const t = ramp(frame, at, at + 30, settle);
        if (t <= 0 || t >= 1) return null;
        const drop = ramp(frame, at + 20, at + 30);
        const x = lerp(x0, 540 + (i % 2 ? 60 : -60), t), y = lerp(y0, 720, t) - Math.sin(t * Math.PI) * 120;
        return (
          <div key={label} style={{ position: "absolute", left: x, top: y, translate: "-50% -50%", scale: String(lerp(1, 0.5, drop)), opacity: 1 - drop,
            rotate: `${(i % 2 ? 1 : -1) * lerp(8, 0, t)}deg`, padding: "14px 24px", borderRadius: 14, background: "rgba(8,20,30,.94)", border: `2px solid ${BLUE}`,
            color: "#fff", font: `700 40px/1 ${MONO}`, boxShadow: "0 0 30px rgba(29,161,242,.5), 0 20px 40px rgba(0,0,0,.7)" }}>
            {label}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* =========================== pop out: a tweetpad card, the player lifts out as its own window =========================== */
const TweetpadCard: React.FC<{ tap: number }> = ({ tap }) => {
  const c = C.popout.card;
  return (
    <div style={{ width: 440, borderRadius: 8, overflow: "hidden", background: "#fff", boxShadow: "0 0 0 1px rgba(29,161,242,.35), 0 30px 70px rgba(0,0,0,.7)", fontFamily: FONTS.ui }}>
      <div style={{ height: 64, display: "flex", alignItems: "center", padding: "0 22px", background: SKIN_2012.headerBg, borderBottom: `1px solid ${SKIN_2012.headerBorder}` }}>
        <span style={{ color: "#fff", font: `600 34px/1 ${FONTS.round}`, letterSpacing: "-.02em", textShadow: "0 -1px 0 rgba(0,0,0,.3)" }}>{c.title}</span>
      </div>
      <div style={{ padding: "10px 22px", font: `bold 22px/1.2 ${FONTS.ui}`, color: "#555", textShadow: "0 1px 0 #fff", background: SKIN_2012.headStrip, borderBottom: "1px solid #ddd" }}>{c.menu}</div>
      {[0, 1].map((i) => <div key={i} style={{ height: 52, borderBottom: "1px solid #eee", display: "flex", alignItems: "center", padding: "0 22px" }}><i style={{ width: 150 + i * 60, height: 14, borderRadius: 7, background: "#e6e6e6" }} /></div>)}
      <div style={{ position: "relative", padding: "16px 22px 18px", background: `rgba(234,245,253,${0.4 + 0.6 * tap})`, borderBottom: "1px solid #eee" }}>
        <div style={{ color: SKIN_2012.accent, font: `700 32px/1.1 ${FONTS.ui}` }}>{c.item}</div>
        <div style={{ marginTop: 8, color: "#666", font: `22px/1.3 ${FONTS.ui}` }}>{c.note}</div>
      </div>
      {[0].map((i) => <div key={i} style={{ height: 52, display: "flex", alignItems: "center", padding: "0 22px" }}><i style={{ width: 180, height: 14, borderRadius: 7, background: "#e6e6e6" }} /></div>)}
    </div>
  );
};

const PopOut: React.FC = () => {
  const f = useCurrentFrame();
  const tap = ramp(f, 12, 18) * (1 - ramp(f, 40, 60));
  const lift = ramp(f, 16, 46, springy);
  const out = 1 - ramp(f, 80, 90);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Interactive.Div name="Pop-out card" style={{ position: "absolute", left: 72, top: 318,
        translate: interpolate(f, [0, 14], ["-60px 0px", "0px 0px"], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        opacity: interpolate(f, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        filter: `brightness(${interpolate(f, [30, 60], [1, 0.75], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})` }}>
        <TweetpadCard tap={tap} />
        {/* the tap */}
        {f >= 12 && f < 30 ? <div style={{ position: "absolute", left: 160, top: 340, width: 90, height: 90, borderRadius: "50%", translate: "-50% -50%",
          background: "rgba(29,161,242,.3)", scale: String(lerp(0.4, 1.6, ramp(f, 12, 30))), opacity: 1 - ramp(f, 18, 30) }} /> : null}
      </Interactive.Div>
      <AbsoluteFill style={{ perspective: 1600 }}>
        {f >= 16 ? (
          <Interactive.Div name="Pop-out window" style={{ position: "absolute", left: lerp(290, 772, lift), top: lerp(700, 612, lift) + Math.sin((f - 46) / 9) * 6 * ramp(f, 46, 60), translate: "-50% -50%",
            transformStyle: "preserve-3d", scale: String(lerp(0.18, 1, lift)), rotate: `0 1 0 ${lerp(0, -12, lift)}deg`, opacity: Math.min(1, ramp(f, 16, 22) * 1.5),
            borderRadius: 6, overflow: "hidden", boxShadow: "0 0 0 1px rgba(255,255,255,.12), 0 0 60px rgba(29,161,242,.4), 0 40px 80px rgba(0,0,0,.8)" }}>
            <div style={{ height: 30, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", background: "#15191d", borderBottom: "1px solid #2f3336" }}>
              {["#f4212e", "#ffd400", "#00ba7c"].map((c) => <i key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.75 }} />)}
              <span style={{ marginLeft: 8, color: "#8b98a5", font: `500 15px/1 ${FONTS.ui}` }}>tweetpad.io/winamp</span>
            </div>
            <Player src={skinSrc("skin-02-sony-2000-se.png")} scale={1.5} />
          </Interactive.Div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* =========================== end card =========================== */
const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      {/* calm behind the lines and the small print */}
      <div style={{ position: "absolute", inset: 0, opacity: ramp(frame, 0, 14),
        background: "radial-gradient(46% 40% at 50% 46%, rgba(5,11,16,.7), transparent 80%), linear-gradient(transparent 820px, rgba(5,11,16,.9) 940px)" }} />
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30, paddingBottom: 90 }}>
        <Interactive.Div name="End icon" style={{ width: 120, height: 120,
          scale: interpolate(frame, [0, 14], [0.5, 1], { easing: Easing.bezier(0.34, 1.56, 0.64, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <Img src={staticFile("brand/tweetpad-hash-512.png")} style={{ width: 120, height: 120, filter: "drop-shadow(0 0 30px rgba(74,169,233,.7))" }} />
        </Interactive.Div>
        <Interactive.Div name="End headline" style={{ font: `900 92px/1.04 ${FONTS.ui}`, letterSpacing: "-.035em", color: "#fff", textAlign: "center", textShadow: "0 6px 30px rgba(0,0,0,.8)",
          translate: interpolate(frame, [4, 20], ["0px 30px", "0px 0px"], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          opacity: interpolate(frame, [4, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          {C.end.head}<br /><span style={{ color: BLUE }}>{C.end.head2}</span>
        </Interactive.Div>
        <Interactive.Div name="End url" style={{ padding: "16px 36px", borderRadius: 999, background: "#fff", color: "#1a8bd6", font: `800 40px/1 ${FONTS.ui}`,
          opacity: interpolate(frame, [16, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          scale: interpolate(frame, [16, 28], [0.85, 1], { easing: Easing.bezier(0.34, 1.56, 0.64, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          {C.end.url}
        </Interactive.Div>
        <Interactive.Div name="End handle" style={{ color: BLUE, font: `700 34px/1 ${FONTS.ui}`,
          opacity: interpolate(frame, [24, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          {C.end.handle}
        </Interactive.Div>
      </AbsoluteFill>
      <Interactive.Div name="End small print" style={{ position: "absolute", left: 72, right: 72, bottom: 48, textAlign: "center", font: `500 21px/1.35 ${FONTS.ui}`, color: "rgba(220,236,255,.82)",
        opacity: interpolate(frame, [28, 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        {C.end.fine}
      </Interactive.Div>
    </AbsoluteFill>
  );
};

/* =========================== the film =========================== */
export const TweetpadWinamp: React.FC = () => {
  loadFonts();
  const { fps } = useVideoConfig();
  const audioData = useAudioData(TRACK);
  const levels = useMemo(() => (audioData ? analyse(audioData, fps, WINAMP_TOTAL) : null), [audioData, fps]);
  const sk = R.skins, tr = R.tracker, po = R.popout;
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Sequence name="Soundtrack: Space Debris (fades out)">
        <Audio src={TRACK} volume={(f) => interpolate(f, [WINAMP_TOTAL - 46, WINAMP_TOTAL - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      </Sequence>
      <Sequence name="# spectrum backdrop">
        <Backdrop levels={levels} />
      </Sequence>
      <Sequence name="1–3 Player stage (3D)" durationInFrames={po.from + 2}>
        <PlayerStage />
      </Sequence>
      <Sequence name="1 Hook headline" from={R.hook.from} durationInFrames={R.hook.dur}>
        <Hook />
      </Sequence>
      <Sequence name="Caption: skins" from={sk.from + 2} durationInFrames={sk.dur - 2}>
        <Caption name="Caption: skins" head={C.skins.head} sub={C.skins.sub} dur={sk.dur - 2} />
      </Sequence>
      <Sequence name="2 Skin counter" from={sk.from} durationInFrames={sk.dur}>
        <SkinCounter />
      </Sequence>
      <Sequence name="Caption: tracker" from={tr.from + 2} durationInFrames={tr.dur - 2}>
        <Caption name="Caption: tracker" head={C.tracker.head} sub={C.tracker.sub} subAt={40} dur={tr.dur - 2} scrim />
      </Sequence>
      <Sequence name="3 File chips" from={tr.from} durationInFrames={tr.dur}>
        <FileChips />
      </Sequence>
      <Sequence name="4 Pop out" from={po.from} durationInFrames={po.dur}>
        <PopOut />
      </Sequence>
      <Sequence name="Caption: pop out" from={po.from + 2} durationInFrames={po.dur - 4}>
        <Caption name="Caption: pop out" head={C.popout.head} sub={C.popout.sub} subAt={22} dur={po.dur - 4} />
      </Sequence>
      <Sequence name="5 End card" from={R.end.from} durationInFrames={R.end.dur}>
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};
