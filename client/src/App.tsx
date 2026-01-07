import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Journal from "@/pages/Journal";
import NewEntry from "@/pages/NewEntry";
import Portfolio from "@/pages/Portfolio";
import TradingAccounts from "@/pages/TradingAccounts";
import Backtest from "@/pages/Backtest";
import PNLCalendarDashboard from "@/pages/PNLCalendarDashboard";
import AuthPage from "@/pages/AuthPage";
import { Loader2 } from "lucide-react";

function Router() {
  // 1. Ask the backend: "Who is logged in?"
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/user"],
    retry: false, // If 401 (Unauthorized), stop asking and show login
    staleTime: 5 * 60 * 1000, // Cache user data for 5 minutes
  });

  // 2. Show a loading spinner while checking
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 3. If NO user is found (or error like 401), show the Login Gate
  if (!user || error) {
    return <AuthPage />;
  }

  // 4. If user IS found, show the Full App
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/journal" component={Journal} />
      <Route path="/backtest" component={Backtest} />
      <Route path="/calendar" component={PNLCalendarDashboard} />
      <Route path="/new-entry" component={NewEntry} />
      <Route path="/new-entry/:id" component={NewEntry} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/accounts" component={TradingAccounts} />
      <Route path="/analytics" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
