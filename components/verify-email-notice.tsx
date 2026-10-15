"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export const VERIFY_CALLBACK = "/dashboard?verified=1";

// Shown while the free first video is waiting on email verification.
export function VerifyEmailNotice({ email, compact = false }: { email: string; compact?: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function resend() {
    setState("sending");
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: VERIFY_CALLBACK });
    setState(error ? "error" : "sent");
  }

  return (
    <div
      className={`rounded-2xl bg-caption/30 text-ink ${compact ? "p-4 text-sm" : "p-5"}`}
      role="status"
    >
      <p className="font-semibold">Confirm your email to unlock your free video</p>
      <p className="mt-1 text-sm text-ink/75">
        We sent a link to <span className="font-medium">{email}</span>. Click it and your first
        video is on us.
      </p>
      <p className="mt-2 text-sm">
        {state === "sent" ? (
          "Sent. Check your inbox and spam folder."
        ) : state === "error" ? (
          <span className="text-red-800">Couldn&apos;t send it. Try again in a minute.</span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={state === "sending"}
            className="font-semibold text-cobalt underline-offset-2 hover:underline disabled:opacity-60"
          >
            {state === "sending" ? "Sending…" : "Resend the link"}
          </button>
        )}
      </p>
    </div>
  );
}
