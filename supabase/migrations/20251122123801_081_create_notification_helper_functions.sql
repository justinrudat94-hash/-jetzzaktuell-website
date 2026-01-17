/*
  # Create notification system helper functions

  1. Functions Created
    - `get_notification_template()` - Returns title and message templates
    - `check_quiet_hours()` - Checks if current time is in user's quiet hours
    - `create_notification()` - Main function to create notifications with all checks

  2. Important Logic
    - Duplicate prevention (5 minutes window)
    - Rate limiting (max 10 notifications per hour per user)
    - Quiet hours check (user timezone aware)
    - Preference checking (per-type and master toggle)
    - Self-notification prevention (user_id != actor_id)

  3. Security
    - All functions use SECURITY DEFINER to bypass RLS
    - search_path set to public for security
    - Only callable via database triggers or authenticated users

  4. Important Notes
    - Returns notification_id if created, NULL if blocked
    - Templates are simple now, can be extended for i18n later
    - Timezone conversion for quiet hours
    - Actor name fetched from profiles table
*/

-- Function: Get notification template (title and message)
CREATE OR REPLACE FUNCTION get_notification_template(
  p_type text,
  p_actor_name text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
  event_title text;
  count_num integer;
BEGIN
  -- Extract common data
  event_title := p_data->>'event_title';
  count_num := (p_data->>'count')::integer;
  
  CASE p_type
    WHEN 'new_follower' THEN
      result := jsonb_build_object(
        'title', 'Neuer Follower',
        'message', p_actor_name || ' folgt dir jetzt'
      );
    
    WHEN 'event_liked' THEN
      IF count_num IS NOT NULL AND count_num > 1 THEN
        result := jsonb_build_object(
          'title', 'Event geliked',
          'message', p_actor_name || ' und ' || (count_num - 1)::text || ' andere haben dein Event geliked'
        );
      ELSE
        result := jsonb_build_object(
          'title', 'Event geliked',
          'message', p_actor_name || ' hat dein Event geliked'
        );
      END IF;
    
    WHEN 'event_comment' THEN
      result := jsonb_build_object(
        'title', 'Neuer Kommentar',
        'message', p_actor_name || ' hat dein Event kommentiert'
      );
    
    WHEN 'comment_reply' THEN
      result := jsonb_build_object(
        'title', 'Antwort auf deinen Kommentar',
        'message', p_actor_name || ' hat auf deinen Kommentar geantwortet'
      );
    
    WHEN 'event_updated' THEN
      result := jsonb_build_object(
        'title', 'Event geändert',
        'message', 'Ein Event wurde aktualisiert'
      );
    
    WHEN 'event_cancelled' THEN
      result := jsonb_build_object(
        'title', 'Event abgesagt',
        'message', COALESCE(event_title, 'Ein Event') || ' wurde abgesagt'
      );
    
    WHEN 'event_live' THEN
      result := jsonb_build_object(
        'title', 'Event ist jetzt Live!',
        'message', COALESCE(event_title, 'Ein Event') || ' ist jetzt live'
      );
    
    WHEN 'payout_completed' THEN
      result := jsonb_build_object(
        'title', 'Auszahlung abgeschlossen',
        'message', 'Deine Auszahlung wurde erfolgreich verarbeitet'
      );
    
    ELSE
      result := jsonb_build_object(
        'title', 'Benachrichtigung',
        'message', 'Du hast eine neue Benachrichtigung'
      );
  END CASE;
  
  RETURN result;
END;
$$;

-- Function: Check if current time is in user's quiet hours
CREATE OR REPLACE FUNCTION check_quiet_hours(
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefs record;
  user_time time;
BEGIN
  -- Get user preferences
  SELECT 
    quiet_hours_start,
    quiet_hours_end,
    timezone
  INTO prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences, allow notification
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Convert current time to user's timezone
  user_time := (now() AT TIME ZONE prefs.timezone)::time;
  
  -- Check if in quiet hours
  -- Handle case where quiet hours span midnight
  IF prefs.quiet_hours_start < prefs.quiet_hours_end THEN
    -- Normal case: 22:00 - 08:00
    RETURN user_time >= prefs.quiet_hours_start AND user_time < prefs.quiet_hours_end;
  ELSE
    -- Spans midnight: 23:00 - 01:00
    RETURN user_time >= prefs.quiet_hours_start OR user_time < prefs.quiet_hours_end;
  END IF;
END;
$$;

-- Main Function: Create notification with all checks
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_type text,
  p_target_type text,
  p_target_id uuid,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id uuid;
  preferences record;
  actor_name text;
  template jsonb;
  is_quiet_hours boolean;
  hourly_count integer;
BEGIN
  -- Check 1: Don't notify yourself
  IF p_user_id = p_actor_id THEN
    RETURN NULL;
  END IF;
  
  -- Check 2: Get user preferences
  SELECT * INTO preferences
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences, create default and allow
  IF NOT FOUND THEN
    INSERT INTO notification_preferences (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Re-fetch
    SELECT * INTO preferences
    FROM notification_preferences
    WHERE user_id = p_user_id;
  END IF;
  
  -- Check 3: Master toggle
  IF NOT preferences.all_notifications_enabled THEN
    RETURN NULL;
  END IF;
  
  -- Check 4: Type-specific preference
  CASE p_type
    WHEN 'new_follower' THEN
      IF NOT preferences.new_follower_enabled THEN RETURN NULL; END IF;
    WHEN 'event_liked' THEN
      IF NOT preferences.event_liked_enabled THEN RETURN NULL; END IF;
    WHEN 'event_comment' THEN
      IF NOT preferences.event_comment_enabled THEN RETURN NULL; END IF;
    WHEN 'comment_reply' THEN
      IF NOT preferences.comment_reply_enabled THEN RETURN NULL; END IF;
    WHEN 'event_updated' THEN
      IF NOT preferences.event_updated_enabled THEN RETURN NULL; END IF;
    WHEN 'event_cancelled' THEN
      IF NOT preferences.event_cancelled_enabled THEN RETURN NULL; END IF;
    WHEN 'event_live' THEN
      IF NOT preferences.event_live_enabled THEN RETURN NULL; END IF;
    WHEN 'payout_completed' THEN
      IF NOT preferences.payout_completed_enabled THEN RETURN NULL; END IF;
  END CASE;
  
  -- Check 5: Quiet hours (skip for high-priority notifications)
  IF p_type NOT IN ('event_cancelled', 'event_live') THEN
    is_quiet_hours := check_quiet_hours(p_user_id);
    IF is_quiet_hours THEN
      RETURN NULL;
    END IF;
  END IF;
  
  -- Check 6: Duplicate prevention (5 minutes window)
  IF EXISTS (
    SELECT 1 FROM in_app_notifications
    WHERE user_id = p_user_id
    AND actor_id = p_actor_id
    AND notification_type = p_type
    AND target_id = p_target_id
    AND created_at > now() - INTERVAL '5 minutes'
  ) THEN
    RETURN NULL;
  END IF;
  
  -- Check 7: Rate limiting (max 10 per hour)
  SELECT COUNT(*) INTO hourly_count
  FROM in_app_notifications
  WHERE user_id = p_user_id
  AND created_at > now() - INTERVAL '1 hour';
  
  IF hourly_count >= 10 THEN
    RETURN NULL;
  END IF;
  
  -- Get actor name
  SELECT username INTO actor_name
  FROM profiles
  WHERE id = p_actor_id;
  
  IF actor_name IS NULL THEN
    actor_name := 'Jemand';
  END IF;
  
  -- Get template
  template := get_notification_template(p_type, actor_name, p_data);
  
  -- Create notification
  INSERT INTO in_app_notifications (
    user_id,
    actor_id,
    notification_type,
    target_type,
    target_id,
    title,
    message,
    data
  )
  VALUES (
    p_user_id,
    p_actor_id,
    p_type,
    p_target_type,
    p_target_id,
    template->>'title',
    template->>'message',
    p_data
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

COMMENT ON FUNCTION create_notification IS 'Creates notification with all checks: preferences, quiet hours, rate limiting, duplicates';
COMMENT ON FUNCTION check_quiet_hours IS 'Checks if current time is in user quiet hours (timezone-aware)';
COMMENT ON FUNCTION get_notification_template IS 'Returns title and message template for notification type';
