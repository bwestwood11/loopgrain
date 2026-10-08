// Placeholder pricing. Change these in one place and the whole site follows.
export const PRICE_PER_VIDEO = 39;
export const MAX_VIDEO_SECONDS = 60; // length of the finished edit
// Raw footage limits per video. Editing time scales with footage to review,
// so the total is the limit that matters; the rest guard against odd uploads.
export const MAX_RAW_SECONDS = 5 * 60;
export const MAX_CLIP_SECONDS = 3 * 60;
export const MAX_CLIP_BYTES = 2 * 1024 ** 3 - 1; // fits the clip.size_bytes int column
// Also the backstop for clips whose length the browser can't read.
export const MAX_PROJECT_BYTES = 6 * 1024 ** 3;
export const MAX_CLIPS_PER_PROJECT = 15;
export const MAX_VIDEOS_PER_ORDER = 50;
export const TURNAROUND_DAYS = 2; // business days (Mon-Fri)
export const MAX_REVISIONS = 3; // revision requests per video
export const REVISION_TURNAROUND_DAYS = 2; // business days
export const REVISION_WINDOW_DAYS = 7; // days after each delivery to request a revision
export const RAW_CLIP_RETENTION_DAYS = 90; // raw footage is deleted this long after delivery

export function formatUSD(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Last moment to request a revision on a video delivered at `deliveredAt`.
export function revisionDeadline(deliveredAt: Date) {
  return new Date(deliveredAt.getTime() + REVISION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

// Null `deliveredAt` (videos delivered before the window existed) never closes.
export function revisionWindowClosed(deliveredAt: Date | null) {
  return deliveredAt !== null && Date.now() > revisionDeadline(deliveredAt).getTime();
}
