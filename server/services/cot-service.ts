import { db } from "../db";
import { cotData } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import axios from "axios";
import AdmZip from "adm-zip";

// Note: For optimal Postgres upserts, consider adding a unique constraint:
// ALTER TABLE cot_data ADD CONSTRAINT cot_data_symbol_date_unique UNIQUE (symbol, report_date);
// This would allow using onConflictDoUpdate() for better performance
//
// Data Type Handling:
// - Drizzle ORM with Postgres numeric() type requires string values
// - Values are stored as strings but converted to numbers when retrieved
// - Frontend receives numeric values (converted in getCOTData/getLatestCOTSentiment)

// CFTC Market Name to Symbol mappings
const CFTC_MARKET_MAP: Record<string, string> = {
  "EURO CURRENCY - CHICAGO MERCANTILE EXCHANGE": "EUR",
  "BRITISH POUND - CHICAGO MERCANTILE EXCHANGE": "GBP",
  "JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE": "JPY",
  "U.S. DOLLAR INDEX - ICE FUTURES U.S.": "DXY",
};

// Reverse mapping: symbol to CFTC market name
const SYMBOL_TO_CFTC_MARKET: Record<string, string> = {
  EUR: "EURO CURRENCY - CHICAGO MERCANTILE EXCHANGE",
  GBP: "BRITISH POUND - CHICAGO MERCANTILE EXCHANGE",
  JPY: "JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE",
  DXY: "U.S. DOLLAR INDEX - ICE FUTURES U.S.",
};

interface COTRow {
  symbol: string;
  reportDate: Date;
  leveragedMoneyLong: number;
  leveragedMoneyShort: number;
  netPosition: number;
}

interface CFTCDataRow {
  marketName: string;
  reportDate: string;
  leveragedMoneyLong: number;
  leveragedMoneyShort: number;
}

/**
 * Parse CFTC text format data
 * CFTC format is typically pipe-delimited with specific column positions
 * We need to find "LEVERAGED MONEY" category and extract Long/Short positions
 */
