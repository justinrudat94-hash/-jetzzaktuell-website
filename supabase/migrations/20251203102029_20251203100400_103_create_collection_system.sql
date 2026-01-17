/*
  # Inkasso (Collection) System

  ## Summary
  Creates German inkasso (debt collection) management system for handling
  cases after 3rd dunning letter. Admin-controlled, manual export to
  collection agencies. GDPR-compliant with 10-year retention.

  ## New Tables

  ### `collection_cases`
  Main collection case tracking. Created after 3rd dunning remains unpaid.
  
  **Fields:**
  - `id` - UUID primary key
  - `dunning_case_id` - References dunning_cases
  - `subscription_id` - References premium_subscriptions
  - `user_id` - References profiles
  - `status` - open, forwarded, paid, closed, written_off
  - `principal_amount` - Original debt (cents)
  - `late_fees` - Dunning fees (30€)
  - `interest_amount` - Calculated interest
  - `collection_fees` - Additional inkasso fees
  - `total_amount` - Total debt
  - `forwarded_to_collection_at` - When sent to collection agency
  - `collection_agency_name` - Name of agency
  - `collection_reference_number` - Agency case reference
  - `admin_notes` - Internal notes

  ### `collection_exports`
  Tracks each export (ZIP file) sent to collection agencies.
  
  **Fields:**
  - `id` - UUID primary key
  - `case_ids` - Array of collection_case IDs included
  - `export_date` - When export was generated
  - `export_file_url` - URL to ZIP file
  - `file_size_bytes` - File size
  - `collection_agency_name` - Which agency
  - `exported_by` - Admin user who exported
  - `total_cases` - Number of cases
  - `total_amount` - Total debt amount
  - `notes` - Admin notes

  ## Security
  - RLS enabled for all tables
  - Only admins can access collection tables
  - Users CANNOT see their own collection cases (privacy)

  ## Indexes
  - Fast lookups by user, subscription, status
  - Admin dashboard queries
*/

-- Create collection_cases table
CREATE TABLE IF NOT EXISTS collection_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dunning_case_id UUID NOT NULL REFERENCES dunning_cases(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES premium_subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Case status
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'forwarded', 'paid', 'closed', 'written_off')),
  
  -- Financial amounts (in cents)
  principal_amount INTEGER NOT NULL,
  late_fees INTEGER DEFAULT 3000,  -- 30.00 EUR from dunning
  interest_amount INTEGER DEFAULT 0,
  collection_fees INTEGER DEFAULT 0,  -- Additional inkasso fees
  total_amount INTEGER NOT NULL,
  
  -- Collection agency details
  forwarded_to_collection_at TIMESTAMPTZ NULL,
  collection_agency_name TEXT NULL,
  collection_reference_number TEXT NULL,  -- Aktenzeichen
  collection_agency_email TEXT NULL,
  collection_agency_contact TEXT NULL,
  
  -- Payment tracking
  partial_payments_received INTEGER DEFAULT 0,
  last_payment_date TIMESTAMPTZ NULL,
  
  -- Admin management
  admin_notes TEXT NULL,
  internal_status TEXT NULL,  -- For internal workflow tracking
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Data completeness check
  data_complete BOOLEAN DEFAULT false,
  missing_data TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Legal
  legal_escalation_date TIMESTAMPTZ NULL,
  court_case_number TEXT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ NULL
);

-- Create collection_exports table
CREATE TABLE IF NOT EXISTS collection_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Which cases were exported
  case_ids UUID[] NOT NULL,
  
  -- Export details
  export_date TIMESTAMPTZ DEFAULT now(),
  export_file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER NULL,
  
  -- Collection agency
  collection_agency_name TEXT NOT NULL,
  collection_agency_email TEXT NULL,
  
  -- Who exported
  exported_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Statistics
  total_cases INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,  -- Total debt in cents
  
  -- Notes
  notes TEXT NULL,
  
  -- Follow-up
  agency_confirmed_receipt BOOLEAN DEFAULT false,
  agency_confirmed_at TIMESTAMPTZ NULL,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE collection_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_exports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collection_cases (ADMIN ONLY)
CREATE POLICY "Only admins can view collection cases"
  ON collection_cases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can manage collection cases"
  ON collection_cases
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- RLS Policies for collection_exports (ADMIN ONLY)
CREATE POLICY "Only admins can view collection exports"
  ON collection_exports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can create collection exports"
  ON collection_exports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create indexes for collection_cases
