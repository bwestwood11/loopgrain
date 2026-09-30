"use client";

import { useActionState } from "react";
import { createProject } from "@/app/dashboard/actions";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-ink placeholder:text-slate/60 focus:border-cobalt focus:outline-none";

export function NewProjectForm() {
  const [state, action, pending] = useActionState(createProject, undefined);

  return (
    <form action={action} className="space-y-5">
      <label className="block text-sm font-medium">
        Video name
        <input
          name="title"
          required
          maxLength={80}
          placeholder="Spring menu launch"
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-medium">
        Brief <span className="font-normal text-slate">(optional)</span>
        <textarea
          name="brief"
          rows={5}
          maxLength={2000}
          placeholder="What's this video for? Anything to highlight, a price to show, music you like, a call to action…"
          className={inputClass}
        />
      </label>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-cobalt px-5 py-3 font-semibold text-white hover:bg-cobalt-deep disabled:opacity-60"
      >
        {pending ? "Creating…" : "Continue to upload clips"}
      </button>
    </form>
  );
}
