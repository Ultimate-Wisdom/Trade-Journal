import { MobileNav } from "@/components/layout/MobileNav";
import { StrategyInsights } from "@/components/dashboard/StrategyInsights";
import { TradeTable } from "@/components/journal/TradeTable";
import { mockBacktests, RemovedStrategy } from "@/lib/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, PlusCircle, Save, Trash2, History } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Backtest() {
  const [backtests, setBacktests] = useState(mockBacktests);
  const [removedStrategies, setRemovedStrategies] = useState<RemovedStrategy[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleSave = () => {
    alert("Backtest session saved successfully!");
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this backtest entry?")) {
      setBacktests(backtests.filter((bt) => bt.id !== id));
    }
  };

  const handleRemoveStrategy = (strategyName: string, reason: string) => {
    const strategyTrades = backtests.filter((t) => t.strategy === strategyName);
    if (strategyTrades.length > 0) {
      const winCount = strategyTrades.filter((t) => t.status === "Win").length;
      const winrate = (winCount / strategyTrades.length) * 100;

      setRemovedStrategies([
        ...removedStrategies,
        {
          name: strategyName,
          removedDate: new Date().toLocaleDateString(),
          removalReason: reason,
          winrate,
          tradesCount: strategyTrades.length,
        },
      ]);

      setBacktests(backtests.filter((t) => t.strategy !== strategyName));
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-7xl">
          <header className="mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Backtest History</h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">All your backtested trades and results.</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button variant="outline" className="gap-2" onClick={() => setShowHistory(!showHistory)}>
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </Button>
              <Link href="/new-entry">
                <Button className="gap-2 w-full md:w-auto flex-1 md:flex-none">
                  <PlusCircle className="h-4 w-4" />
                  New Backtest
                </Button>
              </Link>
            </div>
          </header>

          {!showHistory ? (
            <>
              <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search symbol..."
                    className="pl-8 bg-card/50 h-10"
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full md:w-[180px] bg-card/50 h-10">
                    <SelectValue placeholder="Strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Strategies</SelectItem>
                    <SelectItem value="breakout">Breakout</SelectItem>
                    <SelectItem value="reversal">Reversal</SelectItem>
                    <SelectItem value="trend">Trend Following</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="gap-2 h-10 md:w-auto">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filters</span>
                </Button>
                <Button size="sm" className="gap-2 h-10" onClick={handleSave}>
                  <Save className="h-4 w-4" />
                  Save Session
                </Button>
              </div>

              <StrategyInsights trades={backtests} onRemoveStrategy={handleRemoveStrategy} />

              <div className="space-y-4 mt-6 md:mt-8">
                <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                  <TradeTable trades={backtests} onDelete={handleDelete} />
                </div>

                {backtests.length > 0 && (
                  <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row gap-3">
                        <Button 
                          variant="outline" 
                          className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm("Delete all backtest data for this session?")) {
                              setBacktests([]);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Clear Session
                        </Button>
                        <Button 
                          variant="outline"
                          className="gap-2"
                          onClick={handleSave}
                        >
                          <Save className="h-4 w-4" />
                          Export Session
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {backtests.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No backtest data yet. Start by creating a new backtest!</p>
                  <Link href="/new-entry">
                    <Button className="gap-2">
                      <PlusCircle className="h-4 w-4" />
                      Create Backtest Entry
                    </Button>
                  </Link>
                </div>
              )}
            </>
          ) : (
            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Removed Strategies History</CardTitle>
              </CardHeader>
              <CardContent>
                {removedStrategies.length > 0 ? (
                  <div className="space-y-4">
                    {removedStrategies.map((strategy) => (
                      <div key={strategy.name} className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{strategy.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">Win Rate: {strategy.winrate.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">Total Trades: {strategy.tradesCount}</p>
                            <p className="text-xs text-muted-foreground mt-1">Removed: {strategy.removedDate}</p>
                            <p className="text-sm text-destructive mt-2 font-medium">Reason: {strategy.removalReason}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No removed strategies yet</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
