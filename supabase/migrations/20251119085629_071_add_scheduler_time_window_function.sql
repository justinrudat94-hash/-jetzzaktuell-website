/*
  # Add Time Window Calculation Function

  1. New Functions
    - `calculate_scheduler_time_window`: Calculates startDateTime and endDateTime based on timeWindowIndex
    - Returns properly formatted dates for Ticketmaster API (YYYY-MM-DDTHH:mm:ssZ)
  
  2. Purpose
    - Enables backend scheduler to calculate different time windows
    - Rotates through 5 time windows: 0-2, 2-4, 4-6, 6-9, 9-12 months ahead
    - All time windows search only FUTURE events
*/

-- Function to calculate time window dates for Ticketmaster API
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
  
  -- Define time windows (in months ahead)
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
