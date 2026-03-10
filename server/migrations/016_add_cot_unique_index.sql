-- Add unique index for COT data upsert optimization
-- This allows using ON CONFLICT DO UPDATE for better performance
-- Run this migration to enable efficient Postgres upserts

CREATE UNIQUE INDEX IF NOT EXISTS cot_data_symbol_date_idx 
ON cot_data (symbol, DATE(report_date));

-- Note: After running this migration, you can update cot-service.ts to use:
-- .onConflictDoUpdate({ target: [cotData.symbol, sql`DATE(${cotData.reportDate})`], ... })
