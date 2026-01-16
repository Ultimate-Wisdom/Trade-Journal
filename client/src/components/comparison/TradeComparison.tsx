import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { X, GitCompare } from "lucide-react";

interface TradeComparisonProps {
  trades: any[];
  selectedTrades: string[];
  onRemoveTrade: (id: string) => void;
  onClear: () => void;
}

export function TradeComparison({ trades, selectedTrades, onRemoveTrade, onClear }: TradeComparisonProps) {
  const compareTrades = trades.filter(t => selectedTrades.includes(t.id));

  if (compareTrades.length === 0) {
    return null;
  }

  const comparisonFields = [
    { key: "symbol", label: "Symbol" },
    { key: "direction", label: "Direction" },
    { key: "entryPrice", label: "Entry Price", format: (v: any) => v ? `$${parseFloat(v).toFixed(2)}` : "—" },
    { key: "entryTime", label: "Entry Time" },
    { key: "pnl", label: "P&L", format: (v: any) => {
      const pnl = parseFloat(v || "0");
      return pnl > 0 ? `+$${pnl.toFixed(2)}` : pnl < 0 ? `-$${Math.abs(pnl).toFixed(2)}` : "$0.00";
    }, color: (v: any) => {
      const pnl = parseFloat(v || "0");
      return pnl > 0 ? "text-green-500" : pnl < 0 ? "text-red-500" : "";
    }},
    { key: "riskPercent", label: "Risk %", format: (v: any) => v ? `${v}%` : "—" },
    { key: "riskRewardRatio", label: "R:R", format: (v: any) => v || "—" },
    { key: "strategy", label: "Strategy" },
    { key: "status", label: "Status" },
    { key: "conviction", label: "Conviction", format: (v: any) => v ? `${v}/5` : "—" },
  ];

  return (
    <Card className="border-sidebar-border bg-card/50 mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-primary" />
            Compare Trades ({compareTrades.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Field</TableHead>
                {compareTrades.map((trade) => (
                  <TableHead key={trade.id} className="min-w-[200px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs">{trade.symbol || trade.pair}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onRemoveTrade(trade.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonFields.map((field) => (
                <TableRow key={field.key}>
                  <TableCell className="font-medium text-muted-foreground">
                    {field.label}
                  </TableCell>
                  {compareTrades.map((trade) => {
                    const value = trade[field.key];
                    const formatted = field.format ? field.format(value) : value || "—";
                    const colorClass = field.color ? field.color(value) : "";
                    
                    return (
                      <TableCell key={trade.id} className={colorClass}>
                        {field.key === "direction" ? (
                          <Badge
                            variant="outline"
                            className={value === "Long" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}
                          >
                            {value}
                          </Badge>
                        ) : field.key === "status" ? (
                          <Badge variant="outline">{value}</Badge>
                        ) : (
                          formatted
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}

              {/* Additional analysis */}
              <TableRow className="bg-muted/30">
                <TableCell className="font-medium">Analysis</TableCell>
                {compareTrades.map((trade) => {
                  const pnl = parseFloat(trade.pnl || "0");
                  const risk = parseFloat(trade.riskPercent || "0");
                  const rr = trade.riskRewardRatio || "";
                  
                  let analysis = [];
                  if (pnl > 0) analysis.push("✓ Profitable");
                  if (pnl < 0) analysis.push("✗ Loss");
                  if (risk <= 1) analysis.push("Low Risk");
                  if (risk > 2) analysis.push("High Risk");
                  if (rr && parseFloat(rr.split(":")[1] || "0") >= 2) analysis.push("Good R:R");
                  
                  return (
                    <TableCell key={trade.id} className="text-xs">
                      {analysis.length > 0 ? (
                        <div className="space-y-1">
                          {analysis.map((note, idx) => (
                            <div key={idx}>{note}</div>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="mt-4 p-4 rounded-lg bg-muted/30">
          <h4 className="font-medium text-sm mb-3">Comparison Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Avg P&L</p>
              <p className="font-bold">
                ${(compareTrades.reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0) / compareTrades.length).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Winning Trades</p>
              <p className="font-bold text-green-500">
                {compareTrades.filter(t => parseFloat(t.pnl || "0") > 0).length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Losing Trades</p>
              <p className="font-bold text-red-500">
                {compareTrades.filter(t => parseFloat(t.pnl || "0") < 0).length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Avg Risk</p>
              <p className="font-bold">
                {(compareTrades.reduce((sum, t) => sum + parseFloat(t.riskPercent || "0"), 0) / compareTrades.length).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
