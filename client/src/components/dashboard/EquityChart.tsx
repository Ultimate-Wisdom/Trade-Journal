import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Account, Trade as DBTrade } from "@shared/schema";
import { useMemo } from "react";

interface EquityChartProps {
  selectedAccountId?: string | null;
}

export function EquityChart({ selectedAccountId }: EquityChartProps) {
  // Fetch only actual trades (exclude adjustments, deposits, withdrawals)
  // This shows pure trading performance, not account balance changes
  const { data: allTrades } = useQuery<DBTrade[]>({
    queryKey: ["/api/trades"],
    queryFn: async () => {
      const res = await fetch("/api/trades", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch trades");
      return res.json();
    },
  });

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  /**
   * Generate pure trading performance curve
   * Only includes actual trades (TRADE type), excludes deposits, withdrawals, and balance corrections
   */
  const generatePerformanceCurve = (
    trades: DBTrade[],
    initialBalance: number
  ): { date: string; dateFull: Date; equity: number; dailyChange?: number }[] => {
    // Filter to only include actual trades (exclude adjustments, deposits, withdrawals)
    const tradingTrades = trades.filter((trade) => {
      // Only include TRADE type
      if (trade.tradeType && trade.tradeType !== "TRADE") return false;
      // Exclude trades marked to exclude from stats
      if (trade.excludeFromStats === true) return false;
      return true;
    });

    // Sort trades chronologically
    const sortedTrades = [...tradingTrades].sort((a, b) => {
      const dateA = a.entryDate ? new Date(a.entryDate).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.entryDate ? new Date(b.entryDate).getTime() : new Date(b.createdAt).getTime();
      return dateA - dateB;
    });

    // Build pure equity curve by accumulating only trading P&L
    let runningEquity = initialBalance;
    const equityData: { 
      date: string; 
      dateFull: Date;
      equity: number; 
      dailyChange?: number;
    }[] = [];

    // Add starting point
    if (sortedTrades.length > 0) {
      const firstTrade = sortedTrades[0];
      const firstDate = firstTrade.entryDate 
        ? new Date(firstTrade.entryDate) 
        : new Date(firstTrade.createdAt);
      equityData.push({
        date: firstDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dateFull: firstDate,
        equity: initialBalance,
      });
    }

    // Process each trade chronologically - only accumulate P&L from actual trades
    sortedTrades.forEach((trade) => {
      const pnl = trade.pnl ? Number(trade.pnl) : 0;
      const previousEquity = runningEquity;
      runningEquity += pnl; // Only add trading P&L, ignore deposits/withdrawals/corrections

      const tradeDate = trade.entryDate 
        ? new Date(trade.entryDate) 
        : new Date(trade.createdAt);

      equityData.push({
        date: tradeDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dateFull: tradeDate,
        equity: Math.round(runningEquity * 100) / 100, // Round to 2 decimals
        dailyChange: runningEquity - previousEquity,
      });
    });

    // If no trades, show initial balance
    if (equityData.length === 0) {
      const today = new Date();
      equityData.push({
        date: today.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dateFull: today,
        equity: initialBalance,
      });
    }

    return equityData;
  };

  // Calculate pure trading performance curve
  const data = useMemo(() => {
    if (!allTrades || !accounts) return [];

    // Filter trades by selected account if specified
    let relevantTrades = allTrades;
    if (selectedAccountId) {
      relevantTrades = allTrades.filter((t) => t.accountId === selectedAccountId);
    }

    // Get initial balance(s)
    let initialBalance = 0;
    if (selectedAccountId) {
      const account = accounts.find((a) => a.id === selectedAccountId);
      initialBalance = account ? Number(account.initialBalance || 0) : 0;
    } else {
      // Sum all account initial balances
      initialBalance = accounts.reduce((sum, acc) => sum + Number(acc.initialBalance || 0), 0);
    }

    // Generate pure trading performance curve (excludes deposits, withdrawals, corrections)
    return generatePerformanceCurve(relevantTrades, initialBalance);
  }, [allTrades, accounts, selectedAccountId]);

  // Format currency with K/M suffixes
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const equity = data.equity;
      const dailyChange = data.dailyChange || 0;
      const dateFull = data.dateFull || new Date();
      
      // Format date as "Mon, Jan 20"
      const formattedDate = dateFull.toLocaleDateString("en-US", { 
        weekday: "short", 
        month: "short", 
        day: "numeric" 
      });

      return (
        <div className="bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl backdrop-blur-md p-3 min-w-[160px]">
          <p className="text-xs text-slate-400 mb-2 font-medium">{formattedDate}</p>
          <div className="mb-1">
            <p className="text-xs text-slate-500 mb-0.5">Pure Equity</p>
            <p className="text-xl font-bold text-white">
              {formatCurrency(equity)}
            </p>
          </div>
          {dailyChange !== 0 && (
            <p className={`text-sm font-medium ${dailyChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {dailyChange >= 0 ? "+" : ""}{formatCurrency(dailyChange)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#333" 
            vertical={false}
            opacity={0.3}
          />
          <XAxis 
            dataKey="date" 
            stroke="#666" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickCount={5}
            tickMargin={8}
          />
          <YAxis 
            stroke="#666" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCurrency}
            domain={['auto', 'auto']}
            tickMargin={8}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="equity"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorEquity)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}