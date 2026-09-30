"use server";

import { and, eq, max } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { deliverable, project, revisionRequest, type ProjectStatus } from "@/db/schema";
import { getSession } from "@/lib/session";
import { objectExists, presignUpload } from "@/lib/r2";

// Every action re-checks the admin role: Server Actions are reachable by
// direct POST, not only through the admin UI.

async function assertAdmin() {
  const session = await getSession();
  if (session?.user.role !== "admin") throw new Error("Not authorized");
}

async function getProjectRow(projectId: string) {
  const [row] = await db.select().from(project).where(eq(project.id, projectId));
  return row;
}

export async function setProjectStatus(projectId: string, status: ProjectStatus) {
  await assertAdmin();
  await db.update(project).set({ status }).where(eq(project.id, projectId));
  refresh();
}

type StartResult =
  { ok: true; storageKey: string; uploadUrl: string } | { ok: false; error: string };

export async function startDeliverableUpload(
  projectId: string,
  meta: { fileName: string; contentType: string },
): Promise<StartResult> {
  await assertAdmin();
  const p = await getProjectRow(projectId);
  if (!p) return { ok: false, error: "Project not found." };
  if (p.status === "draft") return { ok: false, error: "The customer hasn't submitted this yet." };
  if (!meta.contentType.startsWith("video/")) return { ok: false, error: "Upload a video file." };

  const ext = meta.fileName.match(/\.([a-z0-9]{1,5})$/i)?.[1]?.toLowerCase() ?? "mp4";
  const storageKey = `projects/${projectId}/final/${crypto.randomUUID()}.${ext}`;
  try {
    return { ok: true, storageKey, uploadUrl: await presignUpload(storageKey) };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "R2 isn't configured on this deployment." };
  }
}

// Records the uploaded file as the next version, marks the project delivered,
// and closes any open revision requests it answers.
export async function completeDeliverableUpload(
  projectId: string,
  storageKey: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await assertAdmin();
  if (!storageKey.startsWith(`projects/${projectId}/final/`)) {
    return { ok: false, error: "Invalid upload." };
  }
  if (!(await objectExists(storageKey))) {
    return { ok: false, error: "R2 doesn't have the file. Try uploading again." };
  }

  const [{ latest }] = await db
    .select({ latest: max(deliverable.version) })
    .from(deliverable)
    .where(eq(deliverable.projectId, projectId));

  await db.insert(deliverable).values({
    id: crypto.randomUUID(),
    projectId,
    version: (latest ?? 0) + 1,
    storageKey,
  });
  await db
    .update(project)
    .set({ status: "delivered", deliveredAt: new Date() })
    .where(eq(project.id, projectId));
  await db
    .update(revisionRequest)
    .set({ resolved: true })
    .where(and(eq(revisionRequest.projectId, projectId), eq(revisionRequest.resolved, false)));

  refresh();
  return { ok: true };
}
