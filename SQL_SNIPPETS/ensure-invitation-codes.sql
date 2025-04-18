-- Make sure the invitation_codes table exists
CREATE TABLE IF NOT EXISTS public.invitation_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    used_by TEXT,
    used_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on the table
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to read invitation codes
DROP POLICY IF EXISTS "Anyone can read invitation codes" ON public.invitation_codes;
CREATE POLICY "Anyone can read invitation codes" 
ON public.invitation_codes 
FOR SELECT 
USING (true);

-- Create a policy that allows anyone to update invitation codes they're using
DROP POLICY IF EXISTS "Anyone can update invitation codes they're using" ON public.invitation_codes;
CREATE POLICY "Anyone can update invitation codes they're using" 
ON public.invitation_codes 
FOR UPDATE 
USING (true);

-- Insert some valid invitation codes if they don't exist
INSERT INTO public.invitation_codes (code, expires_at)
VALUES 
    ('INVITEME', NULL),
    ('WELCOME', NULL),
    ('LEADSWIPE', NULL),
    ('BETAUSER', NULL)
ON CONFLICT (code) DO NOTHING;

-- Make sure the codes are not used
UPDATE public.invitation_codes
SET used_by = NULL, used_at = NULL
WHERE code IN ('INVITEME', 'WELCOME', 'LEADSWIPE', 'BETAUSER')
AND used_by IS NOT NULL;
