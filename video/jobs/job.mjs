// Resolves what was typed on the command line to a job folder name. Accepts the
// folder name itself or the project id (any length from 6 characters, or the full
// id), since new.mjs names folders <date>-<business>-<first 6 of the id>.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export function resolveJob(jobsDir, arg) {
  if (existsSync(join(jobsDir, arg))) return arg;
  const dirs = readdirSync(jobsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const matches = arg.length >= 6 ? dirs.filter((d) => d.endsWith(`-${arg.slice(0, 6).toLowerCase()}`)) : [];
  if (matches.length === 1) return matches[0];
  console.error(
    matches.length > 1
      ? `"${arg}" matches more than one job: ${matches.join(", ")}`
      : `No job folder for "${arg}". Set it up with: npm run video:new -- ${arg}`,
  );
  process.exit(1);
}
