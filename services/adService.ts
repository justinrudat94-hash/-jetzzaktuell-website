import { supabase } from '@/lib/supabase';

export interface PartnerCampaign {
  id: string;
  partner_id: string;
  campaign_name: string;
  ad_type: 'banner' | 'interstitial' | 'rewarded' | 'stream_overlay' | 'sponsored_event';
  ad_content: {
    title?: string;
    description?: string;
    image_url?: string;
    click_url?: string;
    cta_text?: string;
  };
  target_category: string[] | null;
  target_city: string[] | null;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  active: boolean;
  partner?: {
    company_name: string;
    logo_url: string;
  };
}

export interface AdImpression {
  id: string;
  user_id: string;
  campaign_id: string;
  ad_type: string;
  ad_placement: string;
  clicked: boolean;
  created_at: string;
}

export const getActiveCampaigns = async (
  adType?: string,
  category?: string,
  city?: string
): Promise<PartnerCampaign[]> => {
  // Temporarily disabled - partner_campaigns table doesn't exist
  return [];
};

export const getRandomCampaign = async (
  adType: string,
  category?: string,
  city?: string
): Promise<PartnerCampaign | null> => {
  try {
    const campaigns = await getActiveCampaigns(adType, category, city);

    if (campaigns.length === 0) return null;

    const availableCampaigns = campaigns.filter(c => c.spent < c.budget);

    if (availableCampaigns.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * availableCampaigns.length);
    return availableCampaigns[randomIndex];
  } catch (error) {
    console.error('Error getting random campaign:', error);
    return null;
  }
};

export const trackAdImpression = async (
  campaignId: string,
  adType: string,
  adPlacement: string,
  clicked: boolean = false
): Promise<{ error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'Not authenticated' } };
    }

    const { error } = await supabase.rpc('track_ad_impression', {
      p_user_id: user.id,
      p_campaign_id: campaignId,
      p_ad_type: adType,
      p_ad_placement: adPlacement,
      p_clicked: clicked,
    });

    return { error };
  } catch (error) {
    console.error('Error tracking ad impression:', error);
    return { error };
  }
};

export const shouldShowInterstitial = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('user_ad_state')
      .select('clicks_since_last_ad, last_interstitial_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return false;

    if (data.clicks_since_last_ad >= 5) {
      return true;
    }

    if (data.last_interstitial_at) {
      const lastAd = new Date(data.last_interstitial_at);
      const now = new Date();
      const minutesSinceLastAd = (now.getTime() - lastAd.getTime()) / (1000 * 60);

      if (minutesSinceLastAd >= 10 && data.clicks_since_last_ad >= 3) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking interstitial:', error);
    return false;
  }
};

export const incrementAdClicks = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_ad_state')
      .update({
        clicks_since_last_ad: supabase.raw('clicks_since_last_ad + 1'),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
  } catch (error) {
    console.error('Error incrementing ad clicks:', error);
  }
};

export const resetAdClicks = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_ad_state')
      .update({
        clicks_since_last_ad: 0,
        last_interstitial_at: new Date().toISOString(),
        interstitial_count: supabase.raw('interstitial_count + 1'),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
  } catch (error) {
    console.error('Error resetting ad clicks:', error);
  }
};

export const canWatchRewardedAd = async (): Promise<{
  canWatch: boolean;
  remaining: number;
}> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { canWatch: false, remaining: 0 };
    }

    const { data, error } = await supabase
      .from('user_ad_state')
      .select('rewarded_ads_today, last_rewarded_ad_date')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) {
      return { canWatch: true, remaining: 5 };
    }

    const today = new Date().toISOString().split('T')[0];
    const lastAdDate = data.last_rewarded_ad_date;

    if (lastAdDate !== today) {
      return { canWatch: true, remaining: 5 };
    }

    const maxAdsPerDay = 5;
    const remaining = Math.max(0, maxAdsPerDay - data.rewarded_ads_today);

    return {
      canWatch: remaining > 0,
      remaining,
    };
  } catch (error) {
    console.error('Error checking rewarded ad availability:', error);
    return { canWatch: false, remaining: 0 };
  }
};

export const watchRewardedAd = async (): Promise<{ success: boolean; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: { message: 'Not authenticated' } };
    }

    const { data, error } = await supabase.rpc('award_rewarded_ad_coins', {
      p_user_id: user.id,
    });

    if (error) {
      return { success: false, error };
    }

    return { success: data, error: null };
  } catch (error) {
    console.error('Error watching rewarded ad:', error);
    return { success: false, error };
  }
};

export const insertAdPlaceholder = <T>(
  items: T[],
  frequency: number = 4,
  adType: string = 'banner'
): Array<T | { type: 'ad'; adType: string; position: number }> => {
  const result: Array<T | { type: 'ad'; adType: string; position: number }> = [];

  items.forEach((item, index) => {
    result.push(item);

    if ((index + 1) % frequency === 0 && index < items.length - 1) {
      result.push({
        type: 'ad',
        adType,
        position: index + 1,
      });
    }
  });

  return result;
};

export const getAdMetrics = async (campaignId: string): Promise<{
  impressions: number;
  clicks: number;
  ctr: number;
  spent: number;
}> => {
  // Temporarily disabled - partner_campaigns table doesn't exist
  return { impressions: 0, clicks: 0, ctr: 0, spent: 0 };
};
