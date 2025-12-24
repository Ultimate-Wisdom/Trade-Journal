import { MobileNav } from "@/components/layout/MobileNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  mockPortfolioAssets, 
  calculateTotalNetWorth, 
  calculateLiquidCash, 
  calculateDigitalAssets,
  mockAccounts 
} from "@/lib/mockAccounts";
import { DollarSign, TrendingUp, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Portfolio() {
  const totalNetWorth = calculateTotalNetWorth();
  const liquidCash = calculateLiquidCash();
  const digitalAssets = calculateDigitalAssets();
  const changePercent = ((totalNetWorth - (totalNetWorth * 0.988)) / (totalNetWorth * 0.988)) * 100;

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-7xl">
          <header className="mb-6 md:mb-8 flex flex-col gap-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Portfolio Hub</h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">Global asset allocation and net worth overview.</p>
            </div>
          </header>

          <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-3 mb-6 md:mb-8">
            <StatsCard 
              title="Total Net Worth" 
              value={`$${(totalNetWorth / 1000).toFixed(1)}k`} 
              change={`+${changePercent.toFixed(1)}%`} 
              trend="up" 
              icon={DollarSign} 
            />
            <StatsCard 
              title="Liquid Cash (Accounts)" 
              value={`$${(liquidCash / 1000).toFixed(1)}k`} 
              trend="neutral"
              icon={TrendingUp} 
            />
            <StatsCard 
              title="Digital Assets" 
              value={`$${(digitalAssets / 1000).toFixed(1)}k`} 
              trend="neutral"
              icon={Coins} 
            />
          </div>

          <div className="grid gap-6 md:gap-4">
            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Trading Accounts Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAccounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-3 rounded-lg bg-sidebar-accent/30 border border-sidebar-border">
                      <div className="flex-1">
                        <div className="font-medium text-sm md:text-base">{account.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {account.firm && <span className="inline-block mr-3">Firm: {account.firm}</span>}
                          {account.broker && <span className="inline-block">Broker: {account.broker}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-sm md:text-base">${account.balance.toLocaleString()}</div>
                        {account.type === "prop" && (
                          <Badge variant="outline" className="text-xs mt-2">
                            Prop Firm
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Asset Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[80px]">Symbol</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Class</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockPortfolioAssets.map((asset) => (
                        <TableRow key={asset.id} className="group cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-bold font-mono text-primary">{asset.symbol}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">{asset.amount}</TableCell>
                          <TableCell className="text-right font-mono font-bold">${asset.value.toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{asset.location}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              asset.assetClass === "Digital" && "text-primary border-primary/30",
                              asset.assetClass === "Equities" && "text-accent border-accent/30",
                              asset.assetClass === "Commodities" && "text-accent-foreground border-accent/30",
                            )}>
                              {asset.assetClass}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
