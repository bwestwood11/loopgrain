// Turns a prepped job into a HyperFrames edit: cuts, word-by-word captions, a hook,
// optional B-roll and music, and a CTA end card.
//
//   node video/jobs/edit.mjs <job>             first run: drafts edit.json from the transcript
//                                              after that: builds video/jobs/<job>/edit/
//   node video/jobs/edit.mjs <job> --preview   build, then open HyperFrames Studio
//   node video/jobs/edit.mjs <job> --render    build, check, render video/jobs/<job>/final.mp4
//   node video/jobs/edit.mjs <job> --force     overwrite edit/index.html even if Studio changed it
//   node video/jobs/edit.mjs <job> --extra     start video/jobs/<job>/extra.html for custom animation
//
// Run prep.mjs first. Write edit.json to the house style in STYLE.md (reference.edit.json is
// the worked example). edit.json is the source of truth for the cut:
//
//   {
//     "brand":    { "name": "Main Street Barbers",
//                   "accent": "#ffd23f",      // hook box and button
//                   "accentText": "#111111",  // text on accent (defaults to ink)
//                   "highlight": "#ffd23f",   // spoken caption word (defaults to accent); keep it bright
//                   "ink": "#111111", "paper": "#ffffff" },   // end card text and background
//     "hook":     "Waiting too long between cuts?",          // big text over the opening, or null
//     "hookSeconds": 2.5,
//     "captions": true,                                       // word-by-word, from the transcript
//     "grade":    "skin-soft",       // HyperFrames grading preset, a full payload
//                                    // ({ preset, intensity, adjust, details }), or null for none
//     "motion":   "push",            // camera move on every shot: push (punch in, then drift),
//                                    // drift (slow push only) or none
//     "transition": "cut",           // how each shot enters: cut, flash, whip, zoom, slash or iris
//     "segments": [                                           // played in order
//       { "clip": "clip01", "in": 0.0, "out": 2.7, "transition": "slash" },   // on the first shot: an intro
//       { "clip": "clip01", "in": 3.3, "out": 5.9, "zoom": 1.12,          // punch-in hides a jump cut
//         "broll": { "clip": "clip04", "in": 1.0, "offset": 0.4, "duration": 1.5 } },  // muted cutaway
//       { "clip": "clip02", "in": 0.0, "out": 3.4, "transition": "whip", "motion": "drift", "grade": "warm-daylight" }
//     ],
//     "cta":      { "headline": "Book online in 30 seconds", "button": "Book now", "sub": "Link in bio", "seconds": 2.5,
//                   "tag": "Free consult",   // optional pill above the headline
//                   "tap": true },           // optional: a hand taps the button (needs seconds >= 2.2)
//     "music":    { "file": "music.mp3", "volume": 0.12 },  // file in the job folder, or null
//     "overlays": [ { "type": "lowerThird", "at": 3.6, "name": "Dana Ruiz" } ]   // motion graphics: see overlays.mjs
//   }
//
// Times are seconds in the prepped clip (clips/clipNN.mp4 = transcript times). The edit
// folder is a normal HyperFrames project: tweak it in Studio, but rebuilding from
// edit.json overwrites index.html, so make structural changes in edit.json.
//
// One-off animation that edit.json can't express goes in <job>/extra.html (start one with
// --extra). Its <style>, markup and <script> are folded into every build, so it survives
// rebuilds; files in <job>/extra/ are copied to edit/assets/extra/.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveJob } from "./job.mjs";
import { FMT_SOURCE, FONT_FACES, OVERLAY_CSS, buildOverlays } from "./overlays.mjs";
import { EXTRA_TEMPLATE, editRuntime, readExtra } from "./extra.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const shared = join(here, "..", "shared");
const HF = "hyperframes@0.8.92";
const MAX_VIDEO_SECONDS = 60; // keep in sync with lib/pricing.ts
const W = 1080;
const H = 1920;

const args = process.argv.slice(2);
const typed = args.find((a) => !a.startsWith("--"));
if (!typed) {
  console.error("Usage: node video/jobs/edit.mjs <job> [--preview | --render] [--force] [--extra]");
  process.exit(1);
}
const job = resolveJob(here, typed);
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

