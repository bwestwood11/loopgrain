import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // BETTER_AUTH_URL is trusted automatically; these cover the other production hostname.
  trustedOrigins: ["https://loopgrain.io", "https://www.loopgrain.io"],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      businessName: { type: "string", required: false },
    },
  },
  // nextCookies must stay last so it can set cookies from server actions.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
