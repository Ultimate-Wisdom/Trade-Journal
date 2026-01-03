import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trade } from "@/lib/mockData";
import { Trash2, Edit2 } from "lucide-react";
import { Link } from "wouter";

interface TradeTableProps {
  trades: Trade[];
  onDelete?: (id: string) => void;
  showAccount?: boolean;
  showRRR?: boolean;
  showRisk?: boolean;
}

// 1. REAL MATH: Helper to calculate Reward-to-Risk Ratio
const calculateRRR = (entry: number, sl?: number, tp?: number) => {
  if (!sl || !tp || entry === sl) return "—";

  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);

  if (risk === 0) return "—";

  const ratio = reward / risk;
  return `1:${ratio.toFixed(1)}`; // Returns "1:2.5", "1:3.0", etc.
};

export function TradeTable({
  trades,
  onDelete,
  showAccount,
  showRRR,
  showRisk,
}: TradeTableProps) {
  return (
    <div className="rounded-md border bg-card/50 backdrop-blur-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[100px]">Date</TableHead>
            {showAccount && <TableHead>Account</TableHead>}
            <TableHead>Pair</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Strategy</TableHead>
            {showRRR && <TableHead className="text-right">RRR</TableHead>}
            {showRisk && <TableHead className="text-right">Risk %</TableHead>}
            <TableHead className="text-right">Entry</TableHead>
            <TableHead className="text-right">Exit</TableHead>
            <TableHead className="text-right">P&L</TableHead>
            <TableHead className="text-right">Status</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((trade) => {
            // Convert strings to numbers for math
            const entry = Number(trade.entryPrice);
            const sl = trade.stopLoss ? Number(trade.stopLoss) : undefined;
            const tp = trade.takeProfit ? Number(trade.takeProfit) : undefined;

            return (
              <TableRow
                key={trade.id}
                className="group cursor-pointer hover:bg-muted/50"
              >
                <TableCell className="font-medium text-muted-foreground">
                  {trade.date}
                </TableCell>

                {/* FIX: Don't hardcode "FTMO 100k". Use trade.accountName or fallback */}
                {showAccount && (
                  <TableCell className="text-xs font-mono opacity-70">
                    {(trade as any).accountName || "—"}
                  </TableCell>
                )}

                <TableCell className="font-bold font-mono">
                  {trade.pair}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-mono text-xs",
                      trade.direction === "Long"
                        ? "text-primary border-primary/30 bg-primary/10"
                        : "text-destructive border-destructive/30 bg-destructive/10",
                    )}
                  >
                    {trade.direction}
                  </Badge>
                </TableCell>
                <TableCell>{trade.strategy}</TableCell>

                {/* FIX: Use the calculator function instead of hardcoded string */}
                {showRRR && (
                  <TableCell className="text-right font-mono">
                    {calculateRRR(entry, sl, tp)}
                  </TableCell>
                )}

                {/* FIX: Use real risk data or fallback */}
                {showRisk && (
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {(trade as any).riskPercent
                      ? `${(trade as any).riskPercent}%`
                      : "—"}
                  </TableCell>
                )}

                <TableCell className="text-right font-mono">
                  {trade.entryPrice}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {trade.exitPrice || "—"}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono font-bold",
                    trade.pnl !== undefined && trade.pnl > 0
                      ? "text-profit"
                      : trade.pnl !== undefined && trade.pnl < 0
                        ? "text-loss"
                        : "text-muted-foreground",
                  )}
                >
                  {trade.pnl !== undefined
                    ? (trade.pnl > 0 ? "+" : "") + trade.pnl
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    className={cn(
                      "w-16 justify-center text-xs",
                      trade.status === "Win"
                        ? "bg-profit/20 text-profit hover:bg-profit/30"
                        : trade.status === "Loss"
                          ? "bg-loss/20 text-loss hover:bg-loss/30"
                          : trade.status === "Draft"
                            ? "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                            : "bg-muted text-muted-foreground",
                    )}
                  >
                    {trade.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1 flex justify-end">
                  {trade.status === "Draft" && (
                    <Link href={`/new-entry/${trade.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:text-primary hover:bg-primary/10 h-8 w-8 p-0"
                        data-testid={`button-edit-draft-${trade.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(trade.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                      data-testid={`button-delete-${trade.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
