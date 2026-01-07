import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";

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
  // HEALTH CHECK
  // ==========================================
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", message: "Server is running" });
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

  console.log("✅ All routes registered successfully");
  return httpServer;
}
