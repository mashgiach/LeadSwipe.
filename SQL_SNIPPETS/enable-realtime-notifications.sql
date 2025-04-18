-- Enable row level security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own notifications
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- Create policy to allow users to update their own notifications
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON notifications FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime subscriptions for the notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
