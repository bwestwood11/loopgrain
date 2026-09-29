import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { VideoCalculator } from "@/components/video-calculator";
import { MAX_CLIP_SECONDS } from "@/lib/pricing";

export const metadata: Metadata = { title: "Dashboard | Loopgrain" };

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?next=/dashboard");

  const { user } = session;
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate sm:inline">{user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-6 sm:px-6">
        <h1 className="display text-5xl sm:text-6xl">Hi, {firstName}</h1>
        {user.businessName && <p className="mt-2 text-lg text-slate">{user.businessName}</p>}

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_24rem]">
          <section aria-labelledby="videos-heading">
            <h2 id="videos-heading" className="text-xl font-semibold">
              Your videos
            </h2>
            <div className="mt-4 rounded-2xl border-2 border-dashed border-line px-6 py-14 text-center">
              <p className="font-semibold">No orders yet</p>
              <p className="mx-auto mt-2 max-w-sm text-slate">
                Choose how many videos you need to place your first order. You&apos;ll upload
                clips under {MAX_CLIP_SECONDS} seconds after checkout.
              </p>
            </div>
          </section>

          <section aria-labelledby="order-heading">
            <h2 id="order-heading" className="text-xl font-semibold">
              Order videos
            </h2>
            <div className="mt-4">
              <VideoCalculator signedIn />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
