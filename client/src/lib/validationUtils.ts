/**
 * Frontend validation utilities
 * Safe numeric parsing and validation helpers
 */

/**
 * Safely parse a string to float with NaN checking
 * @returns Parsed number or null if invalid
 */
export function safeParseFloat(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const num = typeof value === "number" ? value : parseFloat(String(value));
  
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  return num;
}

/**
 * Safely parse a string to integer with NaN checking
 * @returns Parsed integer or null if invalid
 */
export function safeParseInt(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const num = typeof value === "number" ? Math.floor(value) : parseInt(String(value), 10);
  
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  return num;
}

/**
 * Check if a value is a valid positive number
 */
export function isValidPositiveNumber(value: any): boolean {
  const num = safeParseFloat(value);
  return num !== null && num > 0;
}

/**
 * Check if a value is a valid non-negative number (allows zero)
 */
export function isValidNonNegativeNumber(value: any): boolean {
  const num = safeParseFloat(value);
  return num !== null && num >= 0;
}

/**
 * Format number safely for display
 */
export function formatNumber(value: any, decimals: number = 2): string {
  const num = safeParseFloat(value);
  if (num === null) return "—";
  return num.toFixed(decimals);
}

/**
 * Calculate percentage safely
 */
export function calculatePercentage(value: any, total: any): number | null {
  const numValue = safeParseFloat(value);
  const numTotal = safeParseFloat(total);
  
  if (numValue === null || numTotal === null || numTotal === 0) {
    return null;
  }
  
  return (numValue / numTotal) * 100;
}

/**
 * Validate numeric input with bounds
 */
export function validateNumericInput(
  value: string | number,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    allowZero?: boolean;
  } = {}
): { isValid: boolean; error?: string } {
  const { required = true, min, max, allowZero = true } = options;

  // Check if empty
  if (value === "" || value === null || value === undefined) {
    if (required) {
      return { isValid: false, error: "This field is required" };
    }
    return { isValid: true };
  }

  // Check if valid number
  const num = safeParseFloat(value);
  if (num === null) {
    return { isValid: false, error: "Must be a valid number" };
  }

  // Check zero
  if (!allowZero && num === 0) {
    return { isValid: false, error: "Must be greater than 0" };
  }

  // Check min
  if (min !== undefined && num < min) {
    return { isValid: false, error: `Must be at least ${min}` };
  }

  // Check max
  if (max !== undefined && num > max) {
    return { isValid: false, error: `Must not exceed ${max}` };
  }

  return { isValid: true };
}

/**
 * Safely parse date with validation
 */
export function safeParseDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  const date = new Date(dateValue);
  
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return date;
}

/**
 * Check if date is valid
 */
export function isValidDate(dateValue: any): boolean {
  return safeParseDate(dateValue) !== null;
}

/**
 * Sanitize string input (frontend - basic sanitization)
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return "";
  
  // Remove control characters except newlines and tabs
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}
