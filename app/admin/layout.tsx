import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Admin | Loopgrain" };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();

  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-caption">
            Admin
          </span>
        </div>
        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          <Link href="/admin" className="rounded-full px-3 py-2 hover:bg-paper">
            Projects
          </Link>
          <Link href="/dashboard" className="hidden rounded-full px-3 py-2 hover:bg-paper sm:block">
            Customer view
          </Link>
          <SignOutButton />
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-6 sm:px-6">{children}</main>
    </>
  );
}
