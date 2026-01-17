import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';

export interface AdCampaign {
  id: string;
  campaign_name: string;
  ad_type: 'banner' | 'interstitial' | 'rewarded';
  admob_ad_unit_id: string;
  platform: 'ios' | 'android' | 'web';
  active: boolean;
  created_at: string;
}

export interface AdImpression {
  id: string;
  campaign_id: string;
  user_id: string | null;
  ad_type: 'banner' | 'interstitial' | 'rewarded';
  platform: string;
  was_clicked: boolean;
  was_completed: boolean;
  revenue_eur: number;
  session_id: string;
  created_at: string;
}

export interface AdPerformance {
  ad_type: 'banner' | 'interstitial' | 'rewarded';
  impressions: number;
  clicks: number;
  ctr: number;
  ecpm: number;
  completions?: number;
  completion_rate?: number;
}

class AdTrackingService {
  private sessionId: string = '';
  private adFatigueMap: Map<string, number> = new Map();
  private readonly MAX_AD_REPEATS = 3;
  private lastInterstitialTime: number = 0;
  private interstitialEventCount: number = 0;

  constructor() {
    this.generateSessionId();
  }

  private generateSessionId(): void {
    this.sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getPlatform(): 'ios' | 'android' | 'web' {
    if (Platform.OS === 'ios') return 'ios';
    if (Platform.OS === 'android') return 'android';
    return 'web';
  }

  async getActiveCampaigns(
    adType?: 'banner' | 'interstitial' | 'rewarded'
  ): Promise<AdCampaign[]> {
    let query = supabase
      .from('ad_campaigns')
      .select('*')
      .eq('active', true)
      .eq('platform', this.getPlatform());

    if (adType) {
      query = query.eq('ad_type', adType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting campaigns:', error);
      return [];
    }

    return data || [];
  }

  async trackImpression(
    campaignId: string,
    userId: string | null,
    adType: 'banner' | 'interstitial' | 'rewarded'
  ): Promise<string | null> {
    const { data, error } = await supabase.rpc('track_ad_impression', {
      p_campaign_id: campaignId,
      p_user_id: userId,
      p_ad_type: adType,
      p_platform: this.getPlatform(),
      p_session_id: this.sessionId,
    });

    if (error) {
      console.error('Error tracking impression:', error);
      return null;
    }

    this.updateAdFatigue(campaignId);

    return data;
  }

  async trackClick(impressionId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('track_ad_click', {
      p_impression_id: impressionId,
    });

    if (error) {
      console.error('Error tracking click:', error);
      return false;
    }

    return data || false;
  }

  async trackRewardedCompletion(impressionId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('track_rewarded_completion', {
      p_impression_id: impressionId,
    });

    if (error) {
      console.error('Error tracking completion:', error);
      return false;
    }

    return data || false;
  }

  private updateAdFatigue(campaignId: string): void {
    const count = this.adFatigueMap.get(campaignId) || 0;
    this.adFatigueMap.set(campaignId, count + 1);
  }

  shouldShowAd(campaignId: string): boolean {
    const count = this.adFatigueMap.get(campaignId) || 0;
    return count < this.MAX_AD_REPEATS;
  }

  getAvailableCampaigns(campaigns: AdCampaign[]): AdCampaign[] {
    return campaigns.filter((campaign) => this.shouldShowAd(campaign.id));
  }

  resetAdFatigue(): void {
    this.adFatigueMap.clear();
    this.generateSessionId();
  }

  shouldShowInterstitial(): boolean {
    const now = Date.now();
    const timeSinceLastAd = now - this.lastInterstitialTime;
    const minTimeBetweenAds = 60000;

    if (timeSinceLastAd < minTimeBetweenAds) {
      return false;
    }

    this.interstitialEventCount++;

    const showInterval = Math.floor(Math.random() * 5) + 2;

    if (this.interstitialEventCount >= showInterval) {
      this.lastInterstitialTime = now;
      this.interstitialEventCount = 0;
      return true;
    }

    return false;
  }

  async getAdPerformance(
    startDate?: Date,
    endDate?: Date
  ): Promise<AdPerformance[]> {
    let query = supabase.from('ad_revenue_daily').select('*');

    if (startDate) {
      query = query.gte('date', startDate.toISOString().split('T')[0]);
    }

    if (endDate) {
      query = query.lte('date', endDate.toISOString().split('T')[0]);
    }

    const { data, error } = await query.order('date', { ascending: false }).limit(30);

    if (error) {
      console.error('Error getting ad performance:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const aggregated = data.reduce(
      (acc, day) => {
        acc.banner.impressions += day.banner_impressions || 0;
        acc.banner.clicks += day.banner_clicks || 0;
        acc.interstitial.impressions += day.interstitial_impressions || 0;
        acc.interstitial.clicks += day.interstitial_clicks || 0;
        acc.rewarded.impressions += day.rewarded_impressions || 0;
        acc.rewarded.completions += day.rewarded_completions || 0;
        return acc;
      },
      {
        banner: { impressions: 0, clicks: 0 },
        interstitial: { impressions: 0, clicks: 0 },
        rewarded: { impressions: 0, completions: 0 },
      }
    );

    const latestDay = data[0];

    return [
      {
        ad_type: 'banner',
        impressions: aggregated.banner.impressions,
        clicks: aggregated.banner.clicks,
        ctr: latestDay.banner_ctr || 0,
        ecpm: latestDay.banner_ecpm || 0,
      },
      {
        ad_type: 'interstitial',
        impressions: aggregated.interstitial.impressions,
        clicks: aggregated.interstitial.clicks,
        ctr: latestDay.interstitial_ctr || 0,
        ecpm: latestDay.interstitial_ecpm || 0,
      },
      {
        ad_type: 'rewarded',
        impressions: aggregated.rewarded.impressions,
        clicks: 0,
        ctr: 0,
        ecpm: latestDay.rewarded_ecpm || 0,
        completions: aggregated.rewarded.completions,
        completion_rate: latestDay.rewarded_completion_rate || 0,
      },
    ];
  }

  async getTotalImpressions(days: number = 30): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('ad_revenue_daily')
      .select('total_impressions')
      .gte('date', startDate.toISOString().split('T')[0]);

    if (error) {
      console.error('Error getting total impressions:', error);
      return 0;
    }

    return data?.reduce((sum, day) => sum + (day.total_impressions || 0), 0) || 0;
  }

  async getTotalClicks(days: number = 30): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('ad_revenue_daily')
      .select('total_clicks')
      .gte('date', startDate.toISOString().split('T')[0]);

    if (error) {
      console.error('Error getting total clicks:', error);
      return 0;
    }

    return data?.reduce((sum, day) => sum + (day.total_clicks || 0), 0) || 0;
  }

  async getAverageCTR(days: number = 30): Promise<number> {
    const impressions = await this.getTotalImpressions(days);
    const clicks = await this.getTotalClicks(days);

    if (impressions === 0) return 0;

    return (clicks / impressions) * 100;
  }
}

export const adTrackingService = new AdTrackingService();
