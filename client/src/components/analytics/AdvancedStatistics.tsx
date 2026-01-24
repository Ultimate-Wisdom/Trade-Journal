import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Trophy,
  AlertCircle,
  Clock,
  Calendar,
} from "lucide-react";

interface AdvancedStatisticsProps {
  trades: any[];
}

/**
 * Calculate Risk:Reward Ratio from entry, stop loss, and take profit
 * Returns the numeric ratio (e.g., 2.0 for 1:2.0) or null if invalid
 */
function calculateRRR(
  entry: number | undefined,
  sl: number | undefined,
  tp: number | undefined,
  direction: "Long" | "Short" | null | undefined
): number | null {
  if (!entry || !sl || !tp) return null;

  const entryNum = Number(entry);
  const slNum = Number(sl);
  const tpNum = Number(tp);

  if (isNaN(entryNum) || isNaN(slNum) || isNaN(tpNum)) return null;

  // Validate based on direction
  if (direction === "Long") {
    if (slNum >= entryNum) return null; // SL must be lower for Long
    if (tpNum <= entryNum) return null; // TP must be higher for Long
  } else if (direction === "Short") {
    if (slNum <= entryNum) return null; // SL must be higher for Short
    if (tpNum >= entryNum) return null; // TP must be lower for Short
  }

  const risk = Math.abs(entryNum - slNum);
  const reward = Math.abs(tpNum - entryNum);

  if (risk === 0) return null;

  const ratio = reward / risk;
  return ratio;
}

