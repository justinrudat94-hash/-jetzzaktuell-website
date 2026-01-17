import { useEffect, useState, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '../utils/authContext';
import { adTrackingService } from '../services/adTrackingService';
import { premiumService } from '../services/premiumService';
import { adFreeHoursService } from '../services/adFreeHoursService';

let InterstitialAd: any, AdEventType: any, TestIds: any;
if (Platform.OS !== 'web') {
  const mobileAds = require('react-native-google-mobile-ads');
  InterstitialAd = mobileAds.InterstitialAd;
  AdEventType = mobileAds.AdEventType;
  TestIds = mobileAds.TestIds;
}

interface UseInterstitialAdReturn {
  showInterstitial: () => Promise<void>;
  isReady: boolean;
  isLoading: boolean;
}

const getAdUnitId = () => {
  if (Platform.OS === 'ios') {
    return Constants.expoConfig?.extra?.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS || (TestIds?.INTERSTITIAL || '');
  }
  return Constants.expoConfig?.extra?.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_ANDROID || (TestIds?.INTERSTITIAL || '');
};

const __DEV__ = process.env.NODE_ENV === 'development';

let interstitial: any = null;
if (Platform.OS !== 'web' && InterstitialAd) {
  interstitial = InterstitialAd.createForAdRequest(__DEV__ ? TestIds.INTERSTITIAL : getAdUnitId());
}

export const useInterstitialAd = (): UseInterstitialAdReturn => {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const campaignIdRef = useRef<string | null>(null);
  const impressionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web' || !interstitial) {
      return;
    }

    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setIsReady(true);
      setIsLoading(false);
    });

    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setIsReady(false);
      interstitial.load();
    });

    const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, (error: any) => {
      console.error('Interstitial Ad Error:', error);
      setIsLoading(false);
      setIsReady(false);
    });

    loadAd();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [user]);

  const loadAd = async () => {
    try {
      if (!user) {
        setIsReady(true);
        return;
      }

      const [isPremium, hasAdFreeHours] = await Promise.all([
        premiumService.isPremiumUser(user.id),
        adFreeHoursService.isAdFreeActive(user.id),
      ]);

      if (isPremium || hasAdFreeHours) {
        setIsReady(false);
        return;
      }

      const campaigns = await adTrackingService.getActiveCampaigns('interstitial');
      const availableCampaigns = adTrackingService.getAvailableCampaigns(campaigns);

      if (availableCampaigns.length > 0) {
        campaignIdRef.current = availableCampaigns[0].id;

        if (Platform.OS !== 'web') {
          interstitial.load();
        }
      }
    } catch (error) {
      console.error('Error loading interstitial ad:', error);
      setIsReady(false);
    }
  };

  const showInterstitial = async () => {
    if (Platform.OS === 'web') {
      console.log('Interstitial ads not available on web');
      return;
    }

    if (!isReady || !campaignIdRef.current) {
      return;
    }

    if (!adTrackingService.shouldShowInterstitial()) {
      return;
    }

    try {
      setIsLoading(true);

      const impressionId = await adTrackingService.trackImpression(
        campaignIdRef.current,
        user?.id || null,
        'interstitial'
      );

      if (impressionId) {
        impressionIdRef.current = impressionId;
      }

      await interstitial.show();

      setIsLoading(false);
    } catch (error) {
      console.error('Error showing interstitial ad:', error);
      setIsLoading(false);
    }
  };

  return {
    showInterstitial,
    isReady,
    isLoading,
  };
};
