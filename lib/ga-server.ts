import "server-only";
import { cookies } from "next/headers";

// Sends events to Google Analytics from the server with the Measurement
// Protocol, so purchases and refunds are recorded from Stripe's webhook even
// when the customer's browser blocks GA or never returns from checkout.

// Which GA visitor (and session) the event belongs to, so revenue is credited
// to the source that brought them in. Read from GA's cookies at checkout and
// carried through Stripe metadata.
export type GAVisitor = { clientId?: string; sessionId?: string };

// `_ga` is "GA1.1.<random>.<timestamp>"; the client ID is the last two parts.
// The session cookie is either "GS1.1.<sessionId>.<...>" or the newer
// "GS2.1.s<sessionId>$o1$g1$t...".
export async function gaVisitorFromCookies(): Promise<GAVisitor> {
  const jar = await cookies();
  const clientId = jar.get("_ga")?.value.split(".").slice(2).join(".") || undefined;

  const streamId = process.env.NEXT_PUBLIC_GA_ID?.replace(/^G-/, "");
  const session = streamId ? jar.get(`_ga_${streamId}`)?.value : undefined;
  const sessionId =
    session?.match(/^GS2\.\d+\.s(\d+)/)?.[1] ?? session?.match(/^GS1\.\d+\.(\d+)\./)?.[1];

  return { clientId, sessionId };
}

type GAEvent = { name: string; params: Record<string, unknown> };

// Live payments are recorded. Test-mode payments go to GA's validation
// endpoint instead, which checks the event and logs any problems without
// adding fake revenue to reports.
export async function sendServerEvent(
  visitor: GAVisitor,
  event: GAEvent,
  { live }: { live: boolean },
) {
  const measurementId = process.env.NEXT_PUBLIC_GA_ID;
  const apiSecret = process.env.GA_API_SECRET;
  if (!measurementId || !apiSecret) return;

  // A visitor who declined cookies has no client ID. The sale still counts
  // toward revenue under a random one, just without a traffic source.
  const clientId =
    visitor.clientId ??
    `${Math.floor(Math.random() * 2 ** 31)}.${Math.floor(Date.now() / 1000)}`;

  const url = new URL(`https://www.google-analytics.com/${live ? "" : "debug/"}mp/collect`);
  url.searchParams.set("measurement_id", measurementId);
  url.searchParams.set("api_secret", apiSecret);

  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify({
      client_id: clientId,
      // Matches the site's Consent Mode: no ad use, ever.
      consent: { ad_user_data: "DENIED", ad_personalization: "DENIED" },
      events: [
        {
          name: event.name,
          params: {
            ...event.params,
            ...(visitor.sessionId && { session_id: visitor.sessionId }),
            // GA needs a nonzero engagement time to attach the event to the session.
            engagement_time_msec: 1,
          },
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`GA Measurement Protocol returned ${res.status}`);
  if (!live) console.log(`GA validation for test-mode ${event.name}:`, await res.text());
}
