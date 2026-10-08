import { PRICE_PER_VIDEO } from "./pricing";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

// EEA, UK and Switzerland, where analytics and marketing cookies need opt-in
// consent. Elsewhere they're on unless the visitor declines.
export const OPT_IN_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
  "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO",
  "GB", "CH",
];

// Meta's names for the GA events it also gets. Purchases go to Meta from the
// server (lib/meta-server.ts), not from here.
const META_EVENTS: Record<string, string> = {
  sign_up: "CompleteRegistration",
  begin_checkout: "InitiateCheckout",
};

// Sends an event to Google Analytics, and to the Meta Pixel when it has a Meta
// equivalent. GA's script loads after hydration, so an event fired on page
// load waits up to five seconds for it rather than being dropped. The Pixel
// only exists once the visitor allowed marketing cookies (MetaPixel).
export function track(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const metaEvent = META_EVENTS[name];
  if (metaEvent && window.fbq) {
    window.fbq("track", metaEvent, { currency: params.currency, value: params.value });
  }

  if (!process.env.NEXT_PUBLIC_GA_ID) return;
  let tries = 0;
  const send = () => {
    if (window.gtag) window.gtag("event", name, params);
    else if (tries++ < 50) setTimeout(send, 100);
  };
  send();
}

// The visitor's cookie banner choice. Kept in localStorage for the page (GA's
// init script reads it there) and mirrored to a cookie so the server can honor
// it when reporting purchases to Meta.
export const CONSENT_KEY = "cookie-consent";
const CONSENT_EVENT = "cookie-consent-change";
export type Consent = "granted" | "denied";

export function readConsent(): Consent | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

// Saves the choice and applies it to GA right away (MetaPixel reacts to the
// change event). Null clears it, which brings the banner back (the footer's
// "Cookie settings" link).
export function saveConsent(value: Consent | null) {
  try {
    if (value) localStorage.setItem(CONSENT_KEY, value);
    else localStorage.removeItem(CONSENT_KEY);
  } catch {}
  document.cookie = value
    ? `${CONSENT_KEY}=${value}; path=/; max-age=31536000; SameSite=Lax`
    : `${CONSENT_KEY}=; path=/; max-age=0`;
  if (value) window.gtag?.("consent", "update", { analytics_storage: value });
  if (value === "denied") clearTrackingCookies();
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

// GA and Meta stop using their cookies once consent is denied but leave them
// behind. They're set on the top-level domain, so expire them on each parent
// domain.
function clearTrackingCookies() {
  const parts = location.hostname.split(".");
  const domains = parts.map((_, i) => parts.slice(i).join(".")).filter((d) => d.includes("."));
  for (const cookie of document.cookie.split("; ")) {
    const name = cookie.split("=")[0];
    if (!name.startsWith("_ga") && name !== "_fbp" && name !== "_fbc") continue;
    for (const domain of ["", ...domains.map((d) => `; domain=.${d}`)]) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
    }
  }
}

export function subscribeConsent(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// GA's ecommerce fields for an order of `quantity` videos.
export function videoItems(quantity: number) {
  return {
    currency: "USD",
    value: PRICE_PER_VIDEO * quantity,
    items: [{ item_id: "video_edit", item_name: "Short-form video edit", price: PRICE_PER_VIDEO, quantity }],
  };
}