function parseCFTCTextData(textData: string): CFTCDataRow[] {
  const lines = textData.split("\n").filter(line => line.trim());
  const data: CFTCDataRow[] = [];
  
  // CFTC format typically has fixed positions or pipe-delimited
  // Look for market names and their associated Leveraged Money positions
  
  let currentMarket = "";
  let currentDate = "";
  let inLeveragedMoneySection = false;
  let leveragedMoneyLong = 0;
  let leveragedMoneyShort = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const upperLine = line.toUpperCase();
    
    // Skip empty lines and separators
    if (!line || line.startsWith("=") || line.startsWith("-") || line.startsWith("#")) {
      continue;
    }
    
    // Check if this line contains a market name we're tracking
    for (const [marketName, symbol] of Object.entries(CFTC_MARKET_MAP)) {
      const marketKey = marketName.split(" - ")[0].toUpperCase();
      if (upperLine.includes(marketKey)) {
        // Found a market we're tracking
        currentMarket = marketName;
        
        // Try to extract date from the line or nearby lines
        const dateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
        if (dateMatch) {
          currentDate = dateMatch[1];
        }
        
        // Reset leveraged money tracking
        inLeveragedMoneySection = false;
        leveragedMoneyLong = 0;
        leveragedMoneyShort = 0;
        break;
      }
    }
    
    // Look for "LEVERAGED MONEY" or "LEVERAGED FUNDS" category
    if (upperLine.includes("LEVERAGED MONEY") || upperLine.includes("LEVERAGED FUNDS")) {
      inLeveragedMoneySection = true;
      
      // Parse the line - could be pipe-delimited or space-delimited
      const parts = line.split(/\||\s{2,}/).map(p => p.trim()).filter(p => p);
      
      // Try to find Long and Short positions
      for (let j = 0; j < parts.length; j++) {
        const part = parts[j].replace(/,/g, "");
        const num = parseFloat(part);
        
        if (!isNaN(num) && num > 0) {
          // Heuristic: if we haven't found long yet and this is a large number, it's likely long
          if (leveragedMoneyLong === 0 && num > 1000) {
            leveragedMoneyLong = num;
          }
          // If we have long and this is different, it's likely short
          else if (leveragedMoneyLong > 0 && Math.abs(num - leveragedMoneyLong) > 1000) {
            leveragedMoneyShort = num;
          }
        }
      }
      
      // Alternative: look for explicit "LONG" and "SHORT" labels
      const longMatch = upperLine.match(/LONG[:\s]+([\d,]+)/);
      const shortMatch = upperLine.match(/SHORT[:\s]+([\d,]+)/);
      
      if (longMatch) {
        leveragedMoneyLong = parseFloat(longMatch[1].replace(/,/g, ""));
      }
      if (shortMatch) {
        leveragedMoneyShort = parseFloat(shortMatch[1].replace(/,/g, ""));
      }
      
      // If we found both positions and have a current market, save it
      if (currentMarket && leveragedMoneyLong > 0 && leveragedMoneyShort > 0) {
        data.push({
          marketName: currentMarket,
          reportDate: currentDate || new Date().toISOString().split("T")[0],
          leveragedMoneyLong,
          leveragedMoneyShort,
        });
        
        console.log(`   Found ${CFTC_MARKET_MAP[currentMarket]}: Long=${leveragedMoneyLong}, Short=${leveragedMoneyShort}`);
        
        // Reset for next market
        currentMarket = "";
        currentDate = "";
        leveragedMoneyLong = 0;
        leveragedMoneyShort = 0;
      }
    }
  }
  
  // If we didn't find data with the above method, try a more aggressive search
  if (data.length === 0) {
    console.log("   Trying alternative parsing method...");
    
    // Look for patterns like: "EURO" followed by numbers that could be positions
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const upperLine = line.toUpperCase();
      
      // Check each market
      for (const [marketName, symbol] of Object.entries(CFTC_MARKET_MAP)) {
        const marketKey = marketName.split(" - ")[0].toUpperCase();
        
        if (upperLine.includes(marketKey)) {
          // Look ahead for Leveraged Money data (within next 20 lines)
          for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
            const nextLine = lines[j].toUpperCase();
            
            if (nextLine.includes("LEVERAGED MONEY") || nextLine.includes("LEVERAGED FUNDS")) {
              const parts = lines[j].split(/\||\s+/).map(p => p.trim().replace(/,/g, "")).filter(p => p);
              
              let long = 0;
              let short = 0;
              
              for (const part of parts) {
                const num = parseFloat(part);
                if (!isNaN(num) && num > 1000) {
                  if (long === 0) long = num;
                  else if (short === 0 && Math.abs(num - long) > 100) short = num;
                }
              }
              
              if (long > 0 && short > 0) {
                data.push({
                  marketName,
                  reportDate: new Date().toISOString().split("T")[0],
                  leveragedMoneyLong: long,
                  leveragedMoneyShort: short,
                });
                console.log(`   Found ${symbol} (alt method): Long=${long}, Short=${short}`);
                break;
              }
            }
          }
        }
      }
    }
  }
  
  if (data.length === 0) {
    console.warn("⚠️ Could not parse any CFTC data - format may have changed");
    console.warn("   First 10 lines of data:");
    lines.slice(0, 10).forEach((line, idx) => {
      console.warn(`   ${idx + 1}: ${line.substring(0, 100)}`);
    });
  }
  
  return data;
}

/**
 * Fetch COT data from CFTC API (Primary method)
 */
async function fetchCFTCAPI(): Promise<CFTCDataRow[]> {
  try {
    console.log("📥 Fetching COT data from CFTC API...");
    
    // CFTC Financial Futures Weekly Report API endpoint
    const apiUrl = "https://www.cftc.gov/dea/newcot/FinFutWk.txt";
    
    const response = await axios.get(apiUrl, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; COT Data Fetcher/1.0)",
        "Accept": "text/plain, */*",
      },
    });
    
    if (response.status !== 200) {
      throw new Error(`CFTC API returned status ${response.status}`);
    }
    
    console.log("✅ CFTC API response received");
    const data = parseCFTCTextData(response.data);
    console.log(`✅ Parsed ${data.length} CFTC records from API`);
    
    return data;
  } catch (error: any) {
    console.error("❌ CFTC API fetch failed:", error.message);
    throw error;
  }
}

/**
 * Fetch COT data from CFTC ZIP archive (Fallback method)
 */
