import { MobileNav } from "@/components/layout/MobileNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EquityChart } from "@/components/dashboard/EquityChart";
import { StrategyInsights } from "@/components/dashboard/StrategyInsights";
import { MostProfitableDay } from "@/components/dashboard/MostProfitableDay";
import { WeeklyInsight } from "@/components/dashboard/WeeklyInsight";
import { TradingBias } from "@/components/dashboard/TradingBias";
import { TradeTable } from "@/components/journal/TradeTable";
import { AccountTree } from "@/components/AccountTree";
import { SessionAnalysis } from "@/components/analytics/SessionAnalysis";
import { AdvancedStatistics } from "@/components/analytics/AdvancedStatistics";
import { PerformanceBenchmark } from "@/components/analytics/PerformanceBenchmark";
import { CorrelationAnalysis } from "@/components/analytics/CorrelationAnalysis";
import {
  Activity,
  DollarSign,
  TrendingUp,
  BarChart3,
  Briefcase,
  Loader2,
  Plus,
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Account, Trade as DBTrade } from "@shared/schema";
import { Trade } from "@/lib/mockData";
import { useMemo, useState } from "react";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import { calculateRRR } from "@/lib/utils";


// Market symbols for Trading Bias selector
const BIAS_SYMBOLS = [
  { value: "EURUSD", label: "EUR/USD" },
  { value: "GBPUSD", label: "GBP/USD" },
  { value: "XAUUSD", label: "Gold" },
  { value: "BTC", label: "Bitcoin" },
  { value: "NAS100", label: "Nasdaq" },
];

