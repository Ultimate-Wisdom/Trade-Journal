import { MobileNav } from "@/components/layout/MobileNav";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  calculateLiquidCash, 
  calculatePropAllocation,
  calculatePropAllocationFromAssets,
} from "@/lib/mockAccounts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Account } from "@shared/schema";
import { DollarSign, TrendingUp, Zap, Plus, Trash2, History, Pencil, Landmark, Wallet, CircleDollarSign, Coins, MoreVertical, ChartPie } from "lucide-react";
import { SiBitcoin, SiSolana, SiEthereum, SiTether } from "react-icons/si";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { useState, useEffect } from "react";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PortfolioAsset as DBPortfolioAsset } from "@shared/schema";

type PortfolioAssetWithCalculated = DBPortfolioAsset & {
  calculatedValueUsd?: number | null;
};

const GOAL_NET_WORTH = 1000000;

// Smart Icon System Helper
const getAssetIcon = (asset: PortfolioAssetWithCalculated) => {
  const ticker = asset.ticker?.toUpperCase();
  
  if (ticker === 'BTC') {
    return { Icon: SiBitcoin, color: 'text-orange-400', bg: 'bg-orange-500/20' };
  } else if (ticker === 'SOL') {
    return { Icon: SiSolana, color: 'text-purple-400', bg: 'bg-purple-500/20' };
  } else if (ticker === 'ETH') {
    return { Icon: SiEthereum, color: 'text-blue-400', bg: 'bg-blue-500/20' };
  } else if (ticker === 'USDT') {
    return { Icon: SiTether, color: 'text-green-400', bg: 'bg-green-500/20' };
  } else if (ticker === 'USDC') {
    return { Icon: CircleDollarSign, color: 'text-blue-400', bg: 'bg-blue-500/20' };
  } else if (asset.type === 'CASH' || asset.type === 'INVESTMENT') {
    return { Icon: Landmark, color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
  } else {
    return { Icon: Wallet, color: 'text-gray-400', bg: 'bg-gray-500/20' };
  }
};

export default function Portfolio() {
  const { isPrivacyMode, maskValue } = usePrivacyMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: accounts } = useQuery<Account[]>({ queryKey: ["/api/accounts"] });
  const { data: portfolioAssets, isLoading: isLoadingAssets } = useQuery<PortfolioAssetWithCalculated[]>({ 
    queryKey: ["/api/assets"] 
  });

  // Mobile detection for Chart Legend positioning
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Selected slice state for tap-to-reveal
  const [selectedSlice, setSelectedSlice] = useState<any>(null);

  const [open, setOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<PortfolioAssetWithCalculated | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [editingAsset, setEditingAsset] = useState<PortfolioAssetWithCalculated | null>(null);
  const [formData, setFormData] = useState({
    name: "", type: "CASH", balance: "", quantity: "", currency: "MYR", location: "", locationType: "", ticker: "", apiId: "", iconColor: "",
  });

  const displayAssets = (portfolioAssets || []).filter((asset) => asset.type !== "PROP_FIRM");
  
  // 1. Calculate Asset Wealth using the Server's USD value
  const assetWealthTotal = displayAssets.reduce((sum, asset) => {
    const value = (asset.calculatedValueUsd !== null && asset.calculatedValueUsd !== undefined) 
      ? Number(asset.calculatedValueUsd) 
      : Number(asset.balance || 0);
    return sum + value;
  }, 0);
  
  // 2. Add Trading Account balances (excluding Prop Firms)
  const personalAccountsTotal = (accounts || [])
    .filter((acc) => acc.type === "Live" || acc.type === "Demo")
    .reduce((sum, acc) => sum + (Number(acc.initialBalance) || 0), 0);
  
  // 3. Absolute Total Net Worth
  const totalNetWorthWithAccounts = assetWealthTotal + personalAccountsTotal;
  
  const liquidCash = calculateLiquidCash(accounts || []);
  const propAllocation = calculatePropAllocation(accounts || []) + calculatePropAllocationFromAssets(portfolioAssets || []);
  const progressPercent = Math.min((totalNetWorthWithAccounts / GOAL_NET_WORTH) * 100, 100);

  // Dynamic Asset Allocation Data (Grouped by Ticker/Currency)
  const allocationData = (() => {
    const colors = ["#10b981", "#6366f1", "#f59e0b", "#3b82f6", "#8b5cf6"];
    const groupedMap: Record<string, number> = {};

    // 1. Group Data
    (displayAssets || []).forEach((asset) => {
      const value = (asset.calculatedValueUsd !== null && asset.calculatedValueUsd !== undefined)
        ? Number(asset.calculatedValueUsd)
        : Number(asset.balance || 0);
      
      if (value > 0) {
        // Determine Group Key
        let key = asset.name;
        if (asset.type === 'CRYPTO' && asset.ticker) {
          key = asset.ticker.toUpperCase(); // Group all SOL, BTC, etc.
        } else if (asset.type === 'CASH' && asset.currency) {
          key = asset.currency.toUpperCase(); // Group all MYR, USD, etc.
        }
        
        groupedMap[key] = (groupedMap[key] || 0) + value;
      }
    });

    // 2. Add Trading Accounts
    if (personalAccountsTotal > 0) {
      groupedMap["Trading Accounts"] = (groupedMap["Trading Accounts"] || 0) + personalAccountsTotal;
    }

    // 3. Convert to Array & Sort
    const assetList = Object.entries(groupedMap).map(([name, value]) => ({ name, value }));
    assetList.sort((a, b) => b.value - a.value);

    // 4. Top 4 + Others
    const top4 = assetList.slice(0, 4);
    const others = assetList.slice(4);
    const othersTotal = others.reduce((sum, item) => sum + item.value, 0);

    const data = top4.map((item, index) => ({
      name: item.name,
      value: item.value,
      fill: colors[index % colors.length],
    }));

    if (othersTotal > 0) {
      data.push({ name: "Others", value: othersTotal, fill: "#6b7280" });
    }

    return data;
  })();

  const formatCurrency = (value: number, currency: string = "USD") => {
    const symbol = currency === "MYR" ? "RM " : "$";
    return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Mutations
  const createAssetMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/assets", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/assets"] }); toast({ title: "Asset Added", description: "Portfolio asset has been added successfully" }); setFormData({ name: "", type: "CASH", balance: "", quantity: "", currency: "MYR", location: "", locationType: "", ticker: "", apiId: "", iconColor: "" }); setOpen(false); },
    onError: (error: any) => { toast({ title: "Error", description: error.message || "Failed to add asset", variant: "destructive" }); },
  });

  const updateAssetMutation = useMutation({
    mutationFn: ({ assetId, data }: any) => apiRequest("PUT", `/api/assets/${assetId}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/assets"] }); toast({ title: "Asset Updated", description: "Portfolio asset has been updated successfully" }); setFormData({ name: "", type: "CASH", balance: "", quantity: "", currency: "MYR", location: "", locationType: "", ticker: "", apiId: "", iconColor: "" }); setEditingAsset(null); setOpen(false); },
    onError: (error: any) => { toast({ title: "Error", description: error.message || "Failed to update asset", variant: "destructive" }); },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (assetId: string) => apiRequest("DELETE", `/api/assets/${assetId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/assets"] }); toast({ title: "Asset Removed", description: "Portfolio asset has been removed successfully" }); setRemoveDialogOpen(false); setSelectedAssetId(""); setSelectedAsset(null); setRemovalReason(""); },
    onError: (error: any) => { toast({ title: "Error", description: error.message || "Failed to remove asset", variant: "destructive" }); },
  });

  const handleEditClick = (asset: PortfolioAssetWithCalculated) => {
    setEditingAsset(asset);
    setFormData({ 
      name: asset.name || "", 
      type: asset.type || "CASH", 
      balance: String(asset.balance || ""), 
      quantity: String(asset.quantity || ""), 
      currency: asset.currency || "MYR", 
      location: asset.location || "", 
      locationType: "", // Location type is not stored in DB, so reset on edit
      ticker: asset.ticker || "", 
      apiId: asset.apiId || "",
      iconColor: (asset as any).iconColor || "",
    });
    setOpen(true);
  };

  const handleRemoveClick = (asset: PortfolioAssetWithCalculated) => {
    setSelectedAssetId(asset.id);
    setSelectedAsset(asset);
    setRemoveDialogOpen(true);
  };

  const handleRemoveAsset = () => {
    if (selectedAssetId && removalReason.trim()) {
      deleteAssetMutation.mutate(selectedAssetId);
      setRemovalReason("");
    } else {
      toast({ title: "Validation Error", description: "Please provide a reason for removal", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto p-0 md:p-6 max-w-7xl">
          <header className="mb-6 flex justify-between items-center px-4 md:px-0">
            <h1 className="text-2xl md:text-3xl font-bold">Portfolio Hub</h1>
            <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Asset</Button>
          </header>

          {/* MAIN SCOREBOARD & ALLOCATION CHART */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* LEFT: COMMAND CENTER (Net Worth + Stats Merged) */}
            <Card className="lg:col-span-2 border-sidebar-border bg-card/50 flex flex-col justify-between">
              <CardContent className="pt-6 h-full flex flex-col justify-between">
                {/* Top Section: Main Net Worth */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" /> Real Net Worth
                    </p>
                    <div className="text-5xl md:text-6xl font-bold font-mono tracking-tight">
                      {isPrivacyMode ? "****" : formatCurrency(totalNetWorthWithAccounts)}
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Goal: $1,000,000</span>
                      <span>{progressPercent.toFixed(1)}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-3" />
                  </div>
                </div>
                {/* Divider */}
                <div className="h-px bg-border my-6 opacity-50" />
                {/* Bottom Section: The Merged Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Stat 1: Liquid Cash */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Wallet className="h-4 w-4 text-emerald-400" /> Liquid Cash
                    </div>
                    <div className="text-xl font-bold font-mono">
                      {isPrivacyMode ? "****" : formatCurrency(liquidCash)}
                    </div>
                  </div>
                  {/* Stat 2: Prop Allocation */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Zap className="h-4 w-4 text-blue-400" /> Prop Allocation
                    </div>
                    <div className="text-xl font-bold font-mono">
                      {isPrivacyMode ? "****" : formatCurrency(propAllocation)}
                    </div>
                  </div>
                  {/* Stat 3: Assets */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4 text-amber-400" /> Assets
                    </div>
                    <div className="text-xl font-bold font-mono">
                      {isPrivacyMode ? "****" : formatCurrency(assetWealthTotal)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* RIGHT: MEGA DONUT CHART */}
            <Card className="border-sidebar-border bg-card/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Coins className="h-4 w-4" /> Allocation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {allocationData.length > 0 ? (
                  <div className="h-[400px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allocationData}
                          cx="50%"
                          cy="50%"
                          innerRadius="75%"
                          outerRadius="95%"
                          paddingAngle={5}
                          cornerRadius={6}
                          dataKey="value"
                          onClick={(data) => {
                            if (selectedSlice && selectedSlice.name === data.name) {
                              setSelectedSlice(null);
                            } else {
                              setSelectedSlice(data);
                            }
                          }}
                          stroke="none"
                        >
                          {allocationData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.fill} 
                              style={{ 
                                opacity: selectedSlice && selectedSlice.name !== entry.name ? 0.3 : 1,
                                transition: 'opacity 0.3s ease',
                                outline: 'none'
                              }} 
                              className="cursor-pointer"
                            />
                          ))}
                        </Pie>
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          iconType="circle" 
                          iconSize={8}
                          formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* CENTER TEXT */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        {selectedSlice ? selectedSlice.name : "TOTAL ASSETS"}
                      </span>
                      <span className="text-2xl font-bold font-mono mt-1">
                        {selectedSlice 
                          ? (isPrivacyMode ? "****" : formatCurrency(selectedSlice.value as number))
                          : (isPrivacyMode ? "****" : formatCurrency(totalNetWorthWithAccounts))
                        }
                      </span>
                      {selectedSlice && (
                        <span className="text-xs text-emerald-500 font-medium mt-1">
                          {(((selectedSlice.value as number) / totalNetWorthWithAccounts) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">No assets to display</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-sidebar-border bg-card/50">
            <CardHeader><CardTitle className="text-lg">Portfolio Assets</CardTitle></CardHeader>
            <CardContent className="p-0 md:p-6">
              {/* HEADER ROW (Hidden on very small screens if needed, or kept simple) */}
              <div className="flex items-center px-4 py-2 border-b text-sm font-medium text-muted-foreground">
                <div className="flex-1">Asset</div>
                <div className="text-right w-[100px] md:w-[200px]">Value (USD)</div>
                <div className="w-[32px]"></div> {/* Spacer for Action Button */}
              </div>
              {/* ASSET LIST */}
              {isLoadingAssets ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">Loading...</div>
              ) : displayAssets.map((asset) => {
                const usdValue = (asset.calculatedValueUsd !== null && asset.calculatedValueUsd !== undefined)
                  ? Number(asset.calculatedValueUsd)
                  : Number(asset.balance || 0);
                let subtext;
                if (asset.type === "CRYPTO") {
                  subtext = `${Number(asset.quantity).toLocaleString()} ${asset.ticker}`;
                } else if (asset.currency === "MYR") {
                  subtext = `RM ${Number((asset as any).originalBalance || asset.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
                } else {
                  subtext = formatCurrency(Number(asset.balance));
                }
                // Icon Color Logic
                const customColor = (asset as any).iconColor;
                let iconColorClass;
                if (customColor) {
                  const colorMap: Record<string, string> = {
                    "emerald-500": "bg-emerald-500/10 text-emerald-500",
                    "blue-500": "bg-blue-500/10 text-blue-500",
                    "indigo-500": "bg-indigo-500/10 text-indigo-500",
                    "violet-500": "bg-violet-500/10 text-violet-500",
                    "amber-500": "bg-amber-500/10 text-amber-500",
                    "rose-500": "bg-rose-500/10 text-rose-500",
                  };
                  iconColorClass = colorMap[customColor] || 'bg-gray-500/10 text-gray-500';
                } else {
                  const { bg, color } = getAssetIcon(asset);
                  iconColorClass = `${bg} ${color}`;
                }
                
                const { Icon } = getAssetIcon(asset);
                return (
                  <div key={asset.id} className="flex items-center justify-between p-3 md:p-4 hover:bg-muted/50 transition-colors">
                    
                    {/* LEFT: ICON + NAME (Takes all available space) */}
                    <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
                      <div className={`flex items-center justify-center h-8 w-8 md:h-10 md:w-10 rounded-full shrink-0 ${iconColorClass}`}>
                        <Icon className="h-4 w-4 md:h-5 md:w-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate text-sm md:text-base">{asset.name}</span>
                        <span className="text-xs text-muted-foreground truncate hidden sm:inline-block">
                          {asset.location}
                        </span>
                      </div>
                    </div>
                    {/* RIGHT: VALUE (Fixed width constraint not needed, just flex behavior) */}
                    <div className="text-right shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-bold text-sm md:text-base">
                          {isPrivacyMode ? "****" : formatCurrency(usdValue)}
                        </span>
                        <span className="text-[10px] md:text-xs text-muted-foreground font-mono">
                          {subtext}
                        </span>
                      </div>
                    </div>
                    {/* FAR RIGHT: ACTION MENU */}
                    <div className="ml-2 md:ml-4 shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(asset)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleRemoveClick(asset)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Add/Edit Asset Dialog */}
          <Dialog open={open} onOpenChange={(open) => {
            setOpen(open);
            if (!open) {
              setFormData({ name: "", type: "CASH", balance: "", quantity: "", currency: "MYR", location: "", locationType: "", ticker: "", apiId: "", iconColor: "" });
              setEditingAsset(null);
            }
          }}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingAsset ? "Edit Asset" : "Add Asset to Portfolio"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-sm">Asset Name</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm">Location Category</Label>
                  <Select 
                    value={formData.locationType}
                    onValueChange={(value) => setFormData({ ...formData, locationType: value })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank">Bank</SelectItem>
                      <SelectItem value="Exchange">Exchange</SelectItem>
                      <SelectItem value="Crypto Wallet">Crypto Wallet</SelectItem>
                      <SelectItem value="Investment">Investment</SelectItem>
                      <SelectItem value="Physical">Physical Asset</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location" className="text-sm">Provider Name</Label>
                  <Input 
                    id="location" 
                    placeholder="e.g. Maybank, Binance, Ledger Nano"
                    value={formData.location} 
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="iconColor" className="text-sm">Icon Color</Label>
                  <div className="flex gap-2">
                    {[
                      { value: "emerald-500", bg: "bg-emerald-500" },
                      { value: "blue-500", bg: "bg-blue-500" },
                      { value: "indigo-500", bg: "bg-indigo-500" },
                      { value: "violet-500", bg: "bg-violet-500" },
                      { value: "amber-500", bg: "bg-amber-500" },
                      { value: "rose-500", bg: "bg-rose-500" },
                    ].map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, iconColor: color.value })}
                        className={`w-10 h-10 rounded-full ${color.bg} border-2 transition-all ${
                          formData.iconColor === color.value
                            ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                            : "border-transparent hover:scale-105"
                        }`}
                        aria-label={`Select ${color.value} color`}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type" className="text-sm">Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value, balance: "", quantity: "", ticker: "", apiId: "" })}>
                    <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="INVESTMENT">Investment</SelectItem>
                      <SelectItem value="CRYPTO">Crypto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Form Logic for Crypto vs Cash remains same */}
                {formData.type === "CRYPTO" ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2"><Label htmlFor="ticker" className="text-sm">Ticker</Label><Input id="ticker" value={formData.ticker} onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })} /></div>
                      <div className="grid gap-2"><Label htmlFor="quantity" className="text-sm">Quantity</Label><Input id="quantity" type="number" step="0.00000001" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} /></div>
                    </div>
                    <div className="grid gap-2"><Label htmlFor="apiId" className="text-sm">CoinGecko ID</Label><Input id="apiId" value={formData.apiId} onChange={(e) => setFormData({ ...formData, apiId: e.target.value.toLowerCase() })} /></div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2"><Label htmlFor="balance" className="text-sm">Balance</Label><Input id="balance" type="number" step="0.01" value={formData.balance} onChange={(e) => setFormData({ ...formData, balance: e.target.value })} /></div>
                    <div className="grid gap-2"><Label htmlFor="currency" className="text-sm">Currency</Label>
                      <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                        <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="MYR">MYR</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <Button 
                  onClick={() => {
                    // Simplified validation logic for brevity
                    if (!formData.name) return toast({ title: "Validation Error", description: "Name required", variant: "destructive" });
                    if (editingAsset) updateAssetMutation.mutate({ assetId: editingAsset.id, data: formData });
                    else createAssetMutation.mutate(formData);
                  }} 
                  className="w-full mt-2" 
                  disabled={createAssetMutation.isPending || updateAssetMutation.isPending}
                >
                  {createAssetMutation.isPending || updateAssetMutation.isPending ? "Processing..." : (editingAsset ? "Save Changes" : "Add Asset")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Remove Asset Confirmation Dialog */}
          <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader><DialogTitle>Remove Asset</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                {selectedAsset && (
                  <div className="p-3 rounded-lg bg-sidebar-accent/20 border border-sidebar-border">
                    <p className="text-sm font-bold">{selectedAsset.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                       Value: {formatCurrency(Number(selectedAsset.calculatedValueUsd || selectedAsset.balance || 0), 'USD')}
                    </p>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="reason" className="text-sm">Reason for Removal</Label>
                  <Textarea id="reason" placeholder="Why remove this?" value={removalReason} onChange={(e) => setRemovalReason(e.target.value)} className="min-h-[100px]" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setRemoveDialogOpen(false); setRemovalReason(""); }} className="flex-1">Cancel</Button>
                  <Button variant="destructive" onClick={handleRemoveAsset} disabled={!removalReason.trim() || deleteAssetMutation.isPending} className="flex-1">
                    {deleteAssetMutation.isPending ? "Removing..." : "Remove"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}