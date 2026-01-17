/*
  # Fix Eventbrite OAuth Tokens for Global Usage

  1. Changes
    - Drop foreign key constraint on user_id (tokens are app-wide, not user-specific)
    - Make user_id nullable
    - Drop unique constraint on user_id
    - Add global_token boolean flag (default true)
    
  2. Security
    - Maintain RLS policies for admin-only access
    - Tokens are managed by service role key in edge functions
*/

-- Drop constraints
ALTER TABLE eventbrite_oauth_tokens 
  DROP CONSTRAINT IF EXISTS eventbrite_oauth_tokens_user_id_fkey;

ALTER TABLE eventbrite_oauth_tokens 
  DROP CONSTRAINT IF EXISTS eventbrite_oauth_tokens_user_id_key;

-- Make user_id nullable
ALTER TABLE eventbrite_oauth_tokens 
  ALTER COLUMN user_id DROP NOT NULL;

-- Add global flag
ALTER TABLE eventbrite_oauth_tokens 
  ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT true;

-- Clean up any existing tokens
DELETE FROM eventbrite_oauth_tokens;