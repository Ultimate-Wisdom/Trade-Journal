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

/**
 * Calculate Pearson Correlation Coefficient between two arrays of values
 * Returns a value between -1 (perfect negative correlation) and +1 (perfect positive correlation)
 */
function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

export function CorrelationAnalysis({ trades }: CorrelationAnalysisProps) {
  const correlations = useMemo(() => {
    if (!trades || trades.length < 5) {
      return null;
    }

    const closedTrades = trades.filter(t => {
      const pnl = parseFloat(t.pnl || "0");
      return pnl !== 0 && t.status === "Closed";
    });
    
    if (closedTrades.length < 5) {
      return null;
    }

    // Symbol correlation analysis using Pearson Correlation Coefficient
    // Group trades by symbol and date
    const symbolDateMap = new Map<string, Map<string, number>>(); // symbol -> date -> totalPnL
    
    closedTrades.forEach(trade => {
      const symbol = trade.symbol || trade.pair;
      if (!symbol) return;
      
      const tradeDate = trade.entryDate 
        ? new Date(trade.entryDate).toDateString()
        : new Date(trade.createdAt).toDateString();
      
      if (!symbolDateMap.has(symbol)) {
        symbolDateMap.set(symbol, new Map());
      }
      
      const dateMap = symbolDateMap.get(symbol)!;
      const pnl = parseFloat(trade.pnl || "0");
      const existingPnL = dateMap.get(tradeDate) || 0;
      dateMap.set(tradeDate, existingPnL + pnl); // Sum PnL for same symbol on same day
    });

    // Calculate Pearson correlation between symbol pairs
    const symbols = Array.from(symbolDateMap.keys());
    const correlationPairs: Correlation[] = [];

    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const symbol1 = symbols[i];
        const symbol2 = symbols[j];
        const dateMap1 = symbolDateMap.get(symbol1)!;
        const dateMap2 = symbolDateMap.get(symbol2)!;

        // Find common trading days
        const commonDays = Array.from(dateMap1.keys()).filter(day => dateMap2.has(day));

        if (commonDays.length >= 3) {
          // Build PnL vectors for common days
          const pnlVector1: number[] = [];
          const pnlVector2: number[] = [];

          commonDays.forEach(day => {
            pnlVector1.push(dateMap1.get(day)!);
            pnlVector2.push(dateMap2.get(day)!);
          });

          // Calculate Pearson Correlation Coefficient
          const correlation = calculatePearsonCorrelation(pnlVector1, pnlVector2);

          // Only include significant correlations (high positive or high negative)
          if (Math.abs(correlation) > 0.3) {
            correlationPairs.push({
              pair1: symbol1,
              pair2: symbol2,
              correlation,
              commonTrades: commonDays.length,
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
      // Sort by absolute correlation value (highest first) to show most significant correlations
      symbolCorrelations: correlationPairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)),
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
              Need at least 5 closed trades for correlation analysis
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
                          ? "bg-red-500/20 text-red-500 border-red-500/30"
                          : corr.correlation < 0.3 && corr.correlation > -0.3
                          ? "bg-success-green/20 text-success-green border-success-green/30"
                          : "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
                      }
                    >
                      {corr.correlation >= 0 ? "+" : ""}{(corr.correlation * 100).toFixed(0)}%
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {corr.correlation > 0.7
                        ? "High Risk Coupling"
                        : corr.correlation < 0.3 && corr.correlation > -0.3
                        ? "Good Diversification"
                        : corr.correlation < -0.3
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
                    <p className={`font-bold ${stat.winRate >= 50 ? "text-success-green" : "text-red-500"}`}>
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
                  <p className={`text-lg font-bold mt-1 ${stat.winRate >= 50 ? "text-success-green" : "text-red-500"}`}>
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
