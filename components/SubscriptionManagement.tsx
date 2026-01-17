import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/utils/authContext';
import { CreditCard, Calendar, Pause, Play, XCircle, AlertTriangle } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants';

interface SubscriptionData {
  id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  plan_type: string;
  amount: number;
  currency: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  is_paused: boolean;
  pause_end_date: string | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  has_used_trial: boolean;
  canceled_at: string | null;
}

export default function SubscriptionManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      loadSubscription();
    }
  }, [user]);

  const loadSubscription = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('premium_subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error loading subscription:', error);
      Alert.alert('Fehler', 'Abo-Daten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const pauseSubscription = async () => {
    Alert.alert(
      'Abo pausieren',
      'Möchten Sie Ihr Abo für 1 Monat pausieren? Sie erhalten in dieser Zeit keine Premium-Features und werden nicht belastet.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Pausieren',
          onPress: async () => {
            try {
              setProcessing(true);

              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/pause-subscription`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
                  },
                  body: JSON.stringify({
                    subscriptionId: subscription!.stripe_subscription_id,
                    reason: 'User requested pause',
                  }),
                }
              );

              if (!response.ok) throw new Error('Failed to pause');

              const data = await response.json();

              Alert.alert(
                'Abo pausiert',
                `Ihr Abo wurde pausiert bis ${new Date(data.pauseUntil).toLocaleDateString('de-DE')}`,
                [{ text: 'OK', onPress: () => loadSubscription() }]
              );
            } catch (error) {
              console.error('Error pausing subscription:', error);
              Alert.alert('Fehler', 'Abo konnte nicht pausiert werden');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const resumeSubscription = async () => {
    Alert.alert(
      'Abo fortsetzen',
      'Möchten Sie Ihr Abo jetzt wieder aktivieren?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Fortsetzen',
          onPress: async () => {
            try {
              setProcessing(true);

              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/resume-subscription`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
                  },
                  body: JSON.stringify({
                    subscriptionId: subscription!.stripe_subscription_id,
                  }),
                }
              );

              if (!response.ok) throw new Error('Failed to resume');

              Alert.alert(
                'Abo aktiviert',
                'Ihr Abo wurde wieder aktiviert',
                [{ text: 'OK', onPress: () => loadSubscription() }]
              );
            } catch (error) {
              console.error('Error resuming subscription:', error);
              Alert.alert('Fehler', 'Abo konnte nicht aktiviert werden');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const cancelSubscription = async () => {
    Alert.alert(
      'Abo kündigen',
      'Möchten Sie Ihr Premium-Abo wirklich kündigen? Das Abo läuft noch bis zum Ende der aktuellen Abrechnungsperiode.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Kündigen',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);

              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/cancel-premium-subscription`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
                  },
                  body: JSON.stringify({
                    subscriptionId: subscription!.stripe_subscription_id,
                    immediate: false,
                  }),
                }
              );

              if (!response.ok) throw new Error('Failed to cancel');

              Alert.alert(
                'Abo gekündigt',
                'Ihr Abo wurde gekündigt und läuft bis zum Ende der aktuellen Periode',
                [{ text: 'OK', onPress: () => loadSubscription() }]
              );
            } catch (error) {
              console.error('Error cancelling subscription:', error);
              Alert.alert('Fehler', 'Kündigung fehlgeschlagen');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const reactivateSubscription = async () => {
    Alert.alert(
      'Abo reaktivieren',
      'Möchten Sie die Kündigung rückgängig machen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Reaktivieren',
          onPress: async () => {
            try {
              setProcessing(true);

              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/reactivate-premium-subscription`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
                  },
                  body: JSON.stringify({
                    subscriptionId: subscription!.stripe_subscription_id,
                  }),
                }
              );

              if (!response.ok) throw new Error('Failed to reactivate');

              Alert.alert(
                'Abo reaktiviert',
                'Ihr Abo läuft jetzt normal weiter',
                [{ text: 'OK', onPress: () => loadSubscription() }]
              );
            } catch (error) {
              console.error('Error reactivating subscription:', error);
              Alert.alert('Fehler', 'Reaktivierung fehlgeschlagen');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const openCustomerPortal = async () => {
    try {
      setProcessing(true);

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-customer-portal-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            customerId: subscription!.stripe_customer_id,
            returnUrl: window?.location?.href || undefined,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to create portal session');

      const data = await response.json();

      if (data.url) {
        await WebBrowser.openBrowserAsync(data.url);
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      Alert.alert('Fehler', 'Portal konnte nicht geöffnet werden');
    } finally {
      setProcessing(false);
    }
  };

  const formatAmount = (cents: number) => {
    return `${(cents / 100).toFixed(2)} €`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.success;
      case 'trialing': return Colors.info;
      case 'past_due': return Colors.error;
      case 'canceled': return Colors.textSecondary;
      case 'paused': return Colors.warning;
      default: return Colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'trialing': return 'Testphase';
      case 'past_due': return 'Zahlung ausstehend';
      case 'canceled': return 'Gekündigt';
      case 'paused': return 'Pausiert';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!subscription) {
    return (
      <View style={styles.container}>
        <Text style={styles.noSubText}>Kein aktives Abo</Text>
      </View>
    );
  }

  const isInTrial = subscription.trial_end_date && new Date(subscription.trial_end_date) > new Date();
  const trialDaysRemaining = isInTrial && subscription.trial_end_date
    ? Math.ceil((new Date(subscription.trial_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <View style={styles.container}>
      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: getStatusColor(subscription.status) + '20' }]}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(subscription.status) }]} />
        <Text style={[styles.statusText, { color: getStatusColor(subscription.status) }]}>
          {getStatusText(subscription.status)}
        </Text>
      </View>

      {/* Trial Info */}
      {isInTrial && (
        <View style={styles.trialBanner}>
          <Text style={styles.trialText}>
            {trialDaysRemaining} Tag{trialDaysRemaining !== 1 ? 'e' : ''} Testphase verbleibend
          </Text>
          <Text style={[styles.trialText, { fontSize: 12, marginTop: 4 }]}>
            Endet am {new Date(subscription.trial_end_date!).toLocaleDateString('de-DE')}
          </Text>
        </View>
      )}

      {/* Past Due Warning */}
      {subscription.status === 'past_due' && (
        <View style={styles.warningBanner}>
          <AlertTriangle size={20} color={Colors.error} />
          <Text style={styles.warningText}>
            Zahlung fehlgeschlagen. Bitte aktualisieren Sie Ihre Zahlungsmethode.
          </Text>
        </View>
      )}

      {/* Pause Info */}
      {subscription.is_paused && subscription.pause_end_date && (
        <View style={styles.pauseBanner}>
          <Text style={styles.pauseText}>
            Pausiert bis {new Date(subscription.pause_end_date).toLocaleDateString('de-DE')}
          </Text>
        </View>
      )}

      {/* Cancel Info */}
      {subscription.cancel_at_period_end && (
        <View style={styles.cancelBanner}>
          <Text style={styles.cancelText}>
            Läuft aus am {new Date(subscription.current_period_end).toLocaleDateString('de-DE')}
          </Text>
        </View>
      )}

      {/* Subscription Details */}
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Plan</Text>
          <Text style={styles.detailValue}>
            {subscription.plan_type === 'monthly' ? 'Monatlich' : 'Jährlich'}
          </Text>
        </View>

        {!isInTrial && subscription.amount && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Preis</Text>
            <Text style={styles.detailValue}>{formatAmount(subscription.amount)}</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{isInTrial ? 'Trial endet' : 'Nächste Zahlung'}</Text>
          <Text style={styles.detailValue}>
            {new Date(isInTrial ? subscription.trial_end_date! : subscription.current_period_end).toLocaleDateString('de-DE')}
          </Text>
        </View>

        {subscription.has_used_trial && !isInTrial && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Trial-Status</Text>
            <Text style={styles.detailValue}>Bereits genutzt</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {subscription.is_paused ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryAction, processing && styles.actionDisabled]}
            onPress={resumeSubscription}
            disabled={processing}
          >
            <Play size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Abo fortsetzen</Text>
          </TouchableOpacity>
        ) : subscription.status === 'active' && !subscription.cancel_at_period_end && (
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryAction, processing && styles.actionDisabled]}
            onPress={pauseSubscription}
            disabled={processing}
          >
            <Pause size={20} color={Colors.primary} />
            <Text style={[styles.actionButtonText, { color: Colors.primary }]}>
              Abo pausieren
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryAction, processing && styles.actionDisabled]}
          onPress={openCustomerPortal}
          disabled={processing}
        >
          <CreditCard size={20} color={Colors.primary} />
          <Text style={[styles.actionButtonText, { color: Colors.primary }]}>
            Zahlungsmethode ändern
          </Text>
        </TouchableOpacity>

        {subscription.cancel_at_period_end ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.successAction, processing && styles.actionDisabled]}
            onPress={reactivateSubscription}
            disabled={processing}
          >
            <Calendar size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Kündigung rückgängig machen</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerAction, processing && styles.actionDisabled]}
            onPress={cancelSubscription}
            disabled={processing}
          >
            <XCircle size={20} color="#f44336" />
            <Text style={[styles.actionButtonText, { color: '#f44336' }]}>
              Abo kündigen
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSubText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: Spacing.xl,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  trialBanner: {
    backgroundColor: Colors.info + '20',
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  trialText: {
    fontSize: 14,
    color: Colors.info,
    textAlign: 'center',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    flex: 1,
  },
  pauseBanner: {
    backgroundColor: Colors.warning + '20',
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  pauseText: {
    fontSize: 14,
    color: Colors.warning,
    textAlign: 'center',
    fontWeight: '600',
  },
  cancelBanner: {
    backgroundColor: '#f5f5f5',
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  cancelText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  actionsContainer: {
    gap: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: 8,
    gap: Spacing.sm,
  },
  primaryAction: {
    backgroundColor: Colors.primary,
  },
  secondaryAction: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  dangerAction: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  successAction: {
    backgroundColor: Colors.success,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
