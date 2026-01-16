import { Trade } from "@shared/types";
import { Account } from "@shared/types";

/**
 * Export trades to CSV format
 */
export function exportToCSV(trades: Trade[], accounts: Account[]): string {
  if (trades.length === 0) {
    return "No trades to export";
  }

  // Create account lookup map
  const accountMap = new Map(accounts.map(acc => [acc.id, acc.name]));

  // Define CSV headers
  const headers = [
    "Date",
    "Account",
    "Symbol",
    "Direction",
    "Entry Price",
    "Entry Time",
    "Risk %",
    "Risk:Reward",
    "Status",
    "P&L",
    "Strategy",
    "Conviction",
    "Notes",
    "Psychology",
    "Mistakes",
    "Improvements",
  ];

  // Convert trades to CSV rows
  const rows = trades.map(trade => {
    const accountName = trade.accountId ? accountMap.get(trade.accountId) || "Unknown" : "N/A";
    const date = trade.entryDate ? new Date(trade.entryDate).toLocaleDateString() : "N/A";
    const pnl = trade.pnl ? parseFloat(trade.pnl) : 0;
    const riskReward = trade.riskRewardRatio || "N/A";
    const conviction = trade.conviction || "N/A";
    const entryTime = trade.entryTime || "N/A";

    return [
      date,
      accountName,
      trade.symbol || "N/A",
      trade.direction || "N/A",
      trade.entryPrice || "N/A",
      entryTime,
      trade.riskPercent || "N/A",
      riskReward,
      trade.status || "N/A",
      pnl.toFixed(2),
      trade.strategy || "N/A",
      conviction,
      `"${(trade.notes || "").replace(/"/g, '""')}"`, // Escape quotes
      `"${(trade.psychology || "").replace(/"/g, '""')}"`,
      `"${(trade.mistakes || "").replace(/"/g, '""')}"`,
      `"${(trade.improvements || "").replace(/"/g, '""')}"`,
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(",")),
  ].join("\n");

  return csvContent;
}

/**
 * Export trades to JSON format
 */
export function exportToJSON(trades: Trade[], accounts: Account[]): string {
  // Create account lookup map
  const accountMap = new Map(accounts.map(acc => [acc.id, acc.name]));

  // Enrich trades with account names
  const enrichedTrades = trades.map(trade => ({
    ...trade,
    accountName: trade.accountId ? accountMap.get(trade.accountId) || "Unknown" : "N/A",
    pnl: trade.pnl ? parseFloat(trade.pnl) : 0,
  }));

  return JSON.stringify(enrichedTrades, null, 2);
}

/**
 * Download a file with the given content
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export trades to CSV and download
 */
export function downloadTradesCSV(trades: Trade[], accounts: Account[]): void {
  const csv = exportToCSV(trades, accounts);
  const timestamp = new Date().toISOString().split("T")[0];
  downloadFile(csv, `trades-export-${timestamp}.csv`, "text/csv");
}

/**
 * Export trades to JSON and download
 */
export function downloadTradesJSON(trades: Trade[], accounts: Account[]): void {
  const json = exportToJSON(trades, accounts);
  const timestamp = new Date().toISOString().split("T")[0];
  downloadFile(json, `trades-export-${timestamp}.json`, "application/json");
}

/**
 * Export backtest results to CSV
 */
export function exportBacktestsToCSV(backtests: any[]): string {
  if (backtests.length === 0) {
    return "No backtests to export";
  }

  const headers = [
    "Date",
    "Symbol",
    "Direction",
    "Risk:Reward",
    "Outcome",
    "Strategy",
    "Entry Time",
  ];

  const rows = backtests.map(bt => {
    const date = bt.createdAt ? new Date(bt.createdAt).toLocaleDateString() : "N/A";
    return [
      date,
      bt.symbol || "N/A",
      bt.direction || "N/A",
      bt.rrr || "N/A",
      bt.outcome || "N/A",
      bt.strategy || "N/A",
      bt.entryTime || "N/A",
    ];
  });

  return [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
}

/**
 * Download backtests as CSV
 */
export function downloadBacktestsCSV(backtests: any[]): void {
  const csv = exportBacktestsToCSV(backtests);
  const timestamp = new Date().toISOString().split("T")[0];
  downloadFile(csv, `backtests-export-${timestamp}.csv`, "text/csv");
}

/**
 * Download backtests as JSON
 */
export function downloadBacktestsJSON(backtests: any[]): void {
  const json = JSON.stringify(backtests, null, 2);
  const timestamp = new Date().toISOString().split("T")[0];
  downloadFile(json, `backtests-export-${timestamp}.json`, "application/json");
}
