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

export const mockStrategies = [
  "SMC (Smart Money Concepts)",
  "ICT (Inner Circle Trader)",
  "Price Action",
  "Break & Retest",
  "Supply & Demand",
  "EMA Crossover",
  "VWAP Reversion",
  "News Trading",
  "Scalping",
  "Swing Trading",
];

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

export const calculateTopStrategyRRRCombos = (trades: Trade[]) => {
  const combos: Record<
    string,
    { total: number; wins: number; strategy: string; rrr: string }
  > = {};

  trades.forEach((trade) => {
    if (
      trade.status !== "Closed" ||
      !trade.strategy ||
      !trade.entryPrice ||
      !trade.slPrice ||
      !trade.tpPrice
    )
      return;

    // Calculate RRR for this specific trade
    const rrr = calculateRRR(
      trade.entryPrice,
      trade.slPrice,
      trade.tpPrice,
      trade.direction,
    );

    // Create a unique key for Strategy + RRR combination
    const key = `${trade.strategy}|${rrr}`;

    if (!combos[key]) {
      combos[key] = { total: 0, wins: 0, strategy: trade.strategy, rrr };
    }

    combos[key].total++;
    if ((trade.pnl || 0) > 0) {
      combos[key].wins++;
    }
  });

  return Object.values(combos)
    .filter((c) => c.total >= 1)
    .map((c) => ({
      name: c.strategy,
      pair: c.rrr, // Using rrr as pair identifier for display
      strategy: c.strategy,
      rrr: c.rrr,
      winrate: c.total > 0 ? (c.wins / c.total) * 100 : 0,
      wins: c.wins,
      total: c.total,
    }))
    .sort((a, b) => b.winrate - a.winrate)
    .slice(0, 5);
};

// === DATA EXPORTS ===
// Note: Mock data has been cleared - all data now comes from the database via API

export const mockTrades: Trade[] = [];

export const mockBacktests: Backtest[] = [];
