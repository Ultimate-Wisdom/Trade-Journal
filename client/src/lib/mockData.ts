export interface Trade {
  id: string;
  date: string;
  pair: string;
  direction: "Long" | "Short";
  entry: number;
  exit: number;
  size: number;
  pnl: number;
  status: "Win" | "Loss" | "BE";
  strategy: string;
}

export const mockTrades: Trade[] = [
  { id: "1", date: "2023-10-25", pair: "EUR/USD", direction: "Long", entry: 1.0520, exit: 1.0580, size: 2.0, pnl: 1200, status: "Win", strategy: "Breakout" },
  { id: "2", date: "2023-10-24", pair: "GBP/JPY", direction: "Short", entry: 182.50, exit: 182.80, size: 1.5, pnl: -450, status: "Loss", strategy: "Reversal" },
  { id: "3", date: "2023-10-23", pair: "BTC/USD", direction: "Long", entry: 34100, exit: 35200, size: 0.5, pnl: 550, status: "Win", strategy: "Trend" },
  { id: "4", date: "2023-10-22", pair: "NVDA", direction: "Short", entry: 420.00, exit: 415.00, size: 100, pnl: 500, status: "Win", strategy: "Gap Fill" },
  { id: "5", date: "2023-10-21", pair: "XAU/USD", direction: "Long", entry: 1980.50, exit: 1975.00, size: 1.0, pnl: -550, status: "Loss", strategy: "Breakout" },
];