CREATE INDEX IF NOT EXISTS idx_collection_cases_dunning_case_id ON collection_cases(dunning_case_id);
CREATE INDEX IF NOT EXISTS idx_collection_cases_subscription_id ON collection_cases(subscription_id);
CREATE INDEX IF NOT EXISTS idx_collection_cases_user_id ON collection_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_cases_status ON collection_cases(status);
CREATE INDEX IF NOT EXISTS idx_collection_cases_open ON collection_cases(status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_collection_cases_forwarded ON collection_cases(status) WHERE status = 'forwarded';
CREATE INDEX IF NOT EXISTS idx_collection_cases_agency ON collection_cases(collection_agency_name) WHERE collection_agency_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_collection_cases_data_complete ON collection_cases(data_complete) WHERE data_complete = false;

-- Create indexes for collection_exports
CREATE INDEX IF NOT EXISTS idx_collection_exports_date ON collection_exports(export_date DESC);
CREATE INDEX IF NOT EXISTS idx_collection_exports_exported_by ON collection_exports(exported_by);
CREATE INDEX IF NOT EXISTS idx_collection_exports_agency ON collection_exports(collection_agency_name);

-- Function to check if case data is complete
CREATE OR REPLACE FUNCTION check_collection_case_data_completeness()
RETURNS TRIGGER AS $$
DECLARE
  missing TEXT[] := ARRAY[]::TEXT[];
  profile_rec RECORD;
BEGIN
  -- Get user profile data
  SELECT * INTO profile_rec
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Check required fields
  IF profile_rec.first_name IS NULL OR profile_rec.first_name = '' THEN
    missing := array_append(missing, 'first_name');
  END IF;
  
  IF profile_rec.last_name IS NULL OR profile_rec.last_name = '' THEN
    missing := array_append(missing, 'last_name');
  END IF;
  
  IF profile_rec.date_of_birth IS NULL THEN
    missing := array_append(missing, 'date_of_birth');
  END IF;
  
  IF profile_rec.street IS NULL OR profile_rec.street = '' THEN
    missing := array_append(missing, 'street');
  END IF;
  
  IF profile_rec.house_number IS NULL OR profile_rec.house_number = '' THEN
    missing := array_append(missing, 'house_number');
  END IF;
  
  IF profile_rec.postcode IS NULL OR profile_rec.postcode = '' THEN
    missing := array_append(missing, 'postcode');
  END IF;
  
  IF profile_rec.city IS NULL OR profile_rec.city = '' THEN
    missing := array_append(missing, 'city');
  END IF;
  
  IF profile_rec.email IS NULL OR profile_rec.email = '' THEN
    missing := array_append(missing, 'email');
  END IF;
  
  -- Update case
  NEW.missing_data := missing;
  NEW.data_complete := (array_length(missing, 1) IS NULL OR array_length(missing, 1) = 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check data completeness
DROP TRIGGER IF EXISTS check_collection_case_data_trigger ON collection_cases;
CREATE TRIGGER check_collection_case_data_trigger
  BEFORE INSERT OR UPDATE ON collection_cases
  FOR EACH ROW
  EXECUTE FUNCTION check_collection_case_data_completeness();

-- Function to auto-create collection case from dunning case
CREATE OR REPLACE FUNCTION create_collection_case_from_dunning(dunning_case_id_param UUID)
RETURNS UUID AS $$
DECLARE
  dunning_rec RECORD;
  new_case_id UUID;
BEGIN
  -- Get dunning case
  SELECT * INTO dunning_rec
  FROM dunning_cases
  WHERE id = dunning_case_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dunning case not found';
  END IF;
  
  -- Check if collection case already exists
  IF EXISTS (SELECT 1 FROM collection_cases WHERE dunning_case_id = dunning_case_id_param) THEN
    RAISE EXCEPTION 'Collection case already exists for this dunning case';
  END IF;
  
  -- Create collection case
  INSERT INTO collection_cases (
    dunning_case_id,
    subscription_id,
    user_id,
    principal_amount,
    late_fees,
    interest_amount,
    total_amount
  ) VALUES (
    dunning_rec.id,
    dunning_rec.subscription_id,
    dunning_rec.user_id,
    dunning_rec.principal_amount,
    dunning_rec.late_fees,
    dunning_rec.interest_amount,
    dunning_rec.total_amount
  )
  RETURNING id INTO new_case_id;
  
  -- Update dunning case status
  UPDATE dunning_cases
  SET status = 'forwarded_to_collection'
  WHERE id = dunning_case_id_param;
  
  RETURN new_case_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE collection_cases IS 'Inkasso (debt collection) cases for manual export to collection agencies';
COMMENT ON TABLE collection_exports IS 'Tracks ZIP exports sent to collection agencies';
COMMENT ON COLUMN collection_cases.data_complete IS 'All required user data available for inkasso export';
COMMENT ON COLUMN collection_cases.missing_data IS 'Array of missing field names (e.g., street, date_of_birth)';
COMMENT ON COLUMN collection_cases.collection_reference_number IS 'Aktenzeichen from collection agency';
