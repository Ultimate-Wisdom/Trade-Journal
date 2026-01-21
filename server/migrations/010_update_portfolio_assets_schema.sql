-- Update portfolio_assets table with new fields
ALTER TABLE portfolio_assets 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS ticker TEXT,
ADD COLUMN IF NOT EXISTS api_id TEXT,
ADD COLUMN IF NOT EXISTS quantity NUMERIC(20, 8);

-- Make balance nullable (since crypto uses quantity instead)
ALTER TABLE portfolio_assets 
ALTER COLUMN balance DROP NOT NULL;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_portfolio_assets_api_id ON portfolio_assets(api_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_assets_location ON portfolio_assets(location);
