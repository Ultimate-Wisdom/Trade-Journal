import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import { GitBranch, AlertCircle } from "lucide-react";

interface CorrelationAnalysisProps {
  trades: any[];
}

interface Correlation {
  pair1: string;
  pair2: string;
  correlation: number;
  commonTrades: number;
}

export function CorrelationAnalysis({ trades }: CorrelationAnalysisProps) {
  const correlations = useMemo(() => {
    if (!trades || trades.length < 10) {
      return null;
    }

    const closedTrades = trades.filter(t => parseFloat(t.pnl || "0") !== 0);
    
    if (closedTrades.length < 10) {
      return null;
    }

    // Symbol correlation analysis
    const symbolGroups = new Map<string, any[]>();
    closedTrades.forEach(trade => {
      const symbol = trade.symbol || trade.pair;
      if (!symbol) return;
      if (!symbolGroups.has(symbol)) {
        symbolGroups.set(symbol, []);
      }
      symbolGroups.get(symbol)!.push(trade);
    });

    // Calculate correlation between symbols
    const symbols = Array.from(symbolGroups.keys());
    const correlationPairs: Correlation[] = [];

    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const symbol1 = symbols[i];
        const symbol2 = symbols[j];
        const trades1 = symbolGroups.get(symbol1)!;
        const trades2 = symbolGroups.get(symbol2)!;

        // Find common time periods (same day)
        const commonDays = new Set<string>();
        trades1.forEach(t1 => {
          const date1 = new Date(t1.createdAt || t1.entryDate).toDateString();
          trades2.forEach(t2 => {
            const date2 = new Date(t2.createdAt || t2.entryDate).toDateString();
            if (date1 === date2) {
              commonDays.add(date1);
            }
          });
        });

        if (commonDays.size >= 3) {
          // Calculate correlation based on outcome similarity
          let matches = 0;
          commonDays.forEach(day => {
            const day1Trades = trades1.filter(t => new Date(t.createdAt || t.entryDate).toDateString() === day);
            const day2Trades = trades2.filter(t => new Date(t.createdAt || t.entryDate).toDateString() === day);
            
            const day1Win = day1Trades.some(t => parseFloat(t.pnl || "0") > 0);
            const day2Win = day2Trades.some(t => parseFloat(t.pnl || "0") > 0);
            
            if (day1Win === day2Win) matches++;
          });

          const correlation = matches / commonDays.size;
          if (correlation > 0.6 || correlation < 0.4) {
            correlationPairs.push({
              pair1: symbol1,
              pair2: symbol2,
              correlation,
              commonTrades: commonDays.size,
            });
          }
        }
      }
    }

    // Strategy correlation
    const strategyGroups = new Map<string, any[]>();
    closedTrades.forEach(trade => {
      if (!trade.strategy) return;
      if (!strategyGroups.has(trade.strategy)) {
        strategyGroups.set(trade.strategy, []);
      }
      strategyGroups.get(trade.strategy)!.push(trade);
    });

    const strategyStats = Array.from(strategyGroups.entries()).map(([strategy, stratTrades]) => {
      const wins = stratTrades.filter(t => parseFloat(t.pnl || "0") > 0).length;
      const winRate = (wins / stratTrades.length) * 100;
      const avgPnL = stratTrades.reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0) / stratTrades.length;
      
      return {
        strategy,
        count: stratTrades.length,
        winRate,
        avgPnL,
      };
    }).sort((a, b) => b.winRate - a.winRate);

    // Time correlation (session performance)
    const timeGroups = new Map<string, any[]>();
    closedTrades.filter(t => t.entryTime).forEach(trade => {
      const hour = parseInt(trade.entryTime.split(":")[0]);
      let session;
      if (hour >= 0 && hour < 8) session = "Asian";
      else if (hour >= 8 && hour < 14) session = "London";
      else if (hour >= 14 && hour < 22) session = "NY";
      else session = "Late";

      if (!timeGroups.has(session)) {
        timeGroups.set(session, []);
      }
      timeGroups.get(session)!.push(trade);
    });

    const timeStats = Array.from(timeGroups.entries()).map(([session, sessTrades]) => {
      const wins = sessTrades.filter(t => parseFloat(t.pnl || "0") > 0).length;
      const winRate = (wins / sessTrades.length) * 100;
      
      return {
        session,
        count: sessTrades.length,
        winRate,
      };
    }).sort((a, b) => b.winRate - a.winRate);

    return {
      symbolCorrelations: correlationPairs.sort((a, b) => Math.abs(0.5 - a.correlation) - Math.abs(0.5 - b.correlation)),
      strategyStats: strategyStats.slice(0, 5),
      timeStats,
    };
  }, [trades]);

  if (!correlations) {
    return (
      <Card className="border-sidebar-border bg-card/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            Correlation Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Need at least 10 closed trades for correlation analysis
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-sidebar-border bg-card/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          Correlation Analysis
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Discover patterns and correlations in your trading
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Symbol Correlations */}
        {correlations.symbolCorrelations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Symbol Correlations</h4>
            <div className="space-y-2">
              {correlations.symbolCorrelations.slice(0, 3).map((corr, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-muted/30 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {corr.pair1}
                      </Badge>
                      <span className="text-xs text-muted-foreground">↔</span>
                      <Badge variant="outline" className="font-mono">
                        {corr.pair2}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {corr.commonTrades} common trading days
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={
                        corr.correlation > 0.7
                          ? "bg-green-500/20 text-green-500"
                          : corr.correlation < 0.3
                          ? "bg-red-500/20 text-red-500"
                          : "bg-yellow-500/20 text-yellow-500"
                      }
                    >
                      {(corr.correlation * 100).toFixed(0)}%
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {corr.correlation > 0.7
                        ? "Strong +"
                        : corr.correlation < 0.3
                        ? "Inverse"
                        : "Moderate"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strategy Performance Ranking */}
        {correlations.strategyStats.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Strategy Rankings</h4>
            <div className="space-y-2">
              {correlations.strategyStats.map((stat, idx) => (
                <div
                  key={stat.strategy}
                  className="flex items-center justify-between p-2 rounded bg-muted/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-muted-foreground">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{stat.strategy}</p>
                      <p className="text-xs text-muted-foreground">
                        {stat.count} trades
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${stat.winRate >= 50 ? "text-green-500" : "text-red-500"}`}>
                      {stat.winRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Avg: ${stat.avgPnL.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Session Performance */}
        {correlations.timeStats.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Best Trading Sessions</h4>
            <div className="grid grid-cols-2 gap-2">
              {correlations.timeStats.map((stat) => (
                <div
                  key={stat.session}
                  className="p-3 rounded-lg bg-muted/30 text-center"
                >
                  <p className="text-sm font-medium">{stat.session}</p>
                  <p className={`text-lg font-bold mt-1 ${stat.winRate >= 50 ? "text-green-500" : "text-red-500"}`}>
                    {stat.winRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stat.count} trades
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
