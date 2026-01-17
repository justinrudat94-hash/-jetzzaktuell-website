/*
  # Fix get_ust_transactions_by_quarter function for multi-country

  ## Changes
  - Modifiziert get_ust_transactions_by_quarter um bei p_country_code = NULL alle Länder zurückzugeben
  - Fügt country_code zum Return-Type hinzu
*/

DROP FUNCTION IF EXISTS get_ust_transactions_by_quarter(integer, integer, text);

CREATE OR REPLACE FUNCTION get_ust_transactions_by_quarter(
  p_year integer,
  p_quarter integer,
  p_country_code text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  transaction_date timestamptz,
  transaction_type text,
  country_code text,
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
    t.country_code,
    t.gross_amount,
    t.net_amount,
    t.vat_rate,
    t.vat_amount,
    t.stripe_payment_intent_id,
    t.service_description
  FROM ust_transactions t
  WHERE t.transaction_date >= v_start_date
    AND t.transaction_date <= v_end_date
    AND (p_country_code IS NULL OR t.country_code = p_country_code)
  ORDER BY t.transaction_date ASC;
END;
$$;