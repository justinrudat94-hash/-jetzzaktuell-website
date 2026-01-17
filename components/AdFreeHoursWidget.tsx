import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing } from '../constants';
import { Clock, Gift, TrendingUp } from 'lucide-react-native';
import { useAuth } from '../utils/authContext';
import { adFreeHoursService } from '../services/adFreeHoursService';

interface AdFreeHoursWidgetProps {
  onWatchAd?: () => void;
}

export const AdFreeHoursWidget: React.FC<AdFreeHoursWidgetProps> = ({ onWatchAd }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    balance: 0,
    balance_display: '0m',
    daily_remaining_ads: 0,
    can_earn_more: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      const data = await adFreeHoursService.getUserAdFreeStats(user.id);
      setStats({
        balance: data.balance,
        balance_display: data.balance_display,
        daily_remaining_ads: data.daily_remaining_ads,
        can_earn_more: data.can_earn_more,
      });
    } catch (error) {
      console.error('Error loading ad-free hours stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || loading) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Clock size={20} color={Colors.primary} />
        <Text style={styles.title}>Ad-Free Time</Text>
      </View>

      <View style={styles.balanceSection}>
        <Text style={styles.balanceAmount}>{stats.balance_display}</Text>
        <Text style={styles.balanceLabel}>Available</Text>
      </View>

      {stats.can_earn_more && stats.daily_remaining_ads > 0 && (
        <TouchableOpacity style={styles.earnButton} onPress={onWatchAd}>
          <Gift size={16} color="#fff" />
          <Text style={styles.earnButtonText}>
            Watch Ad for 10 min ({stats.daily_remaining_ads} left today)
          </Text>
        </TouchableOpacity>
      )}

      {!stats.can_earn_more && (
        <View style={styles.limitReached}>
          <Text style={styles.limitText}>Daily limit reached (2h)</Text>
          <Text style={styles.limitSubtext}>Come back tomorrow to earn more!</Text>
        </View>
      )}

      <View style={styles.infoSection}>
        <TrendingUp size={16} color={Colors.textSecondary} />
        <Text style={styles.infoText}>1 rewarded ad = 10 minutes ad-free</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Spacing.lg,
    marginVertical: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  balanceSection: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  earnButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    marginTop: Spacing.md,
  },
  earnButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  limitReached: {
    backgroundColor: '#f3f4f6',
    padding: Spacing.md,
    borderRadius: 8,
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  limitText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  limitSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
