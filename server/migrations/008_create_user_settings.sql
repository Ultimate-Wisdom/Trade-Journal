-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  default_balance NUMERIC(20, 2) NOT NULL DEFAULT 10000,
  date_format VARCHAR(20) NOT NULL DEFAULT 'DD-MM-YYYY',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
