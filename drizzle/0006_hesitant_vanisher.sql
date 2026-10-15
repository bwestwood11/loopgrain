CREATE TYPE "public"."order_kind" AS ENUM('paid', 'free_trial');--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "kind" "order_kind" DEFAULT 'paid' NOT NULL;