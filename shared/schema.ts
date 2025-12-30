import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users Table (Keep as you had it)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Trades Table (Core Journal)
export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(), // e.g., "BTC/USD"
  direction: varchar("direction", { length: 10 }).notNull(), // "Buy" or "Sell"
  entryPrice: numeric("entry_price", { precision: 20, scale: 8 }).notNull(),
  exitPrice: numeric("exit_price", { precision: 20, scale: 8 }),
  quantity: numeric("quantity", { precision: 20, scale: 8 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Assets Table (For Live Portfolio Tracking)
export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  symbolId: text("symbol_id").notNull(), // API ID like "bitcoin" or "ethereum"
  ticker: varchar("ticker", { length: 10 }).notNull(), // "BTC"
  quantity: numeric("quantity", { precision: 20, scale: 8 }).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Zod Schemas for Validation
export const insertTradeSchema = createInsertSchema(trades).omit({ id: true, createdAt: true });
export const insertAssetSchema = createInsertSchema(assets).omit({ id: true, lastUpdated: true });
