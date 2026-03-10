-- Migration: Add server_timezone column to accounts table
-- This allows accounts to specify their server timezone offset for automatic UTC conversion

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS server_timezone NUMERIC(3, 0) DEFAULT 0 NOT NULL;

-- Update existing accounts to have timezone 0 (UTC) by default
UPDATE accounts
SET server_timezone = 0
WHERE server_timezone IS NULL;

COMMENT ON COLUMN accounts.server_timezone IS 'Server timezone offset in hours (e.g., 0 for UTC, 2 for GMT+2, 8 for GMT+8). Used to convert entry times to UTC when logging trades.';
