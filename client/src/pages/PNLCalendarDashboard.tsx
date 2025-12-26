import { useState, useMemo } from "react";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { mockTrades } from "@/lib/mockData";
import { Trade } from "@/lib/mockData";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";

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
  month: string;
}

export default function PNLCalendarDashboard() {
  const journalTrades = mockTrades.filter((t) => t.type === "journal");
  const [filters, setFilters] = useState<FilterState>({ symbol: "", side: "all", month: "2025-12" });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const filteredTrades = useMemo(() => {
    return journalTrades.filter((trade) => {
      if (filters.symbol && trade.pair !== filters.symbol) return false;
      if (filters.side !== "all" && trade.direction !== filters.side) return false;
      const [year, month] = filters.month.split("-");
      const tradeMonth = trade.date.substring(0, 7);
      if (tradeMonth !== filters.month) return false;
      return true;
    });
  }, [journalTrades, filters]);

  const uniqueSymbols = Array.from(new Set(journalTrades.map((t) => t.pair))).sort();

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
        existing.pnl += trade.pnl;
        existing.trades += 1;
        if (trade.status === "Win") {
          existing.wins += 1;
        } else if (trade.status === "Loss") {
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
      totalPNL: filteredTrades.reduce((sum, t) => sum + t.pnl, 0),
      totalTrades: filteredTrades.length,
      totalWins: filteredTrades.filter((t) => t.status === "Win").length,
      totalLosses: filteredTrades.filter((t) => t.status === "Loss").length,
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
      month: date.toISOString().substring(0, 7),
    });
  };

  const handleNextMonth = () => {
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    date.setMonth(date.getMonth() + 1);
    setFilters({
      ...filters,
      month: date.toISOString().substring(0, 7),
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
            <div className="md:col-span-2">
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
          </div>

          <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-2xl min-w-[200px]">
                  {monthName} {year}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-profit">
                  ${monthlyStats.totalPNL.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {monthlyStats.totalTrades} trades • {monthlyStats.totalWins}W {monthlyStats.totalLosses}L
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-6">
                {dayNames.map((day) => (
                  <div key={day} className="h-10 flex items-center justify-center text-xs font-semibold text-muted-foreground">
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
                        ? "bg-profit/20 border-profit/50 hover:bg-profit/30"
                        : "bg-destructive/20 border-destructive/50 hover:bg-destructive/30"
                      : "bg-muted/40 border-sidebar-border";

                  return (
                    <div
                      key={index}
                      onClick={() => day.date && setSelectedDate(day.date)}
                      className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center text-center transition-all ${
                        isEmptyDay ? "cursor-default" : "cursor-pointer hover:shadow-md"
                      } ${bgColor} ${
                        selectedDate === day.date && day.date ? "ring-2 ring-primary ring-offset-1" : ""
                      }`}
                    >
                      {isCurrentMonth && (
                        <>
                          <div className="text-sm font-bold">{day.dayNum}</div>
                          {day.trades > 0 ? (
                            <>
                              <div
                                className={`text-xs font-mono font-bold ${
                                  day.pnl > 0 ? "text-profit" : "text-destructive"
                                }`}
                              >
                                ${Math.abs(day.pnl / 100).toFixed(1)}k
                              </div>
                              <div className="text-xs text-muted-foreground">{day.trades}T</div>
                            </>
                          ) : (
                            <div className="text-xs text-muted-foreground/50">—</div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedDate && (
                <div className="p-4 rounded-lg bg-sidebar-accent/30 border border-sidebar-border">
                  <h4 className="font-semibold mb-3">
                    Trades on {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  </h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {filteredTrades
                      .filter((t) => t.date === selectedDate)
                      .map((trade) => (
                        <div key={trade.id} className="flex justify-between items-center text-sm p-2 rounded bg-sidebar-accent/50">
                          <div>
                            <span className="font-mono font-semibold">{trade.pair}</span>
                            <span className="text-xs text-muted-foreground ml-2">{trade.direction}</span>
                          </div>
                          <span className={`font-mono font-bold ${trade.pnl > 0 ? "text-profit" : "text-destructive"}`}>
                            {trade.pnl > 0 ? "+" : ""}${trade.pnl}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Weekly Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {weeklyData.length > 0 ? (
                    weeklyData.map((week, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-sidebar-accent/30">
                        <div>
                          <p className="text-sm font-semibold">Week {idx + 1}</p>
                          <p className="text-xs text-muted-foreground">{week.wins}W / {week.trades}T</p>
                        </div>
                        <p className={`text-lg font-bold font-mono ${week.pnl > 0 ? "text-profit" : "text-destructive"}`}>
                          ${week.pnl.toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No trades this month</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-sidebar-accent/30">
                    <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                    <p className="text-2xl font-bold">
                      {monthlyStats.totalTrades > 0
                        ? ((monthlyStats.totalWins / monthlyStats.totalTrades) * 100).toFixed(1)
                        : "0"}
                      %
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-sidebar-accent/30">
                    <p className="text-xs text-muted-foreground mb-1">Avg Daily P&L</p>
                    <p className="text-2xl font-bold text-profit">
                      ${monthlyStats.totalTrades > 0 ? (monthlyStats.totalPNL / monthlyStats.totalTrades).toFixed(0) : 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-sidebar-accent/30">
                    <p className="text-xs text-muted-foreground mb-1">Best Day</p>
                    <p className="text-lg font-bold">
                      {calendarData
                        .filter((d) => d !== null)
                        .reduce((max, curr) => (curr && curr.pnl > max.pnl ? curr : max), { pnl: 0, dayNum: 0 }).dayNum === 0
                        ? "—"
                        : `$${Math.max(...calendarData.filter((d) => d !== null && d.pnl > 0).map((d) => d?.pnl || 0)).toLocaleString()}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
