import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Trade } from "@/lib/mockData"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate Risk:Reward Ratio from entry, stop loss, and take profit
 * Returns the numeric ratio (e.g., 2.0 for 1:2.0) or null if invalid
 */
export function calculateRRR(
  entry: number | undefined,
  sl: number | undefined,
  tp: number | undefined,
  direction: "Long" | "Short" | null | undefined
): number | null {
  if (!entry || !sl || !tp) return null;

  const entryNum = Number(entry);
  const slNum = Number(sl);
  const tpNum = Number(tp);

  if (isNaN(entryNum) || isNaN(slNum) || isNaN(tpNum)) return null;

  // Validate based on direction
  if (direction === "Long") {
    if (slNum >= entryNum) return null; // SL must be lower for Long
    if (tpNum <= entryNum) return null; // TP must be higher for Long
  } else if (direction === "Short") {
    if (slNum <= entryNum) return null; // SL must be higher for Short
    if (tpNum >= entryNum) return null; // TP must be lower for Short
  }

  const risk = Math.abs(entryNum - slNum);
  const reward = Math.abs(tpNum - entryNum);

  if (risk === 0) return null;

  const ratio = reward / risk;
  return ratio;
}

/**
 * Calculate average Risk:Reward Ratio from a list of trades
 * Uses the same calculation logic as Dashboard stats
 * Returns the numeric average (e.g., 2.0 for 1:2.0) or 0 if no valid trades
 */
export function calculateAverageRR(trades: Trade[]): number {
  let totalRR = 0;
  let rrCount = 0;

  trades.forEach((trade) => {
    // Calculate R:R from entry, stop loss, and take profit
    const calculatedRR = calculateRRR(
      trade.entryPrice,
      trade.slPrice,
      trade.tpPrice,
      trade.direction
    );
    
    if (calculatedRR !== null) {
      totalRR += calculatedRR;
      rrCount++;
    }
  });

  return rrCount > 0 ? totalRR / rrCount : 0;
}
