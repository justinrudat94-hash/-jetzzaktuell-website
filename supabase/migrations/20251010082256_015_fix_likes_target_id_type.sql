/*
  # Fix Likes Table - Change target_id from UUID to TEXT

  1. Changes
    - Change `target_id` column type from UUID to TEXT
    - This allows the likes system to work with both integer IDs (events) and UUID IDs (users, livestreams)
    - Drop and recreate constraints to allow TEXT type

  2. Why
    - Current events table uses integer IDs (1, 2, 3, etc.)
    - Likes table expected UUID for target_id
    - This caused "invalid input syntax for type uuid" errors
    - TEXT type is flexible and works with all ID formats

  3. Security
    - All existing RLS policies remain unchanged
    - No data loss - existing likes preserved
*/

-- Step 1: Drop the existing foreign key constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'likes_target_id_fkey' 
    AND table_name = 'likes'
  ) THEN
    ALTER TABLE likes DROP CONSTRAINT likes_target_id_fkey;
  END IF;
END $$;

-- Step 2: Change target_id column type from UUID to TEXT
ALTER TABLE likes ALTER COLUMN target_id TYPE text USING target_id::text;

-- Step 3: Update any existing indexes
DROP INDEX IF EXISTS idx_likes_target;
CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id);

-- Step 4: Add check constraint to ensure target_id is not empty
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'likes_target_id_not_empty' 
    AND table_name = 'likes'
  ) THEN
    ALTER TABLE likes ADD CONSTRAINT likes_target_id_not_empty CHECK (length(target_id) > 0);
  END IF;
END $$;