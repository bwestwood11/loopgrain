import "server-only";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import type Stripe from "stripe";
import { CONSENT_KEY, OPT_IN_REGIONS } from "./analytics";

// Reports purchases to Meta with the Conversions API, from Stripe's webhook,
// so ad blockers and iOS privacy settings can't hide a sale from Meta's ad
// optimization. Only for visitors who allowed marketing cookies.

const GRAPH_API = "https://graph.facebook.com/v25.0";

// What Meta uses to match the purchase to an ad click, captured at checkout
// and carried through Stripe metadata (values are capped at 500 characters).
export async function metaCheckoutMetadata(eventSourceUrl: string) {
  if (!process.env.NEXT_PUBLIC_META_PIXEL_ID) return {};
  const jar = await cookies();
  const h = await headers();

  // Same rule as the Pixel: an explicit choice wins; with no choice, marketing
  // cookies are on except in opt-in regions (and when the country is unknown).
  const consent = jar.get(CONSENT_KEY)?.value;
  const country = h.get("x-vercel-ip-country");
  const allowed =
    consent === "granted" ||
    (consent !== "denied" && !!country && !OPT_IN_REGIONS.includes(country));
  if (!allowed) return {};

  const fields = {
    metaOk: "1",
    metaUrl: eventSourceUrl,
    metaFbp: jar.get("_fbp")?.value,
    metaFbc: jar.get("_fbc")?.value,
    metaIp: h.get("x-forwarded-for")?.split(",")[0]?.trim(),
    metaUa: h.get("user-agent") ?? undefined,
  };
  return Object.fromEntries(
    Object.entries(fields).flatMap(([k, v]) => (v ? [[k, v.slice(0, 500)]] : [])),
  ) as Record<string, string>;
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

// Live payments are recorded. Test-mode payments are sent only when
// META_TEST_EVENT_CODE is set, and then land in Events Manager's "Test events"
// tab instead of the real data.
export async function sendMetaPurchase(session: Stripe.Checkout.Session, quantity: number) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  const m = session.metadata ?? {};
  if (!pixelId || !token || m.metaOk !== "1") return;
  const testCode = process.env.META_TEST_EVENT_CODE;
  if (!session.livemode && !testCode) return;

  const email = session.customer_details?.email ?? session.customer_email;
  const event = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    // Lets Meta drop a duplicate if Stripe retries the webhook.
    event_id: session.id,
    action_source: "website",
    event_source_url: m.metaUrl,
    user_data: {
      ...(email && { em: [sha256(email.trim().toLowerCase())] }),
      ...(session.client_reference_id && { external_id: [sha256(session.client_reference_id)] }),
      client_ip_address: m.metaIp,
      client_user_agent: m.metaUa,
      fbp: m.metaFbp,
      fbc: m.metaFbc,
    },
    custom_data: {
      currency: (session.currency ?? "usd").toUpperCase(),
      value: (session.amount_total ?? 0) / 100,
      num_items: quantity,
      content_ids: ["video_edit"],
      content_type: "product",
      order_id: session.id,
    },
  };

  const res = await fetch(`${GRAPH_API}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [event],
      ...(!session.livemode && { test_event_code: testCode }),
    }),
  });
  if (!res.ok) throw new Error(`Meta Conversions API returned ${res.status}: ${await res.text()}`);
}
