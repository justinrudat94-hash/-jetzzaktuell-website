/*
  # Create notification cleanup cron job

  1. Function Created
    - `cleanup_old_notifications()` - Deletes old read and unread notifications

  2. Cleanup Rules
    - Read notifications: Deleted after 30 days
    - Unread notifications: Deleted after 90 days
    - Runs daily at 3:00 AM UTC

  3. Important Notes
    - Uses pg_cron extension (must be enabled)
    - Prevents notification table from growing indefinitely
    - Returns count of deleted notifications for monitoring
    - Non-blocking, runs asynchronously
*/

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function: Cleanup old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS TABLE(deleted_read integer, deleted_unread integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  count_read integer;
  count_unread integer;
BEGIN
  -- Delete read notifications older than 30 days
  WITH deleted_read_rows AS (
    DELETE FROM in_app_notifications
    WHERE is_read = true
    AND created_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO count_read FROM deleted_read_rows;
  
  -- Delete unread notifications older than 90 days
  WITH deleted_unread_rows AS (
    DELETE FROM in_app_notifications
    WHERE is_read = false
    AND created_at < NOW() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO count_unread FROM deleted_unread_rows;
  
  -- Log cleanup results
  RAISE NOTICE 'Notification cleanup complete: % read, % unread deleted', count_read, count_unread;
  
  RETURN QUERY SELECT count_read, count_unread;
END;
$$;

-- Schedule cleanup job to run daily at 3:00 AM UTC
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 3 * * *',
  $$SELECT cleanup_old_notifications()$$
);

COMMENT ON FUNCTION cleanup_old_notifications IS 'Deletes read notifications after 30 days and unread after 90 days';
