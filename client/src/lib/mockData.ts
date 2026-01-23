export interface Trade {
  id: string;
  pair: string;
  type: "Forex" | "Crypto" | "Stocks" | "Indices";
  direction: "Long" | "Short";
  entryPrice: number;
  exitPrice?: number;
  slPrice?: number;
  tpPrice?: number;
  quantity: number;
  pnl?: number;
  status: "Open" | "Closed" | "Pending";
  date: string;
  strategy: string;
  setup?: string;
  notes?: string;
  conviction?: number;
  marketRegime?: string;
  psychologyTags?: string[];
  executionMistakes?: string[];
  // Allowing dynamic properties to prevent typescript errors in UI
  [key: string]: any;
}

export interface Backtest {
  id: string;
  date: string;
  pair: string;
  strategy: string;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  pnl: number;
  notes: string;
}

export interface RemovedStrategy {
  name: string;
  removedDate: string;
  removalReason: string;
  winrate: number;
  tradesCount: number;
}

export const mockStrategies: string[] = [];

// === CALCULATOR FUNCTIONS ===

export const calculateRRR = (
  entry: number,
  sl: number,
  tp: number,
  direction: "Long" | "Short" = "Long",
) => {
  if (!entry || !sl || !tp) return "0:0";

  // Validate: Logic depends on direction
  if (direction === "Long") {
    if (sl >= entry) return "Invalid SL"; // SL must be lower
    if (tp <= entry) return "Invalid TP"; // TP must be higher
  } else {
    // Short
    if (sl <= entry) return "Invalid SL"; // SL must be higher
    if (tp >= entry) return "Invalid TP"; // TP must be lower
  }

  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);

  if (risk === 0) return "0:0";

  const ratio = reward / risk;
  return `1:${ratio.toFixed(2)}`;
};

export const calculateSLPercent = (
  entry: number,
  sl: number,
  direction: "Long" | "Short" = "Long",
) => {
  if (!entry || !sl) return "0";

  // Validate Logic
  if (direction === "Long" && sl > entry) return "Invalid";
  if (direction === "Short" && sl < entry) return "Invalid";

  const diff = Math.abs(entry - sl);
  const percent = (diff / entry) * 100;
  // Returning just the number string. The UI handles the "%" symbol.
  return percent.toFixed(2);
};

export const calculateTPPercent = (
  entry: number,
  tp: number,
  direction: "Long" | "Short" = "Long",
) => {
  if (!entry || !tp) return "0";

  // Validate Logic
  if (direction === "Long" && tp < entry) return "Invalid";
  if (direction === "Short" && tp > entry) return "Invalid";

  const diff = Math.abs(entry - tp);
  const percent = (diff / entry) * 100;
  // Returning just the number string. The UI handles the "%" symbol.
  return percent.toFixed(2);
};

// === DASHBOARD ANALYTICS FUNCTIONS ===

export const calculateStrategyWinrates = (trades: Trade[]) => {
  const strategyStats: Record<string, { total: number; wins: number }> = {};

  trades.forEach((trade) => {
    if (!trade.strategy) return;

    if (!strategyStats[trade.strategy]) {
      strategyStats[trade.strategy] = { total: 0, wins: 0 };
    }

    // Only count closed trades for winrate
    if (trade.status === "Closed") {
      strategyStats[trade.strategy].total++;
      if ((trade.pnl || 0) > 0) {
        strategyStats[trade.strategy].wins++;
      }
    }
  });

  return Object.entries(strategyStats)
    .map(([name, stats]) => ({
      name,
      winrate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
      wins: stats.wins,
      total: stats.total,
    }))
    .sort((a, b) => b.winrate - a.winrate);
};

/**
 * Parse RRR string (e.g., "1:2.0") to numeric value (e.g., 2.0)
 */
function parseRRRString(rrrString: string): number | null {
  if (!rrrString || typeof rrrString !== 'string') return null;
  
  // Check if it contains a colon (e.g., "1:2.0")
  if (rrrString.includes(':')) {
    const parts = rrrString.split(':');
    if (parts.length >= 2) {
      const parsed = parseFloat(parts[1].trim());
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
  } else {
    // Try to parse as a plain number string
    const parsed = parseFloat(rrrString);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  
  return null;
}

export const calculateTopStrategyRRRCombos = (trades: Trade[]) => {
  // Group trades by strategy name
  const strategyMap: Record<
    string,
    {
      total: number;
      wins: number;
      totalPnl: number;
      rrrValues: number[]; // Store numeric RRR values for averaging
    }
  > = {};

  trades.forEach((trade) => {
    // Only process closed trades with strategy and required price data
    if (
      trade.status !== "Closed" ||
      !trade.strategy ||
      !trade.entryPrice ||
      !trade.slPrice ||
      !trade.tpPrice
    )
      return;

    const strategyName = trade.strategy.trim();
    
    // Initialize strategy entry if it doesn't exist
    if (!strategyMap[strategyName]) {
      strategyMap[strategyName] = {
        total: 0,
        wins: 0,
        totalPnl: 0,
        rrrValues: [],
      };
    }

    // Calculate RRR for this trade
    const rrrString = calculateRRR(
      trade.entryPrice,
      trade.slPrice,
      trade.tpPrice,
      trade.direction,
    );

    // Parse RRR string to numeric value
    const rrrValue = parseRRRString(rrrString);
    if (rrrValue !== null) {
      strategyMap[strategyName].rrrValues.push(rrrValue);
    }

    // Update stats
    strategyMap[strategyName].total++;
    const pnl = Number(trade.pnl || 0);
    strategyMap[strategyName].totalPnl += pnl;
    if (pnl > 0) {
      strategyMap[strategyName].wins++;
    }
  });

  // Convert to array and calculate aggregate stats
  const strategies = Object.entries(strategyMap)
    .map(([strategyName, data]) => {
      const winrate = data.total > 0 ? (data.wins / data.total) * 100 : 0;
      const avgRRR = data.rrrValues.length > 0
        ? data.rrrValues.reduce((sum, val) => sum + val, 0) / data.rrrValues.length
        : 0;
      
      // Format RRR back to "1:X.X" string for display
      const rrrDisplay = avgRRR > 0 ? `1:${avgRRR.toFixed(1)}` : "N/A";

      return {
        name: strategyName,
        pair: rrrDisplay, // For backward compatibility
        strategy: strategyName,
        rrr: rrrDisplay,
        winrate,
        wins: data.wins,
        total: data.total,
        totalPnl: data.totalPnl,
        avgRRR, // Store numeric value for sorting
      };
    })
    .filter((s) => s.total >= 1) // Only strategies with at least 1 trade
    .sort((a, b) => {
      // Primary sort: Win Rate (descending)
      if (b.winrate !== a.winrate) {
        return b.winrate - a.winrate;
      }
      // Secondary sort: Average RRR (descending)
      return b.avgRRR - a.avgRRR;
    })
    .slice(0, 3); // Top 3 strategies

  return strategies;
};

// === DATA EXPORTS ===
// Note: Mock data has been cleared - all data now comes from the database via API

export const mockTrades: Trade[] = [];

export const mockBacktests: Backtest[] = [];
