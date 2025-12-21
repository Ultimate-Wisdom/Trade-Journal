import { Home, BookOpen, BarChart2, Settings, PlusCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/journal", label: "Journal", icon: BookOpen },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2 font-mono text-xl font-bold tracking-tighter text-primary">
          <div className="h-6 w-6 rounded bg-primary" />
          TRADELOG
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="space-y-1 px-4">
          <Link href="/new-entry">
            <button className="mb-6 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-95">
              <PlusCircle className="h-4 w-4" />
              New Entry
            </button>
          </Link>

          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2 mt-2">Menu</div>
          
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <div
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground border-r-2 border-primary"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t p-4">
        <div className="flex items-center gap-3 rounded-md bg-sidebar-accent/50 p-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-purple-500" />
          <div className="overflow-hidden">
            <p className="truncate text-sm font-medium">Trader One</p>
            <p className="truncate text-xs text-muted-foreground">Pro Plan</p>
          </div>
        </div>
      </div>
    </div>
  );
}