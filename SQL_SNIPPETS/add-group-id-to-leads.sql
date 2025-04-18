-- Add group_id column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS group_id VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS group_name VARCHAR(255);

-- Create index for faster group filtering
CREATE INDEX IF NOT EXISTS leads_group_id_idx ON leads(group_id);
