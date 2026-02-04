import { Trade, Account } from "@shared/types";

export interface BackupData {
  version: string;
  exportDate: string;
  data: {
    trades: Trade[];
    accounts: Account[];
    backtests: any[];
  };
  metadata: {
    totalTrades: number;
    totalAccounts: number;
    totalBacktests: number;
  };
}

/**
 * Create a complete backup of all user data
 */
export async function createBackup(): Promise<BackupData> {
  // Fetch all data
  const [tradesRes, accountsRes, backtestsRes] = await Promise.all([
    fetch("/api/trades", { credentials: "include" }),
    fetch("/api/accounts", { credentials: "include" }),
    fetch("/api/backtests", { credentials: "include" }),
  ]);

  const trades = await tradesRes.json();
  const accounts = await accountsRes.json();
  const backtests = await backtestsRes.json();

  const backup: BackupData = {
    version: "1.0.0",
    exportDate: new Date().toISOString(),
    data: {
      trades,
      accounts,
      backtests,
    },
    metadata: {
      totalTrades: trades.length,
      totalAccounts: accounts.length,
      totalBacktests: backtests.length,
    },
  };

  return backup;
}

/**
 * Download backup as JSON file
 */
export async function downloadBackup(): Promise<void> {
  const backup = await createBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().split("T")[0];
  link.href = url;
  link.download = `opes-backup-${timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate backup file structure
 */
export function validateBackup(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!data.version) {
    errors.push("Missing backup version");
  }
  
  if (!data.exportDate) {
    errors.push("Missing export date");
  }

  if (!data.data) {
    errors.push("Missing data section");
  } else {
    if (!Array.isArray(data.data.trades)) {
      errors.push("Invalid trades data");
    }
    if (!Array.isArray(data.data.accounts)) {
      errors.push("Invalid accounts data");
    }
    if (!Array.isArray(data.data.backtests)) {
      errors.push("Invalid backtests data");
    }
  }

  if (!data.metadata) {
    errors.push("Missing metadata section");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse backup file
 */
export function parseBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        const validation = validateBackup(data);
        
        if (!validation.valid) {
          reject(new Error(`Invalid backup file: ${validation.errors.join(", ")}`));
          return;
        }
        
        resolve(data as BackupData);
      } catch (error) {
        reject(new Error("Failed to parse backup file. Make sure it's a valid JSON file."));
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read backup file"));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Restore data from backup
 * WARNING: This will delete all existing data!
 */
export async function restoreBackup(
  backup: BackupData,
  options: {
    includeAccounts: boolean;
    includeTrades: boolean;
    includeBacktests: boolean;
  }
): Promise<{
  success: boolean;
  imported: {
    accounts: number;
    trades: number;
    backtests: number;
  };
  errors: string[];
}> {
  const imported = {
    accounts: 0,
    trades: 0,
    backtests: 0,
  };
  const errors: string[] = [];

  try {
    // Note: This is a simplified implementation
    // In production, you'd want to handle this on the server side with proper transaction support
    
    // Import accounts first (if enabled)
    if (options.includeAccounts) {
      for (const account of backup.data.accounts) {
        try {
          // Map old backup format to current schema
          const accountPayload: any = {
            name: account.name,
            type: account.type || account.broker || "LIVE", // Fallback for old backups
            initialBalance: account.initialBalance || account.balance || "10000",
            color: account.color || "#2563eb",
          };
          
          const res = await fetch("/api/accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(accountPayload),
          });
          
          if (res.ok) {
            imported.accounts++;
          } else {
            const errorText = await res.text();
            errors.push(`Failed to import account: ${account.name} - ${errorText}`);
          }
        } catch (error: any) {
          errors.push(`Error importing account ${account.name}: ${error.message || error}`);
        }
      }
    }

    // Import trades (if enabled)
    if (options.includeTrades) {
      for (const trade of backup.data.trades) {
        try {
          const res = await fetch("/api/trades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(trade),
          });
          
          if (res.ok) {
            imported.trades++;
          } else {
            errors.push(`Failed to import trade: ${trade.symbol}`);
          }
        } catch (error) {
          errors.push(`Error importing trade: ${error}`);
        }
      }
    }

    // Import backtests (if enabled)
    if (options.includeBacktests) {
      for (const backtest of backup.data.backtests) {
        try {
          const res = await fetch("/api/backtests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(backtest),
          });
          
          if (res.ok) {
            imported.backtests++;
          } else {
            errors.push(`Failed to import backtest`);
          }
        } catch (error) {
          errors.push(`Error importing backtest: ${error}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      imported,
      errors,
    };
  } catch (error: any) {
    return {
      success: false,
      imported,
      errors: [error.message || "Unknown error during restore"],
    };
  }
}
