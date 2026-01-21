import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ElementType;
  pnlValue?: number; // Optional numeric P&L value for conditional coloring
  className?: string; // Optional custom className for the value text
}

export function StatsCard({ title, value, change, trend, icon: Icon, pnlValue, className }: StatsCardProps) {
  // Determine color based on P&L value, or use custom className if provided
  const valueColorClass = className 
    ? className 
    : pnlValue !== undefined
    ? pnlValue > 0
      ? "text-emerald-500"
      : pnlValue < 0
      ? "text-rose-500"
      : "text-white"
    : ""; // No color class if pnlValue is not provided

  return (
    <Card className="overflow-hidden border-sidebar-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3 md:p-4">
        <CardTitle className="text-[0.7rem] leading-tight md:text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground shrink-0" />}
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 md:p-6 md:pt-0">
        <div className={cn("text-xl md:text-2xl font-bold font-mono tracking-tight leading-none", valueColorClass)}>{value}</div>
        {change && (
          <p className="mt-1 md:mt-1 flex items-center text-[0.65rem] md:text-xs text-muted-foreground">
            {trend === "up" && <ArrowUpRight className="mr-0.5 h-2.5 w-2.5 md:h-3 md:w-3 text-profit shrink-0" />}
            {trend === "down" && <ArrowDownRight className="mr-0.5 h-2.5 w-2.5 md:h-3 md:w-3 text-loss shrink-0" />}
            {trend === "neutral" && <Minus className="mr-0.5 h-2.5 w-2.5 md:h-3 md:w-3 shrink-0" />}
            <span
              className={cn(
                trend === "up" && "text-profit",
                trend === "down" && "text-loss"
              )}
            >
              {change}
            </span>
            <span className="ml-0.5 opacity-50 hidden sm:inline">vs last month</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}