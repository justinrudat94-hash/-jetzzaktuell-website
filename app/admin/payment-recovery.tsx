import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/utils/authContext';
import { router } from 'expo-router';
import { Send, Check, XCircle, AlertCircle } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants';
import { dunningService } from '@/services/dunningService';

interface DunningCase {
  id: string;
  user_id: string;
  subscription_id: string;
  status: string;
  dunning_level: number;
  principal_amount: number;
  late_fees: number;
  interest_amount: number;
  total_amount: number;
  overdue_days: number;
  first_dunning_sent_at: string | null;
  second_dunning_sent_at: string | null;
  third_dunning_sent_at: string | null;
  next_action_date: string | null;
  created_at: string;
  profiles: {
    email: string;
    first_name: string;
    last_name: string;
  };
  premium_subscriptions: {
    plan: string;
    stripe_subscription_id: string;
  };
}

interface DunningStats {
  total_cases: number;
  level_1: number;
  level_2: number;
  level_3: number;
  total_amount: number;
  ready_for_collection: number;
}

export default function PaymentRecoveryPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dunningCases, setDunningCases] = useState<DunningCase[]>([]);
  const [stats, setStats] = useState<DunningStats | null>(null);
  const [sendingDunning, setSendingDunning] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      router.replace('/auth/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      Alert.alert('Zugriff verweigert', 'Sie haben keine Admin-Berechtigung');
      router.back();
      return;
    }

    loadData();
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Load dunning cases
      const cases = await dunningService.getOpenDunningCases();
      setDunningCases(cases as any);

      // Load statistics
      const statistics = await dunningService.getDunningStats();
      setStats(statistics);

    } catch (error) {
      console.error('Error loading payment recovery data:', error);
      Alert.alert('Fehler', 'Daten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const sendManualDunning = async (caseId: string, level: number) => {
    setSendingDunning(caseId);

    try {
      await dunningService.sendDunningLetter(caseId, level as any);

      Alert.alert(
        'Mahnung versendet',
        `${level}. Mahnung wurde erfolgreich versendet`,
        [{ text: 'OK', onPress: () => loadData() }]
      );
    } catch (error) {
      console.error('Error sending dunning:', error);
      Alert.alert('Fehler', 'Mahnung konnte nicht versendet werden');
    } finally {
      setSendingDunning(null);
    }
  };

  const markAsPaid = async (caseId: string) => {
    Alert.alert(
      'Als bezahlt markieren',
      'Möchten Sie diesen Fall als bezahlt markieren?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Als bezahlt markieren',
          onPress: async () => {
            try {
              await dunningService.markDunningCaseAsPaid(caseId);
              Alert.alert('Erfolg', 'Fall wurde als bezahlt markiert');
              loadData();
            } catch (error) {
              console.error('Error marking as paid:', error);
              Alert.alert('Fehler', 'Aktion fehlgeschlagen');
            }
          }
        }
      ]
    );
  };

  const escalateDunning = async (caseId: string) => {
    Alert.alert(
      'Mahnung eskalieren',
      'Möchten Sie diesen Fall zur nächsten Mahnstufe eskalieren?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Eskalieren',
          onPress: async () => {
            try {
              const caseData = dunningCases.find(c => c.id === caseId);
              if (!caseData) return;

              await dunningService.checkDunningEscalation(caseData as any);
              Alert.alert('Erfolg', 'Fall wurde eskaliert');
              loadData();
            } catch (error) {
              console.error('Error escalating:', error);
              Alert.alert('Fehler', 'Eskalation fehlgeschlagen');
            }
          }
        }
      ]
    );
  };

  const formatAmount = (cents: number) => {
    return `${(cents / 100).toFixed(2)} €`;
  };

  const getDunningLevelColor = (level: number) => {
    switch (level) {
      case 1: return '#ffc107';
      case 2: return '#ff9800';
      case 3: return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getDunningLevelText = (level: number) => {
    switch (level) {
      case 1: return '1. Mahnung';
      case 2: return '2. Mahnung';
      case 3: return '3. Mahnung (Inkasso-Androhung)';
      default: return 'Unbekannt';
    }
  };

  const renderCaseCard = (caseItem: DunningCase) => {
    const levelColor = getDunningLevelColor(caseItem.dunning_level);
    const nextActionDate = caseItem.next_action_date ? new Date(caseItem.next_action_date) : null;
    const isActionDue = nextActionDate && nextActionDate <= new Date();

    return (
      <View key={caseItem.id} style={styles.caseCard}>
        {/* Header */}
        <View style={styles.caseHeader}>
          <View style={styles.caseHeaderLeft}>
            <Text style={styles.caseName}>
              {caseItem.profiles.first_name} {caseItem.profiles.last_name}
            </Text>
            <Text style={styles.caseEmail}>{caseItem.profiles.email}</Text>
          </View>
          <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
            <Text style={styles.levelBadgeText}>{caseItem.dunning_level}</Text>
          </View>
        </View>

        {/* Level Info */}
        <View style={[styles.levelInfo, { backgroundColor: levelColor + '20' }]}>
          <Text style={[styles.levelInfoText, { color: levelColor }]}>
            {getDunningLevelText(caseItem.dunning_level)}
          </Text>
          {isActionDue && (
            <View style={styles.actionDueBadge}>
              <AlertCircle size={14} color="#fff" />
              <Text style={styles.actionDueText}>Aktion fällig!</Text>
            </View>
          )}
        </View>

        {/* Financial Details */}
        <View style={styles.caseDetails}>
          <View style={styles.caseDetailRow}>
            <Text style={styles.caseDetailLabel}>Hauptforderung:</Text>
            <Text style={styles.caseDetailValue}>{formatAmount(caseItem.principal_amount)}</Text>
          </View>
          <View style={styles.caseDetailRow}>
            <Text style={styles.caseDetailLabel}>Mahngebühren:</Text>
            <Text style={styles.caseDetailValue}>{formatAmount(caseItem.late_fees)}</Text>
          </View>
          <View style={styles.caseDetailRow}>
            <Text style={styles.caseDetailLabel}>Verzugszinsen:</Text>
            <Text style={styles.caseDetailValue}>{formatAmount(caseItem.interest_amount)}</Text>
          </View>
          <View style={styles.caseDivider} />
          <View style={styles.caseDetailRow}>
            <Text style={styles.caseTotalLabel}>Gesamtforderung:</Text>
            <Text style={styles.caseTotalValue}>{formatAmount(caseItem.total_amount)}</Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          <Text style={styles.timelineTitle}>Mahnverlauf</Text>
          {caseItem.first_dunning_sent_at && (
            <Text style={styles.timelineItem}>
              ✓ 1. Mahnung: {new Date(caseItem.first_dunning_sent_at).toLocaleDateString('de-DE')}
            </Text>
          )}
          {caseItem.second_dunning_sent_at && (
            <Text style={styles.timelineItem}>
              ✓ 2. Mahnung: {new Date(caseItem.second_dunning_sent_at).toLocaleDateString('de-DE')}
            </Text>
          )}
          {caseItem.third_dunning_sent_at && (
            <Text style={styles.timelineItem}>
              ✓ 3. Mahnung: {new Date(caseItem.third_dunning_sent_at).toLocaleDateString('de-DE')}
            </Text>
          )}
          {nextActionDate && (
            <Text style={[styles.timelineItem, isActionDue && styles.timelineItemOverdue]}>
              ⏰ Nächste Aktion: {nextActionDate.toLocaleDateString('de-DE')}
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => sendManualDunning(caseItem.id, caseItem.dunning_level)}
            disabled={sendingDunning === caseItem.id}
          >
            <Send size={16} color={Colors.primary} />
            <Text style={styles.actionButtonText}>
              {sendingDunning === caseItem.id ? 'Sendet...' : 'Mahnung erneut senden'}
            </Text>
          </TouchableOpacity>

          {caseItem.dunning_level < 3 && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonWarning]}
              onPress={() => escalateDunning(caseItem.id)}
            >
              <AlertCircle size={16} color="#ff9800" />
              <Text style={[styles.actionButtonText, { color: '#ff9800' }]}>
                Eskalieren
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSuccess]}
            onPress={() => markAsPaid(caseItem.id)}
          >
            <Check size={16} color="#4caf50" />
            <Text style={[styles.actionButtonText, { color: '#4caf50' }]}>
              Als bezahlt markieren
            </Text>
          </TouchableOpacity>
        </View>

        {/* Metadata */}
        <View style={styles.metadata}>
          <Text style={styles.metadataText}>
            Überfällig seit {caseItem.overdue_days} Tagen
          </Text>
          <Text style={styles.metadataText}>
            Erstellt: {new Date(caseItem.created_at).toLocaleDateString('de-DE')}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Forderungsmanagement</Text>
        <Text style={styles.subtitle}>
          Übersicht aller offenen Mahnfälle und Forderungen
        </Text>
      </View>

      {/* Statistics */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_cases}</Text>
            <Text style={styles.statLabel}>Gesamt Fälle</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#ffc107' }]}>{stats.level_1}</Text>
            <Text style={styles.statLabel}>1. Mahnung</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#ff9800' }]}>{stats.level_2}</Text>
            <Text style={styles.statLabel}>2. Mahnung</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#f44336' }]}>{stats.level_3}</Text>
            <Text style={styles.statLabel}>3. Mahnung</Text>
          </View>
          <View style={[styles.statCard, styles.statCardWide]}>
            <Text style={styles.statValue}>{formatAmount(stats.total_amount)}</Text>
            <Text style={styles.statLabel}>Gesamtforderung</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.content}>
        {dunningCases.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Keine offenen Mahnfälle</Text>
          </View>
        ) : (
          <View style={styles.casesList}>
            {dunningCases.map(caseItem => renderCaseCard(caseItem))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#f5f5f5',
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  statCardWide: {
    minWidth: '45%',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  casesList: {
    padding: Spacing.md,
  },
  caseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  caseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  caseHeaderLeft: {
    flex: 1,
  },
  caseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  caseEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  levelBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelBadgeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  levelInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: 6,
    marginBottom: Spacing.md,
  },
  levelInfoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionDueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f44336',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  actionDueText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  caseDetails: {
    marginBottom: Spacing.md,
  },
  caseDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  caseDetailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  caseDetailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  caseDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: Spacing.sm,
  },
  caseTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  caseTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  timeline: {
    backgroundColor: '#f5f5f5',
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  timelineItem: {
    fontSize: 12,
    color: Colors.text,
    marginBottom: 4,
  },
  timelineItemOverdue: {
    color: '#f44336',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: Spacing.xs,
  },
  actionButtonWarning: {
    borderColor: '#ff9800',
  },
  actionButtonSuccess: {
    borderColor: '#4caf50',
  },
  actionButtonText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metadataText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
