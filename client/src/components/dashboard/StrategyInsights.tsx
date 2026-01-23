import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trade, calculateStrategyWinrates, calculateTopStrategyRRRCombos } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
                  className="flex flex-col items-start p-3 rounded-lg bg-sidebar-accent/30 border border-sidebar-border group relative"
                >
                  {/* Row 1: Strategy Name */}
                  <p className="text-sm font-medium text-foreground truncate w-full pr-8">
                    {strategy.name}
                  </p>
                  
                  {/* Row 2: Win Rate Percentage */}
                  <p
                    className={`text-sm font-medium mt-1 ${
                      strategy.winrate >= 50 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {strategy.winrate.toFixed(1)}%
                  </p>
                  
                  {/* Row 3: Total Trades */}
                  <p className="text-xs text-slate-500 mt-1">
                    {strategy.wins}/{strategy.total} trades
                  </p>
                  
                  {/* Delete Button (Positioned absolutely in top-right) */}
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
                          className="absolute top-2 right-2 text-destructive hover:text-destructive hover:bg-destructive/10 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
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
                <div key={`${combo.pair}-${combo.rrr}-${combo.name}`} className="flex flex-col items-start p-3 rounded-lg bg-sidebar-accent/30 border border-sidebar-border">
                  {/* Row 1: Strategy Name */}
                  <p className="text-sm font-medium text-foreground truncate w-full">
                    #{index + 1} {combo.name}
                  </p>
                  
                  {/* Row 2: Win Rate & RRR Badges (Compact, with flex-wrap) */}
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={`px-1.5 py-0.5 text-[10px] ${
                        combo.winrate >= 60 
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500" 
                          : combo.winrate >= 50 
                          ? "border-primary/50 bg-primary/10 text-primary" 
                          : "border-rose-500/50 bg-rose-500/10 text-rose-500"
                      }`}
                    >
                      {combo.winrate.toFixed(1)}%
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="px-1.5 py-0.5 text-[10px] border-amber-500/50 bg-amber-500/10 text-amber-500"
                    >
                      Avg R:R {combo.rrr}
                    </Badge>
                  </div>
                  
                  {/* Row 3: Total Trades count */}
                  <p className="text-xs text-slate-500 mt-1">
                    {combo.total} {combo.total === 1 ? 'trade' : 'trades'} • {combo.wins} {combo.wins === 1 ? 'win' : 'wins'}
                  </p>
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
