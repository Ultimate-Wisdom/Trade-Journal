/**
 * Server-side validation utilities for API endpoints
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate trading symbol
 */
export function validateSymbol(symbol: any): ValidationResult {
  if (!symbol || typeof symbol !== "string") {
    return { isValid: false, error: "Symbol is required and must be a string" };
  }
  
  const trimmed = symbol.trim();
  if (trimmed.length === 0 || trimmed.length > 20) {
    return { isValid: false, error: "Symbol must be between 1 and 20 characters" };
  }
  
  // Only allow alphanumeric and common trading symbols
  if (!/^[A-Za-z0-9\/\-\.]+$/.test(trimmed)) {
    return { isValid: false, error: "Symbol contains invalid characters" };
  }
  
  return { isValid: true };
}

/**
 * Validate trading direction
 */
export function validateDirection(direction: any): ValidationResult {
  if (direction !== "Long" && direction !== "Short") {
    return { isValid: false, error: "Direction must be 'Long' or 'Short'" };
  }
  return { isValid: true };
}

/**
 * Validate numeric value with bounds
 */
export function validateNumeric(
  value: any,
  fieldName: string,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    allowZero?: boolean;
  } = {}
): ValidationResult {
  const { required = true, min = 0, max = 1000000000, allowZero = false } = options;

  // Check if required
  if (required && (value === undefined || value === null || value === "")) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  // Allow null/undefined for optional fields
  if (!required && (value === undefined || value === null || value === "")) {
    return { isValid: true };
  }

  // Parse and validate
  const numeric = typeof value === "number" ? value : parseFloat(String(value));
  
  if (isNaN(numeric)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }

  if (!allowZero && numeric === 0) {
    return { isValid: false, error: `${fieldName} must be greater than 0` };
  }

  if (numeric < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (numeric > max) {
    return { isValid: false, error: `${fieldName} must not exceed ${max}` };
  }

  return { isValid: true };
}

/**
 * Validate trade status
 */
export function validateStatus(status: any): ValidationResult {
  const validStatuses = ["Open", "Closed", "Pending"];
  if (!validStatuses.includes(status)) {
    return { isValid: false, error: `Status must be one of: ${validStatuses.join(", ")}` };
  }
  return { isValid: true };
}

/**
 * Validate trade type
 */
export function validateTradeType(tradeType: any): ValidationResult {
  const validTypes = ["TRADE", "ADJUSTMENT"];
  if (!validTypes.includes(tradeType)) {
    return { isValid: false, error: `Trade type must be one of: ${validTypes.join(", ")}` };
  }
  return { isValid: true };
}

/**
 * Validate exit condition
 */
export function validateExitCondition(condition: any): ValidationResult {
  if (condition === null || condition === undefined || condition === "") {
    return { isValid: true }; // Optional field
  }
  
  const validConditions = ["Stop Loss", "Take Profit", "Breakeven", "Manual Close Profit", "Manual Close Loss"];
  if (!validConditions.includes(condition)) {
    return { isValid: false, error: `Exit condition must be one of: ${validConditions.join(", ")}` };
  }
  return { isValid: true };
}

/**
 * Validate string length
 */
export function validateString(
  value: any,
  fieldName: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
  } = {}
): ValidationResult {
  const { required = false, minLength = 0, maxLength = 10000 } = options;

  if (required && (!value || typeof value !== "string" || value.trim().length === 0)) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (!required && (!value || value === "")) {
    return { isValid: true };
  }

  if (typeof value !== "string") {
    return { isValid: false, error: `${fieldName} must be a string` };
  }

  const length = value.trim().length;
  if (length < minLength) {
    return { isValid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }

  if (length > maxLength) {
    return { isValid: false, error: `${fieldName} must not exceed ${maxLength} characters` };
  }

  return { isValid: true };
}

/**
 * Validate account ID exists
 */
export function validateAccountId(accountId: any): ValidationResult {
  if (!accountId || typeof accountId !== "string" || accountId.trim().length === 0) {
    return { isValid: false, error: "Invalid account ID" };
  }
  return { isValid: true };
}

/**
 * Validate date string (ISO format)
 */
export function validateDate(dateString: any, fieldName: string, required: boolean = false): ValidationResult {
  if (!required && (!dateString || dateString === "")) {
    return { isValid: true };
  }

  if (required && (!dateString || dateString === "")) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { isValid: false, error: `${fieldName} must be a valid date` };
  }

  // Check if date is not too far in the past or future
  const now = new Date();
  const tenYearsAgo = new Date(now.getFullYear() - 10, 0, 1);
  const oneYearAhead = new Date(now.getFullYear() + 1, 11, 31);

  if (date < tenYearsAgo || date > oneYearAhead) {
    return { isValid: false, error: `${fieldName} must be within a reasonable date range` };
  }

  return { isValid: true };
}

/**
 * Sanitize string input (remove potentially harmful characters)
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";
  
  // Remove null bytes and other control characters except newlines/tabs
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Validate complete trade data for creation
 */
export function validateTradeCreation(data: any): ValidationResult {
  // Validate trade type
  const tradeType = data.tradeType || "TRADE";
  const typeResult = validateTradeType(tradeType);
  if (!typeResult.isValid) return typeResult;

  // For ADJUSTMENT type, skip symbol/direction validation
  if (tradeType === "ADJUSTMENT") {
    const pnlResult = validateNumeric(data.pnl, "PnL amount", {
      required: true,
      min: -1000000,
      max: 1000000,
      allowZero: true,
    });
    if (!pnlResult.isValid) return pnlResult;
    
    return { isValid: true };
  }

  // For TRADE type, validate all fields
  const symbolResult = validateSymbol(data.symbol);
  if (!symbolResult.isValid) return symbolResult;

  const directionResult = validateDirection(data.direction);
  if (!directionResult.isValid) return directionResult;

  const entryPriceResult = validateNumeric(data.entryPrice, "Entry price", {
    required: true,
    min: 0.00001,
    max: 1000000,
  });
  if (!entryPriceResult.isValid) return entryPriceResult;

  const quantityResult = validateNumeric(data.quantity, "Quantity", {
    required: true,
    min: 0.00001,
    max: 1000000,
  });
  if (!quantityResult.isValid) return quantityResult;

  // Optional fields
  if (data.stopLoss !== null && data.stopLoss !== undefined) {
    const slResult = validateNumeric(data.stopLoss, "Stop loss", {
      required: false,
      min: 0.00001,
      max: 1000000,
    });
    if (!slResult.isValid) return slResult;
  }

  if (data.takeProfit !== null && data.takeProfit !== undefined) {
    const tpResult = validateNumeric(data.takeProfit, "Take profit", {
      required: false,
      min: 0.00001,
      max: 1000000,
    });
    if (!tpResult.isValid) return tpResult;
  }

  if (data.status) {
    const statusResult = validateStatus(data.status);
    if (!statusResult.isValid) return statusResult;
  }

  return { isValid: true };
}
