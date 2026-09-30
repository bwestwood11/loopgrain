import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

// Deduplicated per request, so layouts and pages can both call it.
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export async function requireUser(next = "/dashboard") {
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return session.user;
}
