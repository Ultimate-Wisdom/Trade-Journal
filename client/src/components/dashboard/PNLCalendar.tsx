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
    if (trade.status === "Win") {
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
      <CardHeader>
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Trading Days P&L
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {dailyPNLList.length > 0 ? (
            dailyPNLList.map((daily) => {
              const percentage = (Math.abs(daily.pnl) / maxPNL) * 100;
              const winrate = (daily.wins / daily.trades) * 100;

              return (
                <div key={daily.date} className="space-y-1">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-sidebar-accent/20">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">
                        {new Date(daily.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        <span className="text-xs text-muted-foreground">({daily.day})</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {daily.wins}/{daily.trades} • {winrate.toFixed(0)}%
                      </p>
                    </div>
                    <p
                      className={`text-right font-mono font-bold text-sm ${
                        daily.pnl > 0 ? "text-profit" : daily.pnl < 0 ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {daily.pnl > 0 ? "+" : ""} ${daily.pnl.toLocaleString()}
                    </p>
                  </div>
                  <div className="h-2 bg-sidebar-accent/30 rounded-full overflow-hidden">
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
            <p className="text-xs text-muted-foreground text-center py-6">No trading days yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
