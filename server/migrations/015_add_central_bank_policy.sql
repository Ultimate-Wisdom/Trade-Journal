-- Migration: Add central_bank_policy column to daily_macro_bias table
-- This column stores AI-analyzed central bank policy stance for FED, ECB, BoE, and BoJ

ALTER TABLE daily_macro_bias
ADD COLUMN IF NOT EXISTS central_bank_policy JSONB;

COMMENT ON COLUMN daily_macro_bias.central_bank_policy IS 'JSON object containing policy scores and reasoning for FED, ECB, BoE, and BoJ';
