import {
  type User,
  type InsertUser,
  type Account,
  type InsertAccount,
  type Trade,
  type InsertTrade,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Accounts
  getAccounts(userId: string): Promise<Account[]>;
  createAccount(account: InsertAccount & { userId: string }): Promise<Account>;

  // Trades
  getTrades(userId: string): Promise<Trade[]>;
  createTrade(trade: InsertTrade & { userId: string }): Promise<Trade>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private accounts: Map<string, Account>;
  private trades: Map<string, Trade>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.accounts = new Map();
    this.trades = new Map();
    this.currentId = 1;
  }

  // Crash-proof ID generator
  private getId(): string {
    return String(this.currentId++);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.getId();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAccounts(userId: string): Promise<Account[]> {
    return Array.from(this.accounts.values()).filter(
      (acc) => acc.userId === userId,
    );
  }

  async createAccount(
    insertAccount: InsertAccount & { userId: string },
  ): Promise<Account> {
    const id = this.getId();
    const account: Account = {
      ...insertAccount,
      id,
      createdAt: new Date(),
      initialBalance: insertAccount.initialBalance.toString(),
    };
    this.accounts.set(id, account);
    return account;
  }

  async getTrades(userId: string): Promise<Trade[]> {
    return Array.from(this.trades.values()).filter(
      (trade) => trade.userId === userId,
    );
  }

  async createTrade(
    insertTrade: InsertTrade & { userId: string },
  ): Promise<Trade> {
    const id = this.getId();

    // Manual object construction to handle 'undefined' vs 'null' safely
    const trade: Trade = {
      id,
      userId: insertTrade.userId,
      createdAt: new Date(),

      // REQUIRED FIELDS (Converted to string for safety)
      symbol: insertTrade.symbol,
      direction: insertTrade.direction,
      entryPrice: insertTrade.entryPrice.toString(),
      quantity: insertTrade.quantity.toString(),

      // OPTIONAL FIELDS (Force 'undefined' to 'null')
      accountId: insertTrade.accountId || null,
      exitPrice: insertTrade.exitPrice
        ? insertTrade.exitPrice.toString()
        : null,
      stopLoss: insertTrade.stopLoss ? insertTrade.stopLoss.toString() : null,
      takeProfit: insertTrade.takeProfit
        ? insertTrade.takeProfit.toString()
        : null,
      pnl: insertTrade.pnl ? insertTrade.pnl.toString() : null,
      rrr: insertTrade.rrr ? insertTrade.rrr.toString() : null,
      riskPercent: insertTrade.riskPercent
        ? insertTrade.riskPercent.toString()
        : null,
      notes: insertTrade.notes || null,

      // STATUS (Default to 'Open')
      status: insertTrade.status || "Open",
    };

    this.trades.set(id, trade);
    return trade;
  }
}

export const storage = new MemStorage();
