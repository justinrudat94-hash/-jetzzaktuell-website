import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/utils/authContext';
import { router } from 'expo-router';
import { CreditCard, AlertTriangle, Pause, X } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants';

interface SubscriptionData {
  id: string;
  stripe_subscription_id: string;
  status: string;
  plan: string;
  amount: number;
  currency: string;
  current_period_end: string;
  is_paused: boolean;
}

interface PaymentRetry {
  attempt_number: number;
  next_retry_at: string | null;
  failure_message: string;
}

interface DunningCase {
  dunning_level: number;
  total_amount: number;
  next_action_date: string | null;
}

export default function PaymentRequiredPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [paymentRetry, setPaymentRetry] = useState<PaymentRetry | null>(null);
  const [dunningCase, setDunningCase] = useState<DunningCase | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
    }
  }, [user]);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);

      // Load subscription
      const { data: subData, error: subError } = await supabase
        .from('premium_subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (subError) throw subError;
      setSubscription(subData);

      // If not past_due, redirect away
      if (subData.status !== 'past_due') {
        router.replace('/profile');
        return;
      }

      // Load latest payment retry info
      const { data: retryData } = await supabase
        .from('payment_retry_log')
        .select('*')
        .eq('subscription_id', subData.id)
        .order('attempted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setPaymentRetry(retryData);

      // Load dunning case if exists
      const { data: dunningData } = await supabase
        .from('dunning_cases')
        .select('dunning_level, total_amount, next_action_date')
        .eq('subscription_id', subData.id)
        .eq('status', 'open')
        .maybeSingle();

      setDunningCase(dunningData);

    } catch (error) {
      console.error('Error loading subscription data:', error);
      Alert.alert('Fehler', 'Daten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const openPaymentUpdate = async () => {
    try {
      setUpdating(true);

      // Get Stripe invoice with payment link
      const { data: invoice } = await supabase
        .from('stripe_invoices')
        .select('hosted_invoice_url')
        .eq('subscription_id', subscription!.id)
        .order('invoice_created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (invoice?.hosted_invoice_url) {
        await Linking.openURL(invoice.hosted_invoice_url);
      } else {
        Alert.alert('Fehler', 'Zahlungslink nicht verfügbar');
      }
    } catch (error) {
      console.error('Error opening payment:', error);
      Alert.alert('Fehler', 'Zahlungslink konnte nicht geöffnet werden');
    } finally {
      setUpdating(false);
    }
  };

  const pauseSubscription = async () => {
    Alert.alert(
      'Abo pausieren',
      'Möchten Sie Ihr Abo für 1 Monat pausieren? Sie können es jederzeit wieder aktivieren.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Pausieren',
          onPress: async () => {
            try {
              setUpdating(true);

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
                    reason: 'User requested pause from payment required page',
                  }),
                }
              );

              if (!response.ok) throw new Error('Failed to pause');

              Alert.alert(
                'Abo pausiert',
                'Ihr Abo wurde für 1 Monat pausiert',
                [{ text: 'OK', onPress: () => router.replace('/profile') }]
              );
            } catch (error) {
              console.error('Error pausing subscription:', error);
              Alert.alert('Fehler', 'Abo konnte nicht pausiert werden');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const cancelSubscription = async () => {
    Alert.alert(
      'Abo kündigen',
      'Möchten Sie Ihr Abo wirklich kündigen? Das Abo läuft noch bis zum Ende der aktuellen Abrechnungsperiode.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Kündigen',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);

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
                'Ihr Abo wurde gekündigt und läuft bis zum Periodenende',
                [{ text: 'OK', onPress: () => router.replace('/profile') }]
              );
            } catch (error) {
              console.error('Error cancelling subscription:', error);
              Alert.alert('Fehler', 'Kündigung fehlgeschlagen');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const formatAmount = (cents: number) => {
    return `${(cents / 100).toFixed(2)} €`;
  };

  const getDaysUntilNextRetry = () => {
    if (!paymentRetry?.next_retry_at) return null;
    const nextRetry = new Date(paymentRetry.next_retry_at);
    const now = new Date();
    const diffDays = Math.ceil((nextRetry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getDunningLevelText = (level: number) => {
    switch (level) {
      case 1: return '1. Mahnung wurde versendet';
      case 2: return '2. Mahnung wurde versendet';
      case 3: return '3. Mahnung - Inkasso-Androhung';
      default: return '';
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
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Kein Abo gefunden</Text>
      </View>
    );
  }

  const daysUntilRetry = getDaysUntilNextRetry();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <AlertTriangle size={48} color={Colors.error} />
        <Text style={styles.title}>Zahlung fehlgeschlagen</Text>
        <Text style={styles.subtitle}>
          Ihre letzte Zahlung konnte nicht durchgeführt werden
        </Text>
      </View>

      {/* Dunning Warning */}
      {dunningCase && (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>⚠️ Mahnstufe {dunningCase.dunning_level}</Text>
          <Text style={styles.warningText}>{getDunningLevelText(dunningCase.dunning_level)}</Text>
          <Text style={styles.warningAmount}>
            Offener Betrag: {formatAmount(dunningCase.total_amount)}
          </Text>
          {dunningCase.dunning_level === 3 && (
            <Text style={styles.warningUrgent}>
              Bei ausbleibender Zahlung wird der Fall an ein Inkassobüro übergeben!
            </Text>
          )}
        </View>
      )}

      {/* Payment Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Offener Betrag</Text>
        <Text style={styles.infoAmount}>{formatAmount(subscription.amount)}</Text>
        <Text style={styles.infoPlan}>
          {subscription.plan === 'premium_monthly' ? 'Monatlich' : 'Jährlich'}
        </Text>
      </View>

      {/* Retry Info */}
      {paymentRetry && (
        <View style={styles.retryCard}>
          <Text style={styles.retryTitle}>Automatische Wiederholung</Text>
          <Text style={styles.retryText}>
            Versuch {paymentRetry.attempt_number} von 4
          </Text>
          {daysUntilRetry !== null && daysUntilRetry > 0 && (
            <Text style={styles.retryText}>
              Nächster Versuch in {daysUntilRetry} {daysUntilRetry === 1 ? 'Tag' : 'Tagen'}
            </Text>
          )}
          {paymentRetry.failure_message && (
            <Text style={styles.retryError}>
              Grund: {paymentRetry.failure_message}
            </Text>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.primaryButton, updating && styles.buttonDisabled]}
          onPress={openPaymentUpdate}
          disabled={updating}
        >
          <CreditCard size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>
            {updating ? 'Lädt...' : 'Jetzt bezahlen'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, updating && styles.buttonDisabled]}
          onPress={pauseSubscription}
          disabled={updating || subscription.is_paused}
        >
          <Pause size={20} color={Colors.primary} />
          <Text style={styles.secondaryButtonText}>
            Abo pausieren (1 Monat)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dangerButton, updating && styles.buttonDisabled]}
          onPress={cancelSubscription}
          disabled={updating}
        >
          <X size={20} color="#f44336" />
          <Text style={styles.dangerButtonText}>
            Abo kündigen
          </Text>
        </TouchableOpacity>
      </View>

      {/* Help Text */}
      <View style={styles.helpBox}>
        <Text style={styles.helpTitle}>Hilfe benötigt?</Text>
        <Text style={styles.helpText}>
          Bitte stellen Sie sicher, dass Ihre Zahlungsmethode gültig ist und
          ausreichend Deckung vorhanden ist. Bei weiteren Fragen kontaktieren
          Sie bitte unseren Support.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: Spacing.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.error,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    padding: Spacing.lg,
    margin: Spacing.md,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: Spacing.xs,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: Spacing.xs,
  },
  warningAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginTop: Spacing.sm,
  },
  warningUrgent: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginTop: Spacing.sm,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: Spacing.xl,
    margin: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  infoAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.error,
    marginBottom: Spacing.xs,
  },
  infoPlan: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  retryCard: {
    backgroundColor: '#fff',
    padding: Spacing.lg,
    margin: Spacing.md,
    marginTop: 0,
    borderRadius: 8,
  },
  retryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  retryText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  retryError: {
    fontSize: 12,
    color: Colors.error,
    marginTop: Spacing.sm,
  },
  actionsContainer: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: 8,
    gap: Spacing.sm,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: Spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: Spacing.sm,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: Spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
    gap: Spacing.sm,
  },
  dangerButtonText: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  helpBox: {
    backgroundColor: '#fff',
    padding: Spacing.lg,
    margin: Spacing.md,
    borderRadius: 8,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  helpText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
