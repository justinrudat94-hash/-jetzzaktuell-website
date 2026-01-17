/*
  # Add Unique Constraint to Scraped Events

  ## Overview
  Prevents duplicate imports of the same external event into the scraped_events table.
  This ensures that each external event (identified by source_id + external_id) can only
  be imported once into the scraping queue.

  ## Changes

  1. Unique Constraint
    - Creates UNIQUE index on (source_id, external_id)
    - Prevents duplicate imports from the same source
    - Only applies when both fields are NOT NULL

  2. Cleanup
    - Before adding constraint, removes any existing duplicates
    - Keeps only the most recent version of each duplicate

  ## Security
  - No RLS changes needed
  - Constraint is at database level

  ## Notes
  - This works together with the events table constraint
  - Prevents duplicates at import stage (scraped_events)
  - The events table constraint prevents duplicates at publish stage
*/

-- First, let's identify and remove duplicates (keep most recent)
DO $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete older duplicates, keeping only the newest one
  WITH duplicates AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY source_id, external_id
        ORDER BY created_at DESC
      ) as rn
    FROM scraped_events
    WHERE source_id IS NOT NULL
      AND external_id IS NOT NULL
  )
  DELETE FROM scraped_events
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Removed % duplicate scraped events', deleted_count;
END $$;

-- Now create the unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_scraped_events_unique_external
ON scraped_events(source_id, external_id)
WHERE source_id IS NOT NULL AND external_id IS NOT NULL;

-- Add comment
COMMENT ON INDEX idx_scraped_events_unique_external IS
'Ensures each external event can only be imported once per source';
