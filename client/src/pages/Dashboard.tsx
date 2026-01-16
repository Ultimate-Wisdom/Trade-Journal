import { MobileNav } from "@/components/layout/MobileNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EquityChart } from "@/components/dashboard/EquityChart";
import { StrategyInsights } from "@/components/dashboard/StrategyInsights";
import { PNLCalendar } from "@/components/dashboard/PNLCalendar";
import { MostProfitableDay } from "@/components/dashboard/MostProfitableDay";
import { TradeTable } from "@/components/journal/TradeTable";
import { AccountTree } from "@/components/AccountTree";
import { SessionAnalysis } from "@/components/analytics/SessionAnalysis";
import { AdvancedStatistics } from "@/components/analytics/AdvancedStatistics";
import { PerformanceBenchmark } from "@/components/analytics/PerformanceBenchmark";
import { CorrelationAnalysis } from "@/components/analytics/CorrelationAnalysis";
import { MultitimeframeAnalysis } from "@/components/analytics/MultitimeframeAnalysis";
import {
  Activity,
  DollarSign,
  TrendingUp,
  BarChart3,
  Briefcase,
  Loader2,
  Plus,
} from "lucide-react";
import generatedImage from "@assets/generated_images/abstract_financial_data_visualization_dark_mode.png";

import { useQuery } from "@tanstack/react-query";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Account, Trade as DBTrade } from "@shared/schema";
import { Trade } from "@/lib/mockData";
import { useMemo, useState } from "react";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";

export default function Dashboard() {
  const { maskValue } = usePrivacyMode();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  
  // Fetch real accounts and trades
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: dbTrades, isLoading: isLoadingTrades } = useQuery<DBTrade[]>({
    queryKey: ["/api/trades"],
  });

  const isLoading = isLoadingAccounts || isLoadingTrades;

  // Filter trades by selected account
  const filteredTrades = useMemo(() => {
    if (!dbTrades) return [];
    if (!selectedAccountId) return dbTrades; // Show all trades if no account selected
    return dbTrades.filter((t) => t.accountId === selectedAccountId);
  }, [dbTrades, selectedAccountId]);

  // Transform database trades to match the expected Trade interface for dashboard components
  const trades = useMemo(() => {
    if (!filteredTrades) return [];
    return filteredTrades.map((t) => ({
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
  }, [filteredTrades]);

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

  // Calculate total capital from selected account or all accounts
  const totalCapital = useMemo(() => {
    if (selectedAccountId) {
      const account = accounts?.find((a) => a.id === selectedAccountId);
      return account ? Number(account.initialBalance || 0) : 0;
    }
    return accounts?.reduce((sum, acc) => sum + Number(acc.initialBalance || 0), 0) || 0;
  }, [accounts, selectedAccountId]);

  const selectedAccount = accounts?.find((a) => a.id === selectedAccountId);

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
                {selectedAccount
                  ? `Performance for ${selectedAccount.name}`
                  : "Overview of your trading performance."}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <p className="text-xs text-muted-foreground font-mono">
                  {selectedAccount ? "ACCOUNT BALANCE" : "TOTAL CAPITAL"}
                </p>
                <p className="text-lg font-bold text-primary">
                  ${maskValue(totalCapital)}
                </p>
              </div>
              <AddAccountDialog />
            </div>
          </header>

          {/* Account Selector and Tree */}
          <div className="mb-8 grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1 border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Accounts
                  </CardTitle>
                  <AddAccountDialog
                    trigger={
                      <Button variant="outline" size="icon" className="h-8 w-8 border-primary/20 hover:border-primary/40 hover:bg-primary/10">
                        <Plus className="h-4 w-4 text-primary" />
                      </Button>
                    }
                  />
                </div>
              </CardHeader>
              <CardContent>
                {/* Account Tree */}
                {accounts && accounts.length > 0 ? (
                  <AccountTree
                    accounts={accounts}
                    selectedAccountId={selectedAccountId}
                    onSelectAccount={setSelectedAccountId}
                  />
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                    No accounts found. Add one to get started.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats Section */}
            <div className="md:col-span-2 grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
            <StatsCard
              title="Total P&L"
              value={`$${maskValue(stats.totalPnl)}`}
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

          <div className="grid gap-6 md:gap-4 md:grid-cols-1 lg:grid-cols-3 mt-6 md:mt-8">
            <StrategyInsights trades={journalTrades} />
            <AdvancedStatistics trades={filteredTrades || []} />
            <CorrelationAnalysis trades={filteredTrades || []} />
          </div>

          <div className="grid gap-6 md:gap-4 md:grid-cols-1 lg:grid-cols-3 mt-6 md:mt-8">
            <div className="lg:col-span-2 space-y-4">
              <PNLCalendar trades={journalTrades} />
              <MultitimeframeAnalysis trades={filteredTrades || []} />
            </div>
            <div className="space-y-4">
              <MostProfitableDay trades={journalTrades} />
              <PerformanceBenchmark trades={filteredTrades || []} />
              <SessionAnalysis trades={filteredTrades || []} />
            </div>
          </div>

          <div className="space-y-4 mt-6 md:mt-8">
            <h3 className="text-lg md:text-xl font-semibold tracking-tight">
              Recent Trades
            </h3>
            <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
              <TradeTable 
                trades={(filteredTrades || []).slice(0, 5)} 
                showAccount={!selectedAccountId} 
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