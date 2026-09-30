import type { Metadata } from "next";
import Link from "next/link";
import { StatusPill } from "@/components/project-status";
import { listProjects, type ProjectSummary } from "@/lib/projects";
import { requireUser } from "@/lib/session";
import { addDays, formatDate } from "@/lib/format";
import { formatUSD, MAX_CLIP_SECONDS, PRICE_PER_VIDEO, TURNAROUND_DAYS } from "@/lib/pricing";

export const metadata: Metadata = { title: "Dashboard | Loopgrain" };

export default async function DashboardPage() {
  const user = await requireUser();
  const projects = await listProjects(user.id);
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

      {projects.length === 0 ? (
        <Welcome />
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-12">
            {drafts.length > 0 && (
              <ProjectSection
                title="Finish uploading"
                description="Add your clips, then send these to your editor."
                projects={drafts}
              />
            )}
            {inProgress.length > 0 && <ProjectSection title="In the edit" projects={inProgress} />}
            <ProjectSection
              title="Completed"
              description="Download finished videos or ask for changes."
              projects={completed}
              empty="Finished videos will show up here."
            />
          </div>
          <OrderCard />
        </div>
      )}
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

function Welcome() {
  return (
    <section className="mt-10 rounded-2xl bg-ink p-6 text-paper sm:p-10">
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
          {formatUSD(PRICE_PER_VIDEO)} per video. No subscription.
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

function OrderCard() {
  return (
    <aside className="h-fit rounded-2xl bg-ink p-6 text-paper lg:sticky lg:top-6">
      <h2 className="display text-3xl">Order a new edit</h2>
      <p className="mt-3 text-sm text-paper/70">
        Start a project for each video you want. Upload the clips, add a few notes, and we&apos;ll
        handle the rest.
      </p>
      <dl className="mt-6 space-y-2 border-t border-paper/15 pt-5 text-sm">
        <div className="flex justify-between">
          <dt className="text-paper/70">Per video</dt>
          <dd className="font-semibold">{formatUSD(PRICE_PER_VIDEO)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-paper/70">Turnaround</dt>
          <dd className="font-semibold">{TURNAROUND_DAYS} days</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-paper/70">Clip length</dt>
          <dd className="font-semibold">Under {MAX_CLIP_SECONDS}s each</dd>
        </div>
      </dl>
      <Link
        href="/dashboard/projects/new"
        className="mt-6 block rounded-full bg-caption px-5 py-3.5 text-center font-semibold text-ink hover:bg-paper"
      >
        Start a new video
      </Link>
    </aside>
  );
}
