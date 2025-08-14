-- Custom migration for updating portfolio commission structure
-- Split commission fields into stock and ETF specific fields

-- Rename existing commission_min_amount to stock_commission_min_amount
ALTER TABLE "portfolios" RENAME COLUMN "commission_min_amount" TO "stock_commission_min_amount";

-- Rename existing commission_rate to stock_commission_rate  
ALTER TABLE "portfolios" RENAME COLUMN "commission_rate" TO "stock_commission_rate";

-- Add new ETF commission fields
ALTER TABLE "portfolios" ADD COLUMN "etf_commission_min_amount" numeric(18, 2) DEFAULT '5.0' NOT NULL;
ALTER TABLE "portfolios" ADD COLUMN "etf_commission_rate" numeric(8, 6) DEFAULT '0.0003' NOT NULL;