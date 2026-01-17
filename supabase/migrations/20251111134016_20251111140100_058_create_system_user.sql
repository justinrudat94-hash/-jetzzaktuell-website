/*
  # System User Helper for Auto-Imported Events

  ## Overview
  Creates a helper function to get a system user ID for automatically
  imported events from external sources like Ticketmaster and Eventbrite.

  ## Changes

  1. Helper Function
    - Returns a placeholder UUID for system events
    - Used to identify auto-imported events
    - No actual user profile needed (events can have NULL user_id)

  2. Configuration
    - Events with this user_id are marked as auto-imported
    - Alternative: Use NULL user_id + is_auto_imported flag

  ## Security
  - No RLS changes needed
  - System events are public by default

  ## Notes
  - Auto-imported Ticketmaster/Eventbrite events will use NULL user_id
  - The is_auto_imported flag identifies these events
  - external_source field shows where event came from
*/

-- Create a helper function to get the system user ID placeholder
-- This returns NULL since we'll use the is_auto_imported flag instead
CREATE OR REPLACE FUNCTION get_system_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULL::uuid;
$$;

-- Add comment
COMMENT ON FUNCTION get_system_user_id IS 'Returns NULL for auto-imported events (they have no user owner, only is_auto_imported flag)';
