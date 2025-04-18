-- Create Facebook groups table
CREATE TABLE IF NOT EXISTS facebook_groups (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id VARCHAR(255) NOT NULL,
  group_name VARCHAR(255) NOT NULL,
  group_url VARCHAR(512) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, group_id)
);

-- Add RLS policies
ALTER TABLE facebook_groups ENABLE ROW LEVEL SECURITY;

-- Allow users to select their own groups
CREATE POLICY "Users can view their own groups"
ON facebook_groups FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own groups
CREATE POLICY "Users can insert their own groups"
ON facebook_groups FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own groups
CREATE POLICY "Users can update their own groups"
ON facebook_groups FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own groups
CREATE POLICY "Users can delete their own groups"
ON facebook_groups FOR DELETE
USING (auth.uid() = user_id);
