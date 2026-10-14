/**
 * Brand + UI tokens for the tweetpad promo.
 *
 * Two layers:
 *  - BRAND: the 2012 brand palette from the hash kit README (#1DA1F2 family). Use for film chrome:
 *    backgrounds, captions, end card.
 *  - SKINS: the app's own CSS variables, copied from src/assets/skin-2012.css and src/assets/tweetpad.css.
 *    Use these inside the rebuilt UI so it matches the shipped card pixel-for-pixel.
 */
export const BRAND = {
  primary: "#1DA1F2",
  light: "#36D8FF",
  ink: "#14171A",
  darkGray: "#657786",
  lightGray: "#AAB8C2",
  border: "#E1E8ED",
  bg: "#F5F8FA",
  white: "#FFFFFF",
} as const;

export const FONTS = {
  /** Film UI / captions. Stand-in for the app's "Helvetica Neue" stack (not redistributable). */
  ui: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
  /** The 2012 skin's header title + About name: Fredoka 600 (embed.html loads it from Google Fonts). */
  round: '"Fredoka", "Varela Round", "Arial Rounded MT Bold", sans-serif',
  /** 2012 skin tweet copy is Georgia; Gelasio is the metric-compatible open substitute. */
  serif: 'Georgia, "Gelasio", "Times New Roman", serif',
  /** Tweetcraft skin: Pixelify Sans (--px) and VT323 (--mono), both loaded by embed.html. */
  px: '"Pixelify Sans", ui-monospace, Menlo, monospace',
  mono: '"VT323", ui-monospace, Menlo, monospace',
  /** Doto Black: optional display face for Tweetcraft-flavoured film captions only (not used by the app). */
  doto: '"Doto", "VT323", monospace',
  code: 'Menlo, Monaco, "DejaVu Sans Mono", monospace',
} as const;

export type SkinName = "2012" | "tweetcraft" | "wii";

export type Skin = {
  name: SkinName;
  bg: string; panel: string; panelLo: string; line: string; text: string; dim: string;
  ok: string; bad: string; accent: string; gold: string;
  px: string; mono: string; tweet: string;
  radius: number; shadow: string; textShadow: string;
  headerBg: string; headerBorder: string; hudBg: string;
  barBtn: string; barBtnActive: string; barBtnBorder: string;
  primaryBtn: string; primaryBtnText: string; primaryBorder: string;
  btn: string; input: string; inputBorder: string;
  headStrip: string; headText: string;
  segOn: string; segOff: string;
};

/** skin-2012.css: html[data-skin="2012"] */
export const SKIN_2012: Skin = {
  name: "2012",
  bg: "#e6e6e6", panel: "#fff", panelLo: "#c8c8c8", line: "#e3e3e3", text: "#333", dim: "#999",
  ok: "#2e9e4f", bad: "#d0343a", accent: "#0084b4", gold: "#666",
  px: FONTS.ui, mono: FONTS.ui, tweet: FONTS.serif,
  radius: 5, shadow: "0 1px 2px rgba(0,0,0,.12)", textShadow: "none",
  headerBg: "linear-gradient(#63b8ee, #3c9ad9 50%, #2b86cc)", headerBorder: "#1d6aa5",
  hudBg: "linear-gradient(#3b3b3b, #1c1c1c 50%, #0c0c0c)",
  barBtn: "linear-gradient(#4aa6e4, #2c7fc4)", barBtnActive: "linear-gradient(#2a78b8, #2f86cb)", barBtnBorder: "#1c5f98",
  primaryBtn: "linear-gradient(#33bcef, #019ad2)", primaryBtnText: "#fff", primaryBorder: "#057ed0",
  btn: "linear-gradient(#fff, #e6e6e6)", input: "#fff", inputBorder: "#ccc",
  headStrip: "linear-gradient(#fafafa, #ededed)", headText: "#555",
  segOn: "linear-gradient(#2c8fd6, #4aa9e9)", segOff: "linear-gradient(#fff, #e6e6e6)",
};

/** tweetpad.css :root (the Tweetcraft pixel HUD) */
export const SKIN_CRAFT: Skin = {
  name: "tweetcraft",
  bg: "#0b1210", panel: "rgba(30,56,64,.82)", panelLo: "#071013", line: "rgba(140,200,210,.18)", text: "#f2f6f4", dim: "#a6bcbf",
  ok: "#7dff9a", bad: "#ff6b6b", accent: "#6fe7d8", gold: "#e8b64c",
  px: FONTS.px, mono: FONTS.mono, tweet: FONTS.mono,
  radius: 0, shadow: "inset 0 2px 0 rgba(140,200,210,.35), inset 0 -2px 0 rgba(0,0,0,.35)", textShadow: "2px 2px 0 rgba(0,0,0,.65)",
  headerBg: "transparent", headerBorder: "transparent",
  hudBg: "transparent",
  barBtn: "transparent", barBtnActive: "rgba(30,56,64,.82)", barBtnBorder: "transparent",
  primaryBtn: "linear-gradient(#6ad893, #3c9c60)", primaryBtnText: "#04200e", primaryBorder: "#050b0d",
  btn: "linear-gradient(#456d79, #2f4c55)", input: "rgba(5,12,14,.75)", inputBorder: "#071013",
  headStrip: "transparent", headText: "#e8b64c",
  segOn: "#6fe7d8", segOff: "transparent",
};

/** skin-wii.css: html[data-skin="wii"], the app's default since the home Menu. The 2012 skin underneath, dressed as the Menu:
 *  pinstripes, a silver bar with a blue edge, frosted-glass cards with soft bezels, pill buttons, the dock at the bottom. */
export const SKIN_WII: Skin = {
  ...SKIN_2012,
  name: "wii",
  bg: "repeating-linear-gradient(#f7f9fa 0 3px, #eef1f3 3px 5px)", text: "#3b4146", dim: "#8f9aa1",
  radius: 16, shadow: "inset 0 0 0 1.5px #fff, 0 0 0 1px rgba(160,175,185,.2), 0 2px 5px rgba(40,60,75,.14)",
  headerBg: "linear-gradient(#fdfefe, #e8edf0)", headerBorder: "#1da1f2",
  hudBg: "linear-gradient(#fdfefe, #e3e9ec)",
  barBtn: "linear-gradient(#fff, #e9eef1)", barBtnActive: "linear-gradient(#fff, #eef6fc)", barBtnBorder: "#c9d0d5",
  primaryBtn: "linear-gradient(#5cc4ff, #1a8fe0)", primaryBorder: "#1678c0",
  btn: "linear-gradient(#fff, #e9eef1)",
  headStrip: "linear-gradient(#fdfefe, #eef2f4)", headText: "#3b4146",
  segOn: "linear-gradient(#5cc4ff, #1a8fe0)", segOff: "linear-gradient(#fff, #edf1f3)",
};

export const skinOf = (n: SkinName): Skin => (n === "tweetcraft" ? SKIN_CRAFT : n === "wii" ? SKIN_WII : SKIN_2012);

export const VIDEO = { width: 1080, height: 1080, fps: 30 } as const;
