import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

/** Loads every face the film uses. Remotion waits for these before rendering a frame. */
const faces: { family: string; file: string; weight?: string }[] = [
  { family: "Inter", file: "fonts/Inter-Variable.ttf", weight: "100 900" },
  { family: "Fredoka", file: "fonts/Fredoka-Variable.ttf", weight: "300 700" },
  { family: "Gelasio", file: "fonts/Gelasio-Variable.ttf", weight: "400 700" },
  { family: "Pixelify Sans", file: "fonts/PixelifySans-Variable.ttf", weight: "400 700" },
  { family: "VT323", file: "fonts/VT323-Regular.ttf", weight: "400" },
  { family: "Doto", file: "fonts/Doto-Variable.woff2", weight: "100 900" },
];

let started = false;
export const loadFonts = () => {
  if (started) return;
  started = true;
  for (const f of faces) {
    loadFont({ family: f.family, url: staticFile(f.file), weight: f.weight }).catch((e) => console.error("font", f.family, e));
  }
};