async function fetchCFTCZIPArchive(): Promise<CFTCDataRow[]> {
  try {
    console.log("📥 Fetching COT data from CFTC ZIP archive (fallback)...");
    
    const currentYear = new Date().getFullYear();
    const zipUrl = `https://www.cftc.gov/files/dea/history/fut_fin_txt_${currentYear}.zip`;
    
    console.log(`   Attempting: ${zipUrl}`);
    
    const response = await axios.get(zipUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; COT Data Fetcher/1.0)",
        "Accept": "application/zip, */*",
      },
    });
    
    if (response.status !== 200) {
      throw new Error(`CFTC ZIP returned status ${response.status}`);
    }
    
    console.log("✅ CFTC ZIP archive downloaded");
    
    // Extract ZIP
    const zip = new AdmZip(response.data);
    const zipEntries = zip.getEntries();
    
    // Find the latest text file (usually named like fut_fin_txt_YYYYMMDD.txt)
    const textFiles = zipEntries
      .filter(entry => entry.entryName.endsWith(".txt") && entry.entryName.includes("fut_fin"))
      .sort((a, b) => b.entryName.localeCompare(a.entryName));
    
    if (textFiles.length === 0) {
      throw new Error("No text files found in CFTC ZIP archive");
    }
    
    const latestFile = textFiles[0];
    console.log(`   Extracting: ${latestFile.entryName}`);
    
    const fileContent = latestFile.getData().toString("utf-8");
    const data = parseCFTCTextData(fileContent);
    
    console.log(`✅ Parsed ${data.length} CFTC records from ZIP archive`);
    
    return data;
  } catch (error: any) {
    console.error("❌ CFTC ZIP archive fetch failed:", error.message);
    
    // Try previous year if current year fails
    const previousYear = new Date().getFullYear() - 1;
    const previousZipUrl = `https://www.cftc.gov/files/dea/history/fut_fin_txt_${previousYear}.zip`;
    
    console.log(`   Attempting previous year: ${previousZipUrl}`);
    
    try {
      const response = await axios.get(previousZipUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; COT Data Fetcher/1.0)",
          "Accept": "application/zip, */*",
        },
      });
      
      const zip = new AdmZip(response.data);
      const zipEntries = zip.getEntries();
      const textFiles = zipEntries
        .filter(entry => entry.entryName.endsWith(".txt") && entry.entryName.includes("fut_fin"))
        .sort((a, b) => b.entryName.localeCompare(a.entryName));
      
      if (textFiles.length > 0) {
        const latestFile = textFiles[0];
        const fileContent = latestFile.getData().toString("utf-8");
        const data = parseCFTCTextData(fileContent);
        console.log(`✅ Parsed ${data.length} CFTC records from previous year ZIP`);
        return data;
      }
    } catch (prevError: any) {
      console.error("❌ Previous year ZIP also failed:", prevError.message);
    }
    
    throw error;
  }
}

/**
 * Fetch COT data from CFTC (tries API first, falls back to ZIP)
 */
async function fetchCFTCCOTData(): Promise<COTRow[]> {
  try {
    // Try API first
    const apiData = await fetchCFTCAPI();
    return convertCFTCDataToCOTRows(apiData);
  } catch (apiError: any) {
    console.warn("⚠️ CFTC API failed, trying ZIP archive fallback...");
    try {
      // Fallback to ZIP archive
      const zipData = await fetchCFTCZIPArchive();
      return convertCFTCDataToCOTRows(zipData);
    } catch (zipError: any) {
      console.error("❌ Both CFTC API and ZIP archive failed");
      throw new Error(`CFTC data fetch failed: API (${apiError.message}), ZIP (${zipError.message})`);
    }
  }
}

/**
 * Convert CFTC data format to COT rows
 */
