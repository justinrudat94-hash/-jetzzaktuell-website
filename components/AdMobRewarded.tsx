import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Platform } from 'react-native';
import { Colors } from '../constants';
import Constants from 'expo-constants';
import { Gift } from 'lucide-react-native';
import { useAuth } from '../utils/authContext';
import { adTrackingService } from '../services/adTrackingService';
import { adFreeHoursService } from '../services/adFreeHoursService';

let RewardedAd: any, RewardedAdEventType: any, TestIds: any;
if (Platform.OS !== 'web') {
  const mobileAds = require('react-native-google-mobile-ads');
  RewardedAd = mobileAds.RewardedAd;
  RewardedAdEventType = mobileAds.RewardedAdEventType;
  TestIds = mobileAds.TestIds;
}

interface AdMobRewardedProps {
  onRewardEarned?: (reward: { hours: number; minutes: number }) => void;
  onAdFailedToLoad?: (error: string) => void;
}

const getAdUnitId = () => {
  if (Platform.OS === 'ios') {
    return Constants.expoConfig?.extra?.EXPO_PUBLIC_ADMOB_REWARDED_ID_IOS || (TestIds?.REWARDED || '');
  }
  return Constants.expoConfig?.extra?.EXPO_PUBLIC_ADMOB_REWARDED_ID_ANDROID || (TestIds?.REWARDED || '');
};

const __DEV__ = process.env.NODE_ENV === 'development';

let rewarded: any = null;
if (Platform.OS !== 'web' && RewardedAd) {
  rewarded = RewardedAd.createForAdRequest(__DEV__ ? TestIds.REWARDED : getAdUnitId());
}

export const AdMobRewarded: React.FC<AdMobRewardedProps> = ({
  onRewardEarned,
  onAdFailedToLoad,
}) => {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [impressionId, setImpressionId] = useState<string | null>(null);
  const [dailyStats, setDailyStats] = useState({
    remaining_ads: 0,
    can_earn_more: false,
  });

  useEffect(() => {
    if (!user) return;

    if (Platform.OS === 'web' || !rewarded) {
      return;
    }

    const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setIsReady(true);
      setIsLoading(false);
    });

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      async (reward: any) => {
        if (impressionId) {
          await handleAdCompleted(impressionId);
        }
      }
    );

    const unsubscribeClosed = rewarded.addAdEventListener(RewardedAdEventType.CLOSED, () => {
      setIsReady(false);
      loadAd();
    });

    const unsubscribeError = rewarded.addAdEventListener(RewardedAdEventType.ERROR, (error: any) => {
      console.error('Rewarded Ad Error:', error);
      setIsLoading(false);
      setIsReady(false);
      onAdFailedToLoad?.(error.message);
    });

    loadAd();
    loadDailyStats();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [user]);

  const loadDailyStats = async () => {
    if (!user) return;

    try {
      const stats = await adFreeHoursService.getUserAdFreeStats(user.id);
      setDailyStats({
        remaining_ads: stats.daily_remaining_ads,
        can_earn_more: stats.can_earn_more,
      });
    } catch (error) {
      console.error('Error loading daily stats:', error);
    }
  };

  const loadAd = async () => {
    try {
      const campaigns = await adTrackingService.getActiveCampaigns('rewarded');
      const availableCampaigns = adTrackingService.getAvailableCampaigns(campaigns);

      if (availableCampaigns.length > 0) {
        setCampaignId(availableCampaigns[0].id);

        if (Platform.OS !== 'web') {
          rewarded.load();
        } else {
          setIsReady(true);
        }
      } else {
        setIsReady(false);
        onAdFailedToLoad?.('No available campaigns');
      }
    } catch (error) {
      console.error('Error loading rewarded ad:', error);
      setIsReady(false);
      onAdFailedToLoad?.(String(error));
    }
  };

  const showAd = async () => {
    if (Platform.OS === 'web') {
      console.log('Rewarded ads not available on web');
      return;
    }

    if (!isReady || !campaignId || !user) {
      return;
    }

    try {
      setIsLoading(true);

      const impressionId = await adTrackingService.trackImpression(
        campaignId,
        user.id,
        'rewarded'
      );

      if (impressionId) {
        setImpressionId(impressionId);
      }

      await rewarded.show();

      setIsLoading(false);
    } catch (error) {
      console.error('Error showing rewarded ad:', error);
      setIsLoading(false);
      onAdFailedToLoad?.(String(error));
    }
  };

  const handleAdCompleted = async (adImpressionId: string) => {
    if (!user) return;

    try {
      await adTrackingService.trackRewardedCompletion(adImpressionId);

      const result = await adFreeHoursService.addHoursForRewardedAd(user.id);

      if (result.success) {
        const hoursAdded = result.hours_added || 0;
        const minutesAdded = Math.round(hoursAdded * 60);

        onRewardEarned?.({
          hours: hoursAdded,
          minutes: minutesAdded,
        });

        setShowRewardModal(true);

        await loadDailyStats();

        setTimeout(() => {
          setShowRewardModal(false);
          loadAd();
        }, 3000);
      }
    } catch (error) {
      console.error('Error processing reward:', error);
    }
  };

  if (!user || !dailyStats.can_earn_more) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.button, !isReady && styles.buttonDisabled]}
        onPress={showAd}
        disabled={!isReady || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Gift size={20} color="#fff" />
            <Text style={styles.buttonText}>Watch Ad for 10 min Ad-Free</Text>
            <Text style={styles.remainingText}>
              {dailyStats.remaining_ads} ads left today
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Modal visible={showRewardModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Gift size={48} color={Colors.primary} />
            <Text style={styles.modalTitle}>Reward Earned!</Text>
            <Text style={styles.modalText}>You earned 10 minutes of ad-free browsing!</Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  remainingText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    maxWidth: 320,
    gap: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modalText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
