import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  DollarSign,
  Coins,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react-native';
import { Colors } from '../../constants';
import {
  getFinanceOverview,
  getCoinValue,
  updateCoinValue,
  getCoinDistribution,
  type FinanceOverview,
} from '../../services/financeService';
import {
  getPayoutQueue,
  updatePayoutStatus,
  type PayoutRequest,
} from '../../services/payoutService';
import {
  getFraudStatistics,
  getRiskLevelEmoji,
} from '../../services/fraudDetectionService';

export default function FinancesAdminScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [coinValue, setCoinValue] = useState(0.001);
  const [editingCoinValue, setEditingCoinValue] = useState(false);
  const [newCoinValue, setNewCoinValue] = useState('0.001');
  const [payoutQueue, setPayoutQueue] = useState<{
    pending: PayoutRequest[];
    reviewing: PayoutRequest[];
    high_priority: PayoutRequest[];
  }>({ pending: [], reviewing: [], high_priority: [] });
  const [fraudStats, setFraudStats] = useState<any>(null);
  const [coinDist, setCoinDist] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [overviewData, value, queue, fraud, dist] = await Promise.all([
        getFinanceOverview(),
        getCoinValue(),
        getPayoutQueue(),
        getFraudStatistics(),
        getCoinDistribution(),
      ]);

      setOverview(overviewData);
      setCoinValue(value);
      setNewCoinValue(value.toString());
      setPayoutQueue(queue);
      setFraudStats(fraud);
      setCoinDist(dist);
    } catch (error) {
      console.error('Error loading finance data:', error);
      Alert.alert('Fehler', 'Daten konnten nicht geladen werden');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleUpdateCoinValue = async () => {
    try {
      const value = parseFloat(newCoinValue);
      if (isNaN(value) || value <= 0) {
        Alert.alert('Fehler', 'Ungültiger Coin-Wert');
        return;
      }

      Alert.alert(
        'Coin-Wert ändern?',
        `Aktuell: €${coinValue}\nNeu: €${value}\n\nAlle bestehenden Coins werden mit dem neuen Wert berechnet!`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Bestätigen',
            onPress: async () => {
              const { error } = await updateCoinValue(value);
              if (error) {
                Alert.alert('Fehler', error.message);
              } else {
                setCoinValue(value);
                setEditingCoinValue(false);
                Alert.alert('Erfolg', 'Coin-Wert wurde aktualisiert');
                loadData();
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error updating coin value:', error);
      Alert.alert('Fehler', 'Coin-Wert konnte nicht aktualisiert werden');
    }
  };

  const handlePayoutAction = async (payoutId: string, action: 'approve' | 'reject') => {
    try {
      const status = action === 'approve' ? 'approved' : 'rejected';
      const { error } = await updatePayoutStatus(payoutId, status);

      if (error) {
        Alert.alert('Fehler', error.message);
      } else {
        Alert.alert('Erfolg', `Auszahlung ${action === 'approve' ? 'genehmigt' : 'abgelehnt'}`);
        loadData();
      }
    } catch (error) {
      console.error('Error updating payout:', error);
      Alert.alert('Fehler', 'Auszahlung konnte nicht aktualisiert werden');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('de-DE').format(num);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Lade Finanzdaten...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>💰 Finanzen</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <RefreshCw size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 ÜBERSICHT</Text>
          <View style={styles.cardsGrid}>
            <View style={[styles.card, styles.cardPrimary]}>
              <DollarSign size={24} color="#FFF" />
              <Text style={styles.cardLabel}>Einnahmen Gesamt</Text>
              <Text style={styles.cardValue}>
                {formatCurrency(overview?.total_purchases_eur || 0)}
              </Text>
            </View>

            <View style={[styles.card, styles.cardSuccess]}>
              <Coins size={24} color="#FFF" />
              <Text style={styles.cardLabel}>Coins im Umlauf</Text>
              <Text style={styles.cardValue}>
                {formatNumber(overview?.coins_in_circulation || 0)}
              </Text>
            </View>

            <View style={[styles.card, styles.cardWarning]}>
              <Clock size={24} color="#FFF" />
              <Text style={styles.cardLabel}>Auszahlbar</Text>
              <Text style={styles.cardValue}>
                {formatCurrency(overview?.pending_payouts_eur || 0)}
              </Text>
              <Text style={styles.cardSubtext}>
                {overview?.pending_payouts_count || 0} Anfragen
              </Text>
            </View>

            <View style={[styles.card, styles.cardInfo]}>
              <TrendingUp size={24} color="#FFF" />
              <Text style={styles.cardLabel}>Netto-Gewinn</Text>
              <Text style={styles.cardValue}>
                {formatCurrency(overview?.net_revenue_eur || 0)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🪙 COIN-WERT</Text>
            {!editingCoinValue && (
              <TouchableOpacity onPress={() => setEditingCoinValue(true)}>
                <Settings size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.coinValueCard}>
            {editingCoinValue ? (
              <View>
                <Text style={styles.coinValueLabel}>Neuer Coin-Wert (EUR)</Text>
                <TextInput
                  style={styles.coinValueInput}
                  value={newCoinValue}
                  onChangeText={setNewCoinValue}
                  keyboardType="decimal-pad"
                  placeholder="0.001"
                />
                <View style={styles.coinValueActions}>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary]}
                    onPress={() => {
                      setEditingCoinValue(false);
                      setNewCoinValue(coinValue.toString());
                    }}
                  >
                    <Text style={styles.buttonSecondaryText}>Abbrechen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonPrimary]}
                    onPress={handleUpdateCoinValue}
                  >
                    <Text style={styles.buttonText}>Speichern</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.coinValueLabel}>Aktueller Wert</Text>
                <Text style={styles.coinValueAmount}>1 Coin = €{coinValue.toFixed(6)}</Text>
                <Text style={styles.coinValueExample}>
                  Beispiel: 10.000 Coins = {formatCurrency(10000 * coinValue)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💸 AUSZAHLUNGS-WARTESCHLANGE</Text>

          {payoutQueue.high_priority.length > 0 && (
            <View style={styles.alertBox}>
              <AlertTriangle size={20} color="#DC2626" />
              <Text style={styles.alertText}>
                {payoutQueue.high_priority.length} dringende Auszahlungen
              </Text>
            </View>
          )}

          {payoutQueue.pending.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle size={48} color="#10B981" />
              <Text style={styles.emptyStateText}>Keine offenen Auszahlungen</Text>
            </View>
          ) : (
            <View>
              {payoutQueue.pending.slice(0, 5).map((payout) => (
                <View key={payout.id} style={styles.payoutCard}>
                  <View style={styles.payoutHeader}>
                    <View>
                      <Text style={styles.payoutUser}>
                        {payout.profiles?.name || 'Unbekannt'}
                      </Text>
                      <Text style={styles.payoutAmount}>
                        {formatNumber(payout.coins_amount)} Coins → {formatCurrency(parseFloat(payout.eur_amount.toString()))}
                      </Text>
                    </View>
                    <View style={styles.payoutBadge}>
                      <Text style={styles.payoutBadgeText}>
                        {getRiskLevelEmoji(payout.fraud_score >= 75 ? 'critical' : payout.fraud_score >= 50 ? 'high' : 'low')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.payoutMeta}>
                    <Text style={styles.payoutMetaText}>
                      Methode: {payout.payout_method === 'paypal' ? 'PayPal' : 'Bank'}
                    </Text>
                    <Text style={styles.payoutMetaText}>
                      Score: {payout.fraud_score}
                    </Text>
                  </View>

                  <View style={styles.payoutActions}>
                    <TouchableOpacity
                      style={[styles.payoutButton, styles.payoutButtonReject]}
                      onPress={() => handlePayoutAction(payout.id, 'reject')}
                    >
                      <XCircle size={16} color="#FFF" />
                      <Text style={styles.payoutButtonText}>Ablehnen</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.payoutButton, styles.payoutButtonApprove]}
                      onPress={() => handlePayoutAction(payout.id, 'approve')}
                    >
                      <CheckCircle size={16} color="#FFF" />
                      <Text style={styles.payoutButtonText}>Genehmigen</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {fraudStats && fraudStats.total_active_alerts > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚨 BETRUGS-WARNUNGEN</Text>
            <View style={styles.fraudCard}>
              <View style={styles.fraudRow}>
                <Text style={styles.fraudLabel}>Aktive Warnungen:</Text>
                <Text style={styles.fraudValue}>{fraudStats.total_active_alerts}</Text>
              </View>
              <View style={styles.fraudRow}>
                <Text style={styles.fraudLabel}>Kritisch:</Text>
                <Text style={[styles.fraudValue, styles.fraudCritical]}>
                  {fraudStats.by_severity.critical || 0}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6B7280' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  refreshButton: { padding: 8 },
  scrollView: { flex: 1 },
  section: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 12 },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '48%', padding: 16, borderRadius: 12, minHeight: 120 },
  cardPrimary: { backgroundColor: Colors.primary },
  cardSuccess: { backgroundColor: '#10B981' },
  cardWarning: { backgroundColor: '#F59E0B' },
  cardInfo: { backgroundColor: '#3B82F6' },
  cardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 8, marginBottom: 4 },
  cardValue: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  cardSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  coinValueCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  coinValueLabel: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  coinValueAmount: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  coinValueExample: { fontSize: 12, color: '#9CA3AF' },
  coinValueInput: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  coinValueActions: { flexDirection: 'row', gap: 8 },
  button: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonPrimary: { backgroundColor: Colors.primary },
  buttonSecondary: { backgroundColor: '#F3F4F6' },
  buttonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  buttonSecondaryText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  alertBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, marginBottom: 12, gap: 8 },
  alertText: { color: '#DC2626', fontWeight: '600', fontSize: 14 },
  emptyState: { alignItems: 'center', padding: 32, backgroundColor: '#FFF', borderRadius: 12 },
  emptyStateText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  payoutCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  payoutHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  payoutUser: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  payoutAmount: { fontSize: 14, color: '#6B7280' },
  payoutBadge: { padding: 4 },
  payoutBadgeText: { fontSize: 20 },
  payoutMeta: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  payoutMetaText: { fontSize: 12, color: '#6B7280' },
  payoutActions: { flexDirection: 'row', gap: 8 },
  payoutButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, gap: 6 },
  payoutButtonApprove: { backgroundColor: '#10B981' },
  payoutButtonReject: { backgroundColor: '#EF4444' },
  payoutButtonText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  fraudCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FEE2E2' },
  fraudRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  fraudLabel: { fontSize: 14, color: '#6B7280' },
  fraudValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  fraudCritical: { color: '#DC2626' },
});
