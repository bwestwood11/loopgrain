CREATE TABLE "order" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"project_id" text,
	"amount_cents" integer,
	"stripe_checkout_session_id" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id")
);
--> statement-breakpoint
ALTER TABLE "project" DROP CONSTRAINT "project_stripe_checkout_session_id_unique";--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_user_idx" ON "order" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "project" DROP COLUMN "amount_paid_cents";--> statement-breakpoint
ALTER TABLE "project" DROP COLUMN "stripe_checkout_session_id";