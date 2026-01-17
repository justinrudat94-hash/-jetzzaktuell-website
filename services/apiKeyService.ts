import { supabase } from '@/lib/supabase';

export interface APIKey {
  id: string;
  service: string;
  key_name: string;
  masked_key: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;
}

export interface APIUsageLog {
  id: string;
  service: string;
  function_name: string;
  endpoint: string | null;
  request_tokens: number;
  response_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  execution_time_ms: number;
  status: 'success' | 'error' | 'rate_limited';
  error_message: string | null;
  created_at: string;
  metadata: any;
}

export interface APIUsageStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  rate_limited_requests: number;
  total_tokens: number;
  total_cost_usd: number;
  avg_execution_time_ms: number;
  by_service: Record<string, {
    requests: number;
    tokens: number;
    cost_usd: number;
  }>;
  daily_usage: Array<{
    date: string;
    requests: number;
    tokens: number;
    cost_usd: number;
  }>;
}

export const apiKeyService = {
  async getAllAPIKeys(): Promise<APIKey[]> {
    try {
      const { data, error } = await supabase.rpc('get_api_keys_for_admin');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching API keys:', error);
      return [];
    }
  },

  async getAPIKey(service: string): Promise<APIKey | null> {
    try {
      const keys = await this.getAllAPIKeys();
      return keys.find(k => k.service === service) || null;
    } catch (error) {
      console.error(`Error fetching API key for ${service}:`, error);
      return null;
    }
  },

  async getUsageStats(daysBack: number = 30, serviceFilter: string | null = null): Promise<APIUsageStats | null> {
    try {
      const { data, error } = await supabase.rpc('get_api_usage_stats', {
        days_back: daysBack,
        service_filter: serviceFilter,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      return null;
    }
  },

  async getRecentUsageLogs(limit: number = 50, service?: string): Promise<APIUsageLog[]> {
    try {
      let query = supabase
        .from('api_usage_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (service) {
        query = query.eq('service', service);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching usage logs:', error);
      return [];
    }
  },

  async getFailedRequests(limit: number = 50): Promise<APIUsageLog[]> {
    try {
      const { data, error } = await supabase
        .from('api_usage_logs')
        .select('*')
        .eq('status', 'error')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching failed requests:', error);
      return [];
    }
  },

  async getRateLimitedRequests(limit: number = 50): Promise<APIUsageLog[]> {
    try {
      const { data, error } = await supabase
        .from('api_usage_logs')
        .select('*')
        .eq('status', 'rate_limited')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching rate limited requests:', error);
      return [];
    }
  },

  async getServiceHealth(service: string): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    success_rate: number;
    avg_response_time: number;
    last_24h_requests: number;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('api_usage_logs')
        .select('status, execution_time_ms')
        .eq('service', service)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          status: 'healthy',
          success_rate: 100,
          avg_response_time: 0,
          last_24h_requests: 0,
        };
      }

      const successfulRequests = data.filter(r => r.status === 'success').length;
      const successRate = (successfulRequests / data.length) * 100;
      const avgResponseTime = data.reduce((sum, r) => sum + (r.execution_time_ms || 0), 0) / data.length;

      let status: 'healthy' | 'degraded' | 'down' = 'healthy';
      if (successRate < 50) {
        status = 'down';
      } else if (successRate < 95) {
        status = 'degraded';
      }

      return {
        status,
        success_rate: Math.round(successRate * 100) / 100,
        avg_response_time: Math.round(avgResponseTime),
        last_24h_requests: data.length,
      };
    } catch (error) {
      console.error(`Error getting service health for ${service}:`, error);
      return null;
    }
  },

  async getCostProjection(daysBack: number = 30): Promise<{
    current_monthly_cost: number;
    projected_monthly_cost: number;
    daily_average: number;
  } | null> {
    try {
      const stats = await this.getUsageStats(daysBack);
      if (!stats) return null;

      const dailyAverage = stats.total_cost_usd / daysBack;
      const projectedMonthlyCost = dailyAverage * 30;

      return {
        current_monthly_cost: stats.total_cost_usd,
        projected_monthly_cost: Math.round(projectedMonthlyCost * 100) / 100,
        daily_average: Math.round(dailyAverage * 100) / 100,
      };
    } catch (error) {
      console.error('Error calculating cost projection:', error);
      return null;
    }
  },

  async getTopExpensiveFunctions(limit: number = 10): Promise<Array<{
    function_name: string;
    total_cost: number;
    total_requests: number;
    avg_cost_per_request: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('api_usage_logs')
        .select('function_name, estimated_cost_usd')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const functionStats = new Map<string, { cost: number; requests: number }>();

      data?.forEach(log => {
        const current = functionStats.get(log.function_name) || { cost: 0, requests: 0 };
        functionStats.set(log.function_name, {
          cost: current.cost + (log.estimated_cost_usd || 0),
          requests: current.requests + 1,
        });
      });

      const result = Array.from(functionStats.entries())
        .map(([name, stats]) => ({
          function_name: name,
          total_cost: Math.round(stats.cost * 100) / 100,
          total_requests: stats.requests,
          avg_cost_per_request: Math.round((stats.cost / stats.requests) * 10000) / 10000,
        }))
        .sort((a, b) => b.total_cost - a.total_cost)
        .slice(0, limit);

      return result;
    } catch (error) {
      console.error('Error getting top expensive functions:', error);
      return [];
    }
  },

  getServiceDisplayName(service: string): string {
    const names: Record<string, string> = {
      openai: 'OpenAI',
      ticketmaster: 'Ticketmaster',
      eventbrite: 'Eventbrite',
    };
    return names[service] || service;
  },

  getServiceColor(service: string): string {
    const colors: Record<string, string> = {
      openai: '#10a37f',
      ticketmaster: '#026cdf',
      eventbrite: '#f05537',
    };
    return colors[service] || '#6366f1';
  },

  formatCost(cost: number): string {
    if (cost < 0.01) {
      return `$${(cost * 1000).toFixed(2)}‰`;
    }
    return `$${cost.toFixed(2)}`;
  },

  formatTokens(tokens: number): string {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(2)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  },
};
