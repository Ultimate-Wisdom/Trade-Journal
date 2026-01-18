import { MobileNav } from "@/components/layout/MobileNav";
import { TradeTable } from "@/components/journal/TradeTable";
import { mockStrategies } from "@/lib/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, PlusCircle, Loader2, Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Account } from "@shared/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ExportDialog } from "@/components/export/ExportDialog";
import { BatchOperations } from "@/components/batch/BatchOperations";
import { TradeComparison } from "@/components/comparison/TradeComparison";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Journal() {
  const [trades, setTrades] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | "win" | "loss" | "breakeven">("all");
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [compareTrades, setCompareTrades] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch accounts for export
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  useEffect(() => {
    fetch("/api/trades")
      .then((res) => res.json())
      .then((data) => {
        // REMAPPING & SANITIZING:
        // We ensure every field has a fallback value to prevent "toLowerCase" or "undefined" crashes.
        const formattedData = data.map((t: any) => ({
          ...t,
          id: String(t.id),
          pair: t.symbol || t.pair || "UNKNOWN",
          entryPrice: parseFloat(t.entryPrice) || 0,
          slPrice: parseFloat(t.stopLoss) || 0,
          tpPrice: parseFloat(t.takeProfit) || 0,
          exitPrice: t.exitPrice ? parseFloat(t.exitPrice) : null,
          pnl: t.pnl ? parseFloat(t.pnl) : 0,
          date: t.createdAt
            ? new Date(t.createdAt).toLocaleDateString()
            : new Date().toLocaleDateString(),
          type: "Forex", // Category for UI display
        }));
        setTrades(formattedData);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching trades:", err);
        setIsLoading(false);
      });
  }, []);

  // Delete trade mutation
  const deleteTradeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/trades/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete trade");
      }
      return res.json();
    },
    onSuccess: () => {
      // Refetch trades list
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      // Also refetch locally using useEffect approach
      fetch("/api/trades")
        .then((res) => res.json())
        .then((data) => {
          const formattedData = data.map((t: any) => ({
            ...t,
            id: String(t.id),
            pair: t.symbol || t.pair || "UNKNOWN",
            entryPrice: parseFloat(t.entryPrice) || 0,
            slPrice: parseFloat(t.stopLoss) || 0,
            tpPrice: parseFloat(t.takeProfit) || 0,
            exitPrice: t.exitPrice ? parseFloat(t.exitPrice) : null,
            pnl: t.pnl ? parseFloat(t.pnl) : 0,
            date: t.createdAt
              ? new Date(t.createdAt).toLocaleDateString()
              : new Date().toLocaleDateString(),
            type: "Forex",
          }));
          setTrades(formattedData);
        })
        .catch((err) => {
          console.error("Error fetching trades:", err);
        });
      
      setDeleteDialogOpen(false);
      setTradeToDelete(null);
      toast({
        title: "Trade deleted",
        description: "The trade has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete trade",
      });
    },
  });

  const handleDeleteTrade = () => {
    if (tradeToDelete) {
      deleteTradeMutation.mutate(tradeToDelete);
    }
  };

  // SAFE FILTERING:
  // Enhanced search across multiple fields (symbol, notes, psychology, mistakes, improvements, strategy)
  const filteredTrades = trades.filter((t: any) => {
    const searchLower = search.toLowerCase();
    
    // Search across multiple fields
    const pairName = t.pair ? String(t.pair).toLowerCase() : "";
    const notes = t.notes ? String(t.notes).toLowerCase() : "";
    const psychology = t.psychology ? String(t.psychology).toLowerCase() : "";
    const mistakes = t.mistakes ? String(t.mistakes).toLowerCase() : "";
    const improvements = t.improvements ? String(t.improvements).toLowerCase() : "";
    const strategy = t.strategy ? String(t.strategy).toLowerCase() : "";
    const setup = t.setup ? String(t.setup).toLowerCase() : "";
    
    const matchesSearch = 
      pairName.includes(searchLower) ||
      notes.includes(searchLower) ||
      psychology.includes(searchLower) ||
      mistakes.includes(searchLower) ||
      improvements.includes(searchLower) ||
      strategy.includes(searchLower) ||
      setup.includes(searchLower);
    
    const matchesStrategy =
      strategyFilter === "all" || t.strategy === strategyFilter;
    
    // Outcome filter
    const pnl = parseFloat(t.pnl || "0");
    let matchesOutcome = true;
    if (outcomeFilter === "win") {
      matchesOutcome = pnl > 0;
    } else if (outcomeFilter === "loss") {
      matchesOutcome = pnl < 0;
    } else if (outcomeFilter === "breakeven") {
      matchesOutcome = pnl === 0;
    }
    
    return matchesSearch && matchesStrategy && matchesOutcome;
  });

  // Calculate filter counts
  const filterCounts = {
    all: trades.length,
    win: trades.filter((t: any) => parseFloat(t.pnl || "0") > 0).length,
    loss: trades.filter((t: any) => parseFloat(t.pnl || "0") < 0).length,
    breakeven: trades.filter((t: any) => parseFloat(t.pnl || "0") === 0).length,
  };


  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-7xl">
          <header className="mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Trade Journal
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Your live and real trading history.
              </p>
            </div>
            <Link href="/new-entry">
              <Button className="gap-2 w-full md:w-auto">
                <PlusCircle className="h-4 w-4" />
                New Entry
              </Button>
            </Link>
          </header>

          {/* Quick Filters */}
          <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2">
            <Button
              variant={outcomeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setOutcomeFilter("all")}
              className={cn(
                "gap-1 h-9 px-3 whitespace-nowrap",
                outcomeFilter === "all" && "bg-primary"
              )}
            >
              All Trades
              <Badge variant="secondary" className="h-5 min-w-[20px] justify-center text-xs px-1">
                {filterCounts.all}
              </Badge>
            </Button>
            <Button
              variant={outcomeFilter === "win" ? "default" : "outline"}
              size="sm"
              onClick={() => setOutcomeFilter("win")}
              className={cn(
                "flex flex-row items-center gap-1 h-9 px-2 whitespace-nowrap",
                outcomeFilter === "win"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "border-green-600/30 text-green-600 hover:bg-green-600/10"
              )}
            >
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Wins</span>
              <span className="sm:hidden font-mono font-semibold text-xs">TP</span>
              <Badge
                variant="secondary"
                className={cn(
                  "h-5 min-w-[20px] justify-center text-xs px-1",
                  outcomeFilter === "win" ? "bg-green-700" : "bg-green-600/20"
                )}
              >
                {filterCounts.win}
              </Badge>
            </Button>
            <Button
              variant={outcomeFilter === "loss" ? "default" : "outline"}
              size="sm"
              onClick={() => setOutcomeFilter("loss")}
              className={cn(
                "flex flex-row items-center gap-1 h-9 px-2 whitespace-nowrap",
                outcomeFilter === "loss"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "border-red-600/30 text-red-600 hover:bg-red-600/10"
              )}
            >
              <TrendingDown className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Losses</span>
              <span className="sm:hidden font-mono font-semibold text-xs">SL</span>
              <Badge
                variant="secondary"
                className={cn(
                  "h-5 min-w-[20px] justify-center text-xs px-1",
                  outcomeFilter === "loss" ? "bg-red-700" : "bg-red-600/20"
                )}
              >
                {filterCounts.loss}
              </Badge>
            </Button>
            <Button
              variant={outcomeFilter === "breakeven" ? "default" : "outline"}
              size="sm"
              onClick={() => setOutcomeFilter("breakeven")}
              className={cn(
                "flex flex-row items-center gap-1 h-9 px-2 whitespace-nowrap",
                outcomeFilter === "breakeven"
                  ? "bg-gray-600 hover:bg-gray-700 text-white"
                  : "border-gray-600/30 text-gray-600 hover:bg-gray-600/10"
              )}
            >
              <Minus className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Breakeven</span>
              <span className="sm:hidden font-mono font-semibold text-xs">BE</span>
              <Badge
                variant="secondary"
                className={cn(
                  "h-5 min-w-[20px] justify-center text-xs px-1",
                  outcomeFilter === "breakeven" ? "bg-gray-700" : "bg-gray-600/20"
                )}
              >
                {filterCounts.breakeven}
              </Badge>
            </Button>
          </div>

          <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search trades (symbol, notes, psychology, strategy...)..."
                className="pl-8 bg-card/50 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <p className="text-xs text-muted-foreground mt-1 ml-1">
                  Searching across: symbol, notes, psychology, mistakes, improvements, strategy, setup
                </p>
              )}
            </div>
            <Select value={strategyFilter} onValueChange={setStrategyFilter}>
              <SelectTrigger className="w-full md:w-[180px] bg-card/50 h-10">
                <SelectValue placeholder="Strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Strategies</SelectItem>
                {mockStrategies.map((strat) => (
                  <SelectItem key={strat} value={strat}>
                    {strat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-10 md:w-auto"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
            <ExportDialog 
              trades={filteredTrades}
              accounts={accounts}
              trigger={
                <Button size="sm" className="h-10 gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              }
            />
          </div>

          {/* Trade Comparison */}
          <TradeComparison
            trades={trades}
            selectedTrades={compareTrades}
            onRemoveTrade={(id) => setCompareTrades(prev => prev.filter(t => t !== id))}
            onClear={() => setCompareTrades([])}
          />

          {/* Batch Operations - Hidden on mobile */}
          <div className="hidden md:block">
            <BatchOperations
              trades={filteredTrades}
              selectedTrades={selectedTrades}
              onSelectionChange={setSelectedTrades}
            />
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Loading your trades...</p>
            </div>
          ) : (
            <TradeTable
              trades={filteredTrades}
              showAccount={true}
              showRRR={true}
              showRisk={true}
              onDelete={(id) => {
                setTradeToDelete(id);
                setDeleteDialogOpen(true);
              }}
            />
          )}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trade</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this trade? This action cannot be undone and will permanently remove the trade from your journal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTradeToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTrade}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTradeMutation.isPending}
            >
              {deleteTradeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
