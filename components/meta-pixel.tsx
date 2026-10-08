"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { OPT_IN_REGIONS, readConsent, subscribeConsent } from "@/lib/analytics";

// Meta's base snippet, unchanged: defines window.fbq and loads fbevents.js.
const SNIPPET = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');`;

let initialized = false;

function loadPixel(pixelId: string) {
  if (initialized) return;
  initialized = true;
  const script = document.createElement("script");
  script.text = SNIPPET;
  document.head.appendChild(script);
  window.fbq!("init", pixelId);
}

// Loads the Meta Pixel only with marketing consent: after Accept anywhere, or
// until Decline outside OPT_IN_REGIONS (matching GA's Consent Mode defaults).
// Sends a PageView on load and on every client-side navigation.
export function MetaPixel({ pixelId }: { pixelId: string }) {
  const choice = useSyncExternalStore(subscribeConsent, readConsent, () => "server" as const);
  const [optInRegion, setOptInRegion] = useState<boolean | null>(null);
  const pathname = usePathname();

  // Only needed while the visitor hasn't chosen yet.
  useEffect(() => {
    if (choice !== null || optInRegion !== null) return;
    fetch("/api/geo")
      .then((res) => res.json())
      .then(({ country }: { country: string | null }) =>
        setOptInRegion(!country || OPT_IN_REGIONS.includes(country)),
      )
      .catch(() => setOptInRegion(true));
  }, [choice, optInRegion]);

  const allowed = choice === "granted" || (choice === null && optInRegion === false);

  useEffect(() => {
    if (!allowed) {
      // Already loaded this page view and then declined: stop sending.
      window.fbq?.("consent", "revoke");
      return;
    }
    loadPixel(pixelId);
    window.fbq!("consent", "grant");
    window.fbq!("track", "PageView");
  }, [allowed, pathname, pixelId]);

  return null;
}
