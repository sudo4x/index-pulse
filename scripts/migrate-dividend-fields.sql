-- 添加除权除息新字段的数据库迁移脚本
-- 执行前请先备份数据库

-- 添加新的每10股字段
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS per_10_shares_transfer DECIMAL(18, 6);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS per_10_shares_bonus DECIMAL(18, 6);  
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS per_10_shares_dividend DECIMAL(18, 6);

-- 添加注释
COMMENT ON COLUMN transactions.per_10_shares_transfer IS '每10股转增股数';
COMMENT ON COLUMN transactions.per_10_shares_bonus IS '每10股送股股数';
COMMENT ON COLUMN transactions.per_10_shares_dividend IS '每10股红利金额';

-- 数据迁移：将旧的单股字段转换为每10股字段
-- 如果原来有每股股息数据，转换为每10股红利
UPDATE transactions 
SET per_10_shares_dividend = unit_dividend * 10 
WHERE unit_dividend IS NOT NULL AND unit_dividend > 0 AND type = 9;

-- 如果原来有每股转增数据，转换为每10股转增
UPDATE transactions 
SET per_10_shares_transfer = unit_increase_shares * 10 
WHERE unit_increase_shares IS NOT NULL AND unit_increase_shares > 0 AND type = 9;

-- 验证迁移结果
SELECT 
    id,
    symbol,
    type,
    unit_dividend,
    per_10_shares_dividend,
    unit_increase_shares, 
    per_10_shares_transfer
FROM transactions 
WHERE type = 9 AND (unit_dividend IS NOT NULL OR unit_increase_shares IS NOT NULL)
LIMIT 10;

-- 迁移完成后，可以选择删除旧字段（谨慎操作）
-- ALTER TABLE transactions DROP COLUMN IF EXISTS unit_dividend;
-- ALTER TABLE transactions DROP COLUMN IF EXISTS unit_increase_shares;  
-- ALTER TABLE transactions DROP COLUMN IF EXISTS record_date;