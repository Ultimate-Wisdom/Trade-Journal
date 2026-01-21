export interface Account {
  id: string;
  name: string;
  type: "prop" | "personal";
  firm?: string;
  broker?: string;
  balance: number;
  maxDailyLoss?: number;
  profitTarget?: number;
  currency: string;
}

export interface PortfolioAsset {
  id: string;
  symbol: string;
  amount: number;
  value: number;
  location: string;
  assetClass: string;
}

export interface RemovedAsset {
  id: string;
  symbol: string;
  amount: number;
  value: number;
  location: string;
  assetClass: string;
  removedDate: string;
  removalReason: string;
}

export interface RemovedAccount {
  id: string;
  name: string;
  firm?: string;
  broker?: string;
  balance: number;
  removedDate: string;
  removalReason: string;
}

// Note: Mock data has been cleared - accounts come from database via API
export const mockAccounts: Account[] = [];

export const mockPortfolioAssets: PortfolioAsset[] = [];

// Helper function to calculate net worth - accepts database Account type from schema
// Excludes Prop Firm accounts (only includes Live/Personal accounts and Crypto assets)
export const calculateTotalNetWorth = (accounts: Array<{ initialBalance: string | null; type: string | null }> = [], assets: PortfolioAsset[] = []) => {
  // Only include Personal accounts (Live) and Demo accounts, NOT Prop Firm accounts
  const personalAccountsTotal = accounts
    .filter((acc) => acc.type === "Live" || acc.type === "Demo")
    .reduce((sum, acc) => sum + (Number(acc.initialBalance) || 0), 0);
  const assetsTotal = assets.reduce((sum, asset) => sum + asset.value, 0);
  return personalAccountsTotal + assetsTotal;
};

// Helper function to calculate liquid cash - accepts database Account type from schema
// Excludes Prop Firm accounts (only includes Personal/Cash accounts)
export const calculateLiquidCash = (accounts: Array<{ initialBalance: string | null; type: string | null }> = []) => {
  // Only include Personal accounts (Live) and Demo accounts, NOT Prop Firm accounts
  return accounts
    .filter((acc) => acc.type === "Live" || acc.type === "Demo")
    .reduce((sum, acc) => sum + (Number(acc.initialBalance) || 0), 0);
};

// Helper function to calculate Prop Firm allocation (Buying Power)
// Only includes Prop Firm accounts
export const calculatePropAllocation = (accounts: Array<{ initialBalance: string | null; type: string | null }> = []) => {
  // Only include Prop Firm accounts
  return accounts
    .filter((acc) => acc.type === "Prop")
    .reduce((sum, acc) => sum + (Number(acc.initialBalance) || 0), 0);
};

export const calculateDigitalAssets = (assets: PortfolioAsset[] = []) => {
  return assets
    .filter((asset) => asset.assetClass === "Digital" || asset.assetClass === "Stablecoin")
    .reduce((sum, asset) => sum + asset.value, 0);
};

// Currency conversion constants
export const USD_TO_MYR = 4.45; // 1 USD = 4.45 MYR (approximate)
export const MYR_TO_USD_RATE = 4.45; // Used for conversion: divide MYR by this to get USD
export const USD_TO_MYR_RATE = 0.225; // 1 USD = 4.45 MYR (inverse of MYR_TO_USD_RATE)

// Convert asset balance to USD
// If currency is MYR, divide by 4.45 (or multiply by 0.225)
// If currency is USD, return as-is
export const convertToUSD = (balance: number, currency: string): number => {
  if (currency === "USD") {
    return balance;
  } else if (currency === "MYR") {
    return balance / MYR_TO_USD_RATE; // Divide MYR by 4.45 to get USD
  }
  return balance; // Default to balance if unknown currency
};

// Calculate net worth including portfolio assets with currency conversion
// Excludes Prop Firm accounts and PROP_FIRM assets
// Uses calculatedValueUsd if available (for crypto with live prices), otherwise calculates manually
export const calculateTotalNetWorthWithAssets = (
  accounts: Array<{ initialBalance: string | null; type: string | null }> = [],
  portfolioAssets: Array<{ 
    balance?: string | number | null; 
    currency: string; 
    type: string;
    calculatedValueUsd?: number | null;
    quantity?: string | number | null;
  }> = []
): number => {
  // Only include Personal accounts (Live) and Demo accounts, NOT Prop Firm accounts
  const personalAccountsTotal = accounts
    .filter((acc) => acc.type === "Live" || acc.type === "Demo")
    .reduce((sum, acc) => sum + (Number(acc.initialBalance) || 0), 0);
  
  // Convert portfolio assets to USD (excluding PROP_FIRM assets)
  const assetsTotal = portfolioAssets
    .filter((asset) => asset.type !== "PROP_FIRM")
    .reduce((sum, asset) => {
      // Use calculatedValueUsd if available (from API with live prices)
      if (asset.calculatedValueUsd !== null && asset.calculatedValueUsd !== undefined) {
        return sum + asset.calculatedValueUsd;
      }
      
      // Fallback: Manual calculation
      if (asset.type === "CRYPTO" && asset.quantity) {
        // For crypto without live price, we can't calculate USD value accurately
        // Return 0 or handle error state
        return sum;
      } else if (asset.balance) {
        const balance = typeof asset.balance === "string" ? parseFloat(asset.balance) : asset.balance;
        return sum + convertToUSD(balance, asset.currency);
      }
      
      return sum;
    }, 0);
  
  return personalAccountsTotal + assetsTotal;
};

// Calculate Prop Firm allocation (Buying Power)
export const calculatePropAllocationFromAssets = (
  portfolioAssets: Array<{ 
    type: string;
    balance?: string | number | null;
    calculatedValueUsd?: number | null;
  }> = []
): number => {
  return portfolioAssets
    .filter((asset) => asset.type === "PROP_FIRM")
    .reduce((sum, asset) => {
      // Use calculatedValueUsd if available
      if (asset.calculatedValueUsd !== null && asset.calculatedValueUsd !== undefined) {
        return sum + asset.calculatedValueUsd;
      }
      // Fallback to balance
      if (asset.balance) {
        const balance = typeof asset.balance === "string" ? parseFloat(asset.balance) : Number(asset.balance);
        return sum + balance; // Prop Firm balances are stored in USD
      }
      return sum;
    }, 0);
};
