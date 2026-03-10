# COT Service Logic Flow Explanation

## Overview
The COT (Commitment of Traders) service fetches institutional positioning data from the official CFTC (Commodity Futures Trading Commission) source and processes it for display in the trading journal.

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    API Endpoint Trigger                          │
│              POST /api/cot/process                              │
└───────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              processCOTData() - Main Entry Point                │
│  • Logs: "📊 Starting COT Data Processing from CFTC..."        │
└───────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│            fetchCFTCCOTData() - Data Fetching Orchestrator      │
│  Tries API first, falls back to ZIP if API fails               │
└───────────────────────────┬─────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   fetchCFTCAPI()         │  │  fetchCFTCZIPArchive()   │
│   (PRIMARY METHOD)       │  │  (FALLBACK METHOD)       │
│                          │  │                          │
│  • URL:                  │  │  • URL:                  │
│    cftc.gov/dea/         │  │    cftc.gov/files/dea/   │
│    newcot/FinFutWk.txt   │  │    history/              │
│                          │  │    fut_fin_txt_YYYY.zip  │
│  • Timeout: 15s          │  │                          │
│  • Returns: Text data    │  │  • Timeout: 30s          │
│                          │  │  • Downloads ZIP          │
│                          │  │  • Extracts latest .txt  │
│                          │  │  • Returns: Text data    │
└───────────┬──────────────┘  └───────────┬──────────────┘
            │                             │
            │  ┌──────────────────────────┘
            │  │ (if API fails)
            │  ▼
            │  ┌──────────────────────────┐
            │  │ Try Previous Year ZIP    │
            │  │ (if current year fails)  │
            │  └──────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│              parseCFTCTextData() - Text Parser                  │
│                                                                 │
│  Input: Raw CFTC text file (pipe or space delimited)            │
│                                                                 │
│  Process:                                                       │
│  1. Split into lines                                           │
│  2. Track current market being processed                       │
│  3. Look for market names:                                     │
│     • "EURO CURRENCY" → EUR                                    │
│     • "BRITISH POUND" → GBP                                    │
│     • "JAPANESE YEN" → JPY                                     │
│     • "U.S. DOLLAR INDEX" → DXY                                │
│  4. Find "LEVERAGED MONEY" or "LEVERAGED FUNDS" section        │
│  5. Extract Long and Short positions                           │
│  6. If primary method fails, try alternative parsing           │
│                                                                 │
│  Output: Array of CFTCDataRow[]                                │
│    {                                                            │
│      marketName: "EURO CURRENCY - CHICAGO MERCANTILE...",      │
│      reportDate: "2024-01-15",                                 │
│      leveragedMoneyLong: 125000,                              │
│      leveragedMoneyShort: 98000                                │
│    }                                                            │
└───────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│        convertCFTCDataToCOTRows() - Data Transformation         │
│                                                                 │
│  For each CFTCDataRow:                                         │
│  1. Map market name to symbol (EUR, GBP, JPY, DXY)             │
│  2. Parse report date (handles multiple formats)               │
│  3. Calculate Net Position = Long - Short                       │
│                                                                 │
│  Output: Array of COTRow[]                                     │
│    {                                                            │
│      symbol: "EUR",                                            │
│      reportDate: Date("2024-01-15"),                          │
│      leveragedMoneyLong: 125000,                              │
│      leveragedMoneyShort: 98000,                               │
│      netPosition: 27000                                       │
│    }                                                            │
└───────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         Back to processCOTData() - Database Processing          │
│                                                                 │
│  For each COTRow:                                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 1: Calculate COT Index                              │  │
│  │ ────────────────────────────────────────────────────────  │  │
│  │ calculateCOTIndex(symbol, netPosition)                   │  │
│  │                                                           │  │
│  │ 1. Query database for last 52 weeks of historical data   │  │
│  │ 2. Add current position to dataset                       │  │
│  │ 3. Find Min and Max positions                            │  │
│  │ 4. Calculate: (Current - Min) / (Max - Min) * 100         │  │
│  │ 5. Clamp result to 0-100 range                           │  │
│  │                                                           │  │
│  │ Example:                                                 │  │
│  │   Current: 27000                                          │  │
│  │   Min (52 weeks): -50000                                 │  │
│  │   Max (52 weeks): 80000                                  │  │
│  │   Index = (27000 - (-50000)) / (80000 - (-50000)) * 100 │  │
│  │   Index = 77000 / 130000 * 100 = 59.2%                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 2: Check if Entry Exists                             │  │
│  │ ────────────────────────────────────────────────────────  │  │
│  │ Query: WHERE symbol = 'EUR'                              │  │
│  │        AND DATE(report_date) = DATE('2024-01-15')        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 3: Insert or Update                                 │  │
│  │ ────────────────────────────────────────────────────────  │  │
│  │                                                           │  │
│  │ IF entry exists:                                         │  │
│  │   UPDATE cot_data SET                                    │  │
│  │     leveraged_money_long = '125000',                     │  │
│  │     leveraged_money_short = '98000',                     │  │
│  │     net_position = '27000',                              │  │
│  │     cot_index = '59.2',                                  │  │
│  │     updated_at = NOW()                                   │  │
│  │                                                           │  │
│  │ ELSE:                                                    │  │
│  │   INSERT INTO cot_data VALUES                            │  │
│  │     (symbol, report_date, long, short, net, index)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Log: "✅ Created/Updated COT data for EUR (2024-01-15)"       │
└───────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Completion                                   │
│  Log: "🎯 COT Data Processing Complete!"                        │
│  Returns: Success                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Functions Breakdown