function convertCFTCDataToCOTRows(cftcData: CFTCDataRow[]): COTRow[] {
  const cotRows: COTRow[] = [];
  
  for (const row of cftcData) {
    const symbol = CFTC_MARKET_MAP[row.marketName];
    if (!symbol) {
      console.warn(`⚠️ Unknown CFTC market: ${row.marketName}`);
      continue;
    }
    
    // Parse report date
    let reportDate = new Date();
    if (row.reportDate) {
      // Try various date formats
      const dateFormats = [
        /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
        /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
        /(\d{2})-(\d{2})-(\d{4})/, // MM-DD-YYYY
      ];
      
      for (const format of dateFormats) {
        const match = row.reportDate.match(format);
        if (match) {
          if (format === dateFormats[0]) {
            reportDate = new Date(`${match[1]}-${match[2]}-${match[3]}`);
          } else {
            reportDate = new Date(`${match[3]}-${match[1]}-${match[2]}`);
          }
          break;
        }
      }
    }
    
    const netPosition = row.leveragedMoneyLong - row.leveragedMoneyShort;
    
    cotRows.push({
      symbol,
      reportDate,
      leveragedMoneyLong: row.leveragedMoneyLong,
      leveragedMoneyShort: row.leveragedMoneyShort,
      netPosition,
    });
  }
  
  return cotRows;
}

/**
 * Calculate COT Index using Stochastic formula: (Current - Min) / (Max - Min) * 100
 * Uses the last 52 weeks (1 year) of historical data
 */
async function calculateCOTIndex(symbol: string, currentNetPosition: number): Promise<number> {
  try {
    // Get historical data for this symbol (last 52 weeks = 1 year)
    const historicalData = await db
      .select({ netPosition: cotData.netPosition })
      .from(cotData)
      .where(eq(cotData.symbol, symbol))
      .orderBy(desc(cotData.reportDate))
      .limit(52);

    if (historicalData.length === 0) {
      // No historical data, return 50 (neutral)
      return 50;
    }

    // Add current position to the dataset
    const allPositions = [currentNetPosition, ...historicalData.map(d => Number(d.netPosition))];

    // Find min and max
    const min = Math.min(...allPositions);
    const max = Math.max(...allPositions);

    if (max === min) {
      // All positions are the same, return 50 (neutral)
      return 50;
    }

    // Calculate COT Index
    const cotIndex = ((currentNetPosition - min) / (max - min)) * 100;
    
    // Clamp to 0-100
    return Math.max(0, Math.min(100, cotIndex));
  } catch (error) {
    console.error(`❌ Error calculating COT Index for ${symbol}:`, error);
    return 50; // Return neutral on error
  }
}

/**
 * Process and store COT data for all symbols from CFTC
 */
