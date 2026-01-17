/*
  # Optimize Time Windows for Near Future Events
  
  1. Changes
    - Adjusts time windows to focus on near-future events (next 12 months)
    - Splits first 4 months into monthly windows for better granularity
    - Removes 12-24 month windows (too far in future, not relevant)
  
  2. New Time Window Strategy
    - Index 0: 0-1 month (highest priority)
    - Index 1: 1-2 months
    - Index 2: 2-3 months
    - Index 3: 3-4 months
    - Index 4: 4-6 months
    - Index 5: 6-9 months
    - Index 6: 9-12 months
  
  3. Why This Matters
    - Users want events happening soon, not in 2026
    - Better event distribution across near-term dates
    - More relevant results for users planning activities
*/

CREATE OR REPLACE FUNCTION calculate_scheduler_time_window(
  time_window_index INT DEFAULT 0
)
RETURNS TABLE(
  start_date_time TEXT,
  end_date_time TEXT,
  window_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_time TIMESTAMP WITH TIME ZONE;
  start_months INT;
  end_months INT;
  start_date TIMESTAMP WITH TIME ZONE;
  end_date TIMESTAMP WITH TIME ZONE;
  window_label TEXT;
BEGIN
  now_time := NOW();
  
  -- Optimized time windows focusing on near future (0-12 months)
  CASE time_window_index
    WHEN 0 THEN
      start_months := 0;
      end_months := 1;
      window_label := '0-1 month';
    WHEN 1 THEN
      start_months := 1;
      end_months := 2;
      window_label := '1-2 months';
    WHEN 2 THEN
      start_months := 2;
      end_months := 3;
      window_label := '2-3 months';
    WHEN 3 THEN
      start_months := 3;
      end_months := 4;
      window_label := '3-4 months';
    WHEN 4 THEN
      start_months := 4;
      end_months := 6;
      window_label := '4-6 months';
    WHEN 5 THEN
      start_months := 6;
      end_months := 9;
      window_label := '6-9 months';
    WHEN 6 THEN
      start_months := 9;
      end_months := 12;
      window_label := '9-12 months';
    ELSE
      -- Default to immediate future
      start_months := 0;
      end_months := 1;
      window_label := '0-1 month';
  END CASE;
  
  -- Calculate dates
  start_date := now_time + (start_months || ' months')::INTERVAL;
  end_date := now_time + (end_months || ' months')::INTERVAL;
  
  -- Format for Ticketmaster API: YYYY-MM-DDTHH:mm:ssZ
  start_date_time := TO_CHAR(start_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  end_date_time := TO_CHAR(end_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  window_name := window_label;
  
  RETURN QUERY SELECT start_date_time, end_date_time, window_name;
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_scheduler_time_window(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_scheduler_time_window(INT) TO service_role;
