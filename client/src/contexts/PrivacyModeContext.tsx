import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react";

interface PrivacyModeContextType {
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
  maskValue: (value: number | string | undefined | null) => string;
}

const PrivacyModeContext = createContext<PrivacyModeContextType | undefined>(undefined);

export function PrivacyModeProvider({ children }: { children: ReactNode }) {
  const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
    // Load from localStorage on mount (safely check if available)
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const saved = localStorage.getItem("privacyMode");
        return saved === "true";
      } catch (error) {
        console.warn("Failed to read privacyMode from localStorage:", error);
        return false;
      }
    }
    return false;
  });

  useEffect(() => {
    // Save to localStorage whenever it changes (safely check if available)
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem("privacyMode", String(isPrivacyMode));
      } catch (error) {
        console.warn("Failed to save privacyMode to localStorage:", error);
      }
    }
  }, [isPrivacyMode]);

  const togglePrivacyMode = useCallback(() => {
    setIsPrivacyMode((prev) => !prev);
  }, []);

  const maskValue = useCallback((value: number | string | undefined | null): string => {
    if (isPrivacyMode) {
      return "****";
    }
    if (value === undefined || value === null) {
      return "0";
    }
    if (typeof value === "string") {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return value;
      return numValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [isPrivacyMode]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({ isPrivacyMode, togglePrivacyMode, maskValue }),
    [isPrivacyMode, togglePrivacyMode, maskValue]
  );

  return (
    <PrivacyModeContext.Provider value={contextValue}>
      {children}
    </PrivacyModeContext.Provider>
  );
}

export function usePrivacyMode() {
  // Safe fallback function
  const getFallback = () => ({
    isPrivacyMode: false,
    togglePrivacyMode: () => {
      if (process.env.NODE_ENV === "development") {
        console.warn("PrivacyModeProvider not available, toggle ignored");
      }
    },
    maskValue: (value: number | string | undefined | null): string => {
      if (value === undefined || value === null) return "0";
      if (typeof value === "number") {
        return value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
      return String(value);
    },
  });

  // Check if we're in a valid React context
  if (typeof window === "undefined") {
    // SSR - return fallback
    return getFallback();
  }

  // Defensive checks for HMR and initial load - ensure React and useContext are available
  // Check React first to avoid accessing properties on null
  if (!React || typeof React !== "object" || React === null) {
    if (process.env.NODE_ENV === "development") {
      console.warn("React is not available, using fallback values. This may occur during hot module reloading or initial page load.");
    }
    return getFallback();
  }

  // Safely get useContext - check if it exists before accessing
  let useContextFn: typeof useContext | null = null;
  
  // First try the direct import
  if (typeof useContext === "function") {
    useContextFn = useContext;
  }
  // Then try React.useContext (but only if React is not null)
  else if (React && typeof React === "object" && React !== null && typeof React.useContext === "function") {
    useContextFn = React.useContext;
  }

  // If we still don't have a valid useContext function, return fallback
  if (!useContextFn || typeof useContextFn !== "function") {
    if (process.env.NODE_ENV === "development") {
      console.warn("useContext is not available, using fallback values. This may occur during hot module reloading or initial page load.");
    }
    return getFallback();
  }

  try {
    // Attempt to use the context
    const context = useContextFn(PrivacyModeContext);
    
    // If context is undefined, provider is not mounted
    if (context === undefined) {
      if (process.env.NODE_ENV === "development") {
        console.warn("PrivacyModeContext not available, using fallback values. Make sure PrivacyModeProvider wraps your app.");
      }
      return getFallback();
    }
    
    return context;
  } catch (error: any) {
    // Catch any errors (e.g., React not initialized, useContext is null)
    // Silently return fallback to prevent app crash
    if (process.env.NODE_ENV === "development") {
      console.error("Error accessing PrivacyModeContext:", error?.message || error);
    }
    return getFallback();
  }
}
