import { Sidebar } from "@/components/layout/Sidebar";
import { TradeTable } from "@/components/journal/TradeTable";
import { mockTrades } from "@/lib/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

export default function Journal() {
  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-8 max-w-7xl">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Journal</h1>
              <p className="text-muted-foreground">Detailed history of all your backtested trades.</p>
            </div>
          </header>

          <div className="mb-6 flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search symbol, notes..."
                className="pl-8 bg-card/50"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px] bg-card/50">
                <SelectValue placeholder="Strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Strategies</SelectItem>
                <SelectItem value="breakout">Breakout</SelectItem>
                <SelectItem value="reversal">Reversal</SelectItem>
                <SelectItem value="trend">Trend Following</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              More Filters
            </Button>
            <div className="flex-1" />
            <Button>Export CSV</Button>
          </div>

          <TradeTable trades={[...mockTrades, ...mockTrades, ...mockTrades]} />
          
          <div className="mt-4 flex justify-center">
            <Button variant="ghost" size="sm" className="text-muted-foreground">Load more trades</Button>
          </div>
        </div>
      </main>
    </div>
  );
}