import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Colors, Spacing, FontSizes, FontWeights } from '../constants';
import { X, Gem, Check, Flame, TrendingUp, Shield, Headphones } from 'lucide-react-native';

interface BusinessUpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

export default function BusinessUpgradeModal({
  visible,
  onClose,
  onUpgrade
}: BusinessUpgradeModalProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);

    try {
      Alert.alert(
        'Business-Abo',
        'Die Stripe-Integration für Business-Abos wird hier implementiert.',
        [{ text: 'OK' }]
      );

      if (onUpgrade) {
        onUpgrade();
      }
    } catch (error) {
      console.error('Error upgrading to business:', error);
      Alert.alert('Fehler', 'Business-Abo konnte nicht abgeschlossen werden');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Gem size={28} color={Colors.primary} />
            <Text style={styles.headerTitle}>Business-Abo</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={Colors.gray800} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Price Section */}
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Monatlicher Preis</Text>
            <Text style={styles.price}>449€</Text>
            <Text style={styles.priceSubtext}>pro Monat, jederzeit kündbar</Text>
          </View>

          {/* Main Benefits */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Was ist enthalten?</Text>

            <View style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Flame size={24} color={Colors.error} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>
                  1 Spotlight-Event INKLUSIVE
                </Text>
                <Text style={styles.benefitText}>
                  Wähle beliebige Laufzeit (24h bis 30 Tage) - komplett kostenlos! Deutschlandweite Sichtbarkeit in "Highlights".
                </Text>
              </View>
            </View>

            <View style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Gem size={24} color={Colors.primary} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>
                  Weitere Events: Nur 349€
                </Text>
                <Text style={styles.benefitText}>
                  Jedes weitere Spotlight-Event im Monat kostet nur 349€ statt bis zu 600€. Spare bis zu 251€ pro Event!
                </Text>
              </View>
            </View>

            <View style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <TrendingUp size={24} color={Colors.success} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>
                  Bevorzugte Platzierung
                </Text>
                <Text style={styles.benefitText}>
                  Deine Events erscheinen VOR allen Standard-Spotlights mit 💎 Business-Badge. Maximale Sichtbarkeit garantiert!
                </Text>
              </View>
            </View>

            <View style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Shield size={24} color={Colors.warning} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>
                  Werbefrei
                </Text>
                <Text style={styles.benefitText}>
                  Genieße die App komplett werbefrei. Keine Banner, keine Unterbrechungen - nur deine Events im Fokus.
                </Text>
              </View>
            </View>

            <View style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Check size={24} color={Colors.primary} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>
                  Business-Analytics
                </Text>
                <Text style={styles.benefitText}>
                  Erweiterte Statistiken und Insights zu deinen Events. Verfolge Performance, Reichweite und ROI in Echtzeit.
                </Text>
              </View>
            </View>

            <View style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Headphones size={24} color={Colors.primary} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>
                  Prioritäts-Support
                </Text>
                <Text style={styles.benefitText}>
                  Schnellere Antworten bei Fragen oder Problemen. Dein Erfolg ist unsere Priorität.
                </Text>
              </View>
            </View>
          </View>

          {/* ROI Section */}
          <View style={styles.roiCard}>
            <Text style={styles.roiTitle}>💰 Wann lohnt sich Business?</Text>
            <View style={styles.roiRow}>
              <Text style={styles.roiLabel}>1 Event (30 Tage):</Text>
              <Text style={styles.roiValue}>449€ statt 600€ → Spart 151€</Text>
            </View>
            <View style={styles.roiRow}>
              <Text style={styles.roiLabel}>2 Events (30 Tage):</Text>
              <Text style={styles.roiValue}>798€ statt 1.200€ → Spart 402€</Text>
            </View>
            <View style={styles.roiRow}>
              <Text style={styles.roiLabel}>3 Events (30 Tage):</Text>
              <Text style={styles.roiValueHighlight}>
                1.147€ statt 1.800€ → Spart 653€
              </Text>
            </View>
            <Text style={styles.roiNote}>
              Business-Abo lohnt sich bereits ab 1 Event (30 Tage) pro Monat!
            </Text>
          </View>

          {/* Comparison Table */}
          <View style={styles.comparisonCard}>
            <Text style={styles.comparisonTitle}>Spotlight-Preise im Vergleich</Text>

            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonDuration}>24 Stunden</Text>
              <Text style={styles.comparisonStandard}>25€</Text>
              <Text style={styles.comparisonBusiness}>0€ / 349€</Text>
            </View>

            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonDuration}>3 Tage</Text>
              <Text style={styles.comparisonStandard}>75€</Text>
              <Text style={styles.comparisonBusiness}>0€ / 349€</Text>
            </View>

            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonDuration}>7 Tage</Text>
              <Text style={styles.comparisonStandard}>150€</Text>
              <Text style={styles.comparisonBusiness}>0€ / 349€</Text>
            </View>

            <View style={[styles.comparisonRow, styles.comparisonBest]}>
              <Text style={styles.comparisonDuration}>30 Tage</Text>
              <Text style={styles.comparisonStandard}>600€</Text>
              <Text style={styles.comparisonBusinessHighlight}>0€ / 349€</Text>
            </View>

            <Text style={styles.comparisonNote}>
              1. Event pro Monat inklusive (0€) • Weitere Events: 349€
            </Text>
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleUpgrade}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.ctaButtonText}>
                Jetzt Business-Abo abschließen
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Jederzeit kündbar • Keine versteckten Kosten • Sofort aktiv
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray300,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
  },
  scrollView: {
    flex: 1,
  },
  priceCard: {
    backgroundColor: Colors.primary,
    margin: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: FontSizes.md,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: Spacing.xs,
  },
  price: {
    fontSize: 48,
    fontWeight: FontWeights.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  priceSubtext: {
    fontSize: FontSizes.sm,
    color: Colors.white,
    opacity: 0.9,
  },
  section: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.lg,
  },
  benefit: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    backgroundColor: Colors.white,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray800,
    marginBottom: 4,
  },
  benefitText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
  roiCard: {
    backgroundColor: Colors.successLight,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  roiTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.md,
  },
  roiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  roiLabel: {
    fontSize: FontSizes.md,
    color: Colors.gray700,
  },
  roiValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.success,
  },
  roiValueHighlight: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.success,
  },
  roiNote: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  comparisonCard: {
    backgroundColor: Colors.white,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  comparisonTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.md,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  comparisonBest: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    borderRadius: 8,
  },
  comparisonDuration: {
    fontSize: FontSizes.md,
    color: Colors.gray700,
    flex: 1,
  },
  comparisonStandard: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    width: 80,
    textAlign: 'center',
  },
  comparisonBusiness: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    width: 80,
    textAlign: 'right',
  },
  comparisonBusinessHighlight: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.success,
    width: 80,
    textAlign: 'right',
  },
  comparisonNote: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  footerText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
});
