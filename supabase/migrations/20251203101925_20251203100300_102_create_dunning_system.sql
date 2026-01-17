/*
  # German Dunning System (Mahnsystem)

  ## Summary
  Creates comprehensive 3-stage dunning system for German debt collection
  compliance. Automates dunning letters (Mahnungen) with proper fees and
  interest calculations according to German law.

  ## New Tables

  ### `dunning_cases`
  Main dunning case tracking. One case per subscription with payment issues.
  
  **Fields:**
  - `id` - UUID primary key
  - `subscription_id` - References premium_subscriptions
  - `user_id` - References profiles
  - `status` - open, paid, forwarded_to_collection, written_off
  - `dunning_level` - Current dunning stage (1, 2, or 3)
  - `principal_amount` - Original debt amount (cents)
  - `late_fees` - Total dunning fees (5€ + 10€ + 15€ = 30€)
  - `interest_amount` - Calculated late payment interest
  - `total_amount` - Principal + fees + interest
  - `first_dunning_sent_at` - When 1st dunning was sent
  - `second_dunning_sent_at` - When 2nd dunning was sent
  - `third_dunning_sent_at` - When 3rd dunning was sent
  - `next_action_date` - When next dunning is due
  - `overdue_days` - Days since first payment failure

  ### `dunning_letters`
  Individual dunning letters/notices sent to users.
  
  **Fields:**
  - `id` - UUID primary key
  - `dunning_case_id` - References dunning_cases
  - `user_id` - References profiles
  - `dunning_level` - Which dunning (1, 2, or 3)
  - `amount_claimed` - Total amount claimed in this letter
  - `late_fee` - Fee for this specific dunning
  - `letter_pdf_url` - Link to generated PDF
  - `sent_at` - When letter was sent
  - `sent_via` - email, postal_mail, both
  - `email_delivered` - Boolean if email was delivered
  - `email_opened` - Boolean if email was opened
  - `payment_deadline` - 14 days from sent_at
  - `paid_at` - If/when user paid

  ## Security
  - RLS enabled for all tables
  - Users can view own dunning cases
  - Admins have full access

  ## Indexes
  - Fast lookups by subscription and user
  - Status-based queries for admin dashboard
  - Next action date for automation
*/

-- Create dunning_cases table
CREATE TABLE IF NOT EXISTS dunning_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES premium_subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Case status
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'forwarded_to_collection', 'written_off', 'closed')),
  dunning_level INTEGER NOT NULL DEFAULT 1 CHECK (dunning_level BETWEEN 1 AND 3),
  
  -- Financial amounts (in cents)
  principal_amount INTEGER NOT NULL,
  late_fees INTEGER DEFAULT 0,
  interest_amount INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL,
  
  -- Dunning timeline
  first_dunning_sent_at TIMESTAMPTZ NULL,
  second_dunning_sent_at TIMESTAMPTZ NULL,
  third_dunning_sent_at TIMESTAMPTZ NULL,
  next_action_date TIMESTAMPTZ NULL,
  
  -- Tracking
  overdue_days INTEGER DEFAULT 0,
  interest_start_date TIMESTAMPTZ NULL,
  interest_rate DECIMAL(5,2) DEFAULT 4.62,  -- 5% over Basiszinssatz (~-0.38%)
  
  -- Admin notes
  admin_notes TEXT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create dunning_letters table
CREATE TABLE IF NOT EXISTS dunning_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dunning_case_id UUID NOT NULL REFERENCES dunning_cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES premium_subscriptions(id) ON DELETE CASCADE,
  
  -- Letter details
  dunning_level INTEGER NOT NULL CHECK (dunning_level BETWEEN 1 AND 3),
  letter_number TEXT NULL,  -- e.g., "MAHN-2024-00123"
  
  -- Financial amounts (in cents)
  amount_claimed INTEGER NOT NULL,
  late_fee INTEGER NOT NULL,
  interest_amount INTEGER DEFAULT 0,
  
  -- Document
  letter_pdf_url TEXT NULL,
  letter_content TEXT NULL,
  
  -- Delivery tracking
  sent_at TIMESTAMPTZ DEFAULT now(),
  sent_via TEXT NOT NULL DEFAULT 'email' CHECK (sent_via IN ('email', 'postal_mail', 'both')),
  email_delivered BOOLEAN DEFAULT false,
  email_opened BOOLEAN DEFAULT false,
  email_error TEXT NULL,
  
  -- Payment tracking
  payment_deadline TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ NULL,
  payment_amount INTEGER NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE dunning_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_letters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dunning_cases
CREATE POLICY "Users can view own dunning cases"
  ON dunning_cases
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all dunning cases"
  ON dunning_cases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "System can manage dunning cases"
  ON dunning_cases
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- RLS Policies for dunning_letters
CREATE POLICY "Users can view own dunning letters"
  ON dunning_letters
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all dunning letters"
  ON dunning_letters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "System can insert dunning letters"
  ON dunning_letters
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for dunning_cases
CREATE INDEX IF NOT EXISTS idx_dunning_cases_subscription_id ON dunning_cases(subscription_id);
CREATE INDEX IF NOT EXISTS idx_dunning_cases_user_id ON dunning_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_dunning_cases_status ON dunning_cases(status);
CREATE INDEX IF NOT EXISTS idx_dunning_cases_dunning_level ON dunning_cases(dunning_level);
CREATE INDEX IF NOT EXISTS idx_dunning_cases_next_action ON dunning_cases(next_action_date) WHERE next_action_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dunning_cases_open ON dunning_cases(status, dunning_level) WHERE status = 'open';

-- Create indexes for dunning_letters
CREATE INDEX IF NOT EXISTS idx_dunning_letters_case_id ON dunning_letters(dunning_case_id);
CREATE INDEX IF NOT EXISTS idx_dunning_letters_user_id ON dunning_letters(user_id);
CREATE INDEX IF NOT EXISTS idx_dunning_letters_subscription_id ON dunning_letters(subscription_id);
CREATE INDEX IF NOT EXISTS idx_dunning_letters_sent_at ON dunning_letters(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_dunning_letters_unpaid ON dunning_letters(paid_at) WHERE paid_at IS NULL;

-- Function to calculate late payment interest (German law)
CREATE OR REPLACE FUNCTION calculate_interest(
  principal_cents INTEGER,
  rate DECIMAL,
  days INTEGER
)
RETURNS INTEGER AS $$
BEGIN
  -- Formula: (Principal × Rate × Days) / (100 × 365)
  -- Returns cents
  RETURN FLOOR((principal_cents * rate * days) / (100.0 * 365.0));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update dunning case amounts
CREATE OR REPLACE FUNCTION update_dunning_case_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate late fees based on dunning level
  NEW.late_fees = CASE NEW.dunning_level
    WHEN 1 THEN 500   -- 5.00 EUR
    WHEN 2 THEN 1500  -- 15.00 EUR (5 + 10)
    WHEN 3 THEN 3000  -- 30.00 EUR (5 + 10 + 15)
    ELSE 0
  END;
  
  -- Calculate interest if interest_start_date is set
  IF NEW.interest_start_date IS NOT NULL THEN
    NEW.overdue_days = EXTRACT(DAY FROM (now() - NEW.interest_start_date))::INTEGER;
    NEW.interest_amount = calculate_interest(
      NEW.principal_amount,
      NEW.interest_rate,
      NEW.overdue_days
    );
  END IF;
  
  -- Calculate total
  NEW.total_amount = NEW.principal_amount + NEW.late_fees + NEW.interest_amount;
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate amounts
DROP TRIGGER IF EXISTS update_dunning_case_amounts_trigger ON dunning_cases;
CREATE TRIGGER update_dunning_case_amounts_trigger
  BEFORE INSERT OR UPDATE ON dunning_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_dunning_case_amounts();

-- Add comments
COMMENT ON TABLE dunning_cases IS 'German 3-stage dunning system (Mahnsystem) cases';
COMMENT ON TABLE dunning_letters IS 'Individual dunning letters/notices sent to users';
COMMENT ON COLUMN dunning_cases.dunning_level IS '1st, 2nd, or 3rd Mahnung';
COMMENT ON COLUMN dunning_cases.late_fees IS 'Cumulative Mahngebühren: 5€, 15€, 30€';
COMMENT ON COLUMN dunning_cases.interest_rate IS 'Verzugszinsen: 5% over Basiszinssatz';
COMMENT ON COLUMN dunning_letters.payment_deadline IS 'Zahlungsziel: 14 days from dunning date';
