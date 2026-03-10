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
 * Parse RRR value from database (can be string "1:2.0" or number 2.0)
 * Returns numeric value (e.g., 2.0) or null if invalid
 */
function parseRRRValue(rrr: string | number | null | undefined): number | null {
  if (rrr === null || rrr === undefined) return null;
  
  // If it's already a number, return it
  if (typeof rrr === 'number') {
    return isNaN(rrr) || rrr <= 0 ? null : rrr;
  }
  
  // If it's a string, parse it
  if (typeof rrr === 'string') {
    // Check if it contains a colon (e.g., "1:2.0")
    if (rrr.includes(':')) {
      const parts = rrr.split(':');
      if (parts.length >= 2) {
        const parsed = parseFloat(parts[1].trim());
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    } else {
      // Try to parse as a plain number string
      const parsed = parseFloat(rrr);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }
  
  return null;
}

/**
 * Calculate average Risk:Reward Ratio from a list of trades
 * Prioritizes stored rrr field, falls back to calculation from prices
 * Returns the numeric average (e.g., 2.0 for 1:2.0) or 0 if no valid trades
 */
export function calculateAverageRR(trades: Trade[]): number {
  let totalRR = 0;
  let rrCount = 0;

  trades.forEach((trade) => {
    // Priority 1: Use stored rrr field if available
    const storedRR = parseRRRValue(trade.rrr);
    if (storedRR !== null) {
      totalRR += storedRR;
      rrCount++;
      return; // Skip calculation if we have stored value
    }
    
    // Priority 2: Calculate R:R from entry, stop loss, and take profit
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
