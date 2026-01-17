import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { Colors, Spacing } from '../../constants';
import { Stack, router } from 'expo-router';
import {
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  Download,
  Calendar,
  UserCheck,
  UserX,
  ArrowLeft,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface SubscriptionData {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  plan_type: 'monthly' | 'yearly';
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  trial_start_date: string | null;
  trial_end_date: string | null;
  has_used_trial: boolean;
  created_at: string;
  profiles: {
    username: string;
    email: string;
  };
}

interface SubscriptionMetrics {
  total_subscriptions: number;
  active_subscriptions: number;
  trialing_subscriptions: number;
  canceled_subscriptions: number;
  past_due_subscriptions: number;
  monthly_count: number;
  yearly_count: number;
  mrr: number;
  trial_conversion_rate: number;
  churn_rate: number;
}

export default function PremiumSubscriptionsScreen() {
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'trialing' | 'canceled'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [metricsData, subsData] = await Promise.all([
        loadMetrics(),
        loadSubscriptions(),
      ]);
      setMetrics(metricsData);
      setSubscriptions(subsData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Fehler', 'Daten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async (): Promise<SubscriptionMetrics> => {
    const { data: allSubs, error } = await supabase
      .from('premium_subscriptions')
      .select('plan_type, status, has_used_trial, created_at');

    if (error) throw error;

    const active = allSubs?.filter((s) => s.status === 'active').length || 0;
    const trialing = allSubs?.filter((s) => s.status === 'trialing').length || 0;
    const canceled = allSubs?.filter((s) => s.status === 'canceled').length || 0;
    const pastDue = allSubs?.filter((s) => s.status === 'past_due').length || 0;

    const monthly = allSubs?.filter((s) => s.plan_type === 'monthly' && s.status === 'active').length || 0;
    const yearly = allSubs?.filter((s) => s.plan_type === 'yearly' && s.status === 'active').length || 0;

    const monthlyPrice = 4.99;
    const yearlyPrice = 49.99;
    const mrr = monthly * monthlyPrice + yearly * (yearlyPrice / 12);

    const trialUsers = allSubs?.filter((s) => s.has_used_trial) || [];
    const convertedTrials = trialUsers.filter((s) => s.status === 'active').length;
    const trialConversionRate = trialUsers.length > 0 ? (convertedTrials / trialUsers.length) * 100 : 0;

    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthString = thisMonth.toISOString();
    const canceledThisMonth = allSubs?.filter(
      (s) => s.status === 'canceled' && s.created_at >= thisMonthString
    ).length || 0;
    const activeStart = active + canceledThisMonth;
    const churnRate = activeStart > 0 ? (canceledThisMonth / activeStart) * 100 : 0;

    return {
      total_subscriptions: allSubs?.length || 0,
      active_subscriptions: active,
      trialing_subscriptions: trialing,
      canceled_subscriptions: canceled,
      past_due_subscriptions: pastDue,
      monthly_count: monthly,
      yearly_count: yearly,
      mrr: Math.round(mrr * 100) / 100,
      trial_conversion_rate: Math.round(trialConversionRate * 100) / 100,
      churn_rate: Math.round(churnRate * 100) / 100,
    };
  };

  const loadSubscriptions = async (): Promise<SubscriptionData[]> => {
    const { data, error } = await supabase
      .from('premium_subscriptions')
      .select(
        `
        id,
        user_id,
        stripe_subscription_id,
        plan_type,
        status,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        trial_start_date,
        trial_end_date,
        has_used_trial,
        created_at,
        profiles!inner(username, email)
      `
      )
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const exportToCSV = () => {
    if (!subscriptions.length) {
      Alert.alert('Info', 'Keine Daten zum Exportieren');
      return;
    }

    try {
      const csv = generateCSV(subscriptions);
      const filename = `premium_subscriptions_${new Date().toISOString().split('T')[0]}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
        Alert.alert('Erfolg', 'CSV-Export erfolgreich!');
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      Alert.alert('Fehler', 'CSV-Export fehlgeschlagen');
    }
  };

  const generateCSV = (data: SubscriptionData[]): string => {
    const lines: string[] = [];
    lines.push('Premium Subscriptions Report');
    lines.push(`Erstellt am,${new Date().toLocaleString('de-DE')}`);
    lines.push('');
    lines.push(
      'Username,Email,Plan,Status,Erstellt am,Period Start,Period End,Trial,Cancel at End'
    );

    data.forEach((sub) => {
      lines.push(
        `${sub.profiles.username},${sub.profiles.email},${sub.plan_type},${sub.status},${new Date(sub.created_at).toLocaleDateString('de-DE')},${new Date(sub.current_period_start).toLocaleDateString('de-DE')},${new Date(sub.current_period_end).toLocaleDateString('de-DE')},${sub.has_used_trial ? 'Ja' : 'Nein'},${sub.cancel_at_period_end ? 'Ja' : 'Nein'}`
      );
    });

    return lines.join('\n');
  };

  const getFilteredSubscriptions = () => {
    if (filter === 'all') return subscriptions;
    if (filter === 'active') return subscriptions.filter((s) => s.status === 'active');
    if (filter === 'trialing') return subscriptions.filter((s) => s.status === 'trialing');
    if (filter === 'canceled') return subscriptions.filter((s) => s.status === 'canceled');
    return subscriptions;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return Colors.success;
      case 'trialing':
        return Colors.warning;
      case 'canceled':
        return Colors.error;
      case 'past_due':
        return '#ef4444';
      default:
        return Colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktiv';
      case 'trialing':
        return 'Trial';
      case 'canceled':
        return 'Gekündigt';
      case 'past_due':
        return 'Überfällig';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Premium Subscriptions' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (!metrics) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Premium Subscriptions' }} />
        <Text style={styles.errorText}>Failed to load metrics</Text>
      </View>
    );
  }

  const filteredSubs = getFilteredSubscriptions();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Premium Subscriptions', headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Subscriptions</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerSection}>
          <Text style={styles.sectionTitle}>Subscription Overview</Text>
          <TouchableOpacity style={styles.exportButton} onPress={exportToCSV}>
            <Download size={16} color={Colors.primary} />
            <Text style={styles.exportButtonText}>Export CSV</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: `${Colors.primary}20` }]}>
              <Users size={24} color={Colors.primary} />
            </View>
            <Text style={styles.metricValue}>{metrics.total_subscriptions}</Text>
            <Text style={styles.metricLabel}>Total</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: `${Colors.success}20` }]}>
              <UserCheck size={24} color={Colors.success} />
            </View>
            <Text style={styles.metricValue}>{metrics.active_subscriptions}</Text>
            <Text style={styles.metricLabel}>Aktiv</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: `${Colors.warning}20` }]}>
              <Clock size={24} color={Colors.warning} />
            </View>
            <Text style={styles.metricValue}>{metrics.trialing_subscriptions}</Text>
            <Text style={styles.metricLabel}>Trial</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: `${Colors.error}20` }]}>
              <UserX size={24} color={Colors.error} />
            </View>
            <Text style={styles.metricValue}>{metrics.canceled_subscriptions}</Text>
            <Text style={styles.metricLabel}>Gekündigt</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <DollarSign size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>Revenue Metrics</Text>
          </View>
          <View style={styles.revenueGrid}>
            <View style={styles.revenueItem}>
              <Text style={styles.revenueLabel}>MRR</Text>
              <Text style={styles.revenueValue}>{metrics.mrr.toFixed(2)} €</Text>
            </View>
            <View style={styles.revenueItem}>
              <Text style={styles.revenueLabel}>ARR (projected)</Text>
              <Text style={styles.revenueValue}>{(metrics.mrr * 12).toFixed(2)} €</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TrendingUp size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>Key Metrics</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Trial Conversion</Text>
              <Text style={[styles.statValue, { color: Colors.success }]}>
                {metrics.trial_conversion_rate.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Churn Rate</Text>
              <Text style={[styles.statValue, { color: Colors.error }]}>
                {metrics.churn_rate.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Monthly Plans</Text>
              <Text style={styles.statValue}>{metrics.monthly_count}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Yearly Plans</Text>
              <Text style={styles.statValue}>{metrics.yearly_count}</Text>
            </View>
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Subscriptions ({filteredSubs.length})</Text>
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
                Alle
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
              onPress={() => setFilter('active')}
            >
              <Text
                style={[styles.filterButtonText, filter === 'active' && styles.filterButtonTextActive]}
              >
                Aktiv
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'trialing' && styles.filterButtonActive]}
              onPress={() => setFilter('trialing')}
            >
              <Text
                style={[styles.filterButtonText, filter === 'trialing' && styles.filterButtonTextActive]}
              >
                Trial
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'canceled' && styles.filterButtonActive]}
              onPress={() => setFilter('canceled')}
            >
              <Text
                style={[styles.filterButtonText, filter === 'canceled' && styles.filterButtonTextActive]}
              >
                Gekündigt
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {filteredSubs.map((sub) => (
          <View key={sub.id} style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeader}>
              <View style={styles.subscriptionUser}>
                <Text style={styles.subscriptionUsername}>{sub.profiles.username}</Text>
                <Text style={styles.subscriptionEmail}>{sub.profiles.email}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(sub.status)}20` }]}>
                <Text style={[styles.statusText, { color: getStatusColor(sub.status) }]}>
                  {getStatusLabel(sub.status)}
                </Text>
              </View>
            </View>

            <View style={styles.subscriptionDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Plan:</Text>
                <Text style={styles.detailValue}>
                  {sub.plan_type === 'monthly' ? 'Monatlich' : 'Jährlich'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Erstellt:</Text>
                <Text style={styles.detailValue}>
                  {new Date(sub.created_at).toLocaleDateString('de-DE')}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Period:</Text>
                <Text style={styles.detailValue}>
                  {new Date(sub.current_period_start).toLocaleDateString('de-DE')} -{' '}
                  {new Date(sub.current_period_end).toLocaleDateString('de-DE')}
                </Text>
              </View>
              {sub.trial_start_date && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trial:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(sub.trial_start_date).toLocaleDateString('de-DE')} -{' '}
                    {sub.trial_end_date
                      ? new Date(sub.trial_end_date).toLocaleDateString('de-DE')
                      : 'N/A'}
                  </Text>
                </View>
              )}
              {sub.cancel_at_period_end && (
                <View style={styles.warningBanner}>
                  <Calendar size={16} color={Colors.warning} />
                  <Text style={styles.warningText}>Kündigt am Periodenende</Text>
                </View>
              )}
            </View>
          </View>
        ))}

        {filteredSubs.length === 0 && (
          <View style={styles.emptyState}>
            <Users size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyStateText}>Keine Subscriptions gefunden</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 60 : Spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  revenueGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: Spacing.md,
  },
  revenueItem: {
    flex: 1,
    alignItems: 'center',
  },
  revenueLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  revenueValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  filterSection: {
    marginTop: Spacing.lg,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  subscriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  subscriptionUser: {
    flex: 1,
  },
  subscriptionUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  subscriptionEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subscriptionDetails: {
    gap: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: `${Colors.warning}10`,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
