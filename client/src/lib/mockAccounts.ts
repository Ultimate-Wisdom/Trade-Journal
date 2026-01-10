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
export const calculateTotalNetWorth = (accounts: Array<{ initialBalance: string | null }> = [], assets: PortfolioAsset[] = []) => {
  const accountsTotal = accounts.reduce((sum, acc) => sum + (Number(acc.initialBalance) || 0), 0);
  const assetsTotal = assets.reduce((sum, asset) => sum + asset.value, 0);
  return accountsTotal + assetsTotal;
};

// Helper function to calculate liquid cash - accepts database Account type from schema
export const calculateLiquidCash = (accounts: Array<{ initialBalance: string | null }> = []) => {
  return accounts.reduce((sum, acc) => sum + (Number(acc.initialBalance) || 0), 0);
};

export const calculateDigitalAssets = (assets: PortfolioAsset[] = []) => {
  return assets
    .filter((asset) => asset.assetClass === "Digital" || asset.assetClass === "Stablecoin")
    .reduce((sum, asset) => sum + asset.value, 0);
};