export default function Dashboard() {
  const { maskValue } = usePrivacyMode();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedBiasSymbol, setSelectedBiasSymbol] = useState("EURUSD");
  
  // Fetch real accounts and trades
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: dbTrades, isLoading: isLoadingTrades } = useQuery<DBTrade[]>({
    queryKey: ["/api/trades"],
  });

  // Fetch all trades including adjustments for balance calculation
  const { data: allTradesIncludingAdjustments } = useQuery<DBTrade[]>({
    queryKey: ["/api/trades?include_adjustments=true"],
    queryFn: async () => {
      const res = await fetch("/api/trades?include_adjustments=true", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch trades");
      return res.json();
    },
  });

  const isLoading = isLoadingAccounts || isLoadingTrades;

  // Filter trades by selected account and exclude balance corrections
  const filteredTrades = useMemo(() => {
    if (!dbTrades) return [];
    let filtered = dbTrades;
    
    // Filter out balance corrections, deposits, and withdrawals (safety measure - backend should already filter)
    // Only include actual trades (type = "TRADE") for analytics
    filtered = filtered.filter((t) => {
      // Exclude if excludeFromStats is true
      if (t.excludeFromStats === true) return false;
      // Explicitly exclude non-trade types (ADJUSTMENT, DEPOSIT, WITHDRAWAL)
      // Only include TRADE type for analytics calculations
      if (t.tradeType && t.tradeType !== "TRADE") return false;
      return true;
    });
    
    if (selectedAccountId) {
      filtered = filtered.filter((t) => t.accountId === selectedAccountId);
    }
    return filtered;
  }, [dbTrades, selectedAccountId]);

  // Transform database trades to match the expected Trade interface for dashboard components
  // Exclude adjustments from analytics calculations
  const trades = useMemo(() => {
    if (!filteredTrades) return [];
    // Filter out trades excluded from stats (e.g., balance adjustments)
    const analyticsTrades = filteredTrades.filter((t) => !t.excludeFromStats);
    return analyticsTrades.map((t) => ({
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
      date: (() => {
        // Prefer entryDate (user-selected date), fallback to createdAt
        const dateSource = t.entryDate || t.createdAt;
        if (dateSource) {
          const d = new Date(dateSource);
          if (!isNaN(d.getTime())) {
            // Use local date string (not UTC) to avoid timezone issues
            return d.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD in local time
          }
        }
        // Fallback to today's local date
        return new Date().toLocaleDateString('en-CA');
      })(),
      entryDate: t.entryDate ? new Date(t.entryDate).toLocaleDateString('en-CA') : undefined,
      strategy: t.strategy || "",
      setup: t.setup || undefined,
      notes: t.notes || undefined,
      conviction: t.conviction ? Number(t.conviction) : undefined,
      marketRegime: t.marketRegime || undefined,
      rrr: t.rrr || undefined,
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

      // Calculate R:R from entry, stop loss, and take profit (same as Trade Journal)
      const calculatedRR = calculateRRR(
        trade.entryPrice,
        trade.slPrice,
        trade.tpPrice,
        trade.direction
      );
      
      if (calculatedRR !== null) {
        totalRR += calculatedRR;
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

  // Calculate live equity (initial balance + sum of all PnL including adjustments)
  const liveEquity = useMemo(() => {
    if (!allTradesIncludingAdjustments || !accounts) return 0;

    if (selectedAccountId) {
      // Calculate for selected account
      const account = accounts.find((a) => a.id === selectedAccountId);
      if (!account) return 0;

      const initialBalance = Number(account.initialBalance || 0);
      
      // Sum all PnL for this account (including adjustments)
      const accountTrades = allTradesIncludingAdjustments.filter(
        (t) => t.accountId === selectedAccountId
      );
      const totalPnl = accountTrades.reduce((sum, trade) => {
        const pnl = trade.pnl ? Number(trade.pnl) : 0;
        return sum + (isNaN(pnl) ? 0 : pnl);
      }, 0);

      return initialBalance + totalPnl;
    } else {
      // Calculate for all accounts combined
      let totalEquity = 0;

      accounts.forEach((account) => {
        const initialBalance = Number(account.initialBalance || 0);
        
        // Sum all PnL for this account (including adjustments)
        const accountTrades = allTradesIncludingAdjustments.filter(
          (t) => t.accountId === account.id
        );
        const totalPnl = accountTrades.reduce((sum, trade) => {
          const pnl = trade.pnl ? Number(trade.pnl) : 0;
          return sum + (isNaN(pnl) ? 0 : pnl);
        }, 0);

        totalEquity += initialBalance + totalPnl;
      });

      return totalEquity;
    }
  }, [accounts, selectedAccountId, allTradesIncludingAdjustments]);

  const selectedAccount = accounts?.find((a) => a.id === selectedAccountId);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 p-4 md:p-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Account Selector Skeleton */}
        <Skeleton className="h-32 w-full rounded-xl" />

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>

        {/* Charts Section Skeleton */}
        <div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-7">
          <Skeleton className="md:col-span-4 h-[250px] md:h-[400px] rounded-xl" />
          <div className="md:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[300px] rounded-xl" />
            <Skeleton className="h-[300px] rounded-xl" />
          </div>
        </div>

        {/* Bottom Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const journalTrades = trades;

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto p-0 md:p-6 max-w-7xl">
          {/* Header Section */}
          <header className="mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-4 md:px-0">
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
              {/* Symbol Selector for Trading Bias */}
              <div className="flex items-center gap-2">
                <label htmlFor="bias-symbol" className="text-xs text-muted-foreground hidden md:inline">
                  Macro:
                </label>
                <Select value={selectedBiasSymbol} onValueChange={setSelectedBiasSymbol}>
                  <SelectTrigger id="bias-symbol" className="w-[100px] md:w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BIAS_SYMBOLS.map((pair) => (
                      <SelectItem key={pair.value} value={pair.value}>
                        {pair.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden md:block text-right">
                <p className="text-xs text-muted-foreground font-mono">
                  {selectedAccount ? "ACCOUNT BALANCE" : "TOTAL EQUITY"}
                </p>
                <p className="text-lg font-bold text-primary">
                  ${maskValue(liveEquity)}
                </p>
              </div>
              <AddAccountDialog />
            </div>
          </header>

          {/* Account Selector and Tree */}
          <div className="mb-3 md:mb-8 grid gap-3 md:gap-6 md:grid-cols-3">
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
            <div className="md:col-span-2 grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 mb-0 md:mb-8">
            <StatsCard
              title="Total P&L"
              value={`$${maskValue(stats.totalPnl)}`}
              change={stats.totalPnl === 0 ? "0.0%" : "---"}
              trend={stats.pnlTrend as "up" | "down" | "neutral"}
              icon={DollarSign}
              pnlValue={stats.totalPnl}
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
          <div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-7 mb-3 md:mb-8">
            <div className="md:col-span-4 rounded-lg md:rounded-xl border bg-card/50 backdrop-blur-sm p-3 md:p-6 h-[250px] md:h-[400px] flex flex-col overflow-hidden">
              <div className="mb-2 md:mb-4 flex items-center justify-center md:justify-between flex-shrink-0">
                <h3 className="text-sm md:text-base font-semibold leading-none tracking-tight">
                  Equity Curve
                </h3>
              </div>
              <div className="flex-1 min-h-0">
                <EquityChart selectedAccountId={selectedAccountId} />
              </div>
            </div>
            <div className="md:col-span-3">
              {/* UNIFIED COMMANDER CONSOLE (Mobile: Stacked, Desktop: Side-by-Side) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-stretch">
                {/* 1. Global Macro (Market Radar) - Top on Mobile */}
                <div className="w-full h-full">
                  <TradingBias symbol={selectedBiasSymbol} />
                </div>
                {/* 2. Strategic Intelligence (Risk Manager) - Bottom on Mobile */}
                <div className="w-full h-full">
                  <WeeklyInsight trades={journalTrades} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:gap-4 md:grid-cols-1 lg:grid-cols-3 mt-3 md:mt-8">
            <StrategyInsights trades={journalTrades} />
            <AdvancedStatistics trades={journalTrades} />
            <div className="space-y-3 md:space-y-4">
              <CorrelationAnalysis trades={filteredTrades || []} />
              <MostProfitableDay trades={journalTrades} />
            </div>
          </div>

          <div className="grid gap-3 md:gap-4 md:grid-cols-1 lg:grid-cols-3 mt-3 md:mt-8">
            <PerformanceBenchmark trades={journalTrades} />
            <SessionAnalysis trades={filteredTrades || []} />
          </div>

          <div className="space-y-3 md:space-y-4 mt-3 md:mt-8">
            <h3 className="text-base md:text-xl font-semibold tracking-tight">
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