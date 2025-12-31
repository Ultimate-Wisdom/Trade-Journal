import {
  type User,
  type InsertUser,
  type Account,
  type InsertAccount,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAccounts(userId: string): Promise<Account[]>;
  createAccount(account: InsertAccount & { userId: string }): Promise<Account>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private accounts: Map<string, Account>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.accounts = new Map();
    this.currentId = 1;
  }

  // A crash-proof ID generator
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
}

export const storage = new MemStorage();
