CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(44) NOT NULL,
	"tax_year" integer NOT NULL,
	"total_trades" integer,
	"total_gain_loss_idr" numeric(20, 2),
	"pdf_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "token_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_address" varchar(44) NOT NULL,
	"timestamp" timestamp NOT NULL,
	"price_usd" numeric(20, 8),
	"price_idr" numeric(20, 2),
	"source" varchar(20),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(44) NOT NULL,
	"signature" varchar(88) NOT NULL,
	"timestamp" timestamp NOT NULL,
	"type" varchar(20),
	"from_token" varchar(44),
	"from_amount" numeric(20, 8),
	"from_symbol" varchar(20),
	"to_token" varchar(44),
	"to_amount" numeric(20, 8),
	"to_symbol" varchar(20),
	"dex" varchar(20),
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "transactions_signature_unique" UNIQUE("signature")
);
--> statement-breakpoint
CREATE INDEX "idx_token_prices_lookup" ON "token_prices" USING btree ("token_address","timestamp");--> statement-breakpoint
CREATE INDEX "idx_transactions_wallet" ON "transactions" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "idx_transactions_timestamp" ON "transactions" USING btree ("timestamp");