import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { db } from "./db";
import { sql } from "drizzle-orm";

export async function registerRoutes(
  app: Express,
  httpServer: Server,
): Promise<Server> {
  console.log("🔧 Registering routes...");

  // ==========================================
  // 🔒 ENABLE AUTHENTICATION (CRITICAL)
  // ==========================================
  setupAuth(app);
  console.log("✅ Authentication enabled");
  // ==========================================

  console.log(
    "💾 Storage engine:",
    storage ? "ACTIVE" : "❌ MISSING (CRITICAL ERROR)",
  );

  // ==========================================
  // HEALTH CHECK (with Database Ping)
  // ==========================================
  app.get("/api/health", async (_req, res) => {
    try {
      // Test database connection
      const start = Date.now();
      await db.execute(sql`SELECT 1`);
      const dbLatency = Date.now() - start;
      
      res.json({
        status: "ok",
        message: "Server is running",
        database: "connected",
        dbLatency: `${dbLatency}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("⚠️  Health check failed:", error.message);
      res.status(503).json({
        status: "error",
        message: "Database connection failed",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ==========================================
  // ACCOUNT ROUTES
  // ==========================================

  app.get("/api/accounts", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const userId = req.user!.id;
      const userAccounts = await storage.getAccounts(userId);
      res.json(userAccounts);
    } catch (error: any) {
      console.error("❌ GET /api/accounts failed:", error);
      res
        .status(500)
        .json({ message: error.message || "Failed to fetch accounts" });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const { name, type, initialBalance } = req.body;

      if (!name || !type || !initialBalance) {
        return res.status(400).json({
          message: "Missing required fields: name, type, initialBalance",
        });
      }

      const userId = req.user!.id;

      const newAccount = await storage.createAccount({
        name,
        type,
        userId,
        initialBalance: String(initialBalance),
      });

      console.log(`✅ Account created: ${newAccount.name} (${newAccount.id})`);
      res.json(newAccount);
    } catch (error: any) {
      console.error("❌ POST /api/accounts failed:", error);
      res
        .status(500)
        .json({ message: error.message || "Failed to create account" });
    }
  });

  app.patch("/api/accounts/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const { id } = req.params;
      const userId = req.user!.id;
      const updates = req.body;

      // Convert initialBalance to string if provided
      if (updates.initialBalance) {
        updates.initialBalance = String(updates.initialBalance);
      }

      const updatedAccount = await storage.updateAccount(id, userId, updates);

      if (!updatedAccount) {
        return res.status(404).json({ message: "Account not found" });
      }

      res.json(updatedAccount);
    } catch (error: any) {
      console.error("❌ PATCH /api/accounts/:id failed:", error);
      res
        .status(500)
        .json({ message: error.message || "Failed to update account" });
    }
  });

  app.delete("/api/accounts/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const { id } = req.params;
      const userId = req.user!.id;

      const deleted = await storage.deleteAccount(id, userId);

      if (!deleted) {
        return res.status(404).json({ message: "Account not found" });
      }

      res.json({ message: "Account deleted successfully" });
    } catch (error: any) {
      console.error("❌ DELETE /api/accounts/:id failed:", error);
      res
        .status(500)
        .json({ message: error.message || "Failed to delete account" });
    }
  });

  // ==========================================
  // TRADE ROUTES
  // ==========================================

  app.get("/api/trades", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const userId = req.user!.id;
      const trades = await storage.getTrades(userId);
      res.json(trades);
    } catch (error: any) {
      console.error("❌ GET /api/trades failed:", error);
      res
        .status(500)
        .json({ message: error.message || "Failed to fetch trades" });
    }
  });

  app.get("/api/trades/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const { id } = req.params;
      const userId = req.user!.id;
      const trade = await storage.getTrade(id, userId);

      if (!trade) {
        return res.status(404).json({ message: "Trade not found" });
      }

      res.json(trade);
    } catch (error: any) {
      console.error("❌ GET /api/trades/:id failed:", error);
      res
        .status(500)
        .json({ message: error.message || "Failed to fetch trade" });
    }
  });

  app.post("/api/trades", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const {
        accountId,
        symbol,
        direction,
        entryPrice,
        quantity,
        stopLoss,
        takeProfit,
        swap,
        commission,
        status,
        notes,
        strategy,
        setup,
        marketRegime,
        conviction,
      } = req.body;

      if (!symbol || !direction || !entryPrice || !quantity) {
        return res.status(400).json({
          message:
            "Missing required fields: symbol, direction, entryPrice, quantity",
        });
      }

      const userId = req.user!.id;

      const newTrade = await storage.createTrade({
        userId,
        accountId: accountId || null,
        symbol,
        direction,
        entryPrice: String(entryPrice),
        quantity: String(quantity),
        stopLoss: stopLoss ? String(stopLoss) : null,
        takeProfit: takeProfit ? String(takeProfit) : null,
        swap: swap ? String(swap) : null,
        commission: commission ? String(commission) : null,
        status: status || "Open",
        notes: notes || null,
        strategy: strategy || null,
        setup: setup || null,
        marketRegime: marketRegime || null,
        conviction: conviction ? String(conviction) : null,
        exitPrice: null,
        pnl: null,
        rrr: null,
        riskPercent: null,
      });

      console.log(`✅ Trade created: ${newTrade.symbol} (${newTrade.id})`);
      res.json(newTrade);
    } catch (error: any) {
      console.error("❌ POST /api/trades failed:", error);
      res
        .status(500)
        .json({ message: error.message || "Failed to create trade" });
    }
  });

  app.patch("/api/trades/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const { id } = req.params;
      const userId = req.user!.id;
      const updates = req.body;

      // Convert numeric fields to strings
      const numericFields = [
        "entryPrice",
        "exitPrice",
        "quantity",
        "stopLoss",
        "takeProfit",
        "swap",
        "commission",
        "pnl",
        "rrr",
        "riskPercent",
        "conviction",
      ];
      numericFields.forEach((field) => {
        if (updates[field] !== undefined && updates[field] !== null) {
          updates[field] = String(updates[field]);
        }
      });

      const updatedTrade = await storage.updateTrade(id, userId, updates);

      if (!updatedTrade) {
        return res.status(404).json({ message: "Trade not found" });
      }

      res.json(updatedTrade);
    } catch (error: any) {
      console.error("❌ PATCH /api/trades/:id failed:", error);
      res
        .status(500)
        .json({ message: error.message || "Failed to update trade" });
    }
  });

  app.delete("/api/trades/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const { id } = req.params;
      const userId = req.user!.id;

      const deleted = await storage.deleteTrade(id, userId);

      if (!deleted) {
        return res.status(404).json({ message: "Trade not found" });
      }

      res.json({ message: "Trade deleted successfully" });
    } catch (error: any) {
      console.error("❌ DELETE /api/trades/:id failed:", error);
      res
        .status(500)
        .json({ message: error.message || "Failed to delete trade" });
    }
  });

  // ==========================================
  // BACKTEST ROUTES
  // ==========================================
  app.get("/api/backtests", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const userId = req.user!.id;
      const backtests = await storage.getBacktests(userId);
      res.json(backtests);
    } catch (error: any) {
      console.error("❌ GET /api/backtests failed:", error);
      res
        .status(500)
        .json({ message: error.message || "Failed to fetch backtests" });
    }
  });

  app.post("/api/backtests", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const { symbol, direction, rrr, outcome, strategy, entryTime } = req.body;
      const userId = req.user!.id;

      const backtest = await storage.createBacktest({
        userId,
        symbol: String(symbol).toUpperCase(),
        direction,
        rrr: String(rrr),
        outcome,
        strategy,
        entryTime: entryTime || null,
      });

      res.status(201).json(backtest);
    } catch (error: any) {
      console.error("❌ POST /api/backtests failed:", error);
      res
        .status(500)
        .json({ message: error.message || "Failed to create backtest" });
    }
  });

  app.delete("/api/backtests/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const { id } = req.params;
      const userId = req.user!.id;
      const deleted = await storage.deleteBacktest(id, userId);

      if (!deleted) {
        return res.status(404).json({ message: "Backtest not found" });
      }

      res.json({ message: "Backtest deleted successfully" });
    } catch (error: any) {
      console.error("❌ DELETE /api/backtests/:id failed:", error);
      res
        .status(500)
        .json({ message: error.message || "Failed to delete backtest" });
    }
  });

  // ==========================================
  // TAGS ROUTES
  // ==========================================
  
  // Get all tags for the user
  app.get("/api/tags", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const userId = req.user!.id;
      const tags = await storage.getTags(userId);
      res.json(tags);
    } catch (error: any) {
      console.error("❌ GET /api/tags failed:", error);
      res.status(500).json({ message: error.message || "Failed to fetch tags" });
    }
  });

  // Create a new tag
  app.post("/api/tags", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const newTag = { ...req.body, userId: req.user!.id };
      const createdTag = await storage.createTag(newTag);
      res.status(201).json(createdTag);
    } catch (error: any) {
      console.error("❌ POST /api/tags failed:", error);
      res.status(500).json({ message: error.message || "Failed to create tag" });
    }
  });

  // Delete a tag
  app.delete("/api/tags/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const { id } = req.params;
      const userId = req.user!.id;
      const deleted = await storage.deleteTag(id, userId);

      if (!deleted) {
        return res.status(404).json({ message: "Tag not found" });
      }

      res.json({ message: "Tag deleted successfully" });
    } catch (error: any) {
      console.error("❌ DELETE /api/tags/:id failed:", error);
      res.status(500).json({ message: error.message || "Failed to delete tag" });
    }
  });

  // Get tags for a specific trade
  app.get("/api/trades/:id/tags", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const { id } = req.params;
      const tags = await storage.getTradeTag(id);
      res.json(tags);
    } catch (error: any) {
      console.error("❌ GET /api/trades/:id/tags failed:", error);
      res.status(500).json({ message: error.message || "Failed to fetch trade tags" });
    }
  });

  // Add a tag to a trade
  app.post("/api/trades/:id/tags", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const { id } = req.params;
      const { tagId } = req.body;
      
      await storage.addTagToTrade(id, tagId);
      res.status(201).json({ message: "Tag added to trade" });
    } catch (error: any) {
      console.error("❌ POST /api/trades/:id/tags failed:", error);
      res.status(500).json({ message: error.message || "Failed to add tag to trade" });
    }
  });

  // Remove a tag from a trade
  app.delete("/api/trades/:id/tags/:tagId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const { id, tagId } = req.params;
      await storage.removeTagFromTrade(id, tagId);
      res.json({ message: "Tag removed from trade" });
    } catch (error: any) {
      console.error("❌ DELETE /api/trades/:id/tags/:tagId failed:", error);
      res.status(500).json({ message: error.message || "Failed to remove tag from trade" });
    }
  });

  // ==========================================
  // BALANCE ADJUSTMENT ROUTES
  // ==========================================
  
  // Create a balance adjustment
  app.post("/api/accounts/:accountId/adjust-balance", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const { accountId } = req.params;
      const { currentBalance, reason } = req.body;
      const userId = req.user!.id;

      // Get account to calculate difference
      const account = await storage.getAccount(accountId, userId);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      // Calculate system balance (initial + all P&L)
      const trades = await storage.getTrades(userId);
      const accountTrades = trades.filter(t => t.accountId === accountId);
      const totalPnl = accountTrades.reduce((sum, trade) => {
        return sum + (trade.pnl ? parseFloat(String(trade.pnl)) : 0);
      }, 0);
      const systemBalance = parseFloat(String(account.initialBalance)) + totalPnl;

      // Calculate adjustment needed
      const adjustmentAmount = parseFloat(currentBalance) - systemBalance;

      // Create adjustment entry
      const adjustmentEntry = {
        userId,
        accountId,
        tradeType: "ADJUSTMENT",
        symbol: null,
        direction: null,
        entryPrice: null,
        quantity: null,
        pnl: String(adjustmentAmount),
        status: "Closed",
        notes: reason || "Balance correction",
        entryDate: new Date().toISOString(),
      };

      const createdAdjustment = await storage.createTrade(adjustmentEntry);

      res.status(201).json({
        adjustment: createdAdjustment,
        previousBalance: systemBalance,
        newBalance: currentBalance,
        adjustmentAmount,
      });
    } catch (error: any) {
      console.error("❌ POST /api/accounts/:accountId/adjust-balance failed:", error);
      res.status(500).json({ message: error.message || "Failed to create balance adjustment" });
    }
  });

  // ==========================================
  // TRADE TEMPLATES ROUTES
  // ==========================================
  
  app.get("/api/templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const userId = req.user!.id;
      const templates = await storage.getTradeTemplates(userId);
      res.json(templates);
    } catch (error: any) {
      console.error("❌ GET /api/templates failed:", error);
      res.status(500).json({ message: error.message || "Failed to fetch templates" });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const newTemplate = { ...req.body, userId: req.user!.id };
      const createdTemplate = await storage.createTradeTemplate(newTemplate);
      res.status(201).json(createdTemplate);
    } catch (error: any) {
      console.error("❌ POST /api/templates failed:", error);
      res.status(500).json({ message: error.message || "Failed to create template" });
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const { id } = req.params;
      const userId = req.user!.id;
      const deleted = await storage.deleteTradeTemplate(id, userId);

      if (!deleted) {
        return res.status(404).json({ message: "Template not found" });
      }

      res.json({ message: "Template deleted successfully" });
    } catch (error: any) {
      console.error("❌ DELETE /api/templates/:id failed:", error);
      res.status(500).json({ message: error.message || "Failed to delete template" });
    }
  });

  console.log("✅ All routes registered successfully");
  return httpServer;
}
