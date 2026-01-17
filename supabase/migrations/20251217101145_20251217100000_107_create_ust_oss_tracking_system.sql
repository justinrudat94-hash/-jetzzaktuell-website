/*
  # Non-Union OSS VAT Tracking System

  ## Überblick
  Dieses System ermöglicht die vollständige Erfassung und quartalsweise Meldung von Umsatzsteuerdaten
  gemäß Non-Union OSS-Verfahren für US-LLC, die digitale Dienstleistungen im deutschen Markt anbietet.

  ## 1. Neue Tabellen

  ### `ust_transactions`
  Speichert alle USt-pflichtigen Transaktionen mit vollständigen Details für OSS-Meldung

  ### `ust_quarterly_reports`
  Speichert generierte Quartalsberichte für OSS-Meldung

  ## 2. Funktionen

  ### `generate_ust_quarterly_report(p_year, p_quarter)`
  Generiert automatisch einen Quartalsbericht aus allen Transaktionen des Quartals.

  ### `get_ust_transactions_by_quarter(p_year, p_quarter)`
  Ruft alle Transaktionen eines bestimmten Quartals ab.

  ## 3. Security
  - RLS aktiviert auf allen Tabellen
  - Nur Admins können Berichte generieren und einsehen

  ## 4. Wichtige Hinweise
  - Alle Beträge in EUR
  - Non-Union OSS: Quartalsweise Meldepflicht bis zum 30. Tag nach Quartalsende
*/

-- =====================================================
-- 1. UST_TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ust_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date timestamptz NOT NULL DEFAULT now(),
  transaction_type text NOT NULL CHECK (transaction_type IN ('coin_purchase', 'premium_subscription', 'ticket_purchase', 'boost_purchase')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_payment_intent_id text,
  related_entity_id uuid,
  country_code text NOT NULL DEFAULT 'DE' CHECK (length(country_code) = 2),
  gross_amount numeric(10,2) NOT NULL CHECK (gross_amount >= 0),
  net_amount numeric(10,2) NOT NULL CHECK (net_amount >= 0),
  vat_rate numeric(5,2) NOT NULL CHECK (vat_rate >= 0 AND vat_rate <= 100),
  vat_amount numeric(10,2) NOT NULL CHECK (vat_amount >= 0),
  service_description text,
  invoice_number text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_amounts CHECK (gross_amount = net_amount + vat_amount)
);

CREATE INDEX IF NOT EXISTS idx_ust_transactions_date ON ust_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_ust_transactions_user ON ust_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ust_transactions_type ON ust_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_ust_transactions_country ON ust_transactions(country_code);
CREATE INDEX IF NOT EXISTS idx_ust_transactions_stripe ON ust_transactions(stripe_payment_intent_id);

ALTER TABLE ust_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all USt transactions"
  ON ust_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "System can insert USt transactions"
  ON ust_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 2. UST_QUARTERLY_REPORTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ust_quarterly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL CHECK (year >= 2024 AND year <= 2100),
  quarter integer NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  country_code text NOT NULL DEFAULT 'DE' CHECK (length(country_code) = 2),
  total_transactions integer NOT NULL DEFAULT 0,
  total_net_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_vat_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_gross_amount numeric(12,2) NOT NULL DEFAULT 0,
  report_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'paid')),
  generated_at timestamptz DEFAULT now(),
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submission_date timestamptz,
  payment_date timestamptz,
  payment_reference text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(year, quarter, country_code)
);

CREATE INDEX IF NOT EXISTS idx_ust_reports_period ON ust_quarterly_reports(year, quarter);
CREATE INDEX IF NOT EXISTS idx_ust_reports_status ON ust_quarterly_reports(status);
CREATE INDEX IF NOT EXISTS idx_ust_reports_country ON ust_quarterly_reports(country_code);

