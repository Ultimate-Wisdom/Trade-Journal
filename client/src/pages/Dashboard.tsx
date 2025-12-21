import { Sidebar } from "@/components/layout/Sidebar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EquityChart } from "@/components/dashboard/EquityChart";
import { TradeTable } from "@/components/journal/TradeTable";
import { mockTrades } from "@/lib/mockData";
import { Activity, DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import generatedImage from "@assets/generated_images/abstract_financial_data_visualization_dark_mode.png";

export default function Dashboard() {
  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-8 max-w-7xl">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Overview of your trading performance.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">LAST UPDATED: 14:32:01 UTC</span>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatsCard title="Total P&L" value="$14,250.00" change="+12.5%" trend="up" icon={DollarSign} />
            <StatsCard title="Win Rate" value="68.4%" change="+2.1%" trend="up" icon={Activity} />
            <StatsCard title="Profit Factor" value="2.45" change="-0.2" trend="down" icon={BarChart3} />
            <StatsCard title="Avg R:R" value="1:2.8" change="0.0" trend="neutral" icon={TrendingUp} />
          </div>

          <div className="grid gap-4 md:grid-cols-7 mb-8">
            <div className="col-span-4 rounded-xl border bg-card/50 backdrop-blur-sm p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold leading-none tracking-tight">Equity Curve</h3>
              </div>
              <EquityChart />
            </div>
            <div className="col-span-3 rounded-xl border bg-card/50 backdrop-blur-sm p-0 overflow-hidden relative">
               <img src={generatedImage} alt="Abstract visualization" className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-overlay" />
               <div className="relative z-10 p-6 flex flex-col justify-end h-full bg-gradient-to-t from-background to-transparent">
                  <h3 className="text-lg font-bold">Weekly Insight</h3>
                  <p className="text-sm text-muted-foreground mt-2">Your strategy "Breakout" is outperforming all others this week with a 75% win rate. Consider scaling up.</p>
               </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold tracking-tight">Recent Trades</h3>
            <TradeTable trades={mockTrades} />
          </div>
        </div>
      </main>
    </div>
  );
}