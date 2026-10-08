import type Stripe from "stripe";
import { fulfillCheckout, reportRefunds, stripe } from "@/lib/stripe";

// Stripe calls this after checkout. The signature check needs the raw body,
// so read it as text before anything parses it.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      // A non-2xx response makes Stripe retry, so let failures throw.
      await fulfillCheckout(event.data.object.id);
      break;
    case "charge.refunded":
      await reportRefunds(event.data.object);
      break;
  }
  return new Response(null, { status: 200 });
}
