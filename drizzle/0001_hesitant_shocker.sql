CREATE TABLE "wallet_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(44) NOT NULL,
	"year" integer NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"transaction_count" integer
);
--> statement-breakpoint
CREATE INDEX "idx_wallet_cache_lookup" ON "wallet_cache" USING btree ("wallet_address","year");