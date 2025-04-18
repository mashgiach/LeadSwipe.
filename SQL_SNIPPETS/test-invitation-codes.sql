-- Test if the invitation code 'INVITEME' is valid
SELECT public.is_invitation_code_valid('INVITEME') as is_valid;

-- Check all invitation codes in the system
SELECT code, is_used, used_by, used_at, expires_at 
FROM public.invitation_codes;
