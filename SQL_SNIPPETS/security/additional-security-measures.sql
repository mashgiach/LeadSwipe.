-- Additional security measures

-- 1. Create a secure_app_user role with limited permissions
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'secure_app_user') THEN
    CREATE ROLE secure_app_user;
  END IF;
END
$$;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO secure_app_user;

-- Grant select on all tables to secure_app_user
GRANT SELECT ON ALL TABLES IN SCHEMA public TO secure_app_user;

-- Grant insert, update, delete on specific tables
GRANT INSERT, UPDATE ON public.profiles TO secure_app_user;
GRANT INSERT, UPDATE ON public.user_settings TO secure_app_user;
GRANT INSERT, UPDATE, DELETE ON public.saved_leads TO secure_app_user;
GRANT INSERT, UPDATE, DELETE ON public.matched_leads TO secure_app_user;
GRANT INSERT, UPDATE, DELETE ON public.blocked_leads TO secure_app_user;
GRANT INSERT, UPDATE, DELETE ON public.viewed_leads TO secure_app_user;

-- 2. Create audit trail for sensitive operations
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow admins to view audit logs
CREATE POLICY "Allow admins to view audit logs"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create function to log changes
CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS TRIGGER AS $$
BEGIN
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

-- Apply audit triggers to sensitive tables
CREATE TRIGGER trg_profiles_audit
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

CREATE TRIGGER trg_user_settings_audit
AFTER INSERT OR UPDATE OR DELETE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

-- 3. Add rate limiting for API requests
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint, window_start)
);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create function to check rate limits
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
