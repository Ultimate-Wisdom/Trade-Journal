import { MobileNav } from "@/components/layout/MobileNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Save,
  Trash2,
  BarChart3,
  Trophy,
  Loader2,
  Download,
  FileText,
  FileJson,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Backtest as BacktestType } from "@shared/schema";
import { mockStrategies } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadBacktestsCSV, downloadBacktestsJSON } from "@/lib/exportUtils";

export default function Backtest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<"Long" | "Short">("Long");
  const [rrr, setRrr] = useState("");
  const [outcome, setOutcome] = useState<"TP" | "SL">("TP");
  const [strategy, setStrategy] = useState("");
  const [entryTime, setEntryTime] = useState("");
  const [newStrategyOpen, setNewStrategyOpen] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState("");
  const [strategies, setStrategies] = useState<string[]>(mockStrategies);

  // Fetch backtests
  const { data: backtests = [], isLoading } = useQuery<BacktestType[]>({
    queryKey: ["/api/backtests"],
  });

  // Create backtest mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/backtests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create backtest");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backtests"] });
      toast({
        title: "Success",
        description: "Backtest saved successfully",
      });
      // Reset form
      setSymbol("");
      setRrr("");
      setEntryTime("");
      setDirection("Long");
      setOutcome("TP");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save backtest",
        variant: "destructive",
      });
    },
  });

  // Delete backtest mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/backtests/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete backtest");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backtests"] });
      toast({
        title: "Success",
        description: "Backtest deleted successfully",
      });
    },
  });

  // Analysis calculations
  const analysis = useMemo(() => {
    if (!backtests.length) return null;

    // Overall stats
    const totalTests = backtests.length;
    const tpCount = backtests.filter(b => b.outcome === "TP").length;
    const winRate = (tpCount / totalTests) * 100;
    const avgRRR = backtests.reduce((sum, b) => sum + Number(b.rrr || 0), 0) / totalTests;

    // By strategy
    const byStrategy: Record<string, { total: number; tp: number; rrr: number[] }> = {};
    backtests.forEach(b => {
      if (!byStrategy[b.strategy]) {
        byStrategy[b.strategy] = { total: 0, tp: 0, rrr: [] };
      }
      byStrategy[b.strategy].total++;
      if (b.outcome === "TP") byStrategy[b.strategy].tp++;
      byStrategy[b.strategy].rrr.push(Number(b.rrr || 0));
    });

    const strategyStats = Object.entries(byStrategy).map(([name, data]) => ({
      name,
      winRate: (data.tp / data.total) * 100,
      total: data.total,
      avgRRR: data.rrr.reduce((a, b) => a + b, 0) / data.rrr.length,
    })).sort((a, b) => b.winRate - a.winRate);

    // By session (based on entry time)
    const sessions = {
      Asian: { start: "00:00", end: "08:59", tp: 0, total: 0 },
      London: { start: "09:00", end: "16:59", tp: 0, total: 0 },
      NewYork: { start: "17:00", end: "23:59", tp: 0, total: 0 },
    };

    backtests.forEach(b => {
      if (!b.entryTime) return;
      const time = b.entryTime;
      
      for (const [session, range] of Object.entries(sessions)) {
        if (time >= range.start && time <= range.end) {
          sessions[session as keyof typeof sessions].total++;
          if (b.outcome === "TP") {
            sessions[session as keyof typeof sessions].tp++;
          }
          break;
        }
      }
    });

    const sessionStats = Object.entries(sessions)
      .map(([name, data]) => ({
        name,
        winRate: data.total > 0 ? (data.tp / data.total) * 100 : 0,
        total: data.total,
      }))
      .filter(s => s.total > 0)
      .sort((a, b) => b.winRate - a.winRate);

    // By pair
    const byPair: Record<string, { total: number; tp: number }> = {};
    backtests.forEach(b => {
      if (!byPair[b.symbol]) {
        byPair[b.symbol] = { total: 0, tp: 0 };
      }
      byPair[b.symbol].total++;
      if (b.outcome === "TP") byPair[b.symbol].tp++;
    });

    const pairStats = Object.entries(byPair)
      .map(([symbol, data]) => ({
        symbol,
        winRate: (data.tp / data.total) * 100,
        total: data.total,
      }))
      .sort((a, b) => b.winRate - a.winRate);

    return {
      totalTests,
      winRate,
      avgRRR,
      strategyStats,
      sessionStats,
      pairStats,
      bestStrategy: strategyStats[0],
      bestSession: sessionStats[0],
      bestPair: pairStats[0],
    };
  }, [backtests]);

  const handleSave = () => {
    if (!symbol.trim() || !rrr || !strategy) {
      toast({
        title: "Validation Error",
        description: "Please fill in Symbol, RRR, and Strategy",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      symbol: symbol.toUpperCase().trim(),
      direction,
      rrr,
      outcome,
      strategy,
      entryTime: entryTime || null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-7xl">
          {/* Header */}
          <header className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Backtest Lab
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Hone your edge • Test strategies • Find your optimal setup
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Entry Form */}
            <Card className="md:col-span-1 border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Quick Entry
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">
                    Symbol/Pair <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="symbol"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    placeholder="e.g., EURUSD"
                    className="uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Direction</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={direction === "Long" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setDirection("Long")}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Long
                    </Button>
                    <Button
                      type="button"
                      variant={direction === "Short" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setDirection("Short")}
                    >
                      <TrendingDown className="h-4 w-4 mr-2" />
                      Short
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rrr">
                    Risk:Reward Ratio <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="rrr"
                    type="number"
                    step="0.1"
                    value={rrr}
                    onChange={(e) => setRrr(e.target.value)}
                    placeholder="e.g., 2.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    1:{rrr || "?"} ratio
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Outcome</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={outcome === "TP" ? "default" : "outline"}
                      className={cn(
                        "flex-1",
                        outcome === "TP" && "bg-green-600 hover:bg-green-700"
                      )}
                      onClick={() => setOutcome("TP")}
                    >
                      TP
                    </Button>
                    <Button
                      type="button"
                      variant={outcome === "SL" ? "default" : "outline"}
                      className={cn(
                        "flex-1",
                        outcome === "SL" && "bg-red-600 hover:bg-red-700"
                      )}
                      onClick={() => setOutcome("SL")}
                    >
                      SL
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="strategy">
                    Strategy <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Select value={strategy} onValueChange={setStrategy}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        {strategies.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Dialog open={newStrategyOpen} onOpenChange={setNewStrategyOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <TrendingUp className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Strategy</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                          <Input
                            placeholder="Strategy Name"
                            value={newStrategyName}
                            onChange={(e) => setNewStrategyName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newStrategyName.trim()) {
                                setStrategies([...strategies, newStrategyName.trim()]);
                                setStrategy(newStrategyName.trim());
                                setNewStrategyOpen(false);
                                setNewStrategyName("");
                              }
                            }}
                          />
                          <Button
                            className="w-full"
                            onClick={() => {
                              if (newStrategyName.trim()) {
                                setStrategies([...strategies, newStrategyName.trim()]);
                                setStrategy(newStrategyName.trim());
                                setNewStrategyOpen(false);
                                setNewStrategyName("");
                              }
                            }}
                            disabled={!newStrategyName.trim()}
                          >
                            Add Strategy
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entryTime" className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    Entry Time (24h)
                  </Label>
                  <Input
                    id="entryTime"
                    type="time"
                    value={entryTime}
                    onChange={(e) => setEntryTime(e.target.value)}
                    placeholder="14:30"
                    className="font-mono"
                    step="60"
                  />
                  <p className="text-xs text-muted-foreground">
                    24-hour format (e.g., 14:30 for 2:30 PM)
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Backtest
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Analysis */}
            <div className="md:col-span-2 space-y-6">
              {backtests.length > 0 && (
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Export Results
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          downloadBacktestsCSV(backtests);
                          toast({
                            title: "Export Successful",
                            description: `Exported ${backtests.length} backtests as CSV`,
                          });
                        }}
                        className="gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Export as CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          downloadBacktestsJSON(backtests);
                          toast({
                            title: "Export Successful",
                            description: `Exported ${backtests.length} backtests as JSON`,
                          });
                        }}
                        className="gap-2"
                      >
                        <FileJson className="h-4 w-4" />
                        Export as JSON
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              {analysis ? (
                <>
                  {/* Overall Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="border-sidebar-border bg-card/50">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Total Tests</p>
                        <p className="text-2xl font-bold">{analysis.totalTests}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-sidebar-border bg-card/50">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Win Rate</p>
                        <p className="text-2xl font-bold text-primary">
                          {analysis.winRate.toFixed(1)}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-sidebar-border bg-card/50">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Avg RRR</p>
                        <p className="text-2xl font-bold">1:{analysis.avgRRR.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Best Performers */}
                  {analysis.bestStrategy && (
                    <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          Best Performers
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Best Strategy</p>
                            <p className="text-xs text-muted-foreground">
                              {analysis.bestStrategy.name}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-primary">
                            {analysis.bestStrategy.winRate.toFixed(1)}% WR
                          </Badge>
                        </div>
                        {analysis.bestSession && (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Best Session</p>
                              <p className="text-xs text-muted-foreground">
                                {analysis.bestSession.name}
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-primary">
                              {analysis.bestSession.winRate.toFixed(1)}% WR
                            </Badge>
                          </div>
                        )}
                        {analysis.bestPair && (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Best Pair</p>
                              <p className="text-xs text-muted-foreground">
                                {analysis.bestPair.symbol}
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-primary">
                              {analysis.bestPair.winRate.toFixed(1)}% WR
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Strategy Breakdown */}
                  <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Strategy Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysis.strategyStats.map((stat) => (
                          <div
                            key={stat.name}
                            className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium">{stat.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {stat.total} tests • 1:{stat.avgRRR.toFixed(2)} avg RRR
                              </p>
                            </div>
                            <Badge
                              variant={stat.winRate >= 50 ? "default" : "secondary"}
                              className={cn(
                                stat.winRate >= 50 && "bg-green-600"
                              )}
                            >
                              {stat.winRate.toFixed(1)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Session Analysis */}
                  {analysis.sessionStats.length > 0 && (
                    <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          Session Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {analysis.sessionStats.map((stat) => (
                            <div
                              key={stat.name}
                              className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                            >
                              <div>
                                <p className="text-sm font-medium">{stat.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {stat.total} tests
                                </p>
                              </div>
                              <Badge
                                variant={stat.winRate >= 50 ? "default" : "secondary"}
                                className={cn(
                                  stat.winRate >= 50 && "bg-green-600"
                                )}
                              >
                                {stat.winRate.toFixed(1)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-12 text-center">
                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-semibold mb-2">No Backtests Yet</p>
                    <p className="text-sm text-muted-foreground">
                      Start logging your backtests to see analysis and insights
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Recent Backtests Table */}
              {backtests.length > 0 && (
                <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Recent Backtests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Symbol</TableHead>
                            <TableHead>Direction</TableHead>
                            <TableHead>Strategy</TableHead>
                            <TableHead>RRR</TableHead>
                            <TableHead>Outcome</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {backtests.slice(0, 20).map((bt) => (
                            <TableRow key={bt.id}>
                              <TableCell className="font-medium">{bt.symbol}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    bt.direction === "Long"
                                      ? "text-green-600"
                                      : "text-red-600"
                                  )}
                                >
                                  {bt.direction}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{bt.strategy}</TableCell>
                              <TableCell className="text-sm">1:{bt.rrr}</TableCell>
                              <TableCell>
                                <Badge
                                  className={cn(
                                    bt.outcome === "TP"
                                      ? "bg-green-600"
                                      : "bg-red-600"
                                  )}
                                >
                                  {bt.outcome}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {bt.entryTime || "-"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => deleteMutation.mutate(bt.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
