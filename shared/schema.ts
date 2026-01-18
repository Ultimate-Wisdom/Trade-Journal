import {
  pgTable,
  text,
  varchar,
  timestamp,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// ==========================================
// 1. IDENTITY
// ==========================================
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// ==========================================
// 2. ACCOUNTS
// ==========================================
export const accounts = pgTable("accounts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull(),
  name: text("name").notNull(),
  initialBalance: numeric("initial_balance", {
    precision: 20,
    scale: 2,
  }).notNull(),
  type: text("type").notNull(),
  color: text("color").default("#2563eb").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// 3. TRADES (UPDATED FOR YOUR JOURNAL)
// ==========================================
export const trades = pgTable("trades", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull(),
  accountId: varchar("account_id").references(() => accounts.id),
  tradeType: varchar("trade_type", { length: 20 }).default("TRADE").notNull(), // "TRADE" or "ADJUSTMENT"
  excludeFromStats: boolean("exclude_from_stats").default(false).notNull(), // Exclude from analytics (e.g., balance adjustments)
  symbol: varchar("symbol", { length: 20 }),
  direction: varchar("direction", { length: 10 }),
  entryPrice: numeric("entry_price", { precision: 20, scale: 8 }),
  exitPrice: numeric("exit_price", { precision: 20, scale: 8 }),
  stopLoss: numeric("stop_loss", { precision: 20, scale: 8 }),
  takeProfit: numeric("take_profit", { precision: 20, scale: 8 }),
  quantity: numeric("quantity", { precision: 20, scale: 8 }),
  pnl: numeric("pnl", { precision: 20, scale: 2 }),
  rrr: numeric("rrr", { precision: 10, scale: 2 }),
  riskAmount: numeric("risk_amount", { precision: 20, scale: 2 }), // Dollar amount risked (e.g., $15)
  riskPercent: numeric("risk_percent", { precision: 10, scale: 2 }), // Auto-calculated: (riskAmount / accountBalance) * 100
  exitCondition: varchar("exit_condition", { length: 50 }), // "SL", "TP", "Breakeven", "Manual Close"
  exitReason: text("exit_reason"), // Reason for manual close
  swap: numeric("swap", { precision: 20, scale: 2 }),
  commission: numeric("commission", { precision: 20, scale: 2 }),

  // === JOURNAL ANALYSIS FIELDS ===
  strategy: text("strategy"),
  setup: text("setup"),
  marketRegime: text("market_regime"),
  conviction: numeric("conviction", { precision: 3, scale: 1 }),
  entryTime: varchar("entry_time", { length: 5 }), // HH:MM format for session analysis
  // ================================

  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("Open"),
  entryDate: timestamp("entry_date"), // User-selected date/time (for backdating)
  createdAt: timestamp("created_at").defaultNow(), // When record was created in system
});

// ==========================================
// 3. BACKTEST TABLE
// ==========================================
export const backtests = pgTable("backtests", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  direction: varchar("direction", { length: 10 }).notNull(),
  rrr: numeric("rrr", { precision: 10, scale: 2 }).notNull(), // Risk:Reward Ratio
  outcome: varchar("outcome", { length: 5 }).notNull(), // "TP" or "SL"
  strategy: text("strategy").notNull(),
  entryTime: varchar("entry_time", { length: 5 }), // HH:MM format for session analysis
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// 4. TAGS SYSTEM
// ==========================================
export const tags = pgTable("tags", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  color: varchar("color", { length: 7 }).default("#6366f1").notNull(), // Hex color
  createdAt: timestamp("created_at").defaultNow(),
});

// Junction table for many-to-many relationship between trades and tags
export const tradeTags = pgTable("trade_tags", {
  tradeId: varchar("trade_id")
    .references(() => trades.id, { onDelete: "cascade" })
    .notNull(),
  tagId: varchar("tag_id")
    .references(() => tags.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// 5. RELATIONSHIPS
// ==========================================
export const accountRelations = relations(accounts, ({ many }) => ({
  trades: many(trades),
}));

export const tradeRelations = relations(trades, ({ one, many }) => ({
  account: one(accounts, {
    fields: [trades.accountId],
    references: [accounts.id],
  }),
  tradeTags: many(tradeTags),
}));

export const tagRelations = relations(tags, ({ many }) => ({
  tradeTags: many(tradeTags),
}));

export const tradeTagRelations = relations(tradeTags, ({ one }) => ({
  trade: one(trades, {
    fields: [tradeTags.tradeId],
    references: [trades.id],
  }),
  tag: one(tags, {
    fields: [tradeTags.tagId],
    references: [tags.id],
  }),
}));

// ==========================================
// 6. SESSION TABLE (managed by connect-pg-simple)
// ==========================================
export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// ==========================================
// 7. TRADE TEMPLATES
// ==========================================
export const tradeTemplates = pgTable("trade_templates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  symbol: varchar("symbol", { length: 20 }),
  direction: varchar("direction", { length: 10 }),
  strategy: text("strategy"),
  setup: text("setup"),
  riskPercent: numeric("risk_percent", { precision: 10, scale: 2 }),
  riskRewardRatio: varchar("risk_reward_ratio", { length: 20 }),
  notes: text("notes"),
  rules: text("rules"), // JSON string array of rules
  tweaks: text("tweaks"), // Notes on optimization/tweaks
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// 8. SCHEMAS & TYPES
// ==========================================
export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
});
export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
});
export const insertBacktestSchema = createInsertSchema(backtests).omit({
  id: true,
  createdAt: true,
});
export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
});
export const insertTradeTagSchema = createInsertSchema(tradeTags).omit({
  createdAt: true,
});
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertTradeTemplateSchema = createInsertSchema(tradeTemplates).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;
export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;
export type Backtest = typeof backtests.$inferSelect;
export type InsertBacktest = typeof backtests.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;
export type TradeTag = typeof tradeTags.$inferSelect;
export type InsertTradeTag = typeof tradeTags.$inferInsert;
export type TradeTemplate = typeof tradeTemplates.$inferSelect;
export type InsertTradeTemplate = typeof tradeTemplates.$inferInsert;