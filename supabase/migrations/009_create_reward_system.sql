/*
  # JETZZ Creator Reward & Monetization System

  ## Phase 1: Gamification System (Active)

  This migration creates the foundation for a complete creator reward system.

  ### New Tables

  1. **likes**
     - Tracks all likes (events, users, livestreams)
     - Prevents duplicate likes
     - Timestamped for analytics

  2. **reward_transactions**
     - Audit log for all coin movements
     - Tracks reason and metadata
     - Enables reward history and debugging

  3. **user_stats**
     - Aggregated statistics per user
     - Total coins, likes received, events created
     - Creator level and XP
     - Optimized for quick profile queries

  4. **creator_levels**
     - Defines level requirements and benefits
     - Extensible for future perks

  5. **payout_requests** (Prepared for Phase 2)
     - Ready for real money withdrawals
     - Currently unused, will be activated in Phase 2

  ### Reward Rules (Phase 1)

  - +1 coin per like received
  - +5 coins for joining an event
  - +10 coins for creating an event
  - +20 coins for hosting a livestream
  - +50 bonus coins for milestone achievements

  ### Security

  - RLS enabled on all tables
  - Users can only like once per item
  - Coin transactions are append-only (no deletions)
  - Creator levels are read-only for users

  ### Scalability

  - Indexed for fast queries
  - Aggregated stats prevent slow counts
  - Triggers auto-update stats in real-time
*/

-- ============================================================================
-- 1. LIKES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('event', 'user', 'livestream')),
  target_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes"
  ON likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own likes"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS likes_user_id_idx ON likes(user_id);
CREATE INDEX IF NOT EXISTS likes_target_idx ON likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS likes_created_at_idx ON likes(created_at DESC);

-- ============================================================================
-- 2. REWARD TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS reward_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON reward_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS reward_transactions_user_id_idx ON reward_transactions(user_id);
CREATE INDEX IF NOT EXISTS reward_transactions_created_at_idx ON reward_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS reward_transactions_reason_idx ON reward_transactions(reason);

