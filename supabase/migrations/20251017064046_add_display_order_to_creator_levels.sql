/*
  # Add display_order column to creator_levels

  1. Changes
    - Add `display_order` column to `creator_levels` table
    - Set default values based on min_likes order
  
  2. Security
    - No changes to RLS policies
*/

-- Add display_order column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_levels' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE creator_levels ADD COLUMN display_order integer DEFAULT 0;
    
    -- Update display_order based on min_likes
    UPDATE creator_levels 
    SET display_order = (
      SELECT ROW_NUMBER() OVER (ORDER BY min_likes ASC)
      FROM creator_levels cl2
      WHERE cl2.id = creator_levels.id
    );
  END IF;
END $$;
