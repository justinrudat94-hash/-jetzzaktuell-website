import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Colors, Spacing } from '../../constants';
import { Stack } from 'expo-router';
import { TrendingUp, TrendingDown, Minus, DollarSign, Users, Target, Download, FileText, Video } from 'lucide-react-native';
import { revenueService, DashboardMetrics } from '../../services/revenueService';

export default function RevenueScreen() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const data = await revenueService.getDashboardMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await revenueService.calculateDailyStats();
    await loadMetrics();
    setRefreshing(false);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp size={20} color="#10b981" />;
    if (trend === 'down') return <TrendingDown size={20} color="#ef4444" />;
    return <Minus size={20} color="#6b7280" />;
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return '#10b981';
    if (trend === 'down') return '#ef4444';
    return '#6b7280';
  };

  const exportToCSV = async () => {
    if (!metrics) return;

    try {
      const csv = generateCSV(metrics);
      const filename = `revenue_${new Date().toISOString().split('T')[0]}.csv`;

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

  const generateCSV = (data: DashboardMetrics): string => {
    const lines: string[] = [];

    lines.push('JETZZ Revenue Report');
    lines.push(`Erstellt am,${new Date().toLocaleString('de-DE')}`);
    lines.push('');

    lines.push('Daily Revenue');
    lines.push('Quelle,Betrag');
    lines.push(`AdMob,${data.revenue.daily_revenue.admob}`);
    lines.push(`Premium,${data.revenue.daily_revenue.premium}`);
    lines.push(`Total,${data.revenue.daily_revenue.total}`);
    lines.push('');

    lines.push('Monthly Revenue');
    lines.push('Quelle,Betrag');
    lines.push(`AdMob,${data.revenue.monthly_revenue.admob}`);
    lines.push(`Premium,${data.revenue.monthly_revenue.premium}`);
    lines.push(`Total,${data.revenue.monthly_revenue.total}`);
    lines.push('');

    lines.push('Ad Performance');
    lines.push('Ad Type,Impressions,Clicks,CTR,eCPM');
    data.ad_performance.forEach(ad => {
      lines.push(`${ad.ad_type},${ad.impressions},${ad.clicks},${ad.ctr},${ad.ecpm}`);
    });
    lines.push('');

    lines.push('Premium Stats');
    lines.push('Metric,Value');
    lines.push(`Total Users,${data.premium_stats.total_users}`);
    lines.push(`Premium Users,${data.premium_stats.premium_users}`);
    lines.push(`Conversion Rate,${data.premium_stats.conversion_rate}%`);
    lines.push(`MRR,${data.premium_stats.mrr}`);
    lines.push('');

    lines.push('Live-Stream Ads');
    lines.push('Metric,Value');
    lines.push(`Total Streams,${data.livestream_ads.total_streams}`);
    lines.push(`Pre-Roll Impressions,${data.livestream_ads.pre_roll_impressions}`);
    lines.push(`Mid-Roll Impressions,${data.livestream_ads.mid_roll_impressions}`);
    lines.push(`Total Completions,${data.livestream_ads.total_completions}`);
    lines.push(`Total Skips,${data.livestream_ads.total_skips}`);
    lines.push(`Completion Rate,${data.livestream_ads.avg_completion_rate}%`);
    lines.push(`Revenue,${data.livestream_ads.revenue_eur}`);

    return lines.join('\n');
  };

  const exportToPDF = async () => {
    Alert.alert('Info', 'PDF-Export wird in einer zukünftigen Version verfügbar sein');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Revenue Dashboard' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (!metrics) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Revenue Dashboard' }} />
        <Text style={styles.errorText}>Failed to load metrics</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Revenue Dashboard' }} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerSection}>
          <Text style={styles.sectionTitle}>Revenue Overview</Text>
          <View style={styles.exportButtons}>
            <TouchableOpacity style={styles.exportButton} onPress={exportToCSV}>
              <Download size={16} color={Colors.primary} />
              <Text style={styles.exportButtonText}>CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportButton} onPress={exportToPDF}>
              <FileText size={16} color={Colors.primary} />
              <Text style={styles.exportButtonText}>PDF</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <DollarSign size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>Daily Revenue</Text>
          </View>
          <Text style={styles.revenueAmount}>
            {revenueService.formatCurrency(metrics.revenue.daily_revenue.total)}
          </Text>
          <View style={styles.trendRow}>
            {getTrendIcon(metrics.revenue.revenue_trend)}
            <Text style={[styles.trendText, { color: getTrendColor(metrics.revenue.revenue_trend) }]}>
              {metrics.revenue.trend_percentage > 0 ? '+' : ''}
              {revenueService.formatPercentage(metrics.revenue.trend_percentage)} vs yesterday
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.revenueBreakdown}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>AdMob</Text>
              <Text style={styles.breakdownValue}>
                {revenueService.formatCurrency(metrics.revenue.daily_revenue.admob)}
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Premium</Text>
              <Text style={styles.breakdownValue}>
                {revenueService.formatCurrency(metrics.revenue.daily_revenue.premium)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <DollarSign size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>Monthly Revenue</Text>
          </View>
          <Text style={styles.revenueAmount}>
            {revenueService.formatCurrency(metrics.revenue.monthly_revenue.total)}
          </Text>
          <View style={styles.divider} />
          <View style={styles.revenueBreakdown}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>AdMob</Text>
              <Text style={styles.breakdownValue}>
                {revenueService.formatCurrency(metrics.revenue.monthly_revenue.admob)}
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Premium</Text>
              <Text style={styles.breakdownValue}>
                {revenueService.formatCurrency(metrics.revenue.monthly_revenue.premium)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Ad Performance</Text>

        {metrics.ad_performance.map((ad) => (
          <View key={ad.ad_type} style={styles.card}>
            <Text style={styles.adTypeTitle}>
              {ad.ad_type.charAt(0).toUpperCase() + ad.ad_type.slice(1)} Ads
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Impressions</Text>
                <Text style={styles.statValue}>{ad.impressions.toLocaleString()}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>
                  {ad.ad_type === 'rewarded' ? 'Completions' : 'Clicks'}
                </Text>
                <Text style={styles.statValue}>
                  {ad.ad_type === 'rewarded'
                    ? ad.completions?.toLocaleString() || '0'
                    : ad.clicks.toLocaleString()}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>
                  {ad.ad_type === 'rewarded' ? 'Completion Rate' : 'CTR'}
                </Text>
                <Text style={styles.statValue}>
                  {ad.ad_type === 'rewarded'
                    ? revenueService.formatPercentage(ad.completion_rate || 0)
                    : revenueService.formatPercentage(ad.ctr)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>eCPM</Text>
                <Text style={styles.statValue}>
                  {revenueService.formatCurrency(ad.ecpm)}
                </Text>
              </View>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Premium Stats</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Users size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>Premium Users</Text>
          </View>
          <Text style={styles.largeNumber}>{metrics.premium_stats.premium_users}</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Users</Text>
              <Text style={styles.statValue}>{metrics.premium_stats.total_users}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Conversion Rate</Text>
              <Text style={styles.statValue}>
                {revenueService.formatPercentage(metrics.premium_stats.conversion_rate)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Active Paying</Text>
              <Text style={styles.statValue}>{metrics.premium_stats.active_paying_users}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>In Trial</Text>
              <Text style={[styles.statValue, { color: Colors.warning }]}>
                {metrics.premium_stats.trial_users}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Monthly</Text>
              <Text style={styles.statValue}>{metrics.premium_stats.monthly_subscriptions}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Yearly</Text>
              <Text style={styles.statValue}>{metrics.premium_stats.yearly_subscriptions}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Target size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>Monthly Recurring Revenue</Text>
          </View>
          <Text style={styles.revenueAmount}>
            {revenueService.formatCurrency(metrics.premium_stats.mrr)}
          </Text>
          <Text style={styles.helpText}>Projected monthly revenue from active subscriptions</Text>
        </View>

        <Text style={styles.sectionTitle}>Live-Stream Ads</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Video size={24} color={Colors.error} />
            <Text style={styles.cardTitle}>Live-Stream Ad Performance</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Streams</Text>
              <Text style={styles.statValue}>{metrics.livestream_ads.total_streams}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Pre-Roll</Text>
              <Text style={styles.statValue}>{metrics.livestream_ads.pre_roll_impressions.toLocaleString()}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Mid-Roll</Text>
              <Text style={styles.statValue}>{metrics.livestream_ads.mid_roll_impressions.toLocaleString()}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Completions</Text>
              <Text style={styles.statValue}>{metrics.livestream_ads.total_completions.toLocaleString()}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Completion Rate</Text>
              <Text style={styles.statValue}>
                {revenueService.formatPercentage(metrics.livestream_ads.avg_completion_rate)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Revenue</Text>
              <Text style={styles.statValue}>
                {revenueService.formatCurrency(metrics.livestream_ads.revenue_eur)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.lastUpdated}>
          Last updated: {new Date(metrics.last_updated).toLocaleString('de-DE')}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
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
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  revenueAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.primary,
    marginVertical: Spacing.sm,
  },
  largeNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.primary,
    marginVertical: Spacing.sm,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: Spacing.md,
  },
  revenueBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  adTypeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.md,
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
  helpText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  lastUpdated: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
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
});
