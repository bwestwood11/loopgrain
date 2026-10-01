// Gets a customer's raw clips ready to edit.
//
//   node video/jobs/prep.mjs <job>            e.g. node video/jobs/prep.mjs acme-barber
//   node video/jobs/prep.mjs <job> --crop     cover-crop landscape clips instead of blur-fitting
//   node video/jobs/prep.mjs <job> --force    redo clips that were already prepped
//
// Put the downloaded clips in video/jobs/<job>/raw/ first (optionally the customer's
// brief in video/jobs/<job>/brief.md). For each clip, in sorted filename order, it writes:
//
//   clips/clipNN.mp4         1080x1920, 30fps constant, H.264 + AAC, loudness -16 LUFS,
//                            HDR tone-mapped to SDR, keyframe every second. Use these in
//                            the HyperFrames composition, never the raw files.
//   sheets/clipNN-MM.jpg     contact sheets, 6x4 frames with timestamps
//   transcripts/clipNN.json  faster-whisper segments with word timings
//
// plus manifest.json (every clip's facts) and transcript.md (everything in one readable
// file, times in clip seconds). Job folders hold customer footage and are gitignored.
//
// Needs ffmpeg/ffprobe on PATH and faster-whisper in video/.venv:
//   python -m venv video/.venv && video/.venv/Scripts/pip install faster-whisper
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const job = args.find((a) => !a.startsWith("--"));
const crop = args.includes("--crop");
const force = args.includes("--force");
if (!job) {
  console.error("Usage: node video/jobs/prep.mjs <job> [--crop] [--force]");
  process.exit(1);
}

const W = 1080;
const H = 1920;
const FPS = 30;
const VIDEO_EXT = new Set([".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv", ".3gp"]);

const dir = join(here, job);
const rawDir = join(dir, "raw");
if (!existsSync(rawDir)) {
  console.error(`Put the customer's clips in ${rawDir} first.`);
  process.exit(1);
}
for (const sub of ["clips", "sheets", "transcripts", ".cache"]) mkdirSync(join(dir, sub), { recursive: true });

const python = [join(here, "..", ".venv", "Scripts", "python.exe"), join(here, "..", ".venv", "bin", "python")]
  .find(existsSync);
if (!python) {
  console.error("faster-whisper isn't set up. Run: python -m venv video/.venv && video/.venv/Scripts/pip install faster-whisper");
  process.exit(1);
}

// drawtext can't take a Windows drive path without filter escaping, so copy the font
// next to the job and refer to it relatively (ffmpeg runs with cwd = the job folder).
const font = ["C:/Windows/Fonts/consola.ttf", "/System/Library/Fonts/Menlo.ttc", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"]
  .find(existsSync);
if (font) copyFileSync(font, join(dir, ".cache", "font" + extname(font)));
const fontRel = font && `.cache/font${extname(font)}`;

const run = (cmd, argv, opts = {}) =>
  execFileSync(cmd, argv, { cwd: dir, maxBuffer: 256 * 1024 ** 2, ...opts }).toString();
const ffmpeg = (argv) => run("ffmpeg", ["-v", "error", "-y", ...argv], { stdio: ["ignore", "pipe", "inherit"] });

function probe(file) {
  const info = JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file]));
  const v = info.streams.find((s) => s.codec_type === "video");
  if (!v) return null;
  const a = info.streams.find((s) => s.codec_type === "audio");
  const rotation = Number(
    v.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? v.tags?.rotate ?? 0,
  );
  const sideways = Math.abs(rotation) % 180 === 90;
  const [num, den] = (v.avg_frame_rate ?? "0/1").split("/").map(Number);
  return {
    // Display size, after the phone's rotation flag is applied (ffmpeg autorotates).
    width: sideways ? v.height : v.width,
    height: sideways ? v.width : v.height,
    rotation,
    duration: Number(info.format.duration ?? v.duration ?? 0),
    fps: den ? Math.round((num / den) * 100) / 100 : null,
    variableFrameRate: v.r_frame_rate !== v.avg_frame_rate,
    codec: v.codec_name,
    hdr: ["arib-std-b67", "smpte2084"].includes(v.color_transfer),
    hasAudio: Boolean(a),
  };
}

// iPhones record HLG/Dolby Vision by default; without tone mapping it looks washed out.
const TONEMAP =
  "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,";

