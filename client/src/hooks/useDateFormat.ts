import { useQuery } from "@tanstack/react-query";
import { formatUserDate, formatUserDateTime } from "@/lib/dateUtils";

/**
 * Hook to get user's date format preference and formatting functions
 */
export function useDateFormat() {
  const { data: userSettings } = useQuery<{
    currency: string;
    defaultBalance: string;
    dateFormat: "DD-MM-YYYY" | "MM-DD-YYYY";
  }>({
    queryKey: ["/api/settings"],
    retry: false,
    queryFn: async () => {
      const res = await fetch("/api/settings", { credentials: "include" });
      if (!res.ok) {
        return {
          currency: "USD",
          defaultBalance: "10000",
          dateFormat: "DD-MM-YYYY" as const,
        };
      }
      const data = await res.json();
      return {
        currency: data.currency || "USD",
        defaultBalance: data.defaultBalance || "10000",
        dateFormat: (data.dateFormat || "DD-MM-YYYY") as "DD-MM-YYYY" | "MM-DD-YYYY",
      };
    },
  });

  const dateFormat = userSettings?.dateFormat || "DD-MM-YYYY";

  return {
    dateFormat,
    formatDate: (date: Date | string | number | null | undefined) =>
      formatUserDate(date, dateFormat),
    formatDateTime: (date: Date | string | number | null | undefined) =>
      formatUserDateTime(date, dateFormat),
  };
}
