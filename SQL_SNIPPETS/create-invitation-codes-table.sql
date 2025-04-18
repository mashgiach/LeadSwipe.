-- Create invitation codes table
CREATE TABLE IF NOT EXISTS invitation_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_used BOOLEAN DEFAULT FALSE,
  used_by TEXT,
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create some sample invitation codes
INSERT INTO invitation_codes (code, expires_at)
VALUES 
  ('LEADSWIPE2023', NOW() + INTERVAL '30 days'),
  ('BETAUSER2023', NOW() + INTERVAL '30 days'),
  ('EARLYACCESS', NOW() + INTERVAL '30 days');

-- Create policy to allow authenticated users to read invitation codes
CREATE POLICY "Allow authenticated users to read invitation codes"
  ON invitation_codes
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to update invitation codes they've used
CREATE POLICY "Allow users to update invitation codes they've used"
  ON invitation_codes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
