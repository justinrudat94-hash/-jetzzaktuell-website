import { supabase } from '../lib/supabase';

export interface PremiumPlan {
  id: string;
  plan_type: 'monthly' | 'yearly';
  stripe_product_id: string;
  stripe_price_id: string;
  price_eur: number;
  currency: string;
  active: boolean;
}

export interface PremiumSubscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  plan_type: 'monthly' | 'yearly';
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing' | 'paused' | 'incomplete_expired' | 'unpaid';
  amount: number;
  currency: string;
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  is_paused: boolean;
  pause_start_date: string | null;
  pause_end_date: string | null;
  pause_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionStatus {
  isPremium: boolean;
  isActive: boolean;
  isTrialing: boolean;
  isPaused: boolean;
  isPastDue: boolean;
  canCreateEvents: boolean;
  subscription: PremiumSubscription | null;
  trialDaysRemaining: number | null;
}

class PremiumService {
  async getPlans(): Promise<PremiumPlan[]> {
    const { data, error } = await supabase
      .from('premium_plans')
      .select('*')
      .eq('active', true)
      .order('price_eur', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getUserSubscription(userId: string): Promise<PremiumSubscription | null> {
    const { data, error } = await supabase
      .from('premium_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async isPremiumUser(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('is_premium_user', { check_user_id: userId });

    if (error) {
      console.error('Error checking premium status:', error);
      return false;
    }

    return data || false;
  }

  async hasUserUsedTrial(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('user_has_used_trial', { check_user_id: userId });

    if (error) {
      console.error('Error checking trial usage:', error);
      return false;
    }

    return data || false;
  }

  async getTrialInfo(userId: string): Promise<{
    isInTrial: boolean;
    trialEndsAt: string | null;
    daysRemaining: number;
    hasUsedTrial: boolean;
  } | null> {
    const { data, error } = await supabase
      .rpc('get_trial_info', { check_user_id: userId })
      .maybeSingle();

    if (error) {
      console.error('Error getting trial info:', error);
      return null;
    }

    if (!data) {
      return {
        isInTrial: false,
        trialEndsAt: null,
        daysRemaining: 0,
        hasUsedTrial: false,
      };
    }

    return {
      isInTrial: data.is_in_trial,
      trialEndsAt: data.trial_ends_at,
      daysRemaining: data.days_remaining,
      hasUsedTrial: data.has_used_trial,
    };
  }

  async createSubscription(
    userId: string,
    stripeSubscriptionId: string,
    stripeCustomerId: string,
    planType: 'monthly' | 'yearly',
    currentPeriodStart: Date,
    currentPeriodEnd: Date
  ): Promise<PremiumSubscription> {
    const { data, error } = await supabase
      .from('premium_subscriptions')
      .insert({
        user_id: userId,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: stripeCustomerId,
        plan_type: planType,
        status: 'active',
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        cancel_at_period_end: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateSubscription(
    stripeSubscriptionId: string,
    updates: Partial<PremiumSubscription>
  ): Promise<PremiumSubscription> {
    const { data, error } = await supabase
      .from('premium_subscriptions')
      .update(updates)
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async cancelSubscription(
    stripeSubscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<PremiumSubscription> {
    const updates: Partial<PremiumSubscription> = {
      cancel_at_period_end: cancelAtPeriodEnd,
    };

    if (!cancelAtPeriodEnd) {
      updates.status = 'canceled';
    }

    return this.updateSubscription(stripeSubscriptionId, updates);
  }

  async getSubscriptionStats(): Promise<{
    total_premium_users: number;
    monthly_subscriptions: number;
    yearly_subscriptions: number;
    trial_subscriptions: number;
    active_paying_users: number;
    mrr: number;
  }> {
    const { data: subscriptions, error } = await supabase
      .from('premium_subscriptions')
      .select('plan_type, status')
      .in('status', ['active', 'trialing']);

    if (error) throw error;

    const activeOnly = subscriptions?.filter((s) => s.status === 'active') || [];
    const trialingOnly = subscriptions?.filter((s) => s.status === 'trialing') || [];

    const monthly = subscriptions?.filter((s) => s.plan_type === 'monthly').length || 0;
    const yearly = subscriptions?.filter((s) => s.plan_type === 'yearly').length || 0;
    const trials = trialingOnly.length;

    const { data: plans } = await supabase
      .from('premium_plans')
      .select('plan_type, price_eur')
      .eq('active', true);

    const monthlyPrice = plans?.find((p) => p.plan_type === 'monthly')?.price_eur || 4.99;
    const yearlyPrice = plans?.find((p) => p.plan_type === 'yearly')?.price_eur || 39.99;

    const monthlyActive = activeOnly.filter((s) => s.plan_type === 'monthly').length;
    const yearlyActive = activeOnly.filter((s) => s.plan_type === 'yearly').length;
    const mrr = monthlyActive * monthlyPrice + yearlyActive * (yearlyPrice / 12);

    return {
      total_premium_users: monthly + yearly,
      monthly_subscriptions: monthly,
      yearly_subscriptions: yearly,
      trial_subscriptions: trials,
      active_paying_users: activeOnly.length,
      mrr: Math.round(mrr * 100) / 100,
    };
  }

  async createCheckoutSession(userId: string, planType: 'monthly' | 'yearly'): Promise<string> {
    const { data, error } = await supabase.functions.invoke('create-premium-checkout', {
      body: { userId, plan: planType },
    });

    if (error) throw error;
    return data.url;
  }

  async updatePlanConfiguration(
    planType: 'monthly' | 'yearly',
    stripeProductId: string,
    stripePriceId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('premium_plans')
      .update({
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
      })
      .eq('plan_type', planType);

    if (error) throw error;
  }

  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      const { data: subscription, error } = await supabase
        .from('premium_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!subscription) {
        return {
          isPremium: false,
          isActive: false,
          isTrialing: false,
          isPaused: false,
          isPastDue: false,
          canCreateEvents: true,
          subscription: null,
          trialDaysRemaining: null,
        };
      }

      const isTrialing = subscription.status === 'trialing';
      const isActive = subscription.status === 'active' && !subscription.is_paused;
      const isPaused = subscription.is_paused;
      const isPastDue = subscription.status === 'past_due';
      const isPremium = (isActive || isTrialing) && !isPaused;
      const canCreateEvents = !isPastDue || !isPremium;

      let trialDaysRemaining = null;
      if (isTrialing && subscription.trial_end) {
        const trialEnd = new Date(subscription.trial_end);
        const now = new Date();
        const diffTime = trialEnd.getTime() - now.getTime();
        trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        isPremium,
        isActive,
        isTrialing,
        isPaused,
        isPastDue,
        canCreateEvents,
        subscription,
        trialDaysRemaining,
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      return {
        isPremium: false,
        isActive: false,
        isTrialing: false,
        isPaused: false,
        isPastDue: false,
        canCreateEvents: true,
        subscription: null,
        trialDaysRemaining: null,
      };
    }
  }

  async pauseSubscription(subscriptionId: string, reason?: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('pause-subscription', {
        body: { subscriptionId, reason },
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error('Error pausing subscription:', error);
      return false;
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('resume-subscription', {
        body: { subscriptionId },
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error('Error resuming subscription:', error);
      return false;
    }
  }

  async getPaymentHistory(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('stripe_invoices')
        .select('*')
        .eq('user_id', userId)
        .order('invoice_created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  }

  async getDunningStatus(userId: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('dunning_cases')
        .select('*, dunning_letters(*)')
        .eq('user_id', userId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching dunning status:', error);
      return null;
    }
  }

  getPlanPrice(planType: 'monthly' | 'yearly'): { amount: number; currency: string; formatted: string } {
    const prices = {
      monthly: { amount: 499, currency: 'EUR', formatted: '4,99 €' },
      yearly: { amount: 4999, currency: 'EUR', formatted: '49,99 €' },
    };
    return prices[planType];
  }

  formatAmount(amountInCents: number, currency: string = 'EUR'): string {
    const amount = amountInCents / 100;
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  calculateYearlySavings(): { amount: number; percentage: number; formatted: string } {
    const monthlyYearly = 499 * 12;
    const yearlyPrice = 4999;
    const savings = monthlyYearly - yearlyPrice;
    const percentage = Math.round((savings / monthlyYearly) * 100);

    return {
      amount: savings,
      percentage,
      formatted: this.formatAmount(savings),
    };
  }

  async cancelSubscriptionAtPeriodEnd(userId: string): Promise<boolean> {
    try {
      const { data: subscription } = await supabase
        .from('premium_subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (!subscription?.stripe_subscription_id) {
        throw new Error('No active subscription found');
      }

      const { data, error } = await supabase.functions.invoke('cancel-premium-subscription', {
        body: { subscriptionId: subscription.stripe_subscription_id, immediate: false },
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  async reactivateSubscription(userId: string): Promise<boolean> {
    try {
      const { data: subscription } = await supabase
        .from('premium_subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!subscription?.stripe_subscription_id) {
        throw new Error('No subscription found');
      }

      const { data, error } = await supabase.functions.invoke('reactivate-premium-subscription', {
        body: { subscriptionId: subscription.stripe_subscription_id },
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw error;
    }
  }
}

export const premiumService = new PremiumService();
