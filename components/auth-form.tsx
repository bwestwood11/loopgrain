"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signIn, signUp } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-ink placeholder:text-slate/60 focus:border-cobalt focus:outline-none";

export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const { error } =
      mode === "sign-up"
        ? await signUp.email({
            name: String(form.get("name")),
            businessName: String(form.get("businessName")) || undefined,
            email,
            password,
          })
        : await signIn.email({ email, password });

    if (error) {
      setError(error.message ?? "Something went wrong. Check your details and try again.");
      setPending(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  const isSignUp = mode === "sign-up";
  const switchHref = `${isSignUp ? "/sign-in" : "/sign-up"}${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {isSignUp && (
        <>
          <label className="block text-sm font-medium">
            Your name
            <input name="name" required autoComplete="name" className={inputClass} />
          </label>
          <label className="block text-sm font-medium">
            Business name <span className="font-normal text-slate">(optional)</span>
            <input name="businessName" autoComplete="organization" className={inputClass} />
          </label>
        </>
      )}
      <label className="block text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          className={inputClass}
        />
        {isSignUp && (
          <span className="mt-1 block text-xs font-normal text-slate">At least 8 characters</span>
        )}
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-cobalt px-5 py-3 font-semibold text-white hover:bg-cobalt-deep disabled:opacity-60"
      >
        {pending
          ? isSignUp
            ? "Creating account…"
            : "Signing in…"
          : isSignUp
            ? "Create account"
            : "Sign in"}
      </button>

      <p className="text-center text-sm text-slate">
        {isSignUp ? "Already have an account? " : "New to Loopgrain? "}
        <Link href={switchHref} className="font-semibold text-cobalt underline-offset-2 hover:underline">
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
