// Placeholder pricing. Change these in one place and the whole site follows.
export const PRICE_PER_VIDEO = 39;
export const MAX_CLIP_SECONDS = 60;
export const MAX_CLIP_BYTES = 2 * 1024 ** 3 - 1; // fits the clip.size_bytes int column
export const MAX_CLIPS_PER_PROJECT = 20;
export const MAX_VIDEOS_PER_ORDER = 50;
export const TURNAROUND_DAYS = 2; // business days (Mon-Fri)

export function formatUSD(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
