/*
  # Fix Security Issues - RLS for rate_limits

  ## Summary
  Fixes security issue: Enables Row Level Security (RLS) on rate_limits table
  to prevent unauthorized access.

  ## Changes
  
  ### Security Fixes
  1. Enable RLS on `rate_limits` table
  2. Add policies for rate_limits access
  
  ## Security Policies
  
  - Service role has full access (via SECURITY DEFINER functions)
  - Users cannot directly access rate_limits table
  - All access must go through secure functions
  
  ## Notes
  - This table is typically accessed by backend functions only
  - RLS policies are restrictive by default
*/

-- ============================================================================
-- 1. ENABLE RLS ON rate_limits TABLE
-- ============================================================================

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. CREATE RESTRICTIVE RLS POLICIES
-- ============================================================================

-- No direct access for users - only through SECURITY DEFINER functions
-- This is intentionally restrictive as rate limiting should be server-controlled

CREATE POLICY "Rate limits managed by service role only"
  ON rate_limits
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'rate_limits') THEN
    RAISE EXCEPTION 'RLS was not enabled on rate_limits table';
  END IF;
END $$;
