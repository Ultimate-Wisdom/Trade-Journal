import { 
  Home, 
  BookOpen, 
  BarChart2, 
  Settings, 
  Menu, 
  Briefcase, 
  TrendingUp, 
  Calendar,
  LogOut,
  User,
  Eye,
  EyeOff,
  Brain,
  Crown,
  Notebook,
  ChartColumnStacked,
  ChartPie
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Logo import - uncomment and update path when you have the logo file
// Option 1: If logo is in public folder, use: const logoImage = "/logo.png";
// Option 2: If logo is in assets folder, use: import logoImage from "@assets/logo.png";
// For now, logoImage is undefined - it will use the icon fallback below
const logoImage: string | undefined = undefined;

// Navigation links grouped by category
const navigationGroups = [
  {
    title: "Trading",
    links: [
      { href: "/", label: "Dashboard", icon: Home },
      { href: "/journal", label: "Journal", icon: Notebook },
    ],
  },
  {
    title: "Analysis",
    links: [
      { href: "/calendar", label: "Calendar", icon: Calendar },
      { href: "/backtest", label: "Backtest", icon: ChartColumnStacked },
      { href: "/portfolio", label: "Portfolio", icon: ChartPie },
      { href: "/playbook", label: "Playbook", icon: BookOpen },
    ],
  },
  {
    title: "Settings",
    links: [
      { href: "/accounts", label: "Accounts", icon: Briefcase },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function MobileNav() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode();

  // Fetch user data
  const { data: user } = useQuery<{ id: string; username: string }>({
    queryKey: ["/api/user"],
    retry: false,
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Get user initials for avatar
  const getUserInitials = (username?: string) => {
    if (!username) return "U";
    return username
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#0B1121] border-b border-slate-800/50 h-16 flex items-center justify-between px-4">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 flex flex-col bg-[#0B1121] border-r border-slate-800/50">
          {/* Header with Logo */}
          <div className="border-b border-slate-800/50 pl-8 pr-6 py-5">
            <Link href="/" onClick={() => setOpen(false)}>
              <div className="flex items-center gap-2.5 cursor-pointer group">
                {/* Logo Image - will show when logoImage is defined above */}
                {typeof logoImage !== "undefined" ? (
                  <img 
                    src={logoImage} 
                    alt="OPES Logo" 
                    className="h-9 w-9 object-contain flex-shrink-0 transition-transform group-hover:scale-105"
                  />
                ) : (
                  // Fallback: Icon-based logo until image is added
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-400/20 flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
                    <TrendingUp className="h-5 w-5 text-amber-400" />
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="font-mono font-bold text-2xl text-amber-400 leading-none">
                    OPES
                  </span>
                  <span className="font-sans text-[10px] text-slate-500 leading-none">
                    by Fhynk Capital
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            {navigationGroups.map((group, groupIndex) => (
              <div key={group.title} className={cn(groupIndex > 0 && "mt-6")}>
                <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 px-4 mb-3 mt-6 first:mt-0">
                  {group.title}
                </div>
                <div className="space-y-1">
                  {group.links.map((link) => {
                    const Icon = link.icon;
                    const isActive = location === link.href;

                    return (
                      <Link key={link.href} href={link.href}>
                        <div
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                            isActive
                              ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-400 font-medium"
                              : "text-slate-400 hover:text-white hover:bg-white/5"
                          )}
                        >
                          <Icon className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isActive && "text-amber-400"
                          )} />
                          {link.label}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User Profile Footer */}
          <div className="border-t border-slate-800/50 pt-4 mt-auto p-4">
            <div className="flex items-center gap-3 rounded-lg bg-slate-900/50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-semibold text-sm flex-shrink-0">
                <Crown className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {user?.username || "User"}
                </p>
                <p className="truncate text-xs text-amber-400 font-semibold tracking-wide">
                  Founder
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" onClick={() => setOpen(false)}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Top Bar Logo */}
      <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity group">
        {/* Logo Image - will show when logoImage is defined above */}
        {typeof logoImage !== "undefined" ? (
          <img 
            src={logoImage} 
            alt="OPES Logo" 
            className="h-7 w-7 object-contain flex-shrink-0 transition-transform group-hover:scale-105"
          />
        ) : (
          // Fallback: Icon-based logo until image is added
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 border border-amber-400/20 flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span className="font-mono text-xl font-bold tracking-tighter text-amber-400 leading-none">
            OPES
          </span>
          <span className="font-sans text-[10px] text-slate-500 leading-none">
            by Fhynk Capital
          </span>
        </div>
      </Link>

      {/* Privacy Mode Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={togglePrivacyMode}
        title={isPrivacyMode ? "Show values" : "Hide values"}
      >
        {isPrivacyMode ? (
          <EyeOff className="h-5 w-5" />
        ) : (
          <Eye className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
