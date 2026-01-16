import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, DollarSign, BarChart3, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useMemo } from "react";

interface PerformanceBenchmarkProps {
  trades: any[];
}

// Default benchmarks (can be made configurable later)
const BENCHMARKS = {
  winRate: 60, // 60% win rate target
  profitFactor: 2.0, // 2.0 profit factor target
  monthlyPnL: 1000, // $1000 monthly P&L target
  avgRRR: 2.0, // 1:2 average R:R target
};

export function PerformanceBenchmark({ trades }: PerformanceBenchmarkProps) {
  const performance = useMemo(() => {
    if (!trades || trades.length === 0) {
      return null;
    }

    const closedTrades = trades.filter(t => {
      const pnl = parseFloat(t.pnl || "0");
      return pnl !== 0;
    });

    if (closedTrades.length === 0) {
      return null;
    }

    // Calculate current performance
    const wins = closedTrades.filter(t => parseFloat(t.pnl || "0") > 0);
    const losses = closedTrades.filter(t => parseFloat(t.pnl || "0") < 0);
    
    const currentWinRate = (wins.length / closedTrades.length) * 100;
    
    const totalWins = wins.reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0);
    const totalLosses = Math.abs(
      losses.reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0)
    );
    const currentProfitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins;

    // Calculate monthly P&L (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTrades = closedTrades.filter(t => {
      const tradeDate = new Date(t.createdAt || t.entryDate);
      return tradeDate >= thirtyDaysAgo;
    });
    
    const monthlyPnL = recentTrades.reduce(
      (sum, t) => sum + parseFloat(t.pnl || "0"),
      0
    );

    // Calculate average R:R
    const tradesWithRRR = closedTrades.filter(t => t.rrr || t.riskRewardRatio);
    const currentAvgRRR = tradesWithRRR.length > 0
      ? tradesWithRRR.reduce((sum, t) => {
          return sum + parseFloat(t.rrr || t.riskRewardRatio || "0");
        }, 0) / tradesWithRRR.length
      : 0;

    return {
      winRate: {
        current: currentWinRate,
        target: BENCHMARKS.winRate,
        progress: Math.min((currentWinRate / BENCHMARKS.winRate) * 100, 100),
        status: currentWinRate >= BENCHMARKS.winRate ? "success" : currentWinRate >= BENCHMARKS.winRate * 0.8 ? "warning" : "danger",
      },
      profitFactor: {
        current: currentProfitFactor,
        target: BENCHMARKS.profitFactor,
        progress: Math.min((currentProfitFactor / BENCHMARKS.profitFactor) * 100, 100),
        status: currentProfitFactor >= BENCHMARKS.profitFactor ? "success" : currentProfitFactor >= BENCHMARKS.profitFactor * 0.7 ? "warning" : "danger",
      },
      monthlyPnL: {
        current: monthlyPnL,
        target: BENCHMARKS.monthlyPnL,
        progress: Math.min((monthlyPnL / BENCHMARKS.monthlyPnL) * 100, 100),
        status: monthlyPnL >= BENCHMARKS.monthlyPnL ? "success" : monthlyPnL >= BENCHMARKS.monthlyPnL * 0.7 ? "warning" : "danger",
      },
      avgRRR: {
        current: currentAvgRRR,
        target: BENCHMARKS.avgRRR,
        progress: Math.min((currentAvgRRR / BENCHMARKS.avgRRR) * 100, 100),
        status: currentAvgRRR >= BENCHMARKS.avgRRR ? "success" : currentAvgRRR >= BENCHMARKS.avgRRR * 0.8 ? "warning" : "danger",
      },
    };
  }, [trades]);

  if (!performance) {
    return (
      <Card className="border-sidebar-border bg-card/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Performance Benchmark
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No trades available for benchmarking
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "danger":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "danger":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="border-sidebar-border bg-card/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Performance Benchmark
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Track your progress against goals
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Win Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Win Rate</span>
              {getStatusIcon(performance.winRate.status)}
            </div>
            <Badge variant="outline" className={performance.winRate.status === "success" ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}>
              {performance.winRate.current.toFixed(1)}% / {performance.winRate.target}%
            </Badge>
          </div>
          <Progress value={performance.winRate.progress} className="h-2" indicatorClassName={getStatusColor(performance.winRate.status)} />
        </div>

        {/* Profit Factor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Profit Factor</span>
              {getStatusIcon(performance.profitFactor.status)}
            </div>
            <Badge variant="outline" className={performance.profitFactor.status === "success" ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}>
              {performance.profitFactor.current.toFixed(2)} / {performance.profitFactor.target}
            </Badge>
          </div>
          <Progress value={performance.profitFactor.progress} className="h-2" indicatorClassName={getStatusColor(performance.profitFactor.status)} />
        </div>

        {/* Monthly P&L */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Monthly P&L</span>
              {getStatusIcon(performance.monthlyPnL.status)}
            </div>
            <Badge variant="outline" className={performance.monthlyPnL.status === "success" ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}>
              ${performance.monthlyPnL.current.toFixed(0)} / ${performance.monthlyPnL.target}
            </Badge>
          </div>
          <Progress value={performance.monthlyPnL.progress} className="h-2" indicatorClassName={getStatusColor(performance.monthlyPnL.status)} />
          <p className="text-xs text-muted-foreground">Last 30 days</p>
        </div>

        {/* Average R:R */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Avg Risk:Reward</span>
              {getStatusIcon(performance.avgRRR.status)}
            </div>
            <Badge variant="outline" className={performance.avgRRR.status === "success" ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}>
              1:{performance.avgRRR.current.toFixed(2)} / 1:{performance.avgRRR.target}
            </Badge>
          </div>
          <Progress value={performance.avgRRR.progress} className="h-2" indicatorClassName={getStatusColor(performance.avgRRR.status)} />
        </div>

        {/* Overall Status */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <Badge className={
              Object.values(performance).filter(p => p.status === "success").length >= 3
                ? "bg-green-500 hover:bg-green-600"
                : Object.values(performance).filter(p => p.status === "success").length >= 2
                ? "bg-yellow-500 hover:bg-yellow-600"
                : "bg-red-500 hover:bg-red-600"
            }>
              {Object.values(performance).filter(p => p.status === "success").length} / 4 Goals Met
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
