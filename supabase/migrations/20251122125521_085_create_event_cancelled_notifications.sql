/*
  # Create event-cancelled notification system

  1. Trigger Function Created
    - `notify_event_cancelled()` - Notifies all affected users when event is cancelled
    
  2. Affected Users
    - Event likers (from likes table)
    - Event participants (from event_participants table)
    - Creator's followers
    
  3. Important Logic
    - Only triggers when `is_cancelled` changes from false to true
    - HIGH PRIORITY: Ignores quiet hours (handled by notification type)
    - Batch notification creation for efficiency
    
  4. Security
    - SECURITY DEFINER function
    - Bypasses RLS for notification creation
    
  5. Important Notes
    - This is a HIGH PRIORITY notification
    - Will be sent even during quiet hours
    - Uses XCircle icon and red color in UI
*/

-- Trigger Function: Event Cancelled
CREATE OR REPLACE FUNCTION notify_event_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_users uuid[];
  user_id_rec uuid;
BEGIN
  -- Only trigger if event was just cancelled
  IF NEW.is_cancelled = true AND (OLD.is_cancelled IS NULL OR OLD.is_cancelled = false) THEN
    
    -- Collect all affected users
    WITH all_affected AS (
      -- Event likers
      SELECT DISTINCT user_id
      FROM likes
      WHERE target_type = 'event'
      AND target_id = NEW.id
      AND user_id != NEW.creator_id
      
      UNION
      
      -- Event participants
      SELECT DISTINCT user_id
      FROM event_participants
      WHERE event_id = NEW.id
      AND user_id != NEW.creator_id
      
      UNION
      
      -- Creator's followers
      SELECT DISTINCT follower_id as user_id
      FROM followers
      WHERE following_id = NEW.creator_id
      AND follower_id != NEW.creator_id
    )
    SELECT array_agg(user_id) INTO affected_users
    FROM all_affected;
    
    -- If there are affected users, create notifications
    IF affected_users IS NOT NULL AND array_length(affected_users, 1) > 0 THEN
      
      -- Create notification for each affected user
      FOREACH user_id_rec IN ARRAY affected_users
      LOOP
        -- Use create_notification function which handles preferences
        -- event_cancelled is HIGH PRIORITY so it ignores quiet hours
        PERFORM create_notification(
          p_user_id := user_id_rec,
          p_actor_id := NEW.creator_id,
          p_type := 'event_cancelled',
          p_target_type := 'event',
          p_target_id := NEW.id,
          p_data := jsonb_build_object('event_title', NEW.title)
        );
      END LOOP;
      
      RAISE NOTICE 'Event cancelled: Notified % users for event %', array_length(affected_users, 1), NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on events table
DROP TRIGGER IF EXISTS on_event_cancelled ON events;
CREATE TRIGGER on_event_cancelled
  AFTER UPDATE ON events
  FOR EACH ROW
  WHEN (NEW.is_cancelled = true AND (OLD.is_cancelled IS NULL OR OLD.is_cancelled = false))
  EXECUTE FUNCTION notify_event_cancelled();

COMMENT ON FUNCTION notify_event_cancelled IS 'HIGH PRIORITY: Notifies all affected users when event is cancelled (ignores quiet hours)';
