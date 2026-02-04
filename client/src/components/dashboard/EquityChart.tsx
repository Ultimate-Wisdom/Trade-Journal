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
import { useMemo, useRef, useEffect } from "react";

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
  const rawData = useMemo(() => {
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

  // Enrich data with daily PnL calculations
  const data = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    return rawData.map((point, index) => {
      // Calculate daily PnL relative to previous point
      const dailyPnL = index === 0 
        ? 0 
        : point.equity - rawData[index - 1].equity;

      return {
        ...point,
        dailyPnL: Math.round(dailyPnL * 100) / 100, // Round to 2 decimals
      };
    });
  }, [rawData]);

  // Format currency with K/M suffixes
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Custom tooltip component - dark, minimal, premium with Daily PnL
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const equity = data.equity;
      const dailyPnL = data.dailyPnL || 0;
      const dateFull = data.dateFull || new Date();
      
      // Format date as "Mon, Jan 20"
      const formattedDate = dateFull.toLocaleDateString("en-US", { 
        weekday: "short", 
        month: "short", 
        day: "numeric" 
      });

      // Format daily PnL with sign
      const formatDailyPnL = (value: number): string => {
        const sign = value >= 0 ? "+" : "";
        return `${sign}${formatCurrency(value)}`;
      };

      return (
        <div className="bg-black/90 border border-slate-800/50 rounded-md shadow-2xl backdrop-blur-sm p-2.5 min-w-[140px]">
          {/* Date Row */}
          <p className="text-[10px] text-slate-500 mb-1.5 font-mono">{formattedDate}</p>
          
          {/* Equity Row */}
          <p className="text-lg font-bold text-white font-mono tracking-tight mb-1.5">
            {formatCurrency(equity)}
          </p>
          
          {/* Separator Line */}
          <div className="border-t border-slate-700/50 my-1.5"></div>
          
          {/* Daily Change Row */}
          <p className={`text-sm font-medium font-mono ${
            dailyPnL >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}>
            {formatDailyPnL(dailyPnL)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Use ref to track previous tick value across renders
  const previousTickRef = useRef<string | null>(null);
  
  // Reset ref when data changes
  useEffect(() => {
    previousTickRef.current = null;
  }, [data]);
  
  // Custom tick formatter to hide duplicate dates
  const formatXAxisTick = (tickItem: string) => {
    // If this is the same as the previous tick, return empty string
    if (tickItem === previousTickRef.current) {
      return "";
    }
    
    // Update previous tick and return the formatted value
    previousTickRef.current = tickItem;
    return tickItem;
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            {/* Premium gradient fill */}
            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
            {/* Glow effect filter for neon light appearance */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {/* Subtle dashed grid lines */}
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#666" 
            vertical={false}
            opacity={0.1}
          />
          <XAxis 
            dataKey="date" 
            stroke="#666" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickCount={5}
            tickMargin={8}
            interval="preserveStartEnd"
            tickFormatter={formatXAxisTick}
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
            stroke="#3B82F6"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorEquity)"
            filter="url(#glow)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}