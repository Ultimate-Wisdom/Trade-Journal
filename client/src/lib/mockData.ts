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
  {
    id: "11",
    date: "2025-12-15",
    pair: "BTC/USD",
    direction: "Long",
    entryPrice: 42300,
    slPrice: 41500,
    tpPrice: 43500,
    slPercent: 1.89,
    tpPercent: 2.84,
    rrr: "1:1.5",
    exitPrice: 43500,
    exitType: "TP Hit",
    pnl: 2600,
    status: "Win",
    strategy: "Breakout",
    type: "journal",
  },
  {
    id: "12",
    date: "2025-12-12",
    pair: "ETH/USD",
    direction: "Short",
    entryPrice: 3200,
    slPrice: 3350,
    tpPrice: 3050,
    slPercent: 4.69,
    tpPercent: 4.69,
    rrr: "1:1.0",
    exitPrice: 3050,
    exitType: "TP Hit",
    pnl: 1200,
    status: "Win",
    strategy: "Gap Fill",
    type: "journal",
  },
  {
    id: "13",
    date: "2025-12-11",
    pair: "GBP/USD",
    direction: "Long",
    entryPrice: 1.2750,
    slPrice: 1.2700,
    tpPrice: 1.2850,
    slPercent: 0.39,
    tpPercent: 0.78,
    rrr: "1:2.0",
    exitPrice: 1.2700,
    exitType: "SL Hit",
    pnl: -250,
    status: "Loss",
    strategy: "Trend Following",
    type: "journal",
  },
  {
    id: "14",
    date: "2025-12-10",
    pair: "SPY",
    direction: "Long",
    entryPrice: 595,
    slPrice: 590,
    tpPrice: 605,
    slPercent: 0.84,
    tpPercent: 1.68,
    rrr: "1:2.0",
    exitPrice: 605,
    exitType: "TP Hit",
    pnl: 1000,
    status: "Win",
    strategy: "Breakout",
    type: "journal",
  },
  {
    id: "15",
    date: "2025-11-28",
    pair: "QQQ",
    direction: "Long",
    entryPrice: 520,
    slPrice: 515,
    tpPrice: 530,
    slPercent: 0.96,
    tpPercent: 1.92,
    rrr: "1:2.0",
    exitPrice: 530,
    exitType: "TP Hit",
    pnl: 1300,
    status: "Win",
    strategy: "Reversal",
    type: "journal",
  },
  {
    id: "16",
    date: "2025-11-25",
    pair: "AUD/USD",
    direction: "Short",
    entryPrice: 0.6750,
    slPrice: 0.6850,
    tpPrice: 0.6650,
    slPercent: 1.48,
    tpPercent: 1.48,
    rrr: "1:1.0",
    exitPrice: 0.6650,
    exitType: "TP Hit",
    pnl: 850,
    status: "Win",
    strategy: "Gap Fill",
    type: "journal",
  },
  {
    id: "17",
    date: "2025-11-24",
    pair: "EUR/USD",
    direction: "Short",
    entryPrice: 1.0950,
    slPrice: 1.1050,
    tpPrice: 1.0850,
    slPercent: 0.91,
    tpPercent: 0.91,
    rrr: "1:1.0",
    exitPrice: 1.0850,
    exitType: "TP Hit",
    pnl: 2200,
    status: "Win",
    strategy: "Breakout",
    type: "journal",
  },
  {
    id: "18",
    date: "2025-11-21",
    pair: "AAPL",
    direction: "Short",
    entryPrice: 240,
    slPrice: 245,
    tpPrice: 235,
    slPercent: 2.08,
    tpPercent: 2.08,
    rrr: "1:1.0",
    exitPrice: 235,
    exitType: "TP Hit",
    pnl: 1500,
    status: "Win",
    strategy: "Trend Following",
    type: "journal",
  },
  {
    id: "19",
    date: "2025-11-20",
    pair: "BTC/USD",
    direction: "Short",
    entryPrice: 45000,
    slPrice: 47000,
    tpPrice: 43000,
    slPercent: 4.44,
    tpPercent: 4.44,
    rrr: "1:1.0",
    exitPrice: 43000,
    exitType: "TP Hit",
    pnl: 3500,
    status: "Win",
    strategy: "Reversal",
    type: "journal",
  },
  {
    id: "20",
    date: "2025-11-18",
    pair: "GOLD",
    direction: "Long",
    entryPrice: 2100,
    slPrice: 2085,
    tpPrice: 2130,
    slPercent: 0.71,
    tpPercent: 1.43,
    rrr: "1:2.0",
    exitPrice: 2130,
    exitType: "TP Hit",
    pnl: 1200,
    status: "Win",
    strategy: "Gap Fill",
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
