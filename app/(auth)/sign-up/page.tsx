import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Create an account | Loopgrain" };

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const { next, videos } = await searchParams;
  const count = Number(Array.isArray(videos) ? videos[0] : videos);

  return (
    <>
      <h1 className="display text-4xl">Create an account</h1>
      <p className="mt-2 mb-6 text-slate">
        {count > 0
          ? `You're one step from ordering ${count} ${count === 1 ? "video" : "videos"}.`
          : "You need an account to order videos. It takes a minute."}
      </p>
      <AuthForm mode="sign-up" next={safeNext(next)} />
    </>
  );
}
