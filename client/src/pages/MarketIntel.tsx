import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MobileNav } from "@/components/layout/MobileNav";
import { TradingBias } from "@/components/dashboard/TradingBias";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ExternalLink, Calendar, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MarketIntelResponse {
  bias: {
    status: "BULLISH" | "BEARISH" | "NEUTRAL";
    summary: string;
    confidence: "High" | "Medium" | "Low";
  };
  articles: Array<{
    title?: string;
    headline?: string;
    text?: string;
    site?: string;
    url?: string;
    publishedDate?: string;
    image?: string;
    symbol?: string;
  }>;
}

const FOREX_PAIRS = [
  { value: "EURUSD", label: "EUR/USD - Euro" },
  { value: "GBPUSD", label: "GBP/USD - Pound" },
  { value: "XAUUSD", label: "XAU/USD - Gold" },
  { value: "BTC", label: "BTC/USD - Bitcoin" },
  { value: "NAS100", label: "NAS100 - Nasdaq" },
];

export default function MarketIntel() {
  const [selectedSymbol, setSelectedSymbol] = useState("EURUSD");

  const { data: intel, isLoading, error } = useQuery<MarketIntelResponse>({
    queryKey: ["/api/market-intel", selectedSymbol],
    queryFn: async () => {
      const res = await fetch(`/api/market-intel?symbol=${selectedSymbol}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch market intelligence");
      return res.json();
    },
    retry: 2,
    staleTime: 30 * 60 * 1000, // 30 minutes (matches backend cache)
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown date";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      // Show relative time if recent, otherwise show date
      if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins < 1 ? "Just now" : `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
        });
      }
    } catch {
      return dateString;
    }
  };

  const getArticleTitle = (article: any) => {
    return article.title || article.headline || "No title";
  };

  const getArticleText = (article: any) => {
    return article.text || article.description || "";
  };

  const getArticleUrl = (article: any) => {
    return article.url || article.link || "#";
  };

  const getArticleImage = (article: any) => {
    return article.image || article.imageUrl || null;
  };

  const getArticleSource = (article: any) => {
    return article.site || article.source || "Unknown source";
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-6xl">
          {/* Header */}
          <header className="mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                  <Globe className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                  Global Macro
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Real-time institutional sentiment and event monitoring.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="symbol-select" className="text-sm text-muted-foreground">
                  Pair:
                </label>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                  <SelectTrigger id="symbol-select" className="w-[140px] md:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOREX_PAIRS.map((pair) => (
                      <SelectItem key={pair.value} value={pair.value}>
                        {pair.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </header>

          {/* Trading Bias Summary (Large/Detailed) */}
          <div className="mb-6 md:mb-8">
            <TradingBias symbol={selectedSymbol} compact={false} />
          </div>

          {/* News Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-semibold">News Feed</h2>
              {intel && (
                <span className="text-xs md:text-sm text-muted-foreground">
                  {intel.articles.length} articles
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center py-8 space-y-2">
                    <p className="text-sm text-muted-foreground text-center">
                      Failed to load market intelligence
                    </p>
                    <p className="text-xs text-muted-foreground/70 text-center">
                      {error instanceof Error ? error.message : "Unknown error"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : intel && intel.articles.length > 0 ? (
              <div className="space-y-4">
                {intel.articles.map((article, index) => {
                  const title = getArticleTitle(article);
                  const text = getArticleText(article);
                  const url = getArticleUrl(article);
                  const image = getArticleImage(article);
                  const source = getArticleSource(article);
                  const date = formatDate(article.publishedDate);

                  // Truncate text snippet
                  const snippet = text.length > 200 ? text.substring(0, 200) + "..." : text;

                  return (
                    <Card
                      key={index}
                      className="border-sidebar-border bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-colors cursor-pointer group"
                      onClick={() => {
                        if (url && url !== "#") {
                          window.open(url, "_blank", "noopener,noreferrer");
                        }
                      }}
                    >
                      <CardContent className="p-4 md:p-6">
                        <div className="flex gap-4">
                          {/* Image (Left, Square) */}
                          {image ? (
                            <div className="flex-shrink-0 w-24 h-24 md:w-28 md:h-28 rounded-lg overflow-hidden bg-muted/30">
                              <img
                                src={image}
                                alt={title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Hide image on error
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex-shrink-0 w-24 h-24 md:w-28 md:h-28 rounded-lg bg-muted/30 flex items-center justify-center">
                              <Globe className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground/50" />
                            </div>
                          )}

                          {/* Content (Right) */}
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Title */}
                            <h3 className="text-base md:text-lg font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                              {title}
                            </h3>

                            {/* Source & Time */}
                            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                              <span>{source}</span>
                              <span>•</span>
                              <span>{date}</span>
                            </div>

                            {/* Text Snippet */}
                            {snippet && (
                              <p className="text-sm md:text-base text-muted-foreground leading-relaxed line-clamp-2">
                                {snippet}
                              </p>
                            )}

                            {/* External Link Indicator */}
                            {url && url !== "#" && (
                              <div className="flex items-center gap-1.5 text-xs md:text-sm text-primary pt-1">
                                <span>Read full article</span>
                                <ExternalLink className="h-3 w-3 md:h-3.5 md:w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center py-12">
                    <Globe className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground text-center">
                      No recent wire updates for this pair.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
