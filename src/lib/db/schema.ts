import { pgTable, uuid, varchar, timestamp, decimal, integer, text, boolean, index, serial } from "drizzle-orm/pg-core";

// 用户表 - 使用自增 ID，同时存储 Supabase auth.users 的 UUID
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  authId: uuid("auth_id").notNull().unique(), // 存储 Supabase auth.users 的 UUID
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 投资组合表
export const portfolios = pgTable(
  "portfolios",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    // 个股佣金配置字段
    stockCommissionMinAmount: decimal("stock_commission_min_amount", { precision: 18, scale: 2 })
      .notNull()
      .default("5.0"), // 个股佣金最低金额（元）
    stockCommissionRate: decimal("stock_commission_rate", { precision: 8, scale: 6 }).notNull().default("0.0003"), // 个股佣金费率（万分比：0.03%）
    // ETF佣金配置字段
    etfCommissionMinAmount: decimal("etf_commission_min_amount", { precision: 18, scale: 2 }).notNull().default("5.0"), // ETF佣金最低金额（元）
    etfCommissionRate: decimal("etf_commission_rate", { precision: 8, scale: 6 }).notNull().default("0.0003"), // ETF佣金费率（万分比：0.03%）
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_portfolios_user_id").on(table.userId),
  }),
);

// 持仓品种表
export const holdings = pgTable(
  "holdings",
  {
    id: serial("id").primaryKey(),
    portfolioId: integer("portfolio_id")
      .references(() => portfolios.id, { onDelete: "cascade" })
      .notNull(),
    symbol: varchar("symbol", { length: 20 }).notNull(), // 股票代码 如 SZ000858
    name: varchar("name", { length: 100 }).notNull(), // 股票名称 如 五粮液
    shares: decimal("shares", { precision: 18, scale: 6 }).notNull().default("0"), // 持股数
    dilutedCost: decimal("diluted_cost", { precision: 18, scale: 6 }).notNull().default("0"), // 摊薄成本
    holdCost: decimal("hold_cost", { precision: 18, scale: 6 }).notNull().default("0"), // 持仓成本
    totalBuyAmount: decimal("total_buy_amount", { precision: 18, scale: 2 }).notNull().default("0"), // 总买入金额
    totalSellAmount: decimal("total_sell_amount", { precision: 18, scale: 2 }).notNull().default("0"), // 总卖出金额
    totalDividend: decimal("total_dividend", { precision: 18, scale: 2 }).notNull().default("0"), // 总现金股息
    isActive: boolean("is_active").notNull().default(true), // 是否活跃持仓
    openTime: timestamp("open_time").notNull(), // 首次买入时间
    liquidationTime: timestamp("liquidation_time"), // 清仓时间
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    portfolioIdIdx: index("idx_holdings_portfolio_id").on(table.portfolioId),
    symbolIdx: index("idx_holdings_symbol").on(table.symbol),
  }),
);

// 交易记录表
export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    portfolioId: integer("portfolio_id")
      .references(() => portfolios.id, { onDelete: "cascade" })
      .notNull(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    type: integer("type").notNull(), // 1-买入 2-卖出 3-合股 4-拆股 9-除权除息
    transactionDate: timestamp("transaction_date").notNull(),
    shares: decimal("shares", { precision: 18, scale: 6 }).notNull().default("0"), // 交易股数
    price: decimal("price", { precision: 18, scale: 6 }).notNull().default("0"), // 交易价格
    amount: decimal("amount", { precision: 18, scale: 2 }).notNull().default("0"), // 交易金额
    commission: decimal("commission", { precision: 18, scale: 2 }).default("0"), // 佣金
    commissionRate: decimal("commission_rate", { precision: 8, scale: 6 }), // 佣金费率 (千分比) - 保留兼容
    tax: decimal("tax", { precision: 18, scale: 2 }).default("0"), // 税费
    taxRate: decimal("tax_rate", { precision: 8, scale: 6 }), // 税费费率 (千分比) - 保留兼容
    transferFee: decimal("transfer_fee", { precision: 18, scale: 2 }).default("0"), // 过户费
    description: text("description"), // 费用明细说明
    // 合股拆股相关字段
    unitShares: decimal("unit_shares", { precision: 18, scale: 6 }), // 合股：多少股合为1股 / 拆股：1股拆为多少股
    // 除权除息相关字段
    per10SharesTransfer: decimal("per_10_shares_transfer", { precision: 18, scale: 6 }), // 每10股转增
    per10SharesBonus: decimal("per_10_shares_bonus", { precision: 18, scale: 6 }), // 每10股送股
    per10SharesDividend: decimal("per_10_shares_dividend", { precision: 18, scale: 6 }), // 每10股红利
    comment: text("comment"), // 备注
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    portfolioIdIdx: index("idx_transactions_portfolio_id").on(table.portfolioId),
    symbolIdx: index("idx_transactions_symbol").on(table.symbol),
    dateIdx: index("idx_transactions_date").on(table.transactionDate),
  }),
);

