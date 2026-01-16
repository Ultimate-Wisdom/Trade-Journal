-- Add trade_type and entry_date columns to support adjustments and backdating

-- 1. Add trade_type column (default to 'TRADE')
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS trade_type VARCHAR(20) DEFAULT 'TRADE' NOT NULL;

-- 2. Add entry_date column (user-selected trade date/time for backdating)
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS entry_date TIMESTAMP;

-- 3. Make trade details optional (for ADJUSTMENT entries)
ALTER TABLE trades
ALTER COLUMN symbol DROP NOT NULL,
ALTER COLUMN direction DROP NOT NULL,
ALTER COLUMN entry_price DROP NOT NULL,
ALTER COLUMN quantity DROP NOT NULL;

-- 4. Add comments for clarity
COMMENT ON COLUMN trades.trade_type IS 'Type of entry: TRADE (normal trade) or ADJUSTMENT (balance correction)';
COMMENT ON COLUMN trades.entry_date IS 'Actual date/time of the trade (user-selected, for backdating). If NULL, use created_at.';
COMMENT ON COLUMN trades.created_at IS 'When the record was created in the system (auto-generated)';

-- 5. Populate entry_date for existing trades (copy from created_at)
UPDATE trades
SET entry_date = created_at
WHERE entry_date IS NULL;
