/*
  # Add Delete Policy for Brokerage Invitations

  1. Changes
    - Add DELETE policy for brokers to remove invitations from their brokerage
  
  2. Security
    - Only brokers can delete invitations for their own brokerage
*/

-- Allow brokers to delete invitations in their brokerage
CREATE POLICY "Brokers can delete brokerage invitations"
  ON brokerage_invites
  FOR DELETE
  TO authenticated
  USING (
    brokerage_id IN (
      SELECT brokerage_id 
      FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'BROKER'
    )
  );
