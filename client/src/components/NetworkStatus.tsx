import { useEffect, useState } from "react";
import { AlertCircle, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        toast({
          title: "Connection Restored",
          description: "You're back online. Syncing data...",
          duration: 3000,
        });
        setWasOffline(false);
        // Optionally refetch queries here
        window.location.reload();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      toast({
        title: "No Internet Connection",
        description: "Some features may be limited. Check your connection.",
        variant: "destructive",
        duration: 5000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline, toast]);

  if (isOnline) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 z-50 -translate-x-1/2",
        "flex items-center gap-2 rounded-lg border border-destructive/50",
        "bg-destructive/10 px-4 py-2 shadow-lg backdrop-blur-sm",
        "animate-in slide-in-from-bottom-5"
      )}
    >
      <WifiOff className="h-4 w-4 text-destructive" />
      <span className="text-sm font-medium text-destructive">Offline Mode</span>
    </div>
  );
}
