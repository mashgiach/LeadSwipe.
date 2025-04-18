-- First, drop the existing function
DROP FUNCTION IF EXISTS public.set_user_as_admin(text);

-- Now recreate the function with the correct return type and proper dollar quoting
CREATE OR REPLACE FUNCTION public.set_user_as_admin(user_email TEXT)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Set secure search path
  SET search_path = pg_catalog, public, pg_temp;
  
  -- Get user ID from email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Ensure user_settings table exists and has a role column
  CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
  -- Make user an admin
  INSERT INTO public.user_settings (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id) 
  DO UPDATE SET role = 'admin', updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix validate_invitation_code function
DROP FUNCTION IF EXISTS public.validate_invitation_code(text);

CREATE OR REPLACE FUNCTION public.validate_invitation_code(code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  -- Set secure search path
  SET search_path = pg_catalog, public, pg_temp;
  
  SELECT EXISTS (
    SELECT 1 FROM public.invitation_codes
    WHERE code = $1
      AND is_used = FALSE
      AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_valid;
  
  RETURN v_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix use_invitation_code function
DROP FUNCTION IF EXISTS public.use_invitation_code(text);

CREATE OR REPLACE FUNCTION public.use_invitation_code(code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  -- Set secure search path
  SET search_path = pg_catalog, public, pg_temp;
  
  -- Check if code is valid
  SELECT public.validate_invitation_code(code) INTO v_valid;
  
  IF NOT v_valid THEN
    RETURN FALSE;
  END IF;
  
  -- Mark code as used
  UPDATE public.invitation_codes
  SET 
    is_used = TRUE,
    used_by = auth.uid()::text,
    used_at = NOW()
  WHERE code = $1
    AND is_used = FALSE;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure the invitation_codes table exists
CREATE TABLE IF NOT EXISTS public.invitation_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT FALSE,
  used_by TEXT,
  used_at TIMESTAMP WITH TIME ZONE
);

-- Create a valid invitation code that never expires (if it doesn't exist)
INSERT INTO public.invitation_codes (code, expires_at)
VALUES ('LEADSWIPE2024', NULL)
ON CONFLICT (code) DO NOTHING;

-- Make sure the invitation_codes table has RLS enabled
ALTER TABLE IF EXISTS public.invitation_codes ENABLE ROW LEVEL SECURITY;

-- Create or replace the policies
DROP POLICY IF EXISTS "Allow authenticated users to read invitation codes" ON public.invitation_codes;
CREATE POLICY "Allow authenticated users to read invitation codes"
  ON public.invitation_codes
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow users to update invitation codes they've used" ON public.invitation_codes;
CREATE POLICY "Allow users to update invitation codes they've used"
  ON public.invitation_codes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (used_by = auth.uid()::text OR used_by IS NULL);

-- Make the first user an admin
DO $$
DECLARE
  v_first_user_email TEXT;
BEGIN
  SELECT email INTO v_first_user_email FROM auth.users ORDER BY created_at LIMIT 1;
  IF v_first_user_email IS NOT NULL THEN
    PERFORM public.set_user_as_admin(v_first_user_email);
  END IF;
END
$$;

-- Fix the invitation_code_usage view
DROP VIEW IF EXISTS public.invitation_code_usage;

CREATE OR REPLACE VIEW public.invitation_code_usage AS
SELECT 
  ic.id,
  ic.code,
  ic.created_at,
  ic.expires_at,
  ic.is_used,
  ic.used_at,
  u.email as used_by_email
FROM 
  public.invitation_codes ic
LEFT JOIN 
  auth.users u ON ic.used_by = u.id::text
WHERE 
  (is_admin() OR ic.used_by = auth.uid()::text OR ic.created_by = auth.uid()::text);

-- Create a function to check if invitation code is valid
CREATE OR REPLACE FUNCTION public.is_invitation_code_valid(code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Set secure search path
  SET search_path = pg_catalog, public, pg_temp;
  
  RETURN EXISTS (
    SELECT 1 FROM public.invitation_codes
    WHERE code = $1
      AND is_used = FALSE
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user is admin
DROP FUNCTION IF EXISTS public.is_admin();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Set secure search path
  SET search_path = pg_catalog, public, pg_temp;
  
  SELECT EXISTS (
    SELECT 1 FROM public.user_settings
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ) INTO v_is_admin;
  
  RETURN COALESCE(v_is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create more invitation codes
INSERT INTO public.invitation_codes (code, expires_at)
VALUES 
  ('WELCOME2024', NULL),
  ('LEADSWIPEVIP', NULL),
  ('BETAUSER2024', NULL)
ON CONFLICT (code) DO NOTHING;