### 1. `processCOTData()` - Main Orchestrator
**Purpose:** Entry point for COT data processing
**Flow:**
1. Calls `fetchCFTCCOTData()` to get raw data
2. For each symbol, calculates COT Index
3. Inserts or updates database records
4. Returns success/error

---

### 2. `fetchCFTCCOTData()` - Data Source Selector
**Purpose:** Tries API first, falls back to ZIP
**Flow:**
```
Try fetchCFTCAPI()
  ↓ (if fails)
Try fetchCFTCZIPArchive()
  ↓ (if fails)
Try Previous Year ZIP
  ↓ (if all fail)
Throw Error
```

---

### 3. `fetchCFTCAPI()` - Primary Data Source
**Purpose:** Fetch latest data from CFTC API
**Details:**
- **URL:** `https://www.cftc.gov/dea/newcot/FinFutWk.txt`
- **Method:** HTTP GET with axios
- **Timeout:** 15 seconds
- **Returns:** Raw text data
- **On Success:** Passes to `parseCFTCTextData()`
- **On Failure:** Throws error (caught by fallback)

---

### 4. `fetchCFTCZIPArchive()` - Fallback Data Source
**Purpose:** Download and extract from ZIP archive
**Details:**
- **URL Pattern:** `https://www.cftc.gov/files/dea/history/fut_fin_txt_YYYY.zip`
- **Method:** HTTP GET with axios (arraybuffer response)
- **Timeout:** 30 seconds
- **Process:**
  1. Download ZIP file
  2. Extract with `AdmZip`
  3. Find latest `.txt` file (sorted by name)
  4. Extract file content
  5. Pass to `parseCFTCTextData()`
- **Fallback:** If current year fails, tries previous year

---

