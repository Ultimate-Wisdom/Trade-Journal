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
import { Progress } from "@/components/ui/progress";
import { 
  calculateLiquidCash, 
  calculatePropAllocation,
  calculateTotalNetWorthWithAssets,
  calculatePropAllocationFromAssets,
  convertToUSD,
  MYR_TO_USD_RATE,
  type PortfolioAsset,
} from "@/lib/mockAccounts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Account } from "@shared/schema";
import { DollarSign, TrendingUp, Zap, Plus, Trash2, History, BadgeDollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PortfolioAsset as DBPortfolioAsset } from "@shared/schema";

const GOAL_NET_WORTH = 1000000; // $1,000,000 USD goal

export default function Portfolio() {
  const { maskValue, isPrivacyMode } = usePrivacyMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch real accounts and portfolio assets from API
  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: portfolioAssets, isLoading: isLoadingAssets } = useQuery<DBPortfolioAsset[]>({
    queryKey: ["/api/assets"],
  });

  const [open, setOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [removalReason, setRemovalReason] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "CASH",
    balance: "",
    quantity: "",
    currency: "MYR",
    location: "",
    ticker: "",
    apiId: "",
  });

  // Calculate net worth with currency conversion (uses calculatedValueUsd from API for live crypto prices)
  const totalNetWorth = calculateTotalNetWorthWithAssets(accounts || [], portfolioAssets || []);
  const liquidCash = calculateLiquidCash(accounts || []);
  const propAllocationFromAccounts = calculatePropAllocation(accounts || []);
  const propAllocationFromAssets = calculatePropAllocationFromAssets(portfolioAssets || []);
  const propAllocation = propAllocationFromAccounts + propAllocationFromAssets;
  const progressPercent = Math.min((totalNetWorth / GOAL_NET_WORTH) * 100, 100);

  // Format currency for display
  const formatCurrency = (value: number, currency: string) => {
    if (currency === "MYR") {
      return `RM ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Create asset mutation
  const createAssetMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/assets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Asset Added",
        description: "Portfolio asset has been added successfully",
      });
      setFormData({ name: "", type: "CASH", balance: "", quantity: "", currency: "MYR", location: "", ticker: "", apiId: "" });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add asset",
        variant: "destructive",
      });
    },
  });

  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      return apiRequest("DELETE", `/api/assets/${assetId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Asset Removed",
        description: "Portfolio asset has been removed successfully",
      });
      setRemoveDialogOpen(false);
      setSelectedAssetId("");
      setRemovalReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove asset",
        variant: "destructive",
      });
    },
  });

  const handleAddAsset = () => {
    // Validate based on type
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Please enter an asset name",
        variant: "destructive",
      });
      return;
    }

    if (formData.type === "CRYPTO") {
      if (!formData.quantity || !formData.ticker || !formData.apiId) {
        toast({
          title: "Validation Error",
          description: "Crypto assets require Quantity, Ticker, and CoinGecko ID",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!formData.balance) {
        toast({
          title: "Validation Error",
          description: "Please enter a balance",
          variant: "destructive",
        });
        return;
      }
    }

    createAssetMutation.mutate(formData);
  };

  const handleRemoveAsset = () => {
    if (selectedAssetId && removalReason.trim()) {
      deleteAssetMutation.mutate(selectedAssetId);
    } else {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for removal",
        variant: "destructive",
      });
    }
  };

  const handleRemoveClick = (asset: DBPortfolioAsset) => {
    setSelectedAssetId(asset.id);
    setRemoveDialogOpen(true);
  };

  // Filter out PROP_FIRM assets for display (they don't count toward net worth)
  const displayAssets = (portfolioAssets || []).filter((asset) => asset.type !== "PROP_FIRM");

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
                      <Label htmlFor="name" className="text-sm">Asset Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Bitcoin, Emergency Fund, Maybank"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="location" className="text-sm">Location</Label>
                      <Input
                        id="location"
                        placeholder="e.g., Luno, Phantom Wallet, CIMB, Maybank"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="type" className="text-sm">Type</Label>
                      <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value, balance: "", quantity: "", ticker: "", apiId: "" })}>
                        <SelectTrigger id="type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="INVESTMENT">Investment</SelectItem>
                          <SelectItem value="CRYPTO">Crypto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.type === "CRYPTO" ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="grid gap-2">
                            <Label htmlFor="ticker" className="text-sm">Ticker</Label>
                            <Input
                              id="ticker"
                              placeholder="e.g., BTC, SOL, ETH"
                              value={formData.ticker}
                              onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
                              className="font-mono uppercase"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="quantity" className="text-sm">Quantity</Label>
                            <Input
                              id="quantity"
                              placeholder="0.00000000"
                              type="number"
                              step="0.00000001"
                              value={formData.quantity}
                              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                              className="font-mono"
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="apiId" className="text-sm">CoinGecko ID</Label>
                          <Input
                            id="apiId"
                            placeholder="e.g., bitcoin, solana, ethereum"
                            value={formData.apiId}
                            onChange={(e) => setFormData({ ...formData, apiId: e.target.value.toLowerCase() })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Find IDs at <a href="https://www.coingecko.com/en/api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">coingecko.com/api</a>
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="grid gap-2">
                            <Label htmlFor="balance" className="text-sm">Balance</Label>
                            <Input
                              id="balance"
                              placeholder="0.00"
                              type="number"
                              step="0.01"
                              value={formData.balance}
                              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                              className="font-mono"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="currency" className="text-sm">Currency</Label>
                            <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                              <SelectTrigger id="currency">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MYR">MYR</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {formData.balance && formData.currency === "MYR" && (
                          <p className="text-xs text-muted-foreground">
                            ≈ ${(parseFloat(formData.balance) / MYR_TO_USD_RATE).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                          </p>
                        )}
                      </>
                    )}

                    <Button onClick={handleAddAsset} className="w-full mt-2" disabled={createAssetMutation.isPending}>
                      {createAssetMutation.isPending ? "Adding..." : "Add Asset"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          {/* Main Scoreboard Card - Large Net Worth Display with Progress Bar */}
          <Card className="mb-6 md:mb-8 border-sidebar-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <BadgeDollarSign className="h-5 w-5 text-amber-400" />
                Real Net Worth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-4xl md:text-5xl font-bold font-mono tracking-tight">
                    ${maskValue(totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Goal: $1,000,000 USD • {progressPercent.toFixed(1)}% Complete
                  </div>
                </div>
                <div className="space-y-1">
                  <Progress value={progressPercent} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>$0</span>
                    <span>$1M</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-3 mb-6 md:mb-8">
            <StatsCard 
              title="Liquid Cash (Accounts)" 
              value={`$${maskValue(liquidCash / 1000)}${isPrivacyMode ? "" : "k"}`} 
              trend="neutral"
              icon={TrendingUp} 
            />
            <StatsCard 
              title="Prop Allocation" 
              value={`$${maskValue(propAllocation / 1000)}${isPrivacyMode ? "" : "k"}`} 
              trend="neutral"
              icon={Zap} 
              className="!text-blue-400"
            />
            <StatsCard 
              title="Portfolio Assets" 
              value={`$${maskValue(displayAssets.reduce((sum, asset) => {
                // Use calculatedValueUsd from API if available, otherwise calculate manually
                if (asset.calculatedValueUsd !== null && asset.calculatedValueUsd !== undefined) {
                  return sum + asset.calculatedValueUsd;
                }
                if (asset.balance) {
                  const balance = typeof asset.balance === "string" ? parseFloat(asset.balance) : Number(asset.balance);
                  return sum + convertToUSD(balance, asset.currency);
                }
                return sum;
              }, 0) / 1000)}${isPrivacyMode ? "" : "k"}`}
              trend="neutral"
              icon={DollarSign} 
            />
          </div>

          {!showHistory ? (
            <div className="grid gap-6 md:gap-4 mt-6 md:mt-8">
              <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Portfolio Assets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Asset</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingAssets ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                              Loading assets...
                            </TableCell>
                          </TableRow>
                        ) : displayAssets.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                              No assets found. Add an asset to get started.
                            </TableCell>
                          </TableRow>
                        ) : (
                          displayAssets.map((asset) => {
                            // Get USD value (from API or calculate)
                            const usdValue = asset.calculatedValueUsd !== null && asset.calculatedValueUsd !== undefined
                              ? asset.calculatedValueUsd
                              : asset.balance
                              ? convertToUSD(typeof asset.balance === "string" ? parseFloat(asset.balance) : Number(asset.balance), asset.currency)
                              : 0;

                            // Format display based on asset type
                            const displayName = asset.location 
                              ? `${asset.name} • ${asset.location}`
                              : asset.name;

                            let displayValue: string;
                            if (asset.type === "CRYPTO" && asset.quantity && asset.ticker) {
                              const qty = typeof asset.quantity === "string" ? parseFloat(asset.quantity) : Number(asset.quantity);
                              displayValue = `${qty.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${asset.ticker}`;
                            } else if (asset.balance) {
                              const balance = typeof asset.balance === "string" ? parseFloat(asset.balance) : Number(asset.balance);
                              displayValue = formatCurrency(balance, asset.currency);
                            } else {
                              displayValue = "—";
                            }

                            return (
                              <TableRow key={asset.id} className="group cursor-pointer hover:bg-muted/50">
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{displayName}</span>
                                    <span className="text-xs text-muted-foreground">
                                      <Badge variant="outline" className="text-xs mt-0.5">
                                        {asset.type}
                                      </Badge>
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-col items-end">
                                    <span className="font-mono font-bold">
                                      ${maskValue(usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                                    </span>
                                    <span className="text-xs text-muted-foreground font-mono mt-0.5">
                                      {displayValue}
                                    </span>
                                  </div>
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
                                        onClick={() => handleRemoveClick(asset)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[400px]">
                                      <DialogHeader>
                                        <DialogTitle>Remove Asset: {asset.name}</DialogTitle>
                                      </DialogHeader>
                                      <div className="grid gap-4 py-4">
                                        <div className="p-3 rounded-lg bg-sidebar-accent/20 border border-sidebar-border">
                                          <p className="text-xs text-muted-foreground">{asset.type === "CRYPTO" ? "Quantity" : "Balance"}: {displayValue}</p>
                                          <p className="text-sm font-bold">USD Value: ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
                                            disabled={!removalReason.trim() || deleteAssetMutation.isPending}
                                            className="flex-1"
                                          >
                                            {deleteAssetMutation.isPending ? "Removing..." : "Remove"}
                                          </Button>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

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
                            ${maskValue(account.initialBalance)}
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
            </div>
          ) : (
            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Asset History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  Asset history feature coming soon.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
