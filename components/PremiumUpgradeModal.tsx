import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import { X, Crown, Check, Zap, Shield, TrendingUp, Award, BarChart3, Info, AlertCircle } from 'lucide-react-native';
import { useAuth } from '../utils/authContext';
import { premiumService, PremiumPlan } from '../services/premiumService';
import { WiderrufsbelehrungModal } from './WiderrufsbelehrungModal';
import CompleteProfileModal from './CompleteProfileModal';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';

interface PremiumUpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userId: string;
}

export const PremiumUpgradeModal: React.FC<PremiumUpgradeModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [agbAccepted, setAgbAccepted] = useState(false);
  const [datenschutzAccepted, setDatenschutzAccepted] = useState(false);
  const [sofortigerBeginnAccepted, setSofortigerBeginnAccepted] = useState(false);
  const [showWiderrufsModal, setShowWiderrufsModal] = useState(false);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);
  const [billingDataComplete, setBillingDataComplete] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPlans();
      checkTrialStatus();
      checkBillingData();
      setAgbAccepted(false);
      setDatenschutzAccepted(false);
      setSofortigerBeginnAccepted(false);
    }
  }, [visible]);

  const checkBillingData = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('billing_data_complete')
        .eq('id', user.id)
        .maybeSingle();

      setBillingDataComplete(profile?.billing_data_complete || false);
    } catch (error) {
      console.error('Error checking billing data:', error);
      setBillingDataComplete(false);
    }
  };

  const checkTrialStatus = async () => {
    if (!user) return;

    try {
      const hasUsed = await premiumService.hasUserUsedTrial(user.id);
      setHasUsedTrial(hasUsed);
    } catch (error) {
      console.error('Error checking trial status:', error);
    }
  };

  const loadPlans = async () => {
    try {
      const plansData = await premiumService.getPlans();
      setPlans(plansData);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!user || purchasing) return;

    if (!agbAccepted || !datenschutzAccepted || !sofortigerBeginnAccepted) {
      Alert.alert(
        'Zustimmung erforderlich',
        'Bitte akzeptiere alle erforderlichen Bedingungen, um fortzufahren.'
      );
      return;
    }

    if (!billingDataComplete) {
      setShowCompleteProfileModal(true);
      return;
    }

    try {
      setPurchasing(true);
      const checkoutUrl = await premiumService.createCheckoutSession(user.id, selectedPlan);

      if (checkoutUrl) {
        const result = await WebBrowser.openBrowserAsync(checkoutUrl);

        if (result.type === 'cancel' || result.type === 'dismiss') {
          Alert.alert(
            'Zahlungsvorgang',
            'Du kannst jetzt zur App zurückkehren. Falls die Zahlung erfolgreich war, wird dein Premium-Abonnement automatisch aktiviert.'
          );
        }
      }

      onClose();
    } catch (error) {
      console.error('Error creating checkout:', error);
      Alert.alert('Fehler', 'Checkout konnte nicht gestartet werden. Bitte versuche es erneut.');
    } finally {
      setPurchasing(false);
    }
  };

  const monthlyPlan = plans.find((p) => p.plan_type === 'monthly');
  const yearlyPlan = plans.find((p) => p.plan_type === 'yearly');
  const savings = monthlyPlan && yearlyPlan
    ? Math.round(((monthlyPlan.price_eur * 12 - yearlyPlan.price_eur) / (monthlyPlan.price_eur * 12)) * 100)
    : 0;

  const premiumFeatures = [
    { icon: Shield, text: 'Keine Werbung - Genieße die App ohne Unterbrechungen', color: Colors.primary },
    { icon: TrendingUp, text: '1x Standard Boost pro Woche gratis (50km Reichweite)', color: Colors.success },
    { icon: BarChart3, text: 'Event-Analytics: Detaillierte Statistiken zu deinen Events', color: Colors.accent },
    { icon: Award, text: 'Premium-Badge in deinem Profil', color: Colors.warning },
    { icon: Crown, text: 'Prioritäts-Support: Schnellere Hilfe bei Fragen', color: Colors.error },
  ];

  return (
    <>
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.container}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <View style={styles.crownIcon}>
                  <Crown size={48} color={Colors.accent} />
                </View>
                <Text style={styles.title}>JETZZ Premium</Text>
                <Text style={styles.subtitle}>Werbefrei & exklusive Features</Text>
                {!hasUsedTrial && (
                  <View style={styles.trialBadge}>
                    <Zap size={16} color={Colors.white} />
                    <Text style={styles.trialText}>7 Tage kostenlos testen</Text>
                  </View>
                )}
              </View>

              <View style={styles.features}>
                <Text style={styles.featuresTitle}>Premium-Vorteile</Text>
                {premiumFeatures.map((feature, index) => (
                  <View key={index} style={styles.feature}>
                    <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
                      <feature.icon size={20} color={feature.color} />
                    </View>
                    <Text style={styles.featureText}>{feature.text}</Text>
                  </View>
                ))}
              </View>

              {loading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
              ) : (
                <View style={styles.plans}>
                  <Text style={styles.plansTitle}>Wähle deinen Plan</Text>

                  <TouchableOpacity
                    style={[
                      styles.planCard,
                      selectedPlan === 'monthly' && styles.planCardSelected,
                    ]}
                    onPress={() => setSelectedPlan('monthly')}
                  >
                    <View style={styles.planHeader}>
                      <Text style={styles.planName}>Monatlich</Text>
                      {selectedPlan === 'monthly' && (
                        <View style={styles.selectedBadge}>
                          <Check size={16} color={Colors.white} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.planPrice}>
                      {monthlyPlan?.price_eur.toFixed(2).replace('.', ',')} €
                      <Text style={styles.planPeriod}>/Monat</Text>
                    </Text>
                    <Text style={styles.planDescription}>Monatlich kündbar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.planCard,
                      selectedPlan === 'yearly' && styles.planCardSelected,
                      styles.planCardRecommended,
                    ]}
                    onPress={() => setSelectedPlan('yearly')}
                  >
                    <View style={styles.recommendedBadge}>
                      <Zap size={12} color={Colors.white} />
                      <Text style={styles.recommendedText}>SPARE {savings}% - 2 MONATE GRATIS</Text>
                    </View>
                    <View style={styles.planHeader}>
                      <Text style={styles.planName}>Jährlich</Text>
                      {selectedPlan === 'yearly' && (
                        <View style={styles.selectedBadge}>
                          <Check size={16} color={Colors.white} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.planPrice}>
                      {yearlyPlan?.price_eur.toFixed(2).replace('.', ',')} €
                      <Text style={styles.planPeriod}>/Jahr</Text>
                    </Text>
                    <Text style={styles.planDescription}>
                      Nur {((yearlyPlan?.price_eur || 0) / 12).toFixed(2).replace('.', ',')} €/Monat
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.legalSection}>
                <Text style={styles.legalTitle}>Rechtliche Hinweise</Text>

                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setAgbAccepted(!agbAccepted)}
                >
                  <View style={[styles.checkboxBox, agbAccepted && styles.checkboxBoxChecked]}>
                    {agbAccepted && <Check size={16} color={Colors.white} />}
                  </View>
                  <Text style={styles.checkboxText}>
                    Ich akzeptiere die{' '}
                    <Text style={styles.link} onPress={() => router.push('/legal/agb' as any)}>
                      AGB
                    </Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setDatenschutzAccepted(!datenschutzAccepted)}
                >
                  <View style={[styles.checkboxBox, datenschutzAccepted && styles.checkboxBoxChecked]}>
                    {datenschutzAccepted && <Check size={16} color={Colors.white} />}
                  </View>
                  <Text style={styles.checkboxText}>
                    Ich habe die{' '}
                    <Text style={styles.link} onPress={() => router.push('/legal/datenschutz' as any)}>
                      Datenschutzerklärung
                    </Text>{' '}
                    gelesen
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setSofortigerBeginnAccepted(!sofortigerBeginnAccepted)}
                >
                  <View style={[styles.checkboxBox, sofortigerBeginnAccepted && styles.checkboxBoxChecked]}>
                    {sofortigerBeginnAccepted && <Check size={16} color={Colors.white} />}
                  </View>
                  <View style={styles.checkboxTextContainer}>
                    <Text style={styles.checkboxText}>
                      Ich stimme dem sofortigen Leistungsbeginn ausdrücklich zu und bestätige, dass ich weiß, dass ich mein Widerrufsrecht bei vollständiger Vertragserfüllung verliere.
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.widerrufsButton}
                  onPress={() => setShowWiderrufsModal(true)}
                >
                  <Info size={16} color={Colors.primary} />
                  <Text style={styles.widerrufsButtonText}>Widerrufsbelehrung lesen</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.purchaseButton,
                  (purchasing || loading || !agbAccepted || !datenschutzAccepted || !sofortigerBeginnAccepted) && styles.purchaseButtonDisabled
                ]}
                onPress={handlePurchase}
                disabled={purchasing || loading || !agbAccepted || !datenschutzAccepted || !sofortigerBeginnAccepted}
              >
                {purchasing ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Crown size={20} color={Colors.white} />
                    <Text style={styles.purchaseButtonText}>
                      {hasUsedTrial ? 'Jetzt Premium werden' : '7 Tage kostenlos testen'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.trialInfo}>
                <AlertCircle size={16} color={Colors.primary} />
                <Text style={styles.trialInfoText}>
                  {hasUsedTrial
                    ? `Sofort starten: ${selectedPlan === 'monthly' ? '4,99 €/Monat' : '49,99 €/Jahr'}. Jederzeit kündbar.`
                    : `Nach 7 Tagen: ${selectedPlan === 'monthly' ? '4,99 €/Monat' : '49,99 €/Jahr'}. Jederzeit kündbar.`
                  }
                </Text>
              </View>

              <Text style={styles.disclaimer}>
                Sichere Zahlung über Stripe. Du kannst dein Abo jederzeit in den Einstellungen kündigen.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <WiderrufsbelehrungModal
        visible={showWiderrufsModal}
        onClose={() => setShowWiderrufsModal(false)}
      />

      <CompleteProfileModal
        visible={showCompleteProfileModal}
        onClose={() => setShowCompleteProfileModal(false)}
        onComplete={async () => {
          setShowCompleteProfileModal(false);
          await checkBillingData();
          if (billingDataComplete) {
            handlePurchase();
          }
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
    paddingTop: Spacing.lg,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
    padding: Spacing.sm,
    backgroundColor: Colors.gray100,
    borderRadius: 20,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  crownIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  trialText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  features: {
    marginBottom: Spacing.xl,
  },
  featuresTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 22,
  },
  loader: {
    marginVertical: Spacing.xl,
  },
  plans: {
    marginBottom: Spacing.xl,
  },
  plansTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  planCard: {
    borderWidth: 2,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    position: 'relative',
    marginBottom: Spacing.md,
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  planCardRecommended: {
    borderColor: Colors.accent,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  recommendedText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  planName: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  selectedBadge: {
    backgroundColor: Colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  planPeriod: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.normal,
    color: Colors.textSecondary,
  },
  planDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  legalSection: {
    backgroundColor: Colors.gray100,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  legalTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.gray400,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    lineHeight: 20,
  },
  checkboxTextContainer: {
    flex: 1,
  },
  link: {
    color: Colors.primary,
    textDecorationLine: 'underline',
    fontWeight: FontWeights.semibold,
  },
  widerrufsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  widerrufsButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },
  purchaseButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  purchaseButtonDisabled: {
    backgroundColor: Colors.gray400,
  },
  purchaseButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  trialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  trialInfoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    lineHeight: 18,
  },
  disclaimer: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 16,
  },
});

export default PremiumUpgradeModal;
