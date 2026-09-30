import type { Metadata } from "next";
import Link from "next/link";
import { NewProjectForm } from "@/components/new-project-form";
import { formatUSD, PRICE_PER_VIDEO, TURNAROUND_DAYS } from "@/lib/pricing";

export const metadata: Metadata = { title: "New video | Loopgrain" };

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard" className="text-sm font-medium text-slate hover:text-ink">
        ← All projects
      </Link>
      <h1 className="display mt-4 text-5xl">New video</h1>
      <p className="mt-3 text-slate">
        One project becomes one finished video. You&apos;ll upload your clips on the next screen.
        {` ${formatUSD(PRICE_PER_VIDEO)}, delivered within ${TURNAROUND_DAYS} days.`}
      </p>
      <div className="mt-8 rounded-2xl bg-paper p-6 shadow-[0_1px_0_var(--color-line)] sm:p-8">
        <NewProjectForm />
      </div>
    </div>
  );
}
