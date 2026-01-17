/*
  # Make location column nullable

  ## Overview
  The events table previously required a 'location' column as NOT NULL.
  However, the application now uses separate fields (postcode, city, street) instead.
  This migration makes the location column nullable to allow for the new structure.

  ## Changes
  1. Make location column nullable in events table

  ## Notes
  - This maintains backward compatibility with existing events that have location data
  - New events can use the separate postcode/city/street fields without needing to populate location
*/

-- Make location column nullable
ALTER TABLE events ALTER COLUMN location DROP NOT NULL;
