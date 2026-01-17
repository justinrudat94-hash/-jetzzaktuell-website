import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '../utils/authContext';
import { adTrackingService } from '../services/adTrackingService';
import { premiumService } from '../services/premiumService';
import { adFreeHoursService } from '../services/adFreeHoursService';

let BannerAd: any, BannerAdSize: any, TestIds: any;
if (Platform.OS !== 'web') {
  const mobileAds = require('react-native-google-mobile-ads');
  BannerAd = mobileAds.BannerAd;
  BannerAdSize = mobileAds.BannerAdSize;
  TestIds = mobileAds.TestIds;
}

interface AdMobBannerProps {
  position?: 'top' | 'bottom';
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: string) => void;
}

const getAdUnitId = () => {
  if (Platform.OS === 'ios') {
    return Constants.expoConfig?.extra?.EXPO_PUBLIC_ADMOB_BANNER_ID_IOS || (TestIds?.BANNER || '');
  }
  return Constants.expoConfig?.extra?.EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID || (TestIds?.BANNER || '');
};

const __DEV__ = process.env.NODE_ENV === 'development';

export const AdMobBanner: React.FC<AdMobBannerProps> = ({
  position = 'bottom',
  onAdLoaded,
  onAdFailedToLoad,
}) => {
  const { user } = useAuth();
  const [shouldShowAd, setShouldShowAd] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [impressionId, setImpressionId] = useState<string | null>(null);

  useEffect(() => {
    checkIfShouldShowAd();
  }, [user]);

  const checkIfShouldShowAd = async () => {
    if (!user) {
      setShouldShowAd(true);
      loadAd();
      return;
    }

    const [isPremium, hasAdFreeHours, isBusiness] = await Promise.all([
      premiumService.isPremiumUser(user.id),
      adFreeHoursService.isAdFreeActive(user.id),
      checkBusinessStatus(user.id),
    ]);

    if (isPremium || hasAdFreeHours || isBusiness) {
      setShouldShowAd(false);
      return;
    }

    setShouldShowAd(true);
    loadAd();
  };

  const checkBusinessStatus = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await import('../lib/supabase').then(m => m.supabase
        .from('profiles')
        .select('is_business')
        .eq('id', userId)
        .single()
      );

      if (error) {
        console.error('Error checking business status:', error);
        return false;
      }

      return data?.is_business || false;
    } catch (error) {
      console.error('Error checking business status:', error);
      return false;
    }
  };

  const loadAd = async () => {
    try {
      const campaigns = await adTrackingService.getActiveCampaigns('banner');
      const availableCampaigns = adTrackingService.getAvailableCampaigns(campaigns);

      if (availableCampaigns.length === 0) {
        onAdFailedToLoad?.('No available campaigns');
        return;
      }

      const campaign = availableCampaigns[0];
      setCampaignId(campaign.id);

      const impressionId = await adTrackingService.trackImpression(
        campaign.id,
        user?.id || null,
        'banner'
      );

      if (impressionId) {
        setImpressionId(impressionId);
        onAdLoaded?.();
      }
    } catch (error) {
      console.error('Error loading banner ad:', error);
      onAdFailedToLoad?.(String(error));
    }
  };

  const handleAdClick = async () => {
    if (impressionId) {
      await adTrackingService.trackClick(impressionId);
    }
  };

  if (!shouldShowAd) {
    return null;
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, position === 'top' ? styles.top : styles.bottom]}>
        <View style={styles.bannerPlaceholder}>
          <Text style={styles.webNotice}>AdMob is only available on iOS/Android</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, position === 'top' ? styles.top : styles.bottom]}>
      <BannerAd
        unitId={__DEV__ ? TestIds.BANNER : getAdUnitId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => {
          if (campaignId && impressionId) {
            handleAdClick();
          }
          onAdLoaded?.();
        }}
        onAdFailedToLoad={(error) => {
          console.error('AdMob Banner failed to load:', error);
          onAdFailedToLoad?.(error.message);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  bannerPlaceholder: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: '90%',
    height: 50,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  webNotice: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
});
