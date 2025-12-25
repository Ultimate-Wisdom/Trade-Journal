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
    date: "2023-10-25",
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
    date: "2023-10-24",
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
