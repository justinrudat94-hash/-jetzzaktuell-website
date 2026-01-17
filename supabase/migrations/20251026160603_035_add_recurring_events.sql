/*
  # Add Recurring Events Support

  ## Overview
  This migration adds support for recurring events, allowing events to repeat on a schedule.

  ## Changes
  1. Add new columns to events table:
    - `is_recurring` (boolean): Whether this event repeats
    - `recurrence_pattern` (text): Pattern type (daily, weekly, monthly, yearly)
    - `recurrence_days` (text[]): Array of weekdays for weekly recurrence (Mo, Di, Mi, etc.)
    - `recurrence_end_date` (date): When the recurrence ends (optional)
    - `recurrence_count` (integer): Number of occurrences (optional)
    - `parent_event_id` (uuid): Reference to parent event for instances
    - `occurrence_date` (date): Specific date for this occurrence

  ## Notes
  - One event can be marked as recurring and generates multiple child event instances
  - Child events have parent_event_id set and are not themselves recurring
  - Recurrence patterns: 'daily', 'weekly', 'monthly', 'yearly'
  - For weekly recurrence, recurrence_days contains days like ['Mo', 'Di', 'Fr']
*/

-- Add columns for recurring events
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
ADD COLUMN IF NOT EXISTS recurrence_days TEXT[],
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
ADD COLUMN IF NOT EXISTS recurrence_count INTEGER CHECK (recurrence_count > 0),
ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES events(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS occurrence_date DATE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_parent_event_id ON events(parent_event_id) WHERE parent_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_is_recurring ON events(is_recurring) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_events_occurrence_date ON events(occurrence_date) WHERE occurrence_date IS NOT NULL;