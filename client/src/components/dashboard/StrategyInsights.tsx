import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trade, calculateStrategyWinrates, calculateTopStrategyRRRCombos } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { TrendingUp, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface StrategyInsightsProps {
  trades: Trade[];
  onRemoveStrategy?: (strategyName: string, reason: string) => void;
  title?: string;
}

export function StrategyInsights({ trades, onRemoveStrategy, title = "Strategy Insights" }: StrategyInsightsProps) {
  const strategyWinrates = calculateStrategyWinrates(trades);
  const topCombos = calculateTopStrategyRRRCombos(trades);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [removalReason, setRemovalReason] = useState("");

  const handleRemoveStrategy = () => {
    if (selectedStrategy && removalReason.trim() && onRemoveStrategy) {
      onRemoveStrategy(selectedStrategy, removalReason);
      setSelectedStrategy("");
      setRemovalReason("");
      setRemoveDialogOpen(false);
    }
  };

  return (
    <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
      <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Strategy Winrates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {strategyWinrates.length > 0 ? (
              strategyWinrates.map((strategy) => (
                <div
                  key={strategy.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-sidebar-accent/30 border border-sidebar-border group"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{strategy.name}</p>
                    <p className="text-xs text-muted-foreground">{strategy.wins}/{strategy.total} trades</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold font-mono ${
                          strategy.winrate >= 60 ? "text-profit" : strategy.winrate >= 50 ? "text-primary" : "text-destructive"
                        }`}
                      >
                        {strategy.winrate.toFixed(1)}%
                      </p>
                    </div>
                    {onRemoveStrategy && (
                      <Dialog open={removeDialogOpen && selectedStrategy === strategy.name} onOpenChange={(open) => {
                        if (open) {
                          setSelectedStrategy(strategy.name);
                          setRemoveDialogOpen(true);
                        } else {
                          setRemoveDialogOpen(false);
                          setSelectedStrategy("");
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[400px]">
                          <DialogHeader>
                            <DialogTitle>Remove Strategy: {strategy.name}</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                              <p className="text-xs text-muted-foreground">Win Rate: {strategy.winrate.toFixed(1)}%</p>
                              <p className="text-sm font-bold">Total Trades: {strategy.total}</p>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="reason" className="text-sm">
                                Reason for Removal
                              </Label>
                              <Textarea
                                id="reason"
                                placeholder="e.g., Low win rate, No longer relevant, Testing new approach..."
                                value={removalReason}
                                onChange={(e) => setRemovalReason(e.target.value)}
                                className="min-h-[100px]"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setRemoveDialogOpen(false)}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={handleRemoveStrategy}
                                disabled={!removalReason.trim()}
                                className="flex-1"
                              >
                                Remove Strategy
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">No trades yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="text-base md:text-lg">Top 3 Strategy + RRR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topCombos.length > 0 ? (
              topCombos.map((combo, index) => (
                <div key={`${combo.pair}-${combo.rrr}-${combo.name}`} className="flex items-center justify-between p-3 rounded-lg bg-sidebar-accent/30 border border-sidebar-border">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      #{index + 1} {combo.pair}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {combo.name} • {combo.wins}/{combo.total} trades
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold font-mono ${
                      combo.winrate >= 60 ? "text-profit" : combo.winrate >= 50 ? "text-primary" : "text-destructive"
                    }`}>
                      {combo.winrate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">No trades yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
