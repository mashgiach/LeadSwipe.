-- Add admin role to user_settings table if it doesn't exist

-- First check if the role column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings' 
    AND column_name = 'role'
  ) THEN
    -- Add role column if it doesn't exist
    ALTER TABLE public.user_settings ADD COLUMN role TEXT DEFAULT 'user';
  END IF;
END
$$;

-- Create a function to set a user as admin (must be run by superuser)
CREATE OR REPLACE FUNCTION public.set_user_as_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user ID from email
  SELECT id INTO v_user_id FROM auth.users WHERE email = user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Check if user has a settings record
  IF EXISTS (SELECT 1 FROM public.user_settings WHERE user_id = v_user_id) THEN
    -- Update existing record
    UPDATE public.user_settings
    SET role = 'admin'
    WHERE user_id = v_user_id;
  ELSE
    -- Create new settings record with admin role
    INSERT INTO public.user_settings (user_id, role)
    VALUES (v_user_id, 'admin');
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user has admin role in user_settings
  SELECT EXISTS (
    SELECT 1 FROM public.user_settings
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ) INTO v_is_admin;
  
  RETURN COALESCE(v_is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
