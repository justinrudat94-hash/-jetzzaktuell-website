/*
  # Fix Premium Status Trigger for Trial Support

  1. Problem
    - The trigger function `update_profile_premium_status()` only sets `is_premium = true` for status 'active'
    - Users in trial period (status = 'trialing') are not recognized as premium users in profiles table
    - This causes the Premium upgrade button to show even during trial

  2. Changes
    - Update `update_profile_premium_status()` to handle 'trialing' status
    - Set `is_premium = true` for both 'active' and 'trialing' status
    - Use `trial_end_date` for premium_until during trial period
    - Use `current_period_end` for premium_until after trial converts to active

  3. Logic
    - Status = 'trialing' AND trial_end_date > now() → is_premium = true, premium_until = trial_end_date
    - Status = 'active' AND current_period_end > now() → is_premium = true, premium_until = current_period_end
    - Any other status → is_premium = false, premium_until = NULL

  4. Impact
    - Trial users will now correctly show as premium in profiles
    - Premium features will work during trial
    - Premium upgrade button will be hidden during trial
*/

-- Update trigger function to handle trialing status
CREATE OR REPLACE FUNCTION update_profile_premium_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profile premium status
  UPDATE profiles
  SET
    is_premium = CASE
      -- User is premium if status is 'trialing' and trial hasn't ended
      WHEN NEW.status = 'trialing' AND NEW.trial_end_date > now() THEN true
      -- User is premium if status is 'active' and period hasn't ended
      WHEN NEW.status = 'active' AND NEW.current_period_end > now() THEN true
      -- All other cases: not premium
      ELSE false
    END,
    premium_until = CASE
      -- During trial: use trial end date
      WHEN NEW.status = 'trialing' AND NEW.trial_end_date > now() THEN NEW.trial_end_date
      -- Active subscription: use period end
      WHEN NEW.status = 'active' AND NEW.current_period_end > now() THEN NEW.current_period_end
      -- Not premium: clear date
      ELSE NULL
    END
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_profile_premium_status IS
'Trigger function to sync premium status from subscriptions to profiles. Handles both trialing and active subscriptions.';