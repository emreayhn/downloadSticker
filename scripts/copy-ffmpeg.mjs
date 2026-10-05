// Copies ffmpeg.wasm's worker into public/ so it is served as-is.
// Bundlers rewrite the worker's dynamic import() of the core and break it.
// The core itself (~32 MB) loads from jsDelivr: Cloudflare caps static files at 25 MB.
import { copyFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@ffmpeg", "ffmpeg", "dist", "esm");
const dest = join(root, "public", "ffmpeg");

if (!existsSync(src)) {
  console.warn("[copy-ffmpeg] @ffmpeg/ffmpeg not installed, skipping");
  process.exit(0);
}
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const f of ["worker.js", "const.js", "errors.js"]) copyFileSync(join(src, f), join(dest, f));
console.log("[copy-ffmpeg] copied worker to public/ffmpeg");