// HyperFrames 0.8.92 grading presets (`npx hyperframes media-treatment --capability presets`).
const GRADE_PRESETS = ["neutral", "warm-daylight", "clean-studio", "skin-soft", "food-pop", "night-lift", "muted-editorial", "vintage-wash", "mono-clean", "mono-fade", "soft-boost", "bright-pop", "deep-contrast", "creator-camcorder", "vhs-playback", "home-movie-8mm", "editorial-halftone", "two-ink-print"];
const MOTIONS = ["push", "drift", "none"];
const TRANSITIONS = ["cut", "flash", "whip", "zoom", "slash", "iris"];
// Tapping hand for cta.tap (Material Design "touch_app" icon, Apache 2.0).
const HAND_SVG = `<svg class="hand" viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" stroke="#111" stroke-width="0.9" stroke-linejoin="round" d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.39z"/></svg>`;
// Same look as the hero spots: a soft skin preset at partial strength, a touch of contrast and a light vignette.
const DEFAULT_GRADE = { preset: "skin-soft", intensity: 0.55, adjust: { contrast: 0.08, vibrance: 0.06 }, details: { vignette: 0.16 } };

// ---------- --extra: start extra.html ----------

const extraPath = join(dir, "extra.html");
if (args.includes("--extra")) {
  if (existsSync(extraPath)) {
    console.error(`${join("video", "jobs", job, "extra.html")} already exists.`);
    process.exit(1);
  }
  writeFileSync(extraPath, EXTRA_TEMPLATE);
  console.log(`Wrote ${join("video", "jobs", job, "extra.html")}. Edit it, then build as usual.`);
  process.exit(0);
}

// ---------- First run: draft edit.json ----------

