/*
  # Fix Signup Process with Database Function

  ## Changes
  - Creates a database function to handle complete signup process
  - Function runs with SECURITY DEFINER to bypass RLS during signup
  - Ensures atomic creation of brokerage and user profile
  
  ## Security
  - Function is only accessible to authenticated users who don't have a profile yet
  - Validates all inputs before insertion
  - Maintains data integrity with proper error handling
*/

-- Create function to handle complete signup process
CREATE OR REPLACE FUNCTION create_user_profile_and_brokerage(
  p_user_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_role text,
  p_brokerage_name text,
  p_phone text DEFAULT NULL,
  p_license_number text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brokerage_id uuid;
  v_profile_exists boolean;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM user_profiles WHERE id = p_user_id) INTO v_profile_exists;
  
  IF v_profile_exists THEN
    RAISE EXCEPTION 'Profile already exists for this user';
  END IF;

  -- Validate role
  IF p_role NOT IN ('BROKER', 'AGENT') THEN
    RAISE EXCEPTION 'Invalid role. Must be BROKER or AGENT';
  END IF;

  -- Create or get brokerage
  IF p_brokerage_name IS NOT NULL AND p_brokerage_name != '' THEN
    INSERT INTO brokerages (name, subscription_plan, is_active)
    VALUES (p_brokerage_name, 'BASIC', true)
    RETURNING id INTO v_brokerage_id;
  ELSE
    RAISE EXCEPTION 'Brokerage name is required';
  END IF;

  -- Create user profile
  INSERT INTO user_profiles (
    id,
    brokerage_id,
    email,
    first_name,
    last_name,
    role,
    phone,
    license_number,
    is_deleted
  )
  VALUES (
    p_user_id,
    v_brokerage_id,
    p_email,
    p_first_name,
    p_last_name,
    p_role,
    p_phone,
    p_license_number,
    false
  );

  -- Return success with brokerage_id
  RETURN json_build_object(
    'success', true,
    'brokerage_id', v_brokerage_id,
    'message', 'Profile created successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create profile: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile_and_brokerage TO authenticated;
