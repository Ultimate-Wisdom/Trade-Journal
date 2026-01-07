import {
  pgTable,
  text,
  varchar,
  timestamp,
  numeric,
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
  symbol: varchar("symbol", { length: 20 }).notNull(),
  direction: varchar("direction", { length: 10 }).notNull(),
  entryPrice: numeric("entry_price", { precision: 20, scale: 8 }).notNull(),
  exitPrice: numeric("exit_price", { precision: 20, scale: 8 }),
  stopLoss: numeric("stop_loss", { precision: 20, scale: 8 }),
  takeProfit: numeric("take_profit", { precision: 20, scale: 8 }),
  quantity: numeric("quantity", { precision: 20, scale: 8 }).notNull(),
  pnl: numeric("pnl", { precision: 20, scale: 2 }),
  rrr: numeric("rrr", { precision: 10, scale: 2 }),
  riskPercent: numeric("risk_percent", { precision: 10, scale: 2 }),

  // === JOURNAL ANALYSIS FIELDS ===
  strategy: text("strategy"),
  setup: text("setup"),
  marketRegime: text("market_regime"),
  conviction: numeric("conviction", { precision: 3, scale: 1 }),
  // ================================

  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("Open"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// 4. RELATIONSHIPS
// ==========================================
export const accountRelations = relations(accounts, ({ many }) => ({
  trades: many(trades),
}));

export const tradeRelations = relations(trades, ({ one }) => ({
  account: one(accounts, {
    fields: [trades.accountId],
    references: [accounts.id],
  }),
}));

// ==========================================
// 5. SCHEMAS & TYPES
// ==========================================
export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
});
export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
});
export const insertUserSchema = createInsertSchema(users).omit({ id: true });

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;
export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;
