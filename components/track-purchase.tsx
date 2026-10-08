"use client";

import { useEffect } from "react";
import { track, videoItems } from "@/lib/analytics";

// Reports a confirmed Stripe payment to Google Analytics. Rendered on the page
// Stripe returns to; the localStorage mark keeps a refresh from counting the
// sale twice (GA also de-duplicates on transaction_id).
export function TrackPurchase({
  transactionId,
  quantity,
  amountCents,
}: {
  transactionId: string;
  quantity: number;
  amountCents: number | null;
}) {
  useEffect(() => {
    const key = `ga-purchase:${transactionId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {}
    const items = videoItems(quantity);
    track("purchase", {
      ...items,
      transaction_id: transactionId,
      value: amountCents != null ? amountCents / 100 : items.value,
    });
  }, [transactionId, quantity, amountCents]);
  return null;
}
