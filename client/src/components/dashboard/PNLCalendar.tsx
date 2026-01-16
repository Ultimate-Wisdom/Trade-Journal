import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trade } from "@/lib/mockData";
import { Calendar } from "lucide-react";

interface PNLCalendarProps {
  trades: Trade[];
}

interface DailyPNL {
  date: string;
  day: string;
  pnl: number;
  trades: number;
  wins: number;
}

export function PNLCalendar({ trades }: PNLCalendarProps) {
  const dailyPNLMap = new Map<string, DailyPNL>();

  trades.forEach((trade) => {
    const date = new Date(trade.date);
    const dateStr = trade.date;
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });

    const existing = dailyPNLMap.get(dateStr) || {
      date: dateStr,
      day: dayName,
      pnl: 0,
      trades: 0,
      wins: 0,
    };

    existing.pnl += trade.pnl || 0;
    existing.trades += 1;
    // A win is a closed trade with positive PnL
    if (trade.status === "Closed" && trade.pnl && trade.pnl > 0) {
      existing.wins += 1;
    }

    dailyPNLMap.set(dateStr, existing);
  });

  const dailyPNLList = Array.from(dailyPNLMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const maxPNL = Math.max(...dailyPNLList.map((d) => Math.abs(d.pnl)), 1);

  return (
    <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm md:text-lg flex items-center gap-2">
          <Calendar className="h-4 w-4 md:h-5 md:w-5" />
          Trading Days P&L
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 max-h-[400px] overflow-y-auto">
          {dailyPNLList.length > 0 ? (
            dailyPNLList.map((daily) => {
              const percentage = (Math.abs(daily.pnl) / maxPNL) * 100;
              const winrate = (daily.wins / daily.trades) * 100;

              return (
                <div key={daily.date} className="space-y-1.5">
                  <div className="flex flex-col p-2 md:p-3 rounded-lg bg-sidebar-accent/20">
                    <p className="text-xs md:text-sm font-semibold truncate">
                      {new Date(daily.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-[0.65rem] md:text-xs text-muted-foreground">
                      {daily.day}
                    </p>
                    <p className="text-[0.6rem] md:text-xs text-muted-foreground mt-1">
                      {daily.wins}/{daily.trades} • {winrate.toFixed(0)}%
                    </p>
                    <p
                      className={`font-mono font-bold text-xs md:text-sm mt-1 ${
                        daily.pnl > 0 ? "text-profit" : daily.pnl < 0 ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {daily.pnl > 0 ? "+" : ""}${daily.pnl.toLocaleString()}
                    </p>
                  </div>
                  <div className="h-1.5 md:h-2 bg-sidebar-accent/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        daily.pnl > 0 ? "bg-profit" : daily.pnl < 0 ? "bg-destructive" : "bg-muted"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6 col-span-full">No trading days yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
