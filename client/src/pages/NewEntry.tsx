import { MobileNav } from "@/components/layout/MobileNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Plus,
  Loader2,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Target,
  BarChart3,
  FileText,
  Brain,
  Settings,
  Briefcase,
  Star,
  Clock,
  Calendar,
} from "lucide-react";
import { Link, useRoute, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Account, Trade as DBTrade } from "@shared/schema";
import { mockStrategies, calculateRRR, calculateSLPercent, calculateTPPercent } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const marketRegimeOptions = [
  "Clear Uptrend",
  "Clear Downtrend",
  "Sideways/Range",
  "Volatile",
  "Consolidation",
  "Breakout",
];

export default function NewEntry() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [accountId, setAccountId] = useState<string>("");
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<"Long" | "Short">("Long");
  const [entryPrice, setEntryPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pnl, setPnl] = useState("");
  const [riskAmount, setRiskAmount] = useState("");
  const [exitCondition, setExitCondition] = useState("");
  const [exitReason, setExitReason] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [swap, setSwap] = useState("");
  const [commission, setCommission] = useState("");
  const [strategy, setStrategy] = useState("");
  const [notes, setNotes] = useState("");
  const [setup, setSetup] = useState("");
  const [conviction, setConviction] = useState(3);
  const [marketRegime, setMarketRegime] = useState("");
  const [entryDate, setEntryDate] = useState(""); // Date in YYYY-MM-DD format
  const [entryTime, setEntryTime] = useState(""); // Time in HH:MM format
  const [psychologyTags, setPsychologyTags] = useState<string[]>([]);
  const [newStrategyOpen, setNewStrategyOpen] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState("");
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [strategies, setStrategies] = useState<string[]>(mockStrategies);

  const [, params] = useRoute("/new-entry/:id");
  const tradeIdToEdit = params?.id;

  // Fetch accounts
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  // Fetch trade data if editing
  const { data: tradeData, isLoading: isLoadingTrade } = useQuery<DBTrade>({
    queryKey: ["/api/trades", tradeIdToEdit],
    enabled: !!tradeIdToEdit && tradeIdToEdit !== "new",
    queryFn: async () => {
      const res = await fetch(`/api/trades/${tradeIdToEdit}`);
      if (!res.ok) throw new Error("Failed to fetch trade");
      return res.json();
    },
  });

  // Load trade data when editing
  useEffect(() => {
    if (tradeData) {
      setEditingId(tradeData.id);
      setAccountId(tradeData.accountId || "");
      setSymbol(tradeData.symbol || "");
      setDirection(tradeData.direction as "Long" | "Short");
      setEntryPrice(String(tradeData.entryPrice || ""));
      setQuantity(String(tradeData.quantity || ""));
      setPnl(tradeData.pnl ? String(tradeData.pnl) : "");
      setRiskAmount(tradeData.riskAmount ? String(tradeData.riskAmount) : "");
      setExitCondition(tradeData.exitCondition || "");
      setExitReason(tradeData.exitReason || "");
      setStopLoss(tradeData.stopLoss ? String(tradeData.stopLoss) : "");
      setTakeProfit(tradeData.takeProfit ? String(tradeData.takeProfit) : "");
      setSwap(tradeData.swap ? String(tradeData.swap) : "");
      setCommission(tradeData.commission ? String(tradeData.commission) : "");
      setStrategy(tradeData.strategy || "");
      
      // Extract psychology tags from notes if present
      const notesText = tradeData.notes || "";
      const psychologyMatch = notesText.match(/Psychology Tags:\s*(.+)/);
      if (psychologyMatch) {
        const tags = psychologyMatch[1].split(",").map(t => t.trim()).filter(Boolean);
        setPsychologyTags(tags);
        setNotes(notesText.replace(/Psychology Tags:.*$/, "").trim());
      } else {
        setNotes(notesText);
      }
      
      setSetup(tradeData.setup || "");
      setConviction(tradeData.conviction ? Number(tradeData.conviction) : 3);
      setMarketRegime(tradeData.marketRegime || "");
      
      // Load entry date and time
      if (tradeData.entryDate) {
        const date = new Date(tradeData.entryDate);
        setEntryDate(date.toISOString().split('T')[0]); // YYYY-MM-DD
        if (!tradeData.entryTime) {
          setEntryTime(date.toTimeString().slice(0, 5)); // HH:MM
        }
      }
      setEntryTime(tradeData.entryTime || "");
    }
  }, [tradeData]);

  // Set default account if only one exists
  useEffect(() => {
    if (accounts && accounts.length === 1 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const psychologyOptions = [
    "FOMO",
    "Fear",
    "Overconfidence",
    "Revenge Trading",
    "Hesitation",
    "Discipline",
    "Patience",
    "Fatigue",
  ];

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!symbol.trim()) newErrors.symbol = "Symbol is required";
    if (!entryPrice || parseFloat(entryPrice) <= 0) newErrors.entryPrice = "Valid entry price is required";
    if (!quantity || parseFloat(quantity) <= 0) newErrors.quantity = "Valid quantity is required";
    if (!stopLoss || parseFloat(stopLoss) <= 0) newErrors.stopLoss = "Valid stop loss is required";
    if (!takeProfit || parseFloat(takeProfit) <= 0) newErrors.takeProfit = "Valid take profit is required";
    
    // Validate SL/TP logic based on direction
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit);
    
    if (entry && sl && tp) {
      if (direction === "Long") {
        if (sl >= entry) newErrors.stopLoss = "Stop loss must be below entry for Long";
        if (tp <= entry) newErrors.takeProfit = "Take profit must be above entry for Long";
      } else {
        if (sl <= entry) newErrors.stopLoss = "Stop loss must be above entry for Short";
        if (tp >= entry) newErrors.takeProfit = "Take profit must be below entry for Short";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const entry = parseFloat(entryPrice);
  const sl = parseFloat(stopLoss);
  const tp = parseFloat(takeProfit);

  const rrr = entry && sl && tp ? calculateRRR(entry, sl, tp, direction) : "—";
  const slPercent = entry && sl ? calculateSLPercent(entry, sl, direction) : "—";
  const tpPercent = entry && tp ? calculateTPPercent(entry, tp, direction) : "—";

  // Save/Update trade mutation
  const saveTradeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editingId ? `/api/trades/${editingId}` : "/api/trades";
      const method = editingId ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to save trade" }));
        throw new Error(error.message || "Failed to save trade");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({
        title: "Success",
        description: editingId ? "Trade updated successfully" : "Trade created successfully",
      });
      setTimeout(() => setLocation("/journal"), 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save trade",
        variant: "destructive",
      });
    },
  });

  const handleSaveTrade = (status: "Open" | "Closed" = "Closed") => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    // Note: psychologyTags is not in the database schema, so we'll store it in notes if needed
    const notesWithPsychology = psychologyTags.length > 0
      ? `${notes}\n\nPsychology Tags: ${psychologyTags.join(", ")}`
      : notes;

    // Calculate Risk % if we have riskAmount and accountId
    let calculatedRiskPercent = null;
    if (riskAmount && accountId && accounts) {
      const account = accounts.find(a => a.id === accountId);
      if (account && account.initialBalance) {
        const balance = parseFloat(String(account.initialBalance));
        const risk = parseFloat(riskAmount);
        if (balance > 0) {
          calculatedRiskPercent = (risk / balance) * 100;
        }
      }
    }

    // Combine entry date and time if provided
    let entryDateTimeISO = null;
    if (entryDate) {
      if (entryTime) {
        entryDateTimeISO = `${entryDate}T${entryTime}:00`;
      } else {
        entryDateTimeISO = `${entryDate}T12:00:00`; // Default to noon if no time specified
      }
    }

    const payload = {
      accountId: accountId || null,
      symbol: symbol.toUpperCase().trim(),
      direction,
      entryPrice: parseFloat(entryPrice),
      quantity: parseFloat(quantity),
      stopLoss: parseFloat(stopLoss),
      takeProfit: parseFloat(takeProfit),
      swap: swap ? parseFloat(swap) : null,
      commission: commission ? parseFloat(commission) : null,
      pnl: pnl ? parseFloat(pnl) : null,
      riskAmount: riskAmount ? parseFloat(riskAmount) : null,
      riskPercent: calculatedRiskPercent,
      exitCondition: exitCondition || null,
      exitReason: exitReason || null,
      status: status,
      strategy: strategy || null,
      notes: notesWithPsychology || null,
      setup: setup || null,
      marketRegime: marketRegime || null,
      conviction: conviction || null,
      entryTime: entryTime || null,
      entryDate: entryDateTimeISO,
    };

    saveTradeMutation.mutate(payload);
  };

  const isLoading = isLoadingAccounts || isLoadingTrade;
  const isSaving = saveTradeMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground font-sans">
        <MobileNav />
        <main className="flex-1 overflow-y-auto pt-20">
          <div className="container mx-auto px-4 py-6 md:p-8 max-w-4xl">
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-5xl">
          {/* Header */}
          <header className="mb-6 md:mb-8">
            <Link href="/journal">
              <div className="mb-4 flex items-center gap-2 text-xs md:text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors group">
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Back to Journal
              </div>
            </Link>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {editingId ? "Edit Trade Entry" : "New Trade Entry"}
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  {editingId 
                    ? "Update your trade details and analysis."
                    : "Log a new trading entry with detailed analysis."}
                </p>
              </div>
            </div>
          </header>

          <div className="grid gap-6">
            {/* Trade Setup Card */}
            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Trade Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
                  {/* Account Selection */}
                  {accounts && accounts.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="account" className="flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5" />
                        Trading Account
                      </Label>
                      <Select value={accountId} onValueChange={setAccountId}>
                        <SelectTrigger id="account" className={errors.accountId ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name} ({account.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.accountId && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.accountId}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Symbol */}
                  <div className="space-y-2">
                    <Label htmlFor="symbol" className="flex items-center gap-2">
                      Symbol / Pair
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="symbol"
                      placeholder="e.g., EURUSD, BTCUSD"
                      className={cn(
                        "uppercase font-mono",
                        errors.symbol && "border-destructive"
                      )}
                      value={symbol}
                      onChange={(e) => {
                        setSymbol(e.target.value);
                        if (errors.symbol) setErrors({ ...errors, symbol: "" });
                      }}
                    />
                    {errors.symbol && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.symbol}
                      </p>
                    )}
                  </div>

                  {/* Strategy */}
                  <div className="space-y-2">
                    <Label htmlFor="strategy" className="flex items-center gap-2">
                      <Target className="h-3.5 w-3.5" />
                      Strategy
                    </Label>
                    <div className="flex gap-2">
                      <Select value={strategy} onValueChange={setStrategy}>
                        <SelectTrigger id="strategy" className="flex-1">
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
                      <Dialog
                        open={newStrategyOpen}
                        onOpenChange={setNewStrategyOpen}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" title="Add new strategy">
                            <Plus className="h-4 w-4" />
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

                  {/* Direction */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Direction
                      <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={direction === "Long" ? "default" : "outline"}
                        className={cn(
                          "flex-1",
                          direction === "Long" && "bg-primary hover:bg-primary/90",
                        )}
                        onClick={() => setDirection("Long")}
                      >
                        Long
                      </Button>
                      <Button
                        type="button"
                        variant={direction === "Short" ? "default" : "outline"}
                        className={cn(
                          "flex-1",
                          direction === "Short" && "bg-destructive hover:bg-destructive/90",
                        )}
                        onClick={() => setDirection("Short")}
                      >
                        Short
                      </Button>
                    </div>
                  </div>

                  {/* Entry Price */}
                  <div className="space-y-2">
                    <Label htmlFor="entryPrice" className="flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5" />
                      Entry Price
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="entryPrice"
                      type="number"
                      step="0.00001"
                      placeholder="0.00000"
                      className={cn(
                        "font-mono",
                        errors.entryPrice && "border-destructive"
                      )}
                      value={entryPrice}
                      onChange={(e) => {
                        setEntryPrice(e.target.value);
                        if (errors.entryPrice) setErrors({ ...errors, entryPrice: "" });
                      }}
                    />
                    {errors.entryPrice && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.entryPrice}
                      </p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label htmlFor="quantity" className="flex items-center gap-2">
                      <BarChart3 className="h-3.5 w-3.5" />
                      Quantity / Size
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.00001"
                      placeholder="0.00000"
                      className={cn(
                        "font-mono",
                        errors.quantity && "border-destructive"
                      )}
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(e.target.value);
                        if (errors.quantity) setErrors({ ...errors, quantity: "" });
                      }}
                    />
                    {errors.quantity && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.quantity}
                      </p>
                    )}
                  </div>

                  {/* Stop Loss */}
                  <div className="space-y-2">
                    <Label htmlFor="stopLoss" className="flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                      Stop Loss
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="stopLoss"
                      type="number"
                      step="0.00001"
                      placeholder="0.00000"
                      className={cn(
                        "font-mono",
                        errors.stopLoss && "border-destructive"
                      )}
                      value={stopLoss}
                      onChange={(e) => {
                        setStopLoss(e.target.value);
                        if (errors.stopLoss) setErrors({ ...errors, stopLoss: "" });
                      }}
                    />
                    {errors.stopLoss && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.stopLoss}
                      </p>
                    )}
                  </div>

                  {/* Take Profit */}
                  <div className="space-y-2">
                    <Label htmlFor="takeProfit" className="flex items-center gap-2">
                      <Target className="h-3.5 w-3.5 text-primary" />
                      Take Profit
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="takeProfit"
                      type="number"
                      step="0.00001"
                      placeholder="0.00000"
                      className={cn(
                        "font-mono",
                        errors.takeProfit && "border-destructive"
                      )}
                      value={takeProfit}
                      onChange={(e) => {
                        setTakeProfit(e.target.value);
                        if (errors.takeProfit) setErrors({ ...errors, takeProfit: "" });
                      }}
                    />
                    {errors.takeProfit && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.takeProfit}
                      </p>
                    )}
                  </div>

                  {/* Swap */}
                  <div className="space-y-2">
                    <Label htmlFor="swap" className="flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5" />
                      Swap (Optional)
                    </Label>
                    <Input
                      id="swap"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="font-mono"
                      value={swap}
                      onChange={(e) => setSwap(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Overnight swap fees (can be negative)
                    </p>
                  </div>

                  {/* Commission */}
                  <div className="space-y-2">
                    <Label htmlFor="commission" className="flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5" />
                      Commission (Optional)
                    </Label>
                    <Input
                      id="commission"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="font-mono"
                      value={commission}
                      onChange={(e) => setCommission(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Trading commission fees
                    </p>
                  </div>

                  {/* P&L */}
                  <div className="space-y-2">
                    <Label htmlFor="pnl" className="flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5" />
                      P&L (Profit/Loss)
                    </Label>
                    <Input
                      id="pnl"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className={cn(
                        "font-mono font-semibold",
                        pnl && parseFloat(pnl) > 0 && "text-green-600",
                        pnl && parseFloat(pnl) < 0 && "text-red-600"
                      )}
                      value={pnl}
                      onChange={(e) => setPnl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter + for profit, - for loss (from your broker)
                    </p>
                  </div>

                  {/* Risk Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="riskAmount" className="flex items-center gap-2">
                      <Target className="h-3.5 w-3.5" />
                      Risk Amount ($)
                    </Label>
                    <Input
                      id="riskAmount"
                      type="number"
                      step="0.01"
                      placeholder="15.00"
                      className="font-mono font-semibold text-orange-600"
                      value={riskAmount}
                      onChange={(e) => setRiskAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      How much $ did you risk on this trade? (e.g., $15)
                    </p>
                  </div>

                  {/* Exit Condition */}
                  <div className="space-y-2">
                    <Label htmlFor="exitCondition" className="flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Exit Condition
                    </Label>
                    <Select value={exitCondition} onValueChange={setExitCondition}>
                      <SelectTrigger id="exitCondition">
                        <SelectValue placeholder="How did the trade close?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SL">Stop Loss (SL)</SelectItem>
                        <SelectItem value="TP">Take Profit (TP)</SelectItem>
                        <SelectItem value="Breakeven">Breakeven (BE)</SelectItem>
                        <SelectItem value="Manual Close">Manual Close</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      How did this trade exit?
                    </p>
                  </div>

                  {/* Exit Reason - Only show if Manual Close */}
                  {exitCondition === "Manual Close" && (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="exitReason" className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" />
                        Reason for Manual Close
                      </Label>
                      <Textarea
                        id="exitReason"
                        placeholder="Why did you close this trade manually? (e.g., news event, took partial profit, etc.)"
                        className="min-h-[80px] resize-none"
                        value={exitReason}
                        onChange={(e) => setExitReason(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Risk Metrics */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Risk Metrics</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Risk:Reward Ratio
                      </p>
                      <p className="text-xl font-bold font-mono text-primary">{rrr}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Stop Loss %
                      </p>
                      <p className="text-xl font-bold font-mono text-destructive">
                        {slPercent === "—" ? "—" : `${slPercent}%`}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Take Profit %
                      </p>
                      <p className="text-xl font-bold font-mono text-primary">
                        {tpPercent === "—" ? "—" : `${tpPercent}%`}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Card */}
            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Trade Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="notes" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="notes" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Notes
                    </TabsTrigger>
                    <TabsTrigger value="psychology" className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Psychology
                    </TabsTrigger>
                    <TabsTrigger value="setup" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Setup
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="notes" className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="notes">Trade Notes & Rationale</Label>
                        <Textarea
                          id="notes"
                          placeholder="Enter your trade rationale, market observations, and any relevant notes..."
                          className="min-h-[150px] resize-none"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="marketRegime">Market Regime</Label>
                          <Select value={marketRegime} onValueChange={setMarketRegime}>
                            <SelectTrigger id="marketRegime">
                              <SelectValue placeholder="Select market regime" />
                            </SelectTrigger>
                            <SelectContent>
                              {marketRegimeOptions.map((regime) => (
                                <SelectItem key={regime} value={regime}>
                                  {regime}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="entryDate" className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5" />
                            Entry Date
                          </Label>
                          <Input
                            id="entryDate"
                            type="date"
                            value={entryDate}
                            onChange={(e) => setEntryDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="font-mono"
                          />
                          <p className="text-xs text-muted-foreground">
                            When did this trade happen? (Leave empty for today)
                          </p>
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
                            What time did you enter? (For session analysis)
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="conviction">Conviction Level</Label>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <button
                                key={level}
                                type="button"
                                onClick={() => setConviction(level)}
                                className={cn(
                                  "transition-all hover:scale-110",
                                  level <= conviction
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-muted-foreground/70"
                                )}
                                aria-label={`Set conviction to ${level}`}
                              >
                                <Star 
                                  className="h-6 w-6" 
                                  fill={level <= conviction ? "currentColor" : "none"}
                                />
                              </button>
                            ))}
                            <span className="text-sm text-muted-foreground ml-2">
                              {conviction}/5
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="psychology" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Psychology Tags</Label>
                      <p className="text-xs text-muted-foreground">
                        Select tags that describe your psychological state during this trade
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {psychologyOptions.map((tag) => {
                          const isSelected = psychologyTags.includes(tag);
                          return (
                            <Badge
                              key={tag}
                              variant={isSelected ? "default" : "outline"}
                              className={cn(
                                "cursor-pointer transition-all",
                                isSelected && "bg-primary hover:bg-primary/90"
                              )}
                              onClick={() =>
                                setPsychologyTags((prev) =>
                                  prev.includes(tag)
                                    ? prev.filter((t) => t !== tag)
                                    : [...prev, tag],
                                )
                              }
                            >
                              {tag}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="setup" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="setup">Technical Setup Description</Label>
                      <Textarea
                        id="setup"
                        placeholder="Describe the technical setup: chart patterns, indicators, entry signals, etc..."
                        className="min-h-[150px] resize-none"
                        value={setup}
                        onChange={(e) => setSetup(e.target.value)}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Save Buttons at Bottom */}
            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm sticky bottom-4">
              <CardContent className="p-4">
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => handleSaveTrade("Open")}
                    disabled={isSaving}
                    className="min-w-[140px]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Save Draft
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleSaveTrade("Closed")}
                    disabled={isSaving}
                    className="min-w-[140px]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Journal
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  Save Draft: Running trade (not hit TP/SL) • Save Journal: Closed trade (hit TP/SL/BE)
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
