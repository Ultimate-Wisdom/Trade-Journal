export interface Trade {
  id: string;
  date: string;
  pair: string;
  direction: "Long" | "Short";
  entryPrice: number;
  slPrice: number;
  tpPrice: number;
  slPercent: number;
  tpPercent: number;
  rrr: string;
  exitPrice: number;
  exitType: "SL Hit" | "TP Hit" | "Breakeven";
  pnl: number;
  status: "Win" | "Loss" | "BE";
  strategy: string;
  notes?: string;
  type: "journal" | "backtest";
}

export interface Strategy {
  id: string;
  name: string;
  description?: string;
}

export interface RemovedStrategy {
  name: string;
  removedDate: string;
  removalReason: string;
  winrate: number;
  tradesCount: number;
}

export const mockStrategies: Strategy[] = [
  { id: "1", name: "Breakout", description: "Break of key levels" },
  { id: "2", name: "Reversal", description: "Reversal patterns" },
  { id: "3", name: "Trend Following", description: "Follow the trend" },
  { id: "4", name: "Gap Fill", description: "Gap filling strategy" },
];

export const calculateRRR = (entry: number, sl: number, tp: number, direction: "Long" | "Short"): string => {
  if (direction === "Long") {
    const risk = entry - sl;
    const reward = tp - entry;
    if (risk > 0) {
      const ratio = (reward / risk).toFixed(2);
      return `1:${ratio}`;
    }
  } else {
    const risk = sl - entry;
    const reward = entry - tp;
    if (risk > 0) {
      const ratio = (reward / risk).toFixed(2);
      return `1:${ratio}`;
    }
  }
  return "0:0";
};

export const calculateSLPercent = (entry: number, sl: number, direction: "Long" | "Short"): number => {
  if (direction === "Long") {
    return Math.abs(((sl - entry) / entry) * 100);
  } else {
    return Math.abs(((entry - sl) / entry) * 100);
  }
};

export const calculateTPPercent = (entry: number, tp: number, direction: "Long" | "Short"): number => {
  if (direction === "Long") {
    return Math.abs(((tp - entry) / entry) * 100);
  } else {
    return Math.abs(((entry - tp) / entry) * 100);
  }
};

export const mockTrades: Trade[] = [
  {
    id: "1",
    date: "2025-12-26",
    pair: "EUR/USD",
    direction: "Long",
    entryPrice: 1.052,
    slPrice: 1.045,
    tpPrice: 1.065,
    slPercent: 0.67,
    tpPercent: 1.24,
    rrr: "1:1.85",
    exitPrice: 1.065,
    exitType: "TP Hit",
    pnl: 1200,
    status: "Win",
    strategy: "Breakout",
    type: "journal",
  },
  {
    id: "2",
    date: "2025-12-24",
    pair: "GBP/JPY",
    direction: "Short",
    entryPrice: 182.5,
    slPrice: 184.5,
    tpPrice: 180.5,
    slPercent: 1.1,
    tpPercent: 1.1,
    rrr: "1:1.0",
    exitPrice: 184.5,
    exitType: "SL Hit",
    pnl: -450,
    status: "Loss",
    strategy: "Reversal",
    type: "journal",
  },
  {
    id: "3",
    date: "2025-12-22",
    pair: "BTC/USD",
    direction: "Long",
    entryPrice: 34100,
    slPrice: 33500,
    tpPrice: 35500,
    slPercent: 1.76,
    tpPercent: 4.1,
    rrr: "1:2.33",
    exitPrice: 35500,
    exitType: "TP Hit",
    pnl: 3500,
    status: "Win",
    strategy: "Trend Following",
    type: "journal",
  },
  {
    id: "4",
    date: "2025-12-22",
    pair: "NVDA",
    direction: "Short",
    entryPrice: 420,
    slPrice: 430,
    tpPrice: 410,
    slPercent: 2.38,
    tpPercent: 2.38,
    rrr: "1:1.0",
    exitPrice: 410,
    exitType: "TP Hit",
    pnl: 2000,
    status: "Win",
    strategy: "Gap Fill",
    type: "journal",
  },
  {
    id: "5",
    date: "2025-12-19",
    pair: "EUR/GBP",
    direction: "Long",
    entryPrice: 0.8450,
    slPrice: 0.8400,
    tpPrice: 0.8550,
    slPercent: 0.59,
    tpPercent: 1.18,
    rrr: "1:2.0",
    exitPrice: 0.8550,
    exitType: "TP Hit",
    pnl: 800,
    status: "Win",
    strategy: "Breakout",
    type: "journal",
  },
  {
    id: "6",
    date: "2025-12-19",
    pair: "SPY",
    direction: "Short",
    entryPrice: 580,
    slPrice: 590,
    tpPrice: 570,
    slPercent: 1.72,
    tpPercent: 1.72,
    rrr: "1:1.0",
    exitPrice: 570,
    exitType: "TP Hit",
    pnl: 1500,
    status: "Win",
    strategy: "Reversal",
    type: "journal",
  },
  {
    id: "7",
    date: "2025-12-18",
    pair: "GOLD",
    direction: "Long",
    entryPrice: 2025,
    slPrice: 2010,
    tpPrice: 2055,
    slPercent: 0.74,
    tpPercent: 1.48,
    rrr: "1:2.0",
    exitPrice: 2010,
    exitType: "SL Hit",
    pnl: -300,
    status: "Loss",
    strategy: "Trend Following",
    type: "journal",
  },
  {
    id: "8",
    date: "2025-12-17",
    pair: "AAPL",
    direction: "Long",
    entryPrice: 252,
    slPrice: 248,
    tpPrice: 260,
    slPercent: 1.59,
    tpPercent: 3.17,
    rrr: "1:2.0",
    exitPrice: 260,
    exitType: "TP Hit",
    pnl: 2000,
    status: "Win",
    strategy: "Breakout",
    type: "journal",
  },
  {
    id: "9",
    date: "2025-12-17",
    pair: "MSFT",
    direction: "Short",
    entryPrice: 440,
    slPrice: 450,
    tpPrice: 430,
    slPercent: 2.27,
    tpPercent: 2.27,
    rrr: "1:1.0",
    exitPrice: 430,
    exitType: "TP Hit",
    pnl: 1000,
    status: "Win",
    strategy: "Gap Fill",
    type: "journal",
  },
  {
    id: "10",
    date: "2025-12-16",
    pair: "USD/JPY",
    direction: "Long",
    entryPrice: 148.5,
    slPrice: 147.0,
    tpPrice: 151.0,
    slPercent: 1.01,
    tpPercent: 1.68,
    rrr: "1:1.67",
    exitPrice: 151.0,
    exitType: "TP Hit",
    pnl: 1800,
    status: "Win",
    strategy: "Reversal",
    type: "journal",
  },
];

