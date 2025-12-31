import { MobileNav } from "@/components/layout/MobileNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EquityChart } from "@/components/dashboard/EquityChart";
import { StrategyInsights } from "@/components/dashboard/StrategyInsights";
import { PNLCalendar } from "@/components/dashboard/PNLCalendar";
import { MostProfitableDay } from "@/components/dashboard/MostProfitableDay";
import { TradeTable } from "@/components/journal/TradeTable";
import { mockTrades } from "@/lib/mockData";
import {
  Activity,
  DollarSign,
  TrendingUp,
  BarChart3,
  Briefcase,
  Loader2,
} from "lucide-react";
import generatedImage from "@assets/generated_images/abstract_financial_data_visualization_dark_mode.png";

// NEW IMPORTS FOR THE UPGRADE
import { useQuery } from "@tanstack/react-query";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Account } from "@shared/schema";

export default function Dashboard() {
  // 1. KEEP YOUR EXISTING MOCK DATA LOGIC
  const journalTrades = mockTrades.filter((t) => t.type === "journal");

  // 2. INJECT THE NEW REAL-TIME ACCOUNT ENGINE
  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  // Calculate Total Capital from Real Database
  const totalCapital =
    accounts?.reduce((sum, acc) => sum + Number(acc.initialBalance), 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-7xl">
          {/* === HEADER SECTION === */}
          <header className="mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Dashboard
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Overview of your trading performance.
              </p>
            </div>

            {/* THE NEW BUTTON PLACED HERE */}
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

          {/* === NEW SECTION: TRADING ACCOUNTS === */}
          {/* This shows your FTMO/Justmarket accounts at the top */}
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

          {/* === EXISTING DASHBOARD STATS (Kept Intact) === */}
          <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
            <StatsCard
              title="Total P&L"
              value="$14,250.00"
              change="+12.5%"
              trend="up"
              icon={DollarSign}
            />
            <StatsCard
              title="Win Rate"
              value="68.4%"
              change="+2.1%"
              trend="up"
              icon={Activity}
            />
            <StatsCard
              title="Profit Factor"
              value="2.45"
              change="-0.2"
              trend="down"
              icon={BarChart3}
            />
            <StatsCard
              title="Avg R:R"
              value="1:2.8"
              change="0.0"
              trend="neutral"
              icon={TrendingUp}
            />
          </div>

          {/* === EXISTING CHARTS SECTION (Kept Intact) === */}
          <div className="grid gap-4 md:gap-4 md:grid-cols-7 mb-6 md:mb-8">
            <div className="col-span-2 md:col-span-4 rounded-lg md:rounded-xl border bg-card/50 backdrop-blur-sm p-4 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm md:text-base font-semibold leading-none tracking-tight">
                  Equity Curve
                </h3>
              </div>
              <EquityChart />
            </div>
            <div className="col-span-2 md:col-span-3 rounded-lg md:rounded-xl border bg-card/50 backdrop-blur-sm p-0 overflow-hidden relative min-h-[200px] md:min-h-auto">
              <img
                src={generatedImage}
                alt="Abstract visualization"
                className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-overlay"
              />
              <div className="relative z-10 p-4 md:p-6 flex flex-col justify-end h-full bg-gradient-to-t from-background to-transparent">
                <h3 className="text-base md:text-lg font-bold">
                  Weekly Insight
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground mt-2">
                  Your strategy "Breakout" is outperforming all others this week
                  with a 75% win rate. Consider scaling up.
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
              <TradeTable trades={journalTrades} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
