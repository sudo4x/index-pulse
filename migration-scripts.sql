-- IndexPulse 投资组合系统数据库结构调整脚本
-- 用于支持组合排序功能和级联删除

-- =====================================
-- 1. 添加组合排序字段
-- =====================================

-- 为 portfolios 表添加 sort_order 字段
ALTER TABLE portfolios ADD COLUMN sort_order INTEGER DEFAULT 0;

-- 初始化现有组合的排序值（按创建时间顺序）
UPDATE portfolios 
SET sort_order = (
    SELECT COUNT(*) - 1 
    FROM portfolios p2 
    WHERE p2.created_at <= portfolios.created_at
);

-- 为 sort_order 字段创建索引以优化查询性能
CREATE INDEX idx_portfolios_sort_order ON portfolios(sort_order);

-- =====================================
-- 2. 级联删除支持
-- =====================================

-- 注意：以下约束可能已存在，如果报错可以忽略

-- 确保 holdings 表的外键约束支持级联删除
ALTER TABLE holdings 
DROP CONSTRAINT IF EXISTS holdings_portfolio_id_fkey;

ALTER TABLE holdings 
ADD CONSTRAINT holdings_portfolio_id_fkey 
FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE;

-- 确保 transactions 表的外键约束支持级联删除
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_portfolio_id_fkey;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_portfolio_id_fkey 
FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE;

-- 确保 transfers 表的外键约束支持级联删除
ALTER TABLE transfers 
DROP CONSTRAINT IF EXISTS transfers_portfolio_id_fkey;

ALTER TABLE transfers 
ADD CONSTRAINT transfers_portfolio_id_fkey 
FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE;

-- 确保 portfolio_snapshots 表的外键约束支持级联删除（如果存在）
ALTER TABLE portfolio_snapshots 
DROP CONSTRAINT IF EXISTS portfolio_snapshots_portfolio_id_fkey;

ALTER TABLE portfolio_snapshots 
ADD CONSTRAINT portfolio_snapshots_portfolio_id_fkey 
FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE;

-- =====================================
-- 3. 验证脚本
-- =====================================

-- 查看 portfolios 表结构
\d portfolios;

-- 查看所有表的外键约束
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    LEFT JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('holdings', 'transactions', 'transfers', 'portfolio_snapshots')
ORDER BY tc.table_name, tc.constraint_name;

-- 测试查询：按 sort_order 排序的组合列表
SELECT id, name, sort_order, created_at 
FROM portfolios 
ORDER BY sort_order ASC;

-- =====================================
-- 4. 回滚脚本（如果需要）
-- =====================================

/*
-- 回滚 sort_order 字段
DROP INDEX IF EXISTS idx_portfolios_sort_order;
ALTER TABLE portfolios DROP COLUMN IF EXISTS sort_order;

-- 回滚外键约束（恢复为不级联删除）
ALTER TABLE holdings 
DROP CONSTRAINT IF EXISTS holdings_portfolio_id_fkey;
ALTER TABLE holdings 
ADD CONSTRAINT holdings_portfolio_id_fkey 
FOREIGN KEY (portfolio_id) REFERENCES portfolios(id);

ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_portfolio_id_fkey;
ALTER TABLE transactions 
ADD CONSTRAINT transactions_portfolio_id_fkey 
FOREIGN KEY (portfolio_id) REFERENCES portfolios(id);

ALTER TABLE transfers 
DROP CONSTRAINT IF EXISTS transfers_portfolio_id_fkey;
ALTER TABLE transfers 
ADD CONSTRAINT transfers_portfolio_id_fkey 
FOREIGN KEY (portfolio_id) REFERENCES portfolios(id);

ALTER TABLE portfolio_snapshots 
DROP CONSTRAINT IF EXISTS portfolio_snapshots_portfolio_id_fkey;
ALTER TABLE portfolio_snapshots 
ADD CONSTRAINT portfolio_snapshots_portfolio_id_fkey 
FOREIGN KEY (portfolio_id) REFERENCES portfolios(id);
*/

-- =====================================
-- 说明
-- =====================================

/*
执行顺序：
1. 首先备份数据库
2. 执行上述 SQL 脚本的第 1、2 部分
3. 运行第 3 部分的验证脚本确认修改成功
4. 测试应用程序功能
5. 如有问题，可以使用第 4 部分的回滚脚本

注意事项：
- sort_order 字段用于支持组合的自定义排序
- CASCADE DELETE 确保删除组合时自动删除相关的所有数据
- 建议在生产环境执行前先在测试环境验证
- 执行前请务必备份数据库
*/