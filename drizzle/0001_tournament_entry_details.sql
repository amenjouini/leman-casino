ALTER TABLE "tournaments" ADD COLUMN "bounty_cents" integer;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "reentry_count" integer;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "external_booking_url" text;