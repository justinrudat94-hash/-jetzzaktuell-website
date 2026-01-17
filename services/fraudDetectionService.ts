import { supabase } from '@/lib/supabase';

export interface FraudAlert {
  id: string;
  user_id: string;
  alert_type: 'fast_payout' | 'chargeback_risk' | 'multi_account' | 'geo_conflict' | 'suspicious_pattern' | 'high_amount' | 'new_account_payout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  score_impact: number;
  details: any;
  status: 'active' | 'resolved' | 'false_positive';
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  profiles?: {
    name: string;
    email: string;
    avatar_url: string;
  };
}

export const calculateFraudScore = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('calculate_fraud_score', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error calculating fraud score:', error);
      return 0;
    }
    return data || 0;
  } catch (error) {
    console.error('Error calculating fraud score:', error);
    return 0;
  }
};

export const getFraudAlerts = async (filters: { user_id?: string; status?: string; severity?: string; limit?: number } = {}): Promise<FraudAlert[]> => {
  try {
    let query = supabase
      .from('fraud_alerts')
      .select('*, profiles!fraud_alerts_user_id_fkey(name, email, avatar_url)')
      .order('created_at', { ascending: false });

    if (filters.user_id) query = query.eq('user_id', filters.user_id);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.severity) query = query.eq('severity', filters.severity);
    if (filters.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching fraud alerts:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching fraud alerts:', error);
    return [];
  }
};

export const getFraudStatistics = async (): Promise<{
  total_active_alerts: number;
  by_severity: { [key: string]: number };
  by_type: { [key: string]: number };
  high_risk_users: number;
}> => {
  try {
    const alerts = await getFraudAlerts({ status: 'active' });

    const bySeverity: { [key: string]: number } = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const byType: { [key: string]: number } = {};

    alerts.forEach((alert) => {
      bySeverity[alert.severity]++;
      byType[alert.alert_type] = (byType[alert.alert_type] || 0) + 1;
    });

    const { data: highRiskUsers } = await supabase
      .from('payout_requests')
      .select('user_id')
      .gte('fraud_score', 50)
      .eq('status', 'pending');

    const uniqueHighRiskUsers = new Set(highRiskUsers?.map((p) => p.user_id) || []);

    return {
      total_active_alerts: alerts.length,
      by_severity: bySeverity,
      by_type: byType,
      high_risk_users: uniqueHighRiskUsers.size,
    };
  } catch (error) {
    console.error('Error fetching fraud statistics:', error);
    return {
      total_active_alerts: 0,
      by_severity: {},
      by_type: {},
      high_risk_users: 0,
    };
  }
};

export const getRiskLevelEmoji = (riskLevel: string): string => {
  const emojis: { [key: string]: string } = {
    low: '🟢',
    medium: '🟡',
    high: '🔴',
    critical: '🚨',
  };
  return emojis[riskLevel] || '⚪';
};
