import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit, Loader2, Brain, BookOpen, TrendingUp, Target, BarChart3, DollarSign, X, ArrowLeft, RefreshCw, ScrollText, CircleDollarSign } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { TradeTemplate } from "@shared/schema";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";

interface StrategyStats {
  totalTrades: number;
  totalPnl: number;
  winRate: number;
  profitFactor: number;
  avgRR: number;
  bestAsset: string;
}

export default function StrategyPlaybook() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { maskValue } = usePrivacyMode();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TradeTemplate | null>(null);
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [isEditingTweaks, setIsEditingTweaks] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "details">("list"); // Mobile view state
  const [oldStrategyName, setOldStrategyName] = useState("");
  const [newStrategyName, setNewStrategyName] = useState("");

  // Form state for new/edit template
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<"Long" | "Short" | "Both" | "">("");
  const [strategy, setStrategy] = useState("");
  const [setup, setSetup] = useState("");
  const [riskPercent, setRiskPercent] = useState("");
  const [riskRewardRatio, setRiskRewardRatio] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery<TradeTemplate[]>({
    queryKey: ["/api/templates"],
  });

  // Fetch selected template
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // Fetch strategy stats for selected template
  const { data: strategyStats, isLoading: isLoadingStats } = useQuery<StrategyStats>({
    queryKey: [`/api/templates/${selectedTemplateId}/stats`],
    enabled: !!selectedTemplateId,
  });


  // Parse rules from JSON string
  const [rules, setRules] = useState<string[]>([]);
  useEffect(() => {
    if (selectedTemplate?.rules) {
      try {
        const parsed = JSON.parse(selectedTemplate.rules);
        setRules(Array.isArray(parsed) ? parsed : []);
      } catch {
        setRules(selectedTemplate.rules.split("\n").filter(Boolean));
      }
    } else {
      setRules([]);
    }
  }, [selectedTemplate?.rules]);

  const [tweaks, setTweaks] = useState("");
  useEffect(() => {
    setTweaks(selectedTemplate?.tweaks || "");
  }, [selectedTemplate?.tweaks]);

  // Auto-select first template if none selected (desktop only)
  useEffect(() => {
    if (!selectedTemplateId && templates.length > 0) {
      // Only auto-select on desktop (window width >= 768px)
      if (window.innerWidth >= 768) {
        setSelectedTemplateId(templates[0].id);
      }
    }
  }, [templates, selectedTemplateId]);

  // Handle strategy selection - switch to details view on mobile
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    // On mobile, switch to details view
    if (window.innerWidth < 768) {
      setMobileView("details");
    }
  };

  // Handle back to list on mobile
  const handleBackToList = () => {
    setMobileView("list");
  };

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (template: Partial<TradeTemplate>) => {
      const url = editingTemplate ? `/api/templates/${editingTemplate.id}` : "/api/templates";
      const method = editingTemplate ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save template");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      if (editingTemplate) {
        queryClient.invalidateQueries({ queryKey: [`/api/templates/${editingTemplate.id}/stats`] });
      }
      toast({
        title: editingTemplate ? "Template updated" : "Template created",
        description: "Your strategy template has been saved successfully.",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save template",
      });
    },
  });

  // Update rules mutation
  const updateRulesMutation = useMutation({
    mutationFn: async (rules: string[]) => {
      if (!selectedTemplateId) throw new Error("No template selected");
      
      const res = await fetch(`/api/templates/${selectedTemplateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: JSON.stringify(rules) }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update rules");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setIsEditingRules(false);
      toast({
        title: "Rules updated",
        description: "Strategy rules have been saved.",
      });
    },
  });

  // Update tweaks mutation
  const updateTweaksMutation = useMutation({
    mutationFn: async (tweaksText: string) => {
      if (!selectedTemplateId) throw new Error("No template selected");
      
      const res = await fetch(`/api/templates/${selectedTemplateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweaks: tweaksText }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update tweaks");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setIsEditingTweaks(false);
      toast({
        title: "Tweaks updated",
        description: "Optimization notes have been saved.",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete template");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      if (selectedTemplateId === editingTemplate?.id) {
        setSelectedTemplateId(null);
      }
      toast({
        title: "Template deleted",
        description: "The strategy template has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete template",
      });
    },
  });

  const resetForm = () => {
    setName("");
    setSymbol("");
    setDirection("");
    setStrategy("");
    setSetup("");
    setRiskPercent("");
    setRiskRewardRatio("");
    setNotes("");
    setEditingTemplate(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (template: TradeTemplate) => {
    setEditingTemplate(template);
    setName(template.name || "");
    setSymbol(template.symbol || "");
    setDirection((template.direction as "Long" | "Short" | "Both") || "");
    setStrategy(template.strategy || "");
    setSetup(template.setup || "");
    setRiskPercent(template.riskPercent ? String(template.riskPercent) : "");
    setRiskRewardRatio(template.riskRewardRatio || "");
    setNotes(template.notes || "");
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Template name is required",
      });
      return;
    }

    saveMutation.mutate({
      name: name.trim(),
      symbol: symbol.trim() || null,
      direction: direction || null,
      strategy: strategy.trim() || null,
      setup: setup.trim() || null,
      riskPercent: riskPercent ? String(riskPercent) : null,
      riskRewardRatio: riskRewardRatio || null,
      notes: notes.trim() || null,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddRule = () => {
    const newRules = [...rules, ""];
    setRules(newRules);
  };

  const handleUpdateRule = (index: number, value: string) => {
    const newRules = [...rules];
    newRules[index] = value;
    setRules(newRules);
  };

  const handleRemoveRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
  };

  const handleSaveRules = () => {
    updateRulesMutation.mutate(rules.filter(Boolean));
  };

  const handleSaveTweaks = () => {
    updateTweaksMutation.mutate(tweaks);
  };

  // Strategy rename mutation (updates both template and trades)
  const migrateStrategyMutation = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      const res = await fetch("/api/templates/rename-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName, newName }),
        credentials: "include",
      });

      // Check if response is OK
      if (!res.ok) {
        // Try to parse error as JSON, fallback to status text
        let errorMessage = `Failed to rename strategy (${res.status})`;
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const error = await res.json();
            errorMessage = error.message || error.error || errorMessage;
          } else {
            const text = await res.text();
            errorMessage = text || errorMessage;
          }
        } catch (parseError) {
          // If parsing fails, use status text
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Parse successful response
      try {
        return await res.json();
      } catch (jsonError) {
        throw new Error("Invalid response from server");
      }
    },
    onSuccess: (data) => {
      // Invalidate all trade-related queries to refresh Dashboard, Journal, and Stats
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trades/strategies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      // Invalidate all template stats (including Dashboard stats)
      queryClient.invalidateQueries({ queryKey: ["/api/templates", "/stats"] });
      if (selectedTemplateId) {
        queryClient.invalidateQueries({ queryKey: [`/api/templates/${selectedTemplateId}/stats`] });
      }
      toast({
        title: "Strategy renamed",
        description: data.message || `Successfully renamed strategy. Updated ${data.templateUpdated} template(s) and ${data.tradesUpdated} trade(s).`,
      });
      setOldStrategyName("");
      setNewStrategyName("");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Rename failed",
        description: error.message || "Failed to rename strategy",
      });
    },
  });

  const handleMigrateStrategy = () => {
    if (!oldStrategyName || !newStrategyName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select an old strategy name and enter a new strategy name",
      });
      return;
    }

    if (oldStrategyName === newStrategyName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Old and new strategy names cannot be the same",
      });
      return;
    }

    migrateStrategyMutation.mutate({
      oldName: oldStrategyName,
      newName: newStrategyName.trim(),
    });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="flex h-[calc(100vh-5rem)]">
          {/* LEFT SIDE: Strategy List */}
          <div className={cn(
            "border-r border-sidebar-border bg-sidebar/50 flex flex-col",
            // Desktop: fixed width, always visible
            "md:w-80",
            // Mobile: full width when showing list, hidden when showing details
            "w-full md:block",
            mobileView === "details" ? "hidden" : "block"
          )}>
            <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Trading Playbook
              </h2>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={resetForm}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTemplate ? "Edit Play" : "Add New Play"}
                    </DialogTitle>
                    <DialogDescription>
                      Define your trading strategy template
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Template Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., SMC Breakout Long"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="symbol">Symbol</Label>
                        <Input
                          id="symbol"
                          placeholder="e.g., EURUSD"
                          value={symbol}
                          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="direction">Direction</Label>
                        <Select value={direction} onValueChange={(v) => setDirection(v as "Long" | "Short" | "Both" | "")}>
                          <SelectTrigger id="direction">
                            <SelectValue placeholder="Select direction" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Long">Long</SelectItem>
                            <SelectItem value="Short">Short</SelectItem>
                            <SelectItem value="Both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="strategy">Strategy</Label>
                      <Input
                        id="strategy"
                        placeholder="e.g., SMC Break & Retest"
                        value={strategy}
                        onChange={(e) => setStrategy(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={resetForm}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                      {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editingTemplate ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No plays yet</p>
                  <p className="text-xs mt-1">Click + to add a play</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-colors",
                        "hover:bg-sidebar-accent/50",
                        selectedTemplateId === template.id
                          ? "bg-sidebar-accent border-l-2 border-primary"
                          : "border-l-2 border-transparent"
                      )}
                    >
                      <div className="font-medium">{template.name}</div>
                      {template.strategy && (
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {template.strategy}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: Strategy Dashboard */}
          <div className={cn(
            "flex-1 overflow-y-auto",
            // Mobile: hidden when showing list, visible when showing details
            "md:block",
            mobileView === "list" ? "hidden" : "block"
          )}>
            {selectedTemplate ? (
              <div className="p-6 space-y-6">
                {/* Mobile: Back to List Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToList}
                  className="md:hidden mb-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to List
                </Button>

                {/* Header: Strategy Name + Edit/Delete */}
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold">{selectedTemplate.name}</h1>
                    {selectedTemplate.strategy && (
                      <p className="text-muted-foreground mt-1">{selectedTemplate.strategy}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(selectedTemplate)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(selectedTemplate.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Strategy Migration Tool */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5" />
                      Rename Old Strategy
                    </CardTitle>
                    <CardDescription>
                      Rename a Playbook strategy and update all trades that use it
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="oldStrategy">Old Name</Label>
                        <Select value={oldStrategyName} onValueChange={setOldStrategyName}>
                          <SelectTrigger id="oldStrategy">
                            <SelectValue placeholder="Select strategy from Playbook" />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.length > 0 ? (
                              templates
                                .filter((template) => template.name && template.name.trim())
                                .map((template) => (
                                  <SelectItem key={template.id} value={template.name}>
                                    {template.name}
                                  </SelectItem>
                                ))
                            ) : (
                              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                No strategies found in Playbook
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Select a strategy from your Playbook to rename
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newStrategy">New Name</Label>
                        <Input
                          id="newStrategy"
                          type="text"
                          placeholder="Enter new strategy name"
                          value={newStrategyName}
                          onChange={(e) => setNewStrategyName(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Type the new name for this strategy
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleMigrateStrategy}
                      disabled={migrateStrategyMutation.isPending || !oldStrategyName || !newStrategyName}
                      className="w-full"
                    >
                      {migrateStrategyMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Rename Strategy
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Section A: The Rules */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <ScrollText className="h-5 w-5" />
                        The Rules
                      </CardTitle>
                      {!isEditingRules ? (
                        <Button variant="outline" size="sm" onClick={() => setIsEditingRules(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Rules
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setIsEditingRules(false)}>
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveRules}
                            disabled={updateRulesMutation.isPending}
                          >
                            {updateRulesMutation.isPending && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Save
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditingRules ? (
                      <div className="space-y-2">
                        {rules.map((rule, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={rule}
                              onChange={(e) => handleUpdateRule(index, e.target.value)}
                              placeholder="Enter a rule..."
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveRule(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={handleAddRule}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Rule
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {rules.length > 0 ? (
                          rules.map((rule, index) => (
                            <div key={index} className="flex items-start gap-2 p-2 rounded hover:bg-muted/50">
                              <Checkbox checked={true} disabled className="mt-1" />
                              <span className="flex-1 text-sm">{rule}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No rules defined. Click "Edit Rules" to add strategy rules.
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Section B: Live Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Live Performance
                    </CardTitle>
                    <CardDescription>
                      Calculated from all trades using this strategy
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStats ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : strategyStats ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Win Rate</div>
                          <div className="text-2xl font-bold">
                            {strategyStats.winRate.toFixed(1)}%
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Total PnL</div>
                          <div className={cn(
                            "text-2xl font-bold",
                            strategyStats.totalPnl >= 0 ? "text-profit" : "text-destructive"
                          )}>
                            ${maskValue(strategyStats.totalPnl.toFixed(2))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Profit Factor</div>
                          <div className="text-2xl font-bold">
                            {strategyStats.profitFactor.toFixed(2)}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Avg R:R</div>
                          <div className="text-2xl font-bold">
                            {strategyStats.avgRR.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No performance data yet</p>
                    )}
                  </CardContent>
                </Card>

                {/* Section C: Optimization/Tweaks */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Optimization & Tweaks
                      </CardTitle>
                      {!isEditingTweaks ? (
                        <Button variant="outline" size="sm" onClick={() => setIsEditingTweaks(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setIsEditingTweaks(false)}>
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveTweaks}
                            disabled={updateTweaksMutation.isPending}
                          >
                            {updateTweaksMutation.isPending && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Save
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditingTweaks ? (
                      <Textarea
                        value={tweaks}
                        onChange={(e) => setTweaks(e.target.value)}
                        placeholder="Enter notes on what to tweak or optimize..."
                        rows={6}
                      />
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            What to Tweaks
                          </Label>
                          <p className="text-sm whitespace-pre-wrap min-h-[100px] p-3 bg-muted/50 rounded">
                            {tweaks || "No optimization notes yet. Click 'Edit' to add tweaks."}
                          </p>
                        </div>

                        {/* Dynamic Insights */}
                        {strategyStats && strategyStats.totalTrades > 0 && (
                          <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">
                              Insights
                            </Label>
                            <div className="space-y-2">
                              {strategyStats.bestAsset && strategyStats.bestAsset !== "—" && (
                                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                                  <CircleDollarSign className="h-4 w-4 text-primary" />
                                  <span className="text-sm">
                                    <strong>Best Asset:</strong> {strategyStats.bestAsset}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                                <BarChart3 className="h-4 w-4 text-primary" />
                                <span className="text-sm">
                                  <strong>Total Trades:</strong> {strategyStats.totalTrades}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full md:block hidden">
                <div className="text-center text-muted-foreground">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No Play Selected</p>
                  <p className="text-sm mt-1">Select a play from the list or create a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
