import { supabase } from '../lib/supabase';

export interface AdFreeHours {
  id: string;
  user_id: string;
  hours_balance: number;
  daily_earned_hours: number;
  total_earned_hours: number;
  last_reset_date: string;
  created_at: string;
  updated_at: string;
}

export interface AdFreeTransaction {
  id: string;
  user_id: string;
  transaction_type: 'earn' | 'spend' | 'expire';
  hours_amount: number;
  source: string;
  description: string | null;
  created_at: string;
}

export interface AddHoursResult {
  success: boolean;
  message: string;
  hours_added?: number;
  new_balance?: number;
  daily_remaining?: number;
}

export interface ConsumeHoursResult {
  success: boolean;
  message: string;
  hours_consumed?: number;
  new_balance?: number;
  current_balance?: number;
}

class AdFreeHoursService {
  private readonly REWARDED_AD_HOURS = 0.167;
  private readonly DAILY_LIMIT_HOURS = 2.0;
  private readonly MAX_DAILY_ADS = 12;

  async getBalance(userId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_ad_free_balance', {
      check_user_id: userId,
    });

    if (error) {
      console.error('Error getting ad-free balance:', error);
      return 0;
    }

    return data || 0;
  }

  async getAdFreeHours(userId: string): Promise<AdFreeHours | null> {
    const { data, error } = await supabase
      .from('ad_free_hours')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error getting ad-free hours:', error);
      return null;
    }

    return data;
  }

  async addHoursForRewardedAd(userId: string): Promise<AddHoursResult> {
    const { data, error } = await supabase.rpc('add_ad_free_hours', {
      p_user_id: userId,
      p_hours: this.REWARDED_AD_HOURS,
      p_source: 'rewarded_ad',
      p_description: 'Watched rewarded ad (10 minutes)',
    });

    if (error) {
      console.error('Error adding ad-free hours:', error);
      return {
        success: false,
        message: 'Failed to add ad-free hours',
      };
    }

    return data;
  }

  async addBonusHours(userId: string, hours: number, description: string): Promise<AddHoursResult> {
    const { data, error } = await supabase.rpc('add_ad_free_hours', {
      p_user_id: userId,
      p_hours: hours,
      p_source: 'bonus',
      p_description: description,
    });

    if (error) {
      console.error('Error adding bonus hours:', error);
      return {
        success: false,
        message: 'Failed to add bonus hours',
      };
    }

    return data;
  }

  async consumeHours(userId: string, hours: number): Promise<ConsumeHoursResult> {
    const { data, error } = await supabase.rpc('consume_ad_free_hours', {
      p_user_id: userId,
      p_hours: hours,
    });

    if (error) {
      console.error('Error consuming ad-free hours:', error);
      return {
        success: false,
        message: 'Failed to consume ad-free hours',
      };
    }

    return data;
  }

  async canEarnMoreToday(userId: string): Promise<boolean> {
    const adFreeHours = await this.getAdFreeHours(userId);
    if (!adFreeHours) return true;

    return adFreeHours.daily_earned_hours < this.DAILY_LIMIT_HOURS;
  }

  async getDailyRemaining(userId: string): Promise<number> {
    const adFreeHours = await this.getAdFreeHours(userId);
    if (!adFreeHours) return this.DAILY_LIMIT_HOURS;

    return Math.max(0, this.DAILY_LIMIT_HOURS - adFreeHours.daily_earned_hours);
  }

  async getTransactions(
    userId: string,
    limit: number = 50
  ): Promise<AdFreeTransaction[]> {
    const { data, error } = await supabase
      .from('ad_free_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting transactions:', error);
      return [];
    }

    return data || [];
  }

  async isAdFreeActive(userId: string): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance > 0;
  }

  formatHoursToMinutes(hours: number): number {
    return Math.round(hours * 60);
  }

  formatHoursDisplay(hours: number): string {
    const totalMinutes = Math.round(hours * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    if (hrs > 0) {
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }
    return `${mins}m`;
  }

  async getUserAdFreeStats(userId: string): Promise<{
    balance: number;
    balance_minutes: number;
    balance_display: string;
    daily_earned: number;
    daily_remaining: number;
    daily_remaining_ads: number;
    total_earned: number;
    can_earn_more: boolean;
  }> {
    const adFreeHours = await this.getAdFreeHours(userId);

    if (!adFreeHours) {
      return {
        balance: 0,
        balance_minutes: 0,
        balance_display: '0m',
        daily_earned: 0,
        daily_remaining: this.DAILY_LIMIT_HOURS,
        daily_remaining_ads: this.MAX_DAILY_ADS,
        total_earned: 0,
        can_earn_more: true,
      };
    }

    const dailyRemaining = Math.max(0, this.DAILY_LIMIT_HOURS - adFreeHours.daily_earned_hours);
    const remainingAds = Math.floor(dailyRemaining / this.REWARDED_AD_HOURS);

    return {
      balance: adFreeHours.hours_balance,
      balance_minutes: this.formatHoursToMinutes(adFreeHours.hours_balance),
      balance_display: this.formatHoursDisplay(adFreeHours.hours_balance),
      daily_earned: adFreeHours.daily_earned_hours,
      daily_remaining: dailyRemaining,
      daily_remaining_ads: Math.min(remainingAds, this.MAX_DAILY_ADS),
      total_earned: adFreeHours.total_earned_hours,
      can_earn_more: dailyRemaining > 0,
    };
  }

  async getTotalUsersWithAdFreeHours(): Promise<number> {
    const { count, error } = await supabase
      .from('ad_free_hours')
      .select('*', { count: 'exact', head: true })
      .gt('hours_balance', 0);

    if (error) {
      console.error('Error counting ad-free users:', error);
      return 0;
    }

    return count || 0;
  }

  async getTotalAdFreeHoursDistributed(): Promise<number> {
    const { data, error } = await supabase
      .from('ad_free_hours')
      .select('total_earned_hours');

    if (error) {
      console.error('Error getting total hours:', error);
      return 0;
    }

    return data?.reduce((sum, record) => sum + record.total_earned_hours, 0) || 0;
  }
}

export const adFreeHoursService = new AdFreeHoursService();
