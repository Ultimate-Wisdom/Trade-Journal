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
import { Trade, Account } from "@shared/schema";
import { Trash2, Edit2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useDateFormat } from "@/hooks/useDateFormat";

interface TradeTableProps {
  trades: Trade[];
  onDelete?: (id: string) => void;
  showAccount?: boolean;
  showRRR?: boolean;
  showRisk?: boolean;
}

// Helper to calculate Reward-to-Risk Ratio
const calculateRRR = (entry: number, sl?: number, tp?: number) => {
  if (!sl || !tp || entry === sl) return "—";

  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);

  if (risk === 0) return "—";

  const ratio = reward / risk;
  return `1:${ratio.toFixed(1)}`;
};

export function TradeTable({
  trades,
  onDelete,
  showAccount,
  showRRR,
  showRisk,
}: TradeTableProps) {
  // Use date formatting hook that respects user settings
  const { formatDate } = useDateFormat();
  
  // Fetch accounts for display names
  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  // Helper to get account name from ID
  const getAccountName = (accountId: string | null | undefined) => {
    if (!accountId || !accounts) return "—";
    const account = accounts.find(a => a.id === accountId);
    if (account) return account.name;
    // Account was deleted but trade still references it - show "Deleted Account"
    return "Deleted Account";
  };

  return (
    <div className="rounded-md border bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
        <Table className="min-w-[800px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[100px]">Date</TableHead>
            {showAccount && <TableHead>Account</TableHead>}
            <TableHead>Symbol</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Strategy</TableHead>
            {showRRR && <TableHead className="text-right">RRR</TableHead>}
            {showRisk && <TableHead className="text-right">Risk %</TableHead>}
            <TableHead>Exit Condition</TableHead>
            <TableHead className="text-right">P&L</TableHead>
            <TableHead className="text-right">Status</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={9 + (showAccount ? 1 : 0) + (showRRR ? 1 : 0) + (showRisk ? 1 : 0)} 
                className="text-center text-muted-foreground py-8"
              >
                No trades yet. Create your first trade to get started.
              </TableCell>
            </TableRow>
          ) : (
            trades.map((trade) => {
              // Convert strings to numbers for calculations
              const entry = Number(trade.entryPrice);
              const sl = trade.stopLoss ? Number(trade.stopLoss) : undefined;
              const tp = trade.takeProfit ? Number(trade.takeProfit) : undefined;
              const pnl = trade.pnl ? Number(trade.pnl) : undefined;
              const riskPercent = trade.riskPercent ? Number(trade.riskPercent) : undefined;

              // Determine status from trade data
              const status = trade.status || "Open";
              
              // Determine exit condition
              // Check for both null/undefined and empty string
              const hasExitCondition = trade.exitCondition && trade.exitCondition.trim() !== "";
              let exitCondition = hasExitCondition ? trade.exitCondition : "—";
              let exitConditionBadge = null;
              
              if (status === "Closed") {
                if (hasExitCondition) {
                  exitCondition = trade.exitCondition;
                } else {
                  // Auto-determine based on P&L if not set
                  if (pnl === undefined || pnl === null) {
                    exitCondition = "—";
                  } else if (pnl === 0) {
                    exitCondition = "Breakeven";
                  } else if (pnl < 0) {
                    exitCondition = "Stop Loss";
                  } else {
                    exitCondition = "Take Profit";
                  }
                }
              } else {
                exitCondition = "—";
              }
              
              // Normalize exit condition for badge display (handle both full names and short forms)
              const normalizedExitCondition = exitCondition.toLowerCase();
              const isStopLoss = normalizedExitCondition === "stop loss" || normalizedExitCondition === "sl";
              const isTakeProfit = normalizedExitCondition === "take profit" || normalizedExitCondition === "tp";
              const isBreakeven = normalizedExitCondition === "breakeven" || normalizedExitCondition === "be";
              const isManualClose = normalizedExitCondition.includes("manual close");
              
              // Badge styling based on exit condition
              if (isStopLoss) {
                exitConditionBadge = <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30 font-mono text-xs">SL</Badge>;
              } else if (isTakeProfit) {
                exitConditionBadge = <Badge className="bg-profit/20 text-profit hover:bg-profit/30 font-mono text-xs">TP</Badge>;
              } else if (isBreakeven) {
                exitConditionBadge = <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 font-mono text-xs">BE</Badge>;
              } else if (isManualClose) {
                exitConditionBadge = (
                  <Badge 
                    className="bg-orange-500/20 text-orange-500 hover:bg-orange-500/30 font-mono text-xs cursor-help" 
                    title={trade.exitReason || "Manual close"}
                  >
                    Manual
                  </Badge>
                );
              } else {
                exitConditionBadge = <span className="text-muted-foreground text-xs">—</span>;
              }

              return (
                <TableRow
                  key={trade.id}
                  className="group cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium text-muted-foreground">
                    {formatDate(trade.entryDate || trade.createdAt)}
                  </TableCell>

                  {showAccount && (
                    <TableCell className="text-xs opacity-70 max-w-[120px] truncate">
                      {getAccountName(trade.accountId)}
                    </TableCell>
                  )}

                  <TableCell className="font-bold font-mono whitespace-nowrap">
                    {trade.symbol}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono text-xs whitespace-nowrap",
                        trade.direction === "Long"
                          ? "text-primary border-primary/30 bg-primary/10"
                          : "text-destructive border-destructive/30 bg-destructive/10",
                      )}
                    >
                      {trade.direction}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-sm max-w-[150px] truncate">
                    {trade.strategy || "—"}
                  </TableCell>

                  {showRRR && (
                    <TableCell className="text-right font-mono">
                      {trade.rrr ? `1:${Number(trade.rrr).toFixed(1)}` : calculateRRR(entry, sl, tp)}
                    </TableCell>
                  )}

                  {showRisk && (
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {riskPercent ? `${riskPercent.toFixed(1)}%` : "—"}
                    </TableCell>
                  )}

                  <TableCell>
                    {exitConditionBadge}
                  </TableCell>

                  <TableCell
                    className={cn(
                      "text-right font-mono font-bold",
                      pnl !== undefined && pnl > 0
                        ? "text-profit"
                        : pnl !== undefined && pnl < 0
                          ? "text-loss"
                          : "text-muted-foreground",
                    )}
                  >
                    {pnl !== undefined
                      ? `${pnl > 0 ? "+" : ""}$${pnl.toFixed(2)}`
                      : "—"}
                  </TableCell>

                  <TableCell className="text-right">
                    <Badge
                      className={cn(
                        "w-16 justify-center text-xs",
                        status === "Closed" && pnl && pnl > 0
                          ? "bg-profit/20 text-profit hover:bg-profit/30"
                          : status === "Closed" && pnl && pnl < 0
                            ? "bg-loss/20 text-loss hover:bg-loss/30"
                            : status === "Open"
                              ? "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                              : "bg-muted text-muted-foreground",
                      )}
                    >
                      {status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right space-x-1 flex justify-end">
                    <Link href={`/new-entry/${trade.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:text-primary hover:bg-primary/10 h-8 w-8 p-0"
                        data-testid={`button-edit-${trade.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </Link>
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
            })
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );}