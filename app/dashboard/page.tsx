import type { Metadata } from "next";
import Link from "next/link";
import { StatusPill } from "@/components/project-status";
import { VideoCalculator } from "@/components/video-calculator";
import { availableCredits } from "@/lib/orders";
import { listProjects, type ProjectSummary } from "@/lib/projects";
import { requireUser } from "@/lib/session";
import { fulfillCheckout } from "@/lib/stripe";
import { addDays, formatDate } from "@/lib/format";
import { formatUSD, MAX_CLIP_SECONDS, PRICE_PER_VIDEO, TURNAROUND_DAYS } from "@/lib/pricing";

export const metadata: Metadata = { title: "Dashboard | Loopgrain" };

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const user = await requireUser();
  const { checkout, session_id } = await props.searchParams;

  // Back from buying videos: record the payment now rather than waiting for the webhook.
  const paid =
    checkout === "success" &&
    typeof session_id === "string" &&
    (await fulfillCheckout(session_id).catch(() => false));

  const [projects, credits] = await Promise.all([listProjects(user.id), availableCredits(user.id)]);
  const firstName = user.name.split(" ")[0];

  const drafts = projects.filter((p) => p.status === "draft");
  const inProgress = projects.filter((p) =>
    ["submitted", "editing", "revision_requested"].includes(p.status),
  );
  const completed = projects.filter((p) => p.status === "delivered");

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl sm:text-6xl">Hi, {firstName}</h1>
          {user.businessName && <p className="mt-2 text-lg text-slate">{user.businessName}</p>}
        </div>
        {projects.length > 0 && (
          <Link
            href="/dashboard/projects/new"
            className="inline-flex items-center gap-2 rounded-full bg-cobalt px-5 py-3 font-semibold text-white hover:bg-cobalt-deep"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              +
            </span>
            New video
          </Link>
        )}
      </div>

      {checkout === "success" && (
        <p
          role="status"
          className={`mt-6 rounded-xl px-4 py-3 text-sm font-medium ${paid ? "bg-[#d4f0e2] text-[#16603f]" : "bg-paper"}`}
        >
          {paid
            ? "Payment received, thank you. Your videos are ready to use."
            : "Your payment is processing. Your balance will update once Stripe confirms it."}
        </p>
      )}
      {checkout === "cancelled" && (
        <p role="status" className="mt-6 rounded-xl bg-paper px-4 py-3 text-sm font-medium">
          Checkout cancelled. You haven&apos;t been charged.
        </p>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-12">
          {projects.length === 0 ? (
            <Welcome credits={credits} />
          ) : (
            <>
              {drafts.length > 0 && (
                <ProjectSection
                  title="Finish uploading"
                  description="Add your clips, then send these to your editor."
                  projects={drafts}
                />
              )}
              {inProgress.length > 0 && (
                <ProjectSection title="In the edit" projects={inProgress} />
              )}
              <ProjectSection
                title="Completed"
                description="Download finished videos or ask for changes."
                projects={completed}
                empty="Finished videos will show up here."
              />
            </>
          )}
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-6">
          {credits > 0 && <Balance credits={credits} />}
          <section aria-labelledby="order-heading">
            <h2 id="order-heading" className="mb-3 text-xl font-semibold">
              {credits > 0 ? "Buy more videos" : "Order videos"}
            </h2>
            <VideoCalculator signedIn initialCount={1} />
            <p className="mt-3 text-sm text-slate">
              Only need one? Start a project and pay when you send it. Delivered within{" "}
              {TURNAROUND_DAYS} days.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

const STEPS = [
  {
    title: "Start a project",
    body: "One project is one finished video. Name it and tell us what it's for.",
  },
  {
    title: "Upload your clips",
    body: `Add as many raw clips as you need, each under ${MAX_CLIP_SECONDS} seconds, straight from your phone.`,
  },
  {
    title: "Get your edit",
    body: `Your video arrives within ${TURNAROUND_DAYS} days. Ask for changes if anything's off.`,
  },
];

function Welcome({ credits }: { credits: number }) {
  return (
    <section className="rounded-2xl bg-ink p-6 text-paper sm:p-10">
      <h2 className="display text-4xl sm:text-5xl">Let&apos;s make your first video</h2>
      <ol className="mt-8 grid gap-6 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="border-t border-paper/20 pt-4">
            <span className="display text-3xl text-caption">{i + 1}</span>
            <h3 className="mt-2 font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm text-paper/70">{step.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link
          href="/dashboard/projects/new"
          className="rounded-full bg-caption px-6 py-3.5 font-semibold text-ink hover:bg-paper"
        >
          Start your first video
        </Link>
        <span className="text-sm text-paper/60">
          {credits > 0
            ? `You have ${credits} prepaid ${credits === 1 ? "video" : "videos"}.`
            : `${formatUSD(PRICE_PER_VIDEO)} per video. No subscription.`}
        </span>
      </div>
    </section>
  );
}

function ProjectSection({
  title,
  description,
  projects,
  empty,
}: {
  title: string;
  description?: string;
  projects: ProjectSummary[];
  empty?: string;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate">{description}</p>}
      {projects.length === 0 ? (
        <p className="mt-4 rounded-2xl border-2 border-dashed border-line px-6 py-10 text-center text-slate">
          {empty}
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <ProjectCard project={p} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function cardCopy(p: ProjectSummary) {
  const clips = `${p.clipCount} ${p.clipCount === 1 ? "clip" : "clips"}`;
  switch (p.status) {
    case "draft":
      return { detail: p.clipCount ? `${clips} uploaded` : "No clips yet", cta: "Add clips" };
    case "delivered": {
      const version = p.latestVersion && p.latestVersion > 1 ? ` · v${p.latestVersion}` : "";
      const when = p.deliveredAt ? ` ${formatDate(p.deliveredAt)}` : "";
      return { detail: `Delivered${when}${version}`, cta: "Watch and download" };
    }
    case "revision_requested":
      return { detail: "Your editor is working on your changes", cta: "View project" };
    default:
      return {
        detail: p.submittedAt
          ? `Expected by ${formatDate(addDays(p.submittedAt, TURNAROUND_DAYS))} · ${clips}`
          : clips,
        cta: "View project",
      };
  }
}

function ProjectCard({ project: p }: { project: ProjectSummary }) {
  const { detail, cta } = cardCopy(p);
  return (
    <Link
      href={`/dashboard/projects/${p.id}`}
      className="group flex h-full flex-col rounded-2xl bg-paper p-5 shadow-[0_1px_0_var(--color-line)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_20px_-8px_rgb(21_33_59/0.25)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug">{p.title}</h3>
        <StatusPill status={p.status} />
      </div>
      <p className="mt-2 text-sm text-slate">{detail}</p>
      <span className="mt-auto pt-5 text-sm font-semibold text-cobalt group-hover:underline">
        {cta} →
      </span>
    </Link>
  );
}

function Balance({ credits }: { credits: number }) {
  return (
    <section className="rounded-2xl bg-paper p-5 shadow-[0_1px_0_var(--color-line)]">
      <p className="text-sm text-slate">Prepaid videos</p>
      <p className="display mt-1 text-5xl tabular-nums">{credits}</p>
      <p className="mt-2 text-sm text-slate">
        Each project you send to your editor uses one. No need to check out again.
      </p>
      <Link
        href="/dashboard/projects/new"
        className="mt-4 inline-flex rounded-full bg-cobalt px-4 py-2 text-sm font-semibold text-white hover:bg-cobalt-deep"
      >
        Start a project
      </Link>
    </section>
  );
}
