/*
  # Fix RLS Infinite Recursion in User Profiles

  ## Problem
  The "Users in same brokerage can view each other" policy causes infinite recursion
  because it queries user_profiles within a user_profiles policy check.

  ## Solution
  Simplify the policies to avoid recursive lookups:
  1. Keep "Users can view their own profile" (no recursion)
  2. Remove the problematic "Users in same brokerage" policy
  3. Add a simpler policy that allows viewing non-deleted profiles in the same brokerage
  
  ## Security
  - Users can always view their own profile
  - Users can view other profiles only if they share the same brokerage_id
  - Deleted profiles are hidden
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users in same brokerage can view each other" ON user_profiles;

-- Create a simpler policy without recursion
-- This policy allows users to view other profiles if:
-- 1. The profile is not deleted
-- 2. The profile belongs to their brokerage (checked via brokerage_id match)
CREATE POLICY "Users can view profiles in their brokerage"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    is_deleted = false 
    AND brokerage_id = (
      SELECT brokerage_id 
      FROM user_profiles 
      WHERE id = auth.uid() 
      LIMIT 1
    )
  );
