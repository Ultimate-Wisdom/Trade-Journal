import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Plus, Trash2, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TradeTemplate } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

interface TemplateManagerProps {
  onApplyTemplate?: (template: TradeTemplate) => void;
}

export function TemplateManager({ onApplyTemplate }: TemplateManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<TradeTemplate | null>(null);
  
  // Form state
  const [templateName, setTemplateName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState("");
  const [strategy, setStrategy] = useState("");
  const [setup, setSetup] = useState("");
  const [riskPercent, setRiskPercent] = useState("");
  const [riskRewardRatio, setRiskRewardRatio] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery<TradeTemplate[]>({
    queryKey: ["/api/templates"],
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (template: any) => {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(template),
      });
      if (!res.ok) throw new Error("Failed to create template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template Created",
        description: "Trade template saved successfully",
      });
      resetForm();
      setShowCreateDialog(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
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
      if (!res.ok) throw new Error("Failed to delete template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template Deleted",
        description: "Template removed successfully",
      });
      setShowDeleteDialog(false);
      setTemplateToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTemplateName("");
    setSymbol("");
    setDirection("");
    setStrategy("");
    setSetup("");
    setRiskPercent("");
    setRiskRewardRatio("");
    setNotes("");
  };

  const handleCreate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      name: templateName.trim(),
      symbol: symbol || null,
      direction: direction || null,
      strategy: strategy || null,
      setup: setup || null,
      riskPercent: riskPercent || null,
      riskRewardRatio: riskRewardRatio || null,
      notes: notes || null,
    });
  };

  const handleApply = (template: TradeTemplate) => {
    if (onApplyTemplate) {
      onApplyTemplate(template);
      toast({
        title: "Template Applied",
        description: `Applied template: ${template.name}`,
      });
    }
  };

  const handleDelete = (template: TradeTemplate) => {
    setTemplateToDelete(template);
    setShowDeleteDialog(true);
  };

  return (
    <Card className="border-sidebar-border bg-card/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Trade Templates
          </CardTitle>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Trade Template</DialogTitle>
                <DialogDescription>
                  Save common trade setups for quick reuse
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">
                    Template Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="template-name"
                    placeholder="e.g., Breakout Long Setup"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="template-symbol">Symbol</Label>
                    <Input
                      id="template-symbol"
                      placeholder="e.g., EURUSD"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-direction">Direction</Label>
                    <Input
                      id="template-direction"
                      placeholder="Long/Short"
                      value={direction}
                      onChange={(e) => setDirection(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-strategy">Strategy</Label>
                  <Input
                    id="template-strategy"
                    placeholder="e.g., Trend Following"
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-setup">Setup</Label>
                  <Textarea
                    id="template-setup"
                    placeholder="Describe the setup..."
                    value={setup}
                    onChange={(e) => setSetup(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="template-risk">Risk %</Label>
                    <Input
                      id="template-risk"
                      type="number"
                      step="0.1"
                      placeholder="1.0"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-rrr">Risk:Reward</Label>
                    <Input
                      id="template-rrr"
                      placeholder="1:2"
                      value={riskRewardRatio}
                      onChange={(e) => setRiskRewardRatio(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-notes">Notes</Label>
                  <Textarea
                    id="template-notes"
                    placeholder="Additional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Template"
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
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No templates yet. Create your first template to save time on repetitive setups!
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{template.name}</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {template.symbol && (
                        <Badge variant="outline" className="text-xs">
                          {template.symbol}
                        </Badge>
                      )}
                      {template.direction && (
                        <Badge variant="outline" className="text-xs">
                          {template.direction}
                        </Badge>
                      )}
                      {template.strategy && (
                        <Badge variant="outline" className="text-xs">
                          {template.strategy}
                        </Badge>
                      )}
                      {template.riskRewardRatio && (
                        <Badge variant="outline" className="text-xs">
                          R:R {template.riskRewardRatio}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {onApplyTemplate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleApply(template)}
                        className="h-8"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template)}
                      className="h-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => templateToDelete && deleteMutation.mutate(templateToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
