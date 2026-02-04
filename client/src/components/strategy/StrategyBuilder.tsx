import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lightbulb, Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StrategyRule {
  id: string;
  type: "entry" | "exit" | "risk";
  condition: string;
  value: string;
}

interface Strategy {
  name: string;
  description: string;
  rules: StrategyRule[];
  targetRR: string;
  maxRisk: string;
}

export function StrategyBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Fetch strategies from database (experimental strategies)
  const { data: dbStrategies = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/strategies", "experimental"],
    queryFn: async () => {
      const res = await fetch("/api/strategies?status=experimental", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
  });
  
  // Convert DB strategies to local format (for display)
  const strategies: Strategy[] = dbStrategies.map((s) => ({
    name: s.name,
    description: "", // Strategies table doesn't have description yet
    rules: [], // Rules would need to be stored separately
    targetRR: "",
    maxRisk: "",
  }));
  
  // Form state
  const [strategyName, setStrategyName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState<StrategyRule[]>([]);
  const [targetRR, setTargetRR] = useState("");
  const [maxRisk, setMaxRisk] = useState("");

  const ruleTypes = [
    { value: "entry", label: "Entry Rule" },
    { value: "exit", label: "Exit Rule" },
    { value: "risk", label: "Risk Rule" },
  ];

  const conditions = [
    { value: "price_above", label: "Price above" },
    { value: "price_below", label: "Price below" },
    { value: "trend_up", label: "Trend is up" },
    { value: "trend_down", label: "Trend is down" },
    { value: "breakout", label: "Breakout occurs" },
    { value: "support", label: "At support level" },
    { value: "resistance", label: "At resistance level" },
    { value: "moving_avg_cross", label: "MA crossover" },
    { value: "rsi_oversold", label: "RSI oversold" },
    { value: "rsi_overbought", label: "RSI overbought" },
  ];

  const addRule = () => {
    const newRule: StrategyRule = {
      id: Date.now().toString(),
      type: "entry",
      condition: "",
      value: "",
    };
    setRules([...rules, newRule]);
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const updateRule = (id: string, field: keyof StrategyRule, value: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const resetForm = () => {
    setStrategyName("");
    setDescription("");
    setRules([]);
    setTargetRR("");
    setMaxRisk("");
  };

  // Create strategy mutation (saves to database as experimental)
  const createMutation = useMutation({
    mutationFn: async (strategy: { name: string; description: string; rules: StrategyRule[]; targetRR: string; maxRisk: string }) => {
      const res = await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: strategy.name,
          status: "experimental",
          // Note: We'll store rules/description in a separate table or JSON field in future
          // For now, just save the name
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to create strategy");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      toast({
        title: "Strategy Saved",
        description: `${strategyName} has been saved successfully`,
      });
      resetForm();
      setShowCreateDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save strategy",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!strategyName.trim()) {
      toast({
        title: "Error",
        description: "Strategy name is required",
        variant: "destructive",
      });
      return;
    }

    // Note: Rules validation removed since we're only saving name for now
    // In future, we can add a strategies_metadata table to store full strategy data

    createMutation.mutate({
      name: strategyName,
      description,
      rules,
      targetRR,
      maxRisk,
    });
  };

  // Delete strategy mutation
  const deleteMutation = useMutation({
    mutationFn: async (strategyId: string) => {
      const res = await fetch(`/api/strategies/${strategyId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete strategy");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      toast({
        title: "Strategy Deleted",
        description: "Strategy has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete strategy",
        variant: "destructive",
      });
    },
  });

  const deleteStrategy = (name: string) => {
    const strategy = dbStrategies.find(s => s.name === name);
    if (strategy) {
      deleteMutation.mutate(strategy.id);
    }
  };

  return (
    <Card className="border-sidebar-border bg-card/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Strategy Builder
          </CardTitle>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Strategy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Build Custom Strategy</DialogTitle>
                <DialogDescription>
                  Define your trading strategy rules and conditions
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="strategy-name">
                      Strategy Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="strategy-name"
                      placeholder="e.g., Trend Following Strategy"
                      value={strategyName}
                      onChange={(e) => setStrategyName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your strategy..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="target-rr">Target R:R</Label>
                      <Input
                        id="target-rr"
                        placeholder="1:2"
                        value={targetRR}
                        onChange={(e) => setTargetRR(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max-risk">Max Risk %</Label>
                      <Input
                        id="max-risk"
                        type="number"
                        step="0.1"
                        placeholder="1.0"
                        value={maxRisk}
                        onChange={(e) => setMaxRisk(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Rules */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Strategy Rules</Label>
                    <Button variant="outline" size="sm" onClick={addRule}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Rule
                    </Button>
                  </div>

                  {rules.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                      No rules yet. Add your first rule to define the strategy.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rules.map((rule) => (
                        <div
                          key={rule.id}
                          className="p-3 rounded-lg bg-muted/30 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <Select
                              value={rule.type}
                              onValueChange={(v) => updateRule(rule.id, "type", v)}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ruleTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRule(rule.id)}
                              className="h-8 w-8 p-0 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <Select
                              value={rule.condition}
                              onValueChange={(v) => updateRule(rule.id, "condition", v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select condition" />
                              </SelectTrigger>
                              <SelectContent>
                                {conditions.map((cond) => (
                                  <SelectItem key={cond.value} value={cond.value}>
                                    {cond.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <Input
                              placeholder="Value/Note"
                              value={rule.value}
                              onChange={(e) => updateRule(rule.id, "value", e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={createMutation.isPending}
                  className="gap-2"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Strategy
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : strategies.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No strategies yet. Build your first custom strategy to track rule-based trading!
          </div>
        ) : (
          <div className="space-y-3">
            {strategies.map((strategy) => (
              <div
                key={strategy.name}
                className="p-4 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium">{strategy.name}</h4>
                    {strategy.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {strategy.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteStrategy(strategy.name)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {strategy.targetRR && (
                    <Badge variant="outline">Target: {strategy.targetRR}</Badge>
                  )}
                  {strategy.maxRisk && (
                    <Badge variant="outline">Max Risk: {strategy.maxRisk}%</Badge>
                  )}
                  <Badge variant="outline">{strategy.rules.length} Rules</Badge>
                </div>

                <div className="space-y-1">
                  {strategy.rules.map((rule, idx) => (
                    <div key={rule.id} className="text-sm flex items-center gap-2">
                      <span className="text-muted-foreground">#{idx + 1}</span>
                      <Badge variant="secondary" className="text-xs">
                        {rule.type}
                      </Badge>
                      <span className="text-xs">
                        {conditions.find(c => c.value === rule.condition)?.label || rule.condition}
                        {rule.value && ` - ${rule.value}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
