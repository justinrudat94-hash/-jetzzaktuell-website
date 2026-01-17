import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Download, CheckCircle, Settings, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants';
import { useToast } from '../../utils/toastContext';
import { supabase } from '../../lib/supabase';
import ImportModeSelector from '../../components/ImportModeSelector';
import ImportConfigPanel from '../../components/ImportConfigPanel';
import ImportProgress from '../../components/ImportProgress';
import {
  generateQueryMatrix,
  getDefaultConfig,
  estimateImportTime,
  estimateEventCount,
  type QueryConfig,
} from '../../utils/ticketmasterQueryGenerator';
import { executeMultiQueryImport } from '../../utils/ticketmasterImport';
import { ticketmasterAdaptiveService } from '../../services/ticketmasterAdaptiveService';

export default function TicketmasterSimpleScreen() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
  });
  const [importHistory, setImportHistory] = useState([]);

  const [selectedMode, setSelectedMode] = useState<'quick' | 'standard' | 'full' | 'adaptive'>('standard');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [useCityFilter, setUseCityFilter] = useState(false);
  const [selectedTimePeriods, setSelectedTimePeriods] = useState<number[]>([0, 1, 2]);

  const [importProgress, setImportProgress] = useState<any>(null);
  const [runningImportId, setRunningImportId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    loadStats();
    loadImportHistory();
    checkForRunningImport();
    const config = getDefaultConfig('standard');
    setSelectedCategories(config.categories);
    setSelectedTimePeriods([0, 1, 2]);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (runningImportId) {
      pollRunningImport();
      interval = setInterval(() => {
        pollRunningImport();
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [runningImportId]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let startTimeRef = 0;

    if (importing || runningImportId) {
      startTimeRef = Date.now();
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [importing, runningImportId]);

  useEffect(() => {
    const config = getDefaultConfig(selectedMode);
    setSelectedCategories(config.categories);
    setSelectedTimePeriods(
      config.timePeriods.map((_, idx) => idx).slice(0, selectedMode === 'quick' ? 1 : config.timePeriods.length)
    );
    if (selectedMode === 'full') {
      setUseCityFilter(true);
      setSelectedCities(config.cities);
    } else {
      setUseCityFilter(false);
      setSelectedCities([]);
    }
  }, [selectedMode]);

  const loadStats = async () => {
    try {
      const { count: total } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('external_source', 'ticketmaster');

      const today = new Date().toISOString().split('T')[0];
      const { count: todayCount } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('external_source', 'ticketmaster')
        .gte('created_at', today);

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: weekCount } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('external_source', 'ticketmaster')
        .gte('created_at', weekAgo);

      setStats({
        total: total || 0,
        today: todayCount || 0,
        thisWeek: weekCount || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadImportHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('ticketmaster_import_history')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setImportHistory(data || []);
    } catch (error) {
      console.error('Error loading import history:', error);
    }
  };

  const checkForRunningImport = async () => {
    try {
      const { data, error } = await supabase
        .from('ticketmaster_import_history')
        .select('*')
        .eq('status', 'running')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setRunningImportId(data.id);
        setImporting(true);
      }
    } catch (error) {
      console.log('No running import found');
    }
  };

  const pollRunningImport = async () => {
    if (!runningImportId) return;

    try {
      const [historyResponse, queriesResponse] = await Promise.all([
        supabase
          .from('ticketmaster_import_history')
          .select('status, total_found, imported_count, skipped_count, started_at')
          .eq('id', runningImportId)
          .maybeSingle(),
        supabase
          .from('ticketmaster_query_splits')
          .select('status, query_label')
          .eq('import_run_id', runningImportId)
      ]);

      const historyData = historyResponse.data;
      const queriesData = queriesResponse.data;

      if (!historyData) {
        setRunningImportId(null);
        setImporting(false);
        setImportProgress(null);
        return;
      }

      if (historyData.status === 'completed' || historyData.status === 'failed') {
        setRunningImportId(null);
        setImporting(false);
        setImportProgress(null);
        loadStats();
        loadImportHistory();
        return;
      }

      if (queriesData) {
        const total = queriesData.length;
        const completed = queriesData.filter(q => q.status === 'completed').length;
        const active = queriesData.find(q => q.status === 'processing');

        setImportProgress({
          currentQuery: active?.query_label || 'Warte auf nächste Query...',
          queriesCompleted: completed,
          totalQueries: total,
          eventsFound: historyData.total_found || 0,
          eventsImported: historyData.imported_count || 0,
          eventsSkipped: historyData.skipped_count || 0,
          percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
        });
      }
    } catch (error) {
      console.error('Error polling import:', error);
    }
  };

  const handleToggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleToggleCity = (city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  };

  const handleToggleTimePeriod = (index: number) => {
    setSelectedTimePeriods((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleManualImport = async () => {
    setImporting(true);
    setImportProgress(null);

    try {
      const config = getDefaultConfig(selectedMode);
      const timePeriods = config.timePeriods.filter((_, idx) => selectedTimePeriods.includes(idx));

      if (selectedCategories.length === 0 || timePeriods.length === 0) {
        showToast('Bitte wähle mindestens eine Kategorie und einen Zeitbereich.', 'warning');
        setImporting(false);
        return;
      }

      const startDate = new Date();
      let endDate = new Date();

      if (selectedMode === 'quick') {
        endDate.setDate(endDate.getDate() + 30);
      } else if (selectedMode === 'standard') {
        endDate.setMonth(endDate.getMonth() + 3);
      } else {
        endDate.setMonth(endDate.getMonth() + 6);
      }

      await ticketmasterAdaptiveService.startAdaptiveImport(
        {
          countryCode: 'DE',
          startDate,
          endDate,
          segments: selectedCategories,
          cities: useCityFilter ? selectedCities : undefined,
          mode: selectedMode,
          autoSplit: true,
        },
        (progress) => {
          setImportProgress({
            currentQuery: progress.activeQuery?.queryLabel || 'Initialisiere...',
            queriesCompleted: progress.completedQueries,
            totalQueries: progress.totalQueries,
            eventsFound: progress.totalEventsFound,
            eventsImported: progress.totalEventsImported,
            eventsSkipped: progress.totalEventsSkipped,
            percentComplete: progress.totalQueries > 0
              ? Math.round((progress.completedQueries / progress.totalQueries) * 100)
              : 0,
          });
        }
      );

      showToast('Der adaptive Import wurde erfolgreich abgeschlossen!', 'success');
      loadStats();
      loadImportHistory();
      setImportProgress(null);
    } catch (error: any) {
      showToast(`Fehler: ${error.message}`, 'error');
      setImportProgress(null);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ticketmaster Import</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  const config = getDefaultConfig(selectedMode);
  const timePeriods = config.timePeriods.filter((_, idx) => selectedTimePeriods.includes(idx));
  const queryConfig: QueryConfig = {
    mode: selectedMode,
    timePeriods,
    categories: selectedCategories,
    cities: useCityFilter ? selectedCities : [],
    countryCode: 'DE',
    smartSplit: selectedMode === 'adaptive',
    maxQueriesPerRun: 100,
  };
  const queries = generateQueryMatrix(queryConfig);
  const timeEstimate = estimateImportTime(queries.length);
  const eventEstimate = estimateEventCount(queries.length, selectedMode);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ticketmaster Import</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiken</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Gesamt Events</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.today.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Heute</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.thisWeek.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Diese Woche</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ImportModeSelector selectedMode={selectedMode} onSelectMode={setSelectedMode} />
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => setShowConfig(!showConfig)}
            activeOpacity={0.7}
          >
            <Settings size={20} color={Colors.primary} />
            <Text style={styles.configToggleText}>Erweiterte Konfiguration</Text>
            {showConfig ? (
              <ChevronUp size={20} color={Colors.textSecondary} />
            ) : (
              <ChevronDown size={20} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>

          {showConfig && (
            <View style={styles.configPanel}>
              <ImportConfigPanel
                selectedCategories={selectedCategories}
                onToggleCategory={handleToggleCategory}
                selectedCities={selectedCities}
                onToggleCity={handleToggleCity}
                useCityFilter={useCityFilter}
                onToggleCityFilter={() => setUseCityFilter(!useCityFilter)}
                selectedTimePeriods={selectedTimePeriods}
                onToggleTimePeriod={handleToggleTimePeriod}
              />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.estimateCard}>
            <Text style={styles.estimateTitle}>Import-Vorschau</Text>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Queries:</Text>
              <Text style={styles.estimateValue}>{queries.length}</Text>
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Geschätzte Dauer:</Text>
              <Text style={styles.estimateValue}>
                {timeEstimate.min}-{timeEstimate.max} Minuten
              </Text>
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Erwartete Events:</Text>
              <Text style={styles.estimateValue}>
                {eventEstimate.min.toLocaleString()}-{eventEstimate.max.toLocaleString()}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, importing && styles.disabledButton]}
            onPress={handleManualImport}
            disabled={importing}
          >
            {importing ? (
              <>
                <ActivityIndicator size="small" color="#FFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Importiere...</Text>
              </>
            ) : (
              <>
                <Download size={20} color="#FFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Import starten</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {(importing || runningImportId) && importProgress && (
          <View style={styles.section}>
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>Import läuft...</Text>
              <Text style={styles.elapsedTime}>
                Laufzeit: {Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s
              </Text>
            </View>
            <ImportProgress {...importProgress} />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Import History</Text>
          {importHistory.length === 0 ? (
            <Text style={styles.noHistoryText}>Noch keine Imports durchgeführt</Text>
          ) : (
            importHistory.map((record) => (
              <View key={record.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View>
                    <Text style={styles.historyDate}>
                      {new Date(record.started_at).toLocaleString('de-DE')}
                    </Text>
                    {record.mode && (
                      <Text style={styles.historyMode}>{record.mode.toUpperCase()} Mode</Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      record.status === 'completed' && styles.statusCompleted,
                      record.status === 'failed' && styles.statusFailed,
                      record.status === 'running' && styles.statusRunning,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {record.status === 'completed'
                        ? 'Erfolgreich'
                        : record.status === 'failed'
                        ? 'Fehlgeschlagen'
                        : 'Läuft'}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyStats}>
                  <View style={styles.historyStat}>
                    <Text style={styles.historyStatLabel}>Gefunden</Text>
                    <Text style={styles.historyStatValue}>{record.total_found || 0}</Text>
                  </View>
                  <View style={styles.historyStat}>
                    <Text style={styles.historyStatLabel}>Importiert</Text>
                    <Text style={[styles.historyStatValue, styles.successValue]}>
                      {record.imported_count || 0}
                    </Text>
                  </View>
                  <View style={styles.historyStat}>
                    <Text style={styles.historyStatLabel}>Übersprungen</Text>
                    <Text style={[styles.historyStatValue, styles.warningValue]}>
                      {record.skipped_count || 0}
                    </Text>
                  </View>
                  <View style={styles.historyStat}>
                    <Text style={styles.historyStatLabel}>Dauer</Text>
                    <Text style={styles.historyStatValue}>
                      {Math.floor((record.duration_seconds || 0) / 60)}min
                    </Text>
                  </View>
                </View>
                {record.queries && record.queries.length > 0 && (
                  <Text style={styles.queryCount}>{record.queries.length} Queries ausgeführt</Text>
                )}
                {record.error_message && (
                  <Text style={styles.errorMessage}>Fehler: {record.error_message}</Text>
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.successCard}>
            <CheckCircle size={24} color={Colors.success} />
            <View style={styles.successContent}>
              <Text style={styles.successTitle}>Multi-Query Import System</Text>
              <Text style={styles.successText}>
                Importiert Events in mehreren parallelen Abfragen für maximale Abdeckung.
                Wähle deinen Modus und konfiguriere die Details nach deinen Wünschen.
              </Text>
            </View>
          </View>
        </View>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: 32,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  configToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  configToggleText: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  configPanel: {
    marginTop: Spacing.md,
  },
  estimateCard: {
    backgroundColor: Colors.primaryLight + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  estimateTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  estimateLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  estimateValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: Spacing.sm,
  },
  buttonText: {
    color: '#FFF',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  noHistoryText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: Spacing.lg,
  },
  historyCard: {
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  historyDate: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs / 2,
  },
  historyMode: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusCompleted: {
    backgroundColor: '#E8F5E9',
  },
  statusFailed: {
    backgroundColor: '#FFEBEE',
  },
  statusRunning: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
  historyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  historyStat: {
    flex: 1,
    alignItems: 'center',
  },
  historyStatLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  historyStatValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  successValue: {
    color: '#4CAF50',
  },
  warningValue: {
    color: '#FF9800',
  },
  queryCount: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  errorMessage: {
    fontSize: FontSizes.xs,
    color: '#F44336',
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: '#FFEBEE',
    borderRadius: BorderRadius.sm,
  },
  successCard: {
    flexDirection: 'row',
    backgroundColor: Colors.success + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  successContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  successTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.success,
    marginBottom: 4,
  },
  successText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  progressCard: {
    backgroundColor: Colors.primaryLight + '15',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  progressTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  elapsedTime: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
});
