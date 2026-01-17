import { supabase } from '@/lib/supabase';

export interface SuspiciousUser {
  user_id: string;
  username: string;
  email: string;
  spam_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  detected_patterns: string[];
  activity_summary: {
    events_created_24h: number;
    comments_created_24h: number;
    reports_received: number;
    violation_count: number;
    account_age_days: number;
  };
  is_investigated: boolean;
  detected_at: string;
}

export interface ActivityPattern {
  pattern_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence: number;
}

export const spamDetectionService = {
  async analyzeUserActivity(userId: string): Promise<{
    spam_score: number;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    patterns: ActivityPattern[];
  }> {
    try {
      let spamScore = 0;
      const patterns: ActivityPattern[] = [];

      // Get user data
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return { spam_score: 0, risk_level: 'low', patterns: [] };
      }

      // Calculate account age
      const accountAge = Math.floor(
        (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check events created in last 24h
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', userId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (eventsCount && eventsCount > 10) {
        spamScore += 0.3;
        patterns.push({
          pattern_type: 'excessive_event_creation',
          severity: eventsCount > 20 ? 'critical' : 'high',
          description: `${eventsCount} Events in 24h erstellt`,
          confidence: 0.9,
        });
      }

      // Check comments created in last 24h
      const { count: commentsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (commentsCount && commentsCount > 50) {
        spamScore += 0.25;
        patterns.push({
          pattern_type: 'excessive_commenting',
          severity: commentsCount > 100 ? 'critical' : 'high',
          description: `${commentsCount} Kommentare in 24h erstellt`,
          confidence: 0.85,
        });
      }

      // Check for similar content (spam pattern)
      const { data: recentComments } = await supabase
        .from('comments')
        .select('content')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentComments && recentComments.length > 5) {
        const contents = recentComments.map(c => c.content.toLowerCase());
        const uniqueContents = new Set(contents);
        const similarityRatio = 1 - (uniqueContents.size / contents.length);

        if (similarityRatio > 0.7) {
          spamScore += 0.35;
          patterns.push({
            pattern_type: 'repetitive_content',
            severity: 'high',
            description: `${(similarityRatio * 100).toFixed(0)}% identische Inhalte`,
            confidence: 0.8,
          });
        }
      }

      // Check violation count
      if (user.violation_count > 3) {
        spamScore += 0.2;
        patterns.push({
          pattern_type: 'multiple_violations',
          severity: user.violation_count > 5 ? 'critical' : 'high',
          description: `${user.violation_count} Verstöße`,
          confidence: 1.0,
        });
      }

      // Check reports received
      if (user.reports_received_count > 5) {
        spamScore += 0.2;
        patterns.push({
          pattern_type: 'multiple_reports',
          severity: user.reports_received_count > 10 ? 'critical' : 'medium',
          description: `${user.reports_received_count} mal gemeldet`,
          confidence: 0.7,
        });
      }

      // Check new account with high activity
      if (accountAge < 7 && (eventsCount || 0) + (commentsCount || 0) > 20) {
        spamScore += 0.25;
        patterns.push({
          pattern_type: 'new_account_high_activity',
          severity: 'high',
          description: `Account ${accountAge} Tage alt mit hoher Aktivität`,
          confidence: 0.75,
        });
      }

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (spamScore >= 0.8) {
        riskLevel = 'critical';
      } else if (spamScore >= 0.6) {
        riskLevel = 'high';
      } else if (spamScore >= 0.4) {
        riskLevel = 'medium';
      } else {
        riskLevel = 'low';
      }

      return {
        spam_score: Math.min(1.0, spamScore),
        risk_level: riskLevel,
        patterns,
      };
    } catch (error) {
      console.error('Error analyzing user activity:', error);
      return { spam_score: 0, risk_level: 'low', patterns: [] };
    }
  },

  async getSuspiciousUsers(limit: number = 50): Promise<SuspiciousUser[]> {
    try {
      // Get users with high activity or violations
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .or('violation_count.gte.2,reports_received_count.gte.3')
        .order('violation_count', { ascending: false })
        .limit(limit);

      if (error || !users) {
        return [];
      }

      // Analyze each user
      const suspiciousUsers: SuspiciousUser[] = [];

      for (const user of users) {
        const analysis = await this.analyzeUserActivity(user.id);

        if (analysis.risk_level === 'medium' || analysis.risk_level === 'high' || analysis.risk_level === 'critical') {
          // Get activity counts
          const { count: eventsCount } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('creator_id', user.id)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

          const { count: commentsCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

          const accountAge = Math.floor(
            (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );

          suspiciousUsers.push({
            user_id: user.id,
            username: user.username || 'Unknown',
            email: user.email || 'N/A',
            spam_score: analysis.spam_score,
            risk_level: analysis.risk_level,
            detected_patterns: analysis.patterns.map(p => p.description),
            activity_summary: {
              events_created_24h: eventsCount || 0,
              comments_created_24h: commentsCount || 0,
              reports_received: user.reports_received_count || 0,
              violation_count: user.violation_count || 0,
              account_age_days: accountAge,
            },
            is_investigated: false,
            detected_at: new Date().toISOString(),
          });
        }
      }

      return suspiciousUsers.sort((a, b) => b.spam_score - a.spam_score);
    } catch (error) {
      console.error('Error getting suspicious users:', error);
      return [];
    }
  },

  async suspendUser(userId: string, reason: string, duration: number = 7): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_suspended: true,
          suspended_until: new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString(),
          suspension_reason: reason,
        })
        .eq('id', userId);

      if (error) throw error;

      // Create alert
      await supabase.from('admin_alerts').insert({
        alert_type: 'warning',
        title: 'Nutzer wegen Spam gesperrt',
        message: `User ${userId} wurde für ${duration} Tage gesperrt. Grund: ${reason}`,
        severity: 3,
        related_content_type: 'user',
        related_content_id: userId,
      });

      return true;
    } catch (error) {
      console.error('Error suspending user:', error);
      return false;
    }
  },

  async markAsInvestigated(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('suspicious_activities')
        .update({ is_investigated: true })
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking as investigated:', error);
      return false;
    }
  },

  getRiskLevelColor(riskLevel: string): string {
    switch (riskLevel) {
      case 'critical':
        return '#DC2626';
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F97316';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  },

  getRiskLevelLabel(riskLevel: string): string {
    switch (riskLevel) {
      case 'critical':
        return 'Kritisch';
      case 'high':
        return 'Hoch';
      case 'medium':
        return 'Mittel';
      case 'low':
        return 'Niedrig';
      default:
        return 'Unbekannt';
    }
  },
};
