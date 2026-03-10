import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function DailyNarrativeCard() {
  const { data: macroBias, isLoading } = useQuery({
    queryKey: ["/api/macro-bias"],
    queryFn: async () => {
      const res = await fetch("/api/macro-bias", {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch macro bias");
      }
      return res.json();
    },
  });

  // Get sentiment-based styling
  const getSentimentStyle = () => {
    if (!macroBias) return "bg-gray-500/20 border-gray-500/30";
    
    const sentimentScore = Number(macroBias.sentimentScore) || 0;
    const dominantNarrative = macroBias.dominantNarrative;

    if (dominantNarrative === "RISK_ON" || sentimentScore > 2) {
      return "bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]";
    } else if (dominantNarrative === "RISK_OFF" || sentimentScore < -2) {
      return "bg-red-500/20 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.3)]";
    }
    return "bg-gray-500/20 border-gray-500/30";
  };

  return (
    <Card
      className={cn(
        "border-sidebar-border backdrop-blur-md h-full flex flex-col w-full",
        "bg-gradient-to-br from-card/60 to-card/40",
        getSentimentStyle()
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm md:text-lg font-semibold text-foreground font-heading">
          Daily Narrative
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Market Theme</p>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !macroBias ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No narrative data available
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm md:text-base text-foreground leading-relaxed">
              {macroBias.narrativeSummary || "No narrative summary available."}
            </p>
            {macroBias.dominantNarrative && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground">Dominant Theme:</span>
                <span
                  className={cn(
                    "text-xs font-semibold px-2 py-1 rounded",
                    macroBias.dominantNarrative === "RISK_ON"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : macroBias.dominantNarrative === "RISK_OFF"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-gray-500/20 text-gray-400"
                  )}
                >
                  {macroBias.dominantNarrative.replace("_", " ")}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
