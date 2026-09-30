import type { ProjectStatus } from "@/db/schema";

const STATUS: Record<ProjectStatus, { label: string; className: string }> = {
  draft: { label: "Needs clips", className: "bg-caption text-ink" },
  submitted: { label: "In the queue", className: "bg-[#dfe5ff] text-cobalt-deep" },
  editing: { label: "Editing", className: "bg-cobalt text-white" },
  delivered: { label: "Delivered", className: "bg-[#d4f0e2] text-[#16603f]" },
  revision_requested: { label: "Revising", className: "bg-[#ffe1d6] text-[#9a3412]" },
};

export function StatusPill({ status }: { status: ProjectStatus }) {
  const { label, className } = STATUS[status];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}
