-- Create portfolio_assets table
CREATE TABLE IF NOT EXISTS portfolio_assets (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type VARCHAR(20) NOT NULL,
  balance NUMERIC(20, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'MYR',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_portfolio_assets_user_id ON portfolio_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_assets_type ON portfolio_assets(type);
