/*
  # Add Lineup Field to Events

  1. New Columns
    - `lineup` (jsonb) - Array of lineup/program items for the event

  2. Changes
    - Add lineup field to events table
    - Field stores JSON array with name, start_time, end_time, and description
    - Field is optional (nullable)

  3. Example Structure
    [
      {
        "name": "DJ Max Mustermann",
        "startTime": "20:00",
        "endTime": "22:00",
        "description": "Electronic music set"
      }
    ]
*/

-- Add lineup field
ALTER TABLE events
ADD COLUMN IF NOT EXISTS lineup jsonb DEFAULT NULL;
