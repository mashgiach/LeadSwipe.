-- Insert sample notifications
INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
VALUES 
  ((SELECT id FROM auth.users LIMIT 1), 'system', 'Welcome to LeadSwipe', 'Start swiping to find potential leads for your business.', false, NOW() - INTERVAL '2 days'),
  ((SELECT id FROM auth.users LIMIT 1), 'system', 'Complete Your Profile', 'Add more information to your profile to improve your matches.', false, NOW() - INTERVAL '1 day'),
  ((SELECT id FROM auth.users LIMIT 1), 'new_lead', 'New Leads Available', 'We found 5 new leads that match your criteria.', false, NOW() - INTERVAL '12 hours');
