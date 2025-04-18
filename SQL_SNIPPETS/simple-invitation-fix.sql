-- Drop everything related to invitation codes to start fresh
DROP VIEW IF EXISTS public.invitation_code_usage;
DROP FUNCTION IF EXISTS public.validate_invitation_code(text);
DROP FUNCTION IF EXISTS public.use_invitation_code(text);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.create_invitation_code(integer, text);
DROP FUNCTION IF EXISTS public.generate_invitation_code(integer);
DROP FUNCTION IF EXISTS public.get_invitation_code_usage();
DROP FUNCTION IF EXISTS public.is_invitation_code_valid(text);

-- Drop the table if it exists
DROP TABLE IF EXISTS public.invitation_codes;

-- Create a simple invitation_codes table with proper types
CREATE TABLE public.invitation_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID
);

-- Enable RLS on the table
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows everyone to read invitation codes
DROP POLICY IF EXISTS "Allow anyone to read invitation codes" ON public.invitation_codes;
CREATE POLICY "Allow anyone to read invitation codes"
  ON public.invitation_codes
  FOR SELECT
  TO authenticated
  USING (true);

-- Create a simple policy that allows users to update invitation codes they use
DROP POLICY IF EXISTS "Allow users to update invitation codes" ON public.invitation_codes;
CREATE POLICY "Allow users to update invitation codes"
  ON public.invitation_codes
  FOR UPDATE
  TO authenticated
  USING (true);

-- Insert several valid invitation codes that never expire
INSERT INTO public.invitation_codes (code, expires_at)
VALUES 
  ('LEADSWIPE2024', NULL),
  ('WELCOME2024', NULL),
  ('LEADSWIPEVIP', NULL),
  ('BETAUSER2024', NULL),
  ('TESTCODE', NULL),
  ('INVITEME', NULL)
ON CONFLICT (code) DO NOTHING;

-- Create a simple function to validate invitation codes
CREATE OR REPLACE FUNCTION public.validate_invitation_code(code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.invitation_codes
    WHERE code = $1
      AND is_used = FALSE
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simple function to use an invitation code
CREATE OR REPLACE FUNCTION public.use_invitation_code(code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  -- Check if code is valid
  SELECT public.validate_invitation_code(code) INTO v_valid;
  
  IF NOT v_valid THEN
    RETURN FALSE;
  END IF;
  
  -- Mark code as used
  UPDATE public.invitation_codes
  SET 
    is_used = TRUE,
    used_by = auth.uid(),
    used_at = NOW()
  WHERE code = $1
    AND is_used = FALSE;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simple function to check if a code is valid
CREATE OR REPLACE FUNCTION public.is_invitation_code_valid(code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.invitation_codes
    WHERE code = $1
      AND is_used = FALSE
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