// 转账记录表
export const transfers = pgTable(
  "transfers",
  {
    id: serial("id").primaryKey(),
    portfolioId: integer("portfolio_id")
      .references(() => portfolios.id, { onDelete: "cascade" })
      .notNull(),
    type: integer("type").notNull(), // 1-转入 2-转出
    amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
    transferDate: timestamp("transfer_date").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    portfolioIdIdx: index("idx_transfers_portfolio_id").on(table.portfolioId),
    dateIdx: index("idx_transfers_date").on(table.transferDate),
  }),
);

// 组合快照表 - 用于存储组合历史数据
export const portfolioSnapshots = pgTable(
  "portfolio_snapshots",
  {
    id: serial("id").primaryKey(),
    portfolioId: integer("portfolio_id")
      .references(() => portfolios.id, { onDelete: "cascade" })
      .notNull(),
    snapshotDate: timestamp("snapshot_date").notNull(),
    totalAssets: decimal("total_assets", { precision: 18, scale: 2 }).notNull().default("0"), // 总资产
    marketValue: decimal("market_value", { precision: 18, scale: 2 }).notNull().default("0"), // 市值
    cash: decimal("cash", { precision: 18, scale: 2 }).notNull().default("0"), // 现金
    principal: decimal("principal", { precision: 18, scale: 2 }).notNull().default("0"), // 本金
    floatAmount: decimal("float_amount", { precision: 18, scale: 2 }).notNull().default("0"), // 浮动盈亏额
    floatRate: decimal("float_rate", { precision: 8, scale: 6 }).notNull().default("0"), // 浮动盈亏率
    accumAmount: decimal("accum_amount", { precision: 18, scale: 2 }).notNull().default("0"), // 累计盈亏额
    accumRate: decimal("accum_rate", { precision: 8, scale: 6 }).notNull().default("0"), // 累计盈亏率
    dayFloatAmount: decimal("day_float_amount", { precision: 18, scale: 2 }).notNull().default("0"), // 当日盈亏额
    dayFloatRate: decimal("day_float_rate", { precision: 8, scale: 6 }).notNull().default("0"), // 当日盈亏率
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    portfolioDateIdx: index("idx_portfolio_snapshots_portfolio_date").on(table.portfolioId, table.snapshotDate),
  }),
);

// 股票价格表 - 缓存实时行情数据
export const stockPrices = pgTable(
  "stock_prices",
  {
    symbol: varchar("symbol", { length: 20 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    currentPrice: decimal("current_price", { precision: 18, scale: 6 }).notNull(),
    change: decimal("change", { precision: 18, scale: 6 }).notNull().default("0"), // 涨跌额
    changePercent: decimal("change_percent", { precision: 8, scale: 6 }).notNull().default("0"), // 涨跌幅
    volume: decimal("volume", { precision: 18, scale: 0 }).default("0"), // 成交量
    turnover: decimal("turnover", { precision: 18, scale: 2 }).default("0"), // 成交额
    marketValue: decimal("market_value", { precision: 18, scale: 2 }).default("0"), // 总市值
    lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  },
  (table) => ({
    lastUpdatedIdx: index("idx_stock_prices_last_updated").on(table.lastUpdated),
  }),
);

// 类型导出
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Portfolio = typeof portfolios.$inferSelect;
export type NewPortfolio = typeof portfolios.$inferInsert;

export type Holding = typeof holdings.$inferSelect;
export type NewHolding = typeof holdings.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type Transfer = typeof transfers.$inferSelect;
export type NewTransfer = typeof transfers.$inferInsert;

export type PortfolioSnapshot = typeof portfolioSnapshots.$inferSelect;
export type NewPortfolioSnapshot = typeof portfolioSnapshots.$inferInsert;

export type StockPrice = typeof stockPrices.$inferSelect;
export type NewStockPrice = typeof stockPrices.$inferInsert;
