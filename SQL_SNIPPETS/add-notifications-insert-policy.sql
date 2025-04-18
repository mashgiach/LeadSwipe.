-- Create policy to allow users to insert their own notifications
CREATE POLICY "Users can insert their own notifications"
ON notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);
