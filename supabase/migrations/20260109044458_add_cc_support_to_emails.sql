/*
  # Add CC Support to Email System

  1. Changes
    - Add `recipient_type` column to `email_recipients` table
      - Can be 'to' or 'cc'
      - Defaults to 'to' for backward compatibility
    
  2. Notes
    - Existing records will default to 'to' type
    - This allows tracking CC recipients separately from primary recipients
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_recipients' AND column_name = 'recipient_type'
  ) THEN
    ALTER TABLE email_recipients ADD COLUMN recipient_type text DEFAULT 'to' CHECK (recipient_type IN ('to', 'cc'));
  END IF;
END $$;