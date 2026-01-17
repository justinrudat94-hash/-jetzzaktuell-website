/*
  # Fix award_coins function to use correct column name

  1. Changes
    - Update award_coins function to use total_coins instead of coins
    - The user_stats table has total_coins, not coins
*/

CREATE OR REPLACE FUNCTION public.award_coins(
  p_user_id uuid, 
  p_amount integer, 
  p_transaction_type text, 
  p_description text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update total_coins (not coins)
  UPDATE public.user_stats
  SET total_coins = total_coins + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Insert transaction record
  INSERT INTO public.reward_transactions (user_id, type, amount, description)
  VALUES (p_user_id, p_transaction_type, p_amount, p_description);
END;
$$;
