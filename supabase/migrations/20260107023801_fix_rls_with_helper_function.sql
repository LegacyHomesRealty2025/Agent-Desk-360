/*
  # Fix RLS Infinite Recursion with Helper Function

  ## Problem
  RLS policies for user_profiles were causing infinite recursion by querying
  user_profiles within the policy check itself.

  ## Solution
  Create a security definer function in public schema that bypasses RLS
  to get the current user's brokerage_id without triggering recursion.
  
  ## Security
  - Function only returns the authenticated user's own brokerage_id
  - Uses SECURITY DEFINER to bypass RLS during lookup
  - Cannot be exploited to access other users' data
*/

-- Drop the problematic policy first
DROP POLICY IF EXISTS "Users can view profiles in their brokerage" ON user_profiles;

-- Create helper function in public schema
CREATE OR REPLACE FUNCTION get_my_brokerage_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT brokerage_id 
  FROM user_profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_my_brokerage_id() TO authenticated;

-- Create policy using the helper function (no recursion!)
CREATE POLICY "Users can view profiles in their brokerage"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    is_deleted = false 
    AND brokerage_id = get_my_brokerage_id()
  );
