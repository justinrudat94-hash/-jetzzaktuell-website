/*
  # Payment Retry Log System

  ## Summary
  Creates comprehensive logging system for tracking payment retry attempts
  when subscriptions fail. Integrates with Stripe Smart Retries (4 attempts over 14 days).

  ## New Tables

  ### `payment_retry_log`
  Tracks every payment retry attempt for failed subscription payments.
  
  **Fields:**
  - `id` - UUID primary key
  - `subscription_id` - References premium_subscriptions
  - `stripe_payment_intent_id` - Stripe PaymentIntent ID
  - `stripe_invoice_id` - Stripe Invoice ID
  - `attempt_number` - Which retry (1-4)
  - `status` - succeeded, failed, requires_action
  - `failure_code` - Stripe error code (card_declined, insufficient_funds, etc.)
  - `failure_message` - Human-readable error message
  - `amount` - Amount attempted in cents
  - `currency` - Currency code
  - `attempted_at` - When retry was attempted
  - `next_retry_at` - When next retry is scheduled

  ## Security
  - RLS enabled
  - Users can view own retry logs
  - Admins have full access

  ## Indexes
  - Fast lookups by subscription_id
  - Queries by status for monitoring
  - Time-based queries for reporting
*/

-- Create payment_retry_log table
CREATE TABLE IF NOT EXISTS payment_retry_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES premium_subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Stripe identifiers
  stripe_payment_intent_id TEXT NOT NULL,
  stripe_invoice_id TEXT NULL,
  
  -- Retry details
  attempt_number INTEGER NOT NULL CHECK (attempt_number BETWEEN 1 AND 10),
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'requires_action', 'processing')),
  
  -- Failure information
  failure_code TEXT NULL,
  failure_message TEXT NULL,
  
  -- Amount
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'eur',
  
  -- Timing
  attempted_at TIMESTAMPTZ DEFAULT now(),
  next_retry_at TIMESTAMPTZ NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_retry_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own payment retries"
  ON payment_retry_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment retries"
  ON payment_retry_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "System can insert payment retries"
  ON payment_retry_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_retry_log_subscription_id ON payment_retry_log(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_retry_log_user_id ON payment_retry_log(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_retry_log_status ON payment_retry_log(status);
CREATE INDEX IF NOT EXISTS idx_payment_retry_log_payment_intent ON payment_retry_log(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_retry_log_attempted_at ON payment_retry_log(attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_retry_log_next_retry ON payment_retry_log(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- Function to get retry summary for a subscription
CREATE OR REPLACE FUNCTION get_retry_summary(sub_id UUID)
RETURNS TABLE (
  total_attempts INTEGER,
  failed_attempts INTEGER,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  last_failure_code TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_attempts,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as failed_attempts,
    MAX(attempted_at) as last_attempt_at,
    MAX(next_retry_at) as next_retry_at,
    (
      SELECT failure_code 
      FROM payment_retry_log 
      WHERE subscription_id = sub_id 
      AND status = 'failed'
      ORDER BY attempted_at DESC 
      LIMIT 1
    ) as last_failure_code
  FROM payment_retry_log
  WHERE subscription_id = sub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE payment_retry_log IS 'Tracks all payment retry attempts for failed subscriptions';
COMMENT ON COLUMN payment_retry_log.attempt_number IS 'Retry attempt number (1=first retry, 4=last retry before dunning)';
COMMENT ON COLUMN payment_retry_log.failure_code IS 'Stripe error code: card_declined, insufficient_funds, expired_card, etc.';
COMMENT ON COLUMN payment_retry_log.next_retry_at IS 'When Stripe will automatically retry (3, 5, 7, 14 days schedule)';
