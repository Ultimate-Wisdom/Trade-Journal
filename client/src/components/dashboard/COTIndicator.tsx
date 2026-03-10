import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useMemo } from "react";

interface COTIndicatorProps {
  symbol: string; // 'EUR', 'GBP', 'JPY', 'DXY'
}

interface COTDataPoint {
  reportDate: string;
  cotIndex: number | null;
  netPosition: number;
  date?: string; // Formatted date for display
}

export function COTIndicator({ symbol }: COTIndicatorProps) {
  // Fetch COT data
  const { data: cotData, isLoading } = useQuery<COTDataPoint[]>({
    queryKey: [`/api/cot/${symbol}`],
    queryFn: async () => {
      const res = await fetch(`/api/cot/${symbol}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch COT data");
      const data = await res.json();
      return data.map((row: any) => ({
        reportDate: row.reportDate,
        cotIndex: row.cotIndex,
        netPosition: row.netPosition,
      }));
    },
  });

  // Fetch latest sentiment
  const { data: sentiment } = useQuery({
    queryKey: [`/api/cot/${symbol}/sentiment`],
    queryFn: async () => {
      const res = await fetch(`/api/cot/${symbol}/sentiment`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Prepare chart data - show Net Position over last 12 months
  const chartData = useMemo(() => {
    if (!cotData || cotData.length === 0) return [];
    
    // Filter to last 12 months (52 weeks)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const filteredData = cotData.filter((point) => {
      // reportDate is already a Date string from the API
      const reportDate = new Date(point.reportDate);
      return reportDate >= twelveMonthsAgo;
    });
    
    // Reverse to show oldest to newest (left to right)
    return [...filteredData].reverse().map((point, index) => {
      const reportDate = new Date(point.reportDate);
      return {
        ...point,
        index,
        netPosition: point.netPosition,
        // Format date for display
        date: reportDate.toLocaleDateString("en-US", { 
          month: "short", 
          day: "numeric",
          year: "2-digit"
        }),
        reportDate: point.reportDate, // Keep original for tooltip
      };
    });
  }, [cotData]);

  // Get sentiment badge styling
  const getSentimentBadge = () => {
    if (!sentiment || sentiment.cotIndex === null) {
      return (
        <Badge variant="outline" className="text-xs">
          No Data
        </Badge>
      );
    }

    const cotIndex = sentiment.cotIndex;
    let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
    let icon = <Minus className="h-3 w-3" />;
    let className = "";

    if (cotIndex >= 80) {
      variant = "default";
      icon = <TrendingUp className="h-3 w-3" />;
      className = "bg-emerald-600 hover:bg-emerald-700 text-white";
    } else if (cotIndex <= 20) {
      variant = "destructive";
      icon = <TrendingDown className="h-3 w-3" />;
      className = "bg-red-600 hover:bg-red-700 text-white";
    } else if (cotIndex >= 40 && cotIndex <= 60) {
      variant = "secondary";
      icon = <Minus className="h-3 w-3" />;
      className = "bg-gray-500 hover:bg-gray-600 text-white";
    } else if (cotIndex > 60) {
      variant = "default";
      icon = <TrendingUp className="h-3 w-3" />;
      className = "bg-emerald-500/80 hover:bg-emerald-600 text-white";
    } else {
      variant = "destructive";
      icon = <TrendingDown className="h-3 w-3" />;
      className = "bg-red-500/80 hover:bg-red-600 text-white";
    }

    return (
      <Badge variant={variant} className={`text-xs gap-1 ${className}`}>
        {icon}
        {sentiment.sentiment}
      </Badge>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const netPosition = data.netPosition ?? 0;
      const isPositive = netPosition > 0;
      
      return (
        <div className="bg-black/90 border border-slate-800/50 rounded-md shadow-2xl backdrop-blur-sm p-2.5 min-w-[160px]">
          <p className="text-[10px] text-slate-500 mb-1.5 font-mono">{data.date || data.reportDate}</p>
          <p className={`text-sm font-bold font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            Net Position: {isPositive ? "+" : ""}{netPosition.toLocaleString()}
          </p>
          {data.cotIndex !== null && (
            <p className="text-xs text-slate-400 mt-1 font-mono">
              COT Index: {data.cotIndex.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm md:text-lg font-semibold text-foreground flex items-center justify-between font-heading">
          <span>COT Indicator: {symbol}</span>
          {getSentimentBadge()}
        </CardTitle>
        {sentiment && sentiment.cotIndex !== null && (
          <p className="text-xs text-muted-foreground mt-1">
            Latest: {sentiment.cotIndex.toFixed(1)}% • {new Date(sentiment.reportDate).toLocaleDateString()}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          Source: CFTC Official Data (TFF)
        </p>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No COT data available
          </div>
        ) : (
          <div className="h-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#666" vertical={false} opacity={0.1} />
                <XAxis
                  dataKey="date"
                  stroke="#666"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickCount={6}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#666"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                    return value.toString();
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                {/* Zero line */}
                <Line
                  type="monotone"
                  dataKey={() => 0}
                  stroke="#6b7280"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  dot={false}
                  strokeOpacity={0.3}
                />
                {/* Net Position line */}
                <Line
                  type="monotone"
                  dataKey="netPosition"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#3B82F6" }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-muted-foreground/60 mt-2 text-center">
              Net Position over last 12 months (Long - Short)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
