/*
  # Fix Invitation Insert Policy

  1. Changes
    - Drop duplicate/conflicting INSERT policies
    - Keep only the working policy that uses IN clause for brokerage_id matching
  
  2. Security
    - Ensures brokers can only create invitations for their own brokerage
    - Removes conflicting policy that was blocking inserts
*/

-- Drop the problematic policy that references brokerage_invites.brokerage_id incorrectly
DROP POLICY IF EXISTS "Brokers can create invitations" ON brokerage_invites;

-- The working policy "Brokers can create invites" will remain active
-- It uses: brokerage_id IN (SELECT user_profiles.brokerage_id FROM user_profiles WHERE id = auth.uid() AND role = 'BROKER')
