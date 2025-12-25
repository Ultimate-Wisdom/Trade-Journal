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

export const mockAccounts: Account[] = [
  {
    id: "1",
    name: "FTMO Challenge #9421",
    type: "prop",
    firm: "FTMO",
    balance: 104200,
    maxDailyLoss: 5000,
    profitTarget: 110000,
    currency: "USD",
  },
  {
    id: "2",
    name: "FTMO Funded #5532",
    type: "prop",
    firm: "FTMO",
    balance: 215000,
    maxDailyLoss: 10000,
    profitTarget: 240000,
    currency: "USD",
  },
  {
    id: "3",
    name: "Personal - Binance Spot",
    type: "personal",
    broker: "Binance",
    balance: 12450,
    currency: "USD",
  },
  {
    id: "4",
    name: "Personal - Interactive Brokers",
    type: "personal",
    broker: "Interactive Brokers",
    balance: 89200,
    currency: "USD",
  },
];

export const mockPortfolioAssets: PortfolioAsset[] = [
  {
    id: "1",
    symbol: "BTC",
    amount: 0.5,
    value: 21500,
    location: "Cold Wallet",
    assetClass: "Digital",
  },
  {
    id: "2",
    symbol: "ETH",
    amount: 5.0,
    value: 18750,
    location: "Metamask",
    assetClass: "Digital",
  },
  {
    id: "3",
    symbol: "USDT",
    amount: 10000,
    value: 10000,
    location: "Binance",
    assetClass: "Stablecoin",
  },
  {
    id: "4",
    symbol: "SPY",
    amount: 150,
    value: 65000,
    location: "IBKR",
    assetClass: "Equities",
  },
  {
    id: "5",
    symbol: "XAU",
    amount: 2,
    value: 4200,
    location: "Physical Safe",
    assetClass: "Commodities",
  },
];

export const calculateTotalNetWorth = () => {
  const accountsTotal = mockAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const assetsTotal = mockPortfolioAssets.reduce((sum, asset) => sum + asset.value, 0);
  return accountsTotal + assetsTotal;
};

export const calculateLiquidCash = () => {
  return mockAccounts.reduce((sum, acc) => sum + acc.balance, 0);
};

export const calculateDigitalAssets = () => {
  return mockPortfolioAssets
    .filter((asset) => asset.assetClass === "Digital" || asset.assetClass === "Stablecoin")
    .reduce((sum, asset) => sum + asset.value, 0);
};
