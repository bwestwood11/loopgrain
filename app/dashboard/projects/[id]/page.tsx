import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { removeClip } from "@/app/dashboard/actions";
import { ClipUploader } from "@/components/clip-uploader";
import { StatusPill } from "@/components/project-status";
import { RevisionForm } from "@/components/revision-form";
import type { Clip, Deliverable, ProjectStatus } from "@/db/schema";
import { addBusinessDays, formatBytes, formatDate, formatDuration } from "@/lib/format";
import {
  MAX_REVISIONS,
  REVISION_TURNAROUND_DAYS,
  REVISION_WINDOW_DAYS,
  revisionDeadline,
  revisionWindowClosed,
  TURNAROUND_DAYS,
} from "@/lib/pricing";
import { getProject } from "@/lib/projects";
import { presignDownload } from "@/lib/r2";
import { requireUser } from "@/lib/session";
import { fulfillCheckout } from "@/lib/stripe";
import { availableCredits, paidOrderForSession } from "@/lib/orders";
import { TrackPurchase } from "@/components/track-purchase";

export const metadata: Metadata = { title: "Project | Loopgrain" };

export default async function ProjectPage(props: PageProps<"/dashboard/projects/[id]">) {
  const { id } = await props.params;
  const { checkout, session_id } = await props.searchParams;
  const user = await requireUser(`/dashboard/projects/${id}`);
  let data = await getProject(user.id, id);
  if (!data) notFound();

  // Back from Stripe: confirm the payment now rather than waiting for the webhook.
  if (checkout === "success" && data.project.status === "draft" && typeof session_id === "string") {
    if (await fulfillCheckout(session_id).catch(() => false)) data = await getProject(user.id, id);
    if (!data) notFound();
  }

  // Looked up separately because the webhook may have recorded the payment first.
  const purchase =
    checkout === "success" && typeof session_id === "string"
      ? await paidOrderForSession(user.id, session_id)
      : undefined;

  const { project, clips, deliverables, revisions } = data;
  const credits = project.status === "draft" ? await availableCredits(user.id) : 0;
  const uploaded = clips.filter((c) => c.uploaded);
  const isDraft = project.status === "draft";
  const openRevision = revisions.find((r) => !r.resolved);

  return (
    <>
      <Link href="/dashboard" className="text-sm font-medium text-slate hover:text-ink">
        ← All projects
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="display text-5xl sm:text-6xl">{project.title}</h1>
        <StatusPill status={project.status} />
      </div>
      <p className="mt-2 text-sm text-slate">Started {formatDate(project.createdAt)}</p>

      <Progress status={project.status} />

      {purchase && typeof session_id === "string" && (
        <TrackPurchase transactionId={session_id} {...purchase} />
      )}
      {checkout === "success" && (
        <Banner tone={project.paidAt ? "good" : "info"}>
          {project.paidAt
            ? "Payment received, thank you. Your clips are with your editor."
            : "Your payment is processing. This page will update once Stripe confirms it."}
        </Banner>
      )}
      {checkout === "cancelled" && isDraft && (
        <Banner tone="info">Checkout cancelled. You haven&apos;t been charged.</Banner>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-10">
          {isDraft && (
            <section>
              <h2 className="text-xl font-semibold">Your clips</h2>
              <p className="mt-1 text-sm text-slate">
                Add every clip you want in this video. Your editor picks the best moments.
              </p>
              {uploaded.length > 0 && (
                <div className="mt-4">
                  <ClipList clips={uploaded} removable />
                </div>
              )}
              <div className="mt-4">
                <ClipUploader
                  projectId={project.id}
                  uploadedIds={uploaded.map((c) => c.id)}
                  usedSeconds={uploaded.reduce((t, c) => t + (c.durationSeconds ?? 0), 0)}
                  usedBytes={uploaded.reduce((t, c) => t + c.sizeBytes, 0)}
                  credits={credits}
                />
              </div>
            </section>
          )}

          {(project.status === "submitted" || project.status === "editing") && (
            <Notice
              title={project.status === "editing" ? "Your editor is on it" : "Sent to your editor"}
              body={
                project.submittedAt
                  ? `Expect your video by ${formatDate(addBusinessDays(project.submittedAt, TURNAROUND_DAYS))}. We'll email you when it's ready.`
                  : "We'll email you when it's ready."
              }
            />
          )}

          {project.status === "revision_requested" && openRevision && (
            <Notice
              title="Revision in progress"
              body={`You asked on ${formatDate(openRevision.createdAt)}: “${openRevision.note}” Expect the updated video by ${formatDate(addBusinessDays(openRevision.createdAt, REVISION_TURNAROUND_DAYS))}.`}
            />
          )}

          {deliverables.length > 0 && (
            <Deliveries
              title={project.title}
              deliverables={deliverables}
              canRevise={project.status === "delivered"}
              reviseBy={project.deliveredAt && revisionDeadline(project.deliveredAt)}
              windowClosed={revisionWindowClosed(project.deliveredAt)}
              revisionsLeft={Math.max(0, MAX_REVISIONS - revisions.length)}
              projectId={project.id}
            />
          )}

          {revisions.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold">Revision requests</h2>
              <ol className="mt-4 space-y-3">
                {revisions.map((r) => {
                  const version = deliverables.find((d) => d.id === r.deliverableId)?.version;
                  return (
                    <li
                      key={r.id}
                      className="rounded-xl bg-paper p-4 shadow-[0_1px_0_var(--color-line)]"
                    >
                      <p className="text-xs text-slate">
                        {formatDate(r.createdAt)}
                        {version ? ` · on v${version}` : ""} · {r.resolved ? "Done" : "In progress"}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm">{r.note}</p>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {!isDraft && uploaded.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-semibold text-slate hover:text-ink">
                Clips you sent ({uploaded.length})
              </summary>
              <div className="mt-3">
                <ClipList clips={uploaded} />
              </div>
            </details>
          )}
        </div>

        <aside className="h-fit space-y-6 rounded-2xl bg-paper p-6 shadow-[0_1px_0_var(--color-line)]">
          <div>
            <h2 className="font-semibold">Brief</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-slate">
              {project.brief || "No brief added. Your editor will work from your clips."}
            </p>
          </div>
          {project.paidAt && (
            <div>
              <h2 className="font-semibold">Payment</h2>
              <p className="mt-2 text-sm text-slate">Paid {formatDate(project.paidAt)}</p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

const STEPS = ["Upload clips", "With your editor", "Delivered"];

function Progress({ status }: { status: ProjectStatus }) {
  const current = status === "draft" ? 0 : status === "delivered" ? 2 : 1;
  return (
    <ol className="mt-8 grid grid-cols-3 gap-2" aria-label="Project progress">
      {STEPS.map((label, i) => {
        const text = i === 1 && status === "revision_requested" ? "Revising" : label;
        return (
          <li key={label} aria-current={i === current ? "step" : undefined}>
            <div className={`h-1.5 rounded-full ${i <= current ? "bg-cobalt" : "bg-line"}`} />
            <p
              className={`mt-2 text-xs font-medium sm:text-sm ${i <= current ? "text-ink" : "text-slate"}`}
            >
              {text}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function Banner({ tone, children }: { tone: "good" | "info"; children: React.ReactNode }) {
  return (
    <p
      role="status"
      className={`mt-6 rounded-xl px-4 py-3 text-sm font-medium ${
        tone === "good" ? "bg-[#d4f0e2] text-[#16603f]" : "bg-paper text-ink"
      }`}
    >
      {children}
    </p>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-2xl bg-ink p-6 text-paper">
      <h2 className="display text-3xl">{title}</h2>
      <p className="mt-2 whitespace-pre-line text-paper/75">{body}</p>
    </section>
  );
}

function ClipList({ clips, removable = false }: { clips: Clip[]; removable?: boolean }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl bg-paper shadow-[0_1px_0_var(--color-line)]">
      {clips.map((c) => (
        <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-stock"
              aria-hidden="true"
            >
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M3 1.5v11l9-5.5z" fill="var(--color-ink)" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{c.fileName}</p>
              <p className="text-xs text-slate">
                {formatDuration(c.durationSeconds)} · {formatBytes(c.sizeBytes)}
              </p>
            </div>
          </div>
          {removable && (
            <form action={removeClip.bind(null, c.id)}>
              <button
                type="submit"
                aria-label={`Remove ${c.fileName}`}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-slate hover:bg-stock hover:text-ink"
              >
                Remove
              </button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}

async function Deliveries({
  title,
  projectId,
  deliverables,
  canRevise,
  reviseBy,
  windowClosed,
  revisionsLeft,
}: {
  title: string;
  projectId: string;
  deliverables: Deliverable[];
  canRevise: boolean;
  // Null for videos delivered before the revision window existed.
  reviseBy: Date | null;
  windowClosed: boolean;
  revisionsLeft: number;
}) {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "loopgrain";
  const links = await Promise.all(
    deliverables.map(async (d) => {
      try {
        return {
          view: await presignDownload(d.storageKey),
          download: await presignDownload(d.storageKey, `${slug}-v${d.version}.mp4`),
        };
      } catch (err) {
        console.error(err);
        return null;
      }
    }),
  );
  const [latest, ...older] = deliverables;
  const latestLinks = links[0];

  return (
    <section>
      <h2 className="text-xl font-semibold">
        Your video{deliverables.length > 1 ? ` (v${latest.version})` : ""}
      </h2>
      <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,16rem)_1fr]">
        {latestLinks ? (
          <video
            src={latestLinks.view}
            controls
            playsInline
            preload="metadata"
            className="aspect-[9/16] w-full rounded-2xl bg-ink object-contain"
          />
        ) : (
          <div className="grid aspect-[9/16] w-full place-items-center rounded-2xl bg-ink p-6 text-center text-sm text-paper/70">
            Preview unavailable right now. Refresh to try again.
          </div>
        )}
        <div className="space-y-6">
          <div>
            <p className="text-sm text-slate">Delivered {formatDate(latest.createdAt)}</p>
            {latestLinks && (
              <a
                href={latestLinks.download}
                className="mt-3 inline-flex rounded-full bg-cobalt px-5 py-3 font-semibold text-white hover:bg-cobalt-deep"
              >
                Download video
              </a>
            )}
          </div>
          {canRevise && (
            <div
              id="revise"
              className="rounded-2xl bg-paper p-5 shadow-[0_1px_0_var(--color-line)]"
            >
              <h3 className="font-semibold">Need changes?</h3>
              {revisionsLeft === 0 ? (
                <p className="mt-1 text-sm text-slate">
                  You&apos;ve used all {MAX_REVISIONS} revisions for this video.
                </p>
              ) : windowClosed ? (
                <p className="mt-1 text-sm text-slate">
                  Revisions can be requested up to {REVISION_WINDOW_DAYS} days after delivery. The
                  window for this video closed on {formatDate(reviseBy!)}.
                </p>
              ) : (
                <>
                  <p className="mt-1 text-sm text-slate">
                    {revisionsLeft} of {MAX_REVISIONS} revisions left
                    {reviseBy && `, until ${formatDate(reviseBy)}`}. Each one comes back within{" "}
                    {REVISION_TURNAROUND_DAYS} business days.
                  </p>
                  <div className="mt-3">
                    <RevisionForm projectId={projectId} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {older.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-slate">Earlier versions</h3>
          <ul className="mt-2 space-y-2">
            {older.map((d, i) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-xl bg-paper px-4 py-3 text-sm shadow-[0_1px_0_var(--color-line)]"
              >
                <span>
                  v{d.version} · {formatDate(d.createdAt)}
                </span>
                {links[i + 1]?.download && (
                  <a
                    href={links[i + 1]?.download}
                    className="font-semibold text-cobalt hover:underline"
                  >
                    Download
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
