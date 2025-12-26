import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trade } from "@/lib/mockData";
import { TrendingUp } from "lucide-react";

interface MostProfitableDayProps {
  trades: Trade[];
}

interface DayStats {
  day: string;
  dayNum: number;
  trades: number;
  wins: number;
  pnl: number;
  winrate: number;
}

export function MostProfitableDay({ trades }: MostProfitableDayProps) {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayStatsMap = new Map<number, { trades: number; wins: number; pnl: number }>();

  trades.forEach((trade) => {
    const date = new Date(trade.date);
    const dayNum = date.getDay();

    const existing = dayStatsMap.get(dayNum) || { trades: 0, wins: 0, pnl: 0 };
    existing.trades += 1;
    if (trade.status === "Win") {
      existing.wins += 1;
    }
    existing.pnl += trade.pnl;

    dayStatsMap.set(dayNum, existing);
  });

  const dayStats: DayStats[] = daysOfWeek.map((day, index) => {
    const stats = dayStatsMap.get(index) || { trades: 0, wins: 0, pnl: 0 };
    return {
      day,
      dayNum: index,
      trades: stats.trades,
      wins: stats.wins,
      pnl: stats.pnl,
      winrate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
    };
  });

  const mostProfitable = dayStats
    .filter((d) => d.trades > 0)
    .sort((a, b) => {
      if (b.pnl !== a.pnl) return b.pnl - a.pnl;
      return b.winrate - a.winrate;
    })[0];

  if (!mostProfitable) {
    return (
      <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Most Profitable Day
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-6">No trading data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Most Profitable Day
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-profit/10 border border-profit/30">
            <p className="text-4xl font-bold text-profit">{mostProfitable.day}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {mostProfitable.winrate.toFixed(0)}% win rate • {mostProfitable.trades} trades
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">P&L:</span>
              <span className="text-lg font-bold font-mono text-profit">
                +${mostProfitable.pnl.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Avg per trade:</span>
              <span className="text-sm font-bold font-mono text-profit">
                ${(mostProfitable.pnl / mostProfitable.trades).toFixed(0)}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-sidebar-border">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Week Overview</p>
            <div className="grid grid-cols-7 gap-1">
              {dayStats.map((day) => (
                <div
                  key={day.dayNum}
                  className={`p-2 rounded-lg text-center cursor-pointer transition-all ${
                    day.trades === 0
                      ? "bg-sidebar-accent/20 text-muted-foreground"
                      : day.pnl > 0
                        ? "bg-profit/20 text-profit hover:bg-profit/30"
                        : day.pnl < 0
                          ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  <p className="text-xs font-bold">{day.day}</p>
                  {day.trades > 0 && <p className="text-xs mt-1">{day.winrate.toFixed(0)}%</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
