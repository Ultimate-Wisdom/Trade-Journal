import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface CurrencyStrengthMatrixProps {
  // For now, we'll use mock data or fetch from an API
  // In production, this would fetch 24h performance from a forex API
}

// Mock data - in production, fetch from forex API
const CURRENCIES = [
  { code: "USD", name: "US Dollar", change: 0.45 },
  { code: "EUR", name: "Euro", change: -0.32 },
  { code: "GBP", name: "British Pound", change: 0.18 },
  { code: "JPY", name: "Japanese Yen", change: -0.25 },
  { code: "AUD", name: "Australian Dollar", change: 0.12 },
  { code: "CAD", name: "Canadian Dollar", change: 0.08 },
  { code: "NZD", name: "New Zealand Dollar", change: -0.15 },
  { code: "CHF", name: "Swiss Franc", change: 0.22 },
];

export function CurrencyStrengthMatrix({}: CurrencyStrengthMatrixProps) {
  const isMobile = useIsMobile();
  
  // Sort by performance (strongest to weakest)
  const sortedData = useMemo(() => {
    return [...CURRENCIES].sort((a, b) => b.change - a.change);
  }, []);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/90 border border-slate-800/50 rounded-md shadow-2xl backdrop-blur-sm p-2.5 min-w-[140px] z-50">
          <p className="text-xs text-slate-500 mb-1.5 font-mono">{data.name}</p>
          <p
            className={`text-sm font-bold font-mono ${
              data.change >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {data.change >= 0 ? "+" : ""}
            {data.change.toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm w-full overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm md:text-lg font-semibold text-foreground flex items-center gap-2 font-heading">
          Currency Strength Matrix
          <span className="text-xs text-muted-foreground font-normal">(24h Performance)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-hidden p-3 md:p-6 pt-0">
        <div className="w-full overflow-hidden">
          <ResponsiveContainer width="100%" height={isMobile ? 450 : 350}>
            <BarChart
              data={sortedData}
              layout="vertical"
              margin={{ 
                // Left margin to ensure currency labels are visible on all screen sizes
                left: isMobile ? 20 : 45,
                right: 10, 
                top: 10, 
                bottom: 10 
              }}
              barCategoryGap={0}
              barGap={0}
            >
              <XAxis
                type="number"
                stroke="#666"
                fontSize={isMobile ? 9 : 11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`}
              />
              <YAxis
                type="category"
                dataKey="code"
                orientation="left"
                stroke="#666"
                fontSize={isMobile ? 9 : 11}
                tickLine={false}
                axisLine={false}
                width={isMobile ? 40 : 40}
                minTickGap={5}
                interval={0}
                tick={{ textAnchor: 'start', dx: isMobile ? -35 : -35 }}
            />
            <Tooltip 
              content={<CustomTooltip />}
              offset={10}
              cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
            />
            <Bar 
              dataKey="change" 
              radius={[0, 4, 4, 0]}
            >
              {sortedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.change >= 0 ? "#10b981" : "#ef4444"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 md:mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            <span>Strongest</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3 text-loss" />
            <span>Weakest</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
