-- Secure invitation code management

-- Function to generate a secure random invitation code
CREATE OR REPLACE FUNCTION public.generate_invitation_code(length INTEGER DEFAULT 12)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new invitation code (admin only)
CREATE OR REPLACE FUNCTION public.create_invitation_code(
  expiry_days INTEGER DEFAULT 30,
  custom_code TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
BEGIN
  -- Check if current user is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can create invitation codes';
  END IF;
  
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

-- Function to validate an invitation code
CREATE OR REPLACE FUNCTION public.validate_invitation_code(code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.invitation_codes
    WHERE code = $1
      AND is_used = FALSE
      AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_valid;
  
  RETURN v_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark an invitation code as used
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
    used_by = auth.uid()::text,
    used_at = NOW()
  WHERE code = $1
    AND is_used = FALSE;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for admins to see invitation code usage
CREATE OR REPLACE VIEW public.invitation_code_usage AS
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

-- Enable RLS on the view
ALTER VIEW public.invitation_code_usage ENABLE ROW LEVEL SECURITY;

-- Only allow admins to view invitation code usage
CREATE POLICY "Allow admins to view invitation code usage"
  ON public.invitation_code_usage
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
