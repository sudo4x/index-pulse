CREATE TABLE "holdings" (
	"id" serial PRIMARY KEY NOT NULL,
	"portfolio_id" integer NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"shares" numeric(18, 6) DEFAULT '0' NOT NULL,
	"diluted_cost" numeric(18, 6) DEFAULT '0' NOT NULL,
	"hold_cost" numeric(18, 6) DEFAULT '0' NOT NULL,
	"total_buy_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"total_sell_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"total_dividend" numeric(18, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"open_time" timestamp NOT NULL,
	"liquidation_time" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"portfolio_id" integer NOT NULL,
	"snapshot_date" timestamp NOT NULL,
	"total_assets" numeric(18, 2) DEFAULT '0' NOT NULL,
	"market_value" numeric(18, 2) DEFAULT '0' NOT NULL,
	"cash" numeric(18, 2) DEFAULT '0' NOT NULL,
	"principal" numeric(18, 2) DEFAULT '0' NOT NULL,
	"float_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"float_rate" numeric(8, 6) DEFAULT '0' NOT NULL,
	"accum_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"accum_rate" numeric(8, 6) DEFAULT '0' NOT NULL,
	"day_float_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"day_float_rate" numeric(8, 6) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolios" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"commission_min_amount" numeric(18, 2) DEFAULT '5.0' NOT NULL,
	"commission_rate" numeric(8, 6) DEFAULT '0.0003' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_prices" (
	"symbol" varchar(20) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"current_price" numeric(18, 6) NOT NULL,
	"change" numeric(18, 6) DEFAULT '0' NOT NULL,
	"change_percent" numeric(8, 6) DEFAULT '0' NOT NULL,
	"volume" numeric(18, 0) DEFAULT '0',
	"turnover" numeric(18, 2) DEFAULT '0',
	"market_value" numeric(18, 2) DEFAULT '0',
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"portfolio_id" integer NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" integer NOT NULL,
	"transaction_date" timestamp NOT NULL,
	"shares" numeric(18, 6) DEFAULT '0' NOT NULL,
	"price" numeric(18, 6) DEFAULT '0' NOT NULL,
	"amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"commission" numeric(18, 2) DEFAULT '0',
	"commission_rate" numeric(8, 6),
	"tax" numeric(18, 2) DEFAULT '0',
	"tax_rate" numeric(8, 6),
	"transfer_fee" numeric(18, 2) DEFAULT '0',
	"description" text,
	"unit_shares" numeric(18, 6),
	"per_10_shares_transfer" numeric(18, 6),
	"per_10_shares_bonus" numeric(18, 6),
	"per_10_shares_dividend" numeric(18, 6),
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"portfolio_id" integer NOT NULL,
	"type" integer NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"transfer_date" timestamp NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"auth_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_id_unique" UNIQUE("auth_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_snapshots" ADD CONSTRAINT "portfolio_snapshots_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_holdings_portfolio_id" ON "holdings" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "idx_holdings_symbol" ON "holdings" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "idx_portfolio_snapshots_portfolio_date" ON "portfolio_snapshots" USING btree ("portfolio_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "idx_portfolios_user_id" ON "portfolios" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_stock_prices_last_updated" ON "stock_prices" USING btree ("last_updated");--> statement-breakpoint
CREATE INDEX "idx_transactions_portfolio_id" ON "transactions" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_symbol" ON "transactions" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "idx_transactions_date" ON "transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "idx_transfers_portfolio_id" ON "transfers" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "idx_transfers_date" ON "transfers" USING btree ("transfer_date");