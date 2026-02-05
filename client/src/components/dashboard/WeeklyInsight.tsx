import { useEffect, useState, useMemo, useCallback } from "react";
import { Trade } from "@/lib/mockData";
import { calculateTopStrategyRRRCombos } from "@/lib/mockData";
import generatedImage from "@assets/generated_images/abstract_financial_data_visualization_dark_mode.png";

/**
 * Calculate Risk:Reward Ratio from entry, stop loss, and take profit
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
  if (direction === "Long") {
    if (slNum >= entryNum || tpNum <= entryNum) return null;
  } else if (direction === "Short") {
    if (slNum <= entryNum || tpNum >= entryNum) return null;
  }
  const risk = Math.abs(entryNum - slNum);
  const reward = Math.abs(tpNum - entryNum);
  if (risk === 0) return null;
  return reward / risk;
}

/**
 * Calculate average Risk:Reward Ratio
 */
function calculateAverageRR(trades: Trade[]): number {
  let totalRR = 0;
  let rrCount = 0;
  trades.forEach((trade) => {
    const calculatedRR = calculateRRR(
      trade.entryPrice,
      trade.slPrice,
      trade.tpPrice,
      trade.direction
    );
    if (calculatedRR !== null) {
      totalRR += calculatedRR;
      rrCount++;
    }
  });
  return rrCount > 0 ? totalRR / rrCount : 0;
}

/**
 * Calculate session performance (London vs NY)
 */
function calculateSessionStats(trades: Trade[]): SessionStats {
  const londonTrades: Trade[] = [];
  const nyTrades: Trade[] = [];
  
  trades.forEach((trade) => {
    const entryTime = (trade as any).entryTime;
    if (!entryTime) return;
    
    const [hours] = entryTime.split(":").map(Number);
    // London: 8:00 - 14:00
    if (hours >= 8 && hours < 14) {
      londonTrades.push(trade);
    }
    // NY: 14:00 - 22:00 (including overlap)
    else if (hours >= 14 && hours < 22) {
      nyTrades.push(trade);
    }
  });
  
  const calculateSessionWinRate = (sessionTrades: Trade[]) => {
    if (sessionTrades.length === 0) return { winRate: 0, totalTrades: 0, pnl: 0 };
    const wins = sessionTrades.filter((t) => (t.pnl || 0) > 0).length;
    const pnl = sessionTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    return {
      winRate: (wins / sessionTrades.length) * 100,
      totalTrades: sessionTrades.length,
      pnl,
    };
  };
  
  return {
    london: calculateSessionWinRate(londonTrades),
    ny: calculateSessionWinRate(nyTrades),
  };
}

/**
 * Calculate profit factor
 */
function calculateProfitFactor(trades: Trade[]): number {
  let grossProfit = 0;
  let grossLoss = 0;
  
  trades.forEach((trade) => {
    const pnl = Number(trade.pnl || 0);
    if (pnl > 0) {
      grossProfit += pnl;
    } else if (pnl < 0) {
      grossLoss += Math.abs(pnl);
    }
  });
  
  return grossLoss === 0 ? (grossProfit > 0 ? grossProfit : 0) : grossProfit / grossLoss;
}

interface WeeklyInsightProps {
  trades: Trade[];
}

interface WeeklyStats {
  pnl: number;
  winRate: number;
  tradeCount: number;
  bestStrategy: string;
}

interface TradeHistory {
  date: string; // "Mon 14:00" format
  symbol: string;
  strategy: string;
  outcome: "WIN" | "LOSS";
  pnl: number;
  mistake?: string; // If mistake tag exists
  note?: string; // Truncated to 50 chars
}

interface PsychologyStats {
  tradesWithMistakes: number;
  cleanTrades: number;
  mistakeRate: number; // Percentage
}

interface SessionStats {
  london: { winRate: number; totalTrades: number; pnl: number };
  ny: { winRate: number; totalTrades: number; pnl: number };
}

interface DashboardIntelligence {
  recentHistory: TradeHistory[];
  psychologyStats: PsychologyStats;
  weeklyStats: WeeklyStats;
  sessionStats: SessionStats;
  profitFactor: number;
  avgRR: number;
}

/**
 * Get trades from the last 7 days (rolling week)
 * Compares dates strictly by calendar day, ignoring time component
 */
