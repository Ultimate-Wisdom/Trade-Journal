-- Migration: Add entry time to trades and create backtests table
-- Created: 2026-01-15

-- Add entryTime to trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS entry_time VARCHAR(5);
COMMENT ON COLUMN trades.entry_time IS 'HH:MM format for session analysis';

-- Create backtests table
CREATE TABLE IF NOT EXISTS backtests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  symbol VARCHAR(20) NOT NULL,
  direction VARCHAR(10) NOT NULL,
  rrr NUMERIC(10, 2) NOT NULL,
  outcome VARCHAR(5) NOT NULL CHECK (outcome IN ('TP', 'SL')),
  strategy TEXT NOT NULL,
  entry_time VARCHAR(5),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_backtests_user_id ON backtests(user_id);
CREATE INDEX IF NOT EXISTS idx_backtests_created_at ON backtests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backtests_strategy ON backtests(strategy);

-- Comments
COMMENT ON TABLE backtests IS 'Simplified backtest entries for edge development';
COMMENT ON COLUMN backtests.rrr IS 'Risk:Reward Ratio';
COMMENT ON COLUMN backtests.outcome IS 'Trade outcome: TP (Take Profit) or SL (Stop Loss)';
COMMENT ON COLUMN backtests.entry_time IS 'HH:MM format for session analysis';
