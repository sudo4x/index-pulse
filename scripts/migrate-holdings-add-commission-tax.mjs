#!/usr/bin/env node

/**
 * 数据库迁移脚本：为 holdings 表添加分离的费用字段
 * 将 totalCommission 和 totalTax 替换为 buyCommission, sellCommission, buyTax, sellTax, otherTax
 * 并从现有交易记录重新计算这些值
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";
import postgres from "postgres";
import dotenv from "dotenv";

// 加载环境变量
dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

// 简化的 schema 定义（仅包含需要的表）
const holdings = {
  name: "holdings",
  columns: {
    id: "id",
    portfolioId: "portfolio_id",
    symbol: "symbol",
    totalCommission: "total_commission",
    totalTax: "total_tax",
  },
};

const transactions = {
  name: "transactions",
  columns: {
    portfolioId: "portfolio_id",
    symbol: "symbol",
    commission: "commission",
    tax: "tax",
  },
};

async function migrateDatabase() {
  console.log("开始迁移数据库...");

  try {
    // 1. 添加新字段（如果不存在）并移除旧字段
    console.log("步骤 1: 更新 holdings 表字段结构");

    // 先添加新字段
    await client.unsafe(`
      ALTER TABLE holdings 
      ADD COLUMN IF NOT EXISTS buy_commission DECIMAL(18,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS sell_commission DECIMAL(18,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS buy_tax DECIMAL(18,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS sell_tax DECIMAL(18,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS other_tax DECIMAL(18,2) NOT NULL DEFAULT 0;
    `);

    console.log("✅ 新字段添加成功");

    // 检查是否存在旧字段，如果存在则准备移除
    const oldColumnsCheck = await client.unsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'holdings' 
      AND column_name IN ('total_commission', 'total_tax');
    `);

    console.log(`发现 ${oldColumnsCheck.length} 个旧字段需要处理`);

    // 2. 重新计算所有持仓的分类费用
    console.log("步骤 2: 重新计算所有持仓的分类费用");

    // 获取所有持仓记录
    const holdingsResult = await client.unsafe(`
      SELECT id, portfolio_id, symbol FROM holdings;
    `);

    console.log(`找到 ${holdingsResult.length} 条持仓记录`);

    for (const holding of holdingsResult) {
      // 分别计算买入、卖出和其他类型的费用
      const buyStats = await client.unsafe(
        `
        SELECT 
          COALESCE(SUM(commission), 0) as buy_commission,
          COALESCE(SUM(tax), 0) as buy_tax
        FROM transactions 
        WHERE portfolio_id = $1 AND symbol = $2 AND type = 1;
      `,
        [holding.portfolio_id, holding.symbol],
      );

      const sellStats = await client.unsafe(
        `
        SELECT 
          COALESCE(SUM(commission), 0) as sell_commission,
          COALESCE(SUM(tax), 0) as sell_tax
        FROM transactions 
        WHERE portfolio_id = $1 AND symbol = $2 AND type = 2;
      `,
        [holding.portfolio_id, holding.symbol],
      );

      const otherStats = await client.unsafe(
        `
        SELECT 
          COALESCE(SUM(commission + tax), 0) as other_tax
        FROM transactions 
        WHERE portfolio_id = $1 AND symbol = $2 AND type NOT IN (1, 2);
      `,
        [holding.portfolio_id, holding.symbol],
      );

      const buyData = buyStats[0];
      const sellData = sellStats[0];
      const otherData = otherStats[0];

      // 更新持仓记录
      await client.unsafe(
        `
        UPDATE holdings 
        SET 
          buy_commission = $1,
          sell_commission = $2,
          buy_tax = $3,
          sell_tax = $4,
          other_tax = $5,
          updated_at = NOW()
        WHERE id = $6;
      `,
        [
          buyData.buy_commission,
          sellData.sell_commission,
          buyData.buy_tax,
          sellData.sell_tax,
          otherData.other_tax,
          holding.id,
        ],
      );

      console.log(
        `✅ 更新持仓 ${holding.symbol}: 买入佣金=${buyData.buy_commission}, 卖出佣金=${sellData.sell_commission}, 买入税费=${buyData.buy_tax}, 卖出税费=${sellData.sell_tax}, 其他税费=${otherData.other_tax}`,
      );
    }

    console.log("✅ 所有持仓的分类费用重新计算完成");

    // 3. 验证数据
    console.log("步骤 3: 验证迁移结果");

    const verificationResult = await client.unsafe(`
      SELECT 
        COUNT(*) as total_holdings,
        SUM(buy_commission) as total_buy_commission,
        SUM(sell_commission) as total_sell_commission,
        SUM(buy_tax) as total_buy_tax,
        SUM(sell_tax) as total_sell_tax,
        SUM(other_tax) as total_other_tax
      FROM holdings;
    `);

    const verification = verificationResult[0];
    console.log(`验证结果:`);
    console.log(`- 总持仓数: ${verification.total_holdings}`);
    console.log(`- 买入佣金汇总: ${verification.total_buy_commission}`);
    console.log(`- 卖出佣金汇总: ${verification.total_sell_commission}`);
    console.log(`- 买入税费汇总: ${verification.total_buy_tax}`);
    console.log(`- 卖出税费汇总: ${verification.total_sell_tax}`);
    console.log(`- 其他税费汇总: ${verification.total_other_tax}`);

    // 4. 移除旧字段（如果存在）
    if (oldColumnsCheck.length > 0) {
      console.log("步骤 4: 移除旧字段");
      
      await client.unsafe(`
        ALTER TABLE holdings 
        DROP COLUMN IF EXISTS total_commission,
        DROP COLUMN IF EXISTS total_tax;
      `);
      
      console.log("✅ 旧字段移除成功");
    }

    console.log("🎉 数据库迁移完成！");
  } catch (error) {
    console.error("❌ 迁移过程中发生错误:", error);
    throw error;
  } finally {
    await client.end();
  }
}

// 执行迁移
migrateDatabase().catch((error) => {
  console.error("迁移失败:", error);
  process.exit(1);
});
