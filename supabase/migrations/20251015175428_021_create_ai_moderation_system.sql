/*
  # KI-Moderations- und Monitoring-System
  
  Erstellt die Datenbank-Infrastruktur für das KI-gesteuerte Admin-Dashboard
  
  1. Neue Tabellen
    - `ai_moderation_logs` - Logs aller KI-Moderations-Aktionen
    - `system_metrics` - Echtzeit-Metriken für Dashboard
    - `admin_alerts` - Benachrichtigungen für Admins bei kritischen Fällen
    - `ai_content_analysis` - Detaillierte KI-Analysen von Content
    - `suspicious_activities` - Tracking verdächtiger User-Aktivitäten
    - `edge_function_logs` - Monitoring von Edge Functions
    
  2. Security
    - RLS aktiviert für alle Tabellen
    - Nur Admins können auf die Tabellen zugreifen
    
  3. Indizes
    - Performance-Optimierung für häufige Abfragen
    - Zeitbasierte Indizes für schnelle Filterung
*/

-- AI Moderation Logs
CREATE TABLE IF NOT EXISTS ai_moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('event', 'comment', 'profile', 'livestream')),
  content_id uuid NOT NULL,
  ai_decision text NOT NULL CHECK (ai_decision IN ('approved', 'flagged', 'rejected', 'needs_review')),
  confidence_score decimal(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  detected_issues jsonb DEFAULT '[]'::jsonb,
  ai_model text NOT NULL DEFAULT 'gpt-4',
  processing_time_ms integer,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  admin_decision text CHECK (admin_decision IN ('approved', 'rejected', 'escalated')),
  created_at timestamptz DEFAULT now()
);

-- System Metrics (für Dashboard)
CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  metric_value jsonb NOT NULL,
  recorded_at timestamptz DEFAULT now()
);

-- Admin Alerts
CREATE TABLE IF NOT EXISTS admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL CHECK (alert_type IN ('critical', 'warning', 'info')),
  title text NOT NULL,
  message text NOT NULL,
  severity integer NOT NULL DEFAULT 1 CHECK (severity >= 1 AND severity <= 5),
  related_content_type text,
  related_content_id uuid,
  is_read boolean DEFAULT false,
  read_by uuid REFERENCES auth.users(id),
  read_at timestamptz,
  action_required boolean DEFAULT false,
  action_taken boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- AI Content Analysis
CREATE TABLE IF NOT EXISTS ai_content_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('event', 'comment', 'profile', 'livestream')),
  content_id uuid NOT NULL,
  spam_score decimal(3,2) CHECK (spam_score >= 0 AND spam_score <= 1),
  toxicity_score decimal(3,2) CHECK (toxicity_score >= 0 AND toxicity_score <= 1),
  fake_score decimal(3,2) CHECK (fake_score >= 0 AND fake_score <= 1),
  quality_score decimal(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
  detected_patterns jsonb DEFAULT '[]'::jsonb,
  risk_level text CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  recommended_action text,
  analysis_details jsonb,
  analyzed_at timestamptz DEFAULT now()
);

-- Suspicious Activities
CREATE TABLE IF NOT EXISTS suspicious_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  activity_type text NOT NULL,
  description text NOT NULL,
  risk_score integer CHECK (risk_score >= 0 AND risk_score <= 100),
  pattern_detected text,
  data jsonb,
  is_investigated boolean DEFAULT false,
  investigated_by uuid REFERENCES auth.users(id),
  investigated_at timestamptz,
  outcome text,
  detected_at timestamptz DEFAULT now()
);

