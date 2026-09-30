ALTER TABLE "project" ADD COLUMN "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "amount_paid_cents" integer;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "stripe_checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id");