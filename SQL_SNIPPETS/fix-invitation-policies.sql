-- Drop existing policies
DROP POLICY IF EXISTS "Allow anyone to read invitation codes" ON public.invitation_codes;
DROP POLICY IF EXISTS "Allow users to update invitation codes" ON public.invitation_codes;

-- Create a policy that allows ANYONE (including anonymous users) to read invitation codes
CREATE POLICY "Allow anyone to read invitation codes"
  ON public.invitation_codes
  FOR SELECT
  TO PUBLIC
  USING (true);

-- Create a policy that allows authenticated users to update invitation codes
CREATE POLICY "Allow users to update invitation codes"
  ON public.invitation_codes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert some test invitation codes if they don't exist
INSERT INTO public.invitation_codes (code, expires_at)
VALUES 
  ('INVITEME', NULL),
  ('TESTCODE', NULL),
  ('BYPASS123', NULL)
ON CONFLICT (code) DO NOTHING;
