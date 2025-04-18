-- Create account deletion requests table
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by TEXT
);

-- Create policy to allow authenticated users to insert their own deletion requests
CREATE POLICY "Allow users to create their own deletion requests"
  ON account_deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow authenticated users to read their own deletion requests
CREATE POLICY "Allow users to read their own deletion requests"
  ON account_deletion_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
