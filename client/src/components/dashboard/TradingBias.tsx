import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";

// Market symbols for Trading Bias selector
const BIAS_SYMBOLS = [
  { value: "EURUSD", label: "EUR/USD" },
  { value: "GBPUSD", label: "GBP/USD" },
  { value: "XAUUSD", label: "Gold" },
  { value: "BTC", label: "Bitcoin" },
  { value: "NAS100", label: "Nasdaq" },
];

interface MarketIntelResponse {
  bias: {
    status: "BULLISH" | "BEARISH" | "NEUTRAL";
    summary: string;
    confidence: "High" | "Medium" | "Low";
  };
  articles: any[];
}

interface TradingBiasProps {
  symbol?: string; // Optional symbol, defaults to EURUSD (for external control)
  compact?: boolean; // If true, displays larger version for dedicated page
  showSelector?: boolean; // If true, shows the symbol selector in header
}

export function TradingBias({ symbol: externalSymbol, compact = false, showSelector = true }: TradingBiasProps) {
  // Internal state for symbol selection (only used if showSelector is true)
  const [internalSymbol, setInternalSymbol] = useState("EURUSD");
  
  // Use internal state if selector is shown, otherwise use external symbol or default
  const symbol = showSelector ? internalSymbol : (externalSymbol || "EURUSD");
  const { data: intel, isLoading, error, dataUpdatedAt } = useQuery<MarketIntelResponse>({
    queryKey: ["/api/market-intel", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/market-intel?symbol=${symbol}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch market intelligence");
      return res.json();
    },
    retry: 2,
    staleTime: 30 * 60 * 1000, // 30 minutes (matches backend cache)
  });

  // Track update time for relative timestamp
  const [updateTime, setUpdateTime] = useState<Date | null>(null);
  
  useEffect(() => {
    if (dataUpdatedAt) {
      setUpdateTime(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt]);

  // Helper function for status colors
  const getStatusColors = (status: "BULLISH" | "BEARISH" | "NEUTRAL") => {
    switch (status) {
      case "BULLISH":
        return {
          text: "text-emerald-500",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/30",
        };
      case "BEARISH":
        return {
          text: "text-red-500",
          bg: "bg-red-500/10",
          border: "border-red-500/30",
        };
      default:
        return {
          text: "text-gray-400",
          bg: "bg-gray-500/10",
          border: "border-gray-500/30",
        };
    }
  };

  // Determine status color and icon
  const getStatusConfig = (status: string) => {
    const colors = getStatusColors(status as "BULLISH" | "BEARISH" | "NEUTRAL");
    switch (status) {
      case "BULLISH":
        return {
          ...colors,
          icon: TrendingUp,
          label: "BULLISH",
        };
      case "BEARISH":
        return {
          ...colors,
          icon: TrendingDown,
          label: "BEARISH",
        };
      default:
        return {
          ...colors,
          icon: Minus,
          label: "NEUTRAL",
        };
    }
  };

  const statusConfig = intel?.bias?.status
    ? getStatusConfig(intel.bias.status)
    : getStatusConfig("NEUTRAL");
  const StatusIcon = statusConfig.icon;

  // Format relative time
  const getRelativeTime = () => {
    if (!updateTime) return "Just now";
    try {
      return formatDistanceToNow(updateTime, { addSuffix: true });
    } catch {
      return "Recently";
    }
  };

  // Get confidence badge style
  const getConfidenceStyle = (confidence: "High" | "Medium" | "Low") => {
    switch (confidence) {
      case "High":
        return "border-emerald-500 bg-emerald-500/10 text-emerald-500 border-solid";
      case "Medium":
        return "border-yellow-500 bg-yellow-500/10 text-yellow-500 border-dashed";
      default:
        return "border-gray-400 bg-gray-500/10 text-gray-400 border-dotted";
    }
  };

  return (
    <Card className={cn("border-sidebar-border bg-card/50 backdrop-blur-sm h-full flex flex-col")}>
      <CardHeader className={cn("pb-2 md:pb-3", compact && "pb-3 md:pb-4")}>
        <CardTitle className={cn("text-sm md:text-lg font-semibold text-foreground flex items-center justify-between gap-2")}>
          <span>Trading Bias</span>
          <div className="flex items-center gap-2">
            {showSelector ? (
              <Select value={symbol} onValueChange={setInternalSymbol}>
                <SelectTrigger className="h-7 w-[90px] md:w-[110px] text-xs border-primary/20 bg-primary/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BIAS_SYMBOLS.map((pair) => (
                    <SelectItem key={pair.value} value={pair.value}>
                      {pair.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-mono bg-primary/10 text-primary border-primary/20">
                {symbol}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("flex flex-col justify-between pt-0", !compact && "flex-1")}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              Failed to load market intelligence
            </p>
            <p className="text-[10px] text-muted-foreground/70 text-center">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        ) : intel ? (
          <>
            {/* Top: Big Colored Status */}
            <div className={cn(compact ? "mb-4 md:mb-5" : "mb-3 md:mb-4")}>
              <div
                className={cn(
                  "flex items-center justify-center gap-2 px-4 rounded-lg border",
                  statusConfig.bg,
                  statusConfig.border,
                  compact ? "py-4 md:py-5" : "py-3 md:py-4"
                )}
              >
                {/* Pulsing Dot */}
                <div className={cn(
                  "h-2 w-2 rounded-full animate-pulse",
                  intel?.bias?.status === "BULLISH" ? "bg-emerald-500" :
                  intel?.bias?.status === "BEARISH" ? "bg-red-500" :
                  "bg-gray-400"
                )}></div>
                <StatusIcon className={cn(statusConfig.text, compact ? "h-6 w-6 md:h-8 md:w-8" : "h-5 w-5 md:h-6 md:w-6")} />
                <span
                  className={cn(
                    "font-black font-mono tracking-tight",
                    statusConfig.text,
                    compact ? "text-xl md:text-2xl lg:text-3xl" : "text-lg md:text-xl"
                  )}
                >
                  {statusConfig.label}
                </span>
              </div>
              {/* Dynamic Timestamp */}
              <div className="mt-2 flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground/70 font-medium">
                  Updated {getRelativeTime()}
                </span>
              </div>
              {intel.bias.confidence && (
                <div className="mt-1.5 flex items-center justify-center">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-2 py-0.5",
                      getConfidenceStyle(intel.bias.confidence)
                    )}
                  >
                    AI Confidence: {intel.bias.confidence}
                  </Badge>
                </div>
              )}
            </div>

            {/* Middle: AI Summary */}
            <div className={cn("mb-3 md:mb-4", !compact && "flex-1")}>
              <p className={cn("text-foreground leading-relaxed text-center", compact ? "text-sm md:text-base" : "text-xs md:text-sm")}>
                {intel.bias.summary || "No analysis available."}
              </p>
            </div>

            {/* Bottom: Link to News Page (only show if not compact) */}
            {!compact && (
              <div className="pt-2 md:pt-3 border-t border-sidebar-border">
                <Link href="/market-intel">
                  <button className="w-full flex items-center justify-center gap-1.5 text-xs md:text-sm text-primary hover:text-primary/80 transition-colors group">
                    <span>Read Full Wire</span>
                    <ExternalLink className="h-3 w-3 md:h-3.5 md:w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center py-6">
            <p className="text-xs text-muted-foreground">No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
