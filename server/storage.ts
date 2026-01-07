import { users, trades, accounts } from "@shared/schema";
import {
  type User,
  type InsertUser,
  type Trade,
  type InsertTrade,
  type Account,
  type InsertAccount,
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
}

export const storage = new DatabaseStorage();
