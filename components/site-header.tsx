import Link from "next/link";
import { headers } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { Logo } from "./logo";

const link = "rounded-full px-2.5 py-2 hover:bg-paper sm:px-3";

export async function SiteHeader({ current }: { current?: "showcase" } = {}) {
  const signedIn = Boolean(getSessionCookie(await headers()));

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-5 sm:px-6">
      <Logo />
      <nav className="flex items-center gap-0.5 text-sm font-medium sm:gap-2">
        <Link
          href="/showcase"
          aria-current={current === "showcase" ? "page" : undefined}
          className={`${link} aria-[current=page]:bg-paper`}
        >
          Showcase
        </Link>
        {/* Root-relative so they also work from other pages. */}
        <Link href="/#pricing" className={`${link} hidden md:block`}>
          Pricing
        </Link>
        <Link href="/#faq" className={`${link} hidden md:block`}>
          FAQ
        </Link>
        {signedIn ? (
          <Link
            href="/dashboard"
            className="rounded-full bg-ink px-4 py-2 text-paper hover:bg-cobalt"
          >
            <span className="sm:hidden">Dashboard</span>
            <span className="hidden sm:inline">Your dashboard</span>
          </Link>
        ) : (
          <>
            <Link href="/sign-in" className={link}>
              Sign in
            </Link>
            {/* Phones get the sign-up button in the page itself; the header stays on one line. */}
            <Link
              href="/sign-up"
              className="hidden rounded-full bg-ink px-4 py-2 text-paper hover:bg-cobalt sm:block"
            >
              Create account
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
