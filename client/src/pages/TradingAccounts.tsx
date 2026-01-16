import { MobileNav } from "@/components/layout/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Account } from "@shared/schema";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { TrendingUp, AlertCircle, Target, Loader2, Pencil, Trash2, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const DELETE_REASONS = [
  "Wrong Account",
  "Account Breached",
  "Account Closed",
  "Duplicate Entry",
  "Testing Account",
  "Other",
];

export default function TradingAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>("");
  
  // Balance correction state
  const [balanceCorrectionOpen, setBalanceCorrectionOpen] = useState(false);
  const [accountToCorrect, setAccountToCorrect] = useState<Account | null>(null);
  const [currentBalance, setCurrentBalance] = useState<string>("");
  const [correctionReason, setCorrectionReason] = useState<string>("");

  // Fetch real accounts from API
  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  // Filter accounts by type
  const propFirms = useMemo(() => {
    return accounts?.filter((acc) => acc.type === "Prop") || [];
  }, [accounts]);

  const personalAccounts = useMemo(() => {
    return accounts?.filter((acc) => acc.type === "Live" || acc.type === "Demo") || [];
  }, [accounts]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (accountId: string) => {
      return apiRequest("DELETE", `/api/accounts/${accountId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({
        title: "Account Deleted",
        description: `${accountToDelete?.name} has been deleted. Reason: ${deleteReason}`,
      });
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
      setDeleteReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (account: Account) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (accountToDelete && deleteReason) {
      deleteMutation.mutate(accountToDelete.id);
    } else {
      toast({
        title: "Error",
        description: "Please select a reason for deletion",
        variant: "destructive",
      });
    }
  };

  // Balance correction mutation
  const balanceCorrectionMutation = useMutation({
    mutationFn: async (data: { accountId: string; currentBalance: string; reason: string }) => {
      return apiRequest("POST", `/api/accounts/${data.accountId}/adjust-balance`, {
        currentBalance: data.currentBalance,
        reason: data.reason,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({
        title: "Balance Corrected",
        description: `Adjustment of $${data.adjustmentAmount.toFixed(2)} applied to ${accountToCorrect?.name}`,
      });
      setBalanceCorrectionOpen(false);
      setAccountToCorrect(null);
      setCurrentBalance("");
      setCorrectionReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to correct balance",
        variant: "destructive",
      });
    },
  });

  const handleBalanceCorrectionClick = (account: Account) => {
    setAccountToCorrect(account);
    setBalanceCorrectionOpen(true);
  };

  const handleBalanceCorrectionConfirm = () => {
    if (accountToCorrect && currentBalance && correctionReason) {
      balanceCorrectionMutation.mutate({
        accountId: accountToCorrect.id,
        currentBalance,
        reason: correctionReason,
      });
    } else {
      toast({
        title: "Error",
        description: "Please enter current balance and reason",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground font-sans">
        <MobileNav />
        <main className="flex-1 overflow-y-auto pt-20">
          <div className="container mx-auto px-4 py-6 md:p-8 max-w-7xl">
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
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-7xl">
          <header className="mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Trading Accounts</h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">Manage your prop firm and personal accounts.</p>
            </div>
            <AddAccountDialog />
          </header>

          <Tabs defaultValue="prop" className="w-full">
            <TabsList className="mb-6 grid w-full grid-cols-2 md:w-[400px]">
              <TabsTrigger value="prop">Prop Firms</TabsTrigger>
              <TabsTrigger value="personal">Personal Live</TabsTrigger>
            </TabsList>

            <TabsContent value="prop" className="space-y-6">
              <div className="space-y-4">
                {propFirms.length > 0 ? (
                  propFirms.map((account) => (
                    <Card 
                      key={account.id} 
                      className="border-sidebar-border bg-card/50 backdrop-blur-sm overflow-hidden relative"
                      style={{
                        borderLeftColor: account.color || "#2563eb",
                        borderLeftWidth: "4px",
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: account.color || "#2563eb" }}
                            />
                            <div>
                              <CardTitle className="text-base md:text-lg">{account.name}</CardTitle>
                              <p className="text-xs md:text-sm text-muted-foreground mt-1">{account.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <AddAccountDialog
                              account={account}
                              trigger={
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-8 w-8 border-primary/20 hover:border-primary/40 hover:bg-primary/10"
                                >
                                  <Pencil className="h-4 w-4 text-primary" />
                                </Button>
                              }
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/10"
                              onClick={() => handleBalanceCorrectionClick(account)}
                              title="Correct Balance"
                            >
                              <Calculator className="h-4 w-4 text-orange-500" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 border-destructive/20 hover:border-destructive/40 hover:bg-destructive/10"
                              onClick={() => handleDeleteClick(account)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
                              Active
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="p-4 rounded-lg bg-sidebar-accent/30 border border-sidebar-border">
                            <p className="text-xs text-muted-foreground mb-1">Initial Balance</p>
                            <p className="text-lg md:text-2xl font-mono font-bold">
                              ${Number(account.initialBalance || 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                            <div className="flex items-center gap-1 mb-1">
                              <TrendingUp className="h-4 w-4 text-primary" />
                              <p className="text-xs text-muted-foreground">Account Type</p>
                            </div>
                            <p className="text-lg font-semibold text-primary">{account.type}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-sidebar-accent/30 border border-sidebar-border">
                            <p className="text-xs text-muted-foreground mb-1">Account Status</p>
                            <p className="text-lg font-semibold">Active</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="border-sidebar-border bg-card/50">
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground text-sm">No prop firm accounts connected. Add one to get started.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="personal" className="space-y-6">
              <div className="space-y-4">
                {personalAccounts.length > 0 ? (
                  personalAccounts.map((account) => (
                    <Card 
                      key={account.id} 
                      className="border-sidebar-border bg-card/50 backdrop-blur-sm relative"
                      style={{
                        borderLeftColor: account.color || "#2563eb",
                        borderLeftWidth: "4px",
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: account.color || "#2563eb" }}
                            />
                            <div>
                              <CardTitle className="text-base md:text-lg">{account.name}</CardTitle>
                              <p className="text-xs md:text-sm text-muted-foreground mt-1">{account.type} Account</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <AddAccountDialog
                              account={account}
                              trigger={
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-8 w-8 border-primary/20 hover:border-primary/40 hover:bg-primary/10"
                                >
                                  <Pencil className="h-4 w-4 text-primary" />
                                </Button>
                              }
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/10"
                              onClick={() => handleBalanceCorrectionClick(account)}
                              title="Correct Balance"
                            >
                              <Calculator className="h-4 w-4 text-orange-500" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 border-destructive/20 hover:border-destructive/40 hover:bg-destructive/10"
                              onClick={() => handleDeleteClick(account)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <Badge variant="outline">{account.type}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                          <div className="p-4 rounded-lg bg-sidebar-accent/30 border border-sidebar-border">
                            <p className="text-xs text-muted-foreground mb-2">Initial Balance</p>
                            <p className="text-2xl md:text-3xl font-mono font-bold">
                              ${Number(account.initialBalance || 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                            <div className="flex items-center gap-1 mb-1">
                              <TrendingUp className="h-4 w-4 text-primary" />
                              <p className="text-xs text-muted-foreground">Account Status</p>
                            </div>
                            <p className="text-lg font-semibold text-primary">Active</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="border-sidebar-border bg-card/50">
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground text-sm">No personal accounts connected. Add one to get started.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Balance Correction Dialog */}
      <Dialog open={balanceCorrectionOpen} onOpenChange={setBalanceCorrectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correct Account Balance</DialogTitle>
            <DialogDescription>
              Update the balance of <strong>{accountToCorrect?.name}</strong> to match your broker.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-balance">Current Actual Balance ($) *</Label>
              <Input
                id="current-balance"
                type="number"
                step="0.01"
                placeholder="9200.00"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Enter the exact balance from your broker
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="correction-reason">Reason for Correction *</Label>
              <Input
                id="correction-reason"
                placeholder="e.g., Manual withdrawals, external deposits"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
              />
            </div>

            {accountToCorrect && currentBalance && (
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <p className="text-sm font-medium mb-2">Adjustment Preview:</p>
                <div className="space-y-1 text-sm">
                  <p><strong>Account:</strong> {accountToCorrect.name}</p>
                  <p><strong>Initial Balance:</strong> ${Number(accountToCorrect.initialBalance).toLocaleString()}</p>
                  <p><strong>New Balance:</strong> ${parseFloat(currentBalance || "0").toLocaleString()}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  An adjustment entry will be created with the difference amount.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBalanceCorrectionOpen(false);
                setAccountToCorrect(null);
                setCurrentBalance("");
                setCorrectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={handleBalanceCorrectionConfirm}
              disabled={!currentBalance || !correctionReason || balanceCorrectionMutation.isPending}
            >
              {balanceCorrectionMutation.isPending ? "Applying..." : "Apply Correction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{accountToDelete?.name}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-reason">Reason for Deletion *</Label>
              <Select value={deleteReason} onValueChange={setDeleteReason}>
                <SelectTrigger id="delete-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {DELETE_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {accountToDelete && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-sm font-medium mb-2">Account Details:</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p><strong>Name:</strong> {accountToDelete.name}</p>
                  <p><strong>Type:</strong> {accountToDelete.type}</p>
                  <p><strong>Balance:</strong> ${Number(accountToDelete.initialBalance).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setAccountToDelete(null);
                setDeleteReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={!deleteReason || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
