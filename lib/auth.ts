import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "./email";
import { grantFreeVideo } from "./orders";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // BETTER_AUTH_URL is trusted automatically; these cover the other production hostname.
  trustedOrigins: ["https://loopgrain.io", "https://www.loopgrain.io"],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  // Verifying isn't needed to sign in, only to unlock the free first video.
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }, request) => {
      try {
        await sendEmail({
          to: user.email,
          subject: "Confirm your email to unlock your free video",
          text: `Hi ${user.name.split(" ")[0]},

Confirm your email and your first Loopgrain video is on us:

${url}

The link works for 24 hours. If you didn't sign up for Loopgrain, you can ignore this email.`,
        });
      } catch (err) {
        // A failed send shouldn't fail sign-up; they can resend from the dashboard.
        if (request && new URL(request.url).pathname.endsWith("/send-verification-email")) throw err;
        console.error("Verification email failed", err);
      }
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await grantFreeVideo(user.id).catch((err) =>
            console.error("Granting free video failed", user.id, err),
          );
        },
      },
    },
  },
  user: {
    additionalFields: {
      businessName: { type: "string", required: false },
      role: { type: "string", required: false, defaultValue: "user", input: false },
    },
  },
  // nextCookies must stay last so it can set cookies from server actions.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
