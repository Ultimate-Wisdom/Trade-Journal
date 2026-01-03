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
import { Search, Filter, PlusCircle, Loader2 } from "lucide-react"; // FIXED TYPO HERE
import { Link } from "wouter";
import { useState, useEffect } from "react";

export default function Journal() {
  const [trades, setTrades] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("all");

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

  // SAFE FILTERING:
  // We check if t.pair exists before calling toLowerCase() to prevent runtime errors.
  const filteredTrades = trades.filter((t: any) => {
    const pairName = t.pair ? String(t.pair).toLowerCase() : "";
    const matchesSearch = pairName.includes(search.toLowerCase());
    const matchesStrategy =
      strategyFilter === "all" || t.strategy === strategyFilter;
    return matchesSearch && matchesStrategy;
  });

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

          <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search symbol..."
                className="pl-8 bg-card/50 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
            <Button size="sm" className="h-10">
              Export
            </Button>
          </div>

          <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
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
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
