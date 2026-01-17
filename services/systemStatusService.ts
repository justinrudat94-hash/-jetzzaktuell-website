import { supabase } from '@/lib/supabase';

export interface EdgeFunctionStatus {
  name: string;
  status: 'online' | 'offline' | 'error';
  last_execution?: string;
  total_executions: number;
  success_rate: number;
  avg_execution_time: number;
}

export interface EmailQueueStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  recent_emails: EmailNotification[];
}

export interface EmailNotification {
  id: string;
  email_to: string;
  subject: string;
  notification_type: string;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
  sent_at?: string;
  retry_count: number;
  failed_reason?: string;
}

export interface PhoneVerificationStats {
  total_verifications: number;
  pending: number;
  verified: number;
  failed: number;
  recent_verifications: PhoneVerification[];
}

export interface PhoneVerification {
  id: string;
  user_id: string;
  phone_number: string;
  status: 'pending' | 'verified' | 'failed' | 'expired';
  created_at: string;
  verified_at?: string;
  attempts: number;
}

export interface SystemHealth {
  edge_functions: EdgeFunctionStatus[];
  email_queue: EmailQueueStats;
  phone_verifications: PhoneVerificationStats;
  api_keys_configured: {
    openai: boolean;
    resend: boolean;
  };
}

class SystemStatusService {
  async getEdgeFunctionStatus(): Promise<EdgeFunctionStatus[]> {
    try {
      const { data: logs, error } = await supabase
        .from('edge_function_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const functionNames = [
        'moderate-comment',
        'moderate-content',
        'moderate-livestream',
        'moderate-profile-picture',
        'send-email-notification',
        'process-report',
        'analyze-event',
      ];

      const functionStats: EdgeFunctionStatus[] = functionNames.map(name => {
        const functionLogs = logs?.filter(log => log.function_name === name) || [];
        const successLogs = functionLogs.filter(log => log.status === 'success');
        const totalExecutions = functionLogs.length;
        const successRate = totalExecutions > 0
          ? (successLogs.length / totalExecutions) * 100
          : 0;

        const avgTime = totalExecutions > 0
          ? functionLogs.reduce((acc, log) => acc + (log.execution_time_ms || 0), 0) / totalExecutions
          : 0;

        const lastExecution = functionLogs[0]?.created_at;
        const recentErrors = functionLogs.filter(
          log => log.status === 'error' &&
          new Date(log.created_at) > new Date(Date.now() - 10 * 60 * 1000)
        );

        let status: 'online' | 'offline' | 'error' = 'online';
        if (recentErrors.length > 3) {
          status = 'error';
        } else if (!lastExecution || new Date(lastExecution) < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
          status = 'offline';
        }

        return {
          name,
          status,
          last_execution: lastExecution,
          total_executions: totalExecutions,
          success_rate: Math.round(successRate),
          avg_execution_time: Math.round(avgTime),
        };
      });

      return functionStats;
    } catch (error) {
      console.error('Error getting edge function status:', error);
      return [];
    }
  }

  async getEmailQueueStats(): Promise<EmailQueueStats> {
    try {
      const { data: allEmails, error: allError } = await supabase
        .from('email_notifications_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (allError) throw allError;

      const { data: recentEmails, error: recentError } = await supabase
        .from('email_notifications_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentError) throw recentError;

      const pending = allEmails?.filter(e => e.status === 'pending').length || 0;
      const sent = allEmails?.filter(e => e.status === 'sent').length || 0;
      const failed = allEmails?.filter(e => e.status === 'failed').length || 0;

      return {
        total: allEmails?.length || 0,
        pending,
        sent,
        failed,
        recent_emails: recentEmails || [],
      };
    } catch (error) {
      console.error('Error getting email queue stats:', error);
      return {
        total: 0,
        pending: 0,
        sent: 0,
        failed: 0,
        recent_emails: [],
      };
    }
  }

  async getPhoneVerificationStats(): Promise<PhoneVerificationStats> {
    try {
      const { data: allVerifications, error: allError } = await supabase
        .from('phone_verifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (allError) throw allError;

      const { data: recentVerifications, error: recentError } = await supabase
        .from('phone_verifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentError) throw recentError;

      const pending = allVerifications?.filter(v => v.status === 'pending').length || 0;
      const verified = allVerifications?.filter(v => v.status === 'verified').length || 0;
      const failed = allVerifications?.filter(v => v.status === 'failed' || v.status === 'expired').length || 0;

      return {
        total_verifications: allVerifications?.length || 0,
        pending,
        verified,
        failed,
        recent_verifications: recentVerifications || [],
      };
    } catch (error) {
      console.error('Error getting phone verification stats:', error);
      return {
        total_verifications: 0,
        pending: 0,
        verified: 0,
        failed: 0,
        recent_verifications: [],
      };
    }
  }

  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const [edgeFunctions, emailQueue, phoneVerifications] = await Promise.all([
        this.getEdgeFunctionStatus(),
        this.getEmailQueueStats(),
        this.getPhoneVerificationStats(),
      ]);

      // Test API keys by checking if functions have recent successful executions
      const emailFunction = edgeFunctions.find(f => f.name === 'send-email-notification');
      const openaiFunction = edgeFunctions.find(f => f.name === 'moderate-profile-picture');

      return {
        edge_functions: edgeFunctions,
        email_queue: emailQueue,
        phone_verifications: phoneVerifications,
        api_keys_configured: {
          openai: openaiFunction ? openaiFunction.status !== 'error' : false,
          resend: emailFunction ? emailFunction.status !== 'error' : false,
        },
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      throw error;
    }
  }

  async retryFailedEmail(emailId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('email_notifications_queue')
        .update({
          status: 'pending',
          retry_count: 0,
        })
        .eq('id', emailId);

      return !error;
    } catch (error) {
      console.error('Error retrying email:', error);
      return false;
    }
  }

  async deleteFailedEmail(emailId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('email_notifications_queue')
        .delete()
        .eq('id', emailId);

      return !error;
    } catch (error) {
      console.error('Error deleting email:', error);
      return false;
    }
  }

  async resendVerificationSMS(verificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('phone_verifications')
        .update({
          status: 'pending',
          attempts: 0,
        })
        .eq('id', verificationId);

      return !error;
    } catch (error) {
      console.error('Error resending SMS:', error);
      return false;
    }
  }
}

export const systemStatusService = new SystemStatusService();
