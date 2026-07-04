-- Migration to add battery-related columns to the runs table
ALTER TABLE runs ADD COLUMN IF NOT EXISTS abilities_used INTEGER DEFAULT 0;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS ku_earned INTEGER DEFAULT 0;

-- Optional: Update existing aggregate functions/RPCs if they exist and need these columns.
-- Since the agent doesn't have direct access to modify RPC definitions easily,
-- we provide the column additions as the primary requirement.
