import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, ScrollView, Alert } from 'react-native';
import { X, Coins, Check, Info, AlertCircle } from 'lucide-react-native';
import { Colors } from '../constants';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import { supabase } from '../lib/supabase';
import { useAuth } from '../utils/authContext';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { WiderrufsbelehrungModal } from './WiderrufsbelehrungModal';

interface CoinPackage {
  coins: number;
  price: number;
  bonus?: number;
  popular?: boolean;
}

const COIN_PACKAGES: CoinPackage[] = [
  { coins: 100, price: 0.99 },
  { coins: 500, price: 4.49, bonus: 50 },
  { coins: 1000, price: 8.49, bonus: 150, popular: true },
  { coins: 2500, price: 19.99, bonus: 500 },
  { coins: 5000, price: 37.99, bonus: 1250 },
  { coins: 10000, price: 69.99, bonus: 3000 },
];

interface CoinPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CoinPurchaseModal({ visible, onClose, onSuccess }: CoinPurchaseModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [agbAccepted, setAgbAccepted] = useState(false);
  const [datenschutzAccepted, setDatenschutzAccepted] = useState(false);
  const [widerrufsAccepted, setWiderrufsAccepted] = useState(false);
  const [showWiderrufsModal, setShowWiderrufsModal] = useState(false);

  const handleSelectPackage = (pkg: CoinPackage) => {
    setSelectedPackage(pkg);
    setError(null);
  };

  const handleConfirmPurchase = async () => {
    if (!user || !selectedPackage) return;

    if (!agbAccepted || !datenschutzAccepted || !widerrufsAccepted) {
      Alert.alert(
        'Zustimmung erforderlich',
        'Bitte akzeptiere alle erforderlichen Bedingungen, um fortzufahren.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const totalCoins = selectedPackage.coins + (selectedPackage.bonus || 0);
      const priceInCents = Math.round(selectedPackage.price * 100);

      const { data, error: functionError } = await supabase.functions.invoke(
        'create-coin-checkout',
        {
          body: {
            userId: user.id,
            coinAmount: totalCoins,
            priceInCents,
          },
        }
      );

      if (functionError) throw functionError;
      if (data.error) throw new Error(data.error);

      if (data.url) {
        const result = await WebBrowser.openBrowserAsync(data.url);

        if (result.type === 'cancel' || result.type === 'dismiss') {
          Alert.alert(
            'Zahlungsvorgang',
            'Du kannst jetzt zur App zurückkehren. Falls die Zahlung erfolgreich war, werden die Coins automatisch gutgeschrieben.'
          );
        }

        onClose();
        resetForm();
      }
    } catch (err: any) {
      console.error('Error purchasing coins:', err);
      setError(err.message || 'Fehler beim Kaufen von Coins');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPackage(null);
    setAgbAccepted(false);
    setDatenschutzAccepted(false);
    setWiderrufsAccepted(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const canPurchase = selectedPackage && agbAccepted && datenschutzAccepted && widerrufsAccepted && !loading;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Coins kaufen</Text>
              <TouchableOpacity onPress={handleClose}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.subtitle}>
                Kaufe Coins, um Events zu boosten und exklusive Features freizuschalten
              </Text>

              {error && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.packagesContainer}>
                {COIN_PACKAGES.map((pkg, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.packageCard,
                      pkg.popular && styles.packageCardPopular,
                      selectedPackage === pkg && styles.packageCardSelected,
                    ]}
                    onPress={() => handleSelectPackage(pkg)}
                    disabled={loading}
                  >
                    {pkg.popular && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularText}>Beliebt</Text>
                      </View>
                    )}
                    {selectedPackage === pkg && (
                      <View style={styles.selectedBadge}>
                        <Check size={16} color={Colors.white} />
                      </View>
                    )}
                    <View style={styles.packageIcon}>
                      <Coins size={32} color={pkg.popular ? Colors.accent : Colors.primary} />
                    </View>
                    <Text style={styles.packageCoins}>
                      {pkg.coins.toLocaleString()}
                    </Text>
                    {pkg.bonus && (
                      <View style={styles.bonusBadge}>
                        <Text style={styles.bonusText}>+{pkg.bonus} Bonus</Text>
                      </View>
                    )}
                    <Text style={styles.packagePrice}>{pkg.price.toFixed(2)} EUR</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedPackage && (
                <>
                  <View style={styles.warningBox}>
                    <AlertCircle size={20} color={Colors.warning} />
                    <Text style={styles.warningText}>
                      Wichtig: Coins werden sofort nach Zahlung gutgeschrieben. Dadurch erlischt Ihr Widerrufsrecht gemäß § 356 Abs. 5 BGB.
                    </Text>
                  </View>

                  <View style={styles.legalSection}>
                    <Text style={styles.legalTitle}>Rechtliche Zustimmung erforderlich</Text>

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
                      onPress={() => setWiderrufsAccepted(!widerrufsAccepted)}
                    >
                      <View style={[styles.checkboxBox, widerrufsAccepted && styles.checkboxBoxChecked]}>
                        {widerrufsAccepted && <Check size={16} color={Colors.white} />}
                      </View>
                      <View style={styles.checkboxTextContainer}>
                        <Text style={styles.checkboxText}>
                          Ich stimme der sofortigen Bereitstellung der digitalen Inhalte (Coins) ausdrücklich zu und bestätige, dass ich weiß, dass ich dadurch mein Widerrufsrecht verliere.
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
                      styles.confirmButton,
                      !canPurchase && styles.confirmButtonDisabled
                    ]}
                    onPress={handleConfirmPurchase}
                    disabled={!canPurchase}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <>
                        <Coins size={20} color={Colors.white} />
                        <Text style={styles.confirmButtonText}>
                          Jetzt kaufen für {selectedPackage.price.toFixed(2)} €
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.footer}>
                <View style={styles.featureRow}>
                  <Check size={16} color={Colors.success} />
                  <Text style={styles.featureText}>Sichere Zahlung über Stripe</Text>
                </View>
                <View style={styles.featureRow}>
                  <Check size={16} color={Colors.success} />
                  <Text style={styles.featureText}>Sofortige Gutschrift nach Zahlung</Text>
                </View>
                <View style={styles.featureRow}>
                  <Check size={16} color={Colors.success} />
                  <Text style={styles.featureText}>Coins verfallen nicht</Text>
                </View>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <WiderrufsbelehrungModal
        visible={showWiderrufsModal}
        onClose={() => setShowWiderrufsModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    maxHeight: '95%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: Colors.errorLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
  },
  packagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  packageCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
  },
  packageCardPopular: {
    borderColor: Colors.accent,
    backgroundColor: '#FFF9E6',
  },
  packageCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: BorderRadius.sm,
  },
  popularText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  selectedBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageIcon: {
    marginBottom: Spacing.sm,
  },
  packageCoins: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  bonusBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  bonusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.success,
  },
  packagePrice: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.warningLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  warningText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.gray800,
    lineHeight: 20,
    fontWeight: FontWeights.medium,
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
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.gray400,
  },
  confirmButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  footer: {
    gap: Spacing.sm,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray300,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
});
