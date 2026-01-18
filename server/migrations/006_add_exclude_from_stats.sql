-- Migration: Add exclude_from_stats column to trades table
-- This column allows excluding certain trades (e.g., balance adjustments) from analytics
-- while still including them in balance calculations.

ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS exclude_from_stats BOOLEAN NOT NULL DEFAULT false;

-- Set all existing ADJUSTMENT trades to exclude_from_stats = true
UPDATE trades 
SET exclude_from_stats = true 
WHERE trade_type = 'ADJUSTMENT';

COMMENT ON COLUMN trades.exclude_from_stats IS 'Exclude this trade from performance analytics (win rate, profit factor, etc.). Balance calculations still include it.';
