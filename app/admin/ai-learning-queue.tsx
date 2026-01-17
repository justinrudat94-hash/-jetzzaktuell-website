import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Brain,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  Search,
  RefreshCw,
  Eye,
} from 'lucide-react-native';
import { chatService, LearningQueueEntry } from '@/services/chatService';
import { useToast } from '@/utils/toastContext';
import { useAuth } from '@/utils/authContext';

export default function AILearningQueueScreen() {
  const [queueEntries, setQueueEntries] = useState<LearningQueueEntry[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const { showToast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, [selectedStatus]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const [queue, stats] = await Promise.all([
        chatService.getLearningQueue(
          selectedStatus === 'all' ? undefined : 'pending',
          100
        ),
        chatService.getLearningAnalytics(30),
      ]);

      setQueueEntries(queue);
      setAnalytics(stats);
    } catch (error) {
      console.error('Error loading learning queue:', error);
      showToast('Fehler beim Laden der Daten', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const approveEntry = async (entryId: string) => {
    try {
      await chatService.approveLearningEntry(entryId, 'Approved via admin dashboard');
      showToast('Eintrag wurde genehmigt und als Wissen hinzugefügt!', 'success');
      await loadData();
    } catch (error) {
      console.error('Error approving entry:', error);
      showToast('Fehler beim Genehmigen', 'error');
    }
  };

  const rejectEntry = async (entryId: string) => {
    Alert.alert(
      'Eintrag ablehnen?',
      'Dieser Eintrag wird abgelehnt und nicht als Wissen übernommen.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Ablehnen',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.rejectLearningEntry(entryId, 'Rejected via admin dashboard');
              showToast('Eintrag abgelehnt', 'success');
              await loadData();
            } catch (error) {
              console.error('Error rejecting entry:', error);
              showToast('Fehler beim Ablehnen', 'error');
            }
          },
        },
      ]
    );
  };

  const runAutoLearning = async () => {
    try {
      showToast('Starte Auto-Learning...', 'info');
      const result = await chatService.autoLearnFromSuccessPattern();
      showToast(
        `Auto-Learning abgeschlossen! ${result?.[0]?.learned_count || 0} neue Einträge gelernt.`,
        'success'
      );
      await loadData();
    } catch (error) {
      console.error('Error running auto-learning:', error);
      showToast('Fehler beim Auto-Learning', 'error');
    }
  };

  const runCleanup = async () => {
    try {
      showToast('Bereinige niedrig-performante Einträge...', 'info');
      const result = await chatService.deactivateLowPerformingKnowledge();
      showToast(
        `Bereinigung abgeschlossen! ${result?.[0]?.deactivated_count || 0} Einträge deaktiviert.`,
        'success'
      );
      await loadData();
    } catch (error) {
      console.error('Error running cleanup:', error);
      showToast('Fehler bei der Bereinigung', 'error');
    }
  };

  const filteredEntries = queueEntries.filter(entry =>
    entry.question_pattern.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.answer_template.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'approved':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      case 'auto_approved':
        return '#6366f1';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Ausstehend';
      case 'approved':
        return 'Genehmigt';
      case 'rejected':
        return 'Abgelehnt';
      case 'auto_approved':
        return 'Auto-Genehmigt';
      default:
        return status;
    }
  };

  const renderStatsCard = () => {
    if (!analytics) return null;

    const { learning_queue_stats, knowledge_stats, feedback_stats } = analytics;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Clock size={24} color="#f59e0b" />
            <Text style={styles.statValue}>{learning_queue_stats?.pending || 0}</Text>
            <Text style={styles.statLabel}>Ausstehend</Text>
          </View>

          <View style={styles.statCard}>
            <CheckCircle size={24} color="#10b981" />
            <Text style={styles.statValue}>{learning_queue_stats?.approved || 0}</Text>
            <Text style={styles.statLabel}>Genehmigt</Text>
          </View>

          <View style={styles.statCard}>
            <Brain size={24} color="#6366f1" />
            <Text style={styles.statValue}>{knowledge_stats?.learned_entries || 0}</Text>
            <Text style={styles.statLabel}>Gelernt</Text>
          </View>

          <View style={styles.statCard}>
            <TrendingUp size={24} color="#10b981" />
            <Text style={styles.statValue}>{knowledge_stats?.avg_success_rate || 0}%</Text>
            <Text style={styles.statLabel}>Erfolgsrate</Text>
          </View>
        </View>

        {feedback_stats && (
          <View style={styles.feedbackStatsCard}>
            <Text style={styles.feedbackStatsTitle}>Feedback-Statistiken (30 Tage)</Text>
            <Text style={styles.feedbackStatText}>
              • Gesamt: {feedback_stats.total_feedback}
            </Text>
            <Text style={styles.feedbackStatText}>
              • Mit Retry: {feedback_stats.with_retry} ({feedback_stats.retry_success_rate || 0}%
              erfolgreich)
            </Text>
            <Text style={styles.feedbackStatText}>
              • Auto-Gelernt: {feedback_stats.auto_learned}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderQueueEntry = (entry: LearningQueueEntry) => {
    const isExpanded = expandedEntry === entry.id;

    return (
      <View key={entry.id} style={styles.entryCard}>
        <TouchableOpacity
          onPress={() => setExpandedEntry(isExpanded ? null : entry.id)}
          style={styles.entryHeader}
        >
          <View style={styles.entryHeaderLeft}>
            <View
              style={[styles.statusBadge, { backgroundColor: getStatusColor(entry.status) }]}
            >
              <Text style={styles.statusBadgeText}>{getStatusLabel(entry.status)}</Text>
            </View>
            <Text style={styles.entryQuestion} numberOfLines={isExpanded ? undefined : 2}>
              {entry.question_pattern}
            </Text>
          </View>
          <Eye size={20} color="#6b7280" />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.entryDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quelle:</Text>
              <Text style={styles.detailValue}>{entry.source_type}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Kategorie:</Text>
              <Text style={styles.detailValue}>{entry.category}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Konfidenz:</Text>
              <Text style={styles.detailValue}>{(entry.confidence_score * 100).toFixed(0)}%</Text>
            </View>

            {entry.keywords && entry.keywords.length > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Keywords:</Text>
                <View style={styles.keywordsContainer}>
                  {entry.keywords.slice(0, 5).map((keyword, idx) => (
                    <View key={idx} style={styles.keywordBadge}>
                      <Text style={styles.keywordText}>{keyword}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.answerContainer}>
              <Text style={styles.detailLabel}>Antwort:</Text>
              <Text style={styles.answerText}>{entry.answer_template}</Text>
            </View>

            {entry.usage_count > 0 && (
              <View style={styles.metricsRow}>
                <Text style={styles.metricText}>
                  Verwendet: {entry.usage_count}x | Erfolgreich: {entry.success_count}x
                </Text>
              </View>
            )}

            {entry.status === 'pending' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => rejectEntry(entry.id)}
                >
                  <XCircle size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Ablehnen</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => approveEntry(entry.id)}
                >
                  <CheckCircle size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Genehmigen</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'AI Learning Queue' }} />
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Lade Learning-Queue...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'AI Learning Queue' }} />

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {renderStatsCard()}

        <View style={styles.actionsBar}>
          <TouchableOpacity style={styles.primaryActionButton} onPress={runAutoLearning}>
            <Brain size={18} color="#fff" />
            <Text style={styles.primaryActionButtonText}>Auto-Learning</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryActionButton} onPress={runCleanup}>
            <RefreshCw size={18} color="#6366f1" />
            <Text style={styles.secondaryActionButtonText}>Bereinigen</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filtersContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Suche in Fragen oder Antworten..."
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.statusFilters}>
            <TouchableOpacity
              style={[styles.filterButton, selectedStatus === 'pending' && styles.filterButtonActive]}
              onPress={() => setSelectedStatus('pending')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedStatus === 'pending' && styles.filterButtonTextActive,
                ]}
              >
                Ausstehend
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, selectedStatus === 'all' && styles.filterButtonActive]}
              onPress={() => setSelectedStatus('all')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedStatus === 'all' && styles.filterButtonTextActive,
                ]}
              >
                Alle
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.entriesContainer}>
          {filteredEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <AlertCircle size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>
                {searchQuery
                  ? 'Keine Einträge gefunden'
                  : selectedStatus === 'pending'
                  ? 'Keine ausstehenden Einträge'
                  : 'Keine Einträge in der Queue'}
              </Text>
            </View>
          ) : (
            filteredEntries.map(renderQueueEntry)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  feedbackStatsCard: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  feedbackStatsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  feedbackStatText: {
    fontSize: 13,
    color: '#3b82f6',
    marginBottom: 4,
  },
  actionsBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  primaryActionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
    gap: 8,
  },
  secondaryActionButtonText: {
    color: '#6366f1',
    fontSize: 15,
    fontWeight: '600',
  },
  filtersContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#111827',
  },
  statusFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  entriesContainer: {
    padding: 16,
  },
  entryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  entryHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  entryQuestion: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  entryDetails: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    width: 100,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  keywordsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  keywordBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  keywordText: {
    fontSize: 11,
    color: '#3b82f6',
  },
  answerContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  answerText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginTop: 4,
  },
  metricsRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  metricText: {
    fontSize: 12,
    color: '#6b7280',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
});
