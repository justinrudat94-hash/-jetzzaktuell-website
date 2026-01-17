/*
  # Make user_id nullable for external events

  1. Changes
    - Make user_id column nullable in events table
    - This allows Ticketmaster and Eventbrite events to be imported without a user_id
    - External events are system-generated and don't belong to any user

  2. Notes
    - user_id can now be NULL for external/auto-imported events
    - RLS policies already handle NULL user_id cases
*/

ALTER TABLE events ALTER COLUMN user_id DROP NOT NULL;
