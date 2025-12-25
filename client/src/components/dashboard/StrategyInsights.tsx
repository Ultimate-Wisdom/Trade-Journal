import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trade, calculateStrategyWinrates, calculateTopStrategyRRRCombos } from "@/lib/mockData";
import { TrendingUp } from "lucide-react";

interface StrategyInsightsProps {
  trades: Trade[];
  title?: string;
}

export function StrategyInsights({ trades, title = "Strategy Insights" }: StrategyInsightsProps) {
  const strategyWinrates = calculateStrategyWinrates(trades);
  const topCombos = calculateTopStrategyRRRCombos(trades);

  return (
    <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
      <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Strategy Winrates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {strategyWinrates.length > 0 ? (
              strategyWinrates.map((strategy) => (
                <div key={strategy.name} className="flex items-center justify-between p-3 rounded-lg bg-sidebar-accent/30 border border-sidebar-border">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{strategy.name}</p>
                    <p className="text-xs text-muted-foreground">{strategy.wins}/{strategy.total} trades</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold font-mono ${
                      strategy.winrate >= 60 ? "text-profit" : strategy.winrate >= 50 ? "text-primary" : "text-destructive"
                    }`}>
                      {strategy.winrate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">No trades yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="text-base md:text-lg">Top 3 Strategy + RRR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topCombos.length > 0 ? (
              topCombos.map((combo, index) => (
                <div key={`${combo.pair}-${combo.rrr}-${combo.name}`} className="flex items-center justify-between p-3 rounded-lg bg-sidebar-accent/30 border border-sidebar-border">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      #{index + 1} {combo.pair}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {combo.name} • {combo.wins}/{combo.total} trades
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold font-mono ${
                      combo.winrate >= 60 ? "text-profit" : combo.winrate >= 50 ? "text-primary" : "text-destructive"
                    }`}>
                      {combo.winrate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">No trades yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
