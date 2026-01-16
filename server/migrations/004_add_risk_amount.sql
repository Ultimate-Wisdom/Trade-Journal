-- Add risk_amount, exit_condition, and exit_reason columns to trades table
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS risk_amount NUMERIC(20, 2),
ADD COLUMN IF NOT EXISTS exit_condition VARCHAR(50),
ADD COLUMN IF NOT EXISTS exit_reason TEXT;

COMMENT ON COLUMN trades.risk_amount IS 'Dollar amount risked on the trade (e.g., $15)';
COMMENT ON COLUMN trades.risk_percent IS 'Auto-calculated: (risk_amount / account_balance) * 100';
COMMENT ON COLUMN trades.exit_condition IS 'How the trade closed: SL, TP, Breakeven, or Manual Close';
COMMENT ON COLUMN trades.exit_reason IS 'Reason for manual close (only if exit_condition is Manual Close)';
