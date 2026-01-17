import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Play, MapPin, Calendar, CheckCircle, Clock, History } from 'lucide-react-native';
import { Colors, Spacing } from '../../constants';
import { cityImportService } from '../../services/ticketmasterCityImportService';
import { GERMAN_CITIES, getCitiesByPriority } from '../../constants/GermanCities';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../utils/toastContext';

export default function TicketmasterCityImport() {
  const { showToast } = useToast();
  const [selectedPriorities, setSelectedPriorities] = useState<number[]>([1, 2]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [schedulerEnabled, setSchedulerEnabled] = useState(false);
  const [schedulerInterval, setSchedulerInterval] = useState(60);
  const [schedulerId, setSchedulerId] = useState<string | null>(null);
  const [importHistory, setImportHistory] = useState<any[]>([]);

  useEffect(() => {
    const today = new Date();
    const sixMonths = new Date(today);
    sixMonths.setMonth(sixMonths.getMonth() + 6);

    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(sixMonths.toISOString().split('T')[0]);

    loadScheduler();
    loadImportHistory();
  }, []);

  const loadScheduler = async () => {
    const { data } = await supabase
      .from('auto_import_schedulers')
      .select('*')
      .eq('name', 'Stadt-basierter Auto-Import')
      .maybeSingle();

    if (data) {
      setSchedulerId(data.id);
      setSchedulerEnabled(data.is_enabled);
      setSchedulerInterval(data.interval_minutes);
    }
  };

  const loadImportHistory = async () => {
    const { data } = await supabase
      .from('ticketmaster_import_history')
      .select('*')
      .eq('mode', 'city_based')
      .order('started_at', { ascending: false })
      .limit(10);

    if (data) {
      setImportHistory(data);
    }
  };

  const toggleScheduler = async (enabled: boolean) => {
    if (!schedulerId) {
      const { data, error } = await supabase
        .from('auto_import_schedulers')
        .insert({
          name: 'Stadt-basierter Auto-Import',
          source_type: 'ticketmaster',
          is_enabled: enabled,
          config: { priorities: selectedPriorities, startDate, endDate },
          interval_minutes: schedulerInterval,
        })
        .select()
        .single();

      if (data) {
        setSchedulerId(data.id);
        setSchedulerEnabled(enabled);
      }
    } else {
      await supabase
        .from('auto_import_schedulers')
        .update({
          is_enabled: enabled,
          config: { priorities: selectedPriorities, startDate, endDate },
          interval_minutes: schedulerInterval,
        })
        .eq('id', schedulerId);

      setSchedulerEnabled(enabled);
    }
  };

  const updateSchedulerInterval = async (minutes: number) => {
    setSchedulerInterval(minutes);

    if (schedulerId) {
      await supabase
        .from('auto_import_schedulers')
        .update({ interval_minutes: minutes })
        .eq('id', schedulerId);
    }
  };

  const togglePriority = (priority: number) => {
    if (selectedPriorities.includes(priority)) {
      setSelectedPriorities(selectedPriorities.filter(p => p !== priority));
    } else {
      setSelectedPriorities([...selectedPriorities, priority].sort());
    }
  };

  const getSelectedCitiesCount = () => {
    return selectedPriorities.reduce((count, priority) => {
      return count + getCitiesByPriority(priority).length;
    }, 0);
  };

  const startImport = async () => {
    console.log('[UI] Import Button geklickt!');

    if (selectedPriorities.length === 0) {
      showToast('Bitte wähle mindestens eine Priorität', 'warning');
      return;
    }

    console.log('[UI] Starte Import mit Prioritäten:', selectedPriorities);
    setImporting(true);
    setProgress(null);

    const result = await cityImportService.startImport(
      {
        priorities: selectedPriorities,
        startDate: `${startDate}T00:00:00Z`,
        endDate: `${endDate}T23:59:59Z`,
      },
      progressUpdate => {
        console.log('[UI] Progress Update:', progressUpdate);
        setProgress(progressUpdate);
      }
    );

    console.log('[UI] Import Result:', result);

    if (!result.success) {
      showToast(result.message, 'error');
      setImporting(false);
      return;
    }

    showToast('Import erfolgreich gestartet!', 'success');

    pollImport(result.importRunId);
  };

  const pollImport = async (importRunId: string) => {
    const interval = setInterval(async () => {
      const progressData = await cityImportService.getImportProgress(importRunId);

      if (progressData) {
        setProgress(progressData);

        if (progressData.cityIndex >= progressData.totalCities) {
          clearInterval(interval);
          setImporting(false);
          loadImportHistory();
        }
      }

      loadImportHistory();
    }, 3000);
  };

  const formatElapsedTime = () => {
    if (!progress) return '0min 0s';
    const minutes = Math.floor(progress.cityIndex / 60);
    const seconds = progress.cityIndex % 60;
    return `${minutes}min ${seconds}s`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stadt-basierter Import</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Städte auswählen</Text>
          </View>

          <View style={styles.priorityGrid}>
            {[1, 2, 3, 4].map(priority => {
              const citiesCount = getCitiesByPriority(priority).length;
              const isSelected = selectedPriorities.includes(priority);

              return (
                <TouchableOpacity
                  key={priority}
                  style={[styles.priorityCard, isSelected && styles.priorityCardSelected]}
                  onPress={() => togglePriority(priority)}
                  disabled={importing}
                >
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityBadgeText}>P{priority}</Text>
                  </View>
                  <Text style={styles.priorityCount}>{citiesCount} Städte</Text>
                  {priority === 1 && <Text style={styles.priorityLabel}>Top-Städte</Text>}
                  {priority === 2 && <Text style={styles.priorityLabel}>Große Städte</Text>}
                  {priority === 3 && <Text style={styles.priorityLabel}>Mittlere Städte</Text>}
                  {priority === 4 && <Text style={styles.priorityLabel}>Kleinere Städte</Text>}
                  {isSelected && (
                    <View style={styles.selectedIndicator}>
                      <CheckCircle size={20} color={Colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.selectionSummary}>
            {getSelectedCitiesCount()} Städte ausgewählt
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Zeitraum</Text>
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Von:</Text>
              <TextInput
                style={styles.dateInput}
                value={startDate}
                onChangeText={setStartDate}
                editable={!importing}
              />
            </View>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Bis:</Text>
              <TextInput
                style={styles.dateInput}
                value={endDate}
                onChangeText={setEndDate}
                editable={!importing}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Automatischer Import</Text>
          </View>

          <View style={styles.schedulerRow}>
            <View style={styles.schedulerInfo}>
              <Text style={styles.schedulerLabel}>Stündlich automatisch importieren</Text>
              <Text style={styles.schedulerHint}>
                Import läuft alle {schedulerInterval} Minuten
              </Text>
            </View>
            <Switch
              value={schedulerEnabled}
              onValueChange={toggleScheduler}
              trackColor={{ false: Colors.textLight, true: Colors.primary }}
            />
          </View>

          <View style={styles.intervalRow}>
            <Text style={styles.intervalLabel}>Intervall:</Text>
            <View style={styles.intervalButtons}>
              {[30, 60, 120, 360].map(minutes => (
                <TouchableOpacity
                  key={minutes}
                  style={[
                    styles.intervalButton,
                    schedulerInterval === minutes && styles.intervalButtonActive,
                  ]}
                  onPress={() => updateSchedulerInterval(minutes)}
                >
                  <Text
                    style={[
                      styles.intervalButtonText,
                      schedulerInterval === minutes && styles.intervalButtonTextActive,
                    ]}
                  >
                    {minutes < 60 ? `${minutes}min` : `${minutes / 60}h`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {!importing ? (
          <TouchableOpacity
            style={[
              styles.startButton,
              selectedPriorities.length === 0 && styles.startButtonDisabled,
            ]}
            onPress={startImport}
            disabled={selectedPriorities.length === 0}
          >
            <Play size={20} color={Colors.white} />
            <Text style={styles.startButtonText}>Import starten</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            {progress && (
              <>
                <Text style={styles.progressText}>
                  Stadt {progress.cityIndex} von {progress.totalCities}
                </Text>
                <Text style={styles.progressCity}>{progress.cityName}</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.round(
                          (progress.cityIndex / progress.totalCities) * 100
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{progress.eventsFound}</Text>
                    <Text style={styles.statLabel}>Gefunden</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{progress.eventsImported}</Text>
                    <Text style={styles.statLabel}>Importiert</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{progress.eventsSkipped}</Text>
                    <Text style={styles.statLabel}>Übersprungen</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.cityList}>
          <Text style={styles.cityListTitle}>Verfügbare Städte</Text>
          {selectedPriorities.map(priority => (
            <View key={priority} style={styles.cityGroup}>
              <Text style={styles.cityGroupTitle}>Priorität {priority}</Text>
              <View style={styles.cityChips}>
                {getCitiesByPriority(priority).map((city, index) => (
                  <View key={index} style={styles.cityChip}>
                    <Text style={styles.cityChipText}>{city.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <History size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Import-Verlauf</Text>
          </View>

          {importHistory.length === 0 ? (
            <Text style={styles.noHistory}>Noch keine Imports durchgeführt</Text>
          ) : (
            <View style={styles.historyList}>
              {importHistory.map((item, index) => (
                <View key={item.id} style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyDate}>
                      {new Date(item.started_at).toLocaleString('de-DE')}
                    </Text>
                    <View
                      style={[
                        styles.historyStatus,
                        item.status === 'completed' && styles.historyStatusSuccess,
                        item.status === 'running' && styles.historyStatusRunning,
                        item.status === 'failed' && styles.historyStatusFailed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.historyStatusText,
                          item.status === 'completed' && styles.historyStatusTextSuccess,
                          item.status === 'running' && styles.historyStatusTextRunning,
                          item.status === 'failed' && styles.historyStatusTextFailed,
                        ]}
                      >
                        {item.status === 'completed'
                          ? 'Abgeschlossen'
                          : item.status === 'running'
                          ? 'Läuft'
                          : 'Fehler'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.historyStats}>
                    <View style={styles.historyStat}>
                      <Text style={styles.historyStatValue}>{item.total_found || 0}</Text>
                      <Text style={styles.historyStatLabel}>Gefunden</Text>
                    </View>
                    <View style={styles.historyStat}>
                      <Text style={styles.historyStatValue}>{item.imported_count || 0}</Text>
                      <Text style={styles.historyStatLabel}>Importiert</Text>
                    </View>
                    <View style={styles.historyStat}>
                      <Text style={styles.historyStatValue}>{item.skipped_count || 0}</Text>
                      <Text style={styles.historyStatLabel}>Übersprungen</Text>
                    </View>
                    {item.duration_seconds && (
                      <View style={styles.historyStat}>
                        <Text style={styles.historyStatValue}>
                          {Math.floor(item.duration_seconds / 60)}min
                        </Text>
                        <Text style={styles.historyStatLabel}>Dauer</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
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
    padding: Spacing.lg,
    backgroundColor: Colors.primary,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  priorityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  priorityCard: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  priorityCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  priorityBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: Spacing.xs,
  },
  priorityBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  priorityCount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  priorityLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  selectedIndicator: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  selectionSummary: {
    marginTop: Spacing.md,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  dateInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.sm,
    fontSize: 14,
    color: Colors.text,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  startButtonDisabled: {
    backgroundColor: Colors.textSecondary,
  },
  startButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  progressContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  progressCity: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    width: '100%',
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  cityList: {
    padding: Spacing.lg,
  },
  cityListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  cityGroup: {
    marginBottom: Spacing.lg,
  },
  cityGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  cityChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  cityChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cityChipText: {
    fontSize: 12,
    color: Colors.text,
  },
  schedulerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  schedulerInfo: {
    flex: 1,
  },
  schedulerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  schedulerHint: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  intervalRow: {
    marginTop: Spacing.md,
  },
  intervalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  intervalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  intervalButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  intervalButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  intervalButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  intervalButtonTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  noHistory: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  historyList: {
    gap: Spacing.md,
  },
  historyItem: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  historyStatus: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.textLight,
  },
  historyStatusSuccess: {
    backgroundColor: '#d4edda',
  },
  historyStatusRunning: {
    backgroundColor: '#fff3cd',
  },
  historyStatusFailed: {
    backgroundColor: '#f8d7da',
  },
  historyStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  historyStatusTextSuccess: {
    color: '#155724',
  },
  historyStatusTextRunning: {
    color: '#856404',
  },
  historyStatusTextFailed: {
    color: '#721c24',
  },
  historyStats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  historyStat: {
    flex: 1,
    alignItems: 'center',
  },
  historyStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  historyStatLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
