/*
  # Create notification triggers for MVP types

  1. Triggers Created
    - `on_new_follower` - Notifies when someone follows a user
    - `on_event_liked` - Notifies event creator when event is liked
    - `on_event_comment` - Notifies on new comment or reply
    
  2. Logic
    - new_follower: Follower → Following (you have a new follower)
    - event_liked: Liker → Event Creator (your event was liked)
    - event_comment: Commenter → Event Creator (your event got a comment)
    - comment_reply: Replier → Parent Comment Author (someone replied to your comment)

  3. Important Notes
    - All triggers use create_notification() which handles all checks
    - Triggers only fire AFTER successful INSERT
    - No notification if actor = recipient (handled in create_notification)
    - All checks (preferences, quiet hours, rate limiting) in create_notification()
*/

-- Trigger Function: New Follower
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify the user being followed
  PERFORM create_notification(
    p_user_id := NEW.following_id,    -- User being followed (recipient)
    p_actor_id := NEW.follower_id,    -- User who followed (actor)
    p_type := 'new_follower',
    p_target_type := 'user',
    p_target_id := NEW.follower_id,
    p_data := '{}'::jsonb
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on followers table
DROP TRIGGER IF EXISTS on_new_follower ON followers;
CREATE TRIGGER on_new_follower
  AFTER INSERT ON followers
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_follower();

-- Trigger Function: Event Liked
CREATE OR REPLACE FUNCTION notify_event_liked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_creator_id uuid;
  event_title text;
BEGIN
  -- Only process if target is an event
  IF NEW.target_type != 'event' THEN
    RETURN NEW;
  END IF;
  
  -- Get event creator and title
  SELECT creator_id, title INTO event_creator_id, event_title
  FROM events
  WHERE id = NEW.target_id;
  
  -- If event not found, skip
  IF event_creator_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Notify event creator
  PERFORM create_notification(
    p_user_id := event_creator_id,
    p_actor_id := NEW.user_id,
    p_type := 'event_liked',
    p_target_type := 'event',
    p_target_id := NEW.target_id,
    p_data := jsonb_build_object('event_title', event_title)
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on likes table
DROP TRIGGER IF EXISTS on_event_liked ON likes;
CREATE TRIGGER on_event_liked
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_event_liked();

-- Trigger Function: Event Comment and Comment Reply
CREATE OR REPLACE FUNCTION notify_event_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_creator_id uuid;
  parent_author_id uuid;
  event_title text;
BEGIN
  -- Case 1: Reply to existing comment (comment_reply)
  IF NEW.parent_comment_id IS NOT NULL THEN
    -- Get parent comment author
    SELECT user_id INTO parent_author_id
    FROM comments
    WHERE id = NEW.parent_comment_id;
    
    -- Notify parent comment author
    IF parent_author_id IS NOT NULL THEN
      PERFORM create_notification(
        p_user_id := parent_author_id,
        p_actor_id := NEW.user_id,
        p_type := 'comment_reply',
        p_target_type := 'comment',
        p_target_id := NEW.id,
        p_data := jsonb_build_object('comment_preview', LEFT(NEW.content, 100))
      );
    END IF;
  
  -- Case 2: New comment on event (event_comment)
  ELSE
    -- Get event creator and title
    SELECT creator_id, title INTO event_creator_id, event_title
    FROM events
    WHERE id = NEW.event_id;
    
    -- Notify event creator
    IF event_creator_id IS NOT NULL THEN
      PERFORM create_notification(
        p_user_id := event_creator_id,
        p_actor_id := NEW.user_id,
        p_type := 'event_comment',
        p_target_type := 'event',
        p_target_id := NEW.event_id,
        p_data := jsonb_build_object(
          'comment_id', NEW.id,
          'event_title', event_title,
          'comment_preview', LEFT(NEW.content, 100)
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on comments table
DROP TRIGGER IF EXISTS on_event_comment ON comments;
CREATE TRIGGER on_event_comment
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_event_comment();

COMMENT ON FUNCTION notify_new_follower IS 'Trigger: Notifies user when someone follows them';
COMMENT ON FUNCTION notify_event_liked IS 'Trigger: Notifies event creator when event is liked';
COMMENT ON FUNCTION notify_event_comment IS 'Trigger: Notifies on new comment or reply';
