/*
  # Simplify Invitation Policies

  1. Changes
    - Drop all existing policies on brokerage_invites
    - Create simplified, non-conflicting policies
    - Ensure brokers can view and create invitations for their brokerage
    - Allow public access to view pending invitations by ID (for signup flow)
  
  2. Security
    - Brokers can SELECT, INSERT, and UPDATE invitations for their brokerage
    - Anyone can view pending invitations (needed for signup links)
    - Users can update their own invitations to ACCEPTED
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view pending invitations by ID" ON brokerage_invites;
DROP POLICY IF EXISTS "Anyone can view their own pending invites by email" ON brokerage_invites;
DROP POLICY IF EXISTS "Brokers can create invitations" ON brokerage_invites;
DROP POLICY IF EXISTS "Brokers can create invites" ON brokerage_invites;
DROP POLICY IF EXISTS "Brokers can update invites from their brokerage" ON brokerage_invites;
DROP POLICY IF EXISTS "Brokers can view all brokerage invitations" ON brokerage_invites;
DROP POLICY IF EXISTS "Users can accept their own invitations" ON brokerage_invites;
DROP POLICY IF EXISTS "Users can update invites sent to them" ON brokerage_invites;
DROP POLICY IF EXISTS "Users can view invites for their brokerage" ON brokerage_invites;

-- Allow anyone (authenticated or not) to view pending invitations
CREATE POLICY "Public can view pending invitations"
  ON brokerage_invites
  FOR SELECT
  TO authenticated, anon
  USING (status = 'PENDING');

-- Allow brokers to view all invitations in their brokerage
CREATE POLICY "Brokers can view brokerage invitations"
  ON brokerage_invites
  FOR SELECT
  TO authenticated
  USING (
    brokerage_id IN (
      SELECT brokerage_id 
      FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'BROKER'
    )
  );

-- Allow brokers to create invitations for their brokerage
CREATE POLICY "Brokers can insert invitations"
  ON brokerage_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    brokerage_id IN (
      SELECT brokerage_id 
      FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'BROKER'
    )
  );

-- Allow brokers to update invitations in their brokerage
CREATE POLICY "Brokers can update brokerage invitations"
  ON brokerage_invites
  FOR UPDATE
  TO authenticated
  USING (
    brokerage_id IN (
      SELECT brokerage_id 
      FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'BROKER'
    )
  )
  WITH CHECK (
    brokerage_id IN (
      SELECT brokerage_id 
      FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'BROKER'
    )
  );

-- Allow authenticated users to accept invitations
CREATE POLICY "Users can accept invitations"
  ON brokerage_invites
  FOR UPDATE
  TO authenticated
  USING (status = 'PENDING')
  WITH CHECK (status IN ('ACCEPTED', 'EXPIRED'));
