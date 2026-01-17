/*
  # Extend Premium Subscriptions for Full Billing System

  ## Summary
  Extends existing premium_subscriptions table with missing fields for:
  - 7-day trial tracking
  - Pause functionality
  - Cancellation tracking
  - Amount and currency tracking
  - Cancel at period end

  ## Changes

  ### Trial Fields
  - `trial_start` - When 7-day trial started
  - `trial_end` - When 7-day trial ends
  - `amount` - Subscription amount in cents
  - `currency` - Currency code

  ### Cancellation Fields
  - `canceled_at` - Timestamp of cancellation

  ### Pause Functionality
  - `is_paused` - Boolean flag for user-initiated pause
  - `pause_start_date` - When pause started
  - `pause_end_date` - When pause will end (auto-resume)
  - `pause_reason` - Optional user feedback
  - `pause_collection_method` - How to handle invoices during pause

  ## Notes
  - Pause is separate from Stripe's native pause (user-controlled)
  - Trial fields track the 7-day free trial period
  - All fields nullable for backward compatibility
*/

-- Add trial fields
ALTER TABLE premium_subscriptions ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ NULL;
ALTER TABLE premium_subscriptions ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ NULL;

-- Add amount and currency
ALTER TABLE premium_subscriptions ADD COLUMN IF NOT EXISTS amount INTEGER NULL;
ALTER TABLE premium_subscriptions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'eur';

-- Add cancellation tracking
ALTER TABLE premium_subscriptions ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ NULL;

-- Add pause functionality
ALTER TABLE premium_subscriptions ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;
ALTER TABLE premium_subscriptions ADD COLUMN IF NOT EXISTS pause_start_date TIMESTAMPTZ NULL;
ALTER TABLE premium_subscriptions ADD COLUMN IF NOT EXISTS pause_end_date TIMESTAMPTZ NULL;
ALTER TABLE premium_subscriptions ADD COLUMN IF NOT EXISTS pause_reason TEXT NULL;
ALTER TABLE premium_subscriptions ADD COLUMN IF NOT EXISTS pause_collection_method TEXT NULL 
  CHECK (pause_collection_method IN ('keep_as_draft', 'mark_uncollectible', 'void'));

-- Create new indexes for pause and past_due
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_paused ON premium_subscriptions(is_paused) WHERE is_paused = true;
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_past_due ON premium_subscriptions(status) WHERE status = 'past_due';

-- Update existing sync function to include pause logic
CREATE OR REPLACE FUNCTION sync_premium_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET 
    is_premium = CASE 
      WHEN NEW.status IN ('active', 'trialing') AND NEW.is_paused = false THEN true
      ELSE false
    END,
    premium_until = CASE
      WHEN NEW.status IN ('active', 'trialing') AND NEW.is_paused = false THEN NEW.current_period_end
      ELSE NULL
    END
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (in case it didn't exist)
DROP TRIGGER IF EXISTS sync_premium_status_trigger ON premium_subscriptions;
CREATE TRIGGER sync_premium_status_trigger
  AFTER INSERT OR UPDATE ON premium_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_premium_status();

-- Add comments
COMMENT ON COLUMN premium_subscriptions.is_paused IS 'User-initiated pause (1 month), different from Stripe pause';
COMMENT ON COLUMN premium_subscriptions.trial_start IS '7-day free trial start date';
COMMENT ON COLUMN premium_subscriptions.trial_end IS '7-day free trial end date';
COMMENT ON COLUMN premium_subscriptions.amount IS 'Subscription amount in cents (e.g., 499 for 4.99 EUR)';
