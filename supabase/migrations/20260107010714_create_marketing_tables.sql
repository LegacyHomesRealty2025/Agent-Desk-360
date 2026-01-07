/*
  # Marketing Hub Tables

  1. New Tables
    - `agent_branding`
      - `user_id` (uuid, primary key, references auth.users)
      - `headshot_url` (text)
      - `logo_url` (text)
      - `tagline` (text)
      - `phone` (text)
      - `email` (text)
      - `license_number` (text)
      - `updated_at` (timestamp)
    
    - `marketing_assets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `type` (text) - IMAGE, PDF, VIDEO
      - `url` (text)
      - `thumbnail_url` (text, optional)
      - `file_size` (bigint, optional)
      - `folder` (text, optional) - for organizing assets
      - `created_at` (timestamp)
      - `is_deleted` (boolean)
    
    - `flyer_templates`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, nullable for system templates)
      - `template_type` (text) - JUST_LISTED, JUST_SOLD, OPEN_HOUSE, PROPERTY_PROMOTION
      - `name` (text)
      - `design_data` (jsonb) - stores layout, text positions, styles
      - `thumbnail_url` (text, optional)
      - `is_system_template` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `social_captions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `platform` (text) - INSTAGRAM, FACEBOOK, LINKEDIN
      - `property_address` (text)
      - `property_price` (text)
      - `beds` (integer, optional)
      - `baths` (decimal, optional)
      - `caption` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS agent_branding (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  headshot_url text,
  logo_url text,
  tagline text,
  phone text,
  email text,
  license_number text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agent_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own branding"
  ON agent_branding
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own branding"
  ON agent_branding
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own branding"
  ON agent_branding
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS marketing_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'IMAGE',
  url text NOT NULL,
  thumbnail_url text,
  file_size bigint,
  folder text DEFAULT 'General',
  created_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false
);

ALTER TABLE marketing_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assets"
  ON marketing_assets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND is_deleted = false);

CREATE POLICY "Users can insert own assets"
  ON marketing_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assets"
  ON marketing_assets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets"
  ON marketing_assets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS flyer_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  template_type text NOT NULL DEFAULT 'JUST_LISTED',
  name text NOT NULL,
  design_data jsonb NOT NULL DEFAULT '{}',
  thumbnail_url text,
  is_system_template boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE flyer_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates and system templates"
  ON flyer_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_system_template = true);

CREATE POLICY "Users can insert own templates"
  ON flyer_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON flyer_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON flyer_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS social_captions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  platform text NOT NULL,
  property_address text NOT NULL,
  property_price text NOT NULL,
  beds integer,
  baths decimal,
  caption text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE social_captions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own captions"
  ON social_captions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own captions"
  ON social_captions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own captions"
  ON social_captions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);