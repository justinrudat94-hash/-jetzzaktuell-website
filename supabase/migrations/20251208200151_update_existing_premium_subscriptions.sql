/*
  # Update Existing Premium Subscriptions to Sync Profile Status

  ## Problem
  Users who subscribed BEFORE the trial tracking changes still have outdated profile data:
  - `is_premium` may be false even though they have an active subscription
  - `premium_until` may be NULL even though their subscription is valid
  - The trigger function was updated but existing subscriptions were never re-processed

  ## Solution
  This migration manually updates all profiles for users with active or trialing subscriptions
  to ensure their profile reflects their current premium status correctly.

  ## Changes
  1. Updates profiles for all users with status 'active' OR 'trialing'
  2. Sets is_premium = true for these users
  3. Sets premium_until to the appropriate date:
     - For 'trialing': uses trial_end_date
     - For 'active': uses current_period_end
  4. Only updates profiles where the subscription hasn't ended yet

  ## Impact
  - All existing premium/trial users will now correctly show as premium
  - Premium features will work for all subscribed users
  - Premium upgrade button will be hidden for all active subscribers
*/

-- Update profiles for all existing premium/trial subscriptions
UPDATE profiles
SET
  is_premium = true,
  premium_until = CASE
    -- During trial: use trial end date
    WHEN ps.status = 'trialing' AND ps.trial_end_date > now() THEN ps.trial_end_date
    -- Active subscription: use period end
    WHEN ps.status = 'active' AND ps.current_period_end > now() THEN ps.current_period_end
    ELSE NULL
  END
FROM premium_subscriptions ps
WHERE profiles.id = ps.user_id
  AND ps.status IN ('active', 'trialing')
  AND (
    -- Either in valid trial
    (ps.status = 'trialing' AND ps.trial_end_date > now())
    -- Or active with valid period
    OR (ps.status = 'active' AND ps.current_period_end > now())
  );

-- Log the number of affected rows (this will show in migration output)
DO $$
DECLARE
  affected_count integer;
BEGIN
  -- Count users with active or trialing subscriptions
  SELECT COUNT(DISTINCT user_id) INTO affected_count
  FROM premium_subscriptions
  WHERE status IN ('active', 'trialing')
    AND (
      (status = 'trialing' AND trial_end_date > now())
      OR (status = 'active' AND current_period_end > now())
    );
  
  RAISE NOTICE 'Updated % user profiles with active premium subscriptions', affected_count;
END $$;
