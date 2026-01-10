import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show dialog after a delay to not interrupt user
      setTimeout(() => {
        const hasSeenPrompt = localStorage.getItem("pwa-install-prompt-dismissed");
        if (!hasSeenPrompt) {
          setShowDialog(true);
        }
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowDialog(false);
      setDeferredPrompt(null);
      localStorage.removeItem("pwa-install-prompt-dismissed");
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setShowDialog(false);
    localStorage.setItem("pwa-install-prompt-dismissed", "true");
  };

  // Don't show if already installed or no prompt available
  if (isInstalled || !deferredPrompt || !showDialog) {
    return null;
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Install OPES Trading Journal</DialogTitle>
          <DialogDescription>
            Install this app on your device for a better experience. You can access it offline and add it to your home screen.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button onClick={handleInstall} className="gap-2 w-full sm:w-auto">
            <Download className="h-4 w-4" />
            Install App
          </Button>
          <Button
            onClick={handleDismiss}
            variant="outline"
            className="gap-2 w-full sm:w-auto"
          >
            <X className="h-4 w-4" />
            Not Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
