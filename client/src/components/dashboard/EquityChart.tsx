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
  // Fetch all trades including adjustments for balance visualization
  const { data: allTrades } = useQuery<DBTrade[]>({
    queryKey: ["/api/trades?include_adjustments=true"],
    queryFn: async () => {
      const res = await fetch("/api/trades?include_adjustments=true", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch trades");
      return res.json();
    },
  });

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  // Calculate equity curve data
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

    // Sort trades by date (entryDate or createdAt)
    const sortedTrades = [...relevantTrades].sort((a, b) => {
      const dateA = a.entryDate ? new Date(a.entryDate).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.entryDate ? new Date(b.entryDate).getTime() : new Date(b.createdAt).getTime();
      return dateA - dateB;
    });

    // Build equity curve by accumulating P&L over time
    let runningBalance = initialBalance;
    const equityData: { date: string; equity: number }[] = [];

    // Add starting point
    if (sortedTrades.length > 0) {
      const firstTrade = sortedTrades[0];
      const firstDate = firstTrade.entryDate 
        ? new Date(firstTrade.entryDate) 
        : new Date(firstTrade.createdAt);
      equityData.push({
        date: firstDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        equity: initialBalance,
      });
    }

    // Process each trade chronologically
    sortedTrades.forEach((trade) => {
      const pnl = trade.pnl ? Number(trade.pnl) : 0;
      runningBalance += pnl;

      const tradeDate = trade.entryDate 
        ? new Date(trade.entryDate) 
        : new Date(trade.createdAt);

      equityData.push({
        date: tradeDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        equity: Math.round(runningBalance * 100) / 100, // Round to 2 decimals
      });
    });

    // If no trades, show initial balance
    if (equityData.length === 0) {
      equityData.push({
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        equity: initialBalance,
      });
    }

    return equityData;
  }, [allTrades, accounts, selectedAccountId]);
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "hsl(var(--card))", 
              borderColor: "hsl(var(--border))",
              borderRadius: "var(--radius)",
              color: "hsl(var(--foreground))"
            }}
            itemStyle={{ color: "hsl(var(--primary))" }}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorEquity)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}