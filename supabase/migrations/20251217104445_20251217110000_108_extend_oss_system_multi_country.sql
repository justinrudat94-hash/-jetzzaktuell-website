/*
  # OSS-System Multi-Country Erweiterung

  ## Übersicht
  Erweitert das OSS-System für Multi-Country EU-Verkäufe mit dynamischen Steuersätzen,
  Länder-spezifischer Berichterstattung und korrekter Fristenverwaltung.

  ## 1. Neue Tabellen

  ### `vat_rates`
  Dynamische Verwaltung von EU-Umsatzsteuersätzen pro Land

  ## 2. Tabellen-Änderungen

  ### `ust_transactions`
  - Hinzufügen: `currency` (text) - Währungscode

  ### `ust_quarterly_reports`
  - Hinzufügen: `oss_vat_number` (text) - Irische OSS-USt-ID
  - Ändern: Unique Constraint von (year, quarter, country_code) zu (year, quarter)
  - Ändern: country_code wird NULL-able

  ## 3. Neue Funktionen

  ### `get_vat_rate(p_country_code, p_date)`
  Gibt den gültigen USt-Satz für ein Land zurück

  ### `generate_multi_country_oss_report(p_year, p_quarter)`
  Generiert einen Quartalsbericht mit Aufschlüsselung nach Ländern
*/

-- =====================================================
-- 1. VAT_RATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS vat_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL CHECK (length(country_code) = 2),
  country_name text NOT NULL,
  vat_rate numeric(5,2) NOT NULL CHECK (vat_rate >= 0 AND vat_rate <= 100),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(country_code, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_vat_rates_country ON vat_rates(country_code);
CREATE INDEX IF NOT EXISTS idx_vat_rates_active ON vat_rates(is_active) WHERE is_active = true;

ALTER TABLE vat_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read VAT rates"
  ON vat_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify VAT rates"
  ON vat_rates FOR ALL
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

INSERT INTO vat_rates (country_code, country_name, vat_rate, effective_from, is_active) VALUES
  ('AT', 'Österreich', 20.00, '2024-01-01', true),
  ('BE', 'Belgien', 21.00, '2024-01-01', true),
  ('BG', 'Bulgarien', 20.00, '2024-01-01', true),
  ('HR', 'Kroatien', 25.00, '2024-01-01', true),
  ('CY', 'Zypern', 19.00, '2024-01-01', true),
  ('CZ', 'Tschechien', 21.00, '2024-01-01', true),
  ('DE', 'Deutschland', 19.00, '2024-01-01', true),
  ('DK', 'Dänemark', 25.00, '2024-01-01', true),
  ('EE', 'Estland', 22.00, '2024-01-01', true),
  ('ES', 'Spanien', 21.00, '2024-01-01', true),
  ('FI', 'Finnland', 25.50, '2024-01-01', true),
  ('FR', 'Frankreich', 20.00, '2024-01-01', true),
  ('GR', 'Griechenland', 24.00, '2024-01-01', true),
  ('HU', 'Ungarn', 27.00, '2024-01-01', true),
  ('IE', 'Irland', 23.00, '2024-01-01', true),
  ('IT', 'Italien', 22.00, '2024-01-01', true),
  ('LT', 'Litauen', 21.00, '2024-01-01', true),
  ('LU', 'Luxemburg', 17.00, '2024-01-01', true),
  ('LV', 'Lettland', 21.00, '2024-01-01', true),
  ('MT', 'Malta', 18.00, '2024-01-01', true),
  ('NL', 'Niederlande', 21.00, '2024-01-01', true),
  ('PL', 'Polen', 23.00, '2024-01-01', true),
  ('PT', 'Portugal', 23.00, '2024-01-01', true),
  ('RO', 'Rumänien', 19.00, '2024-01-01', true),
  ('SE', 'Schweden', 25.00, '2024-01-01', true),
  ('SI', 'Slowenien', 22.00, '2024-01-01', true),
  ('SK', 'Slowakei', 20.00, '2024-01-01', true)
ON CONFLICT (country_code, effective_from) DO NOTHING;

-- =====================================================
-- 2. EXTEND UST_TRANSACTIONS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ust_transactions' AND column_name = 'currency'
  ) THEN
    ALTER TABLE ust_transactions ADD COLUMN currency text NOT NULL DEFAULT 'EUR';
  END IF;
END $$;

-- =====================================================
-- 3. EXTEND UST_QUARTERLY_REPORTS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ust_quarterly_reports' AND column_name = 'oss_vat_number'
  ) THEN
    ALTER TABLE ust_quarterly_reports ADD COLUMN oss_vat_number text;
  END IF;
END $$;

ALTER TABLE ust_quarterly_reports DROP CONSTRAINT IF EXISTS ust_quarterly_reports_year_quarter_country_code_key;

