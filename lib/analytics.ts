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

// GA's ecommerce fields for an order of `quantity` videos.
export function videoItems(quantity: number) {
  return {
    currency: "USD",
    value: PRICE_PER_VIDEO * quantity,
    items: [{ item_id: "video_edit", item_name: "Short-form video edit", price: PRICE_PER_VIDEO, quantity }],
  };
}
