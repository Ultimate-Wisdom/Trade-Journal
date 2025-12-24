import { MobileNav } from "@/components/layout/MobileNav";
import { TradeTable } from "@/components/journal/TradeTable";
import { mockBacktests } from "@/lib/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, PlusCircle } from "lucide-react";
import { Link } from "wouter";

export default function Backtest() {
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
            <Link href="/new-entry">
              <Button className="gap-2 w-full md:w-auto">
                <PlusCircle className="h-4 w-4" />
                New Backtest
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
            <Button size="sm" className="h-10">Export</Button>
          </div>

          <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
            <TradeTable trades={mockBacktests} />
          </div>
          
          <div className="mt-6 flex justify-center">
            <Button variant="ghost" size="sm" className="text-muted-foreground">Load more backtests</Button>
          </div>
        </div>
      </main>
    </div>
  );
}
