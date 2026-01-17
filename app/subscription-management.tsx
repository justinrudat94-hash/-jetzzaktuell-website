import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Shield, CreditCard, Calendar, AlertCircle, CheckCircle, XCircle } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import { useAuth } from '../utils/authContext';
import { premiumService } from '../services/premiumService';
import { WiderrufsbelehrungModal } from '../components/WiderrufsbelehrungModal';

export default function SubscriptionManagementScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [showWiderrufsModal, setShowWiderrufsModal] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const status = await premiumService.getSubscriptionStatus(user.id);
      setSubscription(status.subscription);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAtPeriodEnd = () => {
    Alert.alert(
      'Abo am Periodenende kündigen',
      'Dein Abo läuft zum Ende der aktuellen Abrechnungsperiode aus. Du behältst alle Premium-Features bis dahin.\n\nMöchtest du fortfahren?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Ja, kündigen',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await premiumService.cancelSubscriptionAtPeriodEnd(user!.id);
              Alert.alert('Erfolgreich', 'Dein Abo wurde gekündigt und läuft zum Ende der aktuellen Periode aus.');
              await loadSubscription();
            } catch (error: any) {
              Alert.alert('Fehler', error.message || 'Kündigung fehlgeschlagen');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelImmediately = () => {
    Alert.alert(
      'Sofort kündigen',
      '⚠️ WARNUNG: Bei sofortiger Kündigung:\n\n• Keine Rückerstattung für die laufende Periode\n• Premium-Features enden sofort\n• Du verlierst alle noch verfügbaren Event-Boosts\n\nWir empfehlen die Kündigung am Periodenende.\n\nTrotzdem sofort kündigen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Sofort kündigen',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const { data } = await premiumService.getUserSubscription(user!.id);
              if (data?.stripe_subscription_id) {
                await premiumService.cancelSubscription(data.stripe_subscription_id, false);
                Alert.alert('Gekündigt', 'Dein Abo wurde sofort gekündigt.');
                router.back();
              }
            } catch (error: any) {
              Alert.alert('Fehler', error.message || 'Kündigung fehlgeschlagen');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      await premiumService.reactivateSubscription(user!.id);
      Alert.alert('Reaktiviert', 'Dein Abo wurde reaktiviert und läuft normal weiter.');
      await loadSubscription();
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Reaktivierung fehlgeschlagen');
    } finally {
      setReactivating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getPlanName = (planType: string) => {
    return planType === 'monthly' ? 'Monatlich' : 'Jährlich';
  };

  const getPlanPrice = (planType: string) => {
    return planType === 'monthly' ? '4,99 €' : '49,99 €';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Abo-Verwaltung</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!subscription) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Abo-Verwaltung</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Shield size={64} color={Colors.gray400} />
          <Text style={styles.emptyTitle}>Kein aktives Abo</Text>
          <Text style={styles.emptyText}>
            Du hast derzeit kein aktives Premium-Abo.
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.back()}
          >
            <Text style={styles.upgradeButtonText}>Premium holen</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isScheduledForCancellation = subscription.cancel_at_period_end;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abo-Verwaltung</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {isScheduledForCancellation && (
            <View style={styles.warningBanner}>
              <AlertCircle size={20} color={Colors.warning} />
              <View style={styles.warningTextContainer}>
                <Text style={styles.warningTitle}>Kündigung geplant</Text>
                <Text style={styles.warningText}>
                  Dein Abo läuft am {formatDate(subscription.current_period_end)} aus.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Shield size={24} color={Colors.accent} />
              <Text style={styles.cardTitle}>JETZZ Premium</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Plan</Text>
              <Text style={styles.infoValue}>{getPlanName(subscription.plan_type)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Preis</Text>
              <Text style={styles.infoValue}>{getPlanPrice(subscription.plan_type)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <View style={[
                styles.statusBadge,
                subscription.status === 'active' ? styles.statusActive : styles.statusInactive
              ]}>
                <Text style={styles.statusText}>
                  {subscription.status === 'active' ? 'Aktiv' : subscription.status}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nächste Abrechnung</Text>
              <Text style={styles.infoValue}>{formatDate(subscription.current_period_end)}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Premium-Vorteile</Text>
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <CheckCircle size={20} color={Colors.success} />
                <Text style={styles.benefitText}>Keine Werbung</Text>
              </View>
              <View style={styles.benefitItem}>
                <CheckCircle size={20} color={Colors.success} />
                <Text style={styles.benefitText}>1x Standard Boost pro Woche gratis</Text>
              </View>
              <View style={styles.benefitItem}>
                <CheckCircle size={20} color={Colors.success} />
                <Text style={styles.benefitText}>Event-Analytics</Text>
              </View>
              <View style={styles.benefitItem}>
                <CheckCircle size={20} color={Colors.success} />
                <Text style={styles.benefitText}>Premium-Badge</Text>
              </View>
              <View style={styles.benefitItem}>
                <CheckCircle size={20} color={Colors.success} />
                <Text style={styles.benefitText}>Prioritäts-Support</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rechtliche Informationen</Text>
            <TouchableOpacity
              style={styles.legalButton}
              onPress={() => setShowWiderrufsModal(true)}
            >
              <Text style={styles.legalButtonText}>Widerrufsbelehrung anzeigen</Text>
            </TouchableOpacity>
            <Text style={styles.legalNote}>
              Bei Premium-Abos mit sofortigem Leistungsbeginn erlischt das Widerrufsrecht nach 14 Tagen oder bei ausdrücklicher Zustimmung.
            </Text>
          </View>

          {!isScheduledForCancellation ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Abo kündigen</Text>
              <Text style={styles.cardDescription}>
                Du kannst dein Abo jederzeit kündigen. Wähle eine Option:
              </Text>

              <TouchableOpacity
                style={[styles.cancelButton, styles.cancelButtonRecommended]}
                onPress={handleCancelAtPeriodEnd}
                disabled={cancelling}
              >
                <View style={styles.cancelButtonContent}>
                  <Calendar size={20} color={Colors.gray700} />
                  <View style={styles.cancelButtonText}>
                    <Text style={styles.cancelButtonTitle}>Am Periodenende kündigen</Text>
                    <Text style={styles.cancelButtonSubtitle}>Empfohlen • Bis {formatDate(subscription.current_period_end)}</Text>
                  </View>
                </View>
                {cancelling && <ActivityIndicator size="small" color={Colors.gray700} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelButton, styles.cancelButtonImmediate]}
                onPress={handleCancelImmediately}
                disabled={cancelling}
              >
                <View style={styles.cancelButtonContent}>
                  <XCircle size={20} color={Colors.error} />
                  <View style={styles.cancelButtonText}>
                    <Text style={[styles.cancelButtonTitle, { color: Colors.error }]}>Sofort kündigen</Text>
                    <Text style={styles.cancelButtonSubtitle}>Keine Rückerstattung</Text>
                  </View>
                </View>
                {cancelling && <ActivityIndicator size="small" color={Colors.error} />}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Kündigung rückgängig machen</Text>
              <Text style={styles.cardDescription}>
                Du kannst die Kündigung rückgängig machen und dein Abo wird normal weiterlaufen.
              </Text>

              <TouchableOpacity
                style={styles.reactivateButton}
                onPress={handleReactivate}
                disabled={reactivating}
              >
                {reactivating ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.reactivateButtonText}>Abo reaktivieren</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <WiderrufsbelehrungModal
        visible={showWiderrufsModal}
        onClose={() => setShowWiderrufsModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  backButton: {
    padding: Spacing.md,
    marginLeft: -Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  upgradeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  upgradeButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  content: {
    padding: Spacing.lg,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.warningLight,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.warning,
    marginBottom: 4,
  },
  warningText: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  cardDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  infoLabel: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
  },
  infoValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusActive: {
    backgroundColor: Colors.successLight,
  },
  statusInactive: {
    backgroundColor: Colors.gray300,
  },
  statusText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.success,
  },
  benefitsList: {
    gap: Spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  benefitText: {
    fontSize: FontSizes.md,
    color: Colors.gray700,
  },
  legalButton: {
    backgroundColor: Colors.primaryLight,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  legalButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  legalNote: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    lineHeight: 16,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
  },
  cancelButtonRecommended: {
    backgroundColor: Colors.gray100,
    borderColor: Colors.gray400,
  },
  cancelButtonImmediate: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error,
  },
  cancelButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  cancelButtonText: {
    flex: 1,
  },
  cancelButtonTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: 4,
  },
  cancelButtonSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  reactivateButton: {
    backgroundColor: Colors.success,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  reactivateButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
});
