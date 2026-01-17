/*
  # Add Unique Constraint for External Events

  1. Changes
    - Set external_source to 'manual' for all events without external_source
    - Add unique constraint on (external_source, external_id) to prevent duplicate imports
    - This prevents importing the same event multiple times from external sources
  
  2. Security
    - No RLS changes needed
    - Existing policies remain unchanged
*/

-- Set manual source for existing events without external_source
UPDATE events 
SET external_source = 'manual' 
WHERE external_source IS NULL;

-- Add unique constraint for external events (prevents duplicates)
-- Only applies to events with external_id (manual events have NULL external_id)
CREATE UNIQUE INDEX unique_external_event 
ON events (external_source, external_id) 
WHERE external_id IS NOT NULL;
