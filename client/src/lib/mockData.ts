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
      winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
      totalTrades: stats.total,
    }))
    .sort((a, b) => b.winRate - a.winRate);
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
      strategy: c.strategy,
      rrr: c.rrr,
      winRate: c.total > 0 ? (c.wins / c.total) * 100 : 0,
      totalTrades: c.total,
    }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 5);
};

// === DATA EXPORTS ===

export const mockTrades: Trade[] = [
  {
    id: "1",
    pair: "EUR/USD",
    type: "Forex",
    direction: "Long",
    entryPrice: 1.085,
    exitPrice: 1.089,
    slPrice: 1.083,
    tpPrice: 1.089,
    quantity: 1,
    pnl: 400,
    status: "Closed",
    date: "2023-10-25",
    strategy: "SMC (Smart Money Concepts)",
    setup: "Change of Character after liquidity sweep",
    conviction: 5,
    marketRegime: "Clear Uptrend",
    psychologyTags: ["Patience", "Discipline"],
    executionMistakes: [],
  },
  {
    id: "2",
    pair: "BTC/USD",
    type: "Crypto",
    direction: "Short",
    entryPrice: 34500,
    slPrice: 35000,
    tpPrice: 33000,
    quantity: 0.1,
    pnl: 0,
    status: "Open",
    date: "2023-10-26",
    strategy: "Break & Retest",
    setup: "Bearish flag breakdown",
    conviction: 3,
    marketRegime: "Sideways",
    psychologyTags: [],
    executionMistakes: ["Late Entry"],
  },
  {
    id: "3",
    pair: "NVDA",
    type: "Stocks",
    direction: "Long",
    entryPrice: 420.5,
    exitPrice: 415.0,
    slPrice: 410.0,
    tpPrice: 450.0,
    quantity: 10,
    pnl: -55,
    status: "Closed",
    date: "2023-10-24",
    strategy: "Supply & Demand",
    setup: "Demand zone bounce",
    conviction: 4,
    marketRegime: "Volatile",
    psychologyTags: ["FOMO"],
    executionMistakes: ["Early Exit"],
  },
];

export const mockBacktests: Backtest[] = [
  {
    id: "1",
    date: "2023-10-20",
    pair: "EUR/USD",
    strategy: "SMC (Smart Money Concepts)",
    winRate: 65,
    profitFactor: 2.1,
    totalTrades: 50,
    pnl: 1200,
    notes: "Tested on 15m timeframe, 2023 data",
  },
  {
    id: "2",
    date: "2023-10-22",
    pair: "BTC/USD",
    strategy: "Break & Retest",
    winRate: 45,
    profitFactor: 1.5,
    totalTrades: 30,
    pnl: 500,
    notes: "Tested on 4H timeframe, volatilty adjusted",
  },
];
