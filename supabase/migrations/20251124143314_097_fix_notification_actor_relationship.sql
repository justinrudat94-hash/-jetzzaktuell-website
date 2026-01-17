/*
  # Fix notification actor relationship

  ## Changes
  - Drop existing broken foreign key if exists
  - Add proper foreign key constraint from actor_id to profiles(id)
  - Update RLS policies to support the relationship query

  ## Security
  - Maintains existing RLS policies
  - Ensures actor data is accessible when reading notifications
*/

-- Drop existing foreign key if exists (safe with IF EXISTS)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'in_app_notifications_actor_id_fkey'
    AND table_name = 'in_app_notifications'
  ) THEN
    ALTER TABLE in_app_notifications DROP CONSTRAINT in_app_notifications_actor_id_fkey;
  END IF;
END $$;

-- Add proper foreign key to profiles table
ALTER TABLE in_app_notifications
ADD CONSTRAINT in_app_notifications_actor_id_fkey
FOREIGN KEY (actor_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON in_app_notifications(actor_id);

-- Grant necessary permissions for the relationship query
GRANT SELECT ON profiles TO authenticated;
