/*
  # Create User Account Deletion Function

  1. Function
    - `delete_user_account()` - Securely deletes the authenticated user's account
    - Removes all user data from related tables
    - Finally deletes the auth.users record
    - Can only be called by the user themselves
  
  2. Security
    - Function checks that the caller is authenticated
    - Only deletes the caller's own data (auth.uid())
    - Uses CASCADE deletes where appropriate
  
  3. Deleted Data
    - Profile and all personal information
    - All events created by the user
    - All likes, comments, and participations
    - All follower/following relationships
    - Reports created by or about the user
    - Rewards and transactions
    - Finally, the auth.users record
*/

-- Create function to delete user account
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_uuid uuid;
BEGIN
  -- Get the current user's ID
  user_uuid := auth.uid();
  
  -- Check if user is authenticated
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete all user data in correct order (respecting foreign keys)
  
  -- Delete user's likes
  DELETE FROM likes WHERE user_id = user_uuid;
  
  -- Delete user's comments
  DELETE FROM comments WHERE user_id = user_uuid;
  
  -- Delete user's participations
  DELETE FROM participations WHERE user_id = user_uuid;
  
  -- Delete reports about the user or created by the user
  DELETE FROM reports WHERE reported_user_id = user_uuid OR reporter_id = user_uuid;
  
  -- Delete user's follower relationships
  DELETE FROM followers WHERE follower_id = user_uuid OR following_id = user_uuid;
  
  -- Delete user's rewards and transactions
  DELETE FROM reward_transactions WHERE user_id = user_uuid;
  
  -- Delete user's live chat messages
  DELETE FROM live_chat_messages WHERE user_id = user_uuid;
  
  -- Delete user's tickets
  DELETE FROM tickets WHERE user_id = user_uuid;
  
  -- Delete user's moderation queue entries
  DELETE FROM moderation_queue WHERE user_id = user_uuid;
  
  -- Delete user's events (this should cascade to related data)
  DELETE FROM events WHERE creator_id = user_uuid;
  
  -- Delete user's profile
  DELETE FROM profiles WHERE id = user_uuid;
  
  -- Delete the auth.users record (this will cascade to other auth-related tables)
  DELETE FROM auth.users WHERE id = user_uuid;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION delete_user_account() IS 'Securely deletes the authenticated user''s account and all related data. Can only be called by the user themselves.';