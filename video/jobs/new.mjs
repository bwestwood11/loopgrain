// Sets up a job folder for an order: downloads its clips from R2 and writes the brief.
//
//   npm run video:new                     list orders waiting on you (submitted, editing, revisions)
//   npm run video:new -- <project>        set up the job; <project> is the id, its first few
//                                         characters, or the /admin/projects/<id> URL
//   npm run video:new -- <project> --start   also mark it "editing" (the customer sees "Your editor is on it")
//
// Creates video/jobs/<date>-<business>-<id6>/ with raw/ (clips in upload order), brief.md
// and job.json, then prints the next command. Re-running skips clips already downloaded.
// Reads DATABASE_URL and R2_* from .env, like the app.
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { AwsClient } from "aws4fetch";

const here = dirname(fileURLToPath(import.meta.url));
const TURNAROUND_DAYS = 2; // keep in sync with lib/pricing.ts

try {
  process.loadEnvFile(join(here, "..", "..", ".env"));
} catch {
  // Fine if the variables come from the shell instead.
}
const env = (k) => {
  if (!process.env[k]) {
    console.error(`${k} isn't set. Add it to .env.`);
    process.exit(1);
  }
  return process.env[k];
};
const sql = neon(env("DATABASE_URL"));

const args = process.argv.slice(2);
const ref = args.find((a) => !a.startsWith("--"));

function addBusinessDays(date, days) {
  const d = new Date(date);
  while (days > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days--;
  }
  return d;
}
const day = (d) => (d ? new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "—");
const mb = (n) => `${(n / 1024 ** 2).toFixed(0)} MB`;

async function dueDate(p) {
  if (p.status === "revision_requested") {
    const [r] = await sql`select created_at from revision_request where project_id = ${p.id} and resolved = false order by created_at limit 1`;
    return r ? addBusinessDays(r.created_at, TURNAROUND_DAYS) : null;
  }
  return p.submitted_at ? addBusinessDays(p.submitted_at, TURNAROUND_DAYS) : null;
}

// ---------- No argument: show the queue ----------

if (!ref) {
  const rows = await sql`
    select p.id, p.title, p.status, p.submitted_at, u.name, u.business_name,
      (select count(*) from clip c where c.project_id = p.id and c.uploaded) as clips
    from project p join "user" u on u.id = p.user_id
    where p.status in ('submitted', 'editing', 'revision_requested')
    order by p.submitted_at nulls last`;
  if (!rows.length) {
    console.log("Nothing waiting. 🎉");
    process.exit(0);
  }
  console.log("Waiting on you:\n");
  for (const p of rows) {
    const due = await dueDate(p);
    console.log(`  ${p.id.slice(0, 8)}  ${p.status.padEnd(18)} due ${day(due).padEnd(12)} ${p.business_name || p.name} · ${p.title} (${p.clips} clips)`);
  }
  console.log("\nSet one up with: npm run video:new -- <id>");
  process.exit(0);
}

// ---------- Find the project ----------

