import React, { useState, useEffect } from 'react';
import { Colors } from '../../constants';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Key,
  TrendingUp,
  DollarSign,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
} from 'lucide-react-native';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../utils/authContext';

interface APIKey {
  id: string;
  service: string;
  key_name: string;
  masked_key: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;
}

interface APIUsageStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  rate_limited_requests: number;
  total_tokens: number;
  total_cost_usd: number;
  avg_execution_time_ms: number;
  by_service: Record<string, {
    requests: number;
    tokens: number;
    cost_usd: number;
  }>;
  daily_usage: Array<{
    date: string;
    requests: number;
    tokens: number;
    cost_usd: number;
  }>;
}

export default function APIManagement() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [usageStats, setUsageStats] = useState<APIUsageStats | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<7 | 30>(30);

  useEffect(() => {
    loadData();
  }, [timeRange, selectedService]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: keysData, error: keysError } = await supabase
        .rpc('get_api_keys_for_admin');

      if (keysError) throw keysError;
      setApiKeys(keysData || []);

      const { data: statsData, error: statsError } = await supabase
        .rpc('get_api_usage_stats', {
          days_back: timeRange,
          service_filter: selectedService,
        });

      if (statsError) throw statsError;
      setUsageStats(statsData);
    } catch (error) {
      console.error('Error loading API management data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'openai':
        return '🤖';
      case 'ticketmaster':
        return '🎫';
      case 'eventbrite':
        return '📅';
      default:
        return '🔑';
    }
  };

  const renderAPIKey = (key: APIKey) => (
    <View key={key.id} style={styles.keyCard}>
      <View style={styles.keyHeader}>
        <Text style={styles.keyIcon}>{getServiceIcon(key.service)}</Text>
        <View style={styles.keyInfo}>
          <Text style={styles.keyName}>{key.key_name}</Text>
          <Text style={styles.keyService}>{key.service}</Text>
        </View>
        <View style={[styles.statusBadge, key.is_active ? styles.statusActive : styles.statusInactive]}>
          {key.is_active ? (
            <CheckCircle size={16} color={Colors.success} />
          ) : (
            <XCircle size={16} color={Colors.error} />
          )}
          <Text style={[styles.statusText, key.is_active ? styles.statusTextActive : styles.statusTextInactive]}>
            {key.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.keyDetails}>
        <View style={styles.keyDetailRow}>
          <Text style={styles.keyDetailLabel}>API Key:</Text>
          <Text style={styles.keyDetailValue}>{key.masked_key}</Text>
        </View>
        {key.last_used_at && (
          <View style={styles.keyDetailRow}>
            <Text style={styles.keyDetailLabel}>Last Used:</Text>
            <Text style={styles.keyDetailValue}>
              {new Date(key.last_used_at).toLocaleString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}
        {key.metadata?.purpose && (
          <View style={styles.keyDetailRow}>
            <Text style={styles.keyDetailLabel}>Purpose:</Text>
            <Text style={styles.keyDetailValue}>{key.metadata.purpose}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderStatsOverview = () => {
    if (!usageStats) return null;

    return (
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
            <Zap size={24} color={Colors.primary} />
          </View>
          <Text style={styles.statNumber}>{usageStats.total_requests.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Requests</Text>
          <Text style={styles.statSubLabel}>
            {usageStats.successful_requests.toLocaleString()} success
          </Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
            <DollarSign size={24} color={Colors.success} />
          </View>
          <Text style={[styles.statNumber, { color: Colors.success }]}>
            ${usageStats.total_cost_usd.toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>Total Cost</Text>
          <Text style={styles.statSubLabel}>Last {timeRange} days</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
            <BarChart3 size={24} color="#2563EB" />
          </View>
          <Text style={styles.statNumber}>{usageStats.total_tokens.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Tokens Used</Text>
          <Text style={styles.statSubLabel}>OpenAI only</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#F3E8FF' }]}>
            <Clock size={24} color="#9333EA" />
          </View>
          <Text style={styles.statNumber}>{usageStats.avg_execution_time_ms}ms</Text>
          <Text style={styles.statLabel}>Avg Response</Text>
          <Text style={styles.statSubLabel}>Execution time</Text>
        </View>
      </View>
    );
  };

  const renderServiceStats = () => {
    if (!usageStats?.by_service) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Usage by Service</Text>
        {Object.entries(usageStats.by_service).map(([service, stats]) => (
          <TouchableOpacity
            key={service}
            style={styles.serviceCard}
            onPress={() => setSelectedService(selectedService === service ? null : service)}
          >
            <View style={styles.serviceHeader}>
              <Text style={styles.serviceIcon}>{getServiceIcon(service)}</Text>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service}</Text>
                <Text style={styles.serviceRequests}>{stats.requests.toLocaleString()} requests</Text>
              </View>
              <Text style={styles.serviceCost}>${stats.cost_usd.toFixed(2)}</Text>
            </View>
            {service === 'openai' && (
              <View style={styles.serviceDetails}>
                <Text style={styles.serviceDetailText}>
                  {stats.tokens.toLocaleString()} tokens
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderDailyUsage = () => {
    if (!usageStats?.daily_usage || usageStats.daily_usage.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Usage (Last {Math.min(7, usageStats.daily_usage.length)} days)</Text>
        {usageStats.daily_usage.slice(0, 7).map((day, index) => (
          <View key={index} style={styles.dailyCard}>
            <View style={styles.dailyHeader}>
              <Text style={styles.dailyDate}>
                {new Date(day.date).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: 'short',
                })}
              </Text>
              <Text style={styles.dailyCost}>${day.cost_usd.toFixed(2)}</Text>
            </View>
            <View style={styles.dailyStats}>
              <Text style={styles.dailyStatText}>{day.requests} requests</Text>
              {day.tokens > 0 && (
                <Text style={styles.dailyStatText}> • {day.tokens.toLocaleString()} tokens</Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading API Management...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>API Management</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.timeRangeContainer}>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === 7 && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange(7)}
        >
          <Text style={[styles.timeRangeText, timeRange === 7 && styles.timeRangeTextActive]}>
            7 Days
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === 30 && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange(30)}
        >
          <Text style={[styles.timeRangeText, timeRange === 30 && styles.timeRangeTextActive]}>
            30 Days
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {renderStatsOverview()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Keys</Text>
          {apiKeys.map(renderAPIKey)}
        </View>

        {renderServiceStats()}
        {renderDailyUsage()}
      </ScrollView>
    </SafeAreaView>
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
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: Colors.primary,
  },
  timeRangeText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
  },
  timeRangeTextActive: {
    color: Colors.white,
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statNumber: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  statSubLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginTop: 2,
  },
  section: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  keyCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  keyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  keyIcon: {
    fontSize: 32,
    marginRight: Spacing.sm,
  },
  keyInfo: {
    flex: 1,
  },
  keyName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },
  keyService: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusActive: {
    backgroundColor: Colors.successLight,
  },
  statusInactive: {
    backgroundColor: Colors.errorLight,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
  statusTextActive: {
    color: Colors.success,
  },
  statusTextInactive: {
    color: Colors.error,
  },
  keyDetails: {
    gap: Spacing.xs,
  },
  keyDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyDetailLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  keyDetailValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  serviceCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIcon: {
    fontSize: 28,
    marginRight: Spacing.sm,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  serviceRequests: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  serviceCost: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.success,
  },
  serviceDetails: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  serviceDetailText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  dailyCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  dailyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  dailyDate: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },
  dailyCost: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.success,
  },
  dailyStats: {
    flexDirection: 'row',
  },
  dailyStatText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
});
