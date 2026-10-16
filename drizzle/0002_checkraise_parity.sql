CREATE TABLE "tournament_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"prize_cents" integer,
	"deal" boolean DEFAULT false NOT NULL,
	"booking_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "results_rank_positive" CHECK ("tournament_results"."rank" > 0)
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "public_name" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "show_publicly" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "reentry_price_cents" integer;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "reentry_fee_cents" integer;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "levels" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "entries_count" integer;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "results_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament_results" ADD CONSTRAINT "tournament_results_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_results" ADD CONSTRAINT "tournament_results_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "results_tournament_idx" ON "tournament_results" USING btree ("tournament_id","rank");