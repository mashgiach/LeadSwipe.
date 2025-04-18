-- Create a stored procedure to delete user data from all related tables
CREATE OR REPLACE FUNCTION delete_user_data(user_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete from profiles
  DELETE FROM profiles WHERE id = user_id;
  
  -- Delete from user_settings
  DELETE FROM user_settings WHERE user_id = user_id;
  
  -- Delete from matched_leads
  DELETE FROM matched_leads WHERE user_id = user_id;
  
  -- Delete from saved_leads
  DELETE FROM saved_leads WHERE user_id = user_id;
  
  -- Delete from blocked_leads
  DELETE FROM blocked_leads WHERE user_id = user_id;
  
  -- Delete from viewed_leads
  DELETE FROM viewed_leads WHERE user_id = user_id;
  
  -- Delete from archived_leads
  DELETE FROM archived_leads WHERE user_id = user_id;
  
  -- Delete from notifications
  DELETE FROM notifications WHERE user_id = user_id;
  
  -- Add any other tables that contain user data
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_data(UUID) TO service_role;