export async function processCOTData(): Promise<void> {
  try {
    console.log("📊 Starting COT Data Processing from CFTC...");

    // Fetch data from CFTC (API first, ZIP fallback)
    const cotRows = await fetchCFTCCOTData();

    if (cotRows.length === 0) {
      console.warn("⚠️ No COT data fetched from CFTC");
      throw new Error("Failed to fetch any COT data from CFTC. Check logs for details.");
    }

    console.log(`✅ Fetched ${cotRows.length} COT records from CFTC`);

    // Process each symbol with Neon Postgres ON CONFLICT upsert
    let insertedCount = 0;
    let updatedCount = 0;
    
    for (const row of cotRows) {
      try {
        // Calculate COT Index
        const cotIndex = await calculateCOTIndex(row.symbol, row.netPosition);

        // Use Postgres-compatible upsert with check-then-insert/update
        // Note: For optimal performance with onConflictDoUpdate, add this unique index:
        // CREATE UNIQUE INDEX cot_data_symbol_date_idx ON cot_data (symbol, DATE(report_date));
        const reportDateOnly = new Date(row.reportDate);
        reportDateOnly.setHours(0, 0, 0, 0); // Normalize to date only

        const existing = await db
          .select()
          .from(cotData)
          .where(
            and(
              eq(cotData.symbol, row.symbol),
              sql`DATE(report_date) = DATE(${reportDateOnly.toISOString()})`
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Update existing entry - numeric values stored as strings (Postgres numeric type)
          await db
            .update(cotData)
            .set({
              leveragedMoneyLong: row.leveragedMoneyLong.toString(),
              leveragedMoneyShort: row.leveragedMoneyShort.toString(),
              netPosition: row.netPosition.toString(),
              cotIndex: cotIndex.toString(),
              updatedAt: new Date(),
            })
            .where(eq(cotData.id, existing[0].id));

          updatedCount++;
          console.log(`✅ Updated COT data for ${row.symbol} (${reportDateOnly.toISOString().split('T')[0]}) → Neon Postgres`);
        } else {
          // Insert new entry - numeric values stored as strings
          await db.insert(cotData).values({
            symbol: row.symbol,
            reportDate: row.reportDate,
            leveragedMoneyLong: row.leveragedMoneyLong.toString(),
            leveragedMoneyShort: row.leveragedMoneyShort.toString(),
            netPosition: row.netPosition.toString(),
            cotIndex: cotIndex.toString(),
          });

          insertedCount++;
          console.log(`✅ Created COT data for ${row.symbol} (${reportDateOnly.toISOString().split('T')[0]}) → Neon Postgres`);
        }
      } catch (error: any) {
        console.error(`❌ Error processing ${row.symbol} for ${row.reportDate.toISOString().split('T')[0]}:`, error.message);
        // Continue with next row
      }
    }

    console.log(`📊 Neon Postgres Sync Complete: ${insertedCount} inserted, ${updatedCount} updated`);

    console.log("🎯 COT Data Processing Complete!");
    console.log(`✅ Successfully synced COT data to Neon Postgres cloud database`);
  } catch (error) {
    console.error("❌ Error processing COT data:", error);
    throw error;
  }
}

/**
 * Get COT data for a specific symbol (last 52 weeks)
 */
export async function getCOTData(symbol: string) {
  try {
    const data = await db
      .select()
      .from(cotData)
      .where(eq(cotData.symbol, symbol))
      .orderBy(desc(cotData.reportDate))
      .limit(52);

    return data.map(row => ({
      ...row,
      leveragedMoneyLong: Number(row.leveragedMoneyLong),
      leveragedMoneyShort: Number(row.leveragedMoneyShort),
      netPosition: Number(row.netPosition),
      cotIndex: row.cotIndex ? Number(row.cotIndex) : null,
      reportDate: row.reportDate,
    }));
  } catch (error) {
    console.error(`❌ Error fetching COT data for ${symbol}:`, error);
    return [];
  }
}

/**
 * Get latest COT Index and sentiment for a symbol
 */
export async function getLatestCOTSentiment(symbol: string) {
  try {
    const latest = await db
      .select()
      .from(cotData)
      .where(eq(cotData.symbol, symbol))
      .orderBy(desc(cotData.reportDate))
      .limit(1);

    if (latest.length === 0) {
      return null;
    }

    const cotIndex = latest[0].cotIndex ? Number(latest[0].cotIndex) : null;
    
    let sentiment: string;
    if (cotIndex === null) {
      sentiment = "Unknown";
    } else if (cotIndex >= 80) {
      sentiment = "Institutional Extreme Bullish";
    } else if (cotIndex <= 20) {
      sentiment = "Institutional Extreme Bearish";
    } else if (cotIndex >= 40 && cotIndex <= 60) {
      sentiment = "Institutional Neutral";
    } else if (cotIndex > 60) {
      sentiment = "Institutional Bullish";
    } else {
      sentiment = "Institutional Bearish";
    }

    return {
      symbol,
      cotIndex,
      sentiment,
      reportDate: latest[0].reportDate,
      netPosition: Number(latest[0].netPosition),
    };
  } catch (error) {
    console.error(`❌ Error fetching latest COT sentiment for ${symbol}:`, error);
    return null;
  }
}

/**
 * Seed historical COT data from CFTC ZIP archives (last 3 years)
 * Downloads and processes all weekly reports for comprehensive historical data
 */
export async function seedHistoricalCOT(): Promise<void> {
  try {
    console.log("📚 Starting Historical COT Data Seeding (Last 3 Years)...");
    
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2];
    let totalProcessed = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    
    for (const year of years) {
      try {
        console.log(`\n📥 Processing year ${year}...`);
        
        const zipUrl = `https://www.cftc.gov/files/dea/history/fut_fin_txt_${year}.zip`;
        console.log(`   Downloading: ${zipUrl}`);
        
        const response = await axios.get(zipUrl, {
          responseType: "arraybuffer",
          timeout: 60000, // Longer timeout for larger files
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; COT Data Fetcher/1.0)",
            "Accept": "application/zip, */*",
          },
        });
        
        if (response.status !== 200) {
          console.warn(`⚠️ Failed to download ${year} ZIP: HTTP ${response.status}`);
          continue;
        }
        
        console.log(`✅ Downloaded ${year} ZIP archive`);
        
        // Extract ZIP
        const zip = new AdmZip(response.data);
        const zipEntries = zip.getEntries();
        
        // Find all text files (not just the latest one)
        const textFiles = zipEntries
          .filter(entry => entry.entryName.endsWith(".txt") && entry.entryName.includes("fut_fin"))
          .sort((a, b) => a.entryName.localeCompare(b.entryName)); // Sort chronologically
        
        console.log(`   Found ${textFiles.length} text files in ${year} archive`);
        
        // Process each text file (each represents a weekly report)
        for (const file of textFiles) {
          try {
            console.log(`   Processing: ${file.entryName}`);
            
            const fileContent = file.getData().toString("utf-8");
            const cftcData = parseCFTCTextData(fileContent);
            
            if (cftcData.length === 0) {
              console.warn(`     ⚠️ No data extracted from ${file.entryName}`);
              continue;
            }
            
            // Convert to COT rows
            const cotRows = convertCFTCDataToCOTRows(cftcData);
            totalProcessed += cotRows.length;
            
            // Process each symbol with Neon Postgres-compatible upsert
            // Batch processing to avoid connection timeouts with large datasets
            const BATCH_SIZE = 10; // Process 10 records at a time to avoid Neon timeout
            for (let i = 0; i < cotRows.length; i += BATCH_SIZE) {
              const batch = cotRows.slice(i, i + BATCH_SIZE);
              
              // Process batch in parallel for better performance
              await Promise.all(batch.map(async (row) => {
                try {
                  // Calculate COT Index
                  const cotIndex = await calculateCOTIndex(row.symbol, row.netPosition);
                  
                  // Postgres-compatible upsert: Check if entry exists, then update or insert
                  // Numeric values stored as strings (required for Postgres numeric type)
                  const reportDateOnly = new Date(row.reportDate);
                  reportDateOnly.setHours(0, 0, 0, 0); // Normalize to date only
                  
                  const existing = await db
                    .select()
                    .from(cotData)
                    .where(
                      and(
                        eq(cotData.symbol, row.symbol),
                        sql`DATE(report_date) = DATE(${reportDateOnly.toISOString()})`
                      )
                    )
                    .limit(1);
                  
                  if (existing.length > 0) {
                    // Update existing entry - numeric values as strings (Postgres numeric type)
                    await db
                      .update(cotData)
                      .set({
                        leveragedMoneyLong: row.leveragedMoneyLong.toString(),
                        leveragedMoneyShort: row.leveragedMoneyShort.toString(),
                        netPosition: row.netPosition.toString(),
                        cotIndex: cotIndex.toString(),
                        updatedAt: new Date(),
                      })
                      .where(eq(cotData.id, existing[0].id));
                    
                    totalUpdated++;
                  } else {
                    // Insert new entry - numeric values as strings
                    await db.insert(cotData).values({
                      symbol: row.symbol,
                      reportDate: row.reportDate,
                      leveragedMoneyLong: row.leveragedMoneyLong.toString(),
                      leveragedMoneyShort: row.leveragedMoneyShort.toString(),
                      netPosition: row.netPosition.toString(),
                      cotIndex: cotIndex.toString(),
                    });
                    
                    totalInserted++;
                  }
                } catch (error: any) {
                  console.error(`     ❌ Error processing ${row.symbol} for ${row.reportDate.toISOString().split('T')[0]}:`, error.message);
                  // Continue with next record
                }
              }));
              
              // Small delay between batches to prevent connection pool exhaustion
              if (i + BATCH_SIZE < cotRows.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
            
            console.log(`     ✅ Processed ${cotRows.length} records from ${file.entryName}`);
          } catch (fileError: any) {
            console.error(`     ❌ Error processing ${file.entryName}:`, fileError.message);
            // Continue with next file
          }
        }
        
        console.log(`✅ Completed year ${year}`);
      } catch (yearError: any) {
        console.error(`❌ Error processing year ${year}:`, yearError.message);
        // Continue with next year
      }
    }
    
    console.log("\n🎯 Historical COT Data Seeding Complete!");
    console.log(`   Total records processed: ${totalProcessed}`);
    console.log(`   New records inserted: ${totalInserted}`);
    console.log(`   Existing records updated: ${totalUpdated}`);
    console.log(`✅ Successfully synced ${totalInserted + totalUpdated} records to Neon Postgres cloud database`);
  } catch (error) {
    console.error("❌ Error seeding historical COT data:", error);
    throw error;
  }
}
