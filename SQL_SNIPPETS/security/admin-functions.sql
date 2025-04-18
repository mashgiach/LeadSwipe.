-- Admin-only tables and functions

-- Create admin role if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin;
  END IF;
END
$$;

-- Create admin users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only allow admins to view admin_users
CREATE POLICY "Allow admins to view admin_users"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.admin_users));

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add a user as admin (can only be run by existing admins)
CREATE OR REPLACE FUNCTION public.add_admin(user_email TEXT)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
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

-- Function to process account deletion requests (admin only)
CREATE OR REPLACE FUNCTION public.process_deletion_request(request_id UUID, approve BOOLEAN)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
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
