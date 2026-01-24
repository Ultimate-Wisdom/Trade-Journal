import { useEffect, useState, useMemo, useCallback } from "react";
import { Trade } from "@/lib/mockData";
import { calculateTopStrategyRRRCombos } from "@/lib/mockData";
import generatedImage from "@assets/generated_images/abstract_financial_data_visualization_dark_mode.png";

interface WeeklyInsightProps {
  trades: Trade[];
}

interface WeeklyStats {
  pnl: number;
  winRate: number;
  tradeCount: number;
  bestStrategy: string;
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

export function WeeklyInsight({ trades }: WeeklyInsightProps) {
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Calculate weekly trades and stats
  const weeklyTrades = useMemo(() => getWeeklyTrades(trades), [trades]);
  const weeklyStats = useMemo(() => calculateWeeklyStats(weeklyTrades), [weeklyTrades]);

  // Log stats for debugging
  console.log("Weekly Insight - Stats received:", weeklyStats);
  console.log("Weekly Insight - Weekly trades count:", weeklyTrades.length);
  console.log("Weekly Insight - All trades count:", trades.length);
  console.log("Weekly Insight - Best Strategy:", weeklyStats.bestStrategy);

  // Function to fetch insight (extracted for manual trigger)
  const fetchInsight = useCallback(async () => {
    // Generate AI insight - always call API regardless of trade count
    setLoading(true);
    console.log("Weekly Insight - Calling API with stats:", weeklyStats);
    
    try {
      const response = await fetch("/api/generate-insight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
        body: JSON.stringify({ stats: weeklyStats }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate insight: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Weekly Insight - AI Response:", data);
      setInsight(data.insight || "Unable to generate insight.");
    } catch (error) {
      console.error("Weekly Insight - Error generating insight:", error);
      setInsight("Unable to generate insight at this time.");
    } finally {
      setLoading(false);
    }
  }, [weeklyStats]);

  // Generate insight when stats change - always call API
  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]);

  return (
    <div className="col-span-2 md:col-span-3 rounded-lg md:rounded-xl border bg-card/50 backdrop-blur-sm p-0 overflow-hidden relative min-h-[140px] md:min-h-[160px]">
      <img
        src={generatedImage}
        alt="Abstract visualization"
        className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-overlay"
      />
      <div className="relative z-10 p-3 md:p-6 flex flex-col justify-end h-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm md:text-lg font-bold">Weekly Insight</h3>
          <button
            onClick={fetchInsight}
            disabled={loading}
            className="text-xs px-2 py-1 bg-primary/20 hover:bg-primary/30 text-primary rounded border border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Loading..." : "Test AI"}
          </button>
        </div>
        <p className="text-[0.7rem] md:text-sm text-muted-foreground mt-1 max-w-prose">
          {loading ? "Analyzing..." : insight || "Welcome to OPES Forge. Log your first trade to unlock insights."}
        </p>
      </div>
    </div>
  );
}