const editPath = join(dir, "edit.json");
if (!existsSync(editPath)) {
  // House style (STYLE.md): the end card always gets the tapping hand.
  const cta = { tag: null, headline: "Your headline here", button: "Book now", sub: "Link in bio", seconds: 3, tap: true };
  const budget = MAX_VIDEO_SECONDS - cta.seconds;
  const segments = [];
  let total = 0;
  for (const c of manifest.clips) {
    let previous = null;
    for (const s of transcript(c.id).segments) {
      const seg = { clip: c.id, in: round(Math.max(0, s.start - 0.15)), out: round(Math.min(c.original.duration, s.end + 0.25)) };
      if (total + seg.out - seg.in > budget) break;
      // Alternate a punch-in on consecutive takes from the same clip to hide the jump cut,
      // and flash into a new clip.
      if (previous && !previous.zoom) seg.zoom = 1.12;
      if (!previous && segments.length) seg.transition = "flash";
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
    grade: DEFAULT_GRADE,
    motion: "push",
    transition: "cut",
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
brand.accentText ??= brand.ink;
brand.highlight ??= brand.accent;
const problems = [];

// A missing key gets the defaults; null turns grading off.
const gradeOf = (g, where) => {
  if (g === null || g === false) return null;
  if (g === undefined) return DEFAULT_GRADE;
  const payload = typeof g === "string" ? { preset: g, intensity: 0.6 } : g;
  if (payload.preset && !GRADE_PRESETS.includes(payload.preset)) throw new Error(`${where}: unknown grade preset "${payload.preset}". Use one of: ${GRADE_PRESETS.join(", ")}.`);
  return payload;
};
const pick = (value, allowed, key, where) => {
  if (!allowed.includes(value)) throw new Error(`${where}: unknown ${key} "${value}". Use one of: ${allowed.join(", ")}.`);
  return value;
};
const baseGrade = gradeOf(edit.grade, "grade");
const baseMotion = pick(edit.motion ?? "push", MOTIONS, "motion", "motion");
const baseTransition = pick(edit.transition ?? "cut", TRANSITIONS, "transition", "transition");

let t = 0;
const timeline = (edit.segments ?? []).map((s, i) => {
  const clip = clipsById.get(s.clip);
  if (!clip) throw new Error(`Segment ${i + 1}: no clip "${s.clip}" in the manifest.`);
  if (!(s.out > s.in)) throw new Error(`Segment ${i + 1}: "out" must be after "in".`);
  if (s.out > clip.original.duration + 0.05) problems.push(`Segment ${i + 1} ends after ${s.clip} does (${clip.original.duration.toFixed(1)}s).`);
  const where = `Segment ${i + 1}`;
  const seg = {
    ...s,
    i,
    start: round(t),
    duration: round(s.out - s.in),
    grade: "grade" in s ? gradeOf(s.grade, where) : baseGrade,
    motion: pick(s.motion ?? baseMotion, MOTIONS, "motion", where),
    // The top-level transition is for cuts between shots; the first shot only gets an intro if it asks.
    transition: pick(s.transition ?? (i === 0 ? "cut" : baseTransition), TRANSITIONS, "transition", where),
  };
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

// .cam carries the transitions, .move the camera motion (and the static zoom), so the two never fight.
const grading = (g) => (g ? ` data-color-grading="${esc(JSON.stringify(g))}"` : "");
const cams = timeline.map((s) =>
  `<div id="cam${s.i}" class="cam"><div id="mv${s.i}" class="move" data-layout-allow-overflow${s.zoom && s.zoom !== 1 ? ` style="transform: scale(${s.zoom})"` : ""}>` +
  `<video id="v${s.i}" class="clip" src="assets/clips/${s.clip}.mp4" data-start="${s.start}" data-duration="${s.duration}" data-media-start="${round(s.in)}" data-has-audio="true" data-fade-in="0.02" data-fade-out="0.02" data-track-index="0"${grading(s.grade)} playsinline></video></div></div>`,
);
const brolls = timeline.filter((s) => s.brollAt).map((s) =>
  `<div class="cam broll"><div id="bm${s.i}" class="move" data-layout-allow-overflow><video id="b${s.i}" class="clip" src="assets/clips/${s.brollAt.clip.id}.mp4" data-start="${s.brollAt.start}" data-duration="${s.brollAt.duration}" data-media-start="${round(s.brollAt.in)}" data-track-index="1"${grading(s.grade)} muted playsinline></video></div></div>`,
);
const transitionsUsed = new Set(timeline.map((s) => s.transition));
const caps = groups.map((g, i) =>
  `<div id="cap${i}" class="cap">${g.words.map((w, j) => `<span id="w${i}_${j}">${esc(w.text)}</span>`).join(" ")}</div>`,
);
const hookSeconds = Math.min(edit.hookSeconds ?? 2.5, cutEnd);

// A frame of the cut as a graded still (for the freeze overlay), extracted once with ffmpeg.
const still = (at) => {
  const seg = timeline.find((s) => at >= s.start && at < s.start + s.duration) ?? timeline.at(-1);
  const src = round(seg.in + Math.max(0, at - seg.start));
  const name = `${seg.clip}-${Math.round(src * 1000)}.jpg`;
  const file = join(assets, "stills", name);
  if (!existsSync(file)) {
    mkdirSync(join(assets, "stills"), { recursive: true });
    execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(src), "-i", join(dir, clipsById.get(seg.clip).file), "-frames:v", "1", "-q:v", "2", file]);
  }
  return { src: `assets/stills/${name}`, grade: seg.grade };
};

const overlays = buildOverlays(edit.overlays, {
  cutEnd,
  captions: edit.captions !== false,
  hook: edit.hook ? { end: hookSeconds, top: 260, bottom: 560 } : null,
  esc,
  round,
  still,
  readJobFile: (name) => {
    const file = join(dir, name);
    if (!existsSync(file)) throw new Error(`Overlay file not found: ${file}`);
    return readFileSync(file, "utf8");
  },
  brand,
});
problems.push(...overlays.problems);
for (const f of overlays.fonts) copyIfNewer(join(shared, "fonts", f), join(assets, "fonts", f));

const extra = existsSync(extraPath) ? readExtra(extraPath) : null;
if (extra) {
  if (existsSync(join(dir, "extra"))) cpSync(join(dir, "extra"), join(assets, "extra"), { recursive: true });
  const generated = new Set(
    [...cams, ...brolls, ...caps, ...overlays.html, `<i id="root"><i id="hook"><i id="end"><i id="flash"><i id="s1"><i id="s2"><i id="s3"><i id="iris"><i id="music">`]
      .flatMap((h) => [...h.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])),
  );
  const clashes = extra.ids.filter((id) => generated.has(id));
  if (clashes.length) throw new Error(`extra.html reuses generated ids: ${clashes.join(", ")}. Prefix yours with "x-".`);
}

const tl = [];
const tw = (target, from, to, at) =>
  tl.push(`tl.fromTo(${JSON.stringify(target)}, ${JSON.stringify(from)}, ${JSON.stringify({ ...to, immediateRender: false })}, ${round(Math.max(0, at))});`);
const sc = (n) => round(n);
for (const s of timeline) {
  const c = s.start;
  const z = s.zoom ?? 1;
  const mv = `#mv${s.i}`;
  // Camera motion: punch in hard and settle, then keep drifting so no shot is ever static.
  if (s.motion === "push") {
    const settle = Math.min(0.6, s.duration);
    const keyframes = [{ scale: sc(z * 1.03), duration: round(settle), ease: "expo.out" }];
    if (s.duration > settle) keyframes.push({ scale: sc(z * 1.09), duration: round(s.duration - settle), ease: "none" });
    tw(mv, { scale: sc(z * 1.16) }, { keyframes }, c);
  } else if (s.motion === "drift") {
    tw(mv, { scale: sc(z) }, { scale: sc(z * 1.07), duration: s.duration, ease: "none" }, c);
  }
  if (s.brollAt && s.motion !== "none") {
    tw(`#bm${s.i}`, { scale: 1.04 }, { scale: 1.12, duration: s.brollAt.duration, ease: "none" }, s.brollAt.start);
  }

  // Transitions. Each has an "out" half on the previous shot (skipped on the first shot,
  // where it plays as an intro) and an "in" half at the cut.
  const prev = s.i > 0 ? `#cam${s.i - 1}` : null;
  const cam = `#cam${s.i}`;
  const blur = (px) => `blur(${px}px)`;
  switch (s.transition) {
    // Flash and iris use one keyframed tween per cut so the two halves can't overlap by a rounding error.
    case "flash":
      if (prev) tw("#flash", { opacity: 0 }, { keyframes: [{ opacity: 0.9, duration: 0.06, ease: "power1.in" }, { opacity: 0, duration: 0.3, ease: "power2.out" }] }, c - 0.06);
      else tw("#flash", { opacity: 0.9 }, { opacity: 0, duration: 0.3, ease: "power2.out" }, c);
      break;
    case "whip":
      if (prev) tw(prev, { yPercent: 0, filter: blur(0) }, { yPercent: -22, filter: blur(14), duration: 0.16, ease: "power3.in" }, c - 0.16);
      tw(cam, { yPercent: 22, filter: blur(14) }, { yPercent: 0, filter: blur(0), duration: 0.3, ease: "power3.out" }, c);
      break;
    case "zoom":
      if (prev) tw(prev, { scale: 1, filter: blur(0) }, { scale: 1.4, filter: blur(12), duration: 0.16, ease: "power3.in" }, c - 0.16);
      tw(cam, { scale: 1.4, filter: blur(12) }, { scale: 1, filter: blur(0), duration: 0.32, ease: "expo.out" }, c);
      break;
    case "slash": {
      // Three skewed brand-colour bars sweep across; the cut lands while they cover the middle.
      const lead = prev ? 0.16 : 0;
      // Skewed 20deg over 2520px tall, a bar's corners reach ~460px past its box, so park them well off-frame.
      ["#s1", "#s2", "#s3"].forEach((bar, k) => tw(bar, { x: -1500 }, { x: 2000, duration: 0.4, ease: "power2.inOut" }, c - lead + k * 0.04));
      break;
    }
    case "iris":
      if (prev) tw("#iris", { scale: 0 }, { keyframes: [{ scale: 1, duration: 0.22, ease: "power3.in" }, { scale: 0, duration: 0.35, ease: "power3.out" }] }, c - 0.22);
      else tw("#iris", { scale: 1 }, { scale: 0, duration: 0.35, ease: "power3.out" }, c);
      break;
  }
}
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
    `tl.fromTo("#end .button", { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)", immediateRender: false }, ${round(c + 0.6)});`,
    `tl.fromTo("#end .sub", { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${round(c + 0.8)});`,
  );
  if (edit.cta.tag) {
    tl.push(`tl.fromTo("#end .tag", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2.5)" }, ${round(c + 0.32)});`);
  }
  // A hand slides in and taps the button: a ripple and a squash, so it reads as "tap this".
  if (edit.cta.tap && edit.cta.button) {
    if (ctaSeconds < 2.2) problems.push(`cta.tap needs cta.seconds of 2.2 or more (it's ${ctaSeconds}).`);
    const tap = round(c + 1.5);
    tl.push(
      `tl.fromTo("#end .hand", { opacity: 0, x: 220, y: 260 }, { opacity: 1, x: 0, y: 0, duration: 0.45, ease: "power3.out", immediateRender: false }, ${round(c + 1.0)});`,
      `tl.fromTo("#end .hand", { scale: 1 }, { keyframes: [{ scale: 0.86, duration: 0.1 }, { scale: 1, duration: 0.18 }], immediateRender: false }, ${tap});`,
      `tl.fromTo("#end .button", { scale: 1 }, { keyframes: [{ scale: 0.93, duration: 0.1 }, { scale: 1.06, duration: 0.16 }, { scale: 1, duration: 0.2 }], immediateRender: false }, ${tap});`,
      `tl.fromTo("#end .ripple", { opacity: 0.85, scale: 0.95 }, { opacity: 0, scale: 1.4, duration: 0.55, ease: "power2.out", immediateRender: false }, ${round(tap + 0.05)});`,
      // Then the hand slides back out so it doesn't sit on the sub line.
      `tl.to("#end .hand", { opacity: 0, x: 160, y: 200, duration: 0.35, ease: "power2.in" }, ${round(tap + 0.55)});`,
    );
  }
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
${[...overlays.fonts].map((f) => `      ${FONT_FACES[f]}\n`).join("")}      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #000; }
      #root {
        position: relative; width: 100%; height: 100%; overflow: hidden; background: #000;
        font-family: "Inter", sans-serif;
        --accent: ${esc(brand.accent)}; --accent-text: ${esc(brand.accentText)}; --highlight: ${esc(brand.highlight)}; --ink: ${esc(brand.ink)}; --paper: ${esc(brand.paper)};
      }
      .cam { position: absolute; inset: 0; overflow: hidden; }
      .cam video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      .move { position: absolute; inset: 0; }

      /* Transition layer: above the footage, below captions and the hook. */
      #flash { position: absolute; inset: 0; background: #fff; opacity: 0; }
      .slash { position: absolute; top: -300px; bottom: -300px; left: 0; width: 700px; }
      #s1 { background: var(--accent); }
      #s2 { background: var(--paper); }
      #s3 { background: var(--highlight); }
      #iris { position: absolute; left: 540px; top: 960px; width: 2400px; height: 2400px; margin: -1200px 0 0 -1200px;
        border-radius: 50%; background: var(--accent); }
