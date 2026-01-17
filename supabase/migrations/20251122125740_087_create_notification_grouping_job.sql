/*
  # Create notification grouping cron job

  1. Function Created
    - `group_similar_notifications()` - Groups similar notifications for better UX
    
  2. Grouping Rules
    - Groups notifications by: user_id + notification_type + target_id
    - Only groups: new_follower, event_liked
    - Time window: Last 5 minutes
    - Minimum 2 notifications to group
    
  3. Grouping Logic
    - 2-3 users: "Max, Lisa und Tom haben geliked"
    - 4+ users: "Max und 3 andere haben geliked"
    
  4. Cron Schedule
    - Runs every 5 minutes
    - Uses pg_cron extension
    
  5. Important Notes
    - Keeps oldest notification, deletes others
    - Updates message to show grouped users
    - Atomic operation (transaction)
*/

-- Function: Group similar notifications
CREATE OR REPLACE FUNCTION group_similar_notifications()
RETURNS TABLE(grouped_count integer, deleted_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_grouped integer := 0;
  total_deleted integer := 0;
  group_record record;
  actor_names text[];
  new_message text;
  keep_notification_id uuid;
  delete_ids uuid[];
BEGIN
  -- Find groups of similar notifications (2+ notifications)
  FOR group_record IN
    SELECT 
      user_id,
      notification_type,
      target_id,
      COUNT(*) as notification_count,
      array_agg(id ORDER BY created_at ASC) as notification_ids,
      array_agg(actor_id ORDER BY created_at ASC) as actor_ids
    FROM in_app_notifications
    WHERE 
      notification_type IN ('new_follower', 'event_liked')
      AND created_at > NOW() - INTERVAL '5 minutes'
      AND is_read = false
    GROUP BY user_id, notification_type, target_id
    HAVING COUNT(*) >= 2
  LOOP
    -- Get the first notification to keep
    keep_notification_id := group_record.notification_ids[1];
    
    -- Get IDs to delete (all except first)
    delete_ids := group_record.notification_ids[2:array_length(group_record.notification_ids, 1)];
    
    -- Get actor usernames
    SELECT array_agg(username ORDER BY idx)
    INTO actor_names
    FROM (
      SELECT DISTINCT ON (p.id) p.username, idx
      FROM unnest(group_record.actor_ids) WITH ORDINALITY AS t(actor_id, idx)
      JOIN profiles p ON p.id = t.actor_id
      ORDER BY p.id, idx
    ) sub;
    
    -- Build grouped message
    IF group_record.notification_count = 2 THEN
      -- "Max und Lisa"
      new_message := actor_names[1] || ' und ' || actor_names[2];
    ELSIF group_record.notification_count = 3 THEN
      -- "Max, Lisa und Tom"
      new_message := actor_names[1] || ', ' || actor_names[2] || ' und ' || actor_names[3];
    ELSE
      -- "Max und 3 andere"
      new_message := actor_names[1] || ' und ' || (group_record.notification_count - 1)::text || ' andere';
    END IF;
    
    -- Add action text
    IF group_record.notification_type = 'new_follower' THEN
      new_message := new_message || ' folgen dir jetzt';
    ELSIF group_record.notification_type = 'event_liked' THEN
      new_message := new_message || ' haben dein Event geliked';
    END IF;
    
    -- Update the kept notification
    UPDATE in_app_notifications
    SET 
      message = new_message,
      data = data || jsonb_build_object('count', group_record.notification_count)
    WHERE id = keep_notification_id;
    
    -- Delete the other notifications
    DELETE FROM in_app_notifications
    WHERE id = ANY(delete_ids);
    
    total_grouped := total_grouped + 1;
    total_deleted := total_deleted + array_length(delete_ids, 1);
    
    RAISE NOTICE 'Grouped % notifications for user % (type: %)', 
      group_record.notification_count, 
      group_record.user_id, 
      group_record.notification_type;
  END LOOP;
  
  RETURN QUERY SELECT total_grouped, total_deleted;
END;
$$;

-- Schedule grouping job to run every 5 minutes
SELECT cron.schedule(
  'group-similar-notifications',
  '*/5 * * * *',
  $$SELECT group_similar_notifications()$$
);

COMMENT ON FUNCTION group_similar_notifications IS 'Groups similar notifications (new_follower, event_liked) for better UX - runs every 5 minutes';
