import { supabase } from '@/lib/supabase';

export interface DashboardStats {
  unread_alerts: number;
  pending_reports: number;
  flagged_content: number;
  suspicious_activities: number;
  total_users: number;
  active_livestreams: number;
  events_today: number;
  critical_alerts: number;
}

export interface EventSourceStats {
  source: string;
  total: number;
  upcoming: number;
  today: number;
  this_week: number;
  this_month: number;
}

export interface AdminAlert {
  id: string;
  alert_type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  severity: number;
  related_content_type?: string;
  related_content_id?: string;
  is_read: boolean;
  action_required: boolean;
  action_taken: boolean;
  created_at: string;
}

export interface AIContentAnalysis {
  id: string;
  content_type: 'event' | 'comment' | 'profile' | 'livestream';
  content_id: string;
  spam_score: number;
  toxicity_score: number;
  fake_score: number;
  quality_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommended_action?: string;
  analyzed_at: string;
}

export interface SuspiciousActivity {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  risk_score: number;
  pattern_detected?: string;
  is_investigated: boolean;
  detected_at: string;
}

export const dashboardService = {
  async getDashboardStats(): Promise<DashboardStats | null> {
    try {
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats');

      if (error) throw error;
      return data as DashboardStats;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return null;
    }
  },

  async getUnreadAlerts(limit: number = 10): Promise<AdminAlert[]> {
    try {
      const { data, error } = await supabase
        .from('admin_alerts')
        .select('*')
        .eq('is_read', false)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching unread alerts:', error);
      return [];
    }
  },

  async getCriticalAlerts(): Promise<AdminAlert[]> {
    try {
      const { data, error } = await supabase
        .from('admin_alerts')
        .select('*')
        .eq('alert_type', 'critical')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching critical alerts:', error);
      return [];
    }
  },

  async markAlertAsRead(alertId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('admin_alerts')
        .update({
          is_read: true,
          read_by: (await supabase.auth.getUser()).data.user?.id,
          read_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking alert as read:', error);
      return false;
    }
  },

  async getFlaggedContent(limit: number = 10): Promise<AIContentAnalysis[]> {
    try {
      const { data, error } = await supabase
        .from('ai_content_analysis')
        .select('*')
        .in('risk_level', ['high', 'critical'])
        .order('analyzed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching flagged content:', error);
      return [];
    }
  },

  async getSuspiciousActivities(limit: number = 10): Promise<SuspiciousActivity[]> {
    try {
      const { data, error } = await supabase
        .from('suspicious_activities')
        .select('*')
        .eq('is_investigated', false)
        .order('risk_score', { ascending: false })
        .order('detected_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching suspicious activities:', error);
      return [];
    }
  },

  async getRecentEdgeFunctionErrors(limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from('edge_function_logs')
        .select('*')
        .eq('status', 'error')
        .order('executed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching edge function errors:', error);
      return [];
    }
  },

  async getEventSourceStats(): Promise<EventSourceStats[]> {
    try {
      const { data, error } = await supabase.rpc('get_event_source_stats');

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      return (data || []).map(stat => ({
        source: stat.source,
        total: Number(stat.total),
        upcoming: Number(stat.upcoming),
        today: Number(stat.today),
        this_week: Number(stat.this_week),
        this_month: Number(stat.this_month),
      }));
    } catch (error) {
      console.error('Error fetching event source stats:', error);
      return [];
    }
  },

  async createAlert(
    alertType: 'critical' | 'warning' | 'info',
    title: string,
    message: string,
    severity: number = 1,
    relatedContentType?: string,
    relatedContentId?: string,
    actionRequired: boolean = false
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('create_admin_alert', {
        p_alert_type: alertType,
        p_title: title,
        p_message: message,
        p_severity: severity,
        p_related_content_type: relatedContentType,
        p_related_content_id: relatedContentId,
        p_action_required: actionRequired,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating alert:', error);
      return null;
    }
  },

  async logAIModeration(
    contentType: 'event' | 'comment' | 'profile' | 'livestream',
    contentId: string,
    aiDecision: 'approved' | 'flagged' | 'rejected' | 'needs_review',
    confidenceScore: number,
    detectedIssues: string[] = [],
    aiModel: string = 'gpt-4'
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from('ai_moderation_logs').insert({
        content_type: contentType,
        content_id: contentId,
        ai_decision: aiDecision,
        confidence_score: confidenceScore,
        detected_issues: detectedIssues,
        ai_model: aiModel,
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error logging AI moderation:', error);
      return false;
    }
  },

  async logSuspiciousActivity(
    userId: string,
    activityType: string,
    description: string,
    riskScore: number,
    patternDetected?: string,
    data?: any
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from('suspicious_activities').insert({
        user_id: userId,
        activity_type: activityType,
        description: description,
        risk_score: riskScore,
        pattern_detected: patternDetected,
        data: data,
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error logging suspicious activity:', error);
      return false;
    }
  },

  async getAllAlerts(
    filter: 'all' | 'unread' | 'critical' | 'action_required' = 'all',
    limit: number = 50
  ): Promise<AdminAlert[]> {
    try {
      let query = supabase
        .from('admin_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter === 'unread') {
        query = query.eq('is_read', false);
      } else if (filter === 'critical') {
        query = query.eq('alert_type', 'critical');
      } else if (filter === 'action_required') {
        query = query.eq('action_required', true).eq('action_taken', false);
      }

      query = query.limit(limit);

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  },

  async markAlertAsActionTaken(alertId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('admin_alerts')
        .update({
          action_taken: true,
          action_taken_by: (await supabase.auth.getUser()).data.user?.id,
          action_taken_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking alert action taken:', error);
      return false;
    }
  },

  async dismissAlert(alertId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('admin_alerts')
        .update({
          is_read: true,
          action_taken: true,
          read_by: (await supabase.auth.getUser()).data.user?.id,
          read_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error dismissing alert:', error);
      return false;
    }
  },

  async getUnreadAlertCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('admin_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread alert count:', error);
      return 0;
    }
  },
};
