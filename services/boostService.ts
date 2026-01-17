import { supabase } from '../lib/supabase';

export interface BoostOption {
  type: 'standard' | 'spotlight';
  duration: '24h' | '3days' | '7days' | '30days';
  coins: number;
  euros: number;
  label: string;
  durationLabel: string;
}

export interface BoostTransaction {
  id: string;
  event_id: string;
  user_id: string;
  boost_type: 'standard' | 'spotlight';
  boost_tier: string;
  duration_option: string;
  duration_hours: number;
  coins_spent: number;
  euros_equivalent: number;
  boost_radius_km: number | null;
  boost_priority: number;
  status: 'active' | 'expired' | 'canceled' | 'refunded';
  expires_at: string;
  created_at: string;
}

export interface BusinessSubscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  price_eur: number;
  currency: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  included_spotlight_used: boolean;
  additional_spotlights_count: number;
  created_at: string;
  updated_at: string;
}

class BoostService {

  getStandardBoostOptions(): BoostOption[] {
    return [
      {
        type: 'standard',
        duration: '24h',
        coins: 1000,
        euros: 1.00,
        label: '24 Stunden',
        durationLabel: '1 Tag'
      },
      {
        type: 'standard',
        duration: '3days',
        coins: 2500,
        euros: 2.50,
        label: '3 Tage',
        durationLabel: '3 Tage'
      },
      {
        type: 'standard',
        duration: '7days',
        coins: 5000,
        euros: 5.00,
        label: '7 Tage',
        durationLabel: '1 Woche'
      }
    ];
  }

  getSpotlightBoostOptions(): BoostOption[] {
    return [
      {
        type: 'spotlight',
        duration: '24h',
        coins: 25000,
        euros: 25.00,
        label: '24 Stunden',
        durationLabel: '1 Tag'
      },
      {
        type: 'spotlight',
        duration: '3days',
        coins: 75000,
        euros: 75.00,
        label: '3 Tage',
        durationLabel: '3 Tage'
      },
      {
        type: 'spotlight',
        duration: '7days',
        coins: 150000,
        euros: 150.00,
        label: '7 Tage',
        durationLabel: '1 Woche'
      },
      {
        type: 'spotlight',
        duration: '30days',
        coins: 600000,
        euros: 600.00,
        label: '30 Tage',
        durationLabel: '1 Monat'
      }
    ];
  }

  async boostEvent(
    eventId: string,
    userId: string,
    boostType: 'standard' | 'spotlight',
    durationOption: '24h' | '3days' | '7days' | '30days'
  ): Promise<any> {
    const { data, error } = await supabase.rpc('boost_event', {
      p_event_id: eventId,
      p_user_id: userId,
      p_boost_type: boostType,
      p_duration_option: durationOption
    });

    if (error) throw error;
    return data;
  }

  async getUserBoostTransactions(userId: string): Promise<BoostTransaction[]> {
    const { data, error } = await supabase
      .from('boost_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getEventBoostTransactions(eventId: string): Promise<BoostTransaction[]> {
    const { data, error } = await supabase
      .from('boost_transactions')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getActiveBoosts(userId: string): Promise<BoostTransaction[]> {
    const { data, error } = await supabase
      .from('boost_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('expires_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async checkBusinessSubscription(userId: string): Promise<BusinessSubscription | null> {
    const { data, error } = await supabase
      .from('spotlight_business_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async isBusinessUser(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_business')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking business status:', error);
      return false;
    }

    return data?.is_business || false;
  }

  async getPremiumBoostCredits(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('profiles')
      .select('boost_credits_remaining')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking premium boost credits:', error);
      return 0;
    }

    return data?.boost_credits_remaining || 0;
  }

  async getBoostPricing(
    userId: string,
    boostType: 'standard' | 'spotlight',
    duration: '24h' | '3days' | '7days' | '30days'
  ): Promise<{
    coins: number;
    euros: number;
    tier: string;
    isFree: boolean;
  }> {

    if (boostType === 'standard') {
      const options = this.getStandardBoostOptions();
      const option = options.find(o => o.duration === duration);

      if (!option) {
        throw new Error('Invalid standard boost duration');
      }

      if (duration === '7days') {
        const credits = await this.getPremiumBoostCredits(userId);
        if (credits > 0) {
          return {
            coins: 0,
            euros: 0,
            tier: 'standard_premium_free',
            isFree: true
          };
        }
      }

      return {
        coins: option.coins,
        euros: option.euros,
        tier: 'standard',
        isFree: false
      };
    }

    if (boostType === 'spotlight') {
      const businessSub = await this.checkBusinessSubscription(userId);

      if (businessSub) {
        if (!businessSub.included_spotlight_used) {
          return {
            coins: 0,
            euros: 0,
            tier: 'business_included',
            isFree: true
          };
        } else {
          return {
            coins: 349000,
            euros: 349.00,
            tier: 'business_additional',
            isFree: false
          };
        }
      }

      const options = this.getSpotlightBoostOptions();
      const option = options.find(o => o.duration === duration);

      if (!option) {
        throw new Error('Invalid spotlight boost duration');
      }

      return {
        coins: option.coins,
        euros: option.euros,
        tier: 'spotlight_standard',
        isFree: false
      };
    }

    throw new Error('Invalid boost type');
  }

  async getBoostedEvents(type?: 'standard' | 'spotlight'): Promise<any[]> {
    let query = supabase
      .from('events')
      .select('*')
      .eq('is_boosted', true)
      .gt('boost_expires_at', new Date().toISOString());

    if (type) {
      query = query.eq('boost_type', type);
    }

    query = query.order('boost_priority', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getHighlightEvents(): Promise<any[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_boosted', true)
      .eq('boost_type', 'spotlight')
      .gt('boost_expires_at', new Date().toISOString())
      .order('boost_priority', { ascending: false })
      .order('boosted_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  }

  async cancelBoost(eventId: string, userId: string): Promise<void> {
    const { error: eventError } = await supabase
      .from('events')
      .update({
        is_boosted: false,
        boost_type: null,
        boost_tier: null,
        boost_expires_at: null,
        boost_radius_km: null,
        boost_priority: 0
      })
      .eq('id', eventId)
      .eq('user_id', userId);

    if (eventError) throw eventError;

    const { error: transError } = await supabase
      .from('boost_transactions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('event_id', eventId)
      .eq('status', 'active');

    if (transError) throw transError;
  }

  formatTimeRemaining(expiresAt: string): string {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Abgelaufen';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  getBoostBadge(boostType: 'standard' | 'spotlight' | null, boostTier?: string): string {
    if (!boostType) return '';

    if (boostType === 'standard') {
      return '⭐';
    }

    if (boostType === 'spotlight') {
      if (boostTier?.includes('business')) {
        return '💎';
      }
      return '🔥';
    }

    return '';
  }
}

export const boostService = new BoostService();
