import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CentralBankPolicy {
  bank: string;
  policyScore: number; // -5 to +5
  bias: "Hawkish" | "Neutral" | "Dovish";
  reasoning: string;
}

interface CentralBankPolicyData {
  FED: CentralBankPolicy;
  ECB: CentralBankPolicy;
  BoE: CentralBankPolicy;
  BoJ: CentralBankPolicy;
}

const CENTRAL_BANKS = [
  { code: "FED", name: "Federal Reserve", currency: "USD", color: "bg-blue-500" },
  { code: "ECB", name: "European Central Bank", currency: "EUR", color: "bg-yellow-500" },
  { code: "BoE", name: "Bank of England", currency: "GBP", color: "bg-red-500" },
  { code: "BoJ", name: "Bank of Japan", currency: "JPY", color: "bg-purple-500" },
] as const;

export function CentralBankRadar() {
  // Fetch latest macro bias which includes central bank policy
  const { data: macroBias, isLoading } = useQuery<{ centralBankPolicy: CentralBankPolicyData | null }>({
    queryKey: ["/api/macro-bias"],
    queryFn: async () => {
      const res = await fetch("/api/macro-bias", {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 404) return { centralBankPolicy: null };
        throw new Error("Failed to fetch macro bias");
      }
      return res.json();
    },
  });

  // Get policy color based on bias
  const getPolicyColor = (bias: string, policyScore: number): string => {
    if (bias === "Hawkish" || policyScore > 1) {
      // Bright Green for Hawkish
      return "bg-emerald-500 hover:bg-emerald-600";
    } else if (bias === "Dovish" || policyScore < -1) {
      // Deep Red for Dovish
      return "bg-red-600 hover:bg-red-700";
    } else {
      // Neutral Gray
      return "bg-gray-500 hover:bg-gray-600";
    }
  };

  // Get policy icon
  const getPolicyIcon = (bias: string, policyScore: number) => {
    if (bias === "Hawkish" || policyScore > 1) {
      return <TrendingUp className="h-4 w-4" />;
    } else if (bias === "Dovish" || policyScore < -1) {
      return <TrendingDown className="h-4 w-4" />;
    } else {
      return <Minus className="h-4 w-4" />;
    }
  };

  const centralBankPolicy = macroBias?.centralBankPolicy;

  return (
    <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm h-full flex flex-col w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm md:text-lg font-semibold text-foreground font-heading">
          Central Bank Policy Radar
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Real-time monetary policy stance analysis
        </p>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !centralBankPolicy ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-6">
            <p className="text-sm text-muted-foreground">No central bank policy data yet.</p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              Use &quot;Generate macro bias&quot; on this page to run the analysis (requires GROQ_API_KEY and headline sources).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {CENTRAL_BANKS.map((bank) => {
              const policy = centralBankPolicy[bank.code as keyof CentralBankPolicyData];
              if (!policy) return null;

              const colorClass = getPolicyColor(policy.bias, policy.policyScore);
              const icon = getPolicyIcon(policy.bias, policy.policyScore);

              return (
                <TooltipProvider key={bank.code}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all cursor-help",
                          colorClass,
                          "border-transparent hover:border-white/20"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold text-white text-sm">{bank.name}</p>
                            <p className="text-xs text-white/80">{bank.currency}</p>
                          </div>
                          <div className="text-white">{icon}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-mono bg-white/10 text-white border-white/30",
                              policy.bias === "Hawkish" && "bg-emerald-600/20 border-emerald-400/50",
                              policy.bias === "Dovish" && "bg-red-600/20 border-red-400/50",
                              policy.bias === "Neutral" && "bg-gray-600/20 border-gray-400/50"
                            )}
                          >
                            {policy.bias}
                          </Badge>
                          <span className="text-xs text-white/90 font-mono">
                            {policy.policyScore > 0 ? "+" : ""}{policy.policyScore.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[250px] bg-black/95 border-slate-800">
                      <p className="font-semibold text-white mb-1">{bank.name} ({bank.currency})</p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {policy.reasoning}
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        Policy Score: {policy.policyScore > 0 ? "+" : ""}{policy.policyScore.toFixed(1)} / ±5
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
