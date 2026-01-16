import { Switch, Route } from "wouter";
import { Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NetworkStatus } from "@/components/NetworkStatus";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PrivacyModeProvider } from "@/contexts/PrivacyModeContext";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/AuthPage";
import { Loader2 } from "lucide-react";

// Lazy load routes for better performance and code splitting
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Journal = lazy(() => import("@/pages/Journal"));
const NewEntry = lazy(() => import("@/pages/NewEntry"));
const Portfolio = lazy(() => import("@/pages/Portfolio"));
const TradingAccounts = lazy(() => import("@/pages/TradingAccounts"));
const Backtest = lazy(() => import("@/pages/Backtest"));
const PNLCalendarDashboard = lazy(() => import("@/pages/PNLCalendarDashboard"));
const Settings = lazy(() => import("@/pages/Settings"));
const DebugTrades = lazy(() => import("@/pages/DebugTrades"));

// Loading component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Router component with authentication check
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
    refetchOnWindowFocus: true, // Refetch when window regains focus (for session expiry)
    // Add timeout to prevent infinite loading
    refetchOnMount: true,
  });

  // 2. Show a loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying session...</p>
        </div>
      </div>
    );
  }

  // 3. If NO user is found (or error like 401), show the Login Gate
  if (!user || error) {
    return <AuthPage />;
  }

  // 4. If user IS found, show the Full App with lazy-loaded routes
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/journal" component={Journal} />
        <Route path="/backtest" component={Backtest} />
        <Route path="/calendar" component={PNLCalendarDashboard} />
        <Route path="/new-entry" component={NewEntry} />
        <Route path="/new-entry/:id" component={NewEntry} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/accounts" component={TradingAccounts} />
        <Route path="/settings" component={Settings} />
        <Route path="/analytics" component={Dashboard} />
        <Route path="/debug" component={DebugTrades} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">Privacy Mode Error</p>
                <p className="text-sm text-muted-foreground mb-4">
                  There was an issue initializing privacy mode. The app will continue without it.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Reload Page
                </button>
              </div>
            </div>
          }
        >
          <PrivacyModeProvider>
            <TooltipProvider>
              <Router />
              <Toaster />
              <NetworkStatus />
              <InstallPrompt />
            </TooltipProvider>
          </PrivacyModeProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