export const mockBacktests: Trade[] = [
  {
    id: "bt1",
    date: "2023-10-20",
    pair: "BTC/USD",
    direction: "Long",
    entryPrice: 34100,
    slPrice: 33500,
    tpPrice: 35500,
    slPercent: 1.76,
    tpPercent: 4.1,
    rrr: "1:2.33",
    exitPrice: 35500,
    exitType: "TP Hit",
    pnl: 3500,
    status: "Win",
    strategy: "Trend Following",
    type: "backtest",
  },
  {
    id: "bt2",
    date: "2023-10-19",
    pair: "NVDA",
    direction: "Short",
    entryPrice: 420,
    slPrice: 430,
    tpPrice: 410,
    slPercent: 2.38,
    tpPercent: 2.38,
    rrr: "1:1.0",
    exitPrice: 410,
    exitType: "TP Hit",
    pnl: 2000,
    status: "Win",
    strategy: "Gap Fill",
    type: "backtest",
  },
];

export interface StrategyStats {
  name: string;
  total: number;
  wins: number;
  winrate: number;
}

export interface StrategyRRRStats extends StrategyStats {
  rrr: string;
  pair: string;
}

export const calculateStrategyWinrates = (trades: Trade[]): StrategyStats[] => {
  const strategyMap = new Map<string, { total: number; wins: number }>();

  trades.forEach((trade) => {
    const current = strategyMap.get(trade.strategy) || { total: 0, wins: 0 };
    current.total += 1;
    if (trade.status === "Win") {
      current.wins += 1;
    }
    strategyMap.set(trade.strategy, current);
  });

  return Array.from(strategyMap.entries())
    .map(([name, data]) => ({
      name,
      total: data.total,
      wins: data.wins,
      winrate: (data.wins / data.total) * 100,
    }))
    .sort((a, b) => b.winrate - a.winrate);
};

export const calculateTopStrategyRRRCombos = (trades: Trade[], limit: number = 3): StrategyRRRStats[] => {
  const comboMap = new Map<string, { total: number; wins: number; pair: string; rrr: string; strategy: string }>();

  trades.forEach((trade) => {
    const key = `${trade.strategy}|${trade.rrr}|${trade.pair}`;
    const current = comboMap.get(key) || { 
      total: 0, 
      wins: 0, 
      pair: trade.pair, 
      rrr: trade.rrr,
      strategy: trade.strategy 
    };
    current.total += 1;
    if (trade.status === "Win") {
      current.wins += 1;
    }
    comboMap.set(key, current);
  });

  return Array.from(comboMap.values())
    .map((data) => ({
      name: `${data.strategy} @ ${data.rrr}`,
      pair: data.pair,
      rrr: data.rrr,
      total: data.total,
      wins: data.wins,
      winrate: (data.wins / data.total) * 100,
    }))
    .sort((a, b) => b.winrate - a.winrate)
    .slice(0, limit);
};
