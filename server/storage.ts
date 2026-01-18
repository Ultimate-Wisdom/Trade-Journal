import { users, trades, accounts, backtests, tags, tradeTags, tradeTemplates } from "@shared/schema";
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
  getTrades(userId: string): Promise<Trade[]>;
  getTrade(id: string, userId: string): Promise<Trade | undefined>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  updateTrade(
    id: string,
    userId: string,
    updates: Partial<InsertTrade>,
  ): Promise<Trade | undefined>;
  deleteTrade(id: string, userId: string): Promise<boolean>;

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
  async getTrades(userId: string): Promise<Trade[]> {
    return await db
      .select()
      .from(trades)
      .where(eq(trades.userId, userId))
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
}

export const storage = new DatabaseStorage();
