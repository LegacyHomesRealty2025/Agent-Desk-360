/*
  # Authentication System with Role-Based Access Control

  ## Overview
  Creates a complete authentication system with separate Broker/Admin and Agent roles.
  Brokers can manage their brokerage and invite agents. Agents can self-register and
  access only their own data.

  ## New Tables

  ### 1. `brokerages`
  Stores brokerage/company information
  - `id` (uuid, primary key) - Unique brokerage identifier
  - `name` (text) - Brokerage name
  - `subscription_plan` (text) - Plan level (BASIC, PRO, ENTERPRISE)
  - `created_at` (timestamptz) - When brokerage was created
  - `is_active` (boolean) - Whether brokerage is active

  ### 2. `user_profiles`
  Extends Supabase auth.users with application-specific profile data
  - `id` (uuid, primary key, references auth.users) - User ID from auth.users
  - `brokerage_id` (uuid) - Reference to brokerage
  - `email` (text) - User email
  - `first_name` (text) - First name
  - `last_name` (text) - Last name
  - `role` (text) - User role (BROKER, AGENT)
  - `phone` (text, nullable) - Phone number
  - `license_number` (text, nullable) - Real estate license number
  - `avatar_url` (text, nullable) - Profile picture URL
  - `is_deleted` (boolean) - Soft delete flag
  - `deleted_at` (timestamptz, nullable) - When deleted
  - `created_at` (timestamptz) - When profile was created
  - `updated_at` (timestamptz) - Last update time

  ### 3. `brokerage_invites`
  Tracks pending invitations for agents to join brokerages
  - `id` (uuid, primary key) - Unique invite identifier
  - `brokerage_id` (uuid) - Brokerage sending invite
  - `email` (text) - Invited user email
  - `role` (text) - Role being offered (typically AGENT)
  - `invited_by` (uuid) - User who sent invite
  - `status` (text) - Invite status (PENDING, ACCEPTED, EXPIRED)
  - `expires_at` (timestamptz) - When invite expires
  - `created_at` (timestamptz) - When invite was created

  ## Security

  ### Row Level Security (RLS)
  - All tables have RLS enabled
  - Users can only access their own data
  - Brokers can access all data within their brokerage
  - Agents can only access their own leads/deals/tasks
  - Public access for invite validation

  ## Important Notes
  - The first user to register becomes a BROKER for a new brokerage
  - Subsequent users can join existing brokerages via invite or self-register as new brokerages
  - Email addresses are unique across the system
  - Soft deletes preserve data integrity
*/

-- Create brokerages table
CREATE TABLE IF NOT EXISTS brokerages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subscription_plan text DEFAULT 'BASIC' CHECK (subscription_plan IN ('BASIC', 'PRO', 'ENTERPRISE')),
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  brokerage_id uuid NOT NULL REFERENCES brokerages(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('BROKER', 'AGENT')),
  phone text,
  license_number text,
  avatar_url text,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create brokerage_invites table
CREATE TABLE IF NOT EXISTS brokerage_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brokerage_id uuid NOT NULL REFERENCES brokerages(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text DEFAULT 'AGENT' CHECK (role IN ('BROKER', 'AGENT')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED')),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now(),
  UNIQUE(brokerage_id, email, status)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_brokerage_id ON user_profiles(brokerage_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_brokerage_invites_email ON brokerage_invites(email);
CREATE INDEX IF NOT EXISTS idx_brokerage_invites_status ON brokerage_invites(status);

-- Enable RLS on all tables
ALTER TABLE brokerages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brokerage_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brokerages table
CREATE POLICY "Users can view their own brokerage"
  ON brokerages FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT brokerage_id FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Brokers can update their brokerage"
  ON brokerages FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT brokerage_id FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'BROKER'
    )
  )
  WITH CHECK (
    id IN (
      SELECT brokerage_id FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'BROKER'
    )
  );

CREATE POLICY "Anyone can create a brokerage"
  ON brokerages FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for user_profiles table
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users in same brokerage can view each other"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    brokerage_id IN (
      SELECT brokerage_id FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    )
    AND is_deleted = false
  );

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Brokers can update profiles in their brokerage"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    brokerage_id IN (
      SELECT brokerage_id FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'BROKER'
    )
  )
  WITH CHECK (
    brokerage_id IN (
      SELECT brokerage_id FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'BROKER'
    )
  );

-- RLS Policies for brokerage_invites table
CREATE POLICY "Users can view invites for their brokerage"
  ON brokerage_invites FOR SELECT
  TO authenticated
  USING (
    brokerage_id IN (
      SELECT brokerage_id FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view their own pending invites by email"
  ON brokerage_invites FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'PENDING'
  );

CREATE POLICY "Brokers can create invites"
  ON brokerage_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    brokerage_id IN (
      SELECT brokerage_id FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'BROKER'
    )
  );

CREATE POLICY "Users can update invites sent to them"
  ON brokerage_invites FOR UPDATE
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Brokers can update invites from their brokerage"
  ON brokerage_invites FOR UPDATE
  TO authenticated
  USING (
    brokerage_id IN (
      SELECT brokerage_id FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'BROKER'
    )
  )
  WITH CHECK (
    brokerage_id IN (
      SELECT brokerage_id FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'BROKER'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
