import { MobileNav } from "@/components/layout/MobileNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  calculateTotalNetWorth, 
  calculateLiquidCash, 
  calculateDigitalAssets,
  PortfolioAsset,
  RemovedAsset,
} from "@/lib/mockAccounts";
import { useQuery } from "@tanstack/react-query";
import { Account } from "@shared/schema";
import { DollarSign, TrendingUp, Coins, Plus, Trash2, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";

export default function Portfolio() {
  // Fetch real accounts from API
  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [removedAssets, setRemovedAssets] = useState<RemovedAsset[]>([]);
  const [open, setOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [removalReason, setRemovalReason] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [formData, setFormData] = useState({
    symbol: "",
    amount: "",
    value: "",
    location: "",
    assetClass: "Digital",
  });

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const handleAddAsset = () => {
    if (formData.symbol && formData.amount && formData.value) {
      const newAsset: PortfolioAsset = {
        id: String(Date.now()),
        symbol: formData.symbol.toUpperCase(),
        amount: parseFloat(formData.amount),
        value: parseFloat(formData.value),
        location: formData.location || "Personal",
        assetClass: formData.assetClass,
      };
      setAssets([...assets, newAsset]);
      setFormData({ symbol: "", amount: "", value: "", location: "", assetClass: "Digital" });
      setOpen(false);
    }
  };

  const handleRemoveAsset = () => {
    if (selectedAssetId && removalReason.trim()) {
      const asset = assets.find((a) => a.id === selectedAssetId);
      if (asset) {
        setRemovedAssets([
          ...removedAssets,
          {
            ...asset,
            removedDate: new Date().toLocaleDateString(),
            removalReason,
          },
        ]);
        setAssets(assets.filter((a) => a.id !== selectedAssetId));
        setSelectedAssetId("");
        setRemovalReason("");
        setRemoveDialogOpen(false);
      }
    }
  };

  const totalNetWorth = calculateTotalNetWorth(accounts || [], assets);
  const liquidCash = calculateLiquidCash(accounts || []);
  const digitalAssets = calculateDigitalAssets(assets);
  const changePercent = ((totalNetWorth - (totalNetWorth * 0.988)) / (totalNetWorth * 0.988)) * 100;

  const pieData = assets.map((asset) => ({
    name: asset.symbol,
    value: asset.value,
  }));

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-7xl">
          <header className="mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Portfolio Hub</h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">Global asset allocation and net worth overview.</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button variant="outline" className="gap-2" onClick={() => setShowHistory(!showHistory)}>
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 w-full md:w-auto flex-1 md:flex-none">
                    <Plus className="h-4 w-4" />
                    Add Asset
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Asset to Portfolio</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="symbol" className="text-sm">Symbol</Label>
                      <Input
                        id="symbol"
                        placeholder="e.g. BTC, ETH, SPY"
                        value={formData.symbol}
                        onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                        className="font-mono uppercase"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="amount" className="text-sm">Amount</Label>
                        <Input
                          id="amount"
                          placeholder="0.00"
                          type="number"
                          step="0.01"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          className="font-mono"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="value" className="text-sm">Value ($)</Label>
                        <Input
                          id="value"
                          placeholder="0.00"
                          type="number"
                          step="0.01"
                          value={formData.value}
                          onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                          className="font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="location" className="text-sm">Location</Label>
                      <Input
                        id="location"
                        placeholder="e.g. Wallet, Exchange, Safe"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="class" className="text-sm">Asset Class</Label>
                      <Select value={formData.assetClass} onValueChange={(value) => setFormData({ ...formData, assetClass: value })}>
                        <SelectTrigger id="class">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Digital">Digital</SelectItem>
                          <SelectItem value="Stablecoin">Stablecoin</SelectItem>
                          <SelectItem value="Equities">Equities</SelectItem>
                          <SelectItem value="Commodities">Commodities</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddAsset} className="w-full mt-2">
                      Add Asset
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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

          {!showHistory ? (
            <div className="grid gap-6 md:gap-4 md:grid-cols-3">
              <Card className="md:col-span-2 border-sidebar-border bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Asset Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      No assets to display
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Asset Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {assets.map((asset, index) => (
                      <div key={asset.id} className="flex items-center justify-between p-2 rounded-lg bg-sidebar-accent/20">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <div>
                            <p className="text-sm font-semibold">{asset.symbol}</p>
                            <p className="text-xs text-muted-foreground">{asset.amount}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">${asset.value.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {((asset.value / pieData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {!showHistory ? (
            <div className="grid gap-6 md:gap-4 mt-6 md:mt-8">
              <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Trading Accounts Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(accounts || []).map((account) => (
                      <div key={account.id} className="flex items-center justify-between p-3 rounded-lg bg-sidebar-accent/30 border border-sidebar-border group">
                        <div className="flex-1">
                          <div className="font-medium text-sm md:text-base">{account.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="inline-block">{account.type} Account</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-sm md:text-base">
                            ${Number(account.initialBalance || 0).toLocaleString()}
                          </div>
                          <Badge variant="outline" className="text-xs mt-2">
                            {account.type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {(!accounts || accounts.length === 0) && (
                      <p className="text-center text-muted-foreground text-sm py-4">
                        No accounts found. Add an account to get started.
                      </p>
                    )}
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
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assets.map((asset) => (
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
                              )}>
                                {asset.assetClass}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Dialog open={removeDialogOpen && selectedAssetId === asset.id} onOpenChange={(open) => {
                                if (open) {
                                  setSelectedAssetId(asset.id);
                                  setRemoveDialogOpen(true);
                                } else {
                                  setRemoveDialogOpen(false);
                                  setSelectedAssetId("");
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[400px]">
                                  <DialogHeader>
                                    <DialogTitle>Remove Asset: {asset.symbol}</DialogTitle>
                                  </DialogHeader>
                                  <div className="grid gap-4 py-4">
                                    <div className="p-3 rounded-lg bg-sidebar-accent/20 border border-sidebar-border">
                                      <p className="text-xs text-muted-foreground">Amount: {asset.amount}</p>
                                      <p className="text-sm font-bold">Value: ${asset.value.toLocaleString()}</p>
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="reason" className="text-sm">Reason for Removal</Label>
                                      <Textarea
                                        id="reason"
                                        placeholder="e.g., Sold position, Account closed, Loss of access..."
                                        value={removalReason}
                                        onChange={(e) => setRemovalReason(e.target.value)}
                                        className="min-h-[100px]"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button variant="outline" onClick={() => setRemoveDialogOpen(false)} className="flex-1">
                                        Cancel
                                      </Button>
                                      <Button 
                                        variant="destructive" 
                                        onClick={handleRemoveAsset} 
                                        disabled={!removalReason.trim()}
                                        className="flex-1"
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Removed Assets History</CardTitle>
              </CardHeader>
              <CardContent>
                {removedAssets.length > 0 ? (
                  <div className="space-y-4">
                    {removedAssets.map((asset) => (
                      <div key={asset.id} className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{asset.symbol} - ${asset.value.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground mt-1">Removed: {asset.removedDate}</p>
                            <p className="text-xs text-muted-foreground mt-1">Location: {asset.location}</p>
                            <p className="text-sm text-destructive mt-2 font-medium">Reason: {asset.removalReason}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No removed assets yet</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
