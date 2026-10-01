import Link from "next/link";
import { notFound } from "next/navigation";
import { setProjectStatus } from "@/app/admin/actions";
import { DeliverableUploader } from "@/components/deliverable-uploader";
import { DownloadAllButton } from "@/components/download-all-button";
import { StatusPill } from "@/components/project-status";
import { getAdminProject } from "@/lib/admin";
import { formatBytes, formatDate, formatDuration } from "@/lib/format";
import { formatUSD, MAX_CLIP_SECONDS } from "@/lib/pricing";
import { presignDownload } from "@/lib/r2";
import { requireAdmin } from "@/lib/session";

export default async function AdminProjectPage(props: PageProps<"/admin/projects/[id]">) {
  const { id } = await props.params;
  await requireAdmin(`/admin/projects/${id}`);
  const data = await getAdminProject(id);
  if (!data) notFound();

  const { project: p, customer, clips, deliverables, revisions, order, dueAt } = data;
  const openRevisions = revisions.filter((r) => !r.resolved);

  // Signing is local crypto, no network calls, so it's fine to do per render.
  const clipLinks = await Promise.all(
    clips.map((c) => presignDownload(c.storageKey, c.fileName).catch(() => null)),
  );
  const deliverableLinks = await Promise.all(
    deliverables.map((d) => presignDownload(d.storageKey).catch(() => null)),
  );
  const allClipLinks = clipLinks.filter((u): u is string => u !== null);

  return (
    <>
      <Link href="/admin" className="text-sm font-medium text-slate hover:text-ink">
        ← All projects
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="display text-5xl sm:text-6xl">{p.title}</h1>
        <StatusPill status={p.status} />
      </div>
      <p className="mt-2 text-sm text-slate">
        {p.paidAt ? `Paid and submitted ${formatDate(p.paidAt)}` : "Not paid yet"}
        {dueAt && ` · Due ${formatDate(dueAt)}`}
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-10">
          {openRevisions.length > 0 && (
            <section className="rounded-2xl bg-[#ffe1d6] p-5 text-[#7c2d12]">
              <h2 className="font-semibold">Revision requested</h2>
              {openRevisions.map((r) => (
                <div key={r.id} className="mt-3">
                  <p className="text-xs">{formatDate(r.createdAt)}</p>
                  <p className="mt-1 whitespace-pre-line">{r.note}</p>
                </div>
              ))}
            </section>
          )}

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Raw clips ({clips.length})</h2>
              {allClipLinks.length > 1 && <DownloadAllButton urls={allClipLinks} />}
            </div>
            {clips.length === 0 ? (
              <p className="mt-4 text-slate">No clips uploaded.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl bg-paper shadow-[0_1px_0_var(--color-line)]">
                {clips.map((c, i) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.fileName}</p>
                      <p className="text-xs text-slate">
                        {formatDuration(c.durationSeconds)} · {formatBytes(c.sizeBytes)}
                        {c.durationSeconds === null && ` · check it's under ${formatDuration(MAX_CLIP_SECONDS)}`}
                      </p>
                    </div>
                    {clipLinks[i] && (
                      <a
                        href={clipLinks[i]}
                        className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-cobalt hover:bg-stock"
                      >
                        Download
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {p.status !== "draft" && (
            <section>
              <h2 className="text-xl font-semibold">Deliver</h2>
              {p.status === "submitted" && (
                <form action={setProjectStatus.bind(null, p.id, "editing")} className="mt-3">
                  <p className="text-sm text-slate">
                    Let the customer know you&apos;ve started.{" "}
                    <button type="submit" className="font-semibold text-cobalt hover:underline">
                      Mark as editing
                    </button>
                  </p>
                </form>
              )}
              <div className="mt-4">
                <DeliverableUploader
                  projectId={p.id}
                  nextVersion={(deliverables[0]?.version ?? 0) + 1}
                />
              </div>
            </section>
          )}

          {deliverables.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold">Delivered versions</h2>
              <ul className="mt-4 space-y-2">
                {deliverables.map((d, i) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded-xl bg-paper px-4 py-3 text-sm shadow-[0_1px_0_var(--color-line)]"
                  >
                    <span>
                      v{d.version} · {formatDate(d.createdAt)}
                    </span>
                    {deliverableLinks[i] && (
                      <a
                        href={deliverableLinks[i]}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-cobalt hover:underline"
                      >
                        Watch
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {revisions.some((r) => r.resolved) && (
            <section>
              <h2 className="text-xl font-semibold">Past revisions</h2>
              <ol className="mt-4 space-y-3">
                {revisions
                  .filter((r) => r.resolved)
                  .map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl bg-paper p-4 shadow-[0_1px_0_var(--color-line)]"
                    >
                      <p className="text-xs text-slate">{formatDate(r.createdAt)} · Done</p>
                      <p className="mt-1 whitespace-pre-line text-sm">{r.note}</p>
                    </li>
                  ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="h-fit space-y-6 rounded-2xl bg-paper p-6 shadow-[0_1px_0_var(--color-line)]">
          <div>
            <h2 className="font-semibold">Customer</h2>
            <p className="mt-2 text-sm">{customer.name}</p>
            {customer.businessName && <p className="text-sm text-slate">{customer.businessName}</p>}
            <a href={`mailto:${customer.email}`} className="text-sm text-cobalt hover:underline">
              {customer.email}
            </a>
          </div>
          <div>
            <h2 className="font-semibold">Payment</h2>
            <p className="mt-2 text-sm text-slate">
              {p.paidAt
                ? `Paid ${formatDate(p.paidAt)}${
                    order
                      ? order.quantity > 1
                        ? ` from a ${order.quantity}-video order${order.amountCents !== null ? ` (${formatUSD(order.amountCents / 100)})` : ""}`
                        : order.amountCents !== null
                          ? ` · ${formatUSD(order.amountCents / 100)}`
                          : ""
                      : ""
                  }`
                : "Not paid. It won't reach your queue until the customer pays."}
            </p>
          </div>
          <div>
            <h2 className="font-semibold">Brief</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-slate">
              {p.brief || "No brief. Work from the clips."}
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
