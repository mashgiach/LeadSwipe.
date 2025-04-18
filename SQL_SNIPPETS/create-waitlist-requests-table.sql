-- First, check if the waitlist_requests table already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'waitlist_requests') THEN
        -- Create the waitlist_requests table
        CREATE TABLE public.waitlist_requests (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email TEXT NOT NULL UNIQUE,
            name TEXT,
            reason TEXT,
            status TEXT DEFAULT 'pending', -- pending, approved, rejected
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            processed_at TIMESTAMP WITH TIME ZONE,
            processed_by UUID,
            invitation_code_id UUID
        );

        -- Add comment to the table
        COMMENT ON TABLE public.waitlist_requests IS 'Stores requests from users who want to join the platform';
        
        -- Enable Row Level Security
        ALTER TABLE public.waitlist_requests ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for inserting (anyone can request to join)
        CREATE POLICY "Anyone can request to join waitlist" 
        ON public.waitlist_requests 
        FOR INSERT 
        TO public 
        WITH CHECK (true);
        
        -- Create policy for admins to view and manage waitlist
        CREATE POLICY "Admins can manage waitlist" 
        ON public.waitlist_requests 
        FOR ALL 
        TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.user_settings 
                WHERE user_id = auth.uid() 
                AND role = 'admin'
            )
        );
        
        -- Create index on email for faster lookups
        CREATE INDEX idx_waitlist_requests_email ON public.waitlist_requests(email);
        
        -- Create index on status for filtering
        CREATE INDEX idx_waitlist_requests_status ON public.waitlist_requests(status);
    END IF;
END
$$;

-- Create a function to approve a waitlist request and generate an invitation code
CREATE OR REPLACE FUNCTION public.approve_waitlist_request(request_id UUID)
RETURNS UUID AS $$
DECLARE
    v_email TEXT;
    v_code TEXT;
    v_invitation_id UUID;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_settings 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can approve waitlist requests';
    END IF;
    
    -- Get the email from the request
    SELECT email INTO v_email
    FROM public.waitlist_requests
    WHERE id = request_id;
    
    IF v_email IS NULL THEN
        RAISE EXCEPTION 'Waitlist request not found';
    END IF;
    
    -- Generate a random invitation code
    v_code := 'INVITE-' || substr(md5(random()::text), 1, 8);
    
    -- Insert the invitation code
    INSERT INTO public.invitation_codes (code, created_by, expires_at)
    VALUES (v_code, auth.uid(), NOW() + INTERVAL '7 days')
    RETURNING id INTO v_invitation_id;
    
    -- Update the waitlist request
    UPDATE public.waitlist_requests
    SET 
        status = 'approved',
        processed_at = NOW(),
        processed_by = auth.uid(),
        invitation_code_id = v_invitation_id
    WHERE id = request_id;
    
    RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to reject a waitlist request
CREATE OR REPLACE FUNCTION public.reject_waitlist_request(request_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_settings 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can reject waitlist requests';
    END IF;
    
    -- Update the waitlist request
    UPDATE public.waitlist_requests
    SET 
        status = 'rejected',
        processed_at = NOW(),
        processed_by = auth.uid()
    WHERE id = request_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