const id = ref.match(/projects\/([^/?#]+)/)?.[1] ?? ref;
const matches = await sql`
  select p.*, u.name, u.email, u.business_name
  from project p join "user" u on u.id = p.user_id
  where p.id like ${id + "%"}`;
if (matches.length !== 1) {
  console.error(matches.length ? `"${id}" matches ${matches.length} projects; use more of the id.` : `No project matches "${id}".`);
  process.exit(1);
}
const p = matches[0];
if (p.status === "draft") {
  console.error(`"${p.title}" is still a draft: the customer hasn't paid and sent it yet.`);
  process.exit(1);
}

const clips = await sql`select * from clip where project_id = ${p.id} and uploaded order by created_at`;
const revisions = await sql`select * from revision_request where project_id = ${p.id} order by created_at`;
const due = await dueDate(p);

// ---------- Job folder ----------

const slug = (s) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").slice(0, 40).replace(/-$/, "");
const existing = readdirSync(here, { withFileTypes: true }).find((d) => d.isDirectory() && d.name.endsWith(`-${p.id.slice(0, 6)}`));
const date = new Date(p.submitted_at ?? p.paid_at ?? p.created_at).toISOString().slice(0, 10);
const job = existing?.name ?? `${date}-${slug(p.business_name || p.name || p.title) || "customer"}-${p.id.slice(0, 6)}`;
const dir = join(here, job);
const rawDir = join(dir, "raw");
mkdirSync(rawDir, { recursive: true });

console.log(`${p.business_name || p.name} · ${p.title}`);
console.log(`Status ${p.status}, due ${day(due)} → video/jobs/${job}\n`);

// ---------- Download clips ----------

const r2 = new AwsClient({ accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY"), service: "s3", region: "auto" });
const endpoint = `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com/${env("R2_BUCKET")}`;
const objectUrl = (key) => `${endpoint}/${key.split("/").map(encodeURIComponent).join("/")}`;

// Numbered by upload order so prep.mjs (which sorts by name) keeps the customer's order.
const safe = (s) => s.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
let failed = 0;
for (const [i, c] of clips.entries()) {
  const name = `${String(i + 1).padStart(2, "0")}-${safe(c.file_name)}`;
  const dest = join(rawDir, name);
  if (existsSync(dest) && statSync(dest).size === c.size_bytes) {
    console.log(`  ✓ ${name} (already downloaded)`);
    continue;
  }
  try {
    const res = await r2.fetch(objectUrl(c.storage_key));
    if (!res.ok) throw new Error(`R2 returned ${res.status}`);
    let done = 0;
    let shown = -1;
    const body = Readable.fromWeb(res.body);
    body.on("data", (chunk) => {
      done += chunk.length;
      const pct = Math.floor((done / c.size_bytes) * 100);
      if (pct !== shown && process.stdout.isTTY) {
        shown = pct;
        process.stdout.write(`\r  ↓ ${name} ${mb(done)} / ${mb(c.size_bytes)} (${pct}%)`);
      }
    });
    await pipeline(body, createWriteStream(dest + ".part"));
    renameSync(dest + ".part", dest);
    if (process.stdout.isTTY) process.stdout.write("\r\x1b[K");
    console.log(`  ✓ ${name} ${mb(c.size_bytes)}`);
  } catch (err) {
    failed++;
    if (process.stdout.isTTY) process.stdout.write("\r\x1b[K");
    console.error(`  ✗ ${name}: ${err.message}`);
  }
}

// ---------- Brief ----------

const open = revisions.filter((r) => !r.resolved);
const brief = [
  `# ${p.title}`,
  "",
  `- **Business:** ${p.business_name || "(not given)"}`,
  `- **Customer:** ${p.name} <${p.email}>`,
  `- **Due:** ${day(due)}`,
  `- **Admin:** /admin/projects/${p.id}`,
  "",
  "## Brief",
  "",
  p.brief?.trim() || "_No brief. Work from the clips._",
  "",
];
if (open.length) {
  brief.push("## Revision requested", "");
  for (const r of open) brief.push(`${day(r.created_at)}: ${r.note.trim()}`, "");
}
const past = revisions.filter((r) => r.resolved);
if (past.length) {
  brief.push("## Past revisions", "");
  for (const r of past) brief.push(`- ${day(r.created_at)}: ${r.note.trim()}`);
  brief.push("");
}
brief.push(
  "## Brand (fill in)",
  "",
  "- Colors: ",
  "- CTA: ",
  "",
);
const briefPath = join(dir, "brief.md");
// Rewritten each run so new revision notes show up, but keep anything typed under "Brand".
if (existsSync(briefPath)) {
  const old = readFileSync(briefPath, "utf8");
  const brand = old.indexOf("## Brand");
  if (brand !== -1) brief.splice(brief.indexOf("## Brand (fill in)"), Infinity, old.slice(brand).trimEnd(), "");
}
writeFileSync(briefPath, brief.join("\n"));
writeFileSync(
  join(dir, "job.json"),
  JSON.stringify({ projectId: p.id, title: p.title, business: p.business_name, customer: p.email, clips: clips.length, setUpAt: new Date().toISOString() }, null, 2) + "\n",
);

// ---------- Optionally mark as editing ----------

if (args.includes("--start")) {
  if (p.status === "submitted") {
    await sql`update project set status = 'editing', updated_at = now() where id = ${p.id} and status = 'submitted'`;
    console.log("\nMarked as editing. The customer now sees \"Your editor is on it\".");
  } else {
    console.log(`\nLeft the status as ${p.status} (--start only changes submitted → editing).`);
  }
}

console.log(`\n${clips.length - failed}/${clips.length} clips in video/jobs/${job}/raw`);
if (failed) {
  console.log("Re-run the same command to retry the failed ones.");
  process.exit(1);
}
console.log(`Fill in the brand at the bottom of brief.md, then:\n\n  npm run video:prep -- ${p.id.slice(0, 8)}`);
