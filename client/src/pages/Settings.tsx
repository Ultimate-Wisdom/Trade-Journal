import { MobileNav } from "@/components/layout/MobileNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Settings as SettingsIcon, 
  User, 
  Shield, 
  Palette, 
  Database,
  LogOut,
  Save,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { downloadBackup, parseBackupFile, restoreBackup, type BackupData } from "@/lib/backupUtils";
import { Checkbox } from "@/components/ui/checkbox";
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
import { TagManager } from "@/components/tags/TagManager";
import { TemplateManager } from "@/components/templates/TemplateManager";
import { StrategyBuilder } from "@/components/strategy/StrategyBuilder";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: user } = useQuery<{ id: string; username: string }>({
    queryKey: ["/api/user"],
    retry: false,
  });

  const [displayPreferences, setDisplayPreferences] = useState({
    dateFormat: "MM/DD/YYYY",
    numberFormat: "US",
    showAccountColumn: true,
    showRiskColumn: true,
  });

  // Backup/Restore state
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupToRestore, setBackupToRestore] = useState<BackupData | null>(null);
  const [restoreOptions, setRestoreOptions] = useState({
    includeAccounts: true,
    includeTrades: true,
    includeBacktests: true,
  });
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
      window.location.href = "/";
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
  };

  // Backup handler
  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      await downloadBackup();
      toast({
        title: "Backup Created",
        description: "Your data has been exported successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Backup Failed",
        description: error.message || "Failed to create backup",
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  // Restore file selection handler
  const handleRestoreFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const backup = await parseBackupFile(file);
      setBackupToRestore(backup);
      setShowRestoreDialog(true);
    } catch (error: any) {
      toast({
        title: "Invalid Backup File",
        description: error.message || "Failed to parse backup file",
        variant: "destructive",
      });
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Restore confirm handler
  const handleRestoreConfirm = async () => {
    if (!backupToRestore) return;
    
    setIsRestoring(true);
    setShowRestoreDialog(false);
    
    try {
      const result = await restoreBackup(backupToRestore, restoreOptions);
      
      if (result.success) {
        toast({
          title: "Restore Successful",
          description: `Imported ${result.imported.accounts} accounts, ${result.imported.trades} trades, ${result.imported.backtests} backtests`,
        });
        
        // Invalidate all queries to refresh data
        queryClient.invalidateQueries();
      } else {
        toast({
          title: "Restore Completed with Errors",
          description: `Some items failed to import. Check console for details.`,
          variant: "destructive",
        });
        console.error("Restore errors:", result.errors);
      }
    } catch (error: any) {
      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore data",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
      setBackupToRestore(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-4xl">
          {/* Header */}
          <header className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <SettingsIcon className="h-6 w-6 md:h-7 md:w-7 text-primary" />
              Settings
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Manage your account preferences and application settings.
            </p>
          </header>

          <div className="space-y-6">
            {/* Account Settings */}
            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Account
                </CardTitle>
                <CardDescription>
                  Manage your account information and profile settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={user?.username || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Username cannot be changed
                  </p>
                </div>
                <Separator />
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="w-full md:w-auto"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </CardContent>
            </Card>

            {/* Display Preferences */}
            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Display Preferences
                </CardTitle>
                <CardDescription>
                  Customize how data is displayed throughout the application.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date-format">Date Format</Label>
                  <Input
                    id="date-format"
                    placeholder="MM/DD/YYYY"
                    value={displayPreferences.dateFormat}
                    onChange={(e) =>
                      setDisplayPreferences({ ...displayPreferences, dateFormat: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Format for displaying dates (e.g., MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="number-format">Number Format</Label>
                  <Input
                    id="number-format"
                    placeholder="US"
                    value={displayPreferences.numberFormat}
                    onChange={(e) =>
                      setDisplayPreferences({ ...displayPreferences, numberFormat: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Number formatting style (US uses commas, EU uses periods)
                  </p>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-account">Show Account Column</Label>
                    <p className="text-xs text-muted-foreground">
                      Display account column in trade tables
                    </p>
                  </div>
                  <Switch
                    id="show-account"
                    checked={displayPreferences.showAccountColumn}
                    onCheckedChange={(checked) =>
                      setDisplayPreferences({ ...displayPreferences, showAccountColumn: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-risk">Show Risk Column</Label>
                    <p className="text-xs text-muted-foreground">
                      Display risk percentage column in trade tables
                    </p>
                  </div>
                  <Switch
                    id="show-risk"
                    checked={displayPreferences.showRiskColumn}
                    onCheckedChange={(checked) =>
                      setDisplayPreferences({ ...displayPreferences, showRiskColumn: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Data & Backup */}
            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Data Backup & Restore
                </CardTitle>
                <CardDescription>
                  Create backups and restore your trading data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Backup Section */}
                <div className="space-y-2">
                  <Label>Create Backup</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Export all your trading data (accounts, trades, backtests) as a backup file
                  </p>
                  <Button
                    variant="outline"
                    className="w-full md:w-auto"
                    onClick={handleBackup}
                    disabled={isBackingUp}
                  >
                    {isBackingUp ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Backup...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download Backup
                      </>
                    )}
                  </Button>
                </div>
                
                <Separator />
                
                {/* Restore Section */}
                <div className="space-y-2">
                  <Label>Restore from Backup</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Import data from a previous backup file
                  </p>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                    <p className="text-xs text-yellow-500">
                      Restoring will add new data. Existing data won't be deleted.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleRestoreFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="w-full md:w-auto"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRestoring}
                  >
                    {isRestoring ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Restoring...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Select Backup File
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Restore Confirmation Dialog */}
            <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restore from Backup</AlertDialogTitle>
                  <AlertDialogDescription>
                    You're about to restore data from a backup created on{" "}
                    {backupToRestore?.exportDate
                      ? new Date(backupToRestore.exportDate).toLocaleString()
                      : "unknown date"}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                
                {backupToRestore && (
                  <div className="space-y-4 py-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm font-medium mb-2">Backup Contents:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• {backupToRestore.metadata.totalAccounts} Accounts</li>
                        <li>• {backupToRestore.metadata.totalTrades} Trades</li>
                        <li>• {backupToRestore.metadata.totalBacktests} Backtests</li>
                      </ul>
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Select what to import:</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="restore-accounts"
                            checked={restoreOptions.includeAccounts}
                            onCheckedChange={(checked) =>
                              setRestoreOptions({ ...restoreOptions, includeAccounts: !!checked })
                            }
                          />
                          <Label htmlFor="restore-accounts" className="text-sm cursor-pointer">
                            Accounts ({backupToRestore.metadata.totalAccounts})
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="restore-trades"
                            checked={restoreOptions.includeTrades}
                            onCheckedChange={(checked) =>
                              setRestoreOptions({ ...restoreOptions, includeTrades: !!checked })
                            }
                          />
                          <Label htmlFor="restore-trades" className="text-sm cursor-pointer">
                            Trades ({backupToRestore.metadata.totalTrades})
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="restore-backtests"
                            checked={restoreOptions.includeBacktests}
                            onCheckedChange={(checked) =>
                              setRestoreOptions({ ...restoreOptions, includeBacktests: !!checked })
                            }
                          />
                          <Label htmlFor="restore-backtests" className="text-sm cursor-pointer">
                            Backtests ({backupToRestore.metadata.totalBacktests})
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRestoreConfirm}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Restore Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Tag Manager */}
            <TagManager />

            {/* Template Manager */}
            <TemplateManager />

            {/* Strategy Builder */}
            <StrategyBuilder />

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

