import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { clip, order, project, user } from "@/db/schema";

// Every new account gets one free video. Called once, right after sign-up.
export async function grantFreeVideo(userId: string) {
  await db.insert(order).values({
    id: crypto.randomUUID(),
    userId,
    kind: "free_trial",
    quantity: 1,
    amountCents: 0,
    paidAt: new Date(),
  });
}

// A customer's balance: videos not yet used by a project. `credits` is what
// they can spend now; the free video only counts once their email is verified,
// until then it sits in `freeLocked`. `free` is how many of `credits` are free.
export async function creditBalance(userId: string) {
  const left = (kind: "paid" | "free_trial") =>
    sql<number>`coalesce(sum(${order.quantity} - ${order.used}) filter (where ${order.kind} = ${sql.raw(`'${kind}'`)}), 0)::int`;
  const [row] = await db
    .select({ paid: left("paid"), free: left("free_trial"), verified: user.emailVerified })
    .from(user)
    .leftJoin(order, and(eq(order.userId, user.id), isNotNull(order.paidAt)))
    .where(eq(user.id, userId))
    .groupBy(user.id);
  if (!row) return { credits: 0, free: 0, freeLocked: 0 };
  const free = row.verified ? row.free : 0;
  return { credits: row.paid + free, free, freeLocked: row.free - free };
}

// Charges one prepaid video to the project and sends it to the editor.
// Incrementing `used` with a `used < quantity` guard is atomic per row, so two
// tabs can't spend the same credit. Prefers `preferOrderId` when given, then
// the oldest order, which spends the free video before any bought ones. The
// free video is skipped until the customer has verified their email.
export async function applyCredit(userId: string, projectId: string, preferOrderId?: string) {
  const candidate = db
    .select({ id: order.id })
    .from(order)
    .innerJoin(user, eq(user.id, order.userId))
    .where(
      and(
        eq(order.userId, userId),
        isNotNull(order.paidAt),
        lt(order.used, order.quantity),
        or(eq(order.kind, "paid"), eq(user.emailVerified, true)),
      ),
    )
    .orderBy(
      ...(preferOrderId ? [desc(sql`${order.id} = ${preferOrderId}`)] : []),
      asc(order.paidAt),
    )
    .limit(1);

  const [charged] = await db
    .update(order)
    .set({ used: sql`${order.used} + 1` })
    .where(and(inArray(order.id, candidate), lt(order.used, order.quantity)))
    .returning({ id: order.id });
  if (!charged) return false;

  const now = new Date();
  const updated = await db
    .update(project)
    .set({ status: "submitted", submittedAt: now, paidAt: now, orderId: charged.id })
    .where(and(eq(project.id, projectId), eq(project.userId, userId), eq(project.status, "draft")))
    .returning({ id: project.id });

  if (updated.length === 0) {
    // Project was already sent (or isn't theirs): give the credit back.
    await db
      .update(order)
      .set({ used: sql`${order.used} - 1` })
      .where(eq(order.id, charged.id));
    return false;
  }

  // Drop rows for uploads that never finished so the editor only sees real files.
  await db.delete(clip).where(and(eq(clip.projectId, projectId), eq(clip.uploaded, false)));
  return true;
}
