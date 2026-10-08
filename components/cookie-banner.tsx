"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { readConsent, saveConsent, subscribeConsent } from "@/lib/analytics";

// Asks once for analytics cookies, then stays hidden until the visitor clears
// their choice from the footer. Renders nothing on the server, so the banner
// can't flash for visitors who already chose.
export function CookieBanner() {
  const choice = useSyncExternalStore(subscribeConsent, readConsent, () => "server" as const);
  if (!process.env.NEXT_PUBLIC_GA_ID || choice !== null) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-2xl bg-ink p-5 text-paper shadow-2xl ring-1 ring-paper/20 sm:flex sm:items-center sm:gap-5"
    >
      <p className="text-sm text-paper/80">
        We use analytics cookies to see how people find and use Loopgrain. No ads, and we
        never sell your data.{" "}
        <Link href="/privacy" className="text-paper underline underline-offset-2">
          Privacy policy
        </Link>
      </p>
      <div className="mt-4 flex shrink-0 gap-2 sm:mt-0">
        <button
          type="button"
          onClick={() => saveConsent("denied")}
          className="flex-1 rounded-full border border-paper/25 px-4 py-2 text-sm font-semibold hover:bg-paper/10"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => saveConsent("granted")}
          className="flex-1 rounded-full bg-caption px-4 py-2 text-sm font-semibold text-ink hover:bg-paper"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

// Brings the banner back so the visitor can change their choice.
export function CookieSettingsButton({ className = "hover:text-ink" }: { className?: string }) {
  return (
    <button type="button" onClick={() => saveConsent(null)} className={className}>
      Cookie settings
    </button>
  );
}
