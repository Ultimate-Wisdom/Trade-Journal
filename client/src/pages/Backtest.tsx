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
  Save,
  Trash2,
  BarChart3,
  Trophy,
  Loader2,
  Star,
  Zap,
  Clock,
  Plus,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Strategy } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Local backtest interface (temporary, before database integration)
interface LocalBacktest {
  id: string;
  symbol: string;
  direction: "Long" | "Short";
  rrr: string;
  outcome: "TP" | "SL";
  strategy: string;
  entryTime: string;
  session?: "Asian" | "London" | "NY";
  confluenceScore?: number;
  createdAt: Date;
}

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
  const [session, setSession] = useState<"Asian" | "London" | "NY" | "">("");
  const [confluenceScore, setConfluenceScore] = useState<number>(3);
  const [newStrategyName, setNewStrategyName] = useState("");
  const [newStrategyOpen, setNewStrategyOpen] = useState(false);

  // Fetch ALL strategies (Active + Experimental) for Backtest Lab
  const { data: allStrategies = [] } = useQuery<Strategy[]>({
    queryKey: ["/api/strategies", "all"],
    queryFn: async () => {
      const res = await fetch("/api/strategies", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch strategies");
      return res.json();
    },
  });

  // Create strategy mutation (automatically sets status to 'experimental')
  const createStrategyMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, status: "experimental" }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create strategy");
      return res.json();
    },
    onSuccess: (newStrategy) => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      setStrategy(newStrategy.name);
      setNewStrategyOpen(false);
      setNewStrategyName("");
      toast({
        title: "Success",
        description: `Experimental strategy "${newStrategy.name}" created`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create strategy",
        variant: "destructive",
      });
    },
  });

  // Extract strategy names for dropdown
  const strategyNames = useMemo(() => {
    return allStrategies.map(s => s.name).sort();
  }, [allStrategies]);

  // Local state for backtests (temporary)
  const [localBacktests, setLocalBacktests] = useState<LocalBacktest[]>([]);

  // Convert 24h time to 12h format for preview
  const format12Hour = (time24: string): string => {
    if (!time24 || typeof time24 !== 'string') return '';
    const parts = time24.split(':');
    if (parts.length !== 2) return '';
    
    const hour = parseInt(parts[0], 10);
    const minute = parts[1];
    
    if (isNaN(hour) || hour < 0 || hour > 23) return '';
    if (!minute || minute.length !== 2) return '';
    
    const minuteNum = parseInt(minute, 10);
    if (isNaN(minuteNum) || minuteNum < 0 || minuteNum > 59) return '';
    
    if (hour === 0) {
      return `12:${minute} AM`;
    } else if (hour === 12) {
      return `12:${minute} PM`;
    } else if (hour < 12) {
      return `${hour}:${minute} AM`;
    } else {
      return `${hour - 12}:${minute} PM`;
    }
  };

  // Handle time input with smart masking
  const handleTimeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Remove all non-numeric characters
    value = value.replace(/\D/g, '');
    
    // Limit to 4 digits
    if (value.length > 4) {
      value = value.slice(0, 4);
    }
    
    // Auto-insert colon after 2nd digit
    if (value.length >= 2) {
      const hours = value.slice(0, 2);
      const minutes = value.slice(2);
      
      // Validate hours (00-23)
      const hourNum = parseInt(hours, 10);
      if (hourNum > 23) {
        // If first digit is 2, second can only be 0-3
        if (hours[0] === '2' && parseInt(hours[1], 10) > 3) {
          value = hours[0] + '3' + minutes;
        } else if (hours[0] > '2') {
          // If first digit is 3-9, cap at 23
          value = '23' + minutes;
        }
      }
      
      // Validate minutes (00-59)
      if (minutes.length >= 2) {
        const minuteNum = parseInt(minutes.slice(0, 2), 10);
        if (minuteNum > 59) {
          value = hours + '59';
        } else {
          value = hours + ':' + minutes.slice(0, 2);
        }
      } else {
        value = hours + (minutes ? ':' + minutes : '');
      }
    }
    
    setEntryTime(value);
  };

  // Auto-detect session based on current time
  const autoDetectSession = (): "Asian" | "London" | "NY" => {
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 0 && hour < 8) return "Asian";
    if (hour >= 8 && hour < 16) return "London";
    return "NY";
  };

  // Initialize session on mount
  useEffect(() => {
    if (!session) {
      setSession(autoDetectSession());
    }
  }, []);

  // Calculate simulation stats
  const simulationStats = useMemo(() => {
    if (localBacktests.length === 0) {
      return {
        winRate: 0,
        expectancy: 0,
        totalPnL: 0,
      };
    }

    const totalTests = localBacktests.length;
    const tpCount = localBacktests.filter((b) => b.outcome === "TP").length;
    const winRate = (tpCount / totalTests) * 100;

    // Calculate expectancy: (Win Rate * Avg RRR) - (Loss Rate * 1)
    const avgRRR = localBacktests.reduce((sum, b) => sum + Number(b.rrr || 0), 0) / totalTests;
    const lossRate = 100 - winRate;
    const expectancy = (winRate / 100) * avgRRR - (lossRate / 100) * 1;

    // Calculate total simulated PnL (assuming 1 unit risk per trade)
    const totalPnL = localBacktests.reduce((sum, b) => {
      if (b.outcome === "TP") {
        return sum + Number(b.rrr || 0); // Win: +RRR units
      } else {
        return sum - 1; // Loss: -1 unit
      }
    }, 0);

    return {
      winRate: Math.round(winRate * 10) / 10,
      expectancy: Math.round(expectancy * 100) / 100,
      totalPnL: Math.round(totalPnL * 100) / 100,
    };
  }, [localBacktests]);

  // Generate equity curve data for mini chart
  const equityCurveData = useMemo(() => {
    if (localBacktests.length === 0) return [];
    
    let runningEquity = 0;
    return localBacktests.map((bt, index) => {
      if (bt.outcome === "TP") {
        runningEquity += Number(bt.rrr || 0);
      } else {
        runningEquity -= 1;
      }
      return {
        index: index + 1,
        equity: runningEquity,
      };
    });
  }, [localBacktests]);

  const handleSave = () => {
    if (!symbol.trim() || !rrr || !strategy) {
      toast({
        title: "Validation Error",
        description: "Please fill in Symbol, RRR, and Strategy",
        variant: "destructive",
      });
      return;
    }

    // Create new backtest entry
    const newBacktest: LocalBacktest = {
      id: `bt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      symbol: symbol.toUpperCase().trim(),
      direction,
      rrr,
      outcome,
      strategy,
      entryTime: entryTime || "",
      session: session || autoDetectSession(),
      confluenceScore,
      createdAt: new Date(),
    };

    // Add to local state
    setLocalBacktests((prev) => [newBacktest, ...prev]);

    // Reset form
    setSymbol("");
    setRrr("");
    setEntryTime("");
    setDirection("Long");
    setOutcome("TP");
    setConfluenceScore(3);

    toast({
      title: "Success",
      description: "Backtest logged successfully",
    });
  };

  const handleDelete = (id: string) => {
    setLocalBacktests((prev) => prev.filter((bt) => bt.id !== id));
    toast({
      title: "Deleted",
      description: "Backtest removed",
    });
  };

  // Format currency for PnL
  const formatPnL = (value: number): string => {
    if (value >= 0) {
      return `+${value.toFixed(2)}`;
    }
    return value.toFixed(2);
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-[1600px]">
          {/* Header */}
          <header className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Simulation Engine
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Real-time strategy testing • Edge validation • Performance simulation
            </p>
          </header>

          {/* Split View Layout */}
          <div className="grid gap-6 md:grid-cols-10">
            {/* Left Panel: Quick Entry Form (30%) */}
            <div className="md:col-span-3">
              <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm border border-primary/20">
                <CardHeader className="border-b border-border/50">
                  <CardTitle className="text-base flex items-center gap-2 font-mono">
                    <Zap className="h-4 w-4 text-primary" />
                    Quick Entry
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="symbol" className="text-xs font-mono text-muted-foreground">
                      SYMBOL <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="symbol"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      placeholder="EURUSD"
                      className="uppercase font-mono bg-background/50 border-border/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-mono text-muted-foreground">DIRECTION</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={direction === "Long" ? "default" : "outline"}
                        className={cn(
                          "flex-1 font-mono text-xs",
                          direction === "Long" && "bg-success-green hover:bg-success-green/90"
                        )}
                        onClick={() => setDirection("Long")}
                      >
                        <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                        LONG
                      </Button>
                      <Button
                        type="button"
                        variant={direction === "Short" ? "default" : "outline"}
                        className={cn(
                          "flex-1 font-mono text-xs",
                          direction === "Short" && "bg-red-600 hover:bg-red-700"
                        )}
                        onClick={() => setDirection("Short")}
                      >
                        <TrendingDown className="h-3.5 w-3.5 mr-1.5" />
                        SHORT
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rrr" className="text-xs font-mono text-muted-foreground">
                      RISK:REWARD <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="rrr"
                      type="number"
                      step="0.1"
                      value={rrr}
                      onChange={(e) => setRrr(e.target.value)}
                      placeholder="2.5"
                      className="font-mono bg-background/50 border-border/50"
                    />
                    <p className="text-[10px] text-muted-foreground font-mono">
                      1:{rrr || "?"} ratio
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-mono text-muted-foreground">OUTCOME</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={outcome === "TP" ? "default" : "outline"}
                        className={cn(
                          "flex-1 font-mono text-xs",
                          outcome === "TP" && "bg-success-green hover:bg-success-green/90"
                        )}
                        onClick={() => setOutcome("TP")}
                      >
                        TP
                      </Button>
                      <Button
                        type="button"
                        variant={outcome === "SL" ? "default" : "outline"}
                        className={cn(
                          "flex-1 font-mono text-xs",
                          outcome === "SL" && "bg-red-600 hover:bg-red-700"
                        )}
                        onClick={() => setOutcome("SL")}
                      >
                        SL
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="strategy" className="text-xs font-mono text-muted-foreground">
                      STRATEGY <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Select value={strategy} onValueChange={setStrategy}>
                        <SelectTrigger className="flex-1 font-mono text-xs bg-background/50 border-border/50">
                          <SelectValue placeholder="Select strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          {strategyNames.map((s) => (
                            <SelectItem key={s} value={s} className="font-mono text-xs">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Dialog open={newStrategyOpen} onOpenChange={setNewStrategyOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" className="font-mono text-xs">
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="font-mono">Create Experimental Strategy</DialogTitle>
                          </DialogHeader>
                          <div className="py-4 space-y-4">
                            <Input
                              placeholder="Strategy Name"
                              value={newStrategyName}
                              onChange={(e) => setNewStrategyName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && newStrategyName.trim()) {
                                  createStrategyMutation.mutate(newStrategyName.trim());
                                }
                              }}
                              className="font-mono"
                            />
                            <p className="text-xs text-muted-foreground">
                              This strategy will be marked as "experimental" and only visible in the Backtest Lab.
                            </p>
                            <Button
                              className="w-full font-mono text-xs"
                              onClick={() => {
                                if (newStrategyName.trim()) {
                                  createStrategyMutation.mutate(newStrategyName.trim());
                                }
                              }}
                              disabled={!newStrategyName.trim() || createStrategyMutation.isPending}
                            >
                              {createStrategyMutation.isPending ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                "Create Experimental Strategy"
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confluence" className="text-xs font-mono text-muted-foreground">
                      CONFLUENCE SCORE
                    </Label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setConfluenceScore(score)}
                          className={cn(
                            "p-1.5 rounded transition-colors",
                            confluenceScore >= score
                              ? "text-yellow-400"
                              : "text-muted-foreground/30"
                          )}
                        >
                          <Star
                            className={cn(
                              "h-4 w-4",
                              confluenceScore >= score && "fill-current"
                            )}
                          />
                        </button>
                      ))}
                      <span className="text-xs text-muted-foreground font-mono ml-2">
                        {confluenceScore}/5
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="session" className="text-xs font-mono text-muted-foreground">
                      SESSION
                    </Label>
                    <Select
                      value={session}
                      onValueChange={(value) => setSession(value as "Asian" | "London" | "NY")}
                    >
                      <SelectTrigger className="font-mono text-xs bg-background/50 border-border/50">
                        <SelectValue placeholder="Auto-detect" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asian" className="font-mono text-xs">
                          Asian
                        </SelectItem>
                        <SelectItem value="London" className="font-mono text-xs">
                          London
                        </SelectItem>
                        <SelectItem value="NY" className="font-mono text-xs">
                          NY
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="entryTime" className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      ENTRY TIME
                    </Label>
                    <div className="space-y-1">
                      <Input
                        id="entryTime"
                        type="text"
                        placeholder="HH:MM"
                        value={entryTime}
                        onChange={handleTimeInput}
                        className="font-mono max-w-[100px] bg-background/50 border-border/50"
                        maxLength={5}
                      />
                      {entryTime && entryTime.includes(':') && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {format12Hour(entryTime)}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      Type 4 digits (e.g., 1323 → 13:23)
                    </p>
                  </div>

                  <Button
                    className="w-full font-mono text-xs bg-primary hover:bg-primary/90"
                    onClick={handleSave}
                  >
                    <Save className="h-3.5 w-3.5 mr-2" />
                    SAVE BACKTEST
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel: Stats, Chart, History (70%) */}
            <div className="md:col-span-7 space-y-6">
              {/* Top Row: 3 Stats Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground font-mono mb-1">SIMULATED WIN RATE</p>
                    <p className="text-2xl font-bold font-mono text-primary">
                      {simulationStats.winRate.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                      {localBacktests.length} tests
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground font-mono mb-1">PROJECTED EXPECTANCY</p>
                    <p className={cn(
                      "text-2xl font-bold font-mono",
                      simulationStats.expectancy >= 0 ? "text-success-green" : "text-red-500"
                    )}>
                      {formatPnL(simulationStats.expectancy)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                      Per unit risk
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground font-mono mb-1">TOTAL SIMULATED P&L</p>
                    <p className={cn(
                      "text-2xl font-bold font-mono",
                      simulationStats.totalPnL >= 0 ? "text-success-green" : "text-red-500"
                    )}>
                      {formatPnL(simulationStats.totalPnL)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                      Units
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Middle Row: Mini Equity Curve */}
              <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-mono flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Equity Curve
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {equityCurveData.length > 0 ? (
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={equityCurveData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id="colorBacktest" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#666" vertical={false} opacity={0.1} />
                          <XAxis
                            dataKey="index"
                            stroke="#666"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={4}
                          />
                          <YAxis
                            stroke="#666"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={4}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(0, 0, 0, 0.9)",
                              border: "1px solid rgba(148, 163, 184, 0.3)",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontFamily: "monospace",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="equity"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorBacktest)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      <p className="text-sm font-mono">No data yet. Log backtests to see equity curve.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bottom Row: Dense History Table */}
              <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-mono">History (Last 10)</CardTitle>
                </CardHeader>
                <CardContent>
                  {localBacktests.length > 0 ? (
                    <div className="rounded-md border border-border/50">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border/50">
                            <TableHead className="font-mono text-xs h-8">Symbol</TableHead>
                            <TableHead className="font-mono text-xs h-8">Dir</TableHead>
                            <TableHead className="font-mono text-xs h-8">Strategy</TableHead>
                            <TableHead className="font-mono text-xs h-8">R:R</TableHead>
                            <TableHead className="font-mono text-xs h-8">Outcome</TableHead>
                            <TableHead className="font-mono text-xs h-8">Session</TableHead>
                            <TableHead className="font-mono text-xs h-8">Score</TableHead>
                            <TableHead className="font-mono text-xs h-8"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {localBacktests.slice(0, 10).map((bt) => (
                            <TableRow key={bt.id} className="border-border/50">
                              <TableCell className="font-mono text-xs py-2">{bt.symbol}</TableCell>
                              <TableCell className="py-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] font-mono",
                                    bt.direction === "Long"
                                      ? "text-success-green border-success-green/30"
                                      : "text-red-500 border-red-500/30"
                                  )}
                                >
                                  {bt.direction}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs py-2">{bt.strategy}</TableCell>
                              <TableCell className="font-mono text-xs py-2">1:{bt.rrr}</TableCell>
                              <TableCell className="py-2">
                                <Badge
                                  className={cn(
                                    "text-[10px] font-mono",
                                    bt.outcome === "TP"
                                      ? "bg-success-green"
                                      : "bg-red-600"
                                  )}
                                >
                                  {bt.outcome}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs py-2 text-muted-foreground">
                                {bt.session || "-"}
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((score) => (
                                    <Star
                                      key={score}
                                      className={cn(
                                        "h-2.5 w-2.5",
                                        (bt.confluenceScore || 0) >= score
                                          ? "text-yellow-400 fill-current"
                                          : "text-muted-foreground/20"
                                      )}
                                    />
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="py-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleDelete(bt.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm font-mono">No backtests logged yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
