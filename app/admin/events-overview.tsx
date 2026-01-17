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
import { ArrowLeft, Calendar, TrendingUp, RefreshCw, Database, Clock } from 'lucide-react-native';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants';
import { dashboardService, EventSourceStats } from '../../services/dashboardService';
import { supabase } from '@/lib/supabase';

interface ImportStats {
  scrapedTotal: number;
  eventsTotal: number;
  pendingImport: number;
}

export default function EventsOverview() {
  const [stats, setStats] = useState<EventSourceStats[]>([]);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await dashboardService.getEventSourceStats();
      setStats(data);

      // Load import stats
      const { count: scrapedTotal } = await supabase
        .from('scraped_events')
        .select('*', { count: 'exact', head: true });

      const { count: eventsTotal } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true });

      const { count: pendingImport } = await supabase
        .from('scraped_events')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'approved'])
        .is('event_id', null);

      setImportStats({
        scrapedTotal: scrapedTotal || 0,
        eventsTotal: eventsTotal || 0,
        pendingImport: pendingImport || 0,
      });
    } catch (error) {
      console.error('Error loading event stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const getSourceDisplayName = (source: string) => {
    const names: Record<string, string> = {
      manual: 'Manuell erstellt',
      ticketmaster: 'Ticketmaster',
      eventbrite: 'Eventbrite',
      scraped: 'Web Scraping',
    };
    return names[source] || source;
  };

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      manual: Colors.primary,
      ticketmaster: '#026CDF',
      eventbrite: '#F05537',
      scraped: Colors.success,
    };
    return colors[source] || Colors.textSecondary;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Lade Event-Statistiken...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalEvents = stats.reduce((sum, s) => sum + s.total, 0);
  const upcomingEvents = stats.reduce((sum, s) => sum + s.upcoming, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Event-Übersicht</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <RefreshCw size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Calendar size={32} color={Colors.primary} />
              <Text style={styles.summaryValue}>{totalEvents}</Text>
              <Text style={styles.summaryLabel}>Gesamt Events</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <TrendingUp size={32} color={Colors.success} />
              <Text style={styles.summaryValue}>{upcomingEvents}</Text>
              <Text style={styles.summaryLabel}>Kommende Events</Text>
            </View>
          </View>
        </View>

        {importStats && (
          <View style={styles.importStatusCard}>
            <View style={styles.importHeader}>
              <Database size={20} color={Colors.primary} />
              <Text style={styles.importTitle}>Auto-Import Status</Text>
              <Clock size={16} color={Colors.success} />
            </View>

            <View style={styles.importStats}>
              <View style={styles.importStat}>
                <Text style={styles.importStatValue}>{importStats.scrapedTotal}</Text>
                <Text style={styles.importStatLabel}>Ticketmaster DB</Text>
              </View>
              <Text style={styles.importArrow}>→</Text>
              <View style={styles.importStat}>
                <Text style={styles.importStatValue}>{importStats.eventsTotal}</Text>
                <Text style={styles.importStatLabel}>Live Events</Text>
              </View>
            </View>

            {importStats.pendingImport > 0 && (
              <View style={styles.importProgress}>
                <Text style={styles.importProgressText}>
                  ⏳ {importStats.pendingImport} Events warten auf Import
                </Text>
                <Text style={styles.importProgressSubtext}>
                  Cron läuft alle 5 Min | ~{Math.ceil(importStats.pendingImport / 600)} Stunden verbleibend
                </Text>
              </View>
            )}

            {importStats.pendingImport === 0 && (
              <View style={styles.importComplete}>
                <Text style={styles.importCompleteText}>✅ Alle Events synchronisiert!</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Events nach Quelle</Text>

          {stats.map((stat, index) => (
            <View key={stat.source} style={styles.sourceCard}>
              <View style={styles.sourceHeader}>
                <View
                  style={[
                    styles.sourceIndicator,
                    { backgroundColor: getSourceColor(stat.source) },
                  ]}
                />
                <Text style={styles.sourceName}>
                  {getSourceDisplayName(stat.source)}
                </Text>
                <Text style={styles.sourceTotal}>{stat.total}</Text>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stat.upcoming}</Text>
                  <Text style={styles.statLabel}>Kommend</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stat.today}</Text>
                  <Text style={styles.statLabel}>Heute</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stat.this_week}</Text>
                  <Text style={styles.statLabel}>Diese Woche</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stat.this_month}</Text>
                  <Text style={styles.statLabel}>Dieser Monat</Text>
                </View>
              </View>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(stat.total / totalEvents) * 100}%`,
                      backgroundColor: getSourceColor(stat.source),
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {((stat.total / totalEvents) * 100).toFixed(1)}% aller Events
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  summaryLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  summaryDivider: {
    width: 1,
    height: 60,
    backgroundColor: Colors.border,
  },
  importStatusCard: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  importHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  importTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    flex: 1,
  },
  importStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  importStat: {
    alignItems: 'center',
  },
  importStatValue: {
    fontSize: 28,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  importStatLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  importArrow: {
    fontSize: 24,
    color: Colors.primary,
  },
  importProgress: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  importProgressText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: FontWeights.medium,
  },
  importProgressSubtext: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  importComplete: {
    backgroundColor: Colors.success + '20',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  importCompleteText: {
    fontSize: FontSizes.md,
    color: Colors.success,
    fontWeight: FontWeights.medium,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  section: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semiBold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  sourceCard: {
    backgroundColor: Colors.card,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sourceIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  sourceName: {
    flex: 1,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semiBold,
    color: Colors.text,
  },
  sourceTotal: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  progressText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
});
