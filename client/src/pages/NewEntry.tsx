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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Calendar as CalendarIcon,
} from "lucide-react";
import { Link, useRoute, useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Account, Trade as DBTrade, TradeTemplate, Strategy } from "@shared/schema";
import { calculateRRR, calculateSLPercent, calculateTPPercent } from "@/lib/mockData";
import { safeParseFloat, validateNumericInput } from "@/lib/validationUtils";
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
  
  // Helper function to safely convert any value to Date object
  const safeToDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    try {
      const date = new Date(String(value));
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  // Helper function to safely convert Date to ISO string
  const safeToISOString = (value: any): string | null => {
    const date = safeToDate(value);
    if (!date) return null;
    try {
      return new Date(date).toISOString();
    } catch {
      return null;
    }
  };
  
  // Ensure entryDate is always a string (safety check)
  useEffect(() => {
    if (entryDate && typeof entryDate !== 'string') {
      console.warn("entryDate is not a string, converting:", entryDate, typeof entryDate);
      try {
        if (entryDate instanceof Date) {
          // SAFE: Wrap in new Date() before calling toISOString()
          const safeDate = new Date(entryDate.getTime());
          if (typeof safeDate.toISOString === 'function' && !isNaN(safeDate.getTime())) {
            setEntryDate(safeDate.toISOString().split('T')[0]);
          } else {
            // Fallback to string conversion
            setEntryDate(String(entryDate));
          }
        } else {
          // Not a Date object, just convert to string
          setEntryDate(String(entryDate));
        }
      } catch (error) {
        console.error("Error converting entryDate:", error);
        setEntryDate(String(entryDate));
      }
    }
  }, [entryDate]);
  const [psychologyTags, setPsychologyTags] = useState<string[]>([]);
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [, params] = useRoute("/new-entry/:id");
  const tradeIdToEdit = params?.id;

  // Fetch accounts
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  // Fetch strategies from Playbook
  const { data: playbookTemplates = [], isLoading: isLoadingPlaybook } = useQuery<TradeTemplate[]>({
    queryKey: ["/api/templates"],
  });

  // Fetch ACTIVE strategies only (for Live Trading - excludes experimental)
  const { data: activeStrategies = [] } = useQuery<Strategy[]>({
    queryKey: ["/api/strategies", "active"],
    queryFn: async () => {
      const res = await fetch("/api/strategies?status=active", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch strategies");
      return res.json();
    },
  });

  // Extract strategy names from playbook templates - memoized to prevent infinite loops
  const playbookStrategies = useMemo(() => {
    const playbookNames = playbookTemplates.map((template) => template.name);
    // Also include active strategies from strategies table
    const activeNames = activeStrategies.map((s) => s.name);
    // Combine and deduplicate
    return Array.from(new Set([...playbookNames, ...activeNames])).sort();
  }, [playbookTemplates, activeStrategies]);
  
  // Track if user is entering a custom strategy (not from Playbook)
  const [isCustomStrategy, setIsCustomStrategy] = useState(false);

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

  // Load trade data when editing - prevent infinite loops by only updating when tradeData changes
  useEffect(() => {
    if (tradeData && tradeData.id) {
      // Only update if we're not already editing this trade (prevents loops)
      if (editingId !== tradeData.id) {
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
        const loadedStrategy = tradeData.strategy || "";
        setStrategy(loadedStrategy);
        // Check if loaded strategy is from playbook or custom
        if (loadedStrategy && !playbookStrategies.includes(loadedStrategy)) {
          setIsCustomStrategy(true);
        } else {
          setIsCustomStrategy(false);
        }
      } else {
        // Trade data already loaded, only update strategy check if playbookStrategies changed
        const loadedStrategy = tradeData.strategy || "";
        if (loadedStrategy && !playbookStrategies.includes(loadedStrategy)) {
          setIsCustomStrategy(true);
        } else {
          setIsCustomStrategy(false);
        }
      }
      
      // Only update other fields if we're loading the trade for the first time
      if (editingId !== tradeData.id) {
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
        
        // Load entry date and time - SAFE conversion with explicit new Date() wrapper
        if (tradeData.entryDate) {
          try {
            // SAFE: Always wrap in new Date() to ensure it's a Date object before calling toISOString()
            const dateValue = safeToDate(tradeData.entryDate);
            
            if (dateValue) {
              // SAFE: dateValue is guaranteed to be a Date object from safeToDate()
              const isoString = safeToISOString(dateValue);
              if (isoString) {
                const dateString = isoString.split('T')[0]; // YYYY-MM-DD
                setEntryDate(String(dateString));
                if (!tradeData.entryTime) {
                  // SAFE: dateValue is a Date object, toTimeString() is safe
                  const timeString = dateValue.toTimeString().slice(0, 5); // HH:MM
                  setEntryTime(String(timeString));
                }
              } else {
                setEntryDate("");
              }
            } else {
              setEntryDate("");
            }
          } catch (error) {
            console.warn("Error parsing entryDate:", error);
            setEntryDate("");
          }
        } else {
          setEntryDate("");
        }
        setEntryTime(tradeData.entryTime ? String(tradeData.entryTime) : "");
      }
    }
  }, [tradeData, playbookStrategies, editingId]);

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
    
    // Validate symbol
    if (!symbol.trim()) {
      newErrors.symbol = "Symbol is required";
    }
    
    // Validate entry price
    const entryValidation = validateNumericInput(entryPrice, {
      required: true,
      min: 0.00001,
      max: 1000000,
      allowZero: false,
    });
    if (!entryValidation.isValid) {
      newErrors.entryPrice = entryValidation.error || "Valid entry price is required";
    }
    
    // Validate quantity
    const quantityValidation = validateNumericInput(quantity, {
      required: true,
      min: 0.00001,
      max: 1000000,
      allowZero: false,
    });
    if (!quantityValidation.isValid) {
      newErrors.quantity = quantityValidation.error || "Valid quantity is required";
    }
    
    // Validate stop loss
    const stopLossValidation = validateNumericInput(stopLoss, {
      required: true,
      min: 0.00001,
      max: 1000000,
      allowZero: false,
    });
    if (!stopLossValidation.isValid) {
      newErrors.stopLoss = stopLossValidation.error || "Valid stop loss is required";
    }
    
    // Validate take profit
    const takeProfitValidation = validateNumericInput(takeProfit, {
      required: true,
      min: 0.00001,
      max: 1000000,
      allowZero: false,
    });
    if (!takeProfitValidation.isValid) {
      newErrors.takeProfit = takeProfitValidation.error || "Valid take profit is required";
    }
    
    // Validate SL/TP logic based on direction
    const entry = safeParseFloat(entryPrice);
    const sl = safeParseFloat(stopLoss);
    const tp = safeParseFloat(takeProfit);
    
    if (entry !== null && sl !== null && tp !== null) {
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

  const entry = safeParseFloat(entryPrice);
  const sl = safeParseFloat(stopLoss);
  const tp = safeParseFloat(takeProfit);

  const rrr = entry && sl && tp ? calculateRRR(entry, sl, tp, direction) : "—";
  const slPercent = entry && sl ? calculateSLPercent(entry, sl, direction) : "—";
  const tpPercent = entry && tp ? calculateTPPercent(entry, tp, direction) : "—";

  // Save/Update trade mutation
  const saveTradeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editingId ? `/api/trades/${editingId}` : "/api/trades";
      const method = editingId ? "PATCH" : "POST";
      
      // Ensure all values in payload are serializable (no Date objects)
      // Clean the payload to ensure no Date objects or functions
      // SAFE: Always wrap dates in new Date() before calling toISOString()
      const cleanPayload: Record<string, any> = {};
      for (const [key, value] of Object.entries(payload)) {
        if (value === null || value === undefined) {
          cleanPayload[key] = value;
        } else if (value instanceof Date) {
          // SAFE: Wrap in new Date() before calling toISOString()
          try {
            const safeDate = new Date(value.getTime());
            if (typeof safeDate.toISOString === 'function' && !isNaN(safeDate.getTime())) {
              cleanPayload[key] = safeDate.toISOString();
            } else {
              cleanPayload[key] = String(value);
            }
          } catch (error) {
            console.error(`Error converting Date for key ${key}:`, error);
            cleanPayload[key] = String(value);
          }
        } else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          // Recursively clean nested objects, but avoid Date-like objects
          try {
            // Check if it's a Date-like object but not an actual Date
            if (typeof (value as any).toISOString === 'function' && !(value instanceof Date)) {
              // It has toISOString but isn't a Date - SAFE: wrap in new Date() first
              try {
                const safeDate = new Date(value as any);
                if (!isNaN(safeDate.getTime())) {
                  cleanPayload[key] = safeDate.toISOString();
                } else {
                  cleanPayload[key] = String(value);
                }
              } catch {
                cleanPayload[key] = String(value);
              }
            } else {
              // Safe to stringify
              cleanPayload[key] = JSON.parse(JSON.stringify(value, (k, v) => {
                // Replacer function - SAFE: wrap Date objects in new Date() before toISOString()
                if (v instanceof Date) {
                  try {
                    return new Date(v.getTime()).toISOString();
                  } catch {
                    return String(v);
                  }
                }
                return v;
              }));
            }
          } catch (error) {
            console.error(`Error cleaning object for key ${key}:`, error);
            cleanPayload[key] = String(value);
          }
        } else {
          cleanPayload[key] = value;
        }
      }
      const serializablePayload = cleanPayload;
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serializablePayload),
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
    try {
      // Debug: Log entryDate state before processing
      console.log("handleSaveTrade START - entryDate:", entryDate, typeof entryDate, entryDate instanceof Date);
      console.log("handleSaveTrade START - entryTime:", entryTime, typeof entryTime);
      console.log("handleSaveTrade START - editingId:", editingId);
      
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
        const balance = safeParseFloat(account.initialBalance);
        const risk = safeParseFloat(riskAmount);
        if (balance !== null && risk !== null && balance > 0) {
          calculatedRiskPercent = (risk / balance) * 100;
        }
      }
    }

    // Fix Date (The "Noon" Safety Lock) - Decouple Date and Time to prevent timezone bugs
    let entryDateString: string | null = null;
    if (entryDate && typeof entryDate === 'string' && entryDate.trim() !== '') {
      try {
        // Ensure entryDate is a string in YYYY-MM-DD format
        const dateStr = String(entryDate).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          // Force Noon: Create date at 12:00:00 to prevent timezone issues
          const submissionDate = new Date(`${dateStr}T12:00:00`);
          submissionDate.setHours(12, 0, 0, 0); // Explicitly set to noon
          
          if (!isNaN(submissionDate.getTime())) {
            entryDateString = submissionDate.toISOString();
          }
        }
      } catch (error) {
        console.error("Error parsing entry date:", error);
        entryDateString = null;
      }
    }

    // Parse numeric values - validation already passed, so these are guaranteed to be valid numbers
    const entryPriceNum = safeParseFloat(entryPrice) ?? 0;
    const quantityNum = safeParseFloat(quantity) ?? 0;
    const stopLossNum = safeParseFloat(stopLoss) ?? 0;
    const takeProfitNum = safeParseFloat(takeProfit) ?? 0;
    
    // Verify all payload values are serializable before creating the payload object
    const payload: Record<string, any> = {
      accountId: accountId || null,
      symbol: (symbol || "").toUpperCase().trim(),
      direction,
      entryPrice: entryPriceNum,
      quantity: quantityNum,
      stopLoss: stopLossNum || null,
      takeProfit: takeProfitNum || null,
      swap: swap ? safeParseFloat(swap) : null,
      commission: commission ? safeParseFloat(commission) : null,
      pnl: pnl ? safeParseFloat(pnl) : null,
      riskAmount: riskAmount ? safeParseFloat(riskAmount) : null,
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
      entryDate: entryDateString,
    };

    // Fix PnL (Auto-Negative for Losses, Auto-Positive for Profits)
    let submissionPnl = payload.pnl;
    if (submissionPnl !== null && submissionPnl !== undefined) {
      submissionPnl = Number(submissionPnl);
      
      // FORCE NEGATIVE for bad outcomes
      if (["Stop Loss", "Manual Close Loss"].includes(exitCondition)) {
        submissionPnl = -Math.abs(submissionPnl);
      }
      // FORCE POSITIVE for good outcomes
      else if (["Take Profit", "Manual Close Profit"].includes(exitCondition)) {
        submissionPnl = Math.abs(submissionPnl);
      }
      // For Breakeven, leave it as is (likely 0 or small number)
      
      payload.pnl = submissionPnl;
    }

      console.log("handleSaveTrade - Final payload entryDate:", payload.entryDate, typeof payload.entryDate);
      
      saveTradeMutation.mutate(payload);
    } catch (error: any) {
      console.error("Error in handleSaveTrade:", error);
      console.error("Error stack:", error?.stack);
      console.error("Error details:", {
        message: error?.message,
        name: error?.name,
        entryDate: entryDate,
        entryDateType: typeof entryDate,
        entryDateIsDate: entryDate instanceof Date
      });
      toast({
        title: "Error",
        description: error?.message || "An unexpected error occurred while saving the trade",
        variant: "destructive",
      });
    }
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
                <div className="flex flex-col gap-4 md:gap-6">
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="strategy" className="flex items-center gap-2">
                        <Target className="h-3.5 w-3.5" />
                        Strategy
                      </Label>
                      <a
                        href="/playbook"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-400 hover:text-amber-400 hover:underline cursor-pointer transition-colors"
                      >
                        Manage Playbook
                      </a>
                    </div>
                    {isCustomStrategy ? (
                      <div className="space-y-2">
                        <Select 
                          value="" 
                          onValueChange={(v) => {
                            if (v !== "other") {
                              setStrategy(v);
                              setIsCustomStrategy(false);
                            }
                          }}
                        >
                          <SelectTrigger id="strategy">
                            <SelectValue>Other (Custom)</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {playbookStrategies.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                            <SelectItem value="other">Other (Enter custom)</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Enter custom strategy name"
                          value={strategy}
                          onChange={(e) => setStrategy(e.target.value)}
                        />
                      </div>
                    ) : (
                      <Select 
                        value={strategy} 
                        onValueChange={(v) => {
                          if (v === "other") {
                            setStrategy("");
                            setIsCustomStrategy(true);
                          } else {
                            setStrategy(v);
                            setIsCustomStrategy(false);
                          }
                        }}
                      >
                        <SelectTrigger id="strategy">
                          <SelectValue placeholder={isLoadingPlaybook ? "Loading..." : playbookStrategies.length === 0 ? "No strategies found" : "Select from Playbook"}>
                            {strategy || (isLoadingPlaybook ? "Loading..." : playbookStrategies.length === 0 ? "No strategies found" : "Select from Playbook")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingPlaybook ? (
                            <SelectItem value="loading" disabled>Loading strategies...</SelectItem>
                          ) : playbookStrategies.length === 0 ? (
                            <SelectItem value="empty" disabled>No strategies in Playbook</SelectItem>
                          ) : (
                            <>
                              {playbookStrategies.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                              <SelectItem value="other">Other (Enter custom)</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    )}
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
                      placeholder="0.00"
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
                        <SelectItem value="Stop Loss">Stop Loss</SelectItem>
                        <SelectItem value="Take Profit">Take Profit</SelectItem>
                        <SelectItem value="Breakeven">Breakeven</SelectItem>
                        <SelectItem value="Manual Close Profit">Manual Close Profit</SelectItem>
                        <SelectItem value="Manual Close Loss">Manual Close Loss</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      How did this trade exit?
                    </p>
                  </div>

                  {/* Exit Reason - Only show if Manual Close */}
                  {(exitCondition === "Manual Close Profit" || exitCondition === "Manual Close Loss") && (
                    <div className="space-y-2">
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
                <Tabs defaultValue="setup-notes" className="space-y-4">
                  <TabsList className="inline-flex w-full h-auto p-1 overflow-x-auto">
                    <TabsTrigger value="setup-notes" className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0 px-2 sm:px-3 py-2 text-xs sm:text-sm">
                      <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="truncate">Setup Notes</span>
                    </TabsTrigger>
                    <TabsTrigger value="psychology" className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0 px-2 sm:px-3 py-2 text-xs sm:text-sm">
                      <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="truncate">Psychology</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="setup-notes" className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="notes" className="block text-sm font-medium mb-2">Trade Notes & Rationale</Label>
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
                            <CalendarIcon className="h-3.5 w-3.5" />
                            Entry Date
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-mono",
                                  !entryDate && "text-muted-foreground"
                                )}
                                id="entryDate"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {entryDate ? (() => {
                                  // Parse YYYY-MM-DD string and format in local time
                                  const [year, month, day] = entryDate.split('-').map(Number);
                                  const localDate = new Date(year, month - 1, day);
                                  return localDate.toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                  });
                                })() : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={entryDate ? (() => {
                                  // Parse YYYY-MM-DD string and create Date in local time (noon to avoid timezone shifts)
                                  const [year, month, day] = entryDate.split('-').map(Number);
                                  const localDate = new Date(year, month - 1, day, 12, 0, 0, 0);
                                  return localDate;
                                })() : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    // Set time to noon locally to prevent timezone shift
                                    const adjustedDate = new Date(date);
                                    adjustedDate.setHours(12, 0, 0, 0);
                                    
                                    // Format as YYYY-MM-DD using local date components (not UTC)
                                    const year = adjustedDate.getFullYear();
                                    const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
                                    const day = String(adjustedDate.getDate()).padStart(2, '0');
                                    const dateString = `${year}-${month}-${day}`;
                                    setEntryDate(dateString);
                                  } else {
                                    setEntryDate("");
                                  }
                                }}
                                disabled={(date) => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  return date > today;
                                }}
                                initialFocus
                                captionLayout="dropdown-buttons"
                                fromYear={2020}
                                toYear={new Date().getFullYear()}
                              />
                            </PopoverContent>
                          </Popover>
                          <p className="text-xs text-muted-foreground">
                            When did this trade happen? (Leave empty for today)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="entryTime" className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />
                            Entry Time (24h)
                          </Label>
                          <div className="space-y-1">
                            <Input
                              id="entryTime"
                              type="text"
                              placeholder="HH:MM"
                              value={entryTime}
                              onChange={handleTimeInput}
                              className="font-mono max-w-[100px]"
                              maxLength={5}
                            />
                            {entryTime && entryTime.includes(':') && (
                              <p className="text-xs text-muted-foreground">
                                {format12Hour(entryTime)}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            What time did you enter? (For session analysis) - Type 4 digits (e.g., 1323 → 13:23)
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
                  
                  <TabsContent value="psychology" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label className="block text-sm font-medium mb-2">Psychology Tags</Label>
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