ALTER TABLE ust_quarterly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view quarterly reports"
  ON ust_quarterly_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert quarterly reports"
  ON ust_quarterly_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update quarterly reports"
  ON ust_quarterly_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_ust_transactions_by_quarter(
  p_year integer,
  p_quarter integer,
  p_country_code text DEFAULT 'DE'
)
RETURNS TABLE (
  id uuid,
  transaction_date timestamptz,
  transaction_type text,
  gross_amount numeric,
  net_amount numeric,
  vat_rate numeric,
  vat_amount numeric,
  stripe_payment_intent_id text,
  service_description text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date date;
  v_end_date date;
BEGIN
  v_start_date := make_date(p_year, (p_quarter - 1) * 3 + 1, 1);
  v_end_date := make_date(p_year, p_quarter * 3 + 1, 1) - interval '1 day';
  
  RETURN QUERY
  SELECT
    t.id,
    t.transaction_date,
    t.transaction_type,
    t.gross_amount,
    t.net_amount,
    t.vat_rate,
    t.vat_amount,
    t.stripe_payment_intent_id,
    t.service_description
  FROM ust_transactions t
  WHERE t.transaction_date >= v_start_date
    AND t.transaction_date <= v_end_date
    AND t.country_code = p_country_code
  ORDER BY t.transaction_date ASC;
END;
$$;

CREATE OR REPLACE FUNCTION generate_ust_quarterly_report(
  p_year integer,
  p_quarter integer,
  p_country_code text DEFAULT 'DE'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id uuid;
  v_start_date date;
  v_end_date date;
  v_total_transactions integer;
  v_total_net numeric;
  v_total_vat numeric;
  v_total_gross numeric;
  v_report_data jsonb;
  v_by_type jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can generate reports';
  END IF;

  v_start_date := make_date(p_year, (p_quarter - 1) * 3 + 1, 1);
  v_end_date := make_date(p_year, p_quarter * 3 + 1, 1) - interval '1 day';

  SELECT
    COUNT(*)::integer,
    COALESCE(SUM(net_amount), 0),
    COALESCE(SUM(vat_amount), 0),
    COALESCE(SUM(gross_amount), 0)
  INTO
    v_total_transactions,
    v_total_net,
    v_total_vat,
    v_total_gross
  FROM ust_transactions
  WHERE transaction_date >= v_start_date
    AND transaction_date <= v_end_date
    AND country_code = p_country_code;

  SELECT jsonb_object_agg(
    transaction_type,
    jsonb_build_object(
      'count', count,
      'net_amount', net_amount,
      'vat_amount', vat_amount,
      'gross_amount', gross_amount
    )
  )
  INTO v_by_type
  FROM (
    SELECT
      transaction_type,
      COUNT(*)::integer as count,
      SUM(net_amount) as net_amount,
      SUM(vat_amount) as vat_amount,
      SUM(gross_amount) as gross_amount
    FROM ust_transactions
    WHERE transaction_date >= v_start_date
      AND transaction_date <= v_end_date
      AND country_code = p_country_code
    GROUP BY transaction_type
  ) subquery;

  v_report_data := jsonb_build_object(
    'period_start', v_start_date,
    'period_end', v_end_date,
    'by_type', COALESCE(v_by_type, '{}'::jsonb),
    'vat_rate', 19.00,
    'generated_by_user', auth.uid()
  );

  INSERT INTO ust_quarterly_reports (
    year,
    quarter,
    country_code,
    total_transactions,
    total_net_amount,
    total_vat_amount,
    total_gross_amount,
    report_data,
    generated_by,
    status
  ) VALUES (
    p_year,
    p_quarter,
    p_country_code,
    v_total_transactions,
    v_total_net,
    v_total_vat,
    v_total_gross,
    v_report_data,
    auth.uid(),
    'draft'
  )
  ON CONFLICT (year, quarter, country_code)
  DO UPDATE SET
    total_transactions = EXCLUDED.total_transactions,
    total_net_amount = EXCLUDED.total_net_amount,
    total_vat_amount = EXCLUDED.total_vat_amount,
    total_gross_amount = EXCLUDED.total_gross_amount,
    report_data = EXCLUDED.report_data,
    generated_at = now(),
    generated_by = auth.uid(),
    updated_at = now()
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_current_quarter()
RETURNS TABLE (
  year integer,
  quarter integer,
  start_date date,
  end_date date
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    EXTRACT(YEAR FROM CURRENT_DATE)::integer as year,
    EXTRACT(QUARTER FROM CURRENT_DATE)::integer as quarter,
    DATE_TRUNC('quarter', CURRENT_DATE)::date as start_date,
    (DATE_TRUNC('quarter', CURRENT_DATE) + interval '3 months' - interval '1 day')::date as end_date;
$$;

CREATE OR REPLACE FUNCTION get_ust_quarters_overview(
  p_country_code text DEFAULT 'DE'
)
RETURNS TABLE (
  year integer,
  quarter integer,
  transaction_count bigint,
  total_net numeric,
  total_vat numeric,
  total_gross numeric,
  has_report boolean,
  report_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH quarters AS (
    SELECT
      EXTRACT(YEAR FROM t.transaction_date)::integer as q_year,
      EXTRACT(QUARTER FROM t.transaction_date)::integer as q_quarter,
      COUNT(*) as transaction_count,
      SUM(t.net_amount) as total_net,
      SUM(t.vat_amount) as total_vat,
      SUM(t.gross_amount) as total_gross
    FROM ust_transactions t
    WHERE t.country_code = p_country_code
    GROUP BY
      EXTRACT(YEAR FROM t.transaction_date),
      EXTRACT(QUARTER FROM t.transaction_date)
  )
  SELECT
    q.q_year,
    q.q_quarter,
    q.transaction_count,
    q.total_net,
    q.total_vat,
    q.total_gross,
    EXISTS(
      SELECT 1 FROM ust_quarterly_reports r
      WHERE r.year = q.q_year
        AND r.quarter = q.q_quarter
        AND r.country_code = p_country_code
    ) as has_report,
    (
      SELECT r.status FROM ust_quarterly_reports r
      WHERE r.year = q.q_year
        AND r.quarter = q.q_quarter
        AND r.country_code = p_country_code
      LIMIT 1
    ) as report_status
  FROM quarters q
  ORDER BY q.q_year DESC, q.q_quarter DESC;
END;
$$;

CREATE OR REPLACE FUNCTION update_ust_report_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_ust_report_timestamp
  BEFORE UPDATE ON ust_quarterly_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_ust_report_updated_at();