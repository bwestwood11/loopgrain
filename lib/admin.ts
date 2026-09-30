import "server-only";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  clip,
  deliverable,
  order,
  project,
  revisionRequest,
  user,
  type Project,
  type ProjectStatus,
} from "@/db/schema";
import { addBusinessDays } from "./format";
import { TURNAROUND_DAYS } from "./pricing";

export const VIEWS = {
  active: { label: "To do", statuses: ["submitted", "editing", "revision_requested"] },
  delivered: { label: "Delivered", statuses: ["delivered"] },
  drafts: { label: "Not paid yet", statuses: ["draft"] },
} satisfies Record<string, { label: string; statuses: ProjectStatus[] }>;

export type View = keyof typeof VIEWS;

export type AdminProject = Project & {
  clipCount: number;
  openRevision: { note: string; createdAt: Date } | null;
  dueAt: Date | null;
  overdue: boolean;
};

export type CustomerGroup = {
  customer: { id: string; name: string; email: string; businessName: string | null };
  projects: AdminProject[];
};

// A revision is due one turnaround after it was asked for; a new project, one
// turnaround after it was submitted.
function dueDate(p: Project, openRevision: { createdAt: Date } | null) {
  if (p.status === "revision_requested" && openRevision) {
    return addBusinessDays(openRevision.createdAt, TURNAROUND_DAYS);
  }
  if ((p.status === "submitted" || p.status === "editing") && p.submittedAt) {
    return addBusinessDays(p.submittedAt, TURNAROUND_DAYS);
  }
  return null;
}

export async function projectsByCustomer(view: View): Promise<CustomerGroup[]> {
  const rows = await db
    .select({
      project,
      customer: {
        id: user.id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
      },
    })
    .from(project)
    .innerJoin(user, eq(project.userId, user.id))
    .where(inArray(project.status, VIEWS[view].statuses))
    .orderBy(asc(project.submittedAt), asc(project.createdAt));
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.project.id);
  const [clips, revisions] = await Promise.all([
    db
      .select({ projectId: clip.projectId })
      .from(clip)
      .where(and(inArray(clip.projectId, ids), eq(clip.uploaded, true))),
    db
      .select()
      .from(revisionRequest)
      .where(and(inArray(revisionRequest.projectId, ids), eq(revisionRequest.resolved, false)))
      .orderBy(desc(revisionRequest.createdAt)),
  ]);

  const now = Date.now();
  const groups = new Map<string, CustomerGroup>();
  for (const { project: p, customer } of rows) {
    const open = revisions.find((r) => r.projectId === p.id) ?? null;
    const dueAt = dueDate(p, open);
    const item: AdminProject = {
      ...p,
      clipCount: clips.filter((c) => c.projectId === p.id).length,
      openRevision: open && { note: open.note, createdAt: open.createdAt },
      dueAt,
      overdue: dueAt !== null && dueAt.getTime() < now,
    };
    const group = groups.get(customer.id) ?? { customer, projects: [] };
    group.projects.push(item);
    groups.set(customer.id, group);
  }

  // Customers with the most urgent work first.
  const urgency = (g: CustomerGroup) =>
    Math.min(...g.projects.map((p) => p.dueAt?.getTime() ?? Infinity));
  return [...groups.values()].sort((a, b) =>
    view === "active" ? urgency(a) - urgency(b) : a.customer.name.localeCompare(b.customer.name),
  );
}

export async function viewCounts() {
  const rows = await db
    .select({ status: project.status, n: count() })
    .from(project)
    .groupBy(project.status);
  return Object.fromEntries(
    Object.entries(VIEWS).map(([key, v]) => [
      key,
      rows
        .filter((r) => (v.statuses as ProjectStatus[]).includes(r.status))
        .reduce((sum, r) => sum + r.n, 0),
    ]),
  ) as Record<View, number>;
}

export async function getAdminProject(projectId: string) {
  const [row] = await db
    .select({
      project,
      customer: { name: user.name, email: user.email, businessName: user.businessName },
    })
    .from(project)
    .innerJoin(user, eq(project.userId, user.id))
    .where(eq(project.id, projectId));
  if (!row) return null;

  const [clips, deliverables, revisions] = await Promise.all([
    db
      .select()
      .from(clip)
      .where(and(eq(clip.projectId, projectId), eq(clip.uploaded, true)))
      .orderBy(asc(clip.createdAt)),
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

  const [paidBy] = row.project.orderId
    ? await db.select().from(order).where(eq(order.id, row.project.orderId))
    : [];

  const open = revisions.find((r) => !r.resolved) ?? null;
  return {
    ...row,
    clips,
    deliverables,
    revisions,
    order: paidBy ?? null,
    dueAt: dueDate(row.project, open),
  };
}