ALTER TABLE ust_quarterly_reports ALTER COLUMN country_code DROP NOT NULL;
ALTER TABLE ust_quarterly_reports ALTER COLUMN country_code DROP DEFAULT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ust_quarterly_reports_year_quarter_key'
  ) THEN
    ALTER TABLE ust_quarterly_reports ADD CONSTRAINT ust_quarterly_reports_year_quarter_key UNIQUE (year, quarter);
  END IF;
END $$;

-- =====================================================
-- 4. FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_vat_rate(
  p_country_code text,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_vat_rate numeric;
BEGIN
  SELECT vat_rate INTO v_vat_rate
  FROM vat_rates
  WHERE country_code = p_country_code
    AND effective_from <= p_date
    AND is_active = true
  ORDER BY effective_from DESC
  LIMIT 1;

  IF v_vat_rate IS NULL THEN
    RAISE WARNING 'No VAT rate found for country % on date %', p_country_code, p_date;
    RETURN 0;
  END IF;

  RETURN v_vat_rate;
END;
$$;

CREATE OR REPLACE FUNCTION generate_ust_quarterly_report(
  p_year integer,
  p_quarter integer
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
  v_by_country jsonb;
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
    AND transaction_date <= v_end_date;

  SELECT jsonb_object_agg(
    country_code,
    jsonb_build_object(
      'country_name', country_name,
      'vat_rate', vat_rate,
      'count', count,
      'net_amount', net_amount,
      'vat_amount', vat_amount,
      'gross_amount', gross_amount
    )
  )
  INTO v_by_country
  FROM (
    SELECT
      t.country_code,
      COALESCE(vr.country_name, t.country_code) as country_name,
      COALESCE(MAX(vr.vat_rate), MAX(t.vat_rate)) as vat_rate,
      COUNT(*)::integer as count,
      SUM(t.net_amount) as net_amount,
      SUM(t.vat_amount) as vat_amount,
      SUM(t.gross_amount) as gross_amount
    FROM ust_transactions t
    LEFT JOIN vat_rates vr ON vr.country_code = t.country_code AND vr.is_active = true
    WHERE t.transaction_date >= v_start_date
      AND t.transaction_date <= v_end_date
    GROUP BY t.country_code, vr.country_name
  ) subquery;

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
    GROUP BY transaction_type
  ) subquery;

  v_report_data := jsonb_build_object(
    'period_start', v_start_date,
    'period_end', v_end_date,
    'by_country', COALESCE(v_by_country, '{}'::jsonb),
    'by_type', COALESCE(v_by_type, '{}'::jsonb),
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
    NULL,
    v_total_transactions,
    v_total_net,
    v_total_vat,
    v_total_gross,
    v_report_data,
    auth.uid(),
    'draft'
  )
  ON CONFLICT (year, quarter)
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

CREATE OR REPLACE FUNCTION get_ust_quarters_overview()
RETURNS TABLE (
  year integer,
  quarter integer,
  transaction_count bigint,
  total_net numeric,
  total_vat numeric,
  total_gross numeric,
  countries_count bigint,
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
      COUNT(DISTINCT t.country_code) as countries_count,
      SUM(t.net_amount) as total_net,
      SUM(t.vat_amount) as total_vat,
      SUM(t.gross_amount) as total_gross
    FROM ust_transactions t
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
    q.countries_count,
    EXISTS(
      SELECT 1 FROM ust_quarterly_reports r
      WHERE r.year = q.q_year
        AND r.quarter = q.q_quarter
    ) as has_report,
    (
      SELECT r.status FROM ust_quarterly_reports r
      WHERE r.year = q.q_year
        AND r.quarter = q.q_quarter
      LIMIT 1
    ) as report_status
  FROM quarters q
  ORDER BY q.q_year DESC, q.q_quarter DESC;
END;
$$;

-- =====================================================
-- 5. VIEW FÜR LÄNDER-AGGREGATION
-- =====================================================

CREATE OR REPLACE VIEW ust_transactions_by_country AS
SELECT
  EXTRACT(YEAR FROM t.transaction_date)::integer as year,
  EXTRACT(QUARTER FROM t.transaction_date)::integer as quarter,
  t.country_code,
  COALESCE(vr.country_name, t.country_code) as country_name,
  COALESCE(MAX(vr.vat_rate), MAX(t.vat_rate)) as vat_rate,
  COUNT(*) as transaction_count,
  SUM(t.net_amount) as total_net,
  SUM(t.vat_amount) as total_vat,
  SUM(t.gross_amount) as total_gross
FROM ust_transactions t
LEFT JOIN vat_rates vr ON vr.country_code = t.country_code AND vr.is_active = true
GROUP BY
  EXTRACT(YEAR FROM t.transaction_date),
  EXTRACT(QUARTER FROM t.transaction_date),
  t.country_code,
  vr.country_name
ORDER BY year DESC, quarter DESC, total_gross DESC;