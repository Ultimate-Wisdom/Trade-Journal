import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
// We are temporarily bypassing the schema import to debug
// import { insertAccountSchema } from "@shared/schema";

export async function registerRoutes(
  app: Express,
  httpServer: Server,
): Promise<Server> {
  // ==========================================
  // DEV MODE CONFIGURATION
  // ==========================================
  const DEV_USER_ID = "dev-user-id";

  function getCurrentUserId(req: any): string {
    if (req.isAuthenticated()) {
      return req.user.id;
    }
    return DEV_USER_ID;
  }

  // ==========================================
  // 1. ACCOUNT MANAGEMENT ROUTES
  // ==========================================

  // Get all accounts
  app.get("/api/accounts", async (req, res) => {
    try {
      const userId = getCurrentUserId(req);
      const userAccounts = await storage.getAccounts(userId);
      res.json(userAccounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  // Create a new account (THE FIX)
  app.post("/api/accounts", async (req, res) => {
    // 1. LOGGING: Print exactly what the frontend sent us
    console.log("------------------------------------------------");
    console.log("RECEIVED REQUEST BODY:", req.body);

    // 2. MANUAL EXTRACTION (Bypassing strict schema validation)
    const { name, type, initialBalance } = req.body;

    // 3. BASIC CHECK
    if (!name || !type || !initialBalance) {
      console.error("ERROR: Missing fields. Name/Type/Balance required.");
      return res.status(400).json({ message: "Missing required fields" });
    }

    try {
      const userId = getCurrentUserId(req);
      console.log(`Creating account for User: ${userId}`);

      // 4. STORAGE CALL
      const newAccount = await storage.createAccount({
        name,
        type,
        userId,
        // Force conversion to string to ensure database compatibility
        initialBalance: String(initialBalance),
      });

      console.log("SUCCESS: Account created:", newAccount);
      console.log("------------------------------------------------");
      res.json(newAccount);
    } catch (error) {
      // If this happens, the error will show in your Replit Console
      console.error("CRITICAL STORAGE ERROR:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  return httpServer;
}
