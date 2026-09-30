"use server";

import { and, count, desc, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clip, deliverable, project, revisionRequest } from "@/db/schema";
import { getSession } from "@/lib/session";
import { deleteObject, objectExists, presignUpload } from "@/lib/r2";
import { MAX_CLIP_BYTES, MAX_CLIP_SECONDS, MAX_CLIPS_PER_PROJECT } from "@/lib/pricing";

// Every action re-checks the session and ownership: Server Actions are
// reachable by direct POST, not only through the dashboard UI.

export type FormState = { error?: string } | undefined;

async function userId() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in");
  return session.user.id;
}

async function ownedProject(uid: string, projectId: string) {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, uid)));
  return row;
}

async function ownedClip(uid: string, clipId: string) {
  const [row] = await db
    .select({ clip, projectStatus: project.status })
    .from(clip)
    .innerJoin(project, eq(clip.projectId, project.id))
    .where(and(eq(clip.id, clipId), eq(project.userId, uid)));
  return row;
}

export async function createProject(_prev: FormState, formData: FormData): Promise<FormState> {
  const uid = await userId();
  const title = String(formData.get("title") ?? "").trim();
  const brief = String(formData.get("brief") ?? "").trim();

  if (!title) return { error: "Give the video a name so you can find it later." };
  if (title.length > 80) return { error: "Keep the name under 80 characters." };
  if (brief.length > 2000) return { error: "Keep the brief under 2,000 characters." };

  const id = crypto.randomUUID();
  await db.insert(project).values({ id, userId: uid, title, brief: brief || null });
  redirect(`/dashboard/projects/${id}`);
}

type ClipMeta = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  // Null when the browser can't read the file's length; the editor checks those by hand.
  durationSeconds: number | null;
};
type StartResult = { ok: true; clipId: string; uploadUrl: string } | { ok: false; error: string };

export async function startClipUpload(projectId: string, meta: ClipMeta): Promise<StartResult> {
  const uid = await userId();
  const p = await ownedProject(uid, projectId);
  if (!p) return { ok: false, error: "Project not found." };
  if (p.status !== "draft")
    return { ok: false, error: "This project was already sent to your editor." };

  if (!meta.contentType.startsWith("video/"))
    return { ok: false, error: "Only video files can be uploaded." };
  if (!(meta.sizeBytes > 0 && meta.sizeBytes <= MAX_CLIP_BYTES)) {
    return { ok: false, error: "Clips must be under 2 GB." };
  }
  const d = meta.durationSeconds;
  if (d !== null && !(d > 0 && d <= MAX_CLIP_SECONDS + 0.5)) {
    return { ok: false, error: `Clips must be ${MAX_CLIP_SECONDS} seconds or shorter.` };
  }

  const [{ n }] = await db.select({ n: count() }).from(clip).where(eq(clip.projectId, projectId));
  if (n >= MAX_CLIPS_PER_PROJECT) {
    return { ok: false, error: `A project can hold up to ${MAX_CLIPS_PER_PROJECT} clips.` };
  }

  const clipId = crypto.randomUUID();
  const ext = meta.fileName.match(/\.([a-z0-9]{1,5})$/i)?.[1]?.toLowerCase() ?? "mp4";
  const storageKey = `projects/${projectId}/raw/${clipId}.${ext}`;

  let uploadUrl: string;
  try {
    uploadUrl = await presignUpload(storageKey);
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Uploads aren't available right now. Please try again later." };
  }

  await db.insert(clip).values({
    id: clipId,
    projectId,
    fileName: meta.fileName.slice(0, 200),
    contentType: meta.contentType,
    sizeBytes: Math.round(meta.sizeBytes),
    durationSeconds: meta.durationSeconds,
    storageKey,
  });
  return { ok: true, clipId, uploadUrl };
}

export async function completeClipUpload(clipId: string): Promise<{ ok: boolean }> {
  const uid = await userId();
  const row = await ownedClip(uid, clipId);
  if (!row || !(await objectExists(row.clip.storageKey))) return { ok: false };
  await db.update(clip).set({ uploaded: true }).where(eq(clip.id, clipId));
  return { ok: true };
}

export async function removeClip(clipId: string) {
  const uid = await userId();
  const row = await ownedClip(uid, clipId);
  if (!row || row.projectStatus !== "draft") return;
  await db.delete(clip).where(eq(clip.id, clipId));
  await deleteObject(row.clip.storageKey).catch((err) => console.error(err));
  refresh();
}

export async function submitProject(projectId: string): Promise<FormState> {
  const uid = await userId();
  const p = await ownedProject(uid, projectId);
  if (!p || p.status !== "draft") return { error: "This project can't be submitted." };

  const [{ n }] = await db
    .select({ n: count() })
    .from(clip)
    .where(and(eq(clip.projectId, projectId), eq(clip.uploaded, true)));
  if (n === 0) return { error: "Upload at least one clip first." };

  // Drop rows for uploads that never finished so the editor only sees real files.
  await db.delete(clip).where(and(eq(clip.projectId, projectId), eq(clip.uploaded, false)));
  await db
    .update(project)
    .set({ status: "submitted", submittedAt: new Date() })
    .where(eq(project.id, projectId));
  refresh();
}

export async function requestRevision(
  projectId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const uid = await userId();
  const p = await ownedProject(uid, projectId);
  if (!p || p.status !== "delivered")
    return { error: "Revisions can only be requested on a delivered video." };

  const note = String(formData.get("note") ?? "").trim();
  if (note.length < 10) return { error: "Tell your editor what to change (at least a sentence)." };
  if (note.length > 2000) return { error: "Keep the note under 2,000 characters." };

  const [latest] = await db
    .select({ id: deliverable.id })
    .from(deliverable)
    .where(eq(deliverable.projectId, projectId))
    .orderBy(desc(deliverable.version))
    .limit(1);
  if (!latest) return { error: "There's no delivered edit to revise yet." };

  await db.insert(revisionRequest).values({
    id: crypto.randomUUID(),
    projectId,
    deliverableId: latest.id,
    note,
  });
  await db.update(project).set({ status: "revision_requested" }).where(eq(project.id, projectId));
  refresh();
}
