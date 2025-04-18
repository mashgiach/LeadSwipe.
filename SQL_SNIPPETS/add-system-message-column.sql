-- Add system_message column to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS system_message TEXT;