function getWeeklyTrades(trades: Trade[]): Trade[] {
  // Get today and set to end of day (23:59:59.999) in local time
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Get seven days ago and set to start of day (00:00:00.000) in local time
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  console.log('Weekly Filter Range:', sevenDaysAgo.toLocaleString(), 'to', today.toLocaleString());

  const filteredTrades = trades.filter((trade) => {
    const tradeDateStr = trade.entryDate || trade.date;
    if (!tradeDateStr) return false;

    // Force local time interpretation by appending 'T00:00:00'
    // This prevents UTC parsing issues
    const tradeDate = new Date(tradeDateStr + 'T00:00:00');
    
    // Check if date is valid
    if (isNaN(tradeDate.getTime())) {
      console.warn('Invalid trade date:', tradeDateStr);
      return false;
    }

    // Compare dates: tradeDate must be >= sevenDaysAgo AND <= today
    return tradeDate >= sevenDaysAgo && tradeDate <= today;
  });

  console.log('Trades Found:', filteredTrades.length);
  return filteredTrades;
}

/**
 * Create a condensed 'Black Box' log to save tokens but maximize context
 * Returns last 15 closed trades in a minimal format for pattern analysis
 */
function getDeepDiveData(trades: Trade[]): any[] {
  // Get last 15 closed trades, sorted newest first
  const recent = trades
    .filter((t) => t.status === "Closed")
    .sort((a, b) => {
      // Sort by close date (entryDate or date), newest first
      const dateA = new Date(a.entryDate || a.date || a.createdAt || 0).getTime();
      const dateB = new Date(b.entryDate || b.date || b.createdAt || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 15)
    .map((t) => {
      const entryDate = t.entryDate || t.date || t.createdAt;
      const date = entryDate ? new Date(entryDate) : new Date();
      
      // Get tags - try multiple sources
      const tags = (t.tags as string[]) || t.psychologyTags || t.executionMistakes || [];
      const firstTag = Array.isArray(tags) && tags.length > 0 
        ? (typeof tags[0] === 'string' ? tags[0] : tags[0].name || String(tags[0]))
        : "None";

      return {
        pair: t.symbol || t.pair || "N/A",
        dir: t.direction || "N/A", // 'Long' or 'Short'
        res: (t.pnl || 0) > 0 ? "WIN" : "LOSS",
        pnl: Math.round(t.pnl || 0),
        strat: t.strategy || "N/A",
        day: !isNaN(date.getTime()) 
          ? date.toLocaleDateString('en-US', { weekday: 'short' })
          : "N/A",
        hour: !isNaN(date.getTime()) ? date.getHours() : -1, // e.g., 14 (2 PM)
        tag: firstTag,
        note: t.notes ? t.notes.substring(0, 40) : "" // Truncated note
      };
    });
  
  return recent;
}

/**
 * Get dashboard intelligence: recent trade history and psychology stats
 * Prepares rich data for AI behavioral analysis
 */
function getDashboardIntelligence(trades: Trade[]): DashboardIntelligence {
  // Filter for last 15 closed trades
  const closedTrades = trades
    .filter((t) => t.status === "Closed")
    .sort((a, b) => {
      // Sort by date descending (newest first)
      const dateA = new Date(a.entryDate || a.date || a.createdAt || 0).getTime();
      const dateB = new Date(b.entryDate || b.date || b.createdAt || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 15); // Take last 15

  // Map to simplified trade history
  const recentHistory: TradeHistory[] = closedTrades.map((trade) => {
    // Format date as "Mon 14:00"
    const tradeDate = trade.entryDate || trade.date || trade.createdAt;
    let dateStr = "N/A";
    if (tradeDate) {
      try {
        const date = new Date(tradeDate);
        if (!isNaN(date.getTime())) {
          const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
          const hour = date.getHours();
          const minute = date.getMinutes();
          dateStr = `${dayName} ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        }
      } catch (e) {
        // Keep "N/A" if date parsing fails
      }
    }

    // Get symbol (try multiple field names)
    const symbol = trade.symbol || trade.pair || "N/A";

    // Get strategy
    const strategy = trade.strategy || "N/A";

    // Determine outcome
    const pnl = Number(trade.pnl || 0);
    const outcome: "WIN" | "LOSS" = pnl > 0 ? "WIN" : "LOSS";

    // Check for mistake tags
    // Try multiple sources: tags array, psychologyTags, executionMistakes, or tags field
    let mistake: string | undefined;
    const tags = (trade.tags as string[]) || trade.psychologyTags || trade.executionMistakes || [];
    const mistakeKeywords = ["mistake", "fomo", "revenge", "overtrade", "fear", "greed", "impatience"];
    
    if (Array.isArray(tags)) {
      const mistakeTag = tags.find((tag: string) => 
        mistakeKeywords.some(keyword => tag.toLowerCase().includes(keyword))
      );
      if (mistakeTag) {
        mistake = typeof mistakeTag === 'string' ? mistakeTag : mistakeTag.name || String(mistakeTag);
      }
    }

    // Get note (truncate to 50 chars)
    const note = trade.notes 
      ? (trade.notes.length > 50 ? trade.notes.substring(0, 50) + "..." : trade.notes)
      : undefined;

    return {
      date: dateStr,
      symbol,
      strategy,
      outcome,
      pnl: Math.round(pnl * 100) / 100, // Round to 2 decimals
      mistake,
      note,
    };
  });

  // Calculate psychology stats
  const tradesWithMistakes = recentHistory.filter((t) => t.mistake).length;
  const cleanTrades = recentHistory.length - tradesWithMistakes;
  const mistakeRate = recentHistory.length > 0 
    ? Math.round((tradesWithMistakes / recentHistory.length) * 100 * 10) / 10 
    : 0;

  const psychologyStats: PsychologyStats = {
    tradesWithMistakes,
    cleanTrades,
    mistakeRate,
  };

  // Calculate weekly stats (reuse existing function)
  const weeklyStats = calculateWeeklyStats(trades);
  
  // Calculate session stats (London vs NY)
  const sessionStats = calculateSessionStats(trades);
  
  // Calculate profit factor
  const profitFactor = calculateProfitFactor(trades);
  
  // Calculate average R:R
  const avgRR = calculateAverageRR(trades);

  return {
    recentHistory,
    psychologyStats,
    weeklyStats,
    sessionStats,
    profitFactor,
    avgRR,
  };
}

/**
 * Calculate weekly statistics from trades
 */
function calculateWeeklyStats(trades: Trade[]): WeeklyStats {
  if (trades.length === 0) {
    return {
      pnl: 0,
      winRate: 0,
      tradeCount: 0,
      bestStrategy: "N/A",
    };
  }

  // Calculate PnL
  const totalPnl = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);

  // Calculate win rate (only for closed trades)
  const closedTrades = trades.filter((t) => t.status === "Closed");
  const wins = closedTrades.filter((t) => (t.pnl || 0) > 0).length;
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

  // Find best strategy
  const topStrategies = calculateTopStrategyRRRCombos(trades);
  const bestStrategy = topStrategies.length > 0 ? topStrategies[0].name : "N/A";

  return {
    pnl: totalPnl,
    winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal
    tradeCount: trades.length,
    bestStrategy,
  };
}

const CACHE_KEY = "weekly-insight-cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface IntelligenceReport {
  status: "OPTIMAL" | "CAUTION" | "CRITICAL";
  analysis: string;
  directive: string;
}

interface CachedInsight {
  insight: IntelligenceReport | string; // Support both old string format and new JSON format
  lastUpdated: number;
}

export function WeeklyInsight({ trades }: WeeklyInsightProps) {
  const [insight, setInsight] = useState<IntelligenceReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Load cached insight on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: CachedInsight = JSON.parse(cached);
        const now = Date.now();
        const age = now - parsed.lastUpdated;
        
        // If cache is less than 24 hours old, use it
        if (age < CACHE_DURATION && parsed.insight) {
          // Handle both old string format and new JSON format
          if (typeof parsed.insight === 'string') {
            // Legacy format - convert to new format
            setInsight({
              status: "CAUTION",
              analysis: parsed.insight,
              directive: "Review performance metrics.",
            });
          } else {
            setInsight(parsed.insight as IntelligenceReport);
          }
          console.log("Weekly Insight - Loaded from cache");
          return;
        }
      }
    } catch (error) {
      console.error("Weekly Insight - Error loading cache:", error);
    }
    
    // No valid cache, show default message
    setInsight(null);
  }, []);

  // Calculate weekly trades and stats
  const weeklyTrades = useMemo(() => getWeeklyTrades(trades), [trades]);
  const weeklyStats = useMemo(() => calculateWeeklyStats(weeklyTrades), [weeklyTrades]);
  
  // Get dashboard intelligence (recent history + psychology stats)
  const dashboardIntelligence = useMemo(() => getDashboardIntelligence(trades), [trades]);

  // Log stats for debugging
  console.log("Weekly Insight - Dashboard Intelligence:", dashboardIntelligence);
  console.log("Weekly Insight - Weekly trades count:", weeklyTrades.length);
  console.log("Weekly Insight - All trades count:", trades.length);
  console.log("Weekly Insight - Recent History:", dashboardIntelligence.recentHistory.length, "trades");
  console.log("Weekly Insight - Psychology Stats:", dashboardIntelligence.psychologyStats);

  // Function to fetch insight (extracted for manual trigger)
  const fetchInsight = useCallback(async () => {
    // Generate AI insight - send rich behavioral data + condensed trade log
    setLoading(true);
    
    // Get condensed Black Box trade log
    const tradeLog = getDeepDiveData(trades);
    
    console.log("Weekly Insight - Calling API with intelligence data:", dashboardIntelligence);
    console.log("Weekly Insight - Trade Log (Black Box):", tradeLog);
    
    try {
      const response = await fetch("/api/generate-insight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
        body: JSON.stringify({ 
          intelligence: dashboardIntelligence,
          stats: weeklyStats,
          tradeLog: tradeLog
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate insight: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Weekly Insight - AI Response:", data);
      
      // Parse the JSON response (should be { status, analysis, directive })
      let report: IntelligenceReport;
      try {
        // Try to parse as JSON if it's a string
        const parsed = typeof data.insight === 'string' 
          ? JSON.parse(data.insight) 
          : data.insight;
        
        // Validate structure
        if (parsed && typeof parsed === 'object' && parsed.status && parsed.analysis && parsed.directive) {
          report = {
            status: parsed.status,
            analysis: parsed.analysis,
            directive: parsed.directive,
          };
        } else {
          // Fallback: treat as legacy string format
          report = {
            status: "CAUTION",
            analysis: typeof data.insight === 'string' ? data.insight : "Unable to generate insight.",
            directive: "Review performance metrics.",
          };
        }
      } catch (error) {
        // If parsing fails, treat as legacy string format
        console.warn("Weekly Insight - Failed to parse JSON, using fallback:", error);
        report = {
          status: "CAUTION",
          analysis: typeof data.insight === 'string' ? data.insight : "Unable to generate insight.",
          directive: "Review performance metrics.",
        };
      }
      
      // Save to cache
      try {
        const cache: CachedInsight = {
          insight: report,
          lastUpdated: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        console.log("Weekly Insight - Saved to cache");
      } catch (error) {
        console.error("Weekly Insight - Error saving cache:", error);
      }
      
      setInsight(report);
    } catch (error) {
      console.error("Weekly Insight - Error generating insight:", error);
      setInsight({
        status: "CRITICAL",
        analysis: "Failed to generate intelligence report. Check API connection.",
        directive: "Retry audit or check system status.",
      });
    } finally {
      setLoading(false);
    }
  }, [dashboardIntelligence, weeklyStats, trades]);

  return (
    <div className="h-full rounded-lg md:rounded-xl border bg-card/50 backdrop-blur-sm p-0 overflow-hidden relative flex flex-col">
      <img
        src={generatedImage}
        alt="Abstract visualization"
        className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-overlay"
      />
      <div className="relative z-10 p-3 md:p-6 flex flex-col justify-end h-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm md:text-lg font-bold">Strategic Intelligence</h3>
          <button
            onClick={fetchInsight}
            disabled={loading}
            className="text-xs px-2 py-1 bg-primary/20 hover:bg-primary/30 text-primary rounded border border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Processing..." : "Execute Quant Audit"}
          </button>
        </div>
        {loading ? (
          <p className="text-[0.7rem] md:text-sm text-muted-foreground mt-1 font-mono">
            Processing...
          </p>
        ) : insight ? (
          <div className="mt-1 space-y-3 font-mono text-[0.65rem] md:text-xs">
            {/* Header: Status Badge */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">[</span>
              <span className="font-bold text-muted-foreground">STATUS:</span>
              <span
                className={`font-bold ${
                  insight.status === "OPTIMAL"
                    ? "text-success-green"
                    : insight.status === "CAUTION"
                    ? "text-yellow-500"
                    : "text-red-500"
                }`}
              >
                {insight.status}
              </span>
              <span className="text-muted-foreground">]</span>
            </div>
            
            {/* Body: Detailed Analysis */}
            <div className="space-y-1.5">
              <div className="text-muted-foreground/70 text-[0.6rem] md:text-[0.65rem] uppercase tracking-wider">
                Intelligence Brief
              </div>
              <div className="text-xs md:text-sm text-muted-foreground leading-relaxed break-words whitespace-normal font-sans md:font-mono min-w-0 w-full">
                {insight.analysis}
              </div>
            </div>
            
            {/* Footer: Directive Command */}
            <div className="space-y-1.5 pt-1 border-t border-muted-foreground/20">
              <div className="text-muted-foreground/70 text-[0.6rem] md:text-[0.65rem] uppercase tracking-wider">
                Action Required
              </div>
              <div className="font-mono text-xs md:text-sm text-foreground font-bold break-words whitespace-pre-wrap leading-relaxed pl-2 border-l-2 border-primary/50 bg-primary/5 py-1.5 px-2 rounded-r">
                &gt;&gt; DIRECTIVE: {insight.directive}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[0.7rem] md:text-sm text-muted-foreground mt-1 font-mono">
            System idle. Execute audit to isolate alpha drivers and behavioral inefficiencies.
          </p>
        )}
      </div>
    </div>
  );
}
