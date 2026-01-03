import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  app: Express,
  httpServer: Server,
): Promise<Server> {
  console.log("-> Registering Routes...");
  console.log(
    "-> Storage Engine Status:",
    storage ? "ACTIVE" : "MISSING (CRITICAL ERROR)",
  );

  const DEV_USER_ID = "dev-user-id";

  function getCurrentUserId(req: any): string {
    // Safety check for login system
    if (
      req.isAuthenticated &&
      typeof req.isAuthenticated === "function" &&
      req.isAuthenticated()
    ) {
      return req.user.id;
    }
    return DEV_USER_ID;
  }

  // Health Check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", message: "Server is running" });
  });

  // ==========================================
  // ACCOUNT ROUTES (DEBUG MODE)
  // ==========================================

  app.get("/api/accounts", async (req, res) => {
    try {
      if (!storage) throw new Error("Storage Engine is undefined!");
      const userId = getCurrentUserId(req);
      const userAccounts = await storage.getAccounts(userId);
      res.json(userAccounts);
    } catch (error: any) {
      console.error("GET /api/accounts FAILED:", error);
      res
        .status(500)
        .json({ message: error.message || "Failed to fetch accounts" });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    console.log("-> POST /api/accounts REQUEST RECEIVED");
    console.log("-> PAYLOAD:", JSON.stringify(req.body, null, 2));

    try {
      // 1. Check Storage
      if (!storage) {
        throw new Error(
          "CRITICAL: Storage system is not loaded. Check server/storage.ts exports.",
        );
      }

      const { name, type, initialBalance } = req.body;

      // 2. Validate Inputs
      if (!name || !type || !initialBalance) {
        console.error("-> Validation Failed: Missing Fields");
        return res
          .status(400)
          .json({
            message: "Missing required fields: name, type, or initialBalance",
          });
      }

      const userId = getCurrentUserId(req);
      console.log(`-> Processing for UserID: ${userId}`);

      // 3. Attempt Creation
      const newAccount = await storage.createAccount({
        name,
        type,
        userId,
        initialBalance: String(initialBalance), // Ensure string format
      });

      console.log("-> SUCCESS: Account created:", newAccount);
      res.json(newAccount);
    } catch (error: any) {
      // 4. CATCH & REVEAL THE CRASH
      console.error("-> CRASH inside POST /api/accounts:", error);

      // Send the ACTUAL error to the frontend toast
      res.status(500).json({
        message: `SERVER CRASH: ${error.message}`,
        details: error.toString(),
      });
    }
  });

  // ==========================================
  // TRADE ROUTES
  // ==========================================

  app.get("/api/trades", async (req, res) => {
    try {
      const userId = getCurrentUserId(req);
      const trades = await storage.getTrades(userId);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trades" });
    }
  });

  app.post("/api/trades", async (req, res) => {
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
    } = req.body;

    if (!symbol || !direction || !entryPrice || !quantity) {
      return res.status(400).json({ message: "Missing required trade fields" });
    }

    try {
      const userId = getCurrentUserId(req);

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
        notes: notes || "",
        exitPrice: null,
        pnl: null,
        rrr: null,
        riskPercent: null,
      });

      res.json(newTrade);
    } catch (error: any) {
      console.error("TRADE ERROR:", error);
      res.status(500).json({ message: `Trade Log Failed: ${error.message}` });
    }
  });

  console.log("-> Routes Registered Successfully");
  return httpServer;
}
