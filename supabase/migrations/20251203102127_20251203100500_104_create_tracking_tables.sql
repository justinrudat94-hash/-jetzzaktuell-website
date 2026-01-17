/*
  # Stripe Invoices & Subscription Audit Log

  ## Summary
  Creates tracking tables for comprehensive audit trail and invoice management.
  Essential for inkasso exports and financial reporting.

  ## New Tables

  ### `stripe_invoices`
  Tracks all Stripe invoices for subscriptions. Synced via webhooks.
  
  **Fields:**
  - `id` - UUID primary key
  - `stripe_invoice_id` - Stripe Invoice ID (unique)
  - `subscription_id` - References premium_subscriptions
  - `stripe_customer_id` - Stripe Customer ID
  - `amount_due` - Total amount due (cents)
  - `amount_paid` - Amount actually paid (cents)
  - `amount_remaining` - Unpaid amount (cents)
  - `currency` - Currency code
  - `status` - draft, open, paid, void, uncollectible
  - `invoice_created_at` - When Stripe created invoice
  - `invoice_due_date` - When payment is due
  - `invoice_paid_at` - When invoice was paid
  - `invoice_pdf_url` - Link to Stripe PDF
  - `hosted_invoice_url` - Stripe hosted page
  - `attempt_count` - Number of payment attempts
  - `next_payment_attempt` - When next retry

  ### `subscription_audit_log`
  Complete audit trail of all subscription changes.
  
  **Fields:**
  - `id` - UUID primary key
  - `subscription_id` - References premium_subscriptions
  - `user_id` - References profiles
  - `action` - created, updated, paused, resumed, canceled, etc.
  - `old_status` - Previous status
  - `new_status` - New status
  - `changed_by` - Who made the change (user_id or 'system')
  - `reason` - Why change was made
  - `metadata` - Additional data (JSONB)

  ## Security
  - RLS enabled for all tables
  - Users can view own invoices
  - Admins have full access
  - Audit log is read-only for users

  ## Indexes
  - Fast lookups by subscription and invoice ID
  - Status-based queries
  - Time-based audit queries
*/

-- Create stripe_invoices table
CREATE TABLE IF NOT EXISTS stripe_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  subscription_id UUID NULL REFERENCES premium_subscriptions(id) ON DELETE SET NULL,
  user_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  stripe_customer_id TEXT NOT NULL,
  
  -- Financial amounts (in cents)
  amount_due INTEGER NOT NULL,
  amount_paid INTEGER DEFAULT 0,
  amount_remaining INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'eur',
  
  -- Invoice details
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  invoice_number TEXT NULL,
  description TEXT NULL,
  
  -- Dates
  invoice_created_at TIMESTAMPTZ NOT NULL,
  invoice_due_date TIMESTAMPTZ NULL,
  invoice_paid_at TIMESTAMPTZ NULL,
  invoice_voided_at TIMESTAMPTZ NULL,
  
  -- Stripe URLs
  invoice_pdf_url TEXT NULL,
  hosted_invoice_url TEXT NULL,
  
  -- Payment attempts
  attempt_count INTEGER DEFAULT 0,
  next_payment_attempt TIMESTAMPTZ NULL,
  
  -- Billing details
  billing_reason TEXT NULL,  -- subscription_create, subscription_cycle, etc.
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create subscription_audit_log table
CREATE TABLE IF NOT EXISTS subscription_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NULL REFERENCES premium_subscriptions(id) ON DELETE SET NULL,
  user_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Action details
  action TEXT NOT NULL CHECK (action IN (
    'created', 'updated', 'canceled', 'paused', 'resumed',
    'payment_failed', 'payment_succeeded', 'trial_started',
    'trial_ended', 'status_changed', 'plan_changed',
    'payment_method_updated', 'dunning_started', 'forwarded_to_collection'
  )),
  
  -- Status tracking
  old_status TEXT NULL,
  new_status TEXT NULL,
  
  -- Who made the change
  changed_by UUID NULL REFERENCES auth.users(id),
  changed_by_type TEXT DEFAULT 'user' CHECK (changed_by_type IN ('user', 'admin', 'system', 'stripe_webhook')),
  
  -- Context
  reason TEXT NULL,
  admin_notes TEXT NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  
  -- Additional data
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE stripe_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_invoices
CREATE POLICY "Users can view own invoices"
  ON stripe_invoices
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all invoices"
  ON stripe_invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "System can manage invoices"
  ON stripe_invoices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- RLS Policies for subscription_audit_log
