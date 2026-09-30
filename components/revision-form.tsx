"use client";

import { useActionState } from "react";
import { requestRevision } from "@/app/dashboard/actions";

export function RevisionForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(requestRevision.bind(null, projectId), undefined);

  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm font-medium">
        What should we change?
        <textarea
          name="note"
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          placeholder="e.g. At 0:12 the price should read $24, and can the music be a bit quieter under my voice?"
          className="mt-1.5 w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-ink placeholder:text-slate/60 focus:border-cobalt focus:outline-none"
        />
      </label>
      <p className="text-xs text-slate">
        Timestamps help your editor find the exact spot. Put every change in one request.
      </p>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-5 py-2.5 font-semibold text-paper hover:bg-cobalt disabled:opacity-60"
      >
        {pending ? "Sending…" : "Request revision"}
      </button>
    </form>
  );
}
