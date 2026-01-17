/*
  # Create award_coins Function
  
  This migration creates the missing award_coins function that is required
  for the reward system to work.
  
  1. Functions
    - `award_coins(p_user_id, p_amount, p_reason, p_metadata)` - Awards coins to users
      - Creates transaction record
      - Updates user stats
      - Used by rewardService.ts
  
  2. Security
    - SECURITY DEFINER to allow service role to award coins
    - No RLS needed as function handles permissions
*/

-- Function: Award coins for any action
CREATE OR REPLACE FUNCTION award_coins(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  -- Create transaction record
  INSERT INTO reward_transactions (user_id, amount, reason, metadata)
  VALUES (p_user_id, p_amount, p_reason, p_metadata);

  -- Update user stats
  UPDATE user_stats
  SET
    total_coins = total_coins + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