${overlays.html.length ? `\n      /* Overlays: above the transitions, below captions and the hook. */${OVERLAY_CSS}\n` : ""}${extra?.css ? `\n      /* ---- extra.html ---- */\n${ind(6, extra.css.split("\n").map((l) => l.trimEnd()))}\n` : ""}
      /* Captions sit above the bottom ~420px that TikTok/Reels cover with their own UI. */
      .cap { position: absolute; left: 60px; right: 60px; top: 1180px; text-align: center; opacity: 0;
        font-family: "Anton", sans-serif; font-size: 112px; line-height: 1.05; text-transform: uppercase; color: #fff;
        -webkit-text-stroke: 10px #000; paint-order: stroke fill; text-shadow: 0 8px 24px rgba(0, 0, 0, 0.45); }
      .cap span { display: inline-block; }

      #hook { position: absolute; left: 70px; right: 70px; top: 260px; padding: 34px 40px; opacity: 0;
        background: var(--accent); color: var(--accent-text); border-radius: 22px; text-align: center;
        font-family: "Anton", sans-serif; font-size: 92px; line-height: 1.05; text-transform: uppercase; }

      #end { position: absolute; inset: 0; background: var(--paper); color: var(--ink);
        display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 0 90px; }
      #end .name { font-size: 40px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.7; }
      #end .headline { margin-top: 36px; font-family: "Anton", sans-serif; font-size: 128px; line-height: 1.02; text-transform: uppercase; }
      #end .tag { margin-top: 30px; padding: 10px 28px; border-radius: 999px; background: var(--accent); color: var(--accent-text);
        font-size: 32px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
      #end .btnwrap { position: relative; margin-top: 70px; }
      #end .button { padding: 34px 72px; border-radius: 999px; background: var(--accent); color: var(--accent-text);
        font-size: 50px; font-weight: 900; }
      #end .ripple { position: absolute; inset: 0; border-radius: 999px; border: 6px solid var(--accent); opacity: 0; }
      #end .hand { position: absolute; right: 30px; bottom: -110px; width: 150px; height: 150px; opacity: 0; transform-origin: 48% 13%;
        filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.45)); }
      #end .sub { margin-top: 34px; font-size: 38px; font-weight: 600; opacity: 0.7; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="${W}" data-height="${H}">
