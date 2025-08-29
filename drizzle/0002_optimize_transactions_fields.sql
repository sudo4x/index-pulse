-- Optimize transactions table fields
-- Remove deprecated commission_rate and tax_rate fields
-- Rename and optimize dividend fields

-- First, copy existing data to new fields
ALTER TABLE "transactions" ADD COLUMN "unit_increase_shares" numeric(18, 6);
ALTER TABLE "transactions" ADD COLUMN "unit_dividend" numeric(18, 6);

-- Copy data from old fields to new fields
UPDATE "transactions" SET "unit_increase_shares" = "per_10_shares_transfer" WHERE "per_10_shares_transfer" IS NOT NULL;
UPDATE "transactions" SET "unit_dividend" = "per_10_shares_dividend" WHERE "per_10_shares_dividend" IS NOT NULL;

-- For per_10_shares_bonus, copy to unit_shares for dividend transactions (type = 9)
UPDATE "transactions" SET "unit_shares" = "per_10_shares_bonus" WHERE "per_10_shares_bonus" IS NOT NULL AND "type" = 9;

-- Drop old fields
ALTER TABLE "transactions" DROP COLUMN "commission_rate";
ALTER TABLE "transactions" DROP COLUMN "tax_rate";
ALTER TABLE "transactions" DROP COLUMN "per_10_shares_transfer";
ALTER TABLE "transactions" DROP COLUMN "per_10_shares_bonus";
ALTER TABLE "transactions" DROP COLUMN "per_10_shares_dividend";