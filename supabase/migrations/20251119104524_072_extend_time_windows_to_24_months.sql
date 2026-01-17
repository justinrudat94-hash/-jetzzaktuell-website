/*
  # Extend Time Windows to 24 Months
  
  1. Changes
    - Extends calculate_scheduler_time_window to support up to 24 months ahead
    - Adds time window indices 5-11 for coverage beyond 12 months
    - Ensures continuous event discovery throughout the year
  
  2. New Time Windows
    - Index 5: 12-15 months
    - Index 6: 15-18 months
    - Index 7: 18-21 months
    - Index 8: 21-24 months
  
  3. Why This Matters
    - Prevents the scheduler from cycling through the same events repeatedly
    - Ensures new events are discovered as they are published by Ticketmaster
    - Provides better coverage for long-term event planning
*/

-- Update function to support 24 months of time windows
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
  
  -- Define time windows (in months ahead) - extended to 24 months
  CASE time_window_index
    WHEN 0 THEN
      start_months := 0;
      end_months := 2;
      window_label := '0-2 months';
    WHEN 1 THEN
      start_months := 2;
      end_months := 4;
      window_label := '2-4 months';
    WHEN 2 THEN
      start_months := 4;
      end_months := 6;
      window_label := '4-6 months';
    WHEN 3 THEN
      start_months := 6;
      end_months := 9;
      window_label := '6-9 months';
    WHEN 4 THEN
      start_months := 9;
      end_months := 12;
      window_label := '9-12 months';
    WHEN 5 THEN
      start_months := 12;
      end_months := 15;
      window_label := '12-15 months';
    WHEN 6 THEN
      start_months := 15;
      end_months := 18;
      window_label := '15-18 months';
    WHEN 7 THEN
      start_months := 18;
      end_months := 21;
      window_label := '18-21 months';
    WHEN 8 THEN
      start_months := 21;
      end_months := 24;
      window_label := '21-24 months';
    ELSE
      -- Default to near future
      start_months := 0;
      end_months := 2;
      window_label := '0-2 months';
  END CASE;
  
  -- Calculate dates
  start_date := now_time + (start_months || ' months')::INTERVAL;
  end_date := now_time + (end_months || ' months')::INTERVAL;
  
  -- Format for Ticketmaster API: YYYY-MM-DDTHH:mm:ssZ (without milliseconds)
  start_date_time := TO_CHAR(start_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  end_date_time := TO_CHAR(end_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  window_name := window_label;
  
  RETURN QUERY SELECT start_date_time, end_date_time, window_name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_scheduler_time_window(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_scheduler_time_window(INT) TO service_role;
