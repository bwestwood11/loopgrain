import Link from "next/link";
import { CookieSettingsButton } from "./cookie-banner";

export function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-2 px-4 py-8 text-sm text-slate sm:px-6">
      <span>© {new Date().getFullYear()} Loopgrain</span>
      <span className="flex flex-wrap gap-x-5 gap-y-2">
        <span>Short-form video editing for small businesses</span>
        <Link href="/privacy" className="hover:text-ink">
          Privacy
        </Link>
        <CookieSettingsButton />
      </span>
    </footer>
  );
}
