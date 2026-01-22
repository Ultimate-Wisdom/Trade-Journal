import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { getLivePrices, calculateCryptoValue } from "./price-service";
import {
  validateTradeCreation,
  validateSymbol,
  validateDirection,
  validateNumeric,
  validateStatus,
  validateString,
  validateExitCondition,
  validateDate,
  sanitizeString,
} from "./validation";

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

      const { name, type, initialBalance, color } = req.body;

      // Validate name
      const nameResult = validateString(name, "Account name", {
        required: true,
        minLength: 1,
        maxLength: 100,
      });
      if (!nameResult.isValid) {
        return res.status(400).json({ message: nameResult.error });
      }

      // Validate type
      const typeResult = validateString(type, "Account type", {
        required: true,
        minLength: 1,
        maxLength: 50,
      });
      if (!typeResult.isValid) {
        return res.status(400).json({ message: typeResult.error });
      }

      // Validate initial balance
      const balanceResult = validateNumeric(initialBalance, "Initial balance", {
        required: true,
        min: 0,
        max: 100000000,
        allowZero: true,
      });
      if (!balanceResult.isValid) {
        return res.status(400).json({ message: balanceResult.error });
      }

      // Validate color (optional, hex format)
      if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return res.status(400).json({ message: "Color must be a valid hex code (e.g., #2563eb)" });
      }

      const userId = req.user!.id;

      const newAccount = await storage.createAccount({
        name: sanitizeString(name.trim()),
        type: sanitizeString(type.trim()),
        userId,
        initialBalance: String(initialBalance),
        color: color || "#2563eb",
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
      // Default to excluding adjustments (include_adjustments=false)
      // Set include_adjustments=true to get all trades including balance corrections
      const includeAdjustments = req.query.include_adjustments === "true";
      const trades = await storage.getTrades(userId, includeAdjustments);
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
        tradeType,
        symbol,
        direction,
        entryPrice,
        quantity,
        stopLoss,
        takeProfit,
        swap,
        commission,
        pnl,
        status,
        notes,
        strategy,
        setup,
        marketRegime,
        conviction,
        riskAmount,
        riskPercent,
        exitCondition,
        exitReason,
        entryTime,
        entryDate,
      } = req.body;

      // Validate the complete trade data
      const validationResult = validateTradeCreation(req.body);
      if (!validationResult.isValid) {
        return res.status(400).json({ message: validationResult.error });
      }

      // Additional field validations for optional fields
      if (status) {
        const statusResult = validateStatus(status);
        if (!statusResult.isValid) {
          return res.status(400).json({ message: statusResult.error });
        }
      }

      if (exitCondition) {
        const exitResult = validateExitCondition(exitCondition);
        if (!exitResult.isValid) {
          return res.status(400).json({ message: exitResult.error });
        }
      }

      // Ensure entryDate is properly formatted for database (timestamp field)
      // Drizzle's timestamp column expects a Date object (it calls toISOString internally)
      let processedEntryDate: Date | null = null;
      if (entryDate) {
        const dateResult = validateDate(entryDate, "Entry date", false);
        if (!dateResult.isValid) {
          return res.status(400).json({ message: dateResult.error });
        }
        // Convert to Date object for Drizzle timestamp field
        // Drizzle's PgTimestamp.mapToDriverValue expects a Date object
        try {
          let dateObj: Date;
          if (entryDate instanceof Date) {
            dateObj = entryDate;
          } else if (typeof entryDate === 'string') {
            // Parse ISO string to Date object
            dateObj = new Date(entryDate);
          } else {
            // Try to convert to string first, then to Date
            dateObj = new Date(String(entryDate));
          }
          
          // Validate the Date object
          if (!isNaN(dateObj.getTime())) {
            processedEntryDate = dateObj;
          } else {
            return res.status(400).json({ message: "Invalid entry date - date is not valid" });
          }
        } catch (error) {
          console.error("Error processing entryDate:", error);
          return res.status(400).json({ message: "Invalid entry date format" });
        }
      }

      // Sanitize text inputs
      const sanitizedNotes = notes ? sanitizeString(notes) : null;
      const sanitizedStrategy = strategy ? sanitizeString(strategy) : null;
      const sanitizedSetup = setup ? sanitizeString(setup) : null;
      const sanitizedExitReason = exitReason ? sanitizeString(exitReason) : null;

      const userId = req.user!.id;

      const newTrade = await storage.createTrade({
        userId,
        accountId: accountId || null,
        tradeType: tradeType || "TRADE",
        symbol: symbol ? symbol.trim().toUpperCase() : null,
        direction: direction || null,
        entryPrice: entryPrice ? String(entryPrice) : null,
        quantity: quantity ? String(quantity) : null,
        stopLoss: stopLoss ? String(stopLoss) : null,
        takeProfit: takeProfit ? String(takeProfit) : null,
        swap: swap ? String(swap) : null,
        commission: commission ? String(commission) : null,
        pnl: pnl ? String(pnl) : null,
        riskAmount: riskAmount ? String(riskAmount) : null,
        riskPercent: riskPercent ? String(riskPercent) : null,
        exitCondition: exitCondition || null,
        exitReason: sanitizedExitReason,
        status: status || "Open",
        notes: sanitizedNotes,
        strategy: sanitizedStrategy,
        setup: sanitizedSetup,
        marketRegime: marketRegime || null,
        conviction: conviction ? String(conviction) : null,
        entryTime: entryTime || null,
        entryDate: processedEntryDate || null,
        exitPrice: null,
        rrr: null,
      });

      console.log(`✅ Trade created: ${newTrade.symbol || 'ADJUSTMENT'} (${newTrade.id})`);
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

      // DEBUG: Log incoming entryDate to see what we're receiving
      if (updates.entryDate !== undefined) {
        console.log("PATCH - Incoming entryDate:", {
          value: updates.entryDate,
          type: typeof updates.entryDate,
          isDate: updates.entryDate instanceof Date,
          constructor: updates.entryDate?.constructor?.name,
          hasToISOString: typeof updates.entryDate?.toISOString === 'function'
        });
      }

      // Validate updated fields
      if (updates.symbol !== undefined) {
        const symbolResult = validateSymbol(updates.symbol);
        if (!symbolResult.isValid) {
          return res.status(400).json({ message: symbolResult.error });
        }
        updates.symbol = updates.symbol.trim().toUpperCase();
      }

      if (updates.direction !== undefined) {
        const directionResult = validateDirection(updates.direction);
        if (!directionResult.isValid) {
          return res.status(400).json({ message: directionResult.error });
        }
      }

      if (updates.status !== undefined) {
        const statusResult = validateStatus(updates.status);
        if (!statusResult.isValid) {
          return res.status(400).json({ message: statusResult.error });
        }
      }

      if (updates.exitCondition !== undefined) {
        const exitResult = validateExitCondition(updates.exitCondition);
        if (!exitResult.isValid) {
          return res.status(400).json({ message: exitResult.error });
        }
      }

      // Process entryDate if provided
      // Drizzle's PgTimestamp expects a Date object (calls toISOString internally)
      let processedEntryDate: Date | null | undefined = undefined;
      if (updates.entryDate !== undefined) {
        if (updates.entryDate === null) {
          processedEntryDate = null;
        } else {
          const dateResult = validateDate(updates.entryDate, "Entry date", false);
          if (!dateResult.isValid) {
            return res.status(400).json({ message: dateResult.error });
          }
          // Try both approaches: pass as Date object (which Drizzle expects)
          try {
            let dateObj: Date;
            if (updates.entryDate instanceof Date) {
              dateObj = updates.entryDate;
            } else if (typeof updates.entryDate === 'string') {
              // Parse ISO string to Date object - Drizzle expects Date, not string
              dateObj = new Date(updates.entryDate);
            } else {
              // Try to convert to string first, then to Date
              dateObj = new Date(String(updates.entryDate));
            }
            
            // Validate the Date object
            if (!isNaN(dateObj.getTime()) && dateObj instanceof Date) {
              // Ensure it's a proper Date object instance
              processedEntryDate = new Date(dateObj.getTime()); // Create fresh Date instance
              console.log("PATCH - Converted entryDate to Date:", processedEntryDate, typeof processedEntryDate, processedEntryDate instanceof Date);
            } else {
              return res.status(400).json({ message: "Invalid entry date - date is not valid" });
            }
          } catch (error) {
            console.error("Error processing entryDate in PATCH:", error);
            return res.status(400).json({ message: "Invalid entry date format" });
          }
        }
      }

      // Validate numeric fields
      const numericValidations: Array<{field: string, name: string, required?: boolean}> = [
        { field: "entryPrice", name: "Entry price" },
        { field: "exitPrice", name: "Exit price" },
        { field: "quantity", name: "Quantity" },
        { field: "stopLoss", name: "Stop loss" },
        { field: "takeProfit", name: "Take profit" },
        { field: "pnl", name: "PnL" },
        { field: "riskAmount", name: "Risk amount" },
        { field: "riskPercent", name: "Risk percent" },
      ];

      for (const validation of numericValidations) {
        if (updates[validation.field] !== undefined && updates[validation.field] !== null) {
          const result = validateNumeric(updates[validation.field], validation.name, {
            required: false,
            min: -1000000,
            max: 1000000,
            allowZero: validation.field === "pnl",
          });
          if (!result.isValid) {
            return res.status(400).json({ message: result.error });
          }
        }
      }

      // Sanitize text fields
      if (updates.notes !== undefined) {
        updates.notes = updates.notes ? sanitizeString(updates.notes) : null;
      }
      if (updates.strategy !== undefined) {
        updates.strategy = updates.strategy ? sanitizeString(updates.strategy) : null;
      }
      if (updates.setup !== undefined) {
        updates.setup = updates.setup ? sanitizeString(updates.setup) : null;
      }
      if (updates.exitReason !== undefined) {
        updates.exitReason = updates.exitReason ? sanitizeString(updates.exitReason) : null;
      }

      // Convert numeric fields to strings for database
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
        "riskAmount",
        "riskPercent",
        "conviction",
      ];
      numericFields.forEach((field) => {
        if (updates[field] !== undefined && updates[field] !== null) {
          updates[field] = String(updates[field]);
        }
      });

      // Remove entryDate from updates to handle it separately at the very end
      // This prevents any numeric conversion or other processing from affecting it
      delete updates.entryDate;
      delete updates.createdAt; // Remove any other timestamp fields

      // Log the final updates object (without entryDate)
      console.log("PATCH - Final updates object keys (before entryDate):", Object.keys(updates));

      // Create the final Date object RIGHT BEFORE passing to storage.updateTrade
      // This ensures it's a fresh Date instance that hasn't been mutated
      let finalEntryDate: Date | undefined = undefined;
      if (processedEntryDate !== undefined && processedEntryDate !== null) {
        // Create a completely fresh Date object from the processed one
        // Use getTime() to get a primitive, then create a new Date - this ensures clean prototype chain
        finalEntryDate = new Date(processedEntryDate.getTime());
        
        // Final validation
        if (!(finalEntryDate instanceof Date) || isNaN(finalEntryDate.getTime())) {
          console.error("PATCH - Final entryDate validation failed:", finalEntryDate);
          finalEntryDate = undefined;
        } else {
          console.log("PATCH - Final entryDate check before storage.updateTrade:", {
            value: finalEntryDate,
            type: typeof finalEntryDate,
            isDate: finalEntryDate instanceof Date,
            hasToISOString: typeof finalEntryDate.toISOString === 'function',
            isValid: !isNaN(finalEntryDate.getTime()),
            isoString: finalEntryDate.toISOString()
          });
        }
      }

      // Only add entryDate to updates at the very last moment, right before calling storage
      const finalUpdates = { ...updates };
      if (finalEntryDate !== undefined) {
        finalUpdates.entryDate = finalEntryDate;
      }

      const updatedTrade = await storage.updateTrade(id, userId, finalUpdates);

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

      // Validate current balance
      const balanceResult = validateNumeric(currentBalance, "Current balance", {
        required: true,
        min: 0,
        max: 100000000,
        allowZero: true,
      });
      if (!balanceResult.isValid) {
        return res.status(400).json({ message: balanceResult.error });
      }

      // Validate reason (optional but has max length)
      if (reason) {
        const reasonResult = validateString(reason, "Reason", {
          required: false,
          maxLength: 500,
        });
        if (!reasonResult.isValid) {
          return res.status(400).json({ message: reasonResult.error });
        }
      }

      // Get account to calculate difference
      const account = await storage.getAccount(accountId, userId);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      // Calculate system balance (initial + all P&L)
      // Include adjustments for balance calculation
      const trades = await storage.getTrades(userId, true);
      const accountTrades = trades.filter(t => t.accountId === accountId);
      const totalPnl = accountTrades.reduce((sum, trade) => {
        const pnlValue = trade.pnl ? parseFloat(String(trade.pnl)) : 0;
        return isNaN(pnlValue) ? sum : sum + pnlValue;
      }, 0);
      const systemBalance = parseFloat(String(account.initialBalance)) + totalPnl;

      // Calculate adjustment needed
      const currentBalanceNum = parseFloat(String(currentBalance));
      const adjustmentAmount = currentBalanceNum - systemBalance;

      // Prevent excessive adjustments (safety check)
      if (Math.abs(adjustmentAmount) > 1000000) {
        return res.status(400).json({
          message: "Adjustment amount is too large. Please verify your balance.",
        });
      }

      // Create adjustment entry
      const adjustmentEntry = {
        userId,
        accountId,
        tradeType: "ADJUSTMENT",
        excludeFromStats: true, // Exclude from analytics but include in balance
        symbol: null,
        direction: null,
        entryPrice: null,
        quantity: null,
        stopLoss: null,
        takeProfit: null,
        swap: null,
        commission: null,
        exitPrice: null,
        rrr: null,
        riskAmount: null,
        riskPercent: null,
        exitCondition: null,
        exitReason: null,
        pnl: String(adjustmentAmount),
        status: "Closed",
        notes: reason ? sanitizeString(reason) : "Balance correction",
        strategy: null,
        setup: null,
        marketRegime: null,
        conviction: null,
        entryTime: null,
        entryDate: new Date(), // Date object for Drizzle timestamp column
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

  // Rename a Playbook strategy (updates both template and trades)
  // IMPORTANT: This route must be registered BEFORE /api/templates/:id routes
  // to prevent Express from matching "rename-strategy" as an :id parameter
  app.post("/api/templates/rename-strategy", async (req, res) => {
    // CRITICAL: Set Content-Type header immediately to ensure JSON response
    res.setHeader("Content-Type", "application/json");
    
    try {
      console.log("📝 POST /api/templates/rename-strategy - Request received");
      
      // Always return JSON, even for auth errors
      if (!req.isAuthenticated()) {
        console.log("❌ Authentication failed");
        return res.status(401).json({ error: "Unauthorized", message: "You must be logged in to rename a strategy" });
      }
      
      if (!storage) {
        console.error("❌ Storage engine is undefined");
        return res.status(500).json({ error: "Server Error", message: "Storage engine is not available" });
      }

      const { oldName, newName } = req.body;
      
      if (!oldName || !newName) {
        console.log("❌ Missing fields:", { oldName: !!oldName, newName: !!newName });
        return res.status(400).json({ error: "Validation Error", message: "Both oldName and newName are required" });
      }

      const userId = req.user!.id;
      console.log(`🔄 Renaming strategy: "${oldName}" -> "${newName}" for user ${userId}`);

      if (oldName === newName) {
        return res.status(400).json({ error: "Validation Error", message: "Old name and new name cannot be the same" });
      }

      // Validate strings
      const oldNameResult = validateString(oldName, "Old strategy name", {
        required: true,
        minLength: 1,
        maxLength: 200,
      });
      if (!oldNameResult.isValid) {
        return res.status(400).json({ error: "Validation Error", message: oldNameResult.error });
      }

      const newNameResult = validateString(newName, "New strategy name", {
        required: true,
        minLength: 1,
        maxLength: 200,
      });
      if (!newNameResult.isValid) {
        return res.status(400).json({ error: "Validation Error", message: newNameResult.error });
      }

      // Perform rename (updates both template and trades)
      const result = await storage.renameStrategy(userId, oldName.trim(), newName.trim());
      console.log(`✅ Rename successful: ${result.templateUpdated} template(s), ${result.tradesUpdated} trade(s)`);

      return res.json({
        success: true,
        message: `Successfully renamed strategy "${oldName}" to "${newName}". Updated ${result.templateUpdated} template(s) and ${result.tradesUpdated} trade(s).`,
        templateUpdated: result.templateUpdated,
        tradesUpdated: result.tradesUpdated,
      });
    } catch (error: any) {
      console.error("❌ POST /api/templates/rename-strategy failed:", error);
      console.error("Error stack:", error.stack);
      // Always return JSON, never HTML - ensure we've set the header
      if (!res.headersSent) {
        res.setHeader("Content-Type", "application/json");
      }
      return res.status(500).json({ 
        error: "Server Error", 
        message: error.message || "Failed to rename strategy",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      });
    }
  });

  app.patch("/api/templates/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const { id } = req.params;
      const userId = req.user!.id;
      const updates = req.body;

      const updatedTemplate = await storage.updateTradeTemplate(id, userId, updates);

      if (!updatedTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }

      res.json(updatedTemplate);
    } catch (error: any) {
      console.error("❌ PATCH /api/templates/:id failed:", error);
      res.status(500).json({ message: error.message || "Failed to update template" });
    }
  });

  // Get strategy performance stats (calculated from trades)
  app.get("/api/templates/:id/stats", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const { id } = req.params;
      const userId = req.user!.id;

      // Get template to find strategy name
      const templates = await storage.getTradeTemplates(userId);
      const template = templates.find((t) => t.id === id);

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Get all trades for this user (excluding adjustments for stats)
      const allTrades = await storage.getTrades(userId, false);

      // Filter trades matching this strategy
      // Match trades where trade.strategy equals template.name (the strategy identifier)
      // Exclude adjustments from analytics
      const strategyName = template.name;
      const matchingTrades = allTrades.filter(
        (trade) => trade.strategy === strategyName && !trade.excludeFromStats
      );

      // Calculate stats from matching trades
      let totalPnl = 0;
      let wins = 0;
      let grossProfit = 0;
      let grossLoss = 0;
      let totalRR = 0;
      let rrCount = 0;
      const symbolStats: Record<string, { pnl: number; wins: number; total: number }> = {};

      matchingTrades.forEach((trade) => {
        const pnl = Number(trade.pnl || 0);
        totalPnl += pnl;

        if (pnl > 0) {
          wins++;
          grossProfit += pnl;
        } else if (pnl < 0) {
          grossLoss += Math.abs(pnl);
        }

        if (trade.rrr) {
          totalRR += Number(trade.rrr);
          rrCount++;
        }

        // Track symbol stats for "Best Asset" insight
        const symbol = trade.symbol || "Unknown";
        if (!symbolStats[symbol]) {
          symbolStats[symbol] = { pnl: 0, wins: 0, total: 0 };
        }
        symbolStats[symbol].pnl += pnl;
        symbolStats[symbol].total++;
        if (pnl > 0) symbolStats[symbol].wins++;
      });

      const totalTrades = matchingTrades.length;
      const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
      const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? grossProfit : 0) : grossProfit / grossLoss;
      const avgRR = rrCount > 0 ? totalRR / rrCount : 0;

      // Find best asset
      let bestAsset = "—";
      let bestAssetPnl = -Infinity;
      Object.entries(symbolStats).forEach(([symbol, stats]) => {
        if (stats.pnl > bestAssetPnl) {
          bestAssetPnl = stats.pnl;
          bestAsset = symbol;
        }
      });

      res.json({
        totalTrades,
        totalPnl,
        winRate,
        profitFactor,
        avgRR,
        bestAsset: bestAsset === "—" ? "—" : bestAsset,
      });
    } catch (error: any) {
      console.error("❌ GET /api/templates/:id/stats failed:", error);
      res.status(500).json({ message: error.message || "Failed to fetch strategy stats" });
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

  // ==========================================
  // STRATEGY MIGRATION ROUTES
  // ==========================================
  
  // Get all unique strategy names from trades (including all trades for migration purposes)
  app.get("/api/trades/strategies", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const userId = req.user!.id;
      // Include ALL trades (including adjustments) to find all strategy names
      // This ensures we can find "orphaned" strategy names that exist in trades but not in Playbook
      const allTrades = await storage.getTrades(userId, true); // Include adjustments
      
      // Get unique strategy names (excluding null/empty)
      const strategySet = new Set<string>();
      allTrades.forEach(trade => {
        if (trade.strategy && trade.strategy.trim()) {
          strategySet.add(trade.strategy.trim());
        }
      });
      
      const strategies = Array.from(strategySet).sort();
      res.json(strategies);
    } catch (error: any) {
      console.error("❌ GET /api/trades/strategies failed:", error);
      res.status(500).json({ message: error.message || "Failed to fetch strategies" });
    }
  });

  // Bulk update strategy names in trades
  app.post("/api/trades/migrate-strategy", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!storage) throw new Error("Storage engine is undefined");

      const { oldName, newName } = req.body;
      const userId = req.user!.id;

      // Validate inputs
      if (!oldName || !newName) {
        return res.status(400).json({ message: "Both oldName and newName are required" });
      }

      if (oldName === newName) {
        return res.status(400).json({ message: "Old name and new name cannot be the same" });
      }

      // Validate strings
      const oldNameResult = validateString(oldName, "Old strategy name", {
        required: true,
        minLength: 1,
        maxLength: 200,
      });
      if (!oldNameResult.isValid) {
        return res.status(400).json({ message: oldNameResult.error });
      }

      const newNameResult = validateString(newName, "New strategy name", {
        required: true,
        minLength: 1,
        maxLength: 200,
      });
      if (!newNameResult.isValid) {
        return res.status(400).json({ message: newNameResult.error });
      }

      // Perform bulk update
      const updatedCount = await storage.migrateStrategy(userId, oldName.trim(), newName.trim());

      res.json({
        message: `Successfully migrated ${updatedCount} trade(s) from "${oldName}" to "${newName}"`,
        updatedCount,
      });
    } catch (error: any) {
      console.error("❌ POST /api/trades/migrate-strategy failed:", error);
      res.status(500).json({ message: error.message || "Failed to migrate strategy" });
    }
  });

  // Log that the rename-strategy route is registered
  console.log("✅ POST /api/templates/rename-strategy route registered");

  // ==========================================
  // USER SETTINGS ROUTES
  // ==========================================
  
  // Get user settings
  app.get("/api/settings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized", message: "You must be logged in to view settings" });
      }
      
      if (!storage) {
        return res.status(500).json({ error: "Server Error", message: "Storage engine is not available" });
      }

      const userId = req.user!.id;
      const settings = await storage.getUserSettings(userId);

      if (!settings) {
        // Return defaults if no settings exist
        return res.json({
          currency: "USD",
          defaultBalance: "10000",
          dateFormat: "DD-MM-YYYY",
        });
      }

      res.json({
        currency: settings.currency || "USD",
        defaultBalance: String(settings.defaultBalance || "10000"),
        dateFormat: settings.dateFormat || "DD-MM-YYYY",
      });
    } catch (error: any) {
      console.error("❌ GET /api/settings failed:", error);
      return res.status(500).json({ 
        error: "Server Error", 
        message: error.message || "Failed to fetch settings",
      });
    }
  });

  // Save/Update user settings
  app.post("/api/settings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized", message: "You must be logged in to save settings" });
      }
      
      if (!storage) {
        return res.status(500).json({ error: "Server Error", message: "Storage engine is not available" });
      }

      const userId = req.user!.id;
      const { currency, defaultBalance, dateFormat } = req.body;

      // Validate date format
      if (dateFormat && dateFormat !== "DD-MM-YYYY" && dateFormat !== "MM-DD-YYYY") {
        return res.status(400).json({ 
          error: "Validation Error", 
          message: "Date format must be either 'DD-MM-YYYY' or 'MM-DD-YYYY'" 
        });
      }

      const updatedSettings = await storage.upsertUserSettings(userId, {
        currency: currency || "USD",
        defaultBalance: defaultBalance || "10000",
        dateFormat: (dateFormat || "DD-MM-YYYY") as "DD-MM-YYYY" | "MM-DD-YYYY",
      });

      res.json({
        currency: updatedSettings.currency,
        defaultBalance: String(updatedSettings.defaultBalance),
        dateFormat: updatedSettings.dateFormat,
      });
    } catch (error: any) {
      console.error("❌ POST /api/settings failed:", error);
      return res.status(500).json({ 
        error: "Server Error", 
        message: error.message || "Failed to save settings",
      });
    }
  });

  // ==========================================
  // PORTFOLIO ASSETS API
  // ==========================================
  app.get("/api/assets", async (req, res) => {
    try {
      // Disable caching to ensure live logs on every request
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized", message: "You must be logged in to view portfolio assets" });
      }
      
      if (!storage) {
        return res.status(500).json({ error: "Server Error", message: "Storage engine is not available" });
      }

      const userId = req.user!.id;
      const assets = await storage.getPortfolioAssets(userId);

      // Extract crypto API IDs for live price fetching (sanitize will happen in getLivePrices)
      const cryptoApiIds = assets
        .filter((asset) => asset.type === "CRYPTO" && asset.apiId)
        .map((asset) => asset.apiId!)
        .filter((id, index, self) => self.indexOf(id) === index); // Unique IDs only

      // Fetch live prices for all crypto assets
      const prices = await getLivePrices(cryptoApiIds);

      // Process assets: preserve original balance, calculate USD value in calculatedValueUsd
      const processedAssets = assets.map((asset) => {
        // Preserve original balance for backward compatibility
        const newAsset = { ...asset, originalBalance: asset.balance };
        
        // 1. Handle Crypto: Value comes from Price * Quantity
        if (newAsset.type === 'CRYPTO' && newAsset.apiId) {
          const sanitizedApiId = newAsset.apiId.trim().toLowerCase();
          const price = prices.get(sanitizedApiId) || 0;
          
          // Debug logging for specific assets
          if (sanitizedApiId === 'jito-staked-sol') {
            console.log('🔍 Found Jito in DB. Raw ID:', newAsset.apiId, 'Sanitized ID:', sanitizedApiId, 'Price:', price);
          }
          
          if (price > 0 && newAsset.quantity) {
            // Crypto balance is irrelevant for value, so we use quantity * price
            newAsset.calculatedValueUsd = Number(newAsset.quantity) * price;
          } else {
            newAsset.calculatedValueUsd = 0;
            if (price === 0) {
              console.warn(`⚠️  No price found for crypto asset "${newAsset.name}" (ID: "${newAsset.apiId}", sanitized: "${sanitizedApiId}"). Available prices:`, Array.from(prices.keys()));
            }
          }
        } 
        // 2. Handle Cash (MYR): Value comes from Balance / Rate
        else if (newAsset.currency === 'MYR') {
          // CRITICAL: Keep newAsset.balance as the original RM amount (e.g., 16475)
          // Only put the converted value into the calculated field
          newAsset.calculatedValueUsd = Number(newAsset.balance) / 4.45;
        } 
        // 3. Handle Cash/Investment (USD) and Prop Firm: Value is just the Balance
        else {
          newAsset.calculatedValueUsd = Number(newAsset.balance) || 0;
        }

        // Debug: Log the final values being sent
        if (newAsset.type === "CRYPTO" || newAsset.currency === "MYR") {
          console.log(`📊 Asset: ${newAsset.name} | Type: ${newAsset.type} | Currency: ${newAsset.currency} | Original Balance: ${newAsset.balance} | Calculated USD: ${newAsset.calculatedValueUsd}`);
        }

        return newAsset;
      });

      res.json(processedAssets);
    } catch (error: any) {
      console.error("❌ GET /api/assets failed:", error);
      return res.status(500).json({ 
        error: "Server Error", 
        message: error.message || "Failed to fetch portfolio assets",
      });
    }
  });

  app.post("/api/assets", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized", message: "You must be logged in to create portfolio assets" });
      }
      
      if (!storage) {
        return res.status(500).json({ error: "Server Error", message: "Storage engine is not available" });
      }

      const userId = req.user!.id;
      const { name, type, balance, currency, location, ticker, apiId, quantity } = req.body;

      // Validate required fields
      if (!name || !type || !currency) {
        return res.status(400).json({ 
          error: "Validation Error", 
          message: "Name, type, and currency are required" 
        });
      }

      // Validate type
      const validTypes = ["CASH", "INVESTMENT", "CRYPTO", "PROP_FIRM"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ 
          error: "Validation Error", 
          message: `Type must be one of: ${validTypes.join(", ")}` 
        });
      }

      // Validate currency
      if (!["MYR", "USD"].includes(currency)) {
        return res.status(400).json({ 
          error: "Validation Error", 
          message: "Currency must be either 'MYR' or 'USD'" 
        });
      }

      // Type-specific validation
      if (type === "CRYPTO") {
        // Crypto requires quantity and apiId
        if (!quantity || quantity === null || !apiId || !ticker) {
          return res.status(400).json({ 
            error: "Validation Error", 
            message: "Crypto assets require quantity, ticker, and apiId (CoinGecko ID)" 
          });
        }
        const qty = parseFloat(String(quantity));
        if (isNaN(qty) || qty <= 0) {
          return res.status(400).json({ 
            error: "Validation Error", 
            message: "Quantity must be a valid positive number" 
          });
        }
      } else if (type === "CASH" || type === "INVESTMENT" || type === "PROP_FIRM") {
        // Cash/Investment/Prop Firm requires balance
        if (balance === undefined || balance === null) {
          return res.status(400).json({ 
            error: "Validation Error", 
            message: `${type} assets require a balance` 
          });
        }
        const balanceNum = parseFloat(String(balance));
        if (isNaN(balanceNum) || balanceNum < 0) {
          return res.status(400).json({ 
            error: "Validation Error", 
            message: "Balance must be a valid positive number" 
          });
        }
      }

      const asset = await storage.createPortfolioAsset({
        userId,
        name: String(name).trim(),
        location: location ? String(location).trim() : null,
        type: type as "CASH" | "INVESTMENT" | "CRYPTO" | "PROP_FIRM",
        ticker: ticker ? String(ticker).trim().toUpperCase() : null,
        apiId: apiId ? String(apiId).trim().toLowerCase() : null,
        quantity: type === "CRYPTO" && quantity ? String(parseFloat(String(quantity)).toFixed(8)) : null,
        balance: (type === "CASH" || type === "INVESTMENT" || type === "PROP_FIRM") && balance 
          ? String(parseFloat(String(balance)).toFixed(2)) 
          : null,
        currency: currency as "MYR" | "USD",
      });

      res.json(asset);
    } catch (error: any) {
      console.error("❌ POST /api/assets failed:", error);
      return res.status(500).json({ 
        error: "Server Error", 
        message: error.message || "Failed to create portfolio asset",
      });
    }
  });

  app.put("/api/assets/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized", message: "You must be logged in to update portfolio assets" });
      }
      
      if (!storage) {
        return res.status(500).json({ error: "Server Error", message: "Storage engine is not available" });
      }

      const userId = req.user!.id;
      const { id } = req.params;
      const { name, type, balance, currency, location, ticker, apiId, quantity } = req.body;

      // Validate required fields
      if (!name || !type || !currency) {
        return res.status(400).json({ 
          error: "Validation Error", 
          message: "Name, type, and currency are required" 
        });
      }

      // Validate type
      const validTypes = ["CASH", "INVESTMENT", "CRYPTO", "PROP_FIRM"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ 
          error: "Validation Error", 
          message: `Type must be one of: ${validTypes.join(", ")}` 
        });
      }

      // Validate currency
      if (!["MYR", "USD"].includes(currency)) {
        return res.status(400).json({ 
          error: "Validation Error", 
          message: "Currency must be either 'MYR' or 'USD'" 
        });
      }

      // Type-specific validation
      if (type === "CRYPTO") {
        // Crypto requires quantity and apiId
        if (!quantity || quantity === null || !apiId || !ticker) {
          return res.status(400).json({ 
            error: "Validation Error", 
            message: "Crypto assets require quantity, ticker, and apiId (CoinGecko ID)" 
          });
        }
        const qty = parseFloat(String(quantity));
        if (isNaN(qty) || qty <= 0) {
          return res.status(400).json({ 
            error: "Validation Error", 
            message: "Quantity must be a positive number" 
          });
        }
      } else {
        // CASH, INVESTMENT, PROP_FIRM require balance
        if (!balance || balance === null) {
          return res.status(400).json({ 
            error: "Validation Error", 
            message: `${type} assets require a balance` 
          });
        }
        const bal = parseFloat(String(balance));
        if (isNaN(bal) || bal < 0) {
          return res.status(400).json({ 
            error: "Validation Error", 
            message: "Balance must be a non-negative number" 
          });
        }
      }

      // Prepare update object
      const updates: any = {
        name: sanitizeString(name),
        type,
        currency,
        location: location ? sanitizeString(location) : null,
      };

      if (type === "CRYPTO") {
        updates.quantity = String(quantity);
        updates.ticker = ticker ? sanitizeString(ticker).toUpperCase() : null;
        updates.apiId = apiId ? sanitizeString(apiId).toLowerCase() : null;
        updates.balance = null; // Clear balance for crypto
      } else {
        updates.balance = String(balance);
        updates.quantity = null; // Clear quantity for non-crypto
        updates.ticker = null; // Clear ticker for non-crypto
        updates.apiId = null; // Clear apiId for non-crypto
      }

      const updatedAsset = await storage.updatePortfolioAsset(id, userId, updates);
      
      if (!updatedAsset) {
        return res.status(404).json({ 
          error: "Not Found", 
          message: "Portfolio asset not found" 
        });
      }

      res.json(updatedAsset);
    } catch (error: any) {
      console.error("❌ PUT /api/assets/:id failed:", error);
      return res.status(500).json({ 
        error: "Server Error", 
        message: error.message || "Failed to update portfolio asset",
      });
    }
  });

  app.delete("/api/assets/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized", message: "You must be logged in to delete portfolio assets" });
      }
      
      if (!storage) {
        return res.status(500).json({ error: "Server Error", message: "Storage engine is not available" });
      }

      const userId = req.user!.id;
      const { id } = req.params;

      const deleted = await storage.deletePortfolioAsset(id, userId);
      if (!deleted) {
        return res.status(404).json({ 
          error: "Not Found", 
          message: "Portfolio asset not found" 
        });
      }

      res.json({ success: true, message: "Portfolio asset deleted successfully" });
    } catch (error: any) {
      console.error("❌ DELETE /api/assets/:id failed:", error);
      return res.status(500).json({ 
        error: "Server Error", 
        message: error.message || "Failed to delete portfolio asset",
      });
    }
  });

  console.log("✅ GET /api/assets route registered");
  console.log("✅ POST /api/assets route registered");
  console.log("✅ PUT /api/assets/:id route registered");
  console.log("✅ DELETE /api/assets/:id route registered");
  console.log("✅ GET /api/settings route registered");
  console.log("✅ POST /api/settings route registered");
  console.log("✅ All routes registered successfully");
  return httpServer;
}
