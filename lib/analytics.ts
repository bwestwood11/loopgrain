import { PRICE_PER_VIDEO } from "./pricing";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Sends a Google Analytics event. GA's script loads after hydration, so an
// event fired on page load (like a purchase on return from Stripe) waits up to
// five seconds for it rather than being dropped. A no-op without a GA ID.
export function track(name: string, params: Record<string, unknown> = {}) {
  if (!process.env.NEXT_PUBLIC_GA_ID || typeof window === "undefined") return;
  let tries = 0;
  const send = () => {
    if (window.gtag) window.gtag("event", name, params);
    else if (tries++ < 50) setTimeout(send, 100);
  };
  send();
}

// The visitor's cookie banner choice, also read by GA's init script.
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

// Saves the choice and applies it to GA right away. Null clears it, which
// brings the banner back (the footer's "Cookie settings" link).
export function saveConsent(value: Consent | null) {
  try {
    if (value) localStorage.setItem(CONSENT_KEY, value);
    else localStorage.removeItem(CONSENT_KEY);
  } catch {}
  if (value) window.gtag?.("consent", "update", { analytics_storage: value });
  if (value === "denied") clearGACookies();
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

// GA stops using its cookies once consent is denied but leaves them behind.
// They're set on the top-level domain, so expire them on each parent domain.
function clearGACookies() {
  const parts = location.hostname.split(".");
  const domains = parts.map((_, i) => parts.slice(i).join(".")).filter((d) => d.includes("."));
  for (const cookie of document.cookie.split("; ")) {
    const name = cookie.split("=")[0];
    if (!name.startsWith("_ga")) continue;
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
