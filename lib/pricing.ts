// Placeholder pricing. Change these in one place and the whole site follows.
export const PRICE_PER_VIDEO = 59;
export const MAX_CLIP_SECONDS = 60;
export const TURNAROUND_DAYS = 3;

export function formatUSD(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
