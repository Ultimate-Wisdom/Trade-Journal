import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Target, Trash2, Edit, Loader2, Brain } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { TradeTemplate } from "@shared/schema";

export default function Strategies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TradeTemplate | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<"Long" | "Short" | "">("");
  const [strategy, setStrategy] = useState("");
  const [setup, setSetup] = useState("");
  const [riskPercent, setRiskPercent] = useState("");
  const [riskRewardRatio, setRiskRewardRatio] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery<TradeTemplate[]>({
    queryKey: ["/api/templates"],
  });

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
    setDirection((template.direction as "Long" | "Short") || "");
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

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Brain className="h-8 w-8 text-primary" />
                Strategy Builder
              </h1>
              <p className="text-muted-foreground mt-1">
                Create and manage reusable trading strategy templates
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate ? "Edit Template" : "Create New Template"}
                  </DialogTitle>
                  <DialogDescription>
                    Define your trading strategy template with common parameters you use frequently
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
                      <Label htmlFor="symbol">Symbol (Optional)</Label>
                      <Input
                        id="symbol"
                        placeholder="e.g., EURUSD"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="direction">Direction</Label>
                      <Select value={direction} onValueChange={(v) => setDirection(v as "Long" | "Short")}>
                        <SelectTrigger id="direction">
                          <SelectValue placeholder="Select direction" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Long">Long</SelectItem>
                          <SelectItem value="Short">Short</SelectItem>
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

                  <div className="space-y-2">
                    <Label htmlFor="setup">Setup</Label>
                    <Textarea
                      id="setup"
                      placeholder="Describe the setup conditions..."
                      value={setup}
                      onChange={(e) => setSetup(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="riskPercent">Risk %</Label>
                      <Input
                        id="riskPercent"
                        type="number"
                        step="0.01"
                        placeholder="e.g., 1.0"
                        value={riskPercent}
                        onChange={(e) => setRiskPercent(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="riskRewardRatio">Risk:Reward Ratio</Label>
                      <Input
                        id="riskRewardRatio"
                        placeholder="e.g., 1:2"
                        value={riskRewardRatio}
                        onChange={(e) => setRiskRewardRatio(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes about this template..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                    {saveMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingTemplate ? "Update" : "Create"} Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Templates Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Templates Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first strategy template to quickly apply common trading parameters
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {template.strategy || "No strategy specified"}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {template.symbol && (
                        <Badge variant="secondary">{template.symbol}</Badge>
                      )}
                      {template.direction && (
                        <Badge variant={template.direction === "Long" ? "default" : "destructive"}>
                          {template.direction}
                        </Badge>
                      )}
                      {template.riskPercent && (
                        <Badge variant="outline">Risk: {template.riskPercent}%</Badge>
                      )}
                      {template.riskRewardRatio && (
                        <Badge variant="outline">R:R {template.riskRewardRatio}</Badge>
                      )}
                    </div>

                    {template.setup && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.setup}
                      </p>
                    )}

                    {template.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2 italic">
                        {template.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
