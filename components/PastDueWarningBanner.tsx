import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertCircle, X, CreditCard } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/utils/authContext';
import { premiumService } from '@/services/premiumService';
import { useRouter } from 'expo-router';

export default function PastDueWarningBanner() {
  const { user } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [isPastDue, setIsPastDue] = useState(false);
  const [totalDue, setTotalDue] = useState(0);
  const [dunningLevel, setDunningLevel] = useState(0);

  useEffect(() => {
    if (user) {
      checkPaymentStatus();
    }
  }, [user]);

  const checkPaymentStatus = async () => {
    if (!user) return;

    try {
      const status = await premiumService.getSubscriptionStatus(user.id);

      if (status.isPastDue && status.subscription) {
        setIsPastDue(true);
        setVisible(true);

        const dunningStatus = await premiumService.getDunningStatus(user.id);
        if (dunningStatus) {
          setTotalDue(dunningStatus.total_amount);
          setDunningLevel(dunningStatus.dunning_level);
        }
      } else {
        setVisible(false);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  const handlePayNow = () => {
    router.push('/payment-required');
  };

  const handleUpdatePaymentMethod = async () => {
    try {
      const status = await premiumService.getSubscriptionStatus(user?.id || '');
      if (status.subscription?.stripe_customer_id) {
        const portalUrl = await premiumService.updatePaymentMethod(
          status.subscription.stripe_customer_id
        );
        await WebBrowser.openBrowserAsync(portalUrl);
      }
    } catch (error) {
      console.error('Error opening payment portal:', error);
    }
  };

  const getDunningMessage = (): string => {
    if (dunningLevel === 1) {
      return 'Ihre Zahlung ist fehlgeschlagen. Bitte aktualisieren Sie Ihre Zahlungsmethode.';
    } else if (dunningLevel === 2) {
      return '2. Mahnung: Bitte begleichen Sie Ihre offene Rechnung umgehend.';
    } else if (dunningLevel === 3) {
      return 'Letzte Mahnung: Ohne Zahlung erfolgt die Übergabe an ein Inkassobüro.';
    }
    return 'Ihre Zahlung ist fehlgeschlagen.';
  };

  if (!visible || !isPastDue) {
    return null;
  }

  return (
    <View
      style={[
        styles.banner,
        dunningLevel === 3 && styles.bannerUrgent,
        dunningLevel === 2 && styles.bannerWarning,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <AlertCircle
            size={20}
            color={dunningLevel === 3 ? '#fff' : dunningLevel === 2 ? '#92400e' : '#991b1b'}
          />
        </View>

        <View style={styles.textContainer}>
          <Text
            style={[
              styles.message,
              dunningLevel === 3 && styles.messageUrgent,
              dunningLevel === 2 && styles.messageWarning,
            ]}
          >
            {getDunningMessage()}
          </Text>
          {totalDue > 0 && (
            <Text
              style={[
                styles.amount,
                dunningLevel === 3 && styles.amountUrgent,
                dunningLevel === 2 && styles.amountWarning,
              ]}
            >
              Offener Betrag: {premiumService.formatAmount(totalDue)}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.payButton} onPress={handlePayNow}>
            <CreditCard size={16} color="#fff" />
            <Text style={styles.payButtonText}>Jetzt bezahlen</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.updateButton} onPress={handleUpdatePaymentMethod}>
            <Text style={styles.updateButtonText}>Zahlungsmethode</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fee2e2',
    borderBottomWidth: 2,
    borderBottomColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bannerWarning: {
    backgroundColor: '#fef3c7',
    borderBottomColor: '#f59e0b',
  },
  bannerUrgent: {
    backgroundColor: '#dc2626',
    borderBottomColor: '#991b1b',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 2,
  },
  messageWarning: {
    color: '#92400e',
  },
  messageUrgent: {
    color: '#fff',
  },
  amount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#dc2626',
  },
  amountWarning: {
    color: '#d97706',
  },
  amountUrgent: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  payButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  updateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  updateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});
