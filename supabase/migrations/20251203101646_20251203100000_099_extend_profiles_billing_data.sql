/*
  # Extend Profiles for Stripe Billing & Inkasso Compliance

  ## Summary
  Adds required fields for complete billing data collection, Stripe integration,
  and German inkasso (debt collection) compliance.

  ## Changes

  ### New Billing Fields
  - `street` - Street name for billing address
  - `house_number` - House number for billing address
  - `country_full` - Full country name (e.g., "Deutschland") for inkasso documents
  - `billing_data_complete` - Boolean flag indicating all billing data collected
  - `billing_data_completed_at` - Timestamp when billing data was completed

  ### Stripe Integration
  - `stripe_customer_id` - Stripe Customer ID for payment processing

  ### Legal & Compliance
  - `ip_address_at_signup` - IP address when user registered (for contract proof)
  - `terms_accepted_at` - Timestamp when user accepted terms & conditions
  - `terms_version` - Version of T&C accepted by user

  ## Notes
  - Street and house_number are separate for German address format
  - country_full is needed for inkasso documents (location_country is just ISO code)
  - All fields nullable to allow gradual rollout
  - billing_data_complete used as gate for payment flows
*/

-- Add billing address fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS street TEXT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS house_number TEXT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_full TEXT DEFAULT 'Deutschland';

-- Add billing completion tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_data_complete BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_data_completed_at TIMESTAMPTZ NULL;

-- Add Stripe integration
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT NULL;

-- Add legal compliance fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ip_address_at_signup INET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_version TEXT NULL;

-- Create index for fast Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- Create index for billing data completion queries
CREATE INDEX IF NOT EXISTS idx_profiles_billing_complete ON profiles(billing_data_complete) WHERE billing_data_complete = true;

-- Add comment for documentation
COMMENT ON COLUMN profiles.street IS 'Street name for billing address (German format)';
COMMENT ON COLUMN profiles.house_number IS 'House number for billing address (German format)';
COMMENT ON COLUMN profiles.billing_data_complete IS 'Gate check for payment flows - all required billing data collected';
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe Customer ID for recurring payments and subscriptions';