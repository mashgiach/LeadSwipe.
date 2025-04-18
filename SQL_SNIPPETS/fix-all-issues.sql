-- Fix 1: Create invitation_codes table if it doesn't exist and add valid invitation codes
CREATE TABLE IF NOT EXISTS public.invitation_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  is_used BOOLEAN DEFAULT FALSE,
  used_by TEXT,
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on the table
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

-- Create basic policies
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

-- Create a valid invitation code that never expires
INSERT INTO public.invitation_codes (code, expires_at)
VALUES ('LEADSWIPE2024', NULL)
ON CONFLICT (code) DO NOTHING;

-- Fix 2: Replace security definer view with a regular view
DROP VIEW IF EXISTS public.invitation_code_usage;

-- Fix 3: Fix all functions with search_path mutable issues
-- Function: fn_audit_log
CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  -- Set secure search path
  SET search_path = pg_catalog, public, pg_temp;
  
  INSERT INTO public.audit_log (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id::text
      ELSE NEW.id::text
    END,
    CASE
      WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE NULL
    END,
    CASE
      WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW)
      ELSE NULL
    END
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: check_rate_limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Set secure search path
  SET search_path = pg_catalog, public, pg_temp;
  
  -- Calculate window start time
  v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Clean up old entries
  DELETE FROM public.rate_limits
  WHERE window_start < v_window_start;
  
  -- Get current count within window
  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM public.rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;
  
  -- Check if limit exceeded
  IF v_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Record this request
  INSERT INTO public.rate_limits (user_id, endpoint, window_start)
  VALUES (p_user_id, p_endpoint, DATE_TRUNC('minute', NOW()))
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET request_count = public.rate_limits.request_count + 1;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: is_admin
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

-- Function: add_admin
CREATE OR REPLACE FUNCTION public.add_admin(user_email TEXT)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Set secure search path
  SET search_path = pg_catalog, public, pg_temp;
  
  -- Check if current user is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can add other admins';
  END IF;
  
  -- Get user ID from email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Add user to admin_users
  INSERT INTO public.admin_users (id, email)
  VALUES (v_user_id, user_email)
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: process_deletion_request
CREATE OR REPLACE FUNCTION public.process_deletion_request(request_id UUID, approve BOOLEAN)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Set secure search path
  SET search_path = pg_catalog, public, pg_temp;
  
  -- Check if current user is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can process deletion requests';
  END IF;
  
  -- Get user ID from request
  SELECT user_id, user_email INTO v_user_id, v_user_email
  FROM public.account_deletion_requests
  WHERE id = request_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Deletion request % not found', request_id;
  END IF;
  
  -- Update request status
  UPDATE public.account_deletion_requests
  SET 
    status = CASE WHEN approve THEN 'approved' ELSE 'rejected' END,
    processed_at = NOW(),
    processed_by = auth.uid()::text
  WHERE id = request_id;
  
  -- If approved, delete user data
  IF approve THEN
    -- Delete user data from various tables
    DELETE FROM public.saved_leads WHERE user_id = v_user_id;
    DELETE FROM public.matched_leads WHERE user_id = v_user_id;
    DELETE FROM public.blocked_leads WHERE user_id = v_user_id;
    DELETE FROM public.viewed_leads WHERE user_id = v_user_id;
    DELETE FROM public.user_settings WHERE user_id = v_user_id;
    DELETE FROM public.settings WHERE user_id = v_user_id;
    DELETE FROM public.profiles WHERE id = v_user_id;
    
    -- Log the deletion
    INSERT INTO public.audit_log (
      user_id,
      action,
      table_name,
      record_id,
      old_data,
      new_data
    ) VALUES (
      auth.uid(),
      'DELETE_USER',
      'auth.users',
      v_user_id::text,
      jsonb_build_object('email', v_user_email),
      NULL
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: generate_invitation_code
CREATE OR REPLACE FUNCTION public.generate_invitation_code(length INTEGER DEFAULT 12)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  -- Set secure search path
  SET search_path = pg_catalog, public, pg_temp;
  
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function: create_invitation_code
CREATE OR REPLACE FUNCTION public.create_invitation_code(
  expiry_days INTEGER DEFAULT 30,
  custom_code TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
BEGIN
  -- Set secure search path
  SET search_path = pg_catalog, public, pg_temp;
  
  -- Generate code if not provided
  IF custom_code IS NULL THEN
    v_code := public.generate_invitation_code();
  ELSE
    v_code := custom_code;
  END IF;
  
  -- Insert the new code
  INSERT INTO public.invitation_codes (
    code,
    created_by,
    expires_at
  ) VALUES (
    v_code,
    auth.uid(),
    NOW() + (expiry_days || ' days')::INTERVAL
  );
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: validate_invitation_code
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

-- Function: use_invitation_code
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

-- Function: get_invitation_code_usage
CREATE OR REPLACE FUNCTION public.get_invitation_code_usage()
RETURNS TABLE (
  id UUID,
  code TEXT,
  created_at TIMESTAMPTZ,
  created_by_email TEXT,
  is_used BOOLEAN,
  used_at TIMESTAMPTZ,
  used_by_email TEXT,
  expires_at TIMESTAMPTZ,
  status TEXT
) AS $$
BEGIN
  -- Set secure search path
  SET search_path = pg_catalog, public, pg_temp;
  
  -- Check if current user is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can view invitation code usage';
  END IF;

  RETURN QUERY
  SELECT
    ic.id,
    ic.code,
    ic.created_at,
    creator.email AS created_by_email,
    ic.is_used,
    ic.used_at,
    user_profile.email AS used_by_email,
    ic.expires_at,
    CASE
      WHEN ic.is_used THEN 'Used'
      WHEN ic.expires_at < NOW() THEN 'Expired'
      ELSE 'Active'
    END AS status
  FROM
    public.invitation_codes ic
  LEFT JOIN
    auth.users creator ON creator.id = ic.created_by
  LEFT JOIN
    auth.users user_profile ON user_profile.id::text = ic.used_by;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: set_user_as_admin
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

-- Create a regular view instead of a security definer view
CREATE OR REPLACE VIEW public.invitation_code_usage AS
SELECT * FROM public.get_invitation_code_usage();

-- Restrict access to the view
REVOKE ALL ON public.invitation_code_usage FROM PUBLIC;
GRANT SELECT ON public.invitation_code_usage TO authenticated;

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

-- Fix 4: Auth leaked password protection is typically enabled via the Supabase Dashboard
-- This comment serves as a reminder that this setting needs to be enabled in the Dashboard
-- as it cannot be enabled via SQL alone