function normalize(src, out, meta) {
  const pre = meta.hdr ? TONEMAP : "";
  const post = `setsar=1,fps=${FPS},format=yuv420p`;
  const cover = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`;
  // Anything wider than 4:5 would lose too much to a crop, so it's fit over a blurred fill.
  const fit = !crop && meta.width / meta.height > 0.8;
  const graph = fit
    ? `[0:v]${pre}split[a][b];[a]${cover},gblur=sigma=40,eq=brightness=-0.08[bg];` +
      `[b]scale=${W}:${H}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,${post}[v]`
    : `[0:v]${pre}${cover},${post}[v]`;

  const audioIn = meta.hasAudio ? [] : ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"];
  const audioMap = meta.hasAudio ? ["-map", "0:a:0", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11"] : ["-map", "1:a", "-shortest"];
  ffmpeg([
    "-i", src, ...audioIn,
    "-filter_complex", graph, "-map", "[v]", ...audioMap,
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-g", String(FPS), "-keyint_min", String(FPS),
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
    "-movflags", "+faststart", out,
  ]);
  return fit ? "fit-blur" : "cover-crop";
}

function contactSheets(clipFile, id, duration) {
  const every = duration <= 30 ? 1 : 2;
  for (const f of readdirSync(join(dir, "sheets"))) if (f.startsWith(`${id}-`)) rmSync(join(dir, "sheets", f));
  const label = fontRel
    ? `,drawtext=fontfile=${fontRel}:text='${id} %{pts\\:hms}':x=8:y=h-th-10:fontsize=21:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=6`
    : "";
  ffmpeg([
    "-i", clipFile,
    "-vf", `fps=1/${every},scale=270:480${label},tile=6x4:padding=4:color=black`,
    "-q:v", "4", join("sheets", `${id}-%02d.jpg`),
  ]);
  return every;
}

function transcribe(src, id) {
  const wav = join(dir, ".cache", `${id}.wav`);
  ffmpeg(["-i", src, "-vn", "-ac", "1", "-ar", "16000", wav]);
  const json = run(python, [join(here, "transcribe.py"), wav], {
    stdio: ["ignore", "pipe", "inherit"],
    env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONWARNINGS: "ignore", HF_HUB_DISABLE_SYMLINKS_WARNING: "1", HF_HUB_DISABLE_PROGRESS_BARS: "1" },
  });
  writeFileSync(join(dir, "transcripts", `${id}.json`), json);
  return JSON.parse(json);
}

const t = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

const sources = readdirSync(rawDir)
  .filter((f) => VIDEO_EXT.has(extname(f).toLowerCase()))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
if (!sources.length) {
  console.error(`No video files in ${rawDir}.`);
  process.exit(1);
}

const manifestPath = join(dir, "manifest.json");
const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")).clips : [];
const clips = [];

for (const [i, name] of sources.entries()) {
  const id = `clip${String(i + 1).padStart(2, "0")}`;
  const src = join(rawDir, name);
  const out = join(dir, "clips", `${id}.mp4`);
  const done = previous.find((c) => c.id === id && c.source === name);
  if (done && !force && [done.file, done.transcript, ...done.sheets].every((f) => existsSync(join(dir, f)))) {
    console.log(`${id}  ${name}  (already prepped)`);
    clips.push(done);
    continue;
  }

  const meta = probe(src);
  if (!meta) {
    console.warn(`${id}  ${name}  skipped: no video stream`);
    continue;
  }
  console.log(`${id}  ${name}  ${meta.width}x${meta.height} ${meta.fps}fps ${t(meta.duration)}${meta.hdr ? " HDR" : ""}`);
  process.stdout.write("      normalizing… ");
  const framing = normalize(src, out, meta);
  process.stdout.write("sheets… ");
  const sheetEvery = contactSheets(out, id, meta.duration);
  process.stdout.write("transcribing… ");
  const transcript = meta.hasAudio ? transcribe(src, id) : { language: null, segments: [] };
  if (!meta.hasAudio) writeFileSync(join(dir, "transcripts", `${id}.json`), JSON.stringify(transcript));
  console.log("done");

  clips.push({
    id,
    source: name,
    file: `clips/${id}.mp4`,
    original: meta,
    framing,
    sheets: readdirSync(join(dir, "sheets")).filter((f) => f.startsWith(`${id}-`)).map((f) => `sheets/${f}`),
    sheetEverySeconds: sheetEvery,
    transcript: `transcripts/${id}.json`,
    language: transcript.language,
    speech: transcript.segments.length > 0,
  });
}

const total = clips.reduce((s, c) => s + c.original.duration, 0);
writeFileSync(
  manifestPath,
  JSON.stringify({ job, preparedAt: new Date().toISOString(), output: { width: W, height: H, fps: FPS }, totalSeconds: Math.round(total * 10) / 10, clips }, null, 2) + "\n",
);

const brief = join(dir, "brief.md");
const lines = [`# ${job}: raw footage`, "", `${clips.length} clips, ${t(total)} total.`, ""];
if (existsSync(brief)) lines.push("## Brief", "", readFileSync(brief, "utf8").trim(), "");
for (const c of clips) {
  const o = c.original;
  lines.push(`## ${c.id} · ${c.source} · ${t(o.duration)} · ${o.width}x${o.height}${o.hdr ? " HDR" : ""} · ${c.framing}`, "");
  const tr = JSON.parse(readFileSync(join(dir, c.transcript), "utf8"));
  if (!tr.segments.length) lines.push("_(no speech)_");
  for (const s of tr.segments) lines.push(`- \`${t(s.start)}–${t(s.end)}\` ${s.text}`);
  lines.push("");
}
writeFileSync(join(dir, "transcript.md"), lines.join("\n"));
console.log(`\n${clips.length} clips, ${t(total)} total → ${join("video", "jobs", job)}`);
