import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { clip, order, project } from "@/db/schema";

// A customer's prepaid balance: paid videos not yet used by a project.
export async function availableCredits(userId: string) {
  const [row] = await db
    .select({ n: sql<number>`coalesce(sum(${order.quantity} - ${order.used}), 0)::int` })
    .from(order)
    .where(and(eq(order.userId, userId), isNotNull(order.paidAt)));
  return row.n;
}

// The paid order behind a Stripe Checkout session, so the page Stripe returns
// to can report the purchase to analytics.
export async function paidOrderForSession(userId: string, sessionId: string) {
  const [row] = await db
    .select({ quantity: order.quantity, amountCents: order.amountCents })
    .from(order)
    .where(
      and(
        eq(order.stripeCheckoutSessionId, sessionId),
        eq(order.userId, userId),
        isNotNull(order.paidAt),
      ),
    );
  return row;
}

// Charges one prepaid video to the project and sends it to the editor.
// Incrementing `used` with a `used < quantity` guard is atomic per row, so two
// tabs can't spend the same credit. Prefers `preferOrderId` when given.
export async function applyCredit(userId: string, projectId: string, preferOrderId?: string) {
  const candidate = db
    .select({ id: order.id })
    .from(order)
    .where(and(eq(order.userId, userId), isNotNull(order.paidAt), lt(order.used, order.quantity)))
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
