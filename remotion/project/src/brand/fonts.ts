import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

/** Loads every face the film uses. Remotion waits for these before rendering a frame. */
const faces: { family: string; file: string; weight?: string }[] = [
  { family: "Inter", file: "fonts/Inter-Variable.ttf", weight: "100 900" },
  /* the launch-party films: the party pages' sharp display face (OFL, Google Fonts) */
  { family: "Inter Tight", file: "fonts/InterTight-Variable.ttf", weight: "100 900" },
  { family: "Fredoka", file: "fonts/Fredoka-Variable.ttf", weight: "300 700" },
  { family: "Gelasio", file: "fonts/Gelasio-Variable.ttf", weight: "400 700" },
  { family: "Pixelify Sans", file: "fonts/PixelifySans-Variable.ttf", weight: "400 700" },
  { family: "VT323", file: "fonts/VT323-Regular.ttf", weight: "400" },
  { family: "Doto", file: "fonts/Doto-Variable.woff2", weight: "100 900" },
  /* film 14 (Bordrless's look) only: its condensed headline face, its mono and its UI face, as bordrless.app and tweetpad's
     Bordrless skin load them (all OFL, from Google Fonts) */
  { family: "Anton", file: "fonts/Anton-Regular.ttf", weight: "400" },
  { family: "JetBrains Mono", file: "fonts/JetBrainsMono-Regular.ttf", weight: "400" },
  { family: "JetBrains Mono", file: "fonts/JetBrainsMono-Bold.ttf", weight: "700" },
  { family: "Space Grotesk", file: "fonts/SpaceGrotesk-Medium.ttf", weight: "500" },
  { family: "Space Grotesk", file: "fonts/SpaceGrotesk-Bold.ttf", weight: "700" },
];

let started = false;
export const loadFonts = () => {
  if (started) return;
  started = true;
  for (const f of faces) {
    loadFont({ family: f.family, url: staticFile(f.file), weight: f.weight }).catch((e) => console.error("font", f.family, e));
  }
};
