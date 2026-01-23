import React, { useState, useMemo } from "react";
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
  riskAmount: number; // Total risk amount for the day
  rValue: number; // PnL / Risk (R multiple)
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
      // Exclude adjustments, deposits, and withdrawals from analytics
      // They affect balance but not performance stats
      if (trade.excludeFromStats) return false;
      
      // Explicitly exclude non-trade types (ADJUSTMENT, DEPOSIT, WITHDRAWAL)
      // Only include actual trades (type = "TRADE") for calendar heatmap
      if (trade.tradeType && trade.tradeType !== "TRADE") return false;
      
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
      riskAmount: t.riskAmount ? Number(t.riskAmount) : 0,
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
          riskAmount: 0,
          rValue: 0,
        };
        existing.pnl += trade.pnl || 0;
        existing.riskAmount += trade.riskAmount || 0;
        existing.trades += 1;
        if (trade.status === "Closed" && (trade.pnl || 0) > 0) {
          existing.wins += 1;
        } else if (trade.status === "Closed" && (trade.pnl || 0) < 0) {
          existing.losses += 1;
        }
        dayMap.set(dayNum, existing);
      }
    });

    // Calculate R values for each day
    dayMap.forEach((day) => {
      if (day.riskAmount > 0) {
        day.rValue = day.pnl / day.riskAmount;
      } else {
        day.rValue = 0;
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
        riskAmount: 0,
        rValue: 0,
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
          riskAmount: 0,
          rValue: 0,
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
    const grossProfit = filteredTrades
      .filter((t) => t.status === "Closed" && (t.pnl || 0) > 0)
      .reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    const grossLoss = Math.abs(
      filteredTrades
        .filter((t) => t.status === "Closed" && (t.pnl || 0) < 0)
        .reduce((sum, t) => sum + (t.pnl || 0), 0)
    );
    
    let profitFactor: number | string;
    if (grossLoss === 0) {
      profitFactor = grossProfit > 0 ? "∞" : "0.00";
    } else {
      profitFactor = (grossProfit / grossLoss);
    }
    
    return {
      totalPNL: filteredTrades.reduce((sum, t) => sum + (t.pnl || 0), 0),
      totalTrades: filteredTrades.length,
      totalWins: filteredTrades.filter((t) => t.status === "Closed" && (t.pnl || 0) > 0).length,
      totalLosses: filteredTrades.filter((t) => t.status === "Closed" && (t.pnl || 0) < 0).length,
      grossProfit,
      grossLoss,
      profitFactor,
    };
  }, [filteredTrades]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Weekly"];
  
  // Group days into weeks (7 days per week)
  const weeks = useMemo(() => {
    const weekChunks: DayData[][] = [];
    for (let i = 0; i < calendarData.length; i += 7) {
      weekChunks.push(calendarData.slice(i, i + 7));
    }
    return weekChunks;
  }, [calendarData]);
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

  const handleToday = () => {
    const now = new Date();
    setFilters({
      ...filters,
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
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

          <div className="grid gap-4 md:grid-cols-4 mb-8 -mx-4 md:mx-0 px-4 md:px-0">
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

          <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm mb-6 -mx-4 md:mx-0 w-[calc(100%+2rem)] md:w-auto">
            <CardHeader className="py-3 px-4 md:px-6">
              {/* Main Header Container - Stack on mobile, side-by-side on desktop */}
              <div className="flex flex-col gap-4 items-start md:flex-row md:items-center md:justify-between">
                {/* Left Side: Navigation Controls + Month Label */}
                <div className="flex items-center gap-6">
                  {/* 1. Navigation Controls Group */}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" onClick={handleToday} className="h-8 px-3 font-semibold">
                      TODAY
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* 2. Month Label (Separate) */}
                  <h2 className="text-xl font-bold min-w-[140px]">
                    {monthName} {year}
                  </h2>
                </div>
                
                {/* Right Side: Stats Pill - Full width on mobile */}
                <div className="rounded-full bg-secondary/20 px-3 py-2 md:px-4 flex items-center gap-2 md:gap-3 w-full md:w-auto">
                  <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">
                    Monthly P&L
                  </span>
                  <span className={`font-bold text-base ${monthlyStats.totalPNL >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {monthlyStats.totalPNL >= 0 ? "+" : ""}${maskValue(Math.abs(monthlyStats.totalPNL))}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">{monthlyStats.totalTrades} trades</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 md:p-6">
              <div className="grid grid-cols-7 md:grid-cols-8 gap-px md:gap-2 mb-4">
                {/* Headers */}
                {dayNames.map((day) => (
                  <div key={day} className={`h-8 flex items-center justify-center text-xs font-semibold text-muted-foreground ${day === 'Weekly' ? 'hidden md:flex' : ''}`}>
                    {day}
                  </div>
                ))}
                
                {/* Calendar Body - Weeks */}
                {weeks.map((week, weekIndex) => {
                  // Calculate weekly summary
                  const weekPnL = week.reduce((sum, day) => sum + (day?.pnl || 0), 0);
                  const weekTrades = week.reduce((sum, day) => sum + (day?.trades || 0), 0);
                  const weekDays = week.filter(day => day.dayNum > 0 && day.trades > 0).length;
                  
                  return (
                    <React.Fragment key={weekIndex}>
                      {/* 7 Day Cells */}
                      {week.map((day, dayIndex) => {
                        const isEmptyDay = day.dayNum === 0;
                        const isCurrentMonth = !isEmptyDay;
                        const bgColor = isEmptyDay
                          ? "bg-transparent border-transparent"
                          : day.trades > 0
                            ? day.pnl > 0
                              ? "bg-green-500/20 border-green-500/50 hover:bg-green-500/25"
                              : "bg-red-500/20 border-red-500/50 hover:bg-red-500/25"
                            : "bg-muted/20 border-sidebar-border/50";

                        return (
                          <div
                            key={`${weekIndex}-${dayIndex}`}
                            onClick={() => day.date && setSelectedDate(day.date)}
                            className={`h-16 md:h-32 rounded border flex flex-col relative transition-all p-0.5 md:p-2 overflow-hidden ${
                              isEmptyDay ? "cursor-default" : "cursor-pointer hover:shadow-md"
                            } ${bgColor} ${
                              selectedDate === day.date && day.date ? "ring-2 ring-primary" : ""
                            }`}
                          >
                            {isCurrentMonth && (
                              <>
                                {/* Day Number - Top Left */}
                                <div className="absolute top-0.5 left-0.5 md:top-1 md:left-1 text-[9px] md:text-xs text-muted-foreground font-medium">
                                  {day.dayNum}
                                </div>
                                
                                {/* Main Content - Centered */}
                                <div className="flex-1 flex flex-col justify-center items-center text-center p-0.5 md:p-1 min-w-0 w-full">
                                  {day.trades > 0 ? (
                                    <>
                                      {/* PnL Value - Tiny but bold, no wrapping - Using scale transform to bypass browser limits */}
                                      <span
                                        className={`inline-block font-mono font-black text-[10px] scale-75 origin-center leading-none tracking-[-0.1em] whitespace-nowrap md:text-sm md:scale-100 md:tracking-normal ${
                                          day.pnl > 0 ? "text-green-500" : "text-red-500"
                                        }`}
                                        style={{ letterSpacing: '-0.1em', wordBreak: 'keep-all', overflowWrap: 'normal' }}
                                      >
                                        {maskValue(Math.abs(day.pnl)).includes("****") 
                                          ? "****" 
                                          : day.pnl > 0 
                                            ? `$${day.pnl % 1 === 0 ? day.pnl.toFixed(0) : day.pnl.toFixed(1)}` 
                                            : `-$${Math.abs(day.pnl) % 1 === 0 ? Math.abs(day.pnl).toFixed(0) : Math.abs(day.pnl).toFixed(1)}`}
                                      </span>
                                      
                                      {/* Trade Count and R Value - Readable size, thin font */}
                                      <div className="flex flex-col gap-0 items-center mt-[1px]">
                                        <span className="text-[7px] font-medium leading-none text-muted-foreground/80 md:text-xs">{day.trades} trades</span>
                                        {day.riskAmount > 0 && (
                                          <span className="text-[7px] font-medium leading-none text-muted-foreground/80 md:text-xs">
                                            {day.rValue > 0 ? "+" : ""}{day.rValue.toFixed(2)}R
                                          </span>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-muted-foreground/30 text-[10px] md:text-sm">—</div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Weekly Summary Cell (8th Column) - Wraps on mobile, spans full width */}
                      <div className="col-span-7 md:col-span-1 rounded-md bg-secondary/10 border-t border-border/50 md:border-t-0 md:border-l md:border-l-border/50 flex flex-row justify-between items-center md:flex-col md:justify-center px-4 py-2 md:p-4 gap-2 md:gap-1 mt-1 mb-3 md:mt-0 md:mb-0 h-auto md:h-32">
                        {/* Week Label - Professional uppercase header */}
                        <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium md:text-[10px]">
                          Week {weekIndex + 1}
                        </div>
                        {/* PnL Value - Hero Element (Large, Extrabold, Colored) */}
                        <div
                          className={`font-mono font-extrabold text-sm md:text-lg leading-tight ${
                            weekPnL > 0 ? "text-green-500" : weekPnL < 0 ? "text-red-500" : "text-muted-foreground"
                          }`}
                        >
                          {maskValue(Math.abs(weekPnL)).includes("****") 
                            ? "****" 
                            : weekPnL > 0 
                              ? `$${weekPnL % 1 === 0 ? weekPnL.toFixed(0) : weekPnL.toFixed(1)}` 
                              : weekPnL < 0
                                ? `-$${Math.abs(weekPnL) % 1 === 0 ? Math.abs(weekPnL).toFixed(0) : Math.abs(weekPnL).toFixed(1)}`
                                : "$0.00"}
                        </div>
                        {/* Trade Count - Tiny at Bottom (hidden on mobile, shown on desktop) */}
                        <div className="text-[10px] text-muted-foreground hidden md:block">
                          {weekDays} days
                        </div>
                      </div>
                    </React.Fragment>
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

          <div className="grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-4 mb-8 -mx-4 md:mx-0 px-2 md:px-0">
            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2 px-2 pt-3 md:pb-3 md:px-6 md:pt-6">
                <CardTitle className="text-xs md:text-sm">Win Rate</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-3 md:px-6 md:pb-6">
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
              <CardHeader className="pb-2 px-2 pt-3 md:pb-3 md:px-6 md:pt-6">
                <CardTitle className="text-xs md:text-sm">Avg P&L Per Trade</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-3 md:px-6 md:pb-6">
                <p className="text-xl md:text-3xl font-black tracking-tight text-emerald-400">
                  ${monthlyStats.totalTrades > 0 ? maskValue(Math.round(monthlyStats.totalPNL / monthlyStats.totalTrades)) : maskValue(0)}
                </p>
                <p className="text-xs text-muted-foreground font-medium mt-1 md:mt-2">
                  {monthlyStats.totalTrades} trades
                </p>
              </CardContent>
            </Card>

            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2 px-2 pt-3 md:pb-3 md:px-6 md:pt-6">
                <CardTitle className="text-xs md:text-sm">Best Trading Day</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-3 md:px-6 md:pb-6">
                <p className="text-xl md:text-3xl font-black tracking-tight text-emerald-400">
                  {(() => {
                    const positiveDays = calendarData.filter((d) => d.pnl > 0);
                    if (positiveDays.length === 0) return "—";
                    const maxPnl = Math.max(...positiveDays.map((d) => d.pnl || 0));
                    return `$${maskValue(maxPnl)}`;
                  })()}
                </p>
                <p className="text-xs text-muted-foreground font-medium mt-1 md:mt-2">Peak daily P&L</p>
              </CardContent>
            </Card>

            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2 px-2 pt-3 md:pb-3 md:px-6 md:pt-6">
                <CardTitle className="text-xs md:text-sm">Profit Factor</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-3 md:px-6 md:pb-6">
                {(() => {
                  const profitFactor = monthlyStats.profitFactor;
                  const profitFactorValue = typeof profitFactor === "string" ? profitFactor : profitFactor;
                  
                  // Determine color based on value
                  let colorClass = "text-muted-foreground"; // Default
                  if (typeof profitFactor === "number") {
                    if (profitFactor > 1.5) {
                      colorClass = "text-green-500"; // Excellent
                    } else if (profitFactor >= 1.0) {
                      colorClass = "text-yellow-500"; // Sustainable
                    } else {
                      colorClass = "text-red-500"; // Unprofitable
                    }
                  } else if (profitFactor === "∞") {
                    colorClass = "text-green-500"; // Infinite (all wins)
                  }
                  
                  const displayValue = typeof profitFactor === "number" 
                    ? profitFactor.toFixed(2) 
                    : profitFactor;
                  
                  return (
                    <>
                      <p className="text-xl md:text-3xl font-black tracking-tight text-emerald-400">
                        {displayValue}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium mt-1 md:mt-2">
                        {monthlyStats.grossProfit > 0 ? `$${maskValue(monthlyStats.grossProfit)}` : "$0"} profit / {monthlyStats.grossLoss > 0 ? `$${maskValue(monthlyStats.grossLoss)}` : "$0"} loss
                      </p>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