### 5. `parseCFTCTextData()` - Text Parser
**Purpose:** Extract structured data from CFTC text format
**Process:**
1. **Line-by-line scanning:**
   - Skip empty lines, separators (===, ---, ###)
   - Track current market being processed
   
2. **Market Detection:**
   - Look for keywords: "EURO", "BRITISH", "JAPANESE", "DOLLAR INDEX"
   - Set `currentMarket` when found
   - Extract date if present in line

3. **Leveraged Money Detection:**
   - Look for "LEVERAGED MONEY" or "LEVERAGED FUNDS"
   - Parse line (pipe-delimited `|` or space-delimited)
   - Extract Long and Short positions using:
     - Heuristic: Large numbers (>1000) are positions
     - Regex: Look for "LONG: 125000" or "SHORT: 98000" patterns

4. **Data Collection:**
   - When market + leveraged money data found → save to array
   - Reset tracking variables

5. **Alternative Parsing (if primary fails):**
   - Look ahead 20 lines after finding market name
   - More aggressive number extraction

**Output Format:**
```typescript
[
  {
    marketName: "EURO CURRENCY - CHICAGO MERCANTILE EXCHANGE",
    reportDate: "2024-01-15",
    leveragedMoneyLong: 125000,
    leveragedMoneyShort: 98000
  },
  // ... more markets
]
```

---

### 6. `convertCFTCDataToCOTRows()` - Data Transformer
**Purpose:** Convert CFTC format to internal COT format
**Process:**
1. **Symbol Mapping:**
   ```typescript
   "EURO CURRENCY - CHICAGO MERCANTILE EXCHANGE" → "EUR"
   "BRITISH POUND - CHICAGO MERCANTILE EXCHANGE" → "GBP"
   "JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE" → "JPY"
   "U.S. DOLLAR INDEX - ICE FUTURES U.S." → "DXY"
   ```

2. **Date Parsing:**
   - Handles multiple formats:
     - `YYYY-MM-DD`
     - `MM/DD/YYYY`
     - `MM-DD-YYYY`

3. **Net Position Calculation:**
   ```typescript
   netPosition = leveragedMoneyLong - leveragedMoneyShort
   ```

**Output Format:**
```typescript
[
  {
    symbol: "EUR",
    reportDate: Date("2024-01-15"),
    leveragedMoneyLong: 125000,
    leveragedMoneyShort: 98000,
    netPosition: 27000
  }
]
```

---

### 7. `calculateCOTIndex()` - Index Calculator
**Purpose:** Calculate COT Index using Stochastic formula
**Formula:**
```
COT Index = (Current - Min) / (Max - Min) * 100
```

**Process:**
1. Query database for last 52 weeks of historical data
2. Add current position to dataset
3. Find minimum and maximum positions
4. Apply formula
5. Clamp to 0-100 range
6. Return index (0-100)

**Example Calculation:**
```
Current Net Position: 27,000
Historical Range (52 weeks):
  Min: -50,000
  Max: 80,000

COT Index = (27,000 - (-50,000)) / (80,000 - (-50,000)) * 100
         = 77,000 / 130,000 * 100
         = 59.2%
```

**Interpretation:**
- **0-20%:** Extreme Bearish (institutions very short)
- **20-40%:** Bearish
- **40-60%:** Neutral
- **60-80%:** Bullish
- **80-100%:** Extreme Bullish (institutions very long)

---

## Database Schema

**Table:** `cot_data`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `symbol` | VARCHAR | EUR, GBP, JPY, DXY |
| `report_date` | TIMESTAMP | Date of COT report |
| `leveraged_money_long` | VARCHAR | Long positions |
| `leveraged_money_short` | VARCHAR | Short positions |
| `net_position` | VARCHAR | Long - Short |
| `cot_index` | VARCHAR | Calculated index (0-100) |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time |

---

## Error Handling

### API Failure Flow:
```
fetchCFTCAPI() fails
  ↓
Log: "❌ CFTC API fetch failed"
  ↓
fetchCFTCZIPArchive() (current year)
  ↓ (if fails)
fetchCFTCZIPArchive() (previous year)
  ↓ (if fails)
Throw: "CFTC data fetch failed: API (...), ZIP (...)"
```

### Parsing Failure:
- If no data found: Logs warning with first 10 lines of data
- Returns empty array (caught by `processCOTData()`)

### Database Errors:
- Caught and logged
- Processing continues for other symbols
- Final error thrown if all symbols fail

---

## API Endpoints

### 1. `POST /api/cot/process`
**Purpose:** Manually trigger COT data processing
**Authentication:** Required
**Response:**
```json
{
  "success": true,
  "message": "COT data processed successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. `GET /api/cot/:symbol`
**Purpose:** Get last 52 weeks of COT data for a symbol
**Example:** `GET /api/cot/EUR`
**Response:**
```json
[
  {
    "id": "...",
    "symbol": "EUR",
    "reportDate": "2024-01-15",
    "leveragedMoneyLong": 125000,
    "leveragedMoneyShort": 98000,
    "netPosition": 27000,
    "cotIndex": 59.2
  }
]
```

### 3. `GET /api/cot/:symbol/sentiment`
**Purpose:** Get latest COT sentiment for a symbol
**Example:** `GET /api/cot/EUR/sentiment`
**Response:**
```json
{
  "symbol": "EUR",
  "cotIndex": 59.2,
  "sentiment": "Institutional Bullish",
  "reportDate": "2024-01-15",
  "netPosition": 27000
}
```

---

## Scheduling

The service is scheduled to run automatically:
- **Frequency:** Every Friday at 4:00 PM ET (8:30 PM UTC)
- **Scheduler:** `node-cron` in `server/services/scheduler.ts`
- **Function:** `startCOTSchedulerCron()`

---

## Summary

The COT service provides a reliable, multi-layered approach to fetching institutional positioning data:

1. **Primary:** Direct CFTC API (fast, real-time)
2. **Fallback 1:** Current year ZIP archive
3. **Fallback 2:** Previous year ZIP archive
4. **Robust Parsing:** Handles multiple CFTC text formats
5. **Smart Indexing:** Calculates relative positioning using 52-week history
6. **Database Integration:** Upserts data to prevent duplicates

This ensures maximum reliability and data availability even when the primary source is temporarily unavailable.
