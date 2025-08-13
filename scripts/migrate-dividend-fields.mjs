/**
 * 数据库迁移脚本：添加除权除息新字段
 * 执行命令：node scripts/migrate-dividend-fields.js
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dotenv from "dotenv";

// 加载环境变量
dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL 环境变量未设置");
  process.exit(1);
}

console.log("🚀 开始数据库迁移：添加除权除息新字段...");

const client = postgres(connectionString);
const db = drizzle(client);

async function runMigration() {
  try {
    console.log("📝 添加新字段...");

    // 添加新的每10股字段
    await client`
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS per_10_shares_transfer DECIMAL(18, 6)
    `;
    console.log("✅ per_10_shares_transfer 字段已添加");

    await client`
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS per_10_shares_bonus DECIMAL(18, 6)
    `;
    console.log("✅ per_10_shares_bonus 字段已添加");

    await client`
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS per_10_shares_dividend DECIMAL(18, 6)
    `;
    console.log("✅ per_10_shares_dividend 字段已添加");

    // 添加字段注释
    await client`
      COMMENT ON COLUMN transactions.per_10_shares_transfer IS '每10股转增股数'
    `;
    await client`
      COMMENT ON COLUMN transactions.per_10_shares_bonus IS '每10股送股股数'
    `;
    await client`
      COMMENT ON COLUMN transactions.per_10_shares_dividend IS '每10股红利金额'
    `;
    console.log("✅ 字段注释已添加");

    console.log("📊 开始数据迁移...");

    // 数据迁移：将旧的单股字段转换为每10股字段
    const dividendResult = await client`
      UPDATE transactions 
      SET per_10_shares_dividend = unit_dividend * 10 
      WHERE unit_dividend IS NOT NULL AND unit_dividend > 0 AND type = 9
    `;
    console.log(`✅ 迁移股息数据：${dividendResult.count} 条记录`);

    const transferResult = await client`
      UPDATE transactions 
      SET per_10_shares_transfer = unit_increase_shares * 10 
      WHERE unit_increase_shares IS NOT NULL AND unit_increase_shares > 0 AND type = 9
    `;
    console.log(`✅ 迁移转增数据：${transferResult.count} 条记录`);

    // 验证迁移结果
    console.log("🔍 验证迁移结果...");
    const verifyResult = await client`
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
      LIMIT 5
    `;

    if (verifyResult.length > 0) {
      console.log("📋 迁移结果示例：");
      console.table(verifyResult);
    } else {
      console.log("ℹ️  没有需要迁移的除权除息数据");
    }

    console.log("🎉 数据库迁移完成！");
    console.log("");
    console.log("⚠️  注意事项：");
    console.log("   - 旧字段（unit_dividend, unit_increase_shares, record_date）仍然保留");
    console.log("   - 如需删除旧字段，请手动执行相应的 ALTER TABLE DROP COLUMN 语句");
    console.log("   - 建议在生产环境运行前先在测试环境验证");
  } catch (error) {
    console.error("❌ 迁移失败：", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
