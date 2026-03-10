-- Migration: Create daily_macro_bias table
-- Stores daily macro narrative analysis from Forex Factory, FOMC, and ECB

CREATE TABLE IF NOT EXISTS daily_macro_bias (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_date DATE NOT NULL UNIQUE, -- One entry per day
  sentiment_score NUMERIC(3,1) NOT NULL, -- Range: -10.0 to +10.0
  narrative_summary TEXT NOT NULL, -- 2-sentence AI summary
  dominant_narrative VARCHAR(20) NOT NULL, -- 'RISK_ON', 'RISK_OFF', 'NEUTRAL'
  sources JSONB, -- Store raw headlines from sources
  central_bank_policy JSONB, -- Store central bank policy analysis (FED, ECB, BoE, BoJ)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick date lookups
CREATE INDEX IF NOT EXISTS idx_daily_macro_bias_date ON daily_macro_bias(analysis_date DESC);

-- Comment
COMMENT ON TABLE daily_macro_bias IS 'Daily macro narrative analysis from Forex Factory, FOMC, and ECB sources';
COMMENT ON COLUMN daily_macro_bias.sentiment_score IS 'Sentiment score from -10 (Very Bearish) to +10 (Very Bullish)';
COMMENT ON COLUMN daily_macro_bias.dominant_narrative IS 'Dominant market narrative: RISK_ON, RISK_OFF, or NEUTRAL';
COMMENT ON COLUMN daily_macro_bias.sources IS 'JSON object containing headlines from Forex Factory, FOMC, and ECB';
COMMENT ON COLUMN daily_macro_bias.central_bank_policy IS 'JSON object containing policy scores and reasoning for FED, ECB, BoE, and BoJ';
