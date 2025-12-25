import { MobileNav } from "@/components/layout/MobileNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EquityChart } from "@/components/dashboard/EquityChart";
import { StrategyInsights } from "@/components/dashboard/StrategyInsights";
import { TradeTable } from "@/components/journal/TradeTable";
import { mockTrades } from "@/lib/mockData";
import { Activity, DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import generatedImage from "@assets/generated_images/abstract_financial_data_visualization_dark_mode.png";

export default function Dashboard() {
  const journalTrades = mockTrades.filter((t) => t.type === "journal");

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-7xl">
          <header className="mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">Overview of your trading performance.</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground font-mono">LAST UPDATED: 14:32:01 UTC</span>
            </div>
          </header>

          <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
            <StatsCard title="Total P&L" value="$14,250.00" change="+12.5%" trend="up" icon={DollarSign} />
            <StatsCard title="Win Rate" value="68.4%" change="+2.1%" trend="up" icon={Activity} />
            <StatsCard title="Profit Factor" value="2.45" change="-0.2" trend="down" icon={BarChart3} />
            <StatsCard title="Avg R:R" value="1:2.8" change="0.0" trend="neutral" icon={TrendingUp} />
          </div>

          <div className="grid gap-4 md:gap-4 md:grid-cols-7 mb-6 md:mb-8">
            <div className="col-span-2 md:col-span-4 rounded-lg md:rounded-xl border bg-card/50 backdrop-blur-sm p-4 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm md:text-base font-semibold leading-none tracking-tight">Equity Curve</h3>
              </div>
              <EquityChart />
            </div>
            <div className="col-span-2 md:col-span-3 rounded-lg md:rounded-xl border bg-card/50 backdrop-blur-sm p-0 overflow-hidden relative min-h-[200px] md:min-h-auto">
              <img src={generatedImage} alt="Abstract visualization" className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-overlay" />
              <div className="relative z-10 p-4 md:p-6 flex flex-col justify-end h-full bg-gradient-to-t from-background to-transparent">
                <h3 className="text-base md:text-lg font-bold">Weekly Insight</h3>
                <p className="text-xs md:text-sm text-muted-foreground mt-2">Your strategy "Breakout" is outperforming all others this week with a 75% win rate. Consider scaling up.</p>
              </div>
            </div>
          </div>

          <StrategyInsights trades={journalTrades} />

          <div className="space-y-4 mt-6 md:mt-8">
            <h3 className="text-lg md:text-xl font-semibold tracking-tight">Recent Trades</h3>
            <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
              <TradeTable trades={journalTrades} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
