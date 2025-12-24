import { MobileNav } from "@/components/layout/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { mockAccounts } from "@/lib/mockAccounts";
import { TrendingUp, AlertCircle, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const propFirms = mockAccounts.filter((acc) => acc.type === "prop");
const personalAccounts = mockAccounts.filter((acc) => acc.type === "personal");

export default function TradingAccounts() {
  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <MobileNav />
      <main className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto px-4 py-6 md:p-8 max-w-7xl">
          <header className="mb-6 md:mb-8 flex flex-col gap-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Trading Accounts</h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">Manage your prop firm and personal accounts.</p>
            </div>
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
                    <Card key={account.id} className="border-sidebar-border bg-card/50 backdrop-blur-sm overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base md:text-lg">{account.name}</CardTitle>
                            <p className="text-xs md:text-sm text-muted-foreground mt-1">{account.firm}</p>
                          </div>
                          <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
                            Active
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="p-4 rounded-lg bg-sidebar-accent/30 border border-sidebar-border">
                            <p className="text-xs text-muted-foreground mb-1">Account Balance</p>
                            <p className="text-lg md:text-2xl font-mono font-bold">${account.balance.toLocaleString()}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                            <div className="flex items-center gap-1 mb-1">
                              <AlertCircle className="h-4 w-4 text-destructive" />
                              <p className="text-xs text-muted-foreground">Max Daily Loss</p>
                            </div>
                            <p className="text-lg md:text-2xl font-mono font-bold text-destructive">-${account.maxDailyLoss?.toLocaleString()}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-profit/10 border border-profit/30">
                            <div className="flex items-center gap-1 mb-1">
                              <Target className="h-4 w-4 text-profit" />
                              <p className="text-xs text-muted-foreground">Profit Target</p>
                            </div>
                            <p className="text-lg md:text-2xl font-mono font-bold text-profit">${account.profitTarget?.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-sidebar-border">
                          <div className="text-xs text-muted-foreground">
                            Remaining to Target: <span className="font-bold text-profit">${((account.profitTarget || 0) - account.balance).toLocaleString()}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            Progress: <span className="font-bold">{(((account.balance - (account.profitTarget || 0) * 0.5) / ((account.profitTarget || 0) * 0.5)) * 100).toFixed(1)}%</span>
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
                    <Card key={account.id} className="border-sidebar-border bg-card/50 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base md:text-lg">{account.name}</CardTitle>
                            <p className="text-xs md:text-sm text-muted-foreground mt-1">Broker: {account.broker}</p>
                          </div>
                          <Badge variant="outline">Personal</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                          <div className="p-4 rounded-lg bg-sidebar-accent/30 border border-sidebar-border">
                            <p className="text-xs text-muted-foreground mb-2">Balance</p>
                            <p className="text-2xl md:text-3xl font-mono font-bold">${account.balance.toLocaleString()}</p>
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
    </div>
  );
}
