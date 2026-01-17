/*
  # Fix get_tickets_by_folder Function
  
  1. Problem
    - Column reference "created_at" is ambiguous
    - Parameter names collide with column names in ORDER BY
  
  2. Solution
    - Rename parameter from folder_name to p_folder_name
    - Rename admin_id to p_admin_id
    - Use explicit table prefixes everywhere
*/

-- Drop and recreate the function with fixed parameter names
DROP FUNCTION IF EXISTS get_tickets_by_folder(text, uuid);

CREATE OR REPLACE FUNCTION get_tickets_by_folder(
  p_folder_name text,
  p_admin_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  subject text,
  description text,
  category text,
  priority text,
  status text,
  waiting_for text,
  is_favorite boolean,
  is_recurring boolean,
  created_at timestamptz,
  updated_at timestamptz,
  last_admin_response_at timestamptz,
  admin_read_at timestamptz,
  assigned_to uuid,
  unread_count integer,
  username text,
  user_email text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.id,
    st.user_id,
    st.subject,
    st.description,
    st.category,
    st.priority,
    st.status,
    st.waiting_for,
    st.is_favorite,
    st.is_recurring,
    st.created_at,
    st.updated_at,
    st.last_admin_response_at,
    st.admin_read_at,
    st.assigned_to,
    0 as unread_count,
    p.username,
    p.email as user_email
  FROM support_tickets st
  LEFT JOIN profiles p ON p.id = st.user_id
  WHERE
    CASE p_folder_name
      -- Neue Anfragen: offen + keine Admin-Antwort
      WHEN 'new' THEN
        st.status = 'open'
        AND st.last_admin_response_at IS NULL
        AND (p_admin_id IS NULL OR st.assigned_to IS NULL OR st.assigned_to = p_admin_id)

      -- Warte auf mich: Admin muss antworten
      WHEN 'waiting_admin' THEN
        st.waiting_for = 'admin'
        AND st.status NOT IN ('closed', 'resolved')
        AND (p_admin_id IS NULL OR st.assigned_to IS NULL OR st.assigned_to = p_admin_id)

      -- Warte auf User: User muss antworten
      WHEN 'waiting_user' THEN
        st.waiting_for = 'user'
        AND st.status NOT IN ('closed')
        AND (p_admin_id IS NULL OR st.assigned_to IS NULL OR st.assigned_to = p_admin_id)

      -- Favoriten: markiert + nicht geschlossen
      WHEN 'favorites' THEN
        st.is_favorite = true
        AND st.status != 'closed'
        AND (p_admin_id IS NULL OR st.assigned_to IS NULL OR st.assigned_to = p_admin_id)

      -- Geschlossen
      WHEN 'closed' THEN
        st.status = 'closed'
        AND (p_admin_id IS NULL OR st.assigned_to IS NULL OR st.assigned_to = p_admin_id)

      -- Alle (default)
      ELSE true
    END
  ORDER BY
    CASE p_folder_name
      WHEN 'new' THEN st.priority = 'urgent'
      WHEN 'waiting_admin' THEN st.priority = 'urgent'
      ELSE false
    END DESC,
    CASE p_folder_name
      WHEN 'new' THEN st.created_at
      WHEN 'waiting_admin' THEN COALESCE(
        (SELECT MAX(tr.created_at) FROM ticket_responses tr WHERE tr.ticket_id = st.id AND tr.is_admin_response = false),
        st.created_at
      )
      WHEN 'waiting_user' THEN st.last_admin_response_at
      WHEN 'favorites' THEN st.updated_at
      WHEN 'closed' THEN st.updated_at
      ELSE st.created_at
    END DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix get_folder_stats function
DROP FUNCTION IF EXISTS get_folder_stats(uuid);

CREATE OR REPLACE FUNCTION get_folder_stats(p_admin_id uuid DEFAULT NULL)
RETURNS TABLE (
  new_count integer,
  waiting_admin_count integer,
  waiting_user_count integer,
  favorites_count integer,
  closed_today_count integer,
  urgent_count integer,
  overdue_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Neue Anfragen
    (SELECT COUNT(*)::integer FROM support_tickets st
     WHERE st.status = 'open'
     AND st.last_admin_response_at IS NULL
     AND (p_admin_id IS NULL OR st.assigned_to IS NULL OR st.assigned_to = p_admin_id)
    ) as new_count,

    -- Warte auf mich
    (SELECT COUNT(*)::integer FROM support_tickets st
     WHERE st.waiting_for = 'admin'
     AND st.status NOT IN ('closed', 'resolved')
     AND (p_admin_id IS NULL OR st.assigned_to IS NULL OR st.assigned_to = p_admin_id)
    ) as waiting_admin_count,

    -- Warte auf User
    (SELECT COUNT(*)::integer FROM support_tickets st
     WHERE st.waiting_for = 'user'
     AND st.status != 'closed'
     AND (p_admin_id IS NULL OR st.assigned_to IS NULL OR st.assigned_to = p_admin_id)
    ) as waiting_user_count,

    -- Favoriten
    (SELECT COUNT(*)::integer FROM support_tickets st
     WHERE st.is_favorite = true
     AND st.status != 'closed'
     AND (p_admin_id IS NULL OR st.assigned_to IS NULL OR st.assigned_to = p_admin_id)
    ) as favorites_count,

    -- Heute geschlossen
    (SELECT COUNT(*)::integer FROM support_tickets st
     WHERE st.status = 'closed'
     AND DATE(st.updated_at) = CURRENT_DATE
     AND (p_admin_id IS NULL OR st.assigned_to IS NULL OR st.assigned_to = p_admin_id)
    ) as closed_today_count,

    -- Dringend (urgent priority)
    (SELECT COUNT(*)::integer FROM support_tickets st
     WHERE st.priority = 'urgent'
     AND st.status NOT IN ('closed', 'resolved')
     AND (p_admin_id IS NULL OR st.assigned_to IS NULL OR st.assigned_to = p_admin_id)
    ) as urgent_count,

    -- Überfällig (>4h keine Admin-Antwort bei waiting_admin)
    (SELECT COUNT(*)::integer FROM support_tickets st
     WHERE st.waiting_for = 'admin'
     AND st.status NOT IN ('closed', 'resolved')
     AND (
       (st.last_admin_response_at IS NULL AND st.created_at < now() - interval '4 hours')
       OR (st.last_admin_response_at IS NOT NULL AND
           EXISTS (
             SELECT 1 FROM ticket_responses tr
             WHERE tr.ticket_id = st.id
             AND tr.is_admin_response = false
             AND tr.created_at > st.last_admin_response_at
             AND tr.created_at < now() - interval '4 hours'
           )
       )
     )
     AND (p_admin_id IS NULL OR st.assigned_to IS NULL OR st.assigned_to = p_admin_id)
    ) as overdue_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
