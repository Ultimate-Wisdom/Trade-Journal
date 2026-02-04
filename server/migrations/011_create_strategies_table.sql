-- Migration: Create strategies table for strategy isolation
-- This allows separating active strategies (for live trading) from experimental strategies (for backtesting)

CREATE TABLE IF NOT EXISTS strategies (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'experimental')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name) -- Prevent duplicate strategy names per user
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_strategies_user_status ON strategies(user_id, status);

-- Migrate existing strategies from trades to strategies table
-- This extracts unique strategy names from trades and creates them as 'active' strategies
INSERT INTO strategies (user_id, name, status, created_at, updated_at)
SELECT DISTINCT 
  t.user_id,
  t.strategy,
  'active'::VARCHAR,
  MIN(t.created_at) as created_at,
  NOW() as updated_at
FROM trades t
WHERE t.strategy IS NOT NULL 
  AND t.strategy != ''
  AND NOT EXISTS (
    SELECT 1 FROM strategies s 
    WHERE s.user_id = t.user_id 
      AND s.name = t.strategy
  )
GROUP BY t.user_id, t.strategy
ON CONFLICT (user_id, name) DO NOTHING;
