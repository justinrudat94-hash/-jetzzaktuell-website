import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';

const getEnvVar = (key: string): string => {
  return Constants.expoConfig?.extra?.[key] || process.env[`EXPO_PUBLIC_${key}`] || '';
};

export interface EventAnalysisResult {
  success: boolean;
  analysis: {
    spam_score: number;
    fake_score: number;
    quality_score: number;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    detected_patterns: string[];
    recommended_action: string;
    confidence: number;
  };
  processing_time_ms: number;
}

export interface ContentModerationResult {
  contentId: string;
  flagged: boolean;
  riskLevel: string;
  autoAction: string;
  flaggedCategories: string[];
  categoryScores: Record<string, number>;
}

export const aiModerationService = {
  async analyzeEvent(
    eventId: string,
    title: string,
    description: string,
    location?: string,
    category?: string
  ): Promise<EventAnalysisResult | null> {
    try {
      const supabaseUrl = getEnvVar('SUPABASE_URL');
      const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');

      const response = await fetch(
        `${supabaseUrl}/functions/v1/analyze-event`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId,
            title,
            description,
            location,
            category,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Event analysis failed:', error);
        return null;
      }

      const result = await response.json();
      return result as EventAnalysisResult;
    } catch (error) {
      console.error('Error analyzing event:', error);
      return null;
    }
  },

  async moderateContent(
    content: string,
    contentType: string,
    contentId: string
  ): Promise<ContentModerationResult | null> {
    try {
      const supabaseUrl = getEnvVar('SUPABASE_URL');
      const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');

      const response = await fetch(
        `${supabaseUrl}/functions/v1/moderate-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            contentType,
            contentId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Content moderation failed:', error);
        return null;
      }

      const result = await response.json();
      return result as ContentModerationResult;
    } catch (error) {
      console.error('Error moderating content:', error);
      return null;
    }
  },

  async getEventAnalysis(eventId: string) {
    try {
      const { data, error } = await supabase
        .from('ai_content_analysis')
        .select('*')
        .eq('content_type', 'event')
        .eq('content_id', eventId)
        .order('analyzed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching event analysis:', error);
      return null;
    }
  },

  async getAllFlaggedEvents(limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('ai_content_analysis')
        .select('*')
        .eq('content_type', 'event')
        .in('risk_level', ['high', 'critical'])
        .order('analyzed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching flagged events:', error);
      return [];
    }
  },

  async shouldAutoReject(analysis: EventAnalysisResult['analysis']): boolean {
    return (
      analysis.risk_level === 'critical' &&
      (analysis.spam_score >= 0.8 || analysis.fake_score >= 0.8) &&
      analysis.confidence >= 0.7
    );
  },

  async needsManualReview(analysis: EventAnalysisResult['analysis']): boolean {
    return (
      analysis.risk_level === 'high' ||
      (analysis.risk_level === 'medium' && analysis.confidence < 0.6)
    );
  },

  getRiskLevelColor(riskLevel: string): string {
    switch (riskLevel) {
      case 'critical':
        return '#EF4444';
      case 'high':
        return '#F97316';
      case 'medium':
        return '#F59E0B';
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

  getActionLabel(action: string): string {
    switch (action) {
      case 'reject':
        return 'Ablehnen';
      case 'needs_review':
        return 'Überprüfung erforderlich';
      case 'flag_for_monitoring':
        return 'Zur Überwachung markieren';
      case 'approve':
        return 'Freigeben';
      default:
        return 'Keine Aktion';
    }
  },

  async moderateLivestream(
    eventId: string,
    streamUrl: string,
    checkType: 'start' | 'ongoing' | 'report',
    reportReason?: string
  ) {
    try {
      const supabaseUrl = getEnvVar('SUPABASE_URL');
      const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');

      const response = await fetch(
        `${supabaseUrl}/functions/v1/moderate-livestream`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId,
            streamUrl,
            checkType,
            reportReason,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Livestream moderation failed:', error);
        return null;
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error moderating livestream:', error);
      return null;
    }
  },

  async getRecentAnalyses(limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('ai_content_analysis')
        .select('*')
        .order('analyzed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching analyses:', error);
      return [];
    }
  },

  async getAnalysisByType(contentType: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('ai_content_analysis')
        .select('*')
        .eq('content_type', contentType)
        .order('analyzed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching analyses by type:', error);
      return [];
    }
  },

  async getHighRiskContent(limit: number = 50) {
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
      console.error('Error fetching high-risk content:', error);
      return [];
    }
  },

  async getAIMetrics() {
    try {
      const { data, error } = await supabase
        .from('ai_metrics')
        .select('*')
        .order('recorded_at', { ascending: false})
        .limit(100);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching AI metrics:', error);
      return [];
    }
  },

  async moderateComment(
    commentId: string,
    userId: string,
    content: string,
    eventId?: string,
    parentCommentId?: string
  ) {
    try {
      const supabaseUrl = getEnvVar('SUPABASE_URL');
      const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');

      const response = await fetch(
        `${supabaseUrl}/functions/v1/moderate-comment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            commentId,
            userId,
            content,
            eventId,
            parentCommentId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Comment moderation failed:', error);
        return null;
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error moderating comment:', error);
      return null;
    }
  },

  getViolationSeverityLabel(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'Kritisch';
      case 'severe':
        return 'Schwer';
      case 'moderate':
        return 'Mittel';
      case 'minor':
        return 'Gering';
      default:
        return 'Kein Verstoß';
    }
  },

  getViolationSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return '#DC2626';
      case 'severe':
        return '#EF4444';
      case 'moderate':
        return '#F97316';
      case 'minor':
        return '#F59E0B';
      default:
        return '#10B981';
    }
  },

  getViolationTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      hate_speech: 'Hassrede',
      harassment: 'Belästigung',
      threats: 'Bedrohung',
      sexual_content: 'Sexueller Inhalt',
      violence: 'Gewalt',
      discrimination: 'Diskriminierung',
      spam: 'Spam',
      profanity: 'Vulgäre Sprache',
      misinformation: 'Fehlinformation',
      self_harm: 'Selbstverletzung',
    };
    return labels[type] || type;
  },
};
