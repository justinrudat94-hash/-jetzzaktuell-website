import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Coins, Award, TrendingUp, Gift, Calendar } from 'lucide-react-native';
import { Colors } from '../constants';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';

const Card: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
  <View style={[cardStyles.card, style]}>{children}</View>
);

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
import { useAuth } from '../utils/authContext';
import { useRewards } from '../hooks/useRewards';
import {
  getCurrentUserRewardHistory,
  formatRewardReason,
  formatCoins,
  getLevelColor,
  getCreatorLevels,
  CreatorLevel,
  RewardTransaction,
} from '../services/rewardService';
import { CoinPurchaseModal } from '../components/CoinPurchaseModal';

export default function RewardsScreen() {
  const { user, isGuest } = useAuth();
  const { stats, level, coins, rank, levelProgress } = useRewards();
  const [history, setHistory] = useState<RewardTransaction[]>([]);
  const [levels, setLevels] = useState<CreatorLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const params = useLocalSearchParams();

  useEffect(() => {
    loadRewardData();
  }, []);

  useEffect(() => {
    handlePaymentCallback();
  }, [params]);

  const handlePaymentCallback = async () => {
    if (params.success === 'true') {
      const coinAmount = params.coins as string;
      Alert.alert(
        'Zahlung erfolgreich!',
        `${coinAmount} Coins wurden deinem Konto gutgeschrieben.`,
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/rewards');
              loadRewardData();
            }
          }
        ]
      );
    } else if (params.canceled === 'true') {
      Alert.alert(
        'Zahlung abgebrochen',
        'Die Zahlung wurde abgebrochen. Keine Coins wurden abgebucht.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/rewards')
          }
        ]
      );
    }
  };

  const loadRewardData = async () => {
    if (!user || isGuest) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [rewardHistory, creatorLevels] = await Promise.all([
        getCurrentUserRewardHistory(100),
        getCreatorLevels(),
      ]);

      setHistory(rewardHistory);
      setLevels(creatorLevels);
    } catch (error) {
      console.error('Error loading reward data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;

    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderHistoryItem = ({ item }: { item: RewardTransaction }) => (
    <Card style={styles.historyItem}>
      <View style={styles.historyItemContent}>
        <View style={styles.historyItemLeft}>
          <View style={[
            styles.historyItemIcon,
            { backgroundColor: item.amount > 0 ? Colors.primaryLight : Colors.errorLight }
          ]}>
            <Coins
              size={20}
              color={item.amount > 0 ? Colors.primary : Colors.error}
            />
          </View>
          <View style={styles.historyItemInfo}>
            <Text style={styles.historyItemTitle}>
              {formatRewardReason(item.reason)}
            </Text>
            <Text style={styles.historyItemDate}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
        <Text style={[
          styles.historyItemAmount,
          item.amount > 0 ? styles.historyItemAmountPositive : styles.historyItemAmountNegative
        ]}>
          {item.amount > 0 ? '+' : ''}{item.amount}
        </Text>
      </View>
    </Card>
  );

  if (isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Belohnungen</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Melde dich an, um deine Belohnungen zu sehen
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Belohnungen</Text>
          <View style={styles.placeholder} />
        </View>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Belohnungen</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Stats Overview */}
          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Coins size={24} color={Colors.accent} />
                <Text style={styles.statValue}>{formatCoins(coins)}</Text>
                <Text style={styles.statLabel}>Coins</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <TrendingUp size={24} color={Colors.primary} />
                <Text style={styles.statValue}>#{rank}</Text>
                <Text style={styles.statLabel}>Rang</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Award size={24} color={getLevelColor(level)} />
                <Text style={styles.statValue}>{level}</Text>
                <Text style={styles.statLabel}>Level</Text>
              </View>
            </View>
          </Card>

          {/* Coin Purchase Button */}
          <TouchableOpacity
            style={styles.purchaseButton}
            onPress={() => setShowPurchaseModal(true)}
          >
            <Coins size={20} color={Colors.white} />
            <Text style={styles.purchaseButtonText}>Coins kaufen</Text>
          </TouchableOpacity>

          {/* Level Progress */}
          {levelProgress.nextLevel && (
            <Card style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>
                  Fortschritt zu {levelProgress.nextLevel.level_name}
                </Text>
                <Text style={styles.progressPercent}>
                  {Math.round(levelProgress.progress)}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${levelProgress.progress}%` }
                  ]}
                />
              </View>
              <Text style={styles.progressInfo}>
                {stats?.total_followers || 0} / {levelProgress.nextLevel.benefits?.min_followers || 0} Follower
              </Text>
            </Card>
          )}

          {/* Creator Levels */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Creator Levels</Text>
            {levels.map((levelItem, index) => (
              <Card
                key={levelItem.id}
                style={[
                  styles.levelCard,
                  levelItem.level_name === level && styles.levelCardActive
                ]}
              >
                <View style={styles.levelCardContent}>
                  <View
                    style={[
                      styles.levelBadge,
                      { backgroundColor: getLevelColor(levelItem.level_name) }
                    ]}
                  >
                    <Award size={20} color={Colors.white} />
                  </View>
                  <View style={styles.levelInfo}>
                    <Text style={styles.levelName}>{levelItem.level_name}</Text>
                    <Text style={styles.levelRequirements}>
                      {levelItem.benefits?.min_followers || 0}+ Follower
                    </Text>
                    <Text style={styles.levelDescription}>
                      {levelItem.benefits.description} • {levelItem.benefits.coin_multiplier}x Coins
                    </Text>
                  </View>
                  {levelItem.level_name === level && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Aktuell</Text>
                    </View>
                  )}
                </View>
              </Card>
            ))}
          </View>

          {/* History */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transaktionen</Text>
            {history.length === 0 ? (
              <Card style={styles.emptyHistoryCard}>
                <Gift size={48} color={Colors.gray400} />
                <Text style={styles.emptyHistoryText}>
                  Noch keine Belohnungen erhalten
                </Text>
                <Text style={styles.emptyHistorySubtext}>
                  Erstelle Events, hoste Livestreams und sammle Coins!
                </Text>
              </Card>
            ) : (
              <FlatList
                data={history}
                keyExtractor={(item) => item.id}
                renderItem={renderHistoryItem}
                scrollEnabled={false}
              />
            )}
          </View>
        </View>
      </ScrollView>

      <CoinPurchaseModal
        visible={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onSuccess={() => {
          loadRewardData();
        }}
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
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: Spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray600,
    textAlign: 'center',
  },
  statsCard: {
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: Colors.border,
  },
  statValue: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    textTransform: 'uppercase',
  },
  progressCard: {
    marginBottom: Spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  progressPercent: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  progressBar: {
    height: 10,
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  progressInfo: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  levelCard: {
    marginBottom: Spacing.sm,
  },
  levelCardActive: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  levelCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelInfo: {
    flex: 1,
  },
  levelName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  levelRequirements: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    marginBottom: 4,
  },
  levelDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
  },
  currentBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  currentBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  historyItem: {
    marginBottom: Spacing.sm,
  },
  historyItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  historyItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.text,
    marginBottom: 2,
  },
  historyItemDate: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
  },
  historyItemAmount: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  historyItemAmountPositive: {
    color: Colors.success,
  },
  historyItemAmountNegative: {
    color: Colors.error,
  },
  emptyHistoryCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyHistoryText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray600,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyHistorySubtext: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    textAlign: 'center',
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  purchaseButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
});
