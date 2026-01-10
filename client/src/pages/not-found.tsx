import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-sidebar-border bg-card/50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <h1 className="text-2xl md:text-3xl font-bold">404 Page Not Found</h1>
            </div>

            <p className="text-sm text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full">
              <Button onClick={() => setLocation("/")} className="gap-2 w-full sm:w-auto">
                <Home className="h-4 w-4" />
                Go Home
              </Button>
              <Button 
                onClick={() => window.history.back()} 
                variant="outline" 
                className="gap-2 w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
