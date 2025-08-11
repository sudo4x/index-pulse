const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function resetDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to database");

    // 删除所有表
    const dropQueries = [
      "DROP TABLE IF EXISTS portfolio_snapshots CASCADE;",
      "DROP TABLE IF EXISTS transactions CASCADE;",
      "DROP TABLE IF EXISTS transfers CASCADE;",
      "DROP TABLE IF EXISTS holdings CASCADE;",
      "DROP TABLE IF EXISTS stock_prices CASCADE;",
      "DROP TABLE IF EXISTS portfolios CASCADE;",
      "DROP TABLE IF EXISTS users CASCADE;",
    ];

    for (const query of dropQueries) {
      await client.query(query);
      console.log(`Executed: ${query}`);
    }

    console.log("✅ All tables dropped successfully");
  } catch (error) {
    console.error("❌ Error resetting database:", error);
  } finally {
    await client.end();
  }
}

resetDatabase();
