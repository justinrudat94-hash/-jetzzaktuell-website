import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, FontSizes, FontWeights } from '../constants';
import { useAuth } from '../utils/authContext';
import { boostService, BoostOption } from '../services/boostService';
import { premiumService } from '../services/premiumService';
import { X, Star, Flame, Gem, Info } from 'lucide-react-native';

export default function BoostEventScreen() {
  const { eventId } = useLocalSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [boosting, setBoosting] = useState(false);
  const [hasBusinessSub, setHasBusinessSub] = useState(false);
  const [includedUsed, setIncludedUsed] = useState(false);
  const [hasPremium, setHasPremium] = useState(false);
  const [freeBoostAvailable, setFreeBoostAvailable] = useState(false);
  const [userCoins, setUserCoins] = useState(0);

  useEffect(() => {
    loadUserStatus();
  }, []);

  const loadUserStatus = async () => {
    if (!user) return;

    try {
      const [businessSub, isPremium, boostCredits] = await Promise.all([
        boostService.checkBusinessSubscription(user.id),
        premiumService.isPremiumUser(user.id),
        boostService.getPremiumBoostCredits(user.id)
      ]);

      setHasBusinessSub(!!businessSub);
      setIncludedUsed(businessSub?.included_spotlight_used || false);
      setHasPremium(isPremium);
      setFreeBoostAvailable(boostCredits > 0);

      const { supabase } = await import('../lib/supabase');
      const { data } = await supabase
        .from('user_stats')
        .select('total_coins')
        .eq('user_id', user.id)
        .single();

      setUserCoins(data?.total_coins || 0);
    } catch (error) {
      console.error('Error loading user status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBoost = async (
    type: 'standard' | 'spotlight',
    duration: '24h' | '3days' | '7days' | '30days'
  ) => {
    if (!user || !eventId) return;

    setBoosting(true);

    try {
      const pricing = await boostService.getBoostPricing(user.id, type, duration);

      if (!pricing.isFree && userCoins < pricing.coins) {
        Alert.alert(
          'Nicht genug Coins',
          `Du benötigst ${pricing.coins.toLocaleString()} Coins (${pricing.euros.toFixed(2)}€). Du hast ${userCoins.toLocaleString()} Coins.`,
          [
            { text: 'Abbrechen', style: 'cancel' },
            {
              text: 'Coins kaufen',
              onPress: () => router.push('/rewards')
            }
          ]
        );
        return;
      }

      const result = await boostService.boostEvent(
        eventId as string,
        user.id,
        type,
        duration
      );

      Alert.alert(
        'Event geboostet!',
        `Dein Event wurde erfolgreich geboostet für ${result.duration_hours} Stunden.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );

      await loadUserStatus();
    } catch (error: any) {
      console.error('Error boosting event:', error);
      Alert.alert('Fehler', error.message || 'Event konnte nicht geboostet werden');
    } finally {
      setBoosting(false);
    }
  };

  const renderBoostOption = (
    option: BoostOption,
    pricing: { coins: number; euros: number; isFree: boolean } | null
  ) => {
    const isRecommended = option.duration === '7days' && option.type === 'standard';
    const isBestValue = option.duration === '30days' && option.type === 'spotlight';

    return (
      <TouchableOpacity
        key={`${option.type}-${option.duration}`}
        style={[
          styles.option,
          isRecommended && styles.recommendedOption,
          isBestValue && styles.bestValueOption
        ]}
        onPress={() => handleBoost(option.type, option.duration)}
        disabled={boosting}
      >
        {isRecommended && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>EMPFOHLEN</Text>
          </View>
        )}
        {isBestValue && (
          <View style={[styles.badge, styles.bestBadge]}>
            <Text style={styles.badgeText}>BESTER WERT</Text>
          </View>
        )}

        <View style={styles.optionHeader}>
          <Text style={styles.optionTitle}>{option.label}</Text>
          {option.type === 'standard' ? (
            <Star size={20} color={Colors.warning} fill={Colors.warning} />
          ) : (
            <Flame size={20} color={Colors.error} fill={Colors.error} />
          )}
        </View>

        <View style={styles.optionPricing}>
          {pricing?.isFree ? (
            <>
              <Text style={styles.priceGreen}>GRATIS</Text>
              {hasPremium && option.type === 'standard' && (
                <Text style={styles.priceSubtext}>(Premium)</Text>
              )}
              {hasBusinessSub && option.type === 'spotlight' && (
                <Text style={styles.priceSubtext}>(Business)</Text>
              )}
            </>
          ) : hasBusinessSub && option.type === 'spotlight' && includedUsed ? (
            <>
              <Text style={styles.priceYellow}>349.00€</Text>
              <Text style={styles.priceSubtext}>(Business)</Text>
              {option.duration === '30days' && (
                <Text style={styles.savings}>Spart 251€!</Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.price}>{option.euros.toFixed(2)}€</Text>
              <Text style={styles.priceCoins}>
                {option.coins.toLocaleString()} Coins
              </Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Event Boosten</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={24} color={Colors.gray800} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Dein Guthaben:</Text>
          <Text style={styles.balanceAmount}>
            {userCoins.toLocaleString()} Coins
          </Text>
          <TouchableOpacity
            style={styles.buyCoinsButton}
            onPress={() => router.push('/rewards')}
          >
            <Text style={styles.buyCoinsText}>Coins kaufen</Text>
          </TouchableOpacity>
        </View>

        {/* Standard Boost Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Star size={24} color={Colors.warning} fill={Colors.warning} />
            <Text style={styles.sectionTitle}>Standard Boost (50km)</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Erscheint priorisiert in "Events in deiner Nähe" (50km Radius)
          </Text>

          <View style={styles.optionsContainer}>
            {boostService.getStandardBoostOptions().map((option) =>
              renderBoostOption(option, null)
            )}
          </View>
        </View>

        {/* Spotlight Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Flame size={24} color={Colors.error} fill={Colors.error} />
            <Text style={styles.sectionTitle}>Spotlight (Deutschlandweit)</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Erscheint in "Highlights" (ganz oben, deutschlandweit sichtbar)
          </Text>

          {hasBusinessSub && !includedUsed && (
            <View style={styles.businessBanner}>
              <Gem size={20} color={Colors.primary} />
              <View style={styles.businessBannerText}>
                <Text style={styles.businessText}>
                  Business-Abo: 1. Event INKLUSIVE!
                </Text>
                <Text style={styles.businessSmall}>
                  Wähle beliebige Laufzeit - alles kostenlos!
                </Text>
              </View>
            </View>
          )}

          {hasBusinessSub && includedUsed && (
            <View style={styles.businessBanner}>
              <Gem size={20} color={Colors.primary} />
              <View style={styles.businessBannerText}>
                <Text style={styles.businessText}>
                  Business-Abo: Weitere Events für 349€
                </Text>
                <Text style={styles.businessSmall}>
                  Wähle beliebige Laufzeit - immer 349€
                </Text>
              </View>
            </View>
          )}

          <View style={styles.optionsContainer}>
            {boostService.getSpotlightBoostOptions().map((option) =>
              renderBoostOption(option, null)
            )}
          </View>
        </View>

        {/* Business Abo Promotion */}
        {!hasBusinessSub && (
          <View style={styles.promoCard}>
            <Text style={styles.promoTitle}>💡 Business-Abo (449€/Monat)</Text>
            <Text style={styles.promoText}>
              • 1. Event GRATIS (beliebige Laufzeit){'\n'}
              • Weitere Events: 349€ (statt bis zu 600€){'\n'}
              • Bevorzugte Platzierung (💎 Business-Badge){'\n'}
              • Werbefrei{'\n'}
              • Business-Analytics{'\n'}
              • Prioritäts-Support
            </Text>
            <Text style={styles.promoHighlight}>
              Lohnt sich ab 1 Event (30 Tage) pro Monat!
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => router.push('/profile/settings')}
            >
              <Text style={styles.upgradeButtonText}>
                Business-Abo abschließen
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoCard}>
          <Info size={20} color={Colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>So funktioniert's:</Text>
            <Text style={styles.infoText}>
              • Standard Boost: Erscheint priorisiert in der Nähe (50km){'\n'}
              • Spotlight: Erscheint deutschlandweit in "Highlights"{'\n'}
              • Business-Events haben höchste Priorität (💎){'\n'}
              • Events bleiben überall auffindbar (Suche, Map, Kalender)
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
  },
  scrollView: {
    flex: 1,
  },
  balanceCard: {
    backgroundColor: Colors.white,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  balanceLabel: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    marginBottom: Spacing.xs,
  },
  balanceAmount: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  buyCoinsButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: 8,
  },
  buyCoinsText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  section: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
  },
  sectionDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginBottom: Spacing.lg,
  },
  optionsContainer: {
    gap: Spacing.md,
  },
  option: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray300,
    position: 'relative',
  },
  recommendedOption: {
    borderColor: Colors.warning,
  },
  bestValueOption: {
    borderColor: Colors.error,
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 12,
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bestBadge: {
    backgroundColor: Colors.error,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  optionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray800,
  },
  optionPricing: {
    alignItems: 'flex-start',
  },
  price: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
  },
  priceGreen: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.success,
  },
  priceYellow: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.warning,
  },
  priceCoins: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginTop: 2,
  },
  priceSubtext: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    fontStyle: 'italic',
  },
  savings: {
    fontSize: FontSizes.sm,
    color: Colors.success,
    fontWeight: FontWeights.semibold,
    marginTop: 4,
  },
  businessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  businessBannerText: {
    flex: 1,
  },
  businessText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: 2,
  },
  businessSmall: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  promoCard: {
    backgroundColor: Colors.white,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  promoTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.sm,
  },
  promoText: {
    fontSize: FontSizes.md,
    color: Colors.gray700,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  promoHighlight: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  upgradeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  infoCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.gray800,
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
});
