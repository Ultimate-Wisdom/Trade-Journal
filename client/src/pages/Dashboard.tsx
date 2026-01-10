import { MobileNav } from "@/components/layout/MobileNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EquityChart } from "@/components/dashboard/EquityChart";
import { StrategyInsights } from "@/components/dashboard/StrategyInsights";
import { PNLCalendar } from "@/components/dashboard/PNLCalendar";
import { MostProfitableDay } from "@/components/dashboard/MostProfitableDay";
import { TradeTable } from "@/components/journal/TradeTable";
import {
  Activity,
  DollarSign,
  TrendingUp,
  BarChart3,
  Briefcase,
  Loader2,
} from "lucide-react";
import generatedImage from "@assets/generated_images/abstract_financial_data_visualization_dark_mode.png";

import { useQuery } from "@tanstack/react-query";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Account, Trade as DBTrade } from "@shared/schema";
import { Trade } from "@/lib/mockData";
import { useMemo } from "react";

export default function Dashboard() {
  // Fetch real accounts and trades
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: dbTrades, isLoading: isLoadingTrades } = useQuery<DBTrade[]>({
    queryKey: ["/api/trades"],
  });

  const isLoading = isLoadingAccounts || isLoadingTrades;

  // Transform database trades to match the expected Trade interface for dashboard components
  const trades = useMemo(() => {
    if (!dbTrades) return [];
    return dbTrades.map((t) => ({
      id: String(t.id),
      pair: t.symbol || "UNKNOWN",
      type: "Forex" as const, // Default type, can be enhanced later
      direction: t.direction as "Long" | "Short",
      entryPrice: Number(t.entryPrice) || 0,
      exitPrice: t.exitPrice ? Number(t.exitPrice) : undefined,
      slPrice: t.stopLoss ? Number(t.stopLoss) : undefined,
      tpPrice: t.takeProfit ? Number(t.takeProfit) : undefined,
      quantity: Number(t.quantity) || 0,
      pnl: t.pnl ? Number(t.pnl) : undefined,
      status: (t.status || "Open") as "Open" | "Closed" | "Pending",
      date: t.createdAt
        ? new Date(t.createdAt).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      strategy: t.strategy || "",
      setup: t.setup || undefined,
      notes: t.notes || undefined,
      conviction: t.conviction ? Number(t.conviction) : undefined,
      marketRegime: t.marketRegime || undefined,
    })) as Trade[];
  }, [dbTrades]);

  // Calculate real stats from trades
  const stats = useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        totalPnl: 0,
        winRate: 0,
        profitFactor: 0,
        avgRR: 0,
        winRateTrend: "neutral",
        pnlTrend: "neutral"
      };
    }

    let totalPnl = 0;
    let wins = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let totalRR = 0;
    let rrCount = 0;

    trades.forEach(trade => {
      // Handle null pnl values
      const pnl = Number(trade.pnl || 0);
      totalPnl += pnl;
      
      if (pnl > 0) {
        wins++;
        grossProfit += pnl;
      } else if (pnl < 0) {
        grossLoss += Math.abs(pnl);
      }

      // Calculate RR if available (rrr = Risk:Reward Ratio)
      if (trade.rrr) {
        totalRR += Number(trade.rrr);
        rrCount++;
      }
    });

    const winRate = (wins / trades.length) * 100;
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;
    const avgRR = rrCount > 0 ? totalRR / rrCount : 0;

    return {
      totalPnl,
      winRate,
      profitFactor,
      avgRR,
      winRateTrend: winRate > 50 ? "up" : "down",
      pnlTrend: totalPnl >= 0 ? "up" : "down"
    };
  }, [trades]);

  // Calculate total capital from accounts
  const totalCapital =
    accounts?.reduce((sum, acc) => sum + Number(acc.initialBalance || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const journalTrades = trades;

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-7xl">
          {/* Header Section */}
          <header className="mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Dashboard
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Overview of your trading performance.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <p className="text-xs text-muted-foreground font-mono">
                  TOTAL CAPITAL
                </p>
                <p className="text-lg font-bold text-primary">
                  ${totalCapital.toLocaleString()}
                </p>
              </div>
              <AddAccountDialog />
            </div>
          </header>

          {/* Accounts Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Your Accounts
            </h2>

            {accounts?.length === 0 ? (
              <div className="border border-dashed rounded-lg p-6 text-center bg-card/30">
                <p className="text-sm text-muted-foreground mb-2">
                  No trading accounts linked yet.
                </p>
                <p className="text-xs text-muted-foreground">
                  Click "Add Account" above to start.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {accounts?.map((account) => (
                  <Card
                    key={account.id}
                    className="bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors cursor-pointer border-l-4 border-l-primary"
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium truncate">
                        {account.name}
                      </CardTitle>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                        ${
                          account.type === "Prop"
                            ? "bg-blue-500/10 text-blue-500"
                            : account.type === "Live"
                              ? "bg-green-500/10 text-green-500"
                              : "bg-gray-500/10 text-gray-500"
                        }`}
                      >
                        {account.type}
                      </span>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ${Number(account.initialBalance).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Initial Balance
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Stats Section */}
          <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
            <StatsCard
              title="Total P&L"
              value={`$${stats.totalPnl.toFixed(2)}`}
              change={stats.totalPnl === 0 ? "0.0%" : "---"}
              trend={stats.pnlTrend as "up" | "down" | "neutral"}
              icon={DollarSign}
            />
            <StatsCard
              title="Win Rate"
              value={`${stats.winRate.toFixed(1)}%`}
              change={stats.winRate === 0 ? "0.0%" : "---"}
              trend={stats.winRateTrend as "up" | "down" | "neutral"}
              icon={Activity}
            />
            <StatsCard
              title="Profit Factor"
              value={stats.profitFactor.toFixed(2)}
              change="---"
              trend="neutral"
              icon={BarChart3}
            />
            <StatsCard
              title="Avg R:R"
              value={stats.avgRR > 0 ? `1:${stats.avgRR.toFixed(1)}` : "N/A"}
              change="---"
              trend="neutral"
              icon={TrendingUp}
            />
          </div>

          {/* Charts Section */}
          <div className="grid gap-4 md:gap-4 md:grid-cols-7 mb-6 md:mb-8">
            <div className="col-span-2 md:col-span-4 rounded-lg md:rounded-xl border bg-card/50 backdrop-blur-sm p-4 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm md:text-base font-semibold leading-none tracking-tight">
                  Equity Curve
                </h3>
              </div>
              <EquityChart />
            </div>
            <div className="col-span-2 md:col-span-3 rounded-lg md:rounded-xl border bg-card/50 backdrop-blur-sm p-0 overflow-hidden relative min-h-[160px]">
              <img
                src={generatedImage}
                alt="Abstract visualization"
                className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-overlay"
              />
              <div className="relative z-10 p-4 md:p-6 flex flex-col justify-end h-full">
                <h3 className="text-base md:text-lg font-bold">
                  Weekly Insight
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-prose">
                  {journalTrades.length > 0 
                    ? "Keep logging trades to generate AI insights." 
                    : "Welcome to OPES. Log your first trade to unlock insights."}
                </p>
              </div>
            </div>
          </div>

          <StrategyInsights trades={journalTrades} />

          <div className="grid gap-6 md:gap-4 md:grid-cols-3 mt-6 md:mt-8">
            <div className="md:col-span-2">
              <PNLCalendar trades={journalTrades} />
            </div>
            <MostProfitableDay trades={journalTrades} />
          </div>

          <div className="space-y-4 mt-6 md:mt-8">
            <h3 className="text-lg md:text-xl font-semibold tracking-tight">
              Recent Trades
            </h3>
            <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
              <TradeTable 
                trades={(dbTrades || []).slice(0, 5)} 
                showAccount={true} 
                showRRR={true} 
                showRisk={true} 
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}