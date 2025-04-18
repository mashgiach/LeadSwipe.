-- Enable RLS and create appropriate policies for all tables

-- 1. account_deletion_requests table
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Policies already exist but need to be verified
DROP POLICY IF EXISTS "Allow users to create their own deletion requests" ON public.account_deletion_requests;
DROP POLICY IF EXISTS "Allow users to read their own deletion requests" ON public.account_deletion_requests;

CREATE POLICY "Allow users to create their own deletion requests"
  ON public.account_deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to read their own deletion requests"
  ON public.account_deletion_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. invitation_codes table
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

-- Recreate policies
DROP POLICY IF EXISTS "Allow authenticated users to read invitation codes" ON public.invitation_codes;
DROP POLICY IF EXISTS "Allow users to update invitation codes they've used" ON public.invitation_codes;

CREATE POLICY "Allow authenticated users to read invitation codes"
  ON public.invitation_codes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to update invitation codes they've used"
  ON public.invitation_codes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (used_by = auth.uid()::text OR used_by IS NULL);

-- 3. leads table
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policies for leads
CREATE POLICY "Allow users to select leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. settings table
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policies for settings
CREATE POLICY "Allow users to select their own settings"
  ON public.settings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to insert their own settings"
  ON public.settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to update their own settings"
  ON public.settings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- 5. blocked_leads table
ALTER TABLE public.blocked_leads ENABLE ROW LEVEL SECURITY;

-- Create policies for blocked_leads
CREATE POLICY "Allow users to select their own blocked leads"
  ON public.blocked_leads
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to insert their own blocked leads"
  ON public.blocked_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to delete their own blocked leads"
  ON public.blocked_leads
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 6. user_preferences table
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user_preferences
CREATE POLICY "Allow users to select their own preferences"
  ON public.user_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to insert their own preferences"
  ON public.user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to update their own preferences"
  ON public.user_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- 7. user_settings table
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user_settings
CREATE POLICY "Allow users to select their own user settings"
  ON public.user_settings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to insert their own user settings"
  ON public.user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to update their own user settings"
  ON public.user_settings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- 8. profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Allow users to select their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Allow users to insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Allow users to update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- 9. viewed_leads table
ALTER TABLE public.viewed_leads ENABLE ROW LEVEL SECURITY;

-- Create policies for viewed_leads
CREATE POLICY "Allow users to select their own viewed leads"
  ON public.viewed_leads
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to insert their own viewed leads"
  ON public.viewed_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to delete their own viewed leads"
  ON public.viewed_leads
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 10. saved_leads table
ALTER TABLE public.saved_leads ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_leads
CREATE POLICY "Allow users to select their own saved leads"
  ON public.saved_leads
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to insert their own saved leads"
  ON public.saved_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to delete their own saved leads"
  ON public.saved_leads
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 11. matched_leads table
ALTER TABLE public.matched_leads ENABLE ROW LEVEL SECURITY;

-- Create policies for matched_leads
CREATE POLICY "Allow users to select their own matched leads"
  ON public.matched_leads
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to insert their own matched leads"
  ON public.matched_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to delete their own matched leads"
  ON public.matched_leads
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 12. notifications table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    EXECUTE 'ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;';
    
    -- Create policies for notifications
    EXECUTE 'CREATE POLICY "Allow users to select their own notifications" 
      ON public.notifications
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());';
      
    EXECUTE 'CREATE POLICY "Allow users to update their own notifications" 
      ON public.notifications
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid());';
  END IF;
END
$$;

-- 13. archived_leads table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'archived_leads') THEN
    EXECUTE 'ALTER TABLE public.archived_leads ENABLE ROW LEVEL SECURITY;';
    
    -- Create policies for archived_leads
    EXECUTE 'CREATE POLICY "Allow users to select their own archived leads" 
      ON public.archived_leads
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());';
      
    EXECUTE 'CREATE POLICY "Allow users to insert their own archived leads" 
      ON public.archived_leads
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());';
      
    EXECUTE 'CREATE POLICY "Allow users to delete their own archived leads" 
      ON public.archived_leads
      FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());';
  END IF;
END
$$;

-- 14. groups table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'groups') THEN
    EXECUTE 'ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;';
    
    -- Create policies for groups
    EXECUTE 'CREATE POLICY "Allow users to select their own groups" 
      ON public.groups
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());';
      
    EXECUTE 'CREATE POLICY "Allow users to insert their own groups" 
      ON public.groups
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());';
      
    EXECUTE 'CREATE POLICY "Allow users to update their own groups" 
      ON public.groups
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid());';
      
    EXECUTE 'CREATE POLICY "Allow users to delete their own groups" 
      ON public.groups
      FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());';
  END IF;
END
$$;
