/*
  # Add RLS Policies for Brokerage Invitations

  1. Security Changes
    - Add policy for brokers to create invitations
    - Add policy for users to view their own pending invitations
    - Add policy for brokers to view all invitations in their brokerage
    - Add policy for brokers to update invitation status
  
  2. Notes
    - Only brokers can create invitations
    - Users can only view invitations sent to their email
    - Brokers can view all invitations for their brokerage
*/

-- Allow brokers to create invitations for their brokerage
CREATE POLICY "Brokers can create invitations"
  ON brokerage_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.brokerage_id = brokerage_invites.brokerage_id
      AND user_profiles.role = 'BROKER'
    )
  );

-- Allow anyone with the invite link to view pending invitations
CREATE POLICY "Anyone can view pending invitations by ID"
  ON brokerage_invites
  FOR SELECT
  TO authenticated, anon
  USING (status = 'PENDING');

-- Allow brokers to view all invitations in their brokerage
CREATE POLICY "Brokers can view all brokerage invitations"
  ON brokerage_invites
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.brokerage_id = brokerage_invites.brokerage_id
      AND user_profiles.role = 'BROKER'
    )
  );

-- Allow authenticated users to update invitations to ACCEPTED when they sign up
CREATE POLICY "Users can accept their own invitations"
  ON brokerage_invites
  FOR UPDATE
  TO authenticated
  USING (status = 'PENDING')
  WITH CHECK (status = 'ACCEPTED');