export function AdvancedStatistics({ trades }: AdvancedStatisticsProps) {
  const stats = useMemo(() => {
    if (!trades || trades.length === 0) {
      return null;
    }

    // Fix: Use status field to filter closed trades, not PnL
    const closedTrades = trades.filter(t => {
      // Check if status exists and is "Closed"
      const status = t.status || (t as any).status;
      return status === "Closed";
    });

    if (closedTrades.length === 0) {
      return null;
    }

    // Calculate basic stats
    const wins = closedTrades.filter(t => parseFloat(t.pnl || "0") > 0);
    const losses = closedTrades.filter(t => parseFloat(t.pnl || "0") < 0);
    
    const totalWins = wins.reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0);
    const totalLosses = Math.abs(
      losses.reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0)
    );
    
    const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
    const winRate = (wins.length / closedTrades.length) * 100;

    // Calculate advanced metrics
    
    // 1. Expectancy = (Win% * AvgWin) - (Loss% * AvgLoss)
    const expectancy = (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss;

    // 2. Profit Factor = Total Wins / Total Losses
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins;

    // 3. Maximum Drawdown
    let runningBalance = 0;
    let peak = 0;
    let maxDrawdown = 0;

    closedTrades.forEach(t => {
      runningBalance += parseFloat(t.pnl || "0");
      if (runningBalance > peak) {
        peak = runningBalance;
      }
      const drawdown = peak - runningBalance;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    // 4. Consecutive Win/Loss Streaks
    let currentWinStreak = 0;
    let maxWinStreak = 0;
    let currentLossStreak = 0;
    let maxLossStreak = 0;

    closedTrades.forEach(t => {
      const pnl = parseFloat(t.pnl || "0");
      if (pnl > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > maxWinStreak) {
          maxWinStreak = currentWinStreak;
        }
      } else if (pnl < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > maxLossStreak) {
          maxLossStreak = currentLossStreak;
        }
      }
    });

    // 5. Best & Worst Trades
    const sortedByPnL = [...closedTrades].sort(
      (a, b) => parseFloat(b.pnl || "0") - parseFloat(a.pnl || "0")
    );
    const bestTrade = sortedByPnL[0];
    const worstTrade = sortedByPnL[sortedByPnL.length - 1];

    // 6. Average Risk/Reward
    // Calculate RRR from entryPrice, slPrice, tpPrice if rrr field is not available
    let totalRRR = 0;
    let rrrCount = 0;
    
    closedTrades.forEach(t => {
      let rrr: number | null = null;
      
      // First try to use existing rrr field
      if (t.rrr || (t as any).rrr) {
        const parsed = parseFloat(String(t.rrr || (t as any).rrr || "0"));
        if (!isNaN(parsed) && parsed > 0) {
          rrr = parsed;
        }
      }
      
      // If rrr not available, calculate from prices
      if (rrr === null && t.entryPrice && t.slPrice && t.tpPrice) {
        const entryPrice = typeof t.entryPrice === 'string' ? parseFloat(t.entryPrice) : Number(t.entryPrice);
        const slPrice = typeof t.slPrice === 'string' ? parseFloat(t.slPrice) : Number(t.slPrice);
        const tpPrice = typeof t.tpPrice === 'string' ? parseFloat(t.tpPrice) : Number(t.tpPrice);
        const direction = (t.direction || (t as any).direction) as "Long" | "Short" | null | undefined;
        
        rrr = calculateRRR(entryPrice, slPrice, tpPrice, direction);
      }
      
      if (rrr !== null && rrr > 0) {
        totalRRR += rrr;
        rrrCount++;
      }
    });
    
    const avgRRR = rrrCount > 0 ? totalRRR / rrrCount : 0;

    // 7. Win Rate by Day of Week
    const dayStats: Record<string, { wins: number; total: number }> = {};
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    closedTrades.forEach(t => {
      // Try multiple date field names for compatibility
      const dateSource = t.entryDate || (t as any).entryDate || t.createdAt || (t as any).createdAt || t.date || (t as any).date;
      
      if (dateSource) {
        const date = new Date(dateSource);
        // Validate date is valid
        if (!isNaN(date.getTime())) {
          const dayName = dayNames[date.getDay()];
          if (!dayStats[dayName]) {
            dayStats[dayName] = { wins: 0, total: 0 };
          }
          dayStats[dayName].total++;
          const pnl = parseFloat(String(t.pnl || (t as any).pnl || "0"));
          if (pnl > 0) {
            dayStats[dayName].wins++;
          }
        }
      }
    });

    const bestDay = Object.entries(dayStats).reduce(
      (best, [day, stats]) => {
        const winRate = (stats.wins / stats.total) * 100;
        return !best || winRate > best.winRate
          ? { day, winRate, count: stats.total }
          : best;
      },
      null as { day: string; winRate: number; count: number } | null
    );

    return {
      expectancy,
      profitFactor,
      maxDrawdown,
      maxWinStreak,
      maxLossStreak,
      avgWin,
      avgLoss,
      bestTrade,
      worstTrade,
      avgRRR,
      bestDay,
      totalTrades: closedTrades.length,
    };
  }, [trades]);

  if (!stats) {
    return (
      <Card className="border-sidebar-border bg-card/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Advanced Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No closed trades available for analysis
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-sidebar-border bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm md:text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Advanced Statistics
        </CardTitle>
        <p className="text-[0.65rem] md:text-xs text-muted-foreground">
          Based on {stats.totalTrades} closed trades
        </p>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <div className="p-2 md:p-3 rounded-lg bg-muted/30">
            <p className="text-[0.65rem] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Expectancy</p>
            <p className={`text-sm md:text-lg font-bold ${stats.expectancy >= 0 ? "text-green-500" : "text-red-500"}`}>
              {stats.expectancy >= 0 ? "+" : ""}${stats.expectancy.toFixed(2)}
            </p>
            <p className="text-[0.6rem] md:text-xs text-muted-foreground">Per Trade</p>
          </div>

          <div className="p-2 md:p-3 rounded-lg bg-muted/30">
            <p className="text-[0.65rem] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Profit Factor</p>
            <p className={`text-sm md:text-lg font-bold ${stats.profitFactor >= 1.5 ? "text-green-500" : stats.profitFactor >= 1 ? "text-yellow-500" : "text-red-500"}`}>
              {stats.profitFactor.toFixed(2)}
            </p>
            <p className="text-[0.6rem] md:text-xs text-muted-foreground">
              {stats.profitFactor >= 2 ? "Excellent" : stats.profitFactor >= 1.5 ? "Good" : stats.profitFactor >= 1 ? "Fair" : "Poor"}
            </p>
          </div>

          <div className="p-2 md:p-3 rounded-lg bg-muted/30">
            <p className="text-[0.65rem] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Max Drawdown</p>
            <p className="text-sm md:text-lg font-bold text-red-500">
              -${stats.maxDrawdown.toFixed(2)}
            </p>
            <p className="text-[0.6rem] md:text-xs text-muted-foreground">Largest Loss</p>
          </div>

          <div className="p-2 md:p-3 rounded-lg bg-muted/30">
            <p className="text-[0.65rem] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Avg R:R</p>
            <p className="text-sm md:text-lg font-bold text-primary">
              1:{stats.avgRRR.toFixed(2)}
            </p>
            <p className="text-[0.6rem] md:text-xs text-muted-foreground">Risk:Reward</p>
          </div>
        </div>

        {/* Win/Loss Comparison */}
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <div className="p-2 md:p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-1 md:gap-2 mb-0.5 md:mb-1">
              <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5 text-green-500" />
              <p className="text-[0.65rem] md:text-xs font-medium text-green-500">Avg Win</p>
            </div>
            <p className="text-sm md:text-lg font-bold text-green-500">
              +${stats.avgWin.toFixed(2)}
            </p>
          </div>

          <div className="p-2 md:p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-1 md:gap-2 mb-0.5 md:mb-1">
              <TrendingDown className="h-3 w-3 md:h-3.5 md:w-3.5 text-red-500" />
              <p className="text-[0.65rem] md:text-xs font-medium text-red-500">Avg Loss</p>
            </div>
            <p className="text-sm md:text-lg font-bold text-red-500">
              -${stats.avgLoss.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Streaks */}
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Best Streaks</p>
          </div>
          <div className="flex justify-between text-sm">
            <div>
              <span className="text-muted-foreground">Wins: </span>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                {stats.maxWinStreak}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Losses: </span>
              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                {stats.maxLossStreak}
              </Badge>
            </div>
          </div>
        </div>

        {/* Best/Worst Trades */}
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-3.5 w-3.5 text-yellow-500" />
              <p className="text-xs font-medium">Best Trade</p>
            </div>
            {parseFloat(stats.bestTrade.pnl || "0") > 0 ? (
              <>
                <p className="text-sm font-mono font-bold text-green-500">
                  +${parseFloat(stats.bestTrade.pnl || "0").toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.bestTrade.symbol || stats.bestTrade.pair || "N/A"} • {stats.bestTrade.direction || "N/A"}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>

          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              <p className="text-xs font-medium">Worst Trade</p>
            </div>
            {parseFloat(stats.worstTrade.pnl || "0") < 0 ? (
              <>
                <p className="text-sm font-mono font-bold text-red-500">
                  ${parseFloat(stats.worstTrade.pnl || "0").toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.worstTrade.symbol || stats.worstTrade.pair || "N/A"} • {stats.worstTrade.direction || "N/A"}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>

        {/* Best Day */}
        {stats.bestDay && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-medium text-primary">Best Day</p>
            </div>
            <p className="text-sm font-bold">{stats.bestDay.day}</p>
            <p className="text-xs text-muted-foreground">
              {stats.bestDay.winRate.toFixed(1)}% Win Rate • {stats.bestDay.count} trades
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