CREATE POLICY "Users can view own audit log"
  ON subscription_audit_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
  ON subscription_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "System can insert audit logs"
  ON subscription_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for stripe_invoices
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_stripe_id ON stripe_invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_subscription_id ON stripe_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_user_id ON stripe_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_customer_id ON stripe_invoices(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_status ON stripe_invoices(status);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_unpaid ON stripe_invoices(status, amount_remaining) WHERE status IN ('open', 'uncollectible') AND amount_remaining > 0;
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_created_at ON stripe_invoices(invoice_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_due_date ON stripe_invoices(invoice_due_date) WHERE invoice_due_date IS NOT NULL;

-- Create indexes for subscription_audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_subscription_id ON subscription_audit_log(subscription_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON subscription_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON subscription_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON subscription_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON subscription_audit_log(changed_by);

-- Function to auto-log subscription changes
CREATE OR REPLACE FUNCTION log_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed or specific fields changed
  IF (TG_OP = 'UPDATE' AND (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.is_paused IS DISTINCT FROM NEW.is_paused OR
    OLD.cancel_at_period_end IS DISTINCT FROM NEW.cancel_at_period_end
  )) OR TG_OP = 'INSERT' THEN
    INSERT INTO subscription_audit_log (
      subscription_id,
      user_id,
      action,
      old_status,
      new_status,
      changed_by_type,
      metadata
    ) VALUES (
      NEW.id,
      NEW.user_id,
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'created'
        WHEN OLD.status != NEW.status THEN 'status_changed'
        WHEN OLD.is_paused != NEW.is_paused AND NEW.is_paused = true THEN 'paused'
        WHEN OLD.is_paused != NEW.is_paused AND NEW.is_paused = false THEN 'resumed'
        WHEN OLD.cancel_at_period_end != NEW.cancel_at_period_end AND NEW.cancel_at_period_end = true THEN 'canceled'
        ELSE 'updated'
      END,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
      NEW.status,
      'system',
      jsonb_build_object(
        'operation', TG_OP,
        'is_paused', NEW.is_paused,
        'cancel_at_period_end', NEW.cancel_at_period_end
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-log subscription changes
DROP TRIGGER IF EXISTS log_subscription_change_trigger ON premium_subscriptions;
CREATE TRIGGER log_subscription_change_trigger
  AFTER INSERT OR UPDATE ON premium_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION log_subscription_change();

-- Function to get invoice summary for a subscription
CREATE OR REPLACE FUNCTION get_invoice_summary(sub_id UUID)
RETURNS TABLE (
  total_invoiced INTEGER,
  total_paid INTEGER,
  total_outstanding INTEGER,
  invoice_count INTEGER,
  last_invoice_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(amount_due), 0)::INTEGER as total_invoiced,
    COALESCE(SUM(amount_paid), 0)::INTEGER as total_paid,
    COALESCE(SUM(amount_remaining), 0)::INTEGER as total_outstanding,
    COUNT(*)::INTEGER as invoice_count,
    MAX(invoice_created_at) as last_invoice_date
  FROM stripe_invoices
  WHERE subscription_id = sub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE stripe_invoices IS 'Tracks all Stripe invoices for premium subscriptions';
COMMENT ON TABLE subscription_audit_log IS 'Complete audit trail of all subscription changes';
COMMENT ON COLUMN stripe_invoices.invoice_pdf_url IS 'Link to downloadable PDF invoice from Stripe';
COMMENT ON COLUMN stripe_invoices.hosted_invoice_url IS 'Stripe-hosted payment page for unpaid invoices';
COMMENT ON COLUMN subscription_audit_log.changed_by_type IS 'Who/what triggered the change: user, admin, system, or stripe_webhook';
