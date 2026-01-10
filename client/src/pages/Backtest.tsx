import { MobileNav } from "@/components/layout/MobileNav";
import { StrategyInsights } from "@/components/dashboard/StrategyInsights";
import { Backtest as BacktestType, RemovedStrategy, Trade } from "@/lib/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  PlusCircle,
  Save,
  Trash2,
  History,
  TrendingUp,
  TrendingDown,
  BarChart3,
  DollarSign,
  AlertCircle,
  Download,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
export default function Backtest() {
  const { toast } = useToast();
  const [backtests, setBacktests] = useState<BacktestType[]>([]);
  const [removedStrategies, setRemovedStrategies] = useState<RemovedStrategy[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  // Transform Backtest to Trade format for StrategyInsights component
  const backtestsAsTrades = useMemo(() => {
    return backtests.map((bt) => {
      // Calculate wins based on winRate
      const wins = Math.round((bt.winRate / 100) * bt.totalTrades);
      // Create a synthetic Trade object for display purposes
      // Note: We provide dummy values for price fields to satisfy the Trade interface
      // but StrategyInsights will only use status, pnl, and strategy for calculations
      return {
        id: bt.id,
        pair: bt.pair,
        type: "Forex" as const,
        direction: "Long" as const,
        entryPrice: 1, // Dummy value - not used in winrate calculations
        slPrice: 0.9, // Dummy value - not used in winrate calculations
        tpPrice: 1.1, // Dummy value - not used in winrate calculations
        quantity: 1, // Dummy value
        status: "Closed" as const, // All backtests are considered closed
        date: bt.date,
        strategy: bt.strategy,
        pnl: bt.totalTrades > 0 ? (bt.pnl || 0) / bt.totalTrades : 0, // Average PnL per trade
        notes: bt.notes,
      } as Trade;
    });
  }, [backtests]);

  // Filter backtests
  const filteredBacktests = useMemo(() => {
    return backtests.filter((bt) => {
      const matchesSearch =
        bt.pair.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bt.strategy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bt.notes.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStrategy = strategyFilter === "all" || bt.strategy === strategyFilter;
      return matchesSearch && matchesStrategy;
    });
  }, [backtests, searchQuery, strategyFilter]);

  // Get unique strategies for filter
  const availableStrategies = useMemo(() => {
    return Array.from(new Set(backtests.map((bt) => bt.strategy))).sort();
  }, [backtests]);

  const handleSave = () => {
    toast({
      title: "Session Saved",
      description: "Backtest session has been saved successfully.",
    });
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(backtests, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `backtest-session-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Backtest data has been exported.",
    });
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      setBacktests(backtests.filter((bt) => bt.id !== deleteTargetId));
      toast({
        title: "Deleted",
        description: "Backtest entry has been removed.",
      });
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
    }
  };

  const handleClearAll = () => {
    setClearAllDialogOpen(true);
  };

  const confirmClearAll = () => {
    setBacktests([]);
    toast({
      title: "Session Cleared",
      description: "All backtest data has been removed.",
      variant: "destructive",
    });
    setClearAllDialogOpen(false);
  };

  const handleRemoveStrategy = (strategyName: string, reason: string) => {
    const strategyBacktests = backtests.filter((t) => t.strategy === strategyName);
    if (strategyBacktests.length > 0) {
      // Calculate average winrate for this strategy
      const avgWinrate =
        strategyBacktests.reduce((sum, bt) => sum + bt.winRate, 0) /
        strategyBacktests.length;

      setRemovedStrategies([
        ...removedStrategies,
        {
          name: strategyName,
          removedDate: new Date().toLocaleDateString(),
          removalReason: reason,
          winrate: avgWinrate,
          tradesCount: strategyBacktests.reduce((sum, bt) => sum + bt.totalTrades, 0),
        },
      ]);

      setBacktests(backtests.filter((t) => t.strategy !== strategyName));
      toast({
        title: "Strategy Removed",
        description: `${strategyName} has been removed from backtests.`,
      });
    }
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (filteredBacktests.length === 0) {
      return {
        totalPnL: 0,
        avgWinRate: 0,
        avgProfitFactor: 0,
        totalTrades: 0,
      };
    }

    const totalPnL = filteredBacktests.reduce((sum, bt) => sum + bt.pnl, 0);
    const avgWinRate =
      filteredBacktests.reduce((sum, bt) => sum + bt.winRate, 0) /
      filteredBacktests.length;
    const avgProfitFactor =
      filteredBacktests.reduce((sum, bt) => sum + bt.profitFactor, 0) /
      filteredBacktests.length;
    const totalTrades = filteredBacktests.reduce((sum, bt) => sum + bt.totalTrades, 0);

    return {
      totalPnL,
      avgWinRate,
      avgProfitFactor,
      totalTrades,
    };
  }, [filteredBacktests]);

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-7xl">
          {/* Header */}
          <header className="mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Backtest History
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Review and analyze your backtested trading strategies.
              </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {showHistory ? "Back to Backtests" : "Removed Strategies"}
                </span>
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
              {/* Search and Filters */}
              <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by pair, strategy, or notes..."
                    className="pl-8 bg-card/50 h-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Select value={strategyFilter} onValueChange={setStrategyFilter}>
                  <SelectTrigger className="w-full md:w-[200px] bg-card/50 h-10">
                    <SelectValue placeholder="Filter by strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Strategies</SelectItem>
                    {availableStrategies.map((strategy) => (
                      <SelectItem key={strategy} value={strategy}>
                        {strategy}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 h-10 md:w-auto"
                  onClick={handleSave}
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Save Session</span>
                </Button>
              </div>

              {/* Summary Stats */}
              {filteredBacktests.length > 0 && (
                <div className="grid gap-4 md:gap-4 grid-cols-2 md:grid-cols-4 mb-6">
                  <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Total P&L</p>
                          <p
                            className={cn(
                              "text-xl font-bold font-mono",
                              summaryStats.totalPnL >= 0 ? "text-profit" : "text-destructive"
                            )}
                          >
                            {summaryStats.totalPnL >= 0 ? "+" : ""}
                            ${summaryStats.totalPnL.toLocaleString()}
                          </p>
                        </div>
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Avg Win Rate</p>
                          <p className="text-xl font-bold font-mono text-primary">
                            {summaryStats.avgWinRate.toFixed(1)}%
                          </p>
                        </div>
                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Avg Profit Factor</p>
                          <p className="text-xl font-bold font-mono text-primary">
                            {summaryStats.avgProfitFactor.toFixed(2)}
                          </p>
                        </div>
                        <BarChart3 className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Total Trades</p>
                          <p className="text-xl font-bold font-mono">
                            {summaryStats.totalTrades}
                          </p>
                        </div>
                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Strategy Insights */}
              {backtestsAsTrades.length > 0 && backtests.some(bt => bt.strategy) && (
                <StrategyInsights
                  trades={backtestsAsTrades}
                  onRemoveStrategy={handleRemoveStrategy}
                  title="Backtest Strategy Insights"
                />
              )}

              {/* Backtest Table */}
              <div className="space-y-4 mt-6 md:mt-8">
                {filteredBacktests.length > 0 ? (
                  <>
                    <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg">Backtest Results</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead>Date</TableHead>
                                <TableHead>Pair</TableHead>
                                <TableHead>Strategy</TableHead>
                                <TableHead className="text-right">Total Trades</TableHead>
                                <TableHead className="text-right">Win Rate</TableHead>
                                <TableHead className="text-right">Profit Factor</TableHead>
                                <TableHead className="text-right">P&L</TableHead>
                                <TableHead className="w-16"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredBacktests.map((backtest) => (
                                <TableRow
                                  key={backtest.id}
                                  className="group cursor-pointer hover:bg-muted/50"
                                >
                                  <TableCell className="font-medium text-muted-foreground">
                                    {new Date(backtest.date).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </TableCell>
                                  <TableCell className="font-bold font-mono">
                                    {backtest.pair}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="font-mono text-xs">
                                      {backtest.strategy}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {backtest.totalTrades}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <span
                                        className={cn(
                                          "font-mono font-bold",
                                          backtest.winRate >= 60
                                            ? "text-profit"
                                            : backtest.winRate >= 50
                                              ? "text-primary"
                                              : "text-destructive"
                                        )}
                                      >
                                        {backtest.winRate.toFixed(1)}%
                                      </span>
                                      {backtest.winRate >= 60 ? (
                                        <TrendingUp className="h-4 w-4 text-profit" />
                                      ) : backtest.winRate < 50 ? (
                                        <TrendingDown className="h-4 w-4 text-destructive" />
                                      ) : null}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {backtest.profitFactor.toFixed(2)}
                                  </TableCell>
                                  <TableCell
                                    className={cn(
                                      "text-right font-mono font-bold",
                                      backtest.pnl >= 0 ? "text-profit" : "text-destructive"
                                    )}
                                  >
                                    {backtest.pnl >= 0 ? "+" : ""}${backtest.pnl.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(backtest.id);
                                      }}
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                      <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-3">
                          <Button
                            variant="outline"
                            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={handleClearAll}
                          >
                            <Trash2 className="h-4 w-4" />
                            Clear All Backtests
                          </Button>
                          <Button variant="outline" className="gap-2" onClick={handleExport}>
                            <Download className="h-4 w-4" />
                            Export Session
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                    <CardContent className="pt-12 pb-12">
                      <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">
                          {searchQuery || strategyFilter !== "all"
                            ? "No backtests match your filters."
                            : "No backtest data yet. Start by creating a new backtest!"}
                        </p>
                        {searchQuery || strategyFilter !== "all" ? (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSearchQuery("");
                              setStrategyFilter("all");
                            }}
                          >
                            Clear Filters
                          </Button>
                        ) : (
                          <Link href="/new-entry">
                            <Button className="gap-2">
                              <PlusCircle className="h-4 w-4" />
                              Create Backtest Entry
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : (
            /* Removed Strategies History */
            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Removed Strategies History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {removedStrategies.length > 0 ? (
                  <div className="space-y-4">
                    {removedStrategies.map((strategy) => (
                      <div
                        key={strategy.name}
                        className="p-4 rounded-lg bg-destructive/10 border border-destructive/30"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-semibold text-sm">{strategy.name}</p>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  strategy.winrate >= 60
                                    ? "border-profit text-profit"
                                    : strategy.winrate >= 50
                                      ? "border-primary text-primary"
                                      : "border-destructive text-destructive"
                                )}
                              >
                                {strategy.winrate.toFixed(1)}% WR
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <p>Total Trades: {strategy.tradesCount}</p>
                              <p>Removed: {strategy.removedDate}</p>
                            </div>
                            <p className="text-sm text-destructive mt-2 font-medium">
                              Reason: {strategy.removalReason}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No removed strategies yet
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Backtest Entry</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this backtest entry? This action cannot be
                  undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmDelete}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Clear All Confirmation Dialog */}
          <Dialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Clear All Backtests</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete all backtest data for this session? This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setClearAllDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmClearAll}>
                  Clear All
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
