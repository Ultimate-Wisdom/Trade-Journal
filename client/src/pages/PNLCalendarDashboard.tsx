import { useState, useMemo } from "react";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trade } from "@/lib/mockData";
import { useQuery } from "@tanstack/react-query";
import { Trade as DBTrade, Account } from "@shared/schema";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";

interface DayData {
  date: string;
  dayNum: number;
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
}

interface FilterState {
  symbol: string;
  side: "all" | "Long" | "Short";
  accountId: string; // "all" or specific account ID
  month: string;
}

export default function PNLCalendarDashboard() {
  const { maskValue } = usePrivacyMode();

  // Fetch real trades from API
  const { data: dbTrades } = useQuery<DBTrade[]>({
    queryKey: ["/api/trades"],
  });

  // Fetch accounts
  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  // Get current month as default
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // Get unique symbols from all trades
  const uniqueSymbols = useMemo(() => {
    if (!dbTrades) return [];
    return Array.from(new Set(dbTrades.map((t) => t.symbol).filter(Boolean))).sort();
  }, [dbTrades]);

  const [filters, setFilters] = useState<FilterState>(() => ({ 
    symbol: "", 
    side: "all",
    accountId: "all",
    month: (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    })()
  }));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const filteredTrades = useMemo(() => {
    if (!dbTrades) return [];
    return dbTrades.filter((trade) => {
      // Apply account filter
      if (filters.accountId !== "all" && trade.accountId !== filters.accountId) return false;
      
      // Apply symbol filter
      if (filters.symbol && trade.symbol !== filters.symbol) return false;
      
      // Apply side filter
      if (filters.side !== "all" && trade.direction !== filters.side) return false;
      
      // Apply month filter
      const tradeDate = trade.entryDate || trade.createdAt;
      if (!tradeDate) return false;
      const dateObj = new Date(tradeDate);
      if (isNaN(dateObj.getTime())) return false; // Skip invalid dates
      const tradeDateStr = dateObj.toISOString();
      const tradeMonth = tradeDateStr.substring(0, 7);
      if (tradeMonth !== filters.month) return false;
      
      return true;
    }).map((t) => ({
      id: String(t.id),
      pair: t.symbol || "UNKNOWN",
      type: "Forex" as const,
      direction: t.direction as "Long" | "Short",
      entryPrice: Number(t.entryPrice) || 0,
      exitPrice: t.exitPrice ? Number(t.exitPrice) : undefined,
      slPrice: t.stopLoss ? Number(t.stopLoss) : undefined,
      tpPrice: t.takeProfit ? Number(t.takeProfit) : undefined,
      quantity: Number(t.quantity) || 0,
      pnl: t.pnl ? Number(t.pnl) : undefined,
      status: t.status as "Open" | "Closed" | "Pending",
      date: (() => {
        if (t.entryDate) {
          const d = new Date(t.entryDate);
          if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
        }
        if (t.createdAt) {
          const d = new Date(t.createdAt);
          if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
        }
        return new Date().toISOString().split("T")[0];
      })(),
      strategy: t.strategy || "Unknown",
    }));
  }, [dbTrades, filters]);

  const calendarData = useMemo(() => {
    const [year, month] = filters.month.split("-");
    const monthNum = parseInt(month);
    const firstDay = new Date(parseInt(year), monthNum - 1, 1);
    const lastDay = new Date(parseInt(year), monthNum, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const dayMap = new Map<number, DayData>();

    filteredTrades.forEach((trade) => {
      const tradeDate = new Date(trade.date);
      if (tradeDate.getFullYear() === parseInt(year) && tradeDate.getMonth() === monthNum - 1) {
        const dayNum = tradeDate.getDate();
        const existing = dayMap.get(dayNum) || {
          date: trade.date,
          dayNum,
          pnl: 0,
          trades: 0,
          wins: 0,
          losses: 0,
        };
        existing.pnl += trade.pnl || 0;
        existing.trades += 1;
        if (trade.status === "Closed" && (trade.pnl || 0) > 0) {
          existing.wins += 1;
        } else if (trade.status === "Closed" && (trade.pnl || 0) < 0) {
          existing.losses += 1;
        }
        dayMap.set(dayNum, existing);
      }
    });

    const calendar: DayData[] = [];
    
    // Add empty days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendar.push({
        date: "",
        dayNum: 0,
        pnl: 0,
        trades: 0,
        wins: 0,
        losses: 0,
      });
    }
    
    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      calendar.push(
        dayMap.get(i) || {
          date: "",
          dayNum: i,
          pnl: 0,
          trades: 0,
          wins: 0,
          losses: 0,
        }
      );
    }

    return calendar;
  }, [filters, filteredTrades]);

  const weeklyData = useMemo(() => {
    const weeks: Array<{ pnl: number; trades: number; wins: number }> = [];
    for (let i = 0; i < calendarData.length; i += 7) {
      const week = calendarData.slice(i, i + 7);
      const weekData = {
        pnl: week.reduce((sum, day) => sum + (day?.pnl || 0), 0),
        trades: week.reduce((sum, day) => sum + (day?.trades || 0), 0),
        wins: week.reduce((sum, day) => sum + (day?.wins || 0), 0),
      };
      if (weekData.trades > 0) weeks.push(weekData);
    }
    return weeks;
  }, [calendarData]);

  const monthlyStats = useMemo(() => {
    return {
      totalPNL: filteredTrades.reduce((sum, t) => sum + (t.pnl || 0), 0),
      totalTrades: filteredTrades.length,
      totalWins: filteredTrades.filter((t) => t.status === "Closed" && (t.pnl || 0) > 0).length,
      totalLosses: filteredTrades.filter((t) => t.status === "Closed" && (t.pnl || 0) < 0).length,
    };
  }, [filteredTrades]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const [year, month] = filters.month.split("-");
  const monthName = monthNames[parseInt(month) - 1];

  const handlePrevMonth = () => {
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    date.setMonth(date.getMonth() - 1);
    setFilters({
      ...filters,
      month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    });
  };

  const handleNextMonth = () => {
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    date.setMonth(date.getMonth() + 1);
    setFilters({
      ...filters,
      month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-7xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Trading Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">Professional P&L tracking with daily analytics.</p>
          </header>

          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <div>
              <label className="text-sm font-medium mb-2 block">Symbol</label>
              <Input
                placeholder="All symbols"
                value={filters.symbol}
                onChange={(e) => setFilters({ ...filters, symbol: e.target.value })}
                list="symbols"
              />
              <datalist id="symbols">
                {uniqueSymbols.map((sym) => (
                  <option key={sym} value={sym} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Side</label>
              <select
                className="w-full px-3 py-2 rounded-md border bg-background"
                value={filters.side}
                onChange={(e) => setFilters({ ...filters, side: e.target.value as FilterState["side"] })}
              >
                <option value="all">All Sides</option>
                <option value="Long">Long</option>
                <option value="Short">Short</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Account</label>
              <select
                className="w-full px-3 py-2 rounded-md border bg-background"
                value={filters.accountId}
                onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}
              >
                <option value="all">All Accounts</option>
                {accounts?.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm mb-6">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-6">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handlePrevMonth} className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-xl min-w-[180px]">
                  {monthName} {year}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${monthlyStats.totalPNL >= 0 ? "text-profit" : "text-destructive"}`}>
                  ${maskValue(monthlyStats.totalPNL)}
                </p>
                <p className="text-xs text-muted-foreground leading-tight">
                  {monthlyStats.totalTrades} trades • {monthlyStats.totalWins}W {monthlyStats.totalLosses}L
                </p>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-4">
              <div className="grid grid-cols-7 gap-0.5 mb-4">
                {dayNames.map((day) => (
                  <div key={day} className="h-8 flex items-center justify-center text-xs font-semibold text-muted-foreground">
                    {day}
                  </div>
                ))}
                {calendarData.map((day, index) => {
                  const isEmptyDay = day.dayNum === 0;
                  const isCurrentMonth = !isEmptyDay;
                  const bgColor = isEmptyDay
                    ? "bg-background/40 border-transparent"
                    : day.trades > 0
                      ? day.pnl > 0
                        ? "bg-profit/20 border-profit/50 hover:bg-profit/25"
                        : "bg-destructive/20 border-destructive/50 hover:bg-destructive/25"
                      : "bg-muted/40 border-sidebar-border";

                  return (
                    <div
                      key={index}
                      onClick={() => day.date && setSelectedDate(day.date)}
                      className={`aspect-square rounded border flex flex-col items-center justify-center text-center transition-all text-[11px] ${
                        isEmptyDay ? "cursor-default" : "cursor-pointer hover:shadow-sm"
                      } ${bgColor} ${
                        selectedDate === day.date && day.date ? "ring-1 ring-primary" : ""
                      }`}
                    >
                      {isCurrentMonth && (
                        <>
                          <div className="font-bold leading-none">{day.dayNum}</div>
                          {day.trades > 0 ? (
                            <>
                              <div
                                className={`font-mono font-bold leading-none mt-0.5 ${
                                  day.pnl > 0 ? "text-profit" : "text-destructive"
                                }`}
                              >
                                {maskValue(Math.abs(day.pnl)).includes("****") 
                                  ? "$****" 
                                  : `$${Math.abs(day.pnl).toFixed(0)}`}
                              </div>
                              <div className="text-muted-foreground leading-none">{day.wins}W{day.losses}L</div>
                            </>
                          ) : (
                            <div className="text-muted-foreground/40 leading-none">—</div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedDate && (
                <div className="p-3 rounded bg-sidebar-accent/20 border border-sidebar-border">
                  <h4 className="font-semibold text-xs mb-2 uppercase tracking-wide text-muted-foreground">
                    {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </h4>
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                    {filteredTrades
                      .filter((t) => t.date === selectedDate)
                      .map((trade) => (
                        <div key={trade.id} className="flex justify-between items-center text-xs p-1.5 rounded bg-sidebar-accent/40">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold">{trade.pair}</span>
                            <span className="text-muted-foreground">{trade.direction === "Long" ? "↑" : "↓"}</span>
                          </div>
                          <span className={`font-mono font-bold ${(trade.pnl || 0) > 0 ? "text-profit" : "text-destructive"}`}>
                            {(trade.pnl || 0) > 0 ? "+" : ""}${maskValue(trade.pnl || 0)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4 mb-8">
            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2 px-3 pt-3 md:pb-3 md:px-6 md:pt-6">
                <CardTitle className="text-xs md:text-sm">Win Rate</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
                <p className="text-xl md:text-3xl font-bold">
                  {monthlyStats.totalTrades > 0
                    ? ((monthlyStats.totalWins / monthlyStats.totalTrades) * 100).toFixed(1)
                    : "0"}
                  %
                </p>
                <p className="text-[0.65rem] md:text-xs text-muted-foreground mt-1 md:mt-2">
                  {monthlyStats.totalWins}W / {monthlyStats.totalTrades} total
                </p>
              </CardContent>
            </Card>

            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2 px-3 pt-3 md:pb-3 md:px-6 md:pt-6">
                <CardTitle className="text-xs md:text-sm">Avg P&L Per Trade</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
                <p className={`text-xl md:text-3xl font-bold ${monthlyStats.totalPNL >= 0 ? "text-profit" : "text-destructive"}`}>
                  ${monthlyStats.totalTrades > 0 ? maskValue(Math.round(monthlyStats.totalPNL / monthlyStats.totalTrades)) : maskValue(0)}
                </p>
                <p className="text-[0.65rem] md:text-xs text-muted-foreground mt-1 md:mt-2">
                  {monthlyStats.totalTrades} trades
                </p>
              </CardContent>
            </Card>

            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2 px-3 pt-3 md:pb-3 md:px-6 md:pt-6">
                <CardTitle className="text-xs md:text-sm">Best Trading Day</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
                <p className="text-xl md:text-3xl font-bold text-profit">
                  {(() => {
                    const positiveDays = calendarData.filter((d) => d.pnl > 0);
                    if (positiveDays.length === 0) return "—";
                    const maxPnl = Math.max(...positiveDays.map((d) => d.pnl || 0));
                    return `$${maskValue(maxPnl)}`;
                  })()}
                </p>
                <p className="text-[0.65rem] md:text-xs text-muted-foreground mt-1 md:mt-2">Peak daily P&L</p>
              </CardContent>
            </Card>

            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2 px-3 pt-3 md:pb-3 md:px-6 md:pt-6">
                <CardTitle className="text-xs md:text-sm">Weekly Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
                {weeklyData.length > 0 ? (
                  <div className="space-y-1.5">
                    {weeklyData.slice(0, 1).map((week, idx) => (
                      <div key={idx}>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Week {idx + 1}</p>
                        <p className={`text-xl md:text-3xl font-bold font-mono ${week.pnl > 0 ? "text-profit" : "text-destructive"}`}>
                          ${maskValue(week.pnl)}
                        </p>
                        <p className="text-[0.65rem] md:text-xs text-muted-foreground mt-1">{week.wins}W / {week.trades}T</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xl md:text-3xl font-bold">—</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
