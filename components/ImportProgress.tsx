import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';

interface QueryResult {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'error';
  eventsFound?: number;
  eventsImported?: number;
  eventsSkipped?: number;
  errors?: number;
  duration?: number;
  hitLimit?: boolean;
}

interface ImportProgressProps {
  currentQuery?: string;
  queriesCompleted?: number;
  totalQueries?: number;
  eventsFound?: number;
  eventsImported?: number;
  eventsSkipped?: number;
  percentComplete?: number;
  elapsedTime?: number;
  estimatedTimeRemaining?: number;
  queries?: QueryResult[];
  categoryBreakdown?: Record<string, number>;
}

export default function ImportProgress({
  currentQuery = 'Initialisiere...',
  queriesCompleted = 0,
  totalQueries = 0,
  eventsFound = 0,
  eventsImported = 0,
  eventsSkipped = 0,
  percentComplete = 0,
  elapsedTime = 0,
  estimatedTimeRemaining,
  queries = [],
  categoryBreakdown,
}: ImportProgressProps) {
  const progress = percentComplete;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}min ${secs}s`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Import läuft</Text>

      <View style={styles.currentQuery}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <View style={styles.currentQueryText}>
          <Text style={styles.currentQueryLabel}>
            Query {queriesCompleted}/{totalQueries}
          </Text>
          <Text style={styles.currentQueryDetail}>{currentQuery}</Text>
        </View>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>

      {eventsFound > 0 && (
        <Text style={styles.pageInfo}>
          {eventsFound.toLocaleString()} Events gefunden
        </Text>
      )}

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{eventsImported.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Events importiert</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{eventsSkipped.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Übersprungen</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {eventsFound.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Gefunden</Text>
        </View>
      </View>

      <View style={styles.timeContainer}>
        <View style={styles.timeRow}>
          <Clock size={16} color={Colors.textSecondary} />
          <Text style={styles.timeLabel}>Laufzeit:</Text>
          <Text style={styles.timeValue}>{formatTime(elapsedTime)}</Text>
        </View>
        {estimatedTimeRemaining !== undefined && (
          <View style={styles.timeRow}>
            <TrendingUp size={16} color={Colors.textSecondary} />
            <Text style={styles.timeLabel}>ETA:</Text>
            <Text style={styles.timeValue}>{formatTime(estimatedTimeRemaining)} verbleibend</Text>
          </View>
        )}
      </View>

      {categoryBreakdown && Object.keys(categoryBreakdown).length > 0 && (
        <View style={styles.categoryBreakdown}>
          <Text style={styles.sectionTitle}>Abdeckung bisher</Text>
          {Object.entries(categoryBreakdown).map(([category, count]) => (
            <View key={category} style={styles.categoryRow}>
              <Text style={styles.categoryLabel}>{category}:</Text>
              <Text style={styles.categoryValue}>{count.toLocaleString()} Events</Text>
            </View>
          ))}
        </View>
      )}

      {queries.length > 0 && (
        <View style={styles.queryLogContainer}>
          <Text style={styles.sectionTitle}>Query-Log</Text>
          <ScrollView style={styles.queryLog} nestedScrollEnabled>
            {queries.map((query, index) => (
              <View key={query.id} style={styles.queryLogItem}>
                <View style={styles.queryLogIcon}>
                  {query.status === 'success' && <CheckCircle size={16} color={Colors.success} />}
                  {query.status === 'error' && <XCircle size={16} color={Colors.error} />}
                  {query.status === 'running' && (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  )}
                  {query.status === 'pending' && (
                    <View style={styles.pendingDot} />
                  )}
                </View>
                <View style={styles.queryLogContent}>
                  <Text style={styles.queryLogLabel}>{query.label}</Text>
                  {query.eventsFound !== undefined && (
                    <Text style={styles.queryLogDetail}>
                      {query.eventsFound} Events
                      {query.hitLimit && ' (hit limit!)'}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  currentQuery: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.primaryLight + '10',
    borderRadius: BorderRadius.md,
  },
  currentQueryText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  currentQueryLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs / 2,
  },
  currentQueryDetail: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 12,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginRight: Spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  progressText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    minWidth: 45,
  },
  pageInfo: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  statValueError: {
    color: Colors.error,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  timeContainer: {
    marginBottom: Spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  timeLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    marginRight: Spacing.xs,
  },
  timeValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
  categoryBreakdown: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  categoryLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  categoryValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
  queryLogContainer: {
    maxHeight: 200,
  },
  queryLog: {
    maxHeight: 160,
  },
  queryLogItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  queryLogIcon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  queryLogContent: {
    flex: 1,
  },
  queryLogLabel: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginBottom: Spacing.xs / 2,
  },
  queryLogDetail: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
});
