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
import { Trash2 } from "lucide-react";

interface TradeTableProps {
  trades: Trade[];
  onDelete?: (id: string) => void;
}

export function TradeTable({ trades, onDelete }: TradeTableProps) {
  return (
    <div className="rounded-md border bg-card/50 backdrop-blur-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[100px]">Date</TableHead>
            <TableHead>Pair</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Strategy</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead className="text-right">Entry</TableHead>
            <TableHead className="text-right">Exit</TableHead>
            <TableHead className="text-right">P&L</TableHead>
            <TableHead className="text-right">Status</TableHead>
            {onDelete && <TableHead className="w-10"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((trade) => (
            <TableRow key={trade.id} className="group cursor-pointer hover:bg-muted/50">
              <TableCell className="font-medium text-muted-foreground">{trade.date}</TableCell>
              <TableCell className="font-bold font-mono">{trade.pair}</TableCell>
              <TableCell>
                <Badge variant="outline" className={cn(
                  "font-mono text-xs",
                  trade.direction === "Long" ? "text-primary border-primary/30 bg-primary/10" : "text-destructive border-destructive/30 bg-destructive/10"
                )}>
                  {trade.direction}
                </Badge>
              </TableCell>
              <TableCell>{trade.strategy}</TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">{trade.size}</TableCell>
              <TableCell className="text-right font-mono">{trade.entry}</TableCell>
              <TableCell className="text-right font-mono">{trade.exit}</TableCell>
              <TableCell className={cn(
                "text-right font-mono font-bold",
                trade.pnl > 0 ? "text-profit" : "text-loss"
              )}>
                {trade.pnl > 0 ? "+" : ""}{trade.pnl}
              </TableCell>
              <TableCell className="text-right">
                <Badge className={cn(
                  "w-16 justify-center",
                  trade.status === "Win" ? "bg-profit/20 text-profit hover:bg-profit/30" : 
                  trade.status === "Loss" ? "bg-loss/20 text-loss hover:bg-loss/30" : 
                  "bg-muted text-muted-foreground"
                )}>
                  {trade.status}
                </Badge>
              </TableCell>
              {onDelete && (
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onDelete(trade.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}