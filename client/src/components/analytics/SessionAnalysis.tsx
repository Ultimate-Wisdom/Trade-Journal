import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { useMemo } from "react";

interface SessionAnalysisProps {
  trades: any[];
}

interface SessionStats {
  session: string;
  timeRange: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnL: number;
  color: string;
}

export function SessionAnalysis({ trades }: SessionAnalysisProps) {
  // Define getTimeRange before useMemo to avoid hoisting issues
  const getTimeRange = (session: string): string => {
    const ranges: Record<string, string> = {
      "Asian": "00:00 - 08:00",
      "London": "08:00 - 14:00",
      "NY/London Overlap": "14:00 - 16:00",
      "New York": "16:00 - 22:00",
      "Late NY": "22:00 - 24:00",
    };
    return ranges[session] || "Unknown";
  };

  const sessionStats = useMemo(() => {
    // Filter trades with entry time
    const tradesWithTime = trades.filter(t => t.entryTime);

    if (tradesWithTime.length === 0) {
      return [];
    }

    // Define trading sessions (in 24-hour format)
    const sessions = [
      { name: "Asian", start: 0, end: 8, color: "bg-blue-500" },
      { name: "London", start: 8, end: 16, color: "bg-green-500" },
      { name: "New York", start: 14, end: 22, color: "bg-purple-500" },
      { name: "Late NY", start: 22, end: 24, color: "bg-orange-500" },
    ];

    const getSession = (time: string) => {
      const [hours] = time.split(":").map(Number);
      
      // Handle overlapping sessions (prioritize primary session)
      if (hours >= 14 && hours < 16) return "NY/London Overlap";
      if (hours >= 0 && hours < 8) return "Asian";
      if (hours >= 8 && hours < 14) return "London";
      if (hours >= 16 && hours < 22) return "New York";
      return "Late NY";
    };

    const getSessionColor = (session: string) => {
      if (session.includes("Asian")) return "bg-blue-500";
      if (session.includes("London")) return "bg-green-500";
      if (session.includes("New York") || session.includes("NY")) return "bg-purple-500";
      return "bg-orange-500";
    };

    // Group trades by session
    const sessionMap = new Map<string, any[]>();
    
    tradesWithTime.forEach(trade => {
      const session = getSession(trade.entryTime);
      if (!sessionMap.has(session)) {
        sessionMap.set(session, []);
      }
      sessionMap.get(session)!.push(trade);
    });

    // Calculate stats for each session
    const stats: SessionStats[] = [];
    
    sessionMap.forEach((sessionTrades, session) => {
      const wins = sessionTrades.filter(t => {
        const pnl = parseFloat(t.pnl || "0");
        return pnl > 0;
      }).length;
      
      const losses = sessionTrades.filter(t => {
        const pnl = parseFloat(t.pnl || "0");
        return pnl < 0;
      }).length;
      
      const totalPnL = sessionTrades.reduce((sum, t) => {
        return sum + parseFloat(t.pnl || "0");
      }, 0);
      
      const avgPnL = totalPnL / sessionTrades.length;
      const winRate = (wins / sessionTrades.length) * 100;
      
      stats.push({
        session,
        timeRange: getTimeRange(session),
        totalTrades: sessionTrades.length,
        wins,
        losses,
        winRate,
        avgPnL,
        color: getSessionColor(session),
      });
    });

    // Sort by win rate descending
    return stats.sort((a, b) => b.winRate - a.winRate);
  }, [trades]);

  if (sessionStats.length === 0) {
    return (
      <Card className="border-sidebar-border bg-card/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Session Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No entry time data available
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add entry times to your trades to see session analysis
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const bestSession = sessionStats[0];
  const worstSession = sessionStats[sessionStats.length - 1];

  return (
    <Card className="border-sidebar-border bg-card/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Session Analysis
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Performance by trading session
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Best & Worst Sessions */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              <p className="text-xs font-medium text-green-500">Best Session</p>
            </div>
            <p className="text-sm font-bold">{bestSession.session}</p>
            <p className="text-xs text-muted-foreground">{bestSession.timeRange}</p>
            <p className="text-lg font-bold text-green-500 mt-1">
              {bestSession.winRate.toFixed(1)}%
            </p>
          </div>

          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              <p className="text-xs font-medium text-red-500">Worst Session</p>
            </div>
            <p className="text-sm font-bold">{worstSession.session}</p>
            <p className="text-xs text-muted-foreground">{worstSession.timeRange}</p>
            <p className="text-lg font-bold text-red-500 mt-1">
              {worstSession.winRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* All Sessions */}
        <div className="space-y-2">
          {sessionStats.map((stat, idx) => (
            <div
              key={stat.session}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-2 h-8 rounded-full ${stat.color}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{stat.session}</p>
                    {idx === 0 && (
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                        Best
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{stat.timeRange}</p>
                </div>
              </div>

              <div className="text-right space-y-0.5">
                <p className={`text-lg font-bold ${stat.winRate >= 50 ? "text-green-500" : "text-red-500"}`}>
                  {stat.winRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {stat.wins}W / {stat.losses}L ({stat.totalTrades} total)
                </p>
                <p className={`text-xs font-mono ${stat.avgPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
                  Avg: {stat.avgPnL >= 0 ? "+" : ""}${stat.avgPnL.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
