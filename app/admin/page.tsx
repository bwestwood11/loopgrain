import Link from "next/link";
import { StatusPill } from "@/components/project-status";
import { projectsByCustomer, VIEWS, viewCounts, type AdminProject, type View } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export default async function AdminPage(props: PageProps<"/admin">) {
  await requireAdmin();
  const { view: raw } = await props.searchParams;
  const view: View = typeof raw === "string" && raw in VIEWS ? (raw as View) : "active";
  const [groups, counts] = await Promise.all([projectsByCustomer(view), viewCounts()]);
  const overdue = groups.flatMap((g) => g.projects).filter((p) => p.overdue).length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl sm:text-6xl">Projects</h1>
          {view === "active" && (
            <p className="mt-2 text-slate">
              {counts.active === 0
                ? "Nothing waiting. Nice."
                : `${counts.active} to do${overdue ? `, ${overdue} overdue` : ""}. Oldest due first.`}
            </p>
          )}
        </div>
      </div>

      <nav aria-label="Filter projects" className="mt-8 flex flex-wrap gap-2">
        {(Object.keys(VIEWS) as View[]).map((key) => (
          <Link
            key={key}
            href={key === "active" ? "/admin" : `/admin?view=${key}`}
            aria-current={key === view ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              key === view ? "bg-ink text-paper" : "bg-paper text-slate hover:text-ink"
            }`}
          >
            {VIEWS[key].label}
            <span className={`ml-2 tabular-nums ${key === view ? "text-caption" : ""}`}>
              {counts[key]}
            </span>
          </Link>
        ))}
      </nav>

      {groups.length === 0 ? (
        <p className="mt-8 rounded-2xl border-2 border-dashed border-line px-6 py-14 text-center text-slate">
          No projects here.
        </p>
      ) : (
        <div className="mt-8 space-y-6">
          {groups.map(({ customer, projects }) => (
            <section
              key={customer.id}
              aria-label={customer.name}
              className="overflow-hidden rounded-2xl bg-paper shadow-[0_1px_0_var(--color-line)]"
            >
              <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-4">
                <div>
                  <h2 className="font-semibold">
                    {customer.name}
                    {customer.businessName && (
                      <span className="font-normal text-slate"> · {customer.businessName}</span>
                    )}
                  </h2>
                  <a
                    href={`mailto:${customer.email}`}
                    className="text-sm text-slate hover:text-cobalt"
                  >
                    {customer.email}
                  </a>
                </div>
                <span className="text-sm text-slate">
                  {projects.length} {projects.length === 1 ? "project" : "projects"}
                </span>
              </header>
              <ul className="divide-y divide-line">
                {projects.map((p) => (
                  <li key={p.id}>
                    <ProjectRow project={p} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function ProjectRow({ project: p }: { project: AdminProject }) {
  let when: string;
  if (p.status === "delivered" && p.deliveredAt) when = `Delivered ${formatDate(p.deliveredAt)}`;
  else if (p.status === "draft") when = `Started ${formatDate(p.createdAt)}`;
  else if (p.dueAt) when = `${p.overdue ? "Overdue since" : "Due"} ${formatDate(p.dueAt)}`;
  else when = "";

  return (
    <Link
      href={`/admin/projects/${p.id}`}
      className="grid gap-2 px-5 py-4 hover:bg-stock/60 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{p.title}</span>
          <StatusPill status={p.status} />
        </div>
        {p.openRevision && (
          <p className="mt-1 line-clamp-1 text-sm text-[#9a3412]">
            Revision: “{p.openRevision.note}”
          </p>
        )}
      </div>
      <div className="flex gap-4 text-sm text-slate sm:justify-end">
        <span>
          {p.clipCount} {p.clipCount === 1 ? "clip" : "clips"}
        </span>
        {when && (
          <span className={p.overdue ? "font-semibold text-red-700" : undefined}>{when}</span>
        )}
      </div>
    </Link>
  );
}
