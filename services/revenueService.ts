import { supabase } from '../lib/supabase';
import { adTrackingService, AdPerformance } from './adTrackingService';
import { premiumService } from './premiumService';

export interface DailyRevenue {
  date: string;
  admob_revenue: number;
  premium_revenue: number;
  total_revenue: number;
}

export interface RevenueMetrics {
  daily_revenue: {
    admob: number;
    premium: number;
    total: number;
  };
  monthly_revenue: {
    admob: number;
    premium: number;
    total: number;
  };
  revenue_trend: 'up' | 'down' | 'stable';
  trend_percentage: number;
}

export interface PremiumMetrics {
  total_users: number;
  premium_users: number;
  trial_users: number;
  active_paying_users: number;
  conversion_rate: number;
  mrr: number;
  monthly_subscriptions: number;
  yearly_subscriptions: number;
}

export interface LivestreamAdMetrics {
  total_streams: number;
  pre_roll_impressions: number;
  mid_roll_impressions: number;
  total_completions: number;
  total_skips: number;
  revenue_eur: number;
  avg_completion_rate: number;
}

export interface DashboardMetrics {
  revenue: RevenueMetrics;
  ad_performance: AdPerformance[];
  premium_stats: PremiumMetrics;
  livestream_ads: LivestreamAdMetrics;
  last_updated: string;
}

class RevenueService {
  async getDailyRevenue(date?: Date): Promise<DailyRevenue | null> {
    const targetDate = date || new Date();
    const dateString = targetDate.toISOString().split('T')[0];

    const [adRevenue, premiumRevenue] = await Promise.all([
      this.getAdRevenueForDate(dateString),
      this.getPremiumRevenueForDate(dateString),
    ]);

    return {
      date: dateString,
      admob_revenue: adRevenue,
      premium_revenue: premiumRevenue,
      total_revenue: adRevenue + premiumRevenue,
    };
  }

  private async getAdRevenueForDate(date: string): Promise<number> {
    const { data, error } = await supabase
      .from('ad_revenue_daily')
      .select('admob_revenue_eur')
      .eq('date', date)
      .maybeSingle();

    if (error) {
      console.error('Error getting ad revenue:', error);
      return 0;
    }

    return data?.admob_revenue_eur || 0;
  }

  private async getPremiumRevenueForDate(date: string): Promise<number> {
    const { data, error } = await supabase
      .from('premium_revenue_daily')
      .select('total_revenue_eur')
      .eq('date', date)
      .maybeSingle();

    if (error) {
      console.error('Error getting premium revenue:', error);
      return 0;
    }

    return data?.total_revenue_eur || 0;
  }

  async getMonthlyRevenue(month?: Date): Promise<DailyRevenue> {
    const targetMonth = month || new Date();
    const year = targetMonth.getFullYear();
    const monthNum = targetMonth.getMonth() + 1;
    const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];

    const [adRevenue, premiumRevenue] = await Promise.all([
      this.getAdRevenueForRange(startDate, endDate),
      this.getPremiumRevenueForRange(startDate, endDate),
    ]);

