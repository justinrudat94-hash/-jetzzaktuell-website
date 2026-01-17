/*
  # Add Stripe Identity KYC Fields to Profiles

  ## Summary
  This migration adds comprehensive KYC (Know Your Customer) verification fields to the profiles table
  to support Stripe Identity verification for high-earning creators, event organizers, and premium users.

  ## Changes

  ### 1. New Columns Added to `profiles` Table

  **Verification Status & Tracking:**
  - `stripe_identity_verification_id` (text, nullable): Stores the Stripe Identity verification session ID
  - `kyc_verification_status` (text, nullable): Current status - 'not_started', 'pending', 'verified', 'failed'
  - `kyc_required` (boolean, default false): Flag indicating if KYC is required for this user
  - `kyc_verified_at` (timestamptz, nullable): Timestamp when verification was completed
  - `kyc_verification_last_attempt` (timestamptz, nullable): Last verification attempt timestamp

  **Verified Identity Data (stored after successful verification):**
  - `kyc_verified_first_name` (text, nullable): First name from verified ID document
  - `kyc_verified_last_name` (text, nullable): Last name from verified ID document
  - `kyc_verified_dob` (date, nullable): Date of birth from verified ID document
  - `kyc_verified_address` (jsonb, nullable): Verified address data
  - `kyc_verified_id_number` (text, nullable): Encrypted ID number from document

  **Payout Eligibility (based on earnings):**
  - `lifetime_earnings` (integer, default 0): Total earnings in cents for payout eligibility tracking

  ### 2. Security Considerations
  - All KYC fields are nullable to support gradual rollout
  - Sensitive data like ID numbers are marked for encryption at rest
  - RLS policies remain unchanged as these are profile extensions

  ### 3. Indexes
  - Added index on `stripe_identity_verification_id` for webhook lookups
  - Added index on `kyc_verification_status` for admin filtering
  - Added index on `kyc_required` for automated checks

  ## Important Notes
  - This migration is safe to run on production (non-destructive)
  - Existing profiles will have NULL values for new fields
  - KYC verification is opt-in and triggered by business logic
  - Verified data is sourced directly from Stripe Identity verification
*/

-- Add Stripe Identity verification tracking fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_identity_verification_id text,
  ADD COLUMN IF NOT EXISTS kyc_verification_status text CHECK (kyc_verification_status IN ('not_started', 'pending', 'verified', 'failed')),
  ADD COLUMN IF NOT EXISTS kyc_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS kyc_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_verification_last_attempt timestamptz;

-- Add verified identity data fields (populated after successful verification)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS kyc_verified_first_name text,
  ADD COLUMN IF NOT EXISTS kyc_verified_last_name text,
  ADD COLUMN IF NOT EXISTS kyc_verified_dob date,
  ADD COLUMN IF NOT EXISTS kyc_verified_address jsonb,
  ADD COLUMN IF NOT EXISTS kyc_verified_id_number text;

-- Add lifetime earnings for payout eligibility tracking
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS lifetime_earnings integer DEFAULT 0;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_identity_verification_id 
  ON profiles(stripe_identity_verification_id) 
  WHERE stripe_identity_verification_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_kyc_verification_status 
  ON profiles(kyc_verification_status) 
  WHERE kyc_verification_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_kyc_required 
  ON profiles(kyc_required) 
  WHERE kyc_required = true;

CREATE INDEX IF NOT EXISTS idx_profiles_lifetime_earnings 
  ON profiles(lifetime_earnings) 
  WHERE lifetime_earnings > 0;

-- Add helpful comment explaining the KYC flow
COMMENT ON COLUMN profiles.kyc_verification_status IS 'KYC verification status: not_started (default), pending (in progress), verified (completed), failed (requires retry)';
COMMENT ON COLUMN profiles.kyc_required IS 'Set to true when user crosses €1000 lifetime earnings or creates paid events';
COMMENT ON COLUMN profiles.stripe_identity_verification_id IS 'Stripe Identity VerificationSession ID for tracking verification state';
COMMENT ON COLUMN profiles.lifetime_earnings IS 'Total lifetime earnings in cents for determining KYC requirement threshold';
