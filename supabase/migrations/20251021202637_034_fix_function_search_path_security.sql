/*
  # Fix Function Security - Set Immutable Search Path

  This migration fixes the "role mutable search_path" security warnings
  by setting a fixed search_path for all database functions.
  
  ## Changes
  - Drop and recreate all functions with SET search_path = public
  - Recreate triggers for functions that have dependencies
  - This prevents potential SQL injection attacks via search_path manipulation
*/

-- Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS initialize_user_stats_trigger ON profiles;
DROP TRIGGER IF EXISTS initialize_user_ad_state_trigger ON profiles;
DROP TRIGGER IF EXISTS update_ticket_inventory_trigger ON ticket_purchases;
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- Drop all functions
DROP FUNCTION IF EXISTS public.initialize_user_stats() CASCADE;
DROP FUNCTION IF EXISTS public.award_like_coins(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.remove_like_coins(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.award_milestone_bonus(uuid, text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.update_creator_level(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.award_coins(uuid, integer, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_rank(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.initialize_user_ad_state() CASCADE;
DROP FUNCTION IF EXISTS public.update_ticket_inventory() CASCADE;
DROP FUNCTION IF EXISTS public.generate_ticket_qr_code(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.track_ad_impression(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.award_rewarded_ad_coins(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_ticket_revenue_split(numeric, integer) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate functions with secure search_path

CREATE FUNCTION public.initialize_user_stats()
RETURNS TRIGGER
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.award_like_coins(p_user_id uuid, p_amount integer)
RETURNS void
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_stats
  SET coins = coins + p_amount
  WHERE user_id = p_user_id;
END;
$$;

CREATE FUNCTION public.remove_like_coins(p_user_id uuid, p_amount integer)
RETURNS void
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_stats
  SET coins = GREATEST(0, coins - p_amount)
  WHERE user_id = p_user_id;
END;
$$;

CREATE FUNCTION public.award_milestone_bonus(p_user_id uuid, p_milestone text, p_amount integer)
RETURNS void
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_stats
  SET coins = coins + p_amount
  WHERE user_id = p_user_id;
  
  INSERT INTO public.reward_transactions (user_id, type, amount, description)
  VALUES (p_user_id, 'milestone', p_amount, p_milestone);
END;
$$;

CREATE FUNCTION public.update_creator_level(p_user_id uuid)
RETURNS void
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_follower_count integer;
  v_new_level_id uuid;
BEGIN
  SELECT COUNT(*) INTO v_follower_count
  FROM public.followers
  WHERE following_id = p_user_id;
  
  SELECT id INTO v_new_level_id
  FROM public.creator_levels
  WHERE min_followers <= v_follower_count
  ORDER BY min_followers DESC
  LIMIT 1;
  
  UPDATE public.profiles
  SET creator_level_id = v_new_level_id
  WHERE id = p_user_id;
END;
$$;

CREATE FUNCTION public.award_coins(
  p_user_id uuid,
  p_amount integer,
  p_transaction_type text,
  p_description text DEFAULT NULL
)
RETURNS void
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_stats
  SET coins = coins + p_amount
  WHERE user_id = p_user_id;
  
  INSERT INTO public.reward_transactions (user_id, type, amount, description)
  VALUES (p_user_id, p_transaction_type, p_amount, p_description);
END;
$$;

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
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY coins DESC) as rank
    FROM public.user_stats
  ) ranked
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_rank, 0);
END;
$$;

CREATE FUNCTION public.initialize_user_ad_state()
RETURNS TRIGGER
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_ad_state (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_ticket_inventory()
RETURNS TRIGGER
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.event_tickets
    SET available = available - NEW.quantity
    WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.generate_ticket_qr_code(p_purchase_id uuid)
RETURNS text
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN 'TICKET-' || p_purchase_id::text;
END;
$$;

CREATE FUNCTION public.track_ad_impression(p_user_id uuid, p_ad_type text)
RETURNS void
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.ad_impressions (user_id, ad_type)
  VALUES (p_user_id, p_ad_type);
END;
$$;

CREATE FUNCTION public.award_rewarded_ad_coins(p_user_id uuid)
RETURNS void
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_stats
  SET coins = coins + 10
  WHERE user_id = p_user_id;
  
  INSERT INTO public.reward_transactions (user_id, type, amount, description)
  VALUES (p_user_id, 'rewarded_ad', 10, 'Watched rewarded ad');
END;
$$;

CREATE FUNCTION public.calculate_ticket_revenue_split(
  p_ticket_price numeric,
  p_quantity integer
)
RETURNS TABLE(platform_fee numeric, creator_amount numeric)
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total numeric;
  v_fee numeric;
BEGIN
  v_total := p_ticket_price * p_quantity;
  v_fee := v_total * 0.15;
  
  RETURN QUERY SELECT v_fee, v_total - v_fee;
END;
$$;

CREATE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER initialize_user_stats_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_stats();

CREATE TRIGGER initialize_user_ad_state_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_ad_state();

CREATE TRIGGER update_ticket_inventory_trigger
  AFTER INSERT ON public.ticket_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ticket_inventory();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();