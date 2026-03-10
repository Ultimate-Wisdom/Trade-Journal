import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface SmartMoneyGaugeProps {
  symbol: string; // 'EUR', 'GBP', 'JPY', 'DXY'
}

export function SmartMoneyGauge({ symbol }: SmartMoneyGaugeProps) {
  // Fetch latest COT sentiment
  const { data: sentiment, isLoading } = useQuery({
    queryKey: [`/api/cot/${symbol}/sentiment`],
    queryFn: async () => {
      const res = await fetch(`/api/cot/${symbol}/sentiment`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Create semi-circle gauge data
  const cotIndex = sentiment?.cotIndex ?? 50;
  const filledValue = cotIndex;
  const emptyValue = 100 - cotIndex;
  
  const gaugeData = [
    {
      name: "filled",
      value: filledValue,
      fill: cotIndex >= 60 ? "#10b981" : cotIndex <= 40 ? "#ef4444" : "#6b7280",
    },
    {
      name: "empty",
      value: emptyValue,
      fill: "transparent",
    },
  ];

  // Get sentiment label
  const getSentimentLabel = () => {
    if (cotIndex >= 80) return "Extreme Bullish";
    if (cotIndex >= 60) return "Bullish";
    if (cotIndex <= 20) return "Extreme Bearish";
    if (cotIndex <= 40) return "Bearish";
    return "Neutral";
  };

  return (
    <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm h-full flex flex-col w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm md:text-lg font-semibold text-foreground font-heading">
          Smart Money Gauge
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Big Bank Sentiment</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          Source: CFTC Official Data (TFF)
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !sentiment ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No COT data available
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="relative w-full max-w-[280px] h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gaugeData}
                    cx="50%"
                    cy="100%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    stroke="none"
                  >
                    {gaugeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Percentage Label */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <p className="text-3xl font-bold text-foreground">{cotIndex.toFixed(0)}%</p>
              </div>
              {/* Sentiment Label */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                <p
                  className={`text-xs font-semibold ${
                    cotIndex >= 60
                      ? "text-profit"
                      : cotIndex <= 40
                      ? "text-loss"
                      : "text-gray-500"
                  }`}
                >
                  {getSentimentLabel()}
                </p>
              </div>
            </div>
            {/* Reference Lines */}
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>0-40%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span>40-60%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span>60-100%</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
