export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 ** 2) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 ** 3) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function formatDuration(seconds: number | null) {
  if (seconds === null) return "length unknown";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// For limits in copy: 300 -> "5 minutes", 90 -> "90 seconds".
export function formatMinutes(seconds: number) {
  if (seconds % 60 !== 0) return `${seconds} seconds`;
  const m = seconds / 60;
  return `${m} ${m === 1 ? "minute" : "minutes"}`;
}

// Skips Saturdays and Sundays, so a Friday submission is due Tuesday.
export function addBusinessDays(date: Date, days: number) {
  const d = new Date(date);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) left--;
  }
  return d;
}
