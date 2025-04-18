-- Fix the policy syntax by removing the table alias
DROP POLICY IF EXISTS "Allow users to read invitation codes" ON public.invitation_codes;
CREATE POLICY "Allow users to read invitation codes"
  ON public.invitation_codes
  FOR SELECT
  TO authenticated
  USING (public.is_admin() OR used_by = auth.uid() OR created_by = auth.uid());

-- Create a valid invitation code that never expires
INSERT INTO public.invitation_codes (code, expires_at)
VALUES ('LEADSWIPE2024', NULL)
ON CONFLICT (code) DO NOTHING;

-- Create more invitation codes
INSERT INTO public.invitation_codes (code, expires_at)
VALUES 
  ('WELCOME2024', NULL),
  ('LEADSWIPEVIP', NULL),
  ('BETAUSER2024', NULL)
ON CONFLICT (code) DO NOTHING;

-- Make sure the invitation_codes table has the right column types
ALTER TABLE public.invitation_codes 
  ALTER COLUMN created_by TYPE UUID USING 
    CASE 
      WHEN created_by IS NULL THEN NULL
      WHEN created_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN created_by::uuid
      ELSE NULL
    END;

-- Set default for created_by
ALTER TABLE public.invitation_codes 
  ALTER COLUMN created_by SET DEFAULT auth.uid();

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
  auth.users u ON ic.used_by = u.id
WHERE 
  (public.is_admin() OR ic.used_by = auth.uid() OR ic.created_by = auth.uid());

-- Make sure user_settings table exists
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user_settings
DROP POLICY IF EXISTS "Allow users to select their own user settings" ON public.user_settings;
CREATE POLICY "Allow users to select their own user settings"
  ON public.user_settings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Allow users to insert their own user settings" ON public.user_settings;
CREATE POLICY "Allow users to insert their own user settings"
  ON public.user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow users to update their own user settings" ON public.user_settings;
CREATE POLICY "Allow users to update their own user settings"
  ON public.user_settings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Make the first user an admin
DO $$
DECLARE
  v_first_user_email TEXT;
  v_first_user_id UUID;
BEGIN
  SELECT id, email INTO v_first_user_id, v_first_user_email FROM auth.users ORDER BY created_at LIMIT 1;
  IF v_first_user_id IS NOT NULL THEN
    INSERT INTO public.user_settings (user_id, role)
    VALUES (v_first_user_id, 'admin')
    ON CONFLICT (user_id) 
    DO UPDATE SET role = 'admin', updated_at = NOW();
    
    RAISE NOTICE 'Made % an admin', v_first_user_email;
  END IF;
END$$;

-- Fix the function syntax
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

-- Function to use an invitation code
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
    used_by = auth.uid(),
    used_at = NOW()
  WHERE code = $1
    AND is_used = FALSE;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simple function to check if a user is an admin
DROP FUNCTION IF EXISTS public.is_admin();
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Set secure search path
  SET search_path = pg_catalog, public, pg_temp;
  
  -- Check if user has admin role
  SELECT EXISTS (
    SELECT 1 FROM public.user_settings
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ) INTO v_is_admin;
  
  RETURN COALESCE(v_is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
