import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Sign in | Loopgrain" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;

  return (
    <>
      <h1 className="display text-4xl">Sign in</h1>
      <p className="mt-2 mb-6 text-slate">Order videos and download finished edits.</p>
      <AuthForm mode="sign-in" next={safeNext(next)} />
    </>
  );
}
