-- Add last trade fields to holdings table
-- These fields track the most recent buy and sell prices and dates

-- Add new columns
ALTER TABLE "holdings" ADD COLUMN "last_buy_price" numeric(18, 6);
ALTER TABLE "holdings" ADD COLUMN "last_buy_date" timestamp;
ALTER TABLE "holdings" ADD COLUMN "last_sell_price" numeric(18, 6);
ALTER TABLE "holdings" ADD COLUMN "last_sell_date" timestamp;

-- Initialize existing data with most recent buy/sell transactions
WITH last_buys AS (
  SELECT DISTINCT ON (portfolio_id, symbol)
    portfolio_id,
    symbol,
    price as last_buy_price,
    transaction_date as last_buy_date
  FROM transactions
  WHERE type = 1  -- BUY
  ORDER BY portfolio_id, symbol, transaction_date DESC
),
last_sells AS (
  SELECT DISTINCT ON (portfolio_id, symbol)
    portfolio_id,
    symbol,
    price as last_sell_price,
    transaction_date as last_sell_date
  FROM transactions
  WHERE type = 2  -- SELL
  ORDER BY portfolio_id, symbol, transaction_date DESC
)
UPDATE "holdings"
SET 
  last_buy_price = last_buys.last_buy_price,
  last_buy_date = last_buys.last_buy_date,
  last_sell_price = last_sells.last_sell_price,
  last_sell_date = last_sells.last_sell_date
FROM last_buys
FULL OUTER JOIN last_sells ON (
  last_buys.portfolio_id = last_sells.portfolio_id AND 
  last_buys.symbol = last_sells.symbol
)
WHERE 
  holdings.portfolio_id = COALESCE(last_buys.portfolio_id, last_sells.portfolio_id) AND
  holdings.symbol = COALESCE(last_buys.symbol, last_sells.symbol);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS "idx_transactions_portfolio_symbol_type_date" ON "transactions" (portfolio_id, symbol, type, transaction_date DESC);