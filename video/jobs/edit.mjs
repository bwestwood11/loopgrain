// Turns a prepped job into a HyperFrames edit: cuts, word-by-word captions, a hook,
// optional B-roll and music, and a CTA end card.
//
//   node video/jobs/edit.mjs <job>             first run: drafts edit.json from the transcript
//                                              after that: builds video/jobs/<job>/edit/
//   node video/jobs/edit.mjs <job> --preview   build, then open HyperFrames Studio
//   node video/jobs/edit.mjs <job> --render    build, check, render video/jobs/<job>/final.mp4
//   node video/jobs/edit.mjs <job> --force     overwrite edit/index.html even if Studio changed it
//
// Run prep.mjs first. edit.json is the source of truth for the cut:
//
//   {
//     "brand":    { "name": "Main Street Barbers", "accent": "#ffd23f", "ink": "#111111", "paper": "#ffffff" },
//     "hook":     "Waiting too long between cuts?",          // big text over the opening, or null
//     "hookSeconds": 2.5,
//     "captions": true,                                       // word-by-word, from the transcript
//     "segments": [                                           // played in order, hard cuts
//       { "clip": "clip01", "in": 0.0, "out": 2.7 },
//       { "clip": "clip01", "in": 3.3, "out": 5.9, "zoom": 1.12,          // punch-in hides a jump cut
//         "broll": { "clip": "clip04", "in": 1.0, "offset": 0.4, "duration": 1.5 } }  // muted cutaway
//     ],
//     "cta":      { "headline": "Book online in 30 seconds", "button": "Book now", "sub": "Link in bio", "seconds": 2.5 },
//     "music":    { "file": "music.mp3", "volume": 0.12 }   // file in the job folder, or null
//   }
//
// Times are seconds in the prepped clip (clips/clipNN.mp4 = transcript times). The edit
// folder is a normal HyperFrames project: tweak it in Studio, but rebuilding from
// edit.json overwrites index.html, so make structural changes in edit.json.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const shared = join(here, "..", "shared");
const HF = "hyperframes@0.8.92";
const MAX_VIDEO_SECONDS = 60; // keep in sync with lib/pricing.ts
const W = 1080;
const H = 1920;

const args = process.argv.slice(2);
const job = args.find((a) => !a.startsWith("--"));
if (!job) {
  console.error("Usage: node video/jobs/edit.mjs <job> [--preview | --render] [--force]");
  process.exit(1);
}
const dir = join(here, job);
const manifestPath = join(dir, "manifest.json");
if (!existsSync(manifestPath)) {
  console.error(`No manifest. Run: node video/jobs/prep.mjs ${job}`);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const clipsById = new Map(manifest.clips.map((c) => [c.id, c]));
const transcript = (id) => JSON.parse(readFileSync(join(dir, clipsById.get(id).transcript), "utf8"));
const round = (n) => Math.round(n * 1000) / 1000;

// ---------- First run: draft edit.json ----------

const editPath = join(dir, "edit.json");
if (!existsSync(editPath)) {
  const cta = { headline: "Your headline here", button: "Book now", sub: "Link in bio", seconds: 2.5 };
  const budget = MAX_VIDEO_SECONDS - cta.seconds;
  const segments = [];
  let total = 0;
  for (const c of manifest.clips) {
    let previous = null;
    for (const s of transcript(c.id).segments) {
      const seg = { clip: c.id, in: round(Math.max(0, s.start - 0.15)), out: round(Math.min(c.original.duration, s.end + 0.25)) };
      if (total + seg.out - seg.in > budget) break;
      // Alternate a punch-in on consecutive takes from the same clip to hide the jump cut.
      if (previous && !previous.zoom) seg.zoom = 1.12;
      segments.push(seg);
      total += seg.out - seg.in;
      previous = seg;
    }
  }
  const silent = manifest.clips.filter((c) => !c.speech).map((c) => c.id);
  const draft = {
    _notes: [
      "Draft from the transcript: every spoken line, in clip order. Trim retakes and filler, reorder, and fill in the brand and CTA.",
      silent.length ? `No speech in ${silent.join(", ")}: use them as B-roll on a segment.` : null,
    ].filter(Boolean),
    brand: { name: "Business name", accent: "#ffd23f", ink: "#111111", paper: "#ffffff" },
    hook: null,
    hookSeconds: 2.5,
    captions: true,
    segments,
    cta,
    music: null,
  };
  writeFileSync(editPath, JSON.stringify(draft, null, 2) + "\n");
  console.log(`Drafted ${join("video", "jobs", job, "edit.json")}: ${segments.length} segments, ${total.toFixed(1)}s of cut.`);
  console.log("Edit it, then run this again to build.");
  process.exit(0);
}

// ---------- Build ----------

const edit = JSON.parse(readFileSync(editPath, "utf8"));
const brand = { name: "", accent: "#ffd23f", ink: "#111111", paper: "#ffffff", ...edit.brand };
const problems = [];

let t = 0;
const timeline = (edit.segments ?? []).map((s, i) => {
  const clip = clipsById.get(s.clip);
  if (!clip) throw new Error(`Segment ${i + 1}: no clip "${s.clip}" in the manifest.`);
  if (!(s.out > s.in)) throw new Error(`Segment ${i + 1}: "out" must be after "in".`);
  if (s.out > clip.original.duration + 0.05) problems.push(`Segment ${i + 1} ends after ${s.clip} does (${clip.original.duration.toFixed(1)}s).`);
  const seg = { ...s, i, start: round(t), duration: round(s.out - s.in) };
  if (s.broll) {
    const b = clipsById.get(s.broll.clip);
    if (!b) throw new Error(`Segment ${i + 1}: no B-roll clip "${s.broll.clip}".`);
    const offset = s.broll.offset ?? 0;
    seg.brollAt = { clip: b, start: round(t + offset), duration: round(Math.min(s.broll.duration ?? seg.duration, seg.duration - offset)), in: s.broll.in ?? 0 };
  }
  t += seg.duration;
  return seg;
});
if (!timeline.length) throw new Error("edit.json has no segments.");
const cutEnd = round(t);
const ctaSeconds = edit.cta ? (edit.cta.seconds ?? 2.5) : 0;
const total = round(cutEnd + ctaSeconds);
if (total > MAX_VIDEO_SECONDS) problems.push(`The video is ${total.toFixed(1)}s; the limit is ${MAX_VIDEO_SECONDS}s.`);
if (!brand.name || brand.name === "Business name") problems.push("brand.name is still the placeholder.");
if (edit.cta?.headline === "Your headline here") problems.push("cta.headline is still the placeholder.");

// Captions: transcript words that fall inside each segment, mapped onto the cut's timeline,
// then grouped into short lines that break on punctuation, pauses and length.
const groups = [];
if (edit.captions !== false) {
  const words = [];
  for (const seg of timeline) {
    for (const s of transcript(seg.clip).segments) {
      for (const w of s.words) {
        const mid = (w.start + w.end) / 2;
        if (mid < seg.in || mid > seg.out) continue;
        words.push({
          text: w.word,
          start: round(seg.start + Math.max(0, w.start - seg.in)),
          end: round(seg.start + Math.min(seg.duration, w.end - seg.in)),
          seg: seg.i,
        });
      }
    }
  }
  let g = null;
  for (const w of words) {
    const prev = g?.words.at(-1);
    const chars = g ? g.words.reduce((n, x) => n + x.text.length + 1, 0) : 0;
    const breakHere = !g || w.seg !== prev.seg || g.words.length >= 3 || chars + w.text.length > 16 || w.start - prev.end > 0.35 || /[.!?,;:]$/.test(prev.text);
    if (breakHere) groups.push((g = { words: [] }));
    g.words.push(w);
  }
  for (const grp of groups) grp.start = grp.words[0].start;
  for (const [i, grp] of groups.entries()) {
    const next = groups[i + 1];
    const segEnd = timeline[grp.words[0].seg].start + timeline[grp.words[0].seg].duration;
    grp.end = round(Math.min(next ? next.start : Infinity, grp.words.at(-1).end + 0.4, segEnd));
  }
}

// ---------- Write the HyperFrames project ----------

const out = join(dir, "edit");
const assets = join(out, "assets");
for (const d of [assets, join(assets, "fonts"), join(assets, "clips")]) mkdirSync(d, { recursive: true });

const indexPath = join(out, "index.html");
const stampPath = join(out, ".generated");
const hash = (s) => createHash("sha256").update(s).digest("hex");
if (existsSync(indexPath) && existsSync(stampPath) && !args.includes("--force")) {
  if (hash(readFileSync(indexPath, "utf8")) !== readFileSync(stampPath, "utf8").trim()) {
    console.error("edit/index.html was changed outside edit.json (in Studio?). Rebuilding would lose that. Re-run with --force to overwrite.");
    process.exit(1);
  }
}

const copyIfNewer = (from, to) => {
  if (!existsSync(to) || statSync(from).mtimeMs > statSync(to).mtimeMs) copyFileSync(from, to);
};
copyIfNewer(join(shared, "gsap.min.js"), join(assets, "gsap.min.js"));
for (const f of ["anton.woff2", "inter.woff2"]) copyIfNewer(join(shared, "fonts", f), join(assets, "fonts", f));
const used = new Set(timeline.flatMap((s) => [s.clip, s.brollAt?.clip.id].filter(Boolean)));
for (const id of used) copyIfNewer(join(dir, clipsById.get(id).file), join(assets, "clips", `${id}.mp4`));
let musicSrc = null;
if (edit.music?.file) {
  const from = join(dir, edit.music.file);
  if (!existsSync(from)) throw new Error(`Music file not found: ${from}`);
  musicSrc = `assets/music${edit.music.file.slice(edit.music.file.lastIndexOf("."))}`;
  copyIfNewer(from, join(out, musicSrc));
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ind = (n, lines) => lines.map((l) => " ".repeat(n) + l).join("\n");

const cams = timeline.map((s) =>
  `<div id="cam${s.i}" class="cam"${s.zoom && s.zoom !== 1 ? ` style="transform: scale(${s.zoom})"` : ""}>` +
  `<video id="v${s.i}" class="clip" src="assets/clips/${s.clip}.mp4" data-start="${s.start}" data-duration="${s.duration}" data-media-start="${round(s.in)}" data-has-audio="true" data-fade-in="0.02" data-fade-out="0.02" data-track-index="0" playsinline></video></div>`,
);
const brolls = timeline.filter((s) => s.brollAt).map((s) =>
  `<div class="cam broll"><video id="b${s.i}" class="clip" src="assets/clips/${s.brollAt.clip.id}.mp4" data-start="${s.brollAt.start}" data-duration="${s.brollAt.duration}" data-media-start="${round(s.brollAt.in)}" data-track-index="1" muted playsinline></video></div>`,
);
const caps = groups.map((g, i) =>
  `<div id="cap${i}" class="cap">${g.words.map((w, j) => `<span id="w${i}_${j}">${esc(w.text)}</span>`).join(" ")}</div>`,
);
const hookSeconds = Math.min(edit.hookSeconds ?? 2.5, cutEnd);

const tl = [];
if (edit.hook) {
  tl.push(
    `tl.fromTo("#hook", { opacity: 0, scale: 0.8, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: "back.out(2)" }, 0.05);`,
    `tl.to("#hook", { opacity: 0, y: -30, duration: 0.25, ease: "power2.in" }, ${round(hookSeconds - 0.25)});`,
  );
}
for (const [i, g] of groups.entries()) {
  tl.push(`tl.fromTo("#cap${i}", { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: 0.12, ease: "back.out(2.5)" }, ${g.start});`);
  // Only the word being spoken is highlighted.
  for (const [j, w] of g.words.entries()) {
    tl.push(`tl.set("#w${i}_${j}", { color: ACCENT }, ${w.start});`);
    if (j > 0) tl.push(`tl.set("#w${i}_${j - 1}", { color: "#fff" }, ${w.start});`);
  }
  tl.push(`tl.set("#cap${i}", { opacity: 0 }, ${g.end});`);
}
if (edit.cta) {
  const c = round(cutEnd);
  tl.push(
    `tl.fromTo("#end", { yPercent: 100 }, { yPercent: 0, duration: 0.45, ease: "power4.out" }, ${c});`,
    `tl.fromTo("#end .name", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, ${round(c + 0.25)});`,
    `tl.fromTo("#end .headline", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, ${round(c + 0.4)});`,
    `tl.fromTo("#end .button", { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, ${round(c + 0.6)});`,
    `tl.fromTo("#end .sub", { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${round(c + 0.8)});`,
  );
}

const html = `<!doctype html>
<!-- Generated by video/jobs/edit.mjs from edit.json (${job}). Rebuilding overwrites this file. -->
<html lang="en" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="assets/gsap.min.js"></script>
    <style>
      @font-face { font-family: "Anton"; src: url("assets/fonts/anton.woff2") format("woff2"); font-weight: 400; }
      @font-face { font-family: "Inter"; src: url("assets/fonts/inter.woff2") format("woff2"); font-weight: 100 900; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #000; }
      #root {
        position: relative; width: 100%; height: 100%; overflow: hidden; background: #000;
        font-family: "Inter", sans-serif;
        --accent: ${esc(brand.accent)}; --ink: ${esc(brand.ink)}; --paper: ${esc(brand.paper)};
      }
      .cam { position: absolute; inset: 0; overflow: hidden; }
      .cam video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }

      /* Captions sit above the bottom ~420px that TikTok/Reels cover with their own UI. */
      .cap { position: absolute; left: 60px; right: 60px; top: 1180px; text-align: center; opacity: 0;
        font-family: "Anton", sans-serif; font-size: 112px; line-height: 1.05; text-transform: uppercase; color: #fff;
        -webkit-text-stroke: 10px #000; paint-order: stroke fill; text-shadow: 0 8px 24px rgba(0, 0, 0, 0.45); }
      .cap span { display: inline-block; }

      #hook { position: absolute; left: 70px; right: 70px; top: 260px; padding: 34px 40px; opacity: 0;
        background: var(--accent); color: var(--ink); border-radius: 22px; text-align: center;
        font-family: "Anton", sans-serif; font-size: 92px; line-height: 1.05; text-transform: uppercase; }

      #end { position: absolute; inset: 0; background: var(--paper); color: var(--ink);
        display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 0 90px; }
      #end .name { font-size: 40px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.7; }
      #end .headline { margin-top: 36px; font-family: "Anton", sans-serif; font-size: 128px; line-height: 1.02; text-transform: uppercase; }
      #end .button { margin-top: 70px; padding: 34px 72px; border-radius: 999px; background: var(--accent); color: var(--ink);
        font-size: 50px; font-weight: 900; }
      #end .sub { margin-top: 34px; font-size: 38px; font-weight: 600; opacity: 0.7; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="${W}" data-height="${H}">
${ind(6, cams)}
${brolls.length ? ind(6, brolls) + "\n" : ""}${musicSrc ? `      <audio id="music" src="${musicSrc}" data-start="0" data-duration="${total}" data-volume="${edit.music.volume ?? 0.12}" data-fade-out="1.5" data-track-index="2"></audio>\n` : ""}
${ind(6, caps)}
${edit.hook ? `      <div id="hook">${esc(edit.hook)}</div>\n` : ""}${edit.cta ? `      <div id="end">
        <div class="name">${esc(brand.name)}</div>
        <div class="headline">${esc(edit.cta.headline)}</div>
        ${edit.cta.button ? `<div class="button">${esc(edit.cta.button)}</div>` : ""}
        ${edit.cta.sub ? `<div class="sub">${esc(edit.cta.sub)}</div>` : ""}
      </div>\n` : ""}    </div>

    <script>
      (function () {
        const tl = gsap.timeline({ paused: true });
        const ACCENT = ${JSON.stringify(brand.accent)};
        // Initial states outside the timeline so frame 0 is right.
        ${edit.cta ? 'gsap.set("#end", { yPercent: 100 });' : ""}
${ind(8, tl)}
        tl.set({}, {}, ${total});
        tl.seek(0);
        window.__timelines["main"] = tl;
      })();
    </script>
  </body>
</html>
`;

writeFileSync(indexPath, html);
writeFileSync(stampPath, hash(html) + "\n");
writeFileSync(join(out, "hyperframes.json"), JSON.stringify({ $schema: "https://hyperframes.heygen.com/schema/hyperframes.json", paths: { assets: "assets" } }, null, 2) + "\n");
writeFileSync(join(out, "meta.json"), JSON.stringify({ id: `loopgrain-${job}`, name: `Loopgrain edit: ${job}` }, null, 2) + "\n");

console.log(`Built ${join("video", "jobs", job, "edit")}: ${timeline.length} segments, ${groups.length} caption lines, ${total.toFixed(1)}s.`);
for (const p of problems) console.warn(`  ! ${p}`);

const hf = (argv) => execFileSync("npx", ["--yes", HF, ...argv], { cwd: out, stdio: "inherit", shell: process.platform === "win32" });
if (args.includes("--preview")) hf(["preview"]);
if (args.includes("--render")) {
  hf(["check", "--timeout", "60000"]);
  hf(["render", "--quality", "standard", "--output", join("..", "final.mp4")]);
  console.log(`\nRendered ${join("video", "jobs", job, "final.mp4")}`);
}
