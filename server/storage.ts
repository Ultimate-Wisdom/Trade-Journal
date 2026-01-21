import { users, trades, accounts, backtests, tags, tradeTags, tradeTemplates, userSettings, portfolioAssets } from "@shared/schema";
import {
  type User,
  type InsertUser,
  type Trade,
  type InsertTrade,
  type Account,
  type InsertAccount,
  type Backtest,
  type InsertBacktest,
  type Tag,
  type InsertTag,
  type TradeTag,
  type TradeTemplate,
  type InsertTradeTemplate,
  type UserSettings,
  type InsertUserSettings,
  type PortfolioAsset,
  type InsertPortfolioAsset,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User & Auth Methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Trade Methods
  getTrades(userId: string, includeAdjustments?: boolean): Promise<Trade[]>;
  getTrade(id: string, userId: string): Promise<Trade | undefined>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  updateTrade(
    id: string,
    userId: string,
    updates: Partial<InsertTrade>,
  ): Promise<Trade | undefined>;
  deleteTrade(id: string, userId: string): Promise<boolean>;
  migrateStrategy(userId: string, oldName: string, newName: string): Promise<number>;
  renameStrategy(userId: string, oldName: string, newName: string): Promise<{ templateUpdated: number; tradesUpdated: number }>;

  // Account Methods
  getAccounts(userId: string): Promise<Account[]>;
  getAccount(id: string, userId: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(
    id: string,
    userId: string,
    updates: Partial<InsertAccount>,
  ): Promise<Account | undefined>;
  deleteAccount(id: string, userId: string): Promise<boolean>;

  // Backtest Methods
  getBacktests(userId: string): Promise<Backtest[]>;
  createBacktest(backtest: InsertBacktest): Promise<Backtest>;
  deleteBacktest(id: string, userId: string): Promise<boolean>;

  // Tag Methods
  getTags(userId: string): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  deleteTag(id: string, userId: string): Promise<boolean>;
  getTradeTag(tradeId: string): Promise<Tag[]>;
  addTagToTrade(tradeId: string, tagId: string): Promise<void>;
  removeTagFromTrade(tradeId: string, tagId: string): Promise<void>;

  // Trade Template Methods
  getTradeTemplates(userId: string): Promise<TradeTemplate[]>;
  createTradeTemplate(template: InsertTradeTemplate): Promise<TradeTemplate>;
  updateTradeTemplate(
    id: string,
    userId: string,
    updates: Partial<InsertTradeTemplate>,
  ): Promise<TradeTemplate | undefined>;
  deleteTradeTemplate(id: string, userId: string): Promise<boolean>;

  // User Settings Methods
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  upsertUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings>;

  // Portfolio Asset Methods
  getPortfolioAssets(userId: string): Promise<PortfolioAsset[]>;
  createPortfolioAsset(asset: InsertPortfolioAsset): Promise<PortfolioAsset>;
  updatePortfolioAsset(id: string, userId: string, updates: Partial<InsertPortfolioAsset>): Promise<PortfolioAsset | undefined>;
  deletePortfolioAsset(id: string, userId: string): Promise<boolean>;

  // Session Store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // --- USER METHODS ---
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // --- TRADE METHODS ---
  async getTrades(userId: string, includeAdjustments: boolean = false): Promise<Trade[]> {
    const conditions = [eq(trades.userId, userId)];
    
    // Filter out adjustments, deposits, and withdrawals unless explicitly requested
    // Only include actual trades (type = "TRADE") for analytics
    if (!includeAdjustments) {
      conditions.push(eq(trades.excludeFromStats, false));
      // Explicitly exclude ADJUSTMENT, DEPOSIT, WITHDRAWAL types
      // Only include TRADE type for analytics calculations
      conditions.push(eq(trades.tradeType, "TRADE"));
    }
    
    return await db
      .select()
      .from(trades)
      .where(and(...conditions))
      .orderBy(desc(trades.createdAt));
  }

  async getTrade(id: string, userId: string): Promise<Trade | undefined> {
    const [trade] = await db
      .select()
      .from(trades)
      .where(and(eq(trades.id, id), eq(trades.userId, userId)));
    return trade;
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const [newTrade] = await db.insert(trades).values(trade).returning();
    return newTrade;
  }

  async updateTrade(
    id: string,
    userId: string,
    updates: Partial<InsertTrade>,
  ): Promise<Trade | undefined> {
    const [updatedTrade] = await db
      .update(trades)
      .set(updates)
      .where(and(eq(trades.id, id), eq(trades.userId, userId)))
      .returning();
    return updatedTrade;
  }

  async deleteTrade(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(trades)
      .where(and(eq(trades.id, id), eq(trades.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async migrateStrategy(userId: string, oldName: string, newName: string): Promise<number> {
    const result = await db
      .update(trades)
      .set({ strategy: newName })
      .where(and(
        eq(trades.userId, userId),
        eq(trades.strategy, oldName)
      ))
      .returning();
    return result.length;
  }

  async renameStrategy(userId: string, oldName: string, newName: string): Promise<{ templateUpdated: number; tradesUpdated: number }> {
    // Step A: Update the template name in the templates table
    const templateResult = await db
      .update(tradeTemplates)
      .set({ name: newName })
      .where(and(
        eq(tradeTemplates.userId, userId),
        eq(tradeTemplates.name, oldName)
      ))
      .returning();
    const templateUpdated = templateResult.length;

    // Step B: Update all trades that use this strategy name
    const tradesResult = await db
      .update(trades)
      .set({ strategy: newName })
      .where(and(
        eq(trades.userId, userId),
        eq(trades.strategy, oldName)
      ))
      .returning();
    const tradesUpdated = tradesResult.length;

    return { templateUpdated, tradesUpdated };
  }

  // --- ACCOUNT METHODS ---
  async getAccounts(userId: string): Promise<Account[]> {
    return await db.select().from(accounts).where(eq(accounts.userId, userId));
  }

  async getAccount(id: string, userId: string): Promise<Account | undefined> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
    return account;
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [newAccount] = await db.insert(accounts).values(account).returning();
    return newAccount;
  }

  async updateAccount(
    id: string,
    userId: string,
    updates: Partial<InsertAccount>,
  ): Promise<Account | undefined> {
    const [updatedAccount] = await db
      .update(accounts)
      .set(updates)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning();
    return updatedAccount;
  }

  async deleteAccount(id: string, userId: string): Promise<boolean> {
    // First, set accountId to null for all trades associated with this account
    // This handles orphaned references gracefully
    await db
      .update(trades)
      .set({ accountId: null })
      .where(eq(trades.accountId, id));
    
    // Then delete the account
    const result = await db
      .delete(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // ==========================================
  // BACKTEST METHODS
  // ==========================================
  async getBacktests(userId: string): Promise<Backtest[]> {
    const results = await db
      .select()
      .from(backtests)
      .where(eq(backtests.userId, userId))
      .orderBy(desc(backtests.createdAt));
    return results;
  }

  async createBacktest(backtest: InsertBacktest): Promise<Backtest> {
    const [newBacktest] = await db.insert(backtests).values(backtest).returning();
    return newBacktest;
  }

  async deleteBacktest(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(backtests)
      .where(and(eq(backtests.id, id), eq(backtests.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // --- TAG METHODS ---
  async getTags(userId: string): Promise<Tag[]> {
    return db.select().from(tags).where(eq(tags.userId, userId));
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const [newTag] = await db.insert(tags).values(tag).returning();
    return newTag;
  }

  async deleteTag(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(tags)
      .where(and(eq(tags.id, id), eq(tags.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getTradeTag(tradeId: string): Promise<Tag[]> {
    const result = await db
      .select({
        id: tags.id,
        userId: tags.userId,
        name: tags.name,
        color: tags.color,
        createdAt: tags.createdAt,
      })
      .from(tradeTags)
      .innerJoin(tags, eq(tradeTags.tagId, tags.id))
      .where(eq(tradeTags.tradeId, tradeId));
    return result;
  }

  async addTagToTrade(tradeId: string, tagId: string): Promise<void> {
    await db.insert(tradeTags).values({ tradeId, tagId });
  }

  async removeTagFromTrade(tradeId: string, tagId: string): Promise<void> {
    await db
      .delete(tradeTags)
      .where(and(eq(tradeTags.tradeId, tradeId), eq(tradeTags.tagId, tagId)));
  }

  // --- TRADE TEMPLATE METHODS ---
  async getTradeTemplates(userId: string): Promise<TradeTemplate[]> {
    return db.select().from(tradeTemplates).where(eq(tradeTemplates.userId, userId));
  }

  async createTradeTemplate(template: InsertTradeTemplate): Promise<TradeTemplate> {
    const [newTemplate] = await db.insert(tradeTemplates).values(template).returning();
    return newTemplate;
  }

  async updateTradeTemplate(
    id: string,
    userId: string,
    updates: Partial<InsertTradeTemplate>,
  ): Promise<TradeTemplate | undefined> {
    const [updatedTemplate] = await db
      .update(tradeTemplates)
      .set(updates)
      .where(and(eq(tradeTemplates.id, id), eq(tradeTemplates.userId, userId)))
      .returning();
    return updatedTemplate;
  }

  async deleteTradeTemplate(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(tradeTemplates)
      .where(and(eq(tradeTemplates.id, id), eq(tradeTemplates.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // --- USER SETTINGS METHODS ---
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return settings;
  }

  async upsertUserSettings(
    userId: string,
    settings: Partial<InsertUserSettings>,
  ): Promise<UserSettings> {
    // Check if settings exist
    const existing = await this.getUserSettings(userId);
    
    if (existing) {
      // Update existing settings
      const [updated] = await db
        .update(userSettings)
        .set({
          ...settings,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId))
        .returning();
      return updated;
    } else {
      // Create new settings
      const [created] = await db
        .insert(userSettings)
        .values({
          userId,
          currency: settings.currency || "USD",
          defaultBalance: settings.defaultBalance || "10000",
          dateFormat: (settings.dateFormat || "DD-MM-YYYY") as "DD-MM-YYYY" | "MM-DD-YYYY",
        })
        .returning();
      return created;
    }
  }

  // --- PORTFOLIO ASSET METHODS ---
  async getPortfolioAssets(userId: string): Promise<PortfolioAsset[]> {
    return await db
      .select()
      .from(portfolioAssets)
      .where(eq(portfolioAssets.userId, userId))
      .orderBy(desc(portfolioAssets.createdAt));
  }

  async createPortfolioAsset(asset: InsertPortfolioAsset): Promise<PortfolioAsset> {
    const [created] = await db
      .insert(portfolioAssets)
      .values(asset)
      .returning();
    return created;
  }

  async updatePortfolioAsset(
    id: string,
    userId: string,
    updates: Partial<InsertPortfolioAsset>,
  ): Promise<PortfolioAsset | undefined> {
    const [updated] = await db
      .update(portfolioAssets)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(portfolioAssets.id, id), eq(portfolioAssets.userId, userId)))
      .returning();
    return updated;
  }

  async deletePortfolioAsset(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(portfolioAssets)
      .where(and(eq(portfolioAssets.id, id), eq(portfolioAssets.userId, userId)))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
