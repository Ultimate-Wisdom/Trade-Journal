import { Account } from "@shared/schema";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ChevronRight, ChevronDown, Building2 } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";

const DELETE_REASONS = [
  "Wrong Account",
  "Account Breached",
  "Account Closed",
  "Duplicate Entry",
  "Testing Account",
  "Other",
];

interface AccountTreeProps {
  accounts: Account[];
  selectedAccountId: string | null;
  onSelectAccount: (accountId: string | null) => void;
}

interface AccountGroup {
  propFirm: string;
  sizes: {
    size: string;
    accounts: Account[];
  }[];
}

// Parse account name to extract prop firm and size
// Examples: "FTMO 100k Swing" → { propFirm: "FTMO", size: "100k" }
//          "The 5%er 10k" → { propFirm: "The 5%er", size: "10k" }
function parseAccountName(name: string): { propFirm: string; size: string } {
  // Match size pattern: digits followed by 'k' or 'K' (e.g., 10k, 100K, 5k)
  // Look for the LAST occurrence of this pattern to avoid matching numbers in firm names
  const sizeMatch = name.match(/\s+(\d+[kK])(?:\s+|$)/);
  
  if (sizeMatch) {
    const size = sizeMatch[1];
    const sizeIndex = name.lastIndexOf(sizeMatch[0]);
    const propFirm = name.substring(0, sizeIndex).trim();
    
    return {
      propFirm: propFirm || name,
      size: size.toUpperCase(),
    };
  }
  
  // Fallback: use entire name as prop firm
  return {
    propFirm: name,
    size: "Other",
  };
}

export function AccountTree({ accounts, selectedAccountId, onSelectAccount }: AccountTreeProps) {
  const { maskValue } = usePrivacyMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedFirms, setExpandedFirms] = useState<Set<string>>(new Set());
  const [expandedSizes, setExpandedSizes] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>("");

  // Group accounts hierarchically: Prop Firm → Size → Account
  const groupedAccounts = accounts.reduce((acc, account) => {
    if (account.type !== "Prop") return acc; // Only show Prop accounts in tree

    const { propFirm, size } = parseAccountName(account.name);
    
    if (!acc[propFirm]) {
      acc[propFirm] = {};
    }
    if (!acc[propFirm][size]) {
      acc[propFirm][size] = [];
    }
    acc[propFirm][size].push(account);
    return acc;
  }, {} as Record<string, Record<string, Account[]>>);

  // Convert to array format for rendering
  const accountGroups: AccountGroup[] = Object.entries(groupedAccounts).map(([propFirm, sizes]) => ({
    propFirm,
    sizes: Object.entries(sizes).map(([size, accounts]) => ({
      size,
      accounts,
    })),
  }));

  const toggleFirm = (firm: string) => {
    const newExpanded = new Set(expandedFirms);
    if (newExpanded.has(firm)) {
      newExpanded.delete(firm);
    } else {
      newExpanded.add(firm);
    }
    setExpandedFirms(newExpanded);
  };

  const toggleSize = (firm: string, size: string) => {
    const key = `${firm}-${size}`;
    const newExpanded = new Set(expandedSizes);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSizes(newExpanded);
  };

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
      if (selectedAccountId === accountToDelete?.id) {
        onSelectAccount(null);
      }
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

  const handleDeleteClick = (account: Account, e: React.MouseEvent) => {
    e.stopPropagation();
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

  if (accountGroups.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
        No prop firm accounts found. Add one to get started.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1">
        {accountGroups.map((group) => {
          const isFirmExpanded = expandedFirms.has(group.propFirm);
          return (
            <div key={group.propFirm} className="border border-sidebar-border rounded-lg overflow-hidden">
              {/* Prop Firm Header */}
              <button
                onClick={() => toggleFirm(group.propFirm)}
                className="w-full flex items-center gap-2 p-3 bg-sidebar-accent/30 hover:bg-sidebar-accent/50 transition-colors text-left"
              >
                {isFirmExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm flex-1 truncate">{group.propFirm}</span>
                <span className="text-xs text-muted-foreground font-mono shrink-0">
                  {group.sizes.reduce((sum, s) => sum + s.accounts.length, 0)}
                </span>
              </button>

              {/* Size Groups */}
              {isFirmExpanded && (
                <div className="border-t border-sidebar-border">
                  {group.sizes.map((sizeGroup) => {
                    const sizeKey = `${group.propFirm}-${sizeGroup.size}`;
                    const isSizeExpanded = expandedSizes.has(sizeKey);
                    return (
                      <div key={sizeKey} className="border-b border-sidebar-border last:border-b-0">
                        {/* Size Header */}
                        <button
                          onClick={() => toggleSize(group.propFirm, sizeGroup.size)}
                          className="w-full flex items-center gap-2 p-2.5 pl-8 bg-sidebar-accent/20 hover:bg-sidebar-accent/30 transition-colors text-left"
                        >
                          {isSizeExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium text-muted-foreground flex-1 truncate">
                            {sizeGroup.size}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono shrink-0">
                            {sizeGroup.accounts.length}
                          </span>
                        </button>

                        {/* Accounts */}
                        {isSizeExpanded && (
                          <div className="bg-background">
                            {sizeGroup.accounts.map((account) => {
                              const isSelected = selectedAccountId === account.id;
                              return (
                                <div
                                  key={account.id}
                                  className={cn(
                                    "flex items-center gap-2 p-2.5 pl-12 hover:bg-sidebar-accent/20 transition-colors cursor-pointer group",
                                    isSelected && "bg-primary/10 border-l-2 border-l-primary"
                                  )}
                                  onClick={() => onSelectAccount(account.id)}
                                >
                                  <div
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: account.color || "#2563eb" }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{account.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      ${maskValue(account.initialBalance)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <AddAccountDialog
                                      account={account}
                                      trigger={
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-7 w-7 border-primary/20 hover:border-primary/40 hover:bg-primary/10"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Pencil className="h-3.5 w-3.5 text-primary" />
                                        </Button>
                                      }
                                    />
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7 border-destructive/20 hover:border-destructive/40 hover:bg-destructive/10 text-destructive"
                                      onClick={(e) => handleDeleteClick(account, e)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{accountToDelete?.name}</strong>?
              This action cannot be undone. All trades will remain but will no longer be linked to this account.
            </AlertDialogDescription>
          </AlertDialogHeader>

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
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-sm font-medium mb-1">Account Details:</p>
                <div className="space-y-0.5 text-sm text-muted-foreground">
                  <p><strong>Name:</strong> {accountToDelete.name}</p>
                  <p><strong>Type:</strong> {accountToDelete.type}</p>
                  <p><strong>Balance:</strong> ${maskValue(accountToDelete.initialBalance)}</p>
                </div>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteReason("");
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={!deleteReason || deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
