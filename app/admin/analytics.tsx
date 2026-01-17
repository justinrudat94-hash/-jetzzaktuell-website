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
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, TrendingUp, AlertTriangle, Users, Shield, Activity } from 'lucide-react-native';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../utils/authContext';

interface AnalyticsData {
  day: string;
  total_violations: number;
  pending: number;
  resolved: number;
  ai_flagged: number;
  user_reported: number;
  unique_offenders: number;
  high_severity_count: number;
  medium_severity_count: number;
  low_severity_count: number;
}

interface SuspensionData {
  total_active: number;
  expiring_soon: number;
}

interface ViolationStats {
  total_violations: number;
  pending_violations: number;
  resolved_violations: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
}

export default function AdminAnalyticsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [suspensions, setSuspensions] = useState<SuspensionData>({ total_active: 0, expiring_soon: 0 });
  const [violationStats, setViolationStats] = useState<ViolationStats>({
    total_violations: 0,
    pending_violations: 0,
    resolved_violations: 0,
    high_severity: 0,
    medium_severity: 0,
    low_severity: 0,
  });

  useEffect(() => {
    if (!profile?.is_admin) {
      Alert.alert('Zugriff verweigert', 'Du hast keine Admin-Berechtigung');
      router.back();
      return;
    }

    loadAnalytics();
  }, [profile]);

  const loadAnalytics = async () => {
    setLoading(true);

    try {
      const [analyticsResult, suspensionsResult, violationsResult] = await Promise.all([
        supabase.from('moderation_analytics').select('*').limit(30),
        supabase
          .from('user_suspensions')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .gt('suspended_until', new Date().toISOString()),
        supabase.from('user_violations').select('*'),
      ]);

      if (analyticsResult.data) {
        setAnalytics(analyticsResult.data);
      }

      if (suspensionsResult.count !== null) {
        const expiringSoon = await supabase
          .from('user_suspensions')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .gt('suspended_until', new Date().toISOString())
          .lt('suspended_until', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

        setSuspensions({
          total_active: suspensionsResult.count,
          expiring_soon: expiringSoon.count || 0,
        });
      }

      if (violationsResult.data) {
        const violations = violationsResult.data;
        setViolationStats({
          total_violations: violations.length,
          pending_violations: violations.filter((v: any) => !v.resolved).length,
          resolved_violations: violations.filter((v: any) => v.resolved).length,
          high_severity: violations.filter((v: any) => v.severity === 'high').length,
          medium_severity: violations.filter((v: any) => v.severity === 'medium').length,
          low_severity: violations.filter((v: any) => v.severity === 'low').length,
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      Alert.alert('Fehler', 'Daten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const renderStatCard = (
    title: string,
    value: string | number,
    icon: any,
    color: string,
    subtitle?: string
  ) => (
    <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={styles.statHeader}>
        {React.createElement(icon, { size: 24, color })}
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const todayAnalytics = analytics.length > 0 ? analytics[0] : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Lade Analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Moderation Analytics</Text>
        <TouchableOpacity onPress={loadAnalytics}>
          <Activity size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Übersicht</Text>

        <View style={styles.statsGrid}>
          {renderStatCard(
            'Verstöße Gesamt',
            violationStats.total_violations,
            AlertTriangle,
            Colors.warning
          )}
          {renderStatCard(
            'Ausstehend',
            violationStats.pending_violations,
            Activity,
            Colors.error
          )}
          {renderStatCard(
            'Gelöst',
            violationStats.resolved_violations,
            Shield,
            Colors.success
          )}
          {renderStatCard(
            'Aktive Sperren',
            suspensions.total_active,
            Users,
            Colors.error,
            `${suspensions.expiring_soon} laufen bald ab`
          )}
        </View>

        <Text style={styles.sectionTitle}>Nach Schweregrad</Text>

        <View style={styles.severityContainer}>
          <View style={[styles.severityCard, { backgroundColor: `${Colors.error}20` }]}>
            <Text style={[styles.severityValue, { color: Colors.error }]}>
              {violationStats.high_severity}
            </Text>
            <Text style={styles.severityLabel}>Hoch</Text>
            <View style={[styles.severityBar, { backgroundColor: Colors.error, height: 60 }]} />
          </View>

          <View style={[styles.severityCard, { backgroundColor: `${Colors.warning}20` }]}>
            <Text style={[styles.severityValue, { color: Colors.warning }]}>
              {violationStats.medium_severity}
            </Text>
            <Text style={styles.severityLabel}>Mittel</Text>
            <View style={[styles.severityBar, { backgroundColor: Colors.warning, height: 40 }]} />
          </View>

          <View style={[styles.severityCard, { backgroundColor: `${Colors.info}20` }]}>
            <Text style={[styles.severityValue, { color: Colors.info }]}>
              {violationStats.low_severity}
            </Text>
            <Text style={styles.severityLabel}>Niedrig</Text>
            <View style={[styles.severityBar, { backgroundColor: Colors.info, height: 20 }]} />
          </View>
        </View>

        {todayAnalytics && (
          <>
            <Text style={styles.sectionTitle}>Heute</Text>

            <View style={styles.todayCard}>
              <View style={styles.todayRow}>
                <Text style={styles.todayLabel}>Verstöße gesamt</Text>
                <Text style={styles.todayValue}>{todayAnalytics.total_violations}</Text>
              </View>

              <View style={styles.todayRow}>
                <Text style={styles.todayLabel}>KI-gemeldet</Text>
                <Text style={[styles.todayValue, { color: Colors.primary }]}>
                  {todayAnalytics.ai_flagged}
                </Text>
              </View>

              <View style={styles.todayRow}>
                <Text style={styles.todayLabel}>User-gemeldet</Text>
                <Text style={[styles.todayValue, { color: Colors.secondary }]}>
                  {todayAnalytics.user_reported}
                </Text>
              </View>

              <View style={styles.todayRow}>
                <Text style={styles.todayLabel}>Einzigartige Verstöße</Text>
                <Text style={styles.todayValue}>{todayAnalytics.unique_offenders}</Text>
              </View>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Letzte 7 Tage</Text>

        <View style={styles.chartContainer}>
          {analytics.slice(0, 7).map((day, index) => {
            const maxViolations = Math.max(...analytics.slice(0, 7).map((d) => d.total_violations));
            const heightPercentage = maxViolations > 0 ? (day.total_violations / maxViolations) * 100 : 0;

            return (
              <View key={index} style={styles.chartBar}>
                <Text style={styles.chartValue}>{day.total_violations}</Text>
                <View
                  style={[
                    styles.chartBarFill,
                    {
                      height: `${heightPercentage}%`,
                      backgroundColor:
                        day.high_severity_count > 5
                          ? Colors.error
                          : day.medium_severity_count > 3
                          ? Colors.warning
                          : Colors.success,
                    },
                  ]}
                />
                <Text style={styles.chartLabel}>
                  {new Date(day.day).toLocaleDateString('de-DE', { weekday: 'short' })}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: Colors.error }]} />
            <Text style={styles.legendText}>Hoch (5+ High)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: Colors.warning }]} />
            <Text style={styles.legendText}>Mittel (3+ Medium)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: Colors.success }]} />
            <Text style={styles.legendText}>Niedrig</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => router.push('/admin/reports' as any)}
        >
          <Text style={styles.reportButtonText}>Zu den Meldungen</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray200,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    gap: Spacing.md,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  statTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  statValue: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
  },
  statSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  severityContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  severityCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  severityValue: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
  },
  severityLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  severityBar: {
    width: '100%',
    borderRadius: BorderRadius.sm,
  },
  todayCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  todayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  todayLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  todayValue: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  chartBarFill: {
    width: '80%',
    borderTopLeftRadius: BorderRadius.sm,
    borderTopRightRadius: BorderRadius.sm,
    minHeight: 4,
  },
  chartValue: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  chartLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.md,
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  reportButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  reportButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#fff',
  },
});
