-- Create archived_leads table
CREATE TABLE IF NOT EXISTS archived_leads (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lead_id)
);

-- Add RLS policies
ALTER TABLE archived_leads ENABLE ROW LEVEL SECURITY;

-- Allow users to select their own archived leads
CREATE POLICY "Users can view their own archived leads"
ON archived_leads FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own archived leads
CREATE POLICY "Users can insert their own archived leads"
ON archived_leads FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own archived leads
CREATE POLICY "Users can delete their own archived leads"
ON archived_leads FOR DELETE
USING (auth.uid() = user_id);
