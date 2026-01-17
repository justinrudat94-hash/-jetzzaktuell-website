/*
  # Add Contact and Additional Information Fields

  1. New Columns
    - `contact_email` (text) - Contact email for the event
    - `contact_phone` (text) - Contact phone number for the event
    - `contact_website` (text) - Contact website URL for the event
    - `additional_info` (text) - Additional information about the event

  2. Changes
    - Add contact and additional information fields to events table
    - All fields are optional (nullable)
*/

-- Add contact fields
ALTER TABLE events
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS contact_website text,
ADD COLUMN IF NOT EXISTS additional_info text;
