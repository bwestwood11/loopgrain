import Link from "next/link";
import { headers } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { Logo } from "./logo";

export async function SiteHeader() {
  const signedIn = Boolean(getSessionCookie(await headers()));

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
      <Logo />
      <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
        <a href="#pricing" className="hidden rounded-full px-3 py-2 hover:bg-paper sm:block">
          Pricing
        </a>
        <a href="#faq" className="hidden rounded-full px-3 py-2 hover:bg-paper sm:block">
          FAQ
        </a>
        {signedIn ? (
          <Link
            href="/dashboard"
            className="rounded-full bg-ink px-4 py-2 text-paper hover:bg-cobalt"
          >
            Your dashboard
          </Link>
        ) : (
          <>
            <Link href="/sign-in" className="rounded-full px-3 py-2 hover:bg-paper">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-ink px-4 py-2 text-paper hover:bg-cobalt"
            >
              Create account
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
