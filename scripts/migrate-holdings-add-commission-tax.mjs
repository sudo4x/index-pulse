#!/usr/bin/env node

/**
 * 数据库迁移脚本：为 holdings 表添加 totalCommission 和 totalTax 字段
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
    // 1. 添加新字段（如果不存在）
    console.log("步骤 1: 添加新字段到 holdings 表");

    await client.unsafe(`
      ALTER TABLE holdings 
      ADD COLUMN IF NOT EXISTS total_commission DECIMAL(18,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_tax DECIMAL(18,2) NOT NULL DEFAULT 0;
    `);

    console.log("✅ 新字段添加成功");

    // 2. 重新计算所有持仓的佣金和税费总额
    console.log("步骤 2: 重新计算所有持仓的佣金和税费");

    // 获取所有持仓记录
    const holdingsResult = await client.unsafe(`
      SELECT id, portfolio_id, symbol FROM holdings;
    `);

    console.log(`找到 ${holdingsResult.length} 条持仓记录`);

    for (const holding of holdingsResult) {
      // 计算该持仓的总佣金和总税费
      const transactionStats = await client.unsafe(
        `
        SELECT 
          COALESCE(SUM(commission), 0) as total_commission,
          COALESCE(SUM(tax), 0) as total_tax
        FROM transactions 
        WHERE portfolio_id = $1 AND symbol = $2;
      `,
        [holding.portfolio_id, holding.symbol],
      );

      const stats = transactionStats[0];

      // 更新持仓记录
      await client.unsafe(
        `
        UPDATE holdings 
        SET 
          total_commission = $1,
          total_tax = $2,
          updated_at = NOW()
        WHERE id = $3;
      `,
        [stats.total_commission, stats.total_tax, holding.id],
      );

      console.log(`✅ 更新持仓 ${holding.symbol}: 佣金=${stats.total_commission}, 税费=${stats.total_tax}`);
    }

    console.log("✅ 所有持仓的佣金和税费重新计算完成");

    // 3. 验证数据
    console.log("步骤 3: 验证迁移结果");

    const verificationResult = await client.unsafe(`
      SELECT 
        COUNT(*) as total_holdings,
        SUM(total_commission) as total_commission_sum,
        SUM(total_tax) as total_tax_sum
      FROM holdings;
    `);

    const verification = verificationResult[0];
    console.log(`验证结果:`);
    console.log(`- 总持仓数: ${verification.total_holdings}`);
    console.log(`- 总佣金汇总: ${verification.total_commission_sum}`);
    console.log(`- 总税费汇总: ${verification.total_tax_sum}`);

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
