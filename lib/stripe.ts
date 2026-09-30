import "server-only";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/db";
import { order } from "@/db/schema";
import { applyCredit } from "./orders";
import { PRICE_PER_VIDEO } from "./pricing";

// Created on first use so `next build` doesn't need STRIPE_SECRET_KEY.
let client: Stripe | undefined;
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  client ??= new Stripe(key);
  return client;
}

type CheckoutInput = {
  user: { id: string; email: string };
  quantity: number;
  // Present for "Pay and send" on a single project; absent for buying videos up front.
  project?: { id: string; title: string; clipCount: number };
  returnUrl: string;
};

// Records an unpaid order, then opens a Stripe Checkout for it. The price is
// defined here (from lib/pricing.ts) rather than as a Stripe Price, so the
// site and the charge can't drift apart.
export async function createCheckout({ user, quantity, project, returnUrl }: CheckoutInput) {
  if (project) {
    // Close earlier unpaid checkouts for this project so it can't be paid for twice.
    const stale = await db
      .select({ sessionId: order.stripeCheckoutSessionId })
      .from(order)
      .where(
        and(
          eq(order.projectId, project.id),
          isNull(order.paidAt),
          isNotNull(order.stripeCheckoutSessionId),
        ),
      );
    for (const { sessionId } of stale) {
      const previous = await stripe().checkout.sessions.retrieve(sessionId!);
      if (previous.status === "open") await stripe().checkout.sessions.expire(previous.id);
    }
  }

  const orderId = crypto.randomUUID();
  await db
    .insert(order)
    .values({ id: orderId, userId: user.id, quantity, projectId: project?.id ?? null });

  const clips = project && `${project.clipCount} ${project.clipCount === 1 ? "clip" : "clips"}`;
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { orderId, ...(project && { projectId: project.id }) },
    payment_intent_data: { metadata: { orderId } },
    line_items: [
      {
        quantity,
        price_data: {
          currency: "usd",
          unit_amount: PRICE_PER_VIDEO * 100,
          product_data: {
            name: "Short-form video edit",
            description: project ? `${project.title} (${clips})` : "Prepaid video edits",
          },
        },
      },
    ],
    success_url: `${returnUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}?checkout=cancelled`,
  });

  await db.update(order).set({ stripeCheckoutSessionId: session.id }).where(eq(order.id, orderId));
  return session.url;
}

// Marks the order paid and, if it was bought for a specific project, sends that
// project to the editor. Called from both the webhook and the customer's return
// to the site (whichever lands first); the `paidAt is null` guard makes the
// second call a no-op.
export async function fulfillCheckout(sessionId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  const orderId = session.metadata?.orderId;
  if (!orderId || session.payment_status === "unpaid") return false;

  const [paid] = await db
    .update(order)
    .set({ paidAt: new Date(), amountCents: session.amount_total })
    .where(and(eq(order.id, orderId), isNull(order.paidAt)))
    .returning();

  // If the project was already sent (say, with an earlier credit), the payment
  // simply stays on their balance.
  if (paid?.projectId) await applyCredit(paid.userId, paid.projectId, paid.id);
  return true;
}
