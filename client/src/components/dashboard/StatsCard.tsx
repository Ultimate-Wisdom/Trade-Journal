import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ElementType;
}

export function StatsCard({ title, value, change, trend, icon: Icon }: StatsCardProps) {
  return (
    <Card className="overflow-hidden border-sidebar-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono tracking-tight">{value}</div>
        {change && (
          <p className="mt-1 flex items-center text-xs text-muted-foreground">
            {trend === "up" && <ArrowUpRight className="mr-1 h-3 w-3 text-profit" />}
            {trend === "down" && <ArrowDownRight className="mr-1 h-3 w-3 text-loss" />}
            {trend === "neutral" && <Minus className="mr-1 h-3 w-3" />}
            <span
              className={cn(
                trend === "up" && "text-profit",
                trend === "down" && "text-loss"
              )}
            >
              {change}
            </span>
            <span className="ml-1 opacity-50">vs last month</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}