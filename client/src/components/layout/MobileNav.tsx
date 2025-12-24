import { Home, BookOpen, BarChart2, Settings, PlusCircle, Menu } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function MobileNav() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/journal", label: "Journal", icon: BookOpen },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b h-16 flex items-center justify-between px-4">
      <div className="flex items-center gap-2 font-mono text-lg font-bold tracking-tighter text-primary">
        <div className="h-5 w-5 rounded bg-primary" />
        <span className="text-sm">LOG</span>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/new-entry">
          <Button size="sm" className="gap-1">
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Entry</span>
          </Button>
        </Link>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <div className="border-b px-6 py-4 flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-primary" />
                <span className="font-mono font-bold text-primary">TRADELOG</span>
              </div>
              <nav className="flex-1 overflow-y-auto py-4 px-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-4">Menu</div>
                {links.map((link) => {
                  const Icon = link.icon;
                  const isActive = location === link.href;
                  return (
                    <Link key={link.href} href={link.href}>
                      <div
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary pl-2"
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
              <div className="border-t p-4">
                <div className="flex items-center gap-3 rounded-md bg-sidebar-accent/50 p-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-purple-500" />
                  <div className="overflow-hidden">
                    <p className="truncate text-sm font-medium">Trader One</p>
                    <p className="truncate text-xs text-muted-foreground">Pro</p>
                  </div>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