-- ============================================================================
-- 3. USER STATS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_stats (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_coins integer DEFAULT 0,
  total_likes_received integer DEFAULT 0,
  total_likes_given integer DEFAULT 0,
  total_events_created integer DEFAULT 0,
  total_events_joined integer DEFAULT 0,
  total_livestreams integer DEFAULT 0,
  total_followers integer DEFAULT 0,
  creator_level text DEFAULT 'Starter',
  xp_points integer DEFAULT 0,
  last_active_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all stats"
  ON user_stats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_stats_coins_idx ON user_stats(total_coins DESC);
CREATE INDEX IF NOT EXISTS user_stats_level_idx ON user_stats(creator_level);
CREATE INDEX IF NOT EXISTS user_stats_xp_idx ON user_stats(xp_points DESC);

-- ============================================================================
-- 4. CREATOR LEVELS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS creator_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_name text UNIQUE NOT NULL,
  min_likes integer NOT NULL,
  min_events integer DEFAULT 0,
  min_livestreams integer DEFAULT 0,
  benefits jsonb DEFAULT '{}',
  display_order integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE creator_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view creator levels"
  ON creator_levels FOR SELECT
  TO authenticated
  USING (true);

-- Insert default creator levels
INSERT INTO creator_levels (level_name, min_likes, min_events, min_livestreams, benefits, display_order)
VALUES
  ('Starter', 0, 0, 0, '{"description": "Basic visibility", "coin_multiplier": 1.0}', 1),
  ('Pro', 500, 3, 0, '{"description": "Boosted discoverability", "coin_multiplier": 1.2}', 2),
  ('Elite', 5000, 10, 5, '{"description": "Eligible for payouts", "coin_multiplier": 1.5}', 3),
  ('Partner', 10000, 20, 10, '{"description": "Access to brand deals & advanced tools", "coin_multiplier": 2.0}', 4)
ON CONFLICT (level_name) DO NOTHING;

-- ============================================================================
-- 5. PAYOUT REQUESTS TABLE (Phase 2 - Prepared but inactive)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_coins integer NOT NULL,
  amount_currency decimal(10,2) NOT NULL,
  currency text DEFAULT 'EUR',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  payment_method text,
  payment_details jsonb DEFAULT '{}',
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payout requests"
  ON payout_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payout requests"
  ON payout_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Initialize user stats on profile creation
CREATE OR REPLACE FUNCTION initialize_user_stats()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_stats();

-- Function: Award coins when receiving a like
CREATE OR REPLACE FUNCTION award_like_coins()
RETURNS trigger AS $$
DECLARE
  target_user_id uuid;
  coin_amount integer := 1;
  level_multiplier decimal := 1.0;
BEGIN
  -- Determine who receives the coins based on target type
  IF NEW.target_type = 'event' THEN
    SELECT creator_id INTO target_user_id FROM events WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'user' THEN
    target_user_id := NEW.target_id;
  ELSIF NEW.target_type = 'livestream' THEN
    -- Future: get host_id from livestreams table
    target_user_id := NEW.target_id;
  END IF;

  -- Skip if target user not found or user liked themselves
  IF target_user_id IS NULL OR target_user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get user's level multiplier
  SELECT COALESCE((us.creator_level), 1.0) INTO level_multiplier
  FROM user_stats us
  WHERE us.user_id = target_user_id;

  coin_amount := FLOOR(coin_amount * level_multiplier);

  -- Award coins
  INSERT INTO reward_transactions (user_id, amount, reason, metadata)
  VALUES (
    target_user_id,
    coin_amount,
    'like_received',
    jsonb_build_object(
      'from_user_id', NEW.user_id,
      'target_type', NEW.target_type,
      'target_id', NEW.target_id
    )
  );

  -- Update user stats
  UPDATE user_stats
  SET
    total_coins = total_coins + coin_amount,
    total_likes_received = total_likes_received + 1,
    updated_at = now()
  WHERE user_id = target_user_id;

  -- Update like giver stats
  UPDATE user_stats
  SET
    total_likes_given = total_likes_given + 1,
    updated_at = now()
  WHERE user_id = NEW.user_id;

  -- Check for milestone bonuses (every 100 likes)
  PERFORM award_milestone_bonus(target_user_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_created ON likes;
CREATE TRIGGER on_like_created
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION award_like_coins();

-- Function: Remove coins when unlike happens
CREATE OR REPLACE FUNCTION remove_like_coins()
RETURNS trigger AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Determine who loses the coins
  IF OLD.target_type = 'event' THEN
    SELECT creator_id INTO target_user_id FROM events WHERE id = OLD.target_id;
  ELSIF OLD.target_type = 'user' THEN
    target_user_id := OLD.target_id;
  ELSIF OLD.target_type = 'livestream' THEN
    target_user_id := OLD.target_id;
  END IF;

  IF target_user_id IS NULL OR target_user_id = OLD.user_id THEN
    RETURN OLD;
  END IF;

  -- Remove coins (negative transaction)
  INSERT INTO reward_transactions (user_id, amount, reason, metadata)
  VALUES (
    target_user_id,
    -1,
    'like_removed',
    jsonb_build_object(
      'from_user_id', OLD.user_id,
      'target_type', OLD.target_type,
      'target_id', OLD.target_id
    )
  );

  -- Update user stats
  UPDATE user_stats
  SET
    total_coins = GREATEST(total_coins - 1, 0),
    total_likes_received = GREATEST(total_likes_received - 1, 0),
    updated_at = now()
  WHERE user_id = target_user_id;

  -- Update like giver stats
  UPDATE user_stats
  SET
    total_likes_given = GREATEST(total_likes_given - 1, 0),
    updated_at = now()
  WHERE user_id = OLD.user_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_deleted ON likes;
CREATE TRIGGER on_like_deleted
  AFTER DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION remove_like_coins();

-- Function: Award milestone bonuses
CREATE OR REPLACE FUNCTION award_milestone_bonus(target_user_id uuid)
RETURNS void AS $$
DECLARE
  current_likes integer;
  last_milestone integer;
BEGIN
  SELECT total_likes_received INTO current_likes
  FROM user_stats
  WHERE user_id = target_user_id;

  -- Award bonus every 100 likes
  IF current_likes % 100 = 0 AND current_likes > 0 THEN
    INSERT INTO reward_transactions (user_id, amount, reason, metadata)
    VALUES (
      target_user_id,
      50,
      'milestone_bonus',
      jsonb_build_object('likes_milestone', current_likes)
    );

    UPDATE user_stats
    SET
      total_coins = total_coins + 50,
      updated_at = now()
    WHERE user_id = target_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update creator level based on stats
CREATE OR REPLACE FUNCTION update_creator_level()
RETURNS trigger AS $$
DECLARE
  new_level text;
BEGIN
  -- Determine appropriate level
  SELECT level_name INTO new_level
  FROM creator_levels
  WHERE
    NEW.total_likes_received >= min_likes
    AND NEW.total_events_created >= min_events
    AND NEW.total_livestreams >= min_livestreams
  ORDER BY display_order DESC
  LIMIT 1;

  IF new_level IS NOT NULL AND new_level != OLD.creator_level THEN
    NEW.creator_level := new_level;

    -- Award level-up bonus
    INSERT INTO reward_transactions (user_id, amount, reason, metadata)
    VALUES (
      NEW.user_id,
      100,
      'level_up',
      jsonb_build_object('new_level', new_level, 'old_level', OLD.creator_level)
    );

    NEW.total_coins := NEW.total_coins + 100;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_stats_update ON user_stats;
CREATE TRIGGER on_stats_update
  BEFORE UPDATE ON user_stats
  FOR EACH ROW
  WHEN (
    OLD.total_likes_received != NEW.total_likes_received
    OR OLD.total_events_created != NEW.total_events_created
    OR OLD.total_livestreams != NEW.total_livestreams
  )
  EXECUTE FUNCTION update_creator_level();

-- ============================================================================
-- 7. HELPER FUNCTIONS FOR SERVICES
-- ============================================================================

-- Function: Award coins for action
CREATE OR REPLACE FUNCTION award_coins(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO reward_transactions (user_id, amount, reason, metadata)
  VALUES (p_user_id, p_amount, p_reason, p_metadata);

  UPDATE user_stats
  SET
    total_coins = total_coins + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user rank by coins
CREATE OR REPLACE FUNCTION get_user_rank(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  user_rank integer;
BEGIN
  SELECT COUNT(*) + 1 INTO user_rank
  FROM user_stats
  WHERE total_coins > (
    SELECT total_coins FROM user_stats WHERE user_id = p_user_id
  );

  RETURN user_rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