    return {
      date: startDate,
      admob_revenue: adRevenue,
      premium_revenue: premiumRevenue,
      total_revenue: adRevenue + premiumRevenue,
    };
  }

  private async getAdRevenueForRange(startDate: string, endDate: string): Promise<number> {
    const { data, error } = await supabase
      .from('ad_revenue_daily')
      .select('admob_revenue_eur')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('Error getting ad revenue range:', error);
      return 0;
    }

    return data?.reduce((sum, day) => sum + (day.admob_revenue_eur || 0), 0) || 0;
  }

  private async getPremiumRevenueForRange(startDate: string, endDate: string): Promise<number> {
    const { data, error } = await supabase
      .from('premium_revenue_daily')
      .select('total_revenue_eur')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('Error getting premium revenue range:', error);
      return 0;
    }

    return data?.reduce((sum, day) => sum + (day.total_revenue_eur || 0), 0) || 0;
  }

  async getRevenueMetrics(): Promise<RevenueMetrics> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [dailyToday, dailyYesterday, monthly] = await Promise.all([
      this.getDailyRevenue(today),
      this.getDailyRevenue(yesterday),
      this.getMonthlyRevenue(),
    ]);

    const todayTotal = dailyToday?.total_revenue || 0;
    const yesterdayTotal = dailyYesterday?.total_revenue || 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPercentage = 0;

    if (yesterdayTotal > 0) {
      trendPercentage = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
      if (trendPercentage > 5) trend = 'up';
      else if (trendPercentage < -5) trend = 'down';
    } else if (todayTotal > 0) {
      trend = 'up';
      trendPercentage = 100;
    }

    return {
      daily_revenue: {
        admob: dailyToday?.admob_revenue || 0,
        premium: dailyToday?.premium_revenue || 0,
        total: todayTotal,
      },
      monthly_revenue: {
        admob: monthly.admob_revenue,
        premium: monthly.premium_revenue,
        total: monthly.total_revenue,
      },
      revenue_trend: trend,
      trend_percentage: Math.round(trendPercentage * 10) / 10,
    };
  }

  async getPremiumMetrics(): Promise<PremiumMetrics> {
    const { data: totalUsersData } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const totalUsers = totalUsersData || 0;

    const subscriptionStats = await premiumService.getSubscriptionStats();

    const conversionRate =
      totalUsers > 0 ? (subscriptionStats.active_paying_users / totalUsers) * 100 : 0;

    return {
      total_users: totalUsers,
      premium_users: subscriptionStats.total_premium_users,
      trial_users: subscriptionStats.trial_subscriptions,
      active_paying_users: subscriptionStats.active_paying_users,
      conversion_rate: Math.round(conversionRate * 100) / 100,
      mrr: subscriptionStats.mrr,
      monthly_subscriptions: subscriptionStats.monthly_subscriptions,
      yearly_subscriptions: subscriptionStats.yearly_subscriptions,
    };
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [revenue, adPerformance, premiumStats, livestreamAds] = await Promise.all([
      this.getRevenueMetrics(),
      adTrackingService.getAdPerformance(),
      this.getPremiumMetrics(),
      this.getLivestreamAdMetrics(),
    ]);

    return {
      revenue,
      ad_performance: adPerformance,
      premium_stats: premiumStats,
      livestream_ads: livestreamAds,
      last_updated: new Date().toISOString(),
    };
  }

  async getLivestreamAdMetrics(days: number = 30): Promise<LivestreamAdMetrics> {
    const { data, error } = await supabase.rpc('get_livestream_ad_stats', {
      p_days: days,
    });

    if (error || !data || data.length === 0) {
      console.error('Error getting livestream ad stats:', error);
      return {
        total_streams: 0,
        pre_roll_impressions: 0,
        mid_roll_impressions: 0,
        total_completions: 0,
        total_skips: 0,
        revenue_eur: 0,
        avg_completion_rate: 0,
      };
    }

    const stats = data[0];
    return {
      total_streams: Number(stats.total_streams || 0),
      pre_roll_impressions: Number(stats.total_pre_roll_impressions || 0),
      mid_roll_impressions: Number(stats.total_mid_roll_impressions || 0),
      total_completions: Number(stats.total_completions || 0),
      total_skips: Number(stats.total_skips || 0),
      revenue_eur: Number(stats.total_revenue_cents || 0) / 100,
      avg_completion_rate: Number(stats.avg_completion_rate || 0),
    };
  }

  async getRevenueHistory(days: number = 30): Promise<DailyRevenue[]> {
    const history: DailyRevenue[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const revenue = await this.getDailyRevenue(date);
      if (revenue) {
        history.push(revenue);
      }
    }

    return history;
  }

  async calculateDailyStats(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const { error: adError } = await supabase.rpc('calculate_daily_ad_stats', {
      target_date: today,
    });

    if (adError) {
      console.error('Error calculating ad stats:', adError);
    }

    const { error: premiumError } = await supabase.rpc('calculate_daily_premium_stats', {
      target_date: today,
    });

    if (premiumError) {
      console.error('Error calculating premium stats:', premiumError);
    }
  }

  formatCurrency(amount: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }
}

export const revenueService = new RevenueService();