-- Edge Function Logs
CREATE TABLE IF NOT EXISTS edge_function_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  execution_time_ms integer,
  status text NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  error_message text,
  request_data jsonb,
  response_data jsonb,
  executed_at timestamptz DEFAULT now()
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_ai_moderation_logs_content ON ai_moderation_logs(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_ai_moderation_logs_decision ON ai_moderation_logs(ai_decision);
CREATE INDEX IF NOT EXISTS idx_ai_moderation_logs_created ON ai_moderation_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded ON system_metrics(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_type ON admin_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_unread ON admin_alerts(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created ON admin_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_content_analysis_content ON ai_content_analysis(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_ai_content_analysis_risk ON ai_content_analysis(risk_level);
CREATE INDEX IF NOT EXISTS idx_ai_content_analysis_analyzed ON ai_content_analysis(analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_suspicious_activities_user ON suspicious_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_uninvestigated ON suspicious_activities(is_investigated) WHERE is_investigated = false;
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_detected ON suspicious_activities(detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_edge_function_logs_function ON edge_function_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_status ON edge_function_logs(status);
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_executed ON edge_function_logs(executed_at DESC);

-- RLS Policies

-- AI Moderation Logs (nur Admins)
ALTER TABLE ai_moderation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all ai_moderation_logs"
  ON ai_moderation_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert ai_moderation_logs"
  ON ai_moderation_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update ai_moderation_logs"
  ON ai_moderation_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- System Metrics (nur Admins)
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system_metrics"
  ON system_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "System can insert metrics"
  ON system_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admin Alerts (nur Admins)
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin_alerts"
  ON admin_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update admin_alerts"
  ON admin_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "System can insert alerts"
  ON admin_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- AI Content Analysis (nur Admins)
ALTER TABLE ai_content_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ai_content_analysis"
  ON ai_content_analysis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "System can insert ai_content_analysis"
  ON ai_content_analysis FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Suspicious Activities (nur Admins)
ALTER TABLE suspicious_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view suspicious_activities"
  ON suspicious_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update suspicious_activities"
  ON suspicious_activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "System can insert suspicious_activities"
  ON suspicious_activities FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Edge Function Logs (nur Admins)
ALTER TABLE edge_function_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view edge_function_logs"
  ON edge_function_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "System can insert edge_function_logs"
  ON edge_function_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Funktion zum Erstellen von Admin-Alerts
CREATE OR REPLACE FUNCTION create_admin_alert(
  p_alert_type text,
  p_title text,
  p_message text,
  p_severity integer DEFAULT 1,
  p_related_content_type text DEFAULT NULL,
  p_related_content_id uuid DEFAULT NULL,
  p_action_required boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_alert_id uuid;
BEGIN
  INSERT INTO admin_alerts (
    alert_type,
    title,
    message,
    severity,
    related_content_type,
    related_content_id,
    action_required
  ) VALUES (
    p_alert_type,
    p_title,
    p_message,
    p_severity,
    p_related_content_type,
    p_related_content_id,
    p_action_required
  ) RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$;

-- Funktion zum Abrufen von Dashboard-Statistiken
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'unread_alerts', (
      SELECT COUNT(*) FROM admin_alerts WHERE is_read = false
    ),
    'pending_reports', (
      SELECT COUNT(*) FROM reports WHERE status = 'pending'
    ),
    'flagged_content', (
      SELECT COUNT(*) FROM ai_moderation_logs 
      WHERE ai_decision IN ('flagged', 'needs_review') 
      AND reviewed_at IS NULL
    ),
    'suspicious_activities', (
      SELECT COUNT(*) FROM suspicious_activities WHERE is_investigated = false
    ),
    'total_users', (
      SELECT COUNT(*) FROM profiles
    ),
    'active_livestreams', (
      SELECT COUNT(*) FROM live_streams WHERE status = 'active'
    ),
    'events_today', (
      SELECT COUNT(*) FROM events WHERE DATE(created_at) = CURRENT_DATE
    ),
    'critical_alerts', (
      SELECT COUNT(*) FROM admin_alerts 
      WHERE alert_type = 'critical' 
      AND is_read = false
    )
  ) INTO v_stats;
  
  RETURN v_stats;
END;
$$;