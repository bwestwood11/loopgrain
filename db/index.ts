import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env locally, or to the Vercel project's environment variables and redeploy.",
    );
  }
  return drizzle({ client: neon(url), schema });
}

type Db = ReturnType<typeof createDb>;
let instance: Db | undefined;

// Connect on first use rather than at import, so `next build` can load pages
// that import the database without needing DATABASE_URL at build time.
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    instance ??= createDb();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
