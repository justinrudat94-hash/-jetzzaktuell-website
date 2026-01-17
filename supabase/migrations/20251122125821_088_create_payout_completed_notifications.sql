/*
  # Create payout-completed notification system

  1. Trigger Function Created
    - `notify_payout_completed()` - Notifies user when payout is completed
    
  2. Trigger Logic
    - Only triggers when status changes to 'paid' or 'completed'
    - Sends to payout recipient (user_id)
    
  3. Important Notes
    - Shows amount in notification
    - Coins icon in UI
    - Normal priority (respects quiet hours)
    
  4. Security
    - SECURITY DEFINER function
    - Bypasses RLS for notification creation
*/

-- Trigger Function: Payout Completed
CREATE OR REPLACE FUNCTION notify_payout_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  amount_euro numeric;
BEGIN
  -- Only trigger if payout was just completed
  IF (NEW.status = 'paid' OR NEW.status = 'completed') 
     AND (OLD.status IS NULL OR (OLD.status != 'paid' AND OLD.status != 'completed')) THEN
    
    -- Convert amount from cents to euros
    amount_euro := NEW.net_amount / 100.0;
    
    -- Create notification for payout recipient
    PERFORM create_notification(
      p_user_id := NEW.user_id,
      p_actor_id := NEW.user_id,
      p_type := 'payout_completed',
      p_target_type := 'event',
      p_target_id := NEW.id,
      p_data := jsonb_build_object(
        'amount', amount_euro,
        'currency', NEW.currency,
        'payout_id', NEW.id
      )
    );
    
    RAISE NOTICE 'Payout completed: Notified user % about payout of % %', 
      NEW.user_id, 
      amount_euro, 
      NEW.currency;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on payouts table
DROP TRIGGER IF EXISTS on_payout_completed ON payouts;
CREATE TRIGGER on_payout_completed
  AFTER UPDATE ON payouts
  FOR EACH ROW
  WHEN ((NEW.status = 'paid' OR NEW.status = 'completed') 
        AND (OLD.status IS NULL OR (OLD.status != 'paid' AND OLD.status != 'completed')))
  EXECUTE FUNCTION notify_payout_completed();

COMMENT ON FUNCTION notify_payout_completed IS 'Notifies user when payout is completed';
