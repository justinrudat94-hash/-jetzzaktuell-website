/*
  # Update to Follower-Based Level System
  
  Changes the reward system from likes to followers for level progression.
  
  1. Changes
    - Remove coin rewards from likes (likes only track stats now)
    - Add total_followers column if missing
    - Update creator levels to use follower counts
    - New levels: Starter (0), Elite (100), Partner (500)
  
  2. Coin Multipliers
    - Starter: 1.0x
    - Elite: 1.2x
    - Partner: 1.5x
  
  3. What Awards Coins
    - Event creation: +10 coins
    - Livestreams: +20 coins
    - Level up: +100 coins
    - NO MORE coins from likes
*/

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO user_stats
-- ============================================================================

DO $$
BEGIN
  -- Add total_followers if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' AND column_name = 'total_followers'
  ) THEN
    ALTER TABLE user_stats ADD COLUMN total_followers integer DEFAULT 0;
  END IF;

  -- Add other missing columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' AND column_name = 'total_likes_given'
  ) THEN
    ALTER TABLE user_stats ADD COLUMN total_likes_given integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' AND column_name = 'total_events_joined'
  ) THEN
    ALTER TABLE user_stats ADD COLUMN total_events_joined integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' AND column_name = 'xp_points'
  ) THEN
    ALTER TABLE user_stats ADD COLUMN xp_points integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' AND column_name = 'last_active_at'
  ) THEN
    ALTER TABLE user_stats ADD COLUMN last_active_at timestamptz DEFAULT now();
  END IF;
END $$;

-- ============================================================================
-- 2. DROP OLD LIKE-COIN TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS on_like_created ON likes;
DROP TRIGGER IF EXISTS on_like_deleted ON likes;
DROP FUNCTION IF EXISTS award_like_coins();
DROP FUNCTION IF EXISTS remove_like_coins();
DROP FUNCTION IF EXISTS award_milestone_bonus(uuid);

-- ============================================================================
-- 3. UPDATE CREATOR LEVELS
-- ============================================================================

DELETE FROM creator_levels;

INSERT INTO creator_levels (level_name, min_likes, min_events, min_livestreams, benefits)
VALUES
  ('Starter', 0, 0, 0, '{"description": "Beginne deine Creator Journey", "coin_multiplier": 1.0, "min_followers": 0}'::jsonb),
  ('Elite', 0, 0, 0, '{"description": "Erhöhte Sichtbarkeit & Coins", "coin_multiplier": 1.2, "min_followers": 100}'::jsonb),
  ('Partner', 0, 0, 0, '{"description": "Top Creator mit Premium Features", "coin_multiplier": 1.5, "min_followers": 500}'::jsonb);

-- ============================================================================
-- 4. UPDATE LEVEL TRIGGER TO USE FOLLOWERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_creator_level_by_followers()
RETURNS trigger AS $$
DECLARE
  new_level text;
  old_level text;
BEGIN
  old_level := OLD.creator_level;

  -- Determine level by followers
  IF NEW.total_followers >= 500 THEN
    new_level := 'Partner';
  ELSIF NEW.total_followers >= 100 THEN
    new_level := 'Elite';
  ELSE
    new_level := 'Starter';
  END IF;

  -- Award bonus if leveled up
  IF new_level != old_level THEN
    NEW.creator_level := new_level;

    INSERT INTO reward_transactions (user_id, amount, reason, metadata)
    VALUES (
      NEW.user_id,
      100,
      'level_up',
      jsonb_build_object('new_level', new_level, 'old_level', old_level)
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
  WHEN (OLD.total_followers IS DISTINCT FROM NEW.total_followers)
  EXECUTE FUNCTION update_creator_level_by_followers();

-- ============================================================================
-- 5. LIKES TRACK STATS ONLY (NO COINS)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_like_stats_only()
RETURNS trigger AS $$
DECLARE
  target_user_id uuid;
BEGIN
  IF NEW.target_type = 'event' THEN
    SELECT creator_id INTO target_user_id FROM events WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'user' THEN
    target_user_id := NEW.target_id;
  END IF;

  IF target_user_id IS NULL OR target_user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  UPDATE user_stats
  SET
    total_likes_received = total_likes_received + 1,
    updated_at = now()
  WHERE user_id = target_user_id;

  UPDATE user_stats
  SET
    total_likes_given = total_likes_given + 1,
    updated_at = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_created_stats_only
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_like_stats_only();

CREATE OR REPLACE FUNCTION update_unlike_stats_only()
RETURNS trigger AS $$
DECLARE
  target_user_id uuid;
BEGIN
  IF OLD.target_type = 'event' THEN
    SELECT creator_id INTO target_user_id FROM events WHERE id = OLD.target_id;
  ELSIF OLD.target_type = 'user' THEN
    target_user_id := OLD.target_id;
  END IF;

  IF target_user_id IS NULL OR target_user_id = OLD.user_id THEN
    RETURN OLD;
  END IF;

  UPDATE user_stats
  SET
    total_likes_received = GREATEST(total_likes_received - 1, 0),
    updated_at = now()
  WHERE user_id = target_user_id;

  UPDATE user_stats
  SET
    total_likes_given = GREATEST(total_likes_given - 1, 0),
    updated_at = now()
  WHERE user_id = OLD.user_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_deleted_stats_only
  AFTER DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_unlike_stats_only();

-- ============================================================================
-- 6. SYNC EXISTING FOLLOWER COUNTS
-- ============================================================================

-- Update follower counts from followers table
UPDATE user_stats us
SET total_followers = (
  SELECT COUNT(*) 
  FROM followers f 
  WHERE f.following_id = us.user_id
);
