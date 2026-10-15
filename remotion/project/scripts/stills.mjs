// Bundle once, render many stills.
// usage: node scripts/stills.mjs [outDir] [frame:name ...] [--comp=TweetpadSquare]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";

const args = process.argv.slice(2);
const comp = (args.find((a) => a.startsWith("--comp=")) || "--comp=TweetpadSquare").slice(7);
const rest = args.filter((a) => !a.startsWith("--"));
const outDir = path.resolve(rest[0] || "../out/stills");
const shots = (rest.length > 1 ? rest.slice(1) : ["70:hook", "250:open", "395:solana-launch", "600:tokens-chart", "920:evm-robinhood", "1080:end"]).map((s) => s.split(":"));
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = process.env.REMOTION_CHROME || null;
const composition = await selectComposition({ serveUrl, id: comp, browserExecutable, chromiumOptions: process.env.REMOTION_GL ? { gl: process.env.REMOTION_GL } : {} });
for (const [frame, name] of shots) {
  const output = path.join(outDir, `${comp === "TweetpadSquare" ? "" : comp + "-"}f${String(frame).padStart(4, "0")}-${name}.png`);
  await renderStill({ serveUrl, composition, frame: Number(frame), output, browserExecutable, chromiumOptions: process.env.REMOTION_GL ? { gl: process.env.REMOTION_GL } : {} });
  console.log("wrote", output);
}
