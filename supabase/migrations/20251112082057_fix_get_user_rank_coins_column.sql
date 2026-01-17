/*
  # Fix get_user_rank function - coins column name

  1. Changes
    - Fix get_user_rank function to use correct column name 'total_coins' instead of 'coins'
    
  2. Security
    - Maintains SECURITY DEFINER and search_path = public
*/

DROP FUNCTION IF EXISTS public.get_user_rank(uuid) CASCADE;

CREATE FUNCTION public.get_user_rank(p_user_id uuid)
RETURNS integer
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rank integer;
BEGIN
  SELECT rank INTO v_rank
  FROM (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY total_coins DESC) as rank
    FROM public.user_stats
  ) ranked
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_rank, 0);
END;
$$;
