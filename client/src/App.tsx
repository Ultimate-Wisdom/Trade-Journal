import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Journal from "@/pages/Journal";
import NewEntry from "@/pages/NewEntry";
import Portfolio from "@/pages/Portfolio";
import TradingAccounts from "@/pages/TradingAccounts";
import Backtest from "@/pages/Backtest";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/journal" component={Journal} />
      <Route path="/backtest" component={Backtest} />
      <Route path="/new-entry" component={NewEntry} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/accounts" component={TradingAccounts} />
      <Route path="/analytics" component={Dashboard} /> 
      {/* Analytics redirects to dashboard for now */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;