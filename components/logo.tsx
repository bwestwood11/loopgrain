import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-ink" aria-label="Loopgrain home">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <rect x="6" y="1" width="14" height="24" rx="3.5" fill="var(--color-ink)" />
        <path d="M11 9.5v7l5.5-3.5z" fill="var(--color-caption)" />
      </svg>
      <span className="display text-2xl" style={{ lineHeight: 1 }}>
        loopgrain
      </span>
    </Link>
  );
}
