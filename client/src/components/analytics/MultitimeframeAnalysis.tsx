import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo } from "react";
import { Calendar, TrendingUp, AlertCircle } from "lucide-react";
import { startOfWeek, startOfMonth, format, isWithinInterval, subDays, subWeeks, subMonths } from "date-fns";

interface MultitimeframeAnalysisProps {
  trades: any[];
}

export function MultitimeframeAnalysis({ trades }: MultitimeframeAnalysisProps) {
  const analysis = useMemo(() => {
    if (!trades || trades.length === 0) {
      return null;
    }

    const closedTrades = trades.filter(t => parseFloat(t.pnl || "0") !== 0);
    
    if (closedTrades.length === 0) {
      return null;
    }

    const now = new Date();

    // Daily analysis (last 7 days)
    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(now, i);
      const dayStart = new Date(day.setHours(0, 0, 0, 0));
      const dayEnd = new Date(day.setHours(23, 59, 59, 999));
      
      const dayTrades = closedTrades.filter(t => {
        const tradeDate = new Date(t.createdAt || t.entryDate);
        return isWithinInterval(tradeDate, { start: dayStart, end: dayEnd });
      });

      if (dayTrades.length > 0) {
        const wins = dayTrades.filter(t => parseFloat(t.pnl || "0") > 0).length;
        const pnl = dayTrades.reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0);
        
        dailyStats.push({
          date: format(dayStart, "EEE, MMM d"),
          trades: dayTrades.length,
          wins,
          losses: dayTrades.length - wins,
          winRate: (wins / dayTrades.length) * 100,
          pnl,
        });
      }
    }

    // Weekly analysis (last 4 weeks)
    const weeklyStats = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekTrades = closedTrades.filter(t => {
        const tradeDate = new Date(t.createdAt || t.entryDate);
        return isWithinInterval(tradeDate, { start: weekStart, end: weekEnd });
      });

      if (weekTrades.length > 0) {
        const wins = weekTrades.filter(t => parseFloat(t.pnl || "0") > 0).length;
        const pnl = weekTrades.reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0);
        
        weeklyStats.push({
          period: `Week of ${format(weekStart, "MMM d")}`,
          trades: weekTrades.length,
          wins,
          losses: weekTrades.length - wins,
          winRate: (wins / weekTrades.length) * 100,
          pnl,
        });
      }
    }

    // Monthly analysis (last 3 months)
    const monthlyStats = [];
    for (let i = 2; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);
      monthEnd.setHours(23, 59, 59, 999);
      
      const monthTrades = closedTrades.filter(t => {
        const tradeDate = new Date(t.createdAt || t.entryDate);
        return isWithinInterval(tradeDate, { start: monthStart, end: monthEnd });
      });

      if (monthTrades.length > 0) {
        const wins = monthTrades.filter(t => parseFloat(t.pnl || "0") > 0).length;
        const pnl = monthTrades.reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0);
        
        monthlyStats.push({
          period: format(monthStart, "MMMM yyyy"),
          trades: monthTrades.length,
          wins,
          losses: monthTrades.length - wins,
          winRate: (wins / monthTrades.length) * 100,
          pnl,
        });
      }
    }

    return {
      daily: dailyStats,
      weekly: weeklyStats,
      monthly: monthlyStats,
    };
  }, [trades]);

  if (!analysis) {
    return (
      <Card className="border-sidebar-border bg-card/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Multi-Timeframe Analysis
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

  const TimeframeTable = ({ data }: { data: any[] }) => (
    <div className="space-y-2">
      {data.map((item, idx) => (
        <div
          key={idx}
          className="p-3 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{item.date || item.period}</span>
            <Badge
              className={
                item.winRate >= 60
                  ? "bg-green-500/20 text-green-500"
                  : item.winRate >= 40
                  ? "bg-yellow-500/20 text-yellow-500"
                  : "bg-red-500/20 text-red-500"
              }
            >
              {item.winRate.toFixed(0)}% WR
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Trades</p>
              <p className="font-bold">{item.trades}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">W/L</p>
              <p className="font-bold">
                <span className="text-green-500">{item.wins}</span>
                {" / "}
                <span className="text-red-500">{item.losses}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-xs">P&L</p>
              <p className={`font-bold font-mono ${item.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                {item.pnl >= 0 ? "+" : ""}${item.pnl.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Card className="border-sidebar-border bg-card/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Multi-Timeframe Analysis
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Performance across different timeframes
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily" className="space-y-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Last 7 days</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            {analysis.daily.length > 0 ? (
              <TimeframeTable data={analysis.daily} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No trades in the last 7 days
              </p>
            )}
          </TabsContent>
          
          <TabsContent value="weekly" className="space-y-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Last 4 weeks</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            {analysis.weekly.length > 0 ? (
              <TimeframeTable data={analysis.weekly} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No trades in the last 4 weeks
              </p>
            )}
          </TabsContent>
          
          <TabsContent value="monthly" className="space-y-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Last 3 months</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            {analysis.monthly.length > 0 ? (
              <TimeframeTable data={analysis.monthly} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No trades in the last 3 months
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
