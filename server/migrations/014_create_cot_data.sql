-- Migration: Create cot_data table
-- Stores weekly CFTC Commitment of Traders data for major forex pairs

CREATE TABLE IF NOT EXISTS cot_data (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(10) NOT NULL, -- 'EUR', 'GBP', 'JPY', 'DXY'
  report_date DATE NOT NULL, -- Date of the CFTC report
  leveraged_money_long NUMERIC(20, 2), -- Long positions
  leveraged_money_short NUMERIC(20, 2), -- Short positions
  net_position NUMERIC(20, 2) NOT NULL, -- Long - Short
  cot_index NUMERIC(5, 2), -- COT Index percentage (0-100)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(symbol, report_date) -- One entry per symbol per week
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_cot_data_symbol ON cot_data(symbol);
CREATE INDEX IF NOT EXISTS idx_cot_data_date ON cot_data(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_cot_data_symbol_date ON cot_data(symbol, report_date DESC);

-- Comment
COMMENT ON TABLE cot_data IS 'Weekly CFTC Commitment of Traders data for major forex pairs';
COMMENT ON COLUMN cot_data.cot_index IS 'COT Index percentage calculated using stochastic formula: (Current - Min) / (Max - Min) * 100';
