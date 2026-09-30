import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { clip, deliverable, project, revisionRequest, type Project } from "@/db/schema";

export type ProjectSummary = Project & { clipCount: number; latestVersion: number | null };

export async function listProjects(userId: string): Promise<ProjectSummary[]> {
  const projects = await db
    .select()
    .from(project)
    .where(eq(project.userId, userId))
    .orderBy(desc(project.updatedAt));
  if (projects.length === 0) return [];

  const ids = projects.map((p) => p.id);
  const [clips, deliverables] = await Promise.all([
    db
      .select({ projectId: clip.projectId })
      .from(clip)
      .where(and(inArray(clip.projectId, ids), eq(clip.uploaded, true))),
    db
      .select({ projectId: deliverable.projectId, version: deliverable.version })
      .from(deliverable)
      .where(inArray(deliverable.projectId, ids)),
  ]);

  return projects.map((p) => ({
    ...p,
    clipCount: clips.filter((c) => c.projectId === p.id).length,
    latestVersion: deliverables
      .filter((d) => d.projectId === p.id)
      .reduce<number | null>((max, d) => Math.max(max ?? 0, d.version), null),
  }));
}

export async function getProject(userId: string, projectId: string) {
  const [p] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)));
  if (!p) return null;

  const [clips, deliverables, revisions] = await Promise.all([
    db.select().from(clip).where(eq(clip.projectId, projectId)).orderBy(asc(clip.createdAt)),
    db
      .select()
      .from(deliverable)
      .where(eq(deliverable.projectId, projectId))
      .orderBy(desc(deliverable.version)),
    db
      .select()
      .from(revisionRequest)
      .where(eq(revisionRequest.projectId, projectId))
      .orderBy(desc(revisionRequest.createdAt)),
  ]);

  return { project: p, clips, deliverables, revisions };
}
