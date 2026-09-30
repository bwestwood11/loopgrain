import Link from "next/link";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { requireUser } from "@/lib/session";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireUser();

  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          <Link href="/dashboard" className="rounded-full px-3 py-2 hover:bg-paper">
            Projects
          </Link>
          <span className="hidden max-w-48 truncate px-2 text-slate md:inline">{user.email}</span>
          <SignOutButton />
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-6 sm:px-6">{children}</main>
    </>
  );
}
