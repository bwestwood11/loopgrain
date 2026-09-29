import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations use Neon's direct connection when available; the pooled one
    // (PgBouncer, transaction mode) is for the app at runtime.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
});
