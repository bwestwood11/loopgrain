// Renders the hero spots and encodes the web versions into public/hero.
//
//   node video/build.mjs                    check + render every spot
//   node video/build.mjs fitness detailing  only these spots
//
// Each spot folder is a standalone HyperFrames project: index.html (the edit) plus
// assets/segA.mp4 (3.5s), segB.mp4 (3.5s) and segC.mp4 (6s), all 1080x1920 at 30fps.
// The "original" web video is those three clips joined with no treatment, so it stays
// frame-aligned with the edit. Needs ffmpeg on PATH.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const publicHero = join(here, "..", "public", "hero");
const HF = "hyperframes@0.8.92";

const all = readdirSync(here, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(here, d.name, "index.html")))
  .map((d) => d.name);
const only = process.argv.slice(2);
const spots = only.length ? all.filter((s) => only.includes(s)) : all;

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });

const enc = ["-an", "-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart"];

for (const spot of spots) {
  const dir = join(here, spot);
  const assets = join(dir, "assets");
  mkdirSync(join(assets, "fonts"), { recursive: true });
  mkdirSync(join(dir, "renders"), { recursive: true });
  mkdirSync(publicHero, { recursive: true });

  for (const f of readdirSync(join(here, "shared", "fonts"))) {
    copyFileSync(join(here, "shared", "fonts", f), join(assets, "fonts", f));
  }
  copyFileSync(join(here, "shared", "gsap.min.js"), join(assets, "gsap.min.js"));

  console.log(`\n=== ${spot} ===`);
  run("npx", ["--yes", HF, "check", "--timeout", "45000"], dir);
  run("npx", ["--yes", HF, "render", "--quality", "standard", "--output", "renders/edited-master.mp4"], dir);

  const out = (name) => join(publicHero, `${spot}-${name}`);
  run("ffmpeg", ["-v", "error", "-y", "-i", join(dir, "renders", "edited-master.mp4"), "-vf", "scale=720:1280", "-crf", "25", ...enc, out("edited.mp4")], dir);

  const list = join(dir, "renders", "original.txt");
  writeFileSync(list, ["segA.mp4", "segB.mp4", "segC.mp4"].map((s) => `file '${join(assets, s).replaceAll("\\", "/")}'`).join("\n") + "\n");
  run("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-vf", "scale=720:1280", "-crf", "26", ...enc, out("original.mp4")], dir);

  for (const name of ["edited", "original"]) {
    run("ffmpeg", ["-v", "error", "-y", "-ss", "1.2", "-i", out(`${name}.mp4`), "-frames:v", "1", "-q:v", "4", out(`${name}-poster.jpg`)], dir);
  }
}
