-- Migration: Update account_id foreign key to set null on delete
-- This allows accounts to be deleted without violating foreign key constraints
-- Trades will have their accountId set to null when the account is deleted

-- Drop the existing foreign key constraint (if it exists)
-- PostgreSQL auto-generated constraint names follow the pattern: table_column_fkey
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find the constraint name
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'trades'::regclass
      AND confrelid = 'accounts'::regclass
      AND contype = 'f'
    LIMIT 1;
    
    -- Drop it if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE trades DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END IF;
END $$;

-- Recreate the foreign key with ON DELETE SET NULL
ALTER TABLE trades
ADD CONSTRAINT trades_account_id_fkey
FOREIGN KEY (account_id)
REFERENCES accounts(id)
ON DELETE SET NULL;
