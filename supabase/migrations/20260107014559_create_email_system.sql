/*
  # Email System with Bulk Send Support

  ## Overview
  Creates a comprehensive email system with support for single and bulk email sending,
  email templates, and recipient tracking.

  ## New Tables
  
  ### 1. `emails`
  Stores all email messages sent through the system
  - `id` (uuid, primary key) - Unique email identifier
  - `user_id` (uuid) - Agent who sent the email
  - `subject` (text) - Email subject line
  - `body` (text) - Email message content
  - `sender_email` (text) - Sender's email address
  - `folder` (text) - Email folder (INBOX, SENT, DRAFTS, etc.)
  - `is_bulk` (boolean) - Whether this was a bulk send
  - `template_id` (uuid, nullable) - Reference to template if used
  - `sent_at` (timestamptz) - When email was sent
  - `created_at` (timestamptz) - When record was created
  - `is_deleted` (boolean) - Soft delete flag

  ### 2. `email_recipients`
  Tracks individual recipients for each email (supports bulk sending)
  - `id` (uuid, primary key) - Unique recipient record
  - `email_id` (uuid) - Reference to parent email
  - `recipient_email` (text) - Recipient's email address
  - `recipient_name` (text) - Recipient's name
  - `contact_id` (text, nullable) - Reference to contact/lead if applicable
  - `status` (text) - Delivery status (sent, delivered, failed, etc.)
  - `sent_at` (timestamptz) - When sent to this recipient
  - `opened_at` (timestamptz, nullable) - When recipient opened (if tracked)

  ### 3. `email_templates`
  Reusable email templates for common messages
  - `id` (uuid, primary key) - Unique template identifier
  - `user_id` (uuid) - Agent who created the template
  - `name` (text) - Template name for easy identification
  - `subject` (text) - Default subject line
  - `body` (text) - Template content with optional placeholders
  - `category` (text) - Template category (follow-up, listing, open-house, etc.)
  - `is_shared` (boolean) - Whether template is shared with team
  - `created_at` (timestamptz) - When template was created
  - `updated_at` (timestamptz) - Last modification time
  - `is_deleted` (boolean) - Soft delete flag

  ## Security
  - RLS enabled on all tables
  - Users can only access their own emails and templates
  - Separate policies for SELECT, INSERT, UPDATE, DELETE operations
  - Team members can view shared templates

  ## Notes
  - Email body supports plain text with optional placeholders like {{firstName}}, {{propertyAddress}}
  - Bulk emails create one email record with multiple recipient records
  - Soft deletes preserve email history
  - Status tracking allows future integration with email service webhooks
*/

-- Create emails table
CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  subject text NOT NULL,
  body text NOT NULL,
  sender_email text NOT NULL,
  folder text DEFAULT 'SENT',
  is_bulk boolean DEFAULT false,
  template_id uuid,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Create email_recipients table
CREATE TABLE IF NOT EXISTS email_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  recipient_name text,
  contact_id text,
  status text DEFAULT 'sent',
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz
);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  category text DEFAULT 'general',
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails(folder);
CREATE INDEX IF NOT EXISTS idx_emails_sent_at ON emails(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_recipients_email_id ON email_recipients(email_id);
CREATE INDEX IF NOT EXISTS idx_email_recipients_contact_id ON email_recipients(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);

-- Enable RLS on all tables
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emails table
CREATE POLICY "Users can view their own emails"
  ON emails FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND is_deleted = false);

CREATE POLICY "Users can insert their own emails"
  ON emails FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emails"
  ON emails FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emails"
  ON emails FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for email_recipients table
CREATE POLICY "Users can view recipients of their emails"
  ON email_recipients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM emails
      WHERE emails.id = email_recipients.email_id
      AND emails.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert recipients for their emails"
  ON email_recipients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM emails
      WHERE emails.id = email_recipients.email_id
      AND emails.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update recipients of their emails"
  ON email_recipients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM emails
      WHERE emails.id = email_recipients.email_id
      AND emails.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM emails
      WHERE emails.id = email_recipients.email_id
      AND emails.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete recipients of their emails"
  ON email_recipients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM emails
      WHERE emails.id = email_recipients.email_id
      AND emails.user_id = auth.uid()
    )
  );

-- RLS Policies for email_templates table
CREATE POLICY "Users can view their own and shared templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user_id OR is_shared = true)
    AND is_deleted = false
  );

CREATE POLICY "Users can insert their own templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert some default email templates
INSERT INTO email_templates (user_id, name, subject, body, category, is_shared)
VALUES 
  (
    gen_random_uuid(),
    'Property Follow-Up',
    'Following up on {{propertyAddress}}',
    'Hi {{firstName}},

I wanted to follow up regarding the property at {{propertyAddress}}.

Have you had a chance to think about it? I''d be happy to schedule another showing or answer any questions you might have.

Looking forward to hearing from you!

Best regards',
    'follow-up',
    true
  ),
  (
    gen_random_uuid(),
    'Open House Invitation',
    'Open House: {{propertyAddress}}',
    'Hi {{firstName}},

You''re invited to an exclusive open house at {{propertyAddress}}!

Date: {{date}}
Time: {{time}}

This beautiful property features {{beds}} bedrooms and {{baths}} bathrooms. Don''t miss this opportunity to see it in person!

Please let me know if you can make it.

Best regards',
    'open-house',
    true
  ),
  (
    gen_random_uuid(),
    'New Listing Alert',
    'New Listing: {{propertyAddress}}',
    'Hi {{firstName}},

I have exciting news! A new property just hit the market that matches your criteria:

Address: {{propertyAddress}}
Price: {{price}}
Bedrooms: {{beds}}
Bathrooms: {{baths}}

This won''t last long! Let me know if you''d like to schedule a showing.

Best regards',
    'listing',
    true
  );