${ind(6, cams)}
${brolls.length ? ind(6, brolls) + "\n" : ""}${musicSrc ? `      <audio id="music" src="${musicSrc}" data-start="0" data-duration="${total}" data-volume="${edit.music.volume ?? 0.12}" data-fade-out="1.5" data-track-index="2"></audio>\n` : ""}${transitionsUsed.has("flash") ? `      <div id="flash"></div>\n` : ""}${transitionsUsed.has("slash") ? `      <i id="s1" class="slash"></i><i id="s2" class="slash"></i><i id="s3" class="slash"></i>\n` : ""}${transitionsUsed.has("iris") ? `      <div id="iris"></div>\n` : ""}${overlays.html.length ? ind(6, overlays.html) + "\n" : ""}${extra?.html ? `      <!-- extra.html -->\n${ind(6, extra.html.split("\n").map((l) => l.trimEnd()))}\n` : ""}
${ind(6, caps)}
${edit.hook ? `      <div id="hook">${esc(edit.hook)}</div>\n` : ""}${edit.cta ? `      <div id="end">
        <div class="name">${esc(brand.name)}</div>
        ${edit.cta.tag ? `<div class="tag">${esc(edit.cta.tag)}</div>` : ""}
        <div class="headline">${esc(edit.cta.headline)}</div>
        ${edit.cta.button ? `<div class="btnwrap"><i class="ripple"></i><div class="button">${esc(edit.cta.button)}</div>${edit.cta.tap ? HAND_SVG : ""}</div>` : ""}
        ${edit.cta.sub ? `<div class="sub">${esc(edit.cta.sub)}</div>` : ""}
      </div>\n` : ""}    </div>

    <script>
      (function () {
        const tl = gsap.timeline({ paused: true });
        const ACCENT = ${JSON.stringify(brand.highlight)};
${overlays.usesFmt || extra ? `        ${FMT_SOURCE}\n` : ""}        // Initial states outside the timeline so frame 0 is right.
        ${edit.cta ? 'gsap.set("#end", { yPercent: 100 });' : ""}
        ${transitionsUsed.has("slash") ? 'gsap.set(".slash", { x: -1500, skewX: -20 });' : ""}
        ${transitionsUsed.has("iris") ? 'gsap.set("#iris", { scale: 0 });' : ""}
${overlays.init.length ? ind(8, overlays.init) + "\n" : ""}${ind(8, tl)}
${overlays.tl.length ? ind(8, overlays.tl) + "\n" : ""}${extra?.js ? `        // ---- extra.html ----\n        {\n        ${editRuntime({ cutEnd, total, timeline, groups, round })}\n${ind(10, extra.js.split("\n").map((l) => l.trimEnd()))}\n        }\n` : ""}        tl.set({}, {}, ${total});
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

console.log(`Built ${join("video", "jobs", job, "edit")}: ${timeline.length} segments, ${groups.length} caption lines, ${overlays.html.length} overlays${extra ? " + extra.html" : ""}, ${total.toFixed(1)}s.`);
for (const p of problems) console.warn(`  ! ${p}`);

const hf = (argv) => execFileSync("npx", ["--yes", HF, ...argv], { cwd: out, stdio: "inherit", shell: process.platform === "win32" });
if (args.includes("--preview")) hf(["preview"]);
if (args.includes("--render")) {
  hf(["check", "--timeout", "60000"]);
  hf(["render", "--quality", "standard", "--output", join("..", "final.mp4")]);
  console.log(`\nRendered ${join("video", "jobs", job, "final.mp4")}`);
}
