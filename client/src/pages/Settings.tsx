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
  TrendingUp,
  DollarSign
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const { data: user } = useQuery<{ id: string; username: string }>({
    queryKey: ["/api/user"],
    retry: false,
  });

  const [tradingPreferences, setTradingPreferences] = useState({
    defaultCurrency: "USD",
    defaultRiskPercent: "1.0",
    pricePrecision: "5",
    autoCalculateRRR: true,
  });

  const [displayPreferences, setDisplayPreferences] = useState({
    dateFormat: "MM/DD/YYYY",
    numberFormat: "US",
    showAccountColumn: true,
    showRiskColumn: true,
  });

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

            {/* Trading Preferences */}
            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Trading Preferences
                </CardTitle>
                <CardDescription>
                  Default settings for new trade entries.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="default-currency">Default Currency</Label>
                  <Input
                    id="default-currency"
                    placeholder="USD"
                    value={tradingPreferences.defaultCurrency}
                    onChange={(e) =>
                      setTradingPreferences({ ...tradingPreferences, defaultCurrency: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Default currency for trade entries and calculations
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="default-risk">Default Risk Percentage</Label>
                  <Input
                    id="default-risk"
                    type="number"
                    step="0.1"
                    placeholder="1.0"
                    value={tradingPreferences.defaultRiskPercent}
                    onChange={(e) =>
                      setTradingPreferences({ ...tradingPreferences, defaultRiskPercent: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Default risk percentage per trade (e.g., 1.0 for 1%)
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="price-precision">Price Decimal Precision</Label>
                  <Input
                    id="price-precision"
                    type="number"
                    min="2"
                    max="8"
                    placeholder="5"
                    value={tradingPreferences.pricePrecision}
                    onChange={(e) =>
                      setTradingPreferences({ ...tradingPreferences, pricePrecision: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of decimal places for price display (2 for stocks, 5 for forex)
                  </p>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-rrr">Auto-calculate R:R Ratio</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically calculate Risk:Reward ratio when entering prices
                    </p>
                  </div>
                  <Switch
                    id="auto-rrr"
                    checked={tradingPreferences.autoCalculateRRR}
                    onCheckedChange={(checked) =>
                      setTradingPreferences({ ...tradingPreferences, autoCalculateRRR: checked })
                    }
                  />
                </div>
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

            {/* Data & Privacy */}
            <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Data & Privacy
                </CardTitle>
                <CardDescription>
                  Manage your data and privacy settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Data Export</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Export all your trading data in JSON format
                  </p>
                  <Button variant="outline" className="w-full md:w-auto">
                    <Database className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </CardContent>
            </Card>

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

