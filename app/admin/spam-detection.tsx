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
  Alert,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  ShieldAlert,
  User,
  Calendar,
  MessageSquare,
  Flag,
  AlertTriangle,
  Ban,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react-native';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants';
import { spamDetectionService, SuspiciousUser } from '../../services/spamDetectionService';
import { useAuth } from '../../utils/authContext';

export default function SpamDetectionDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suspiciousUsers, setSuspiciousUsers] = useState<SuspiciousUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SuspiciousUser | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspensionDays, setSuspensionDays] = useState('7');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await spamDetectionService.getSuspiciousUsers(50);
      setSuspiciousUsers(data);
    } catch (error) {
      console.error('Error loading suspicious users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) return;

    if (!suspensionReason.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Sperrgrund an');
      return;
    }

    Alert.alert(
      'Nutzer sperren',
      `Möchtest du ${selectedUser.username} für ${suspensionDays} Tage sperren?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Sperren',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            const success = await spamDetectionService.suspendUser(
              selectedUser.user_id,
              suspensionReason,
              parseInt(suspensionDays)
            );
            setProcessing(false);

            if (success) {
              Alert.alert('Erfolg', 'Nutzer wurde gesperrt');
              setSelectedUser(null);
              setSuspensionReason('');
              loadData();
            } else {
              Alert.alert('Fehler', 'Fehler beim Sperren des Nutzers');
            }
          },
        },
      ]
    );
  };

  const handleMarkAsInvestigated = async (userId: string) => {
    const success = await spamDetectionService.markAsInvestigated(userId);
    if (success) {
      loadData();
    }
  };

  const getRiskColor = (riskLevel: string) => {
    return spamDetectionService.getRiskLevelColor(riskLevel);
  };

  const getRiskLabel = (riskLevel: string) => {
    return spamDetectionService.getRiskLevelLabel(riskLevel);
  };

  const renderUserCard = (user: SuspiciousUser) => {
    const riskColor = getRiskColor(user.risk_level);

    return (
      <TouchableOpacity
        key={user.user_id}
        style={styles.userCard}
        onPress={() => setSelectedUser(user)}
      >
        <View style={styles.userHeader}>
          <View style={[styles.riskIndicator, { backgroundColor: riskColor }]} />
          <View style={styles.userIconContainer}>
            <User size={24} color={Colors.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.username}>{user.username}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
          <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>
            <Text style={styles.riskBadgeText}>{getRiskLabel(user.risk_level)}</Text>
          </View>
        </View>

        <View style={styles.spamScoreContainer}>
          <TrendingUp size={16} color={riskColor} />
          <Text style={styles.spamScoreLabel}>Spam-Score:</Text>
          <Text style={[styles.spamScoreValue, { color: riskColor }]}>
            {(user.spam_score * 100).toFixed(0)}%
          </Text>
        </View>

        <View style={styles.activityGrid}>
          <View style={styles.activityItem}>
            <Calendar size={16} color={Colors.textSecondary} />
            <Text style={styles.activityValue}>{user.activity_summary.events_created_24h}</Text>
            <Text style={styles.activityLabel}>Events/24h</Text>
          </View>
          <View style={styles.activityItem}>
            <MessageSquare size={16} color={Colors.textSecondary} />
            <Text style={styles.activityValue}>{user.activity_summary.comments_created_24h}</Text>
            <Text style={styles.activityLabel}>Kommentare/24h</Text>
          </View>
          <View style={styles.activityItem}>
            <Flag size={16} color={Colors.error} />
            <Text style={styles.activityValue}>{user.activity_summary.reports_received}</Text>
            <Text style={styles.activityLabel}>Reports</Text>
          </View>
          <View style={styles.activityItem}>
            <AlertTriangle size={16} color={Colors.warning} />
            <Text style={styles.activityValue}>{user.activity_summary.violation_count}</Text>
            <Text style={styles.activityLabel}>Verstöße</Text>
          </View>
        </View>

        {user.detected_patterns.length > 0 && (
          <View style={styles.patternsContainer}>
            <Text style={styles.patternsLabel}>Erkannte Muster:</Text>
            {user.detected_patterns.map((pattern, index) => (
              <View key={index} style={styles.patternBadge}>
                <Text style={styles.patternText}>{pattern}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.accountAge}>
          <Clock size={14} color={Colors.textSecondary} />
          <Text style={styles.accountAgeText}>
            Account-Alter: {user.activity_summary.account_age_days} Tage
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (selectedUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              setSelectedUser(null);
              setSuspensionReason('');
            }}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nutzer überprüfen</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <User size={48} color={Colors.primary} />
              <View style={styles.detailHeaderInfo}>
                <Text style={styles.detailUsername}>{selectedUser.username}</Text>
                <Text style={styles.detailEmail}>{selectedUser.email}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Spam-Score</Text>
              <View style={styles.scoreBar}>
                <View
                  style={[
                    styles.scoreBarFill,
                    {
                      width: `${selectedUser.spam_score * 100}%`,
                      backgroundColor: getRiskColor(selectedUser.risk_level),
                    },
                  ]}
                />
                <Text style={styles.scoreBarText}>{(selectedUser.spam_score * 100).toFixed(0)}%</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Aktivitäts-Übersicht</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Events (24h):</Text>
                <Text style={styles.detailValue}>{selectedUser.activity_summary.events_created_24h}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Kommentare (24h):</Text>
                <Text style={styles.detailValue}>{selectedUser.activity_summary.comments_created_24h}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Erhaltene Reports:</Text>
                <Text style={styles.detailValue}>{selectedUser.activity_summary.reports_received}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Verstöße:</Text>
                <Text style={styles.detailValue}>{selectedUser.activity_summary.violation_count}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Account-Alter:</Text>
                <Text style={styles.detailValue}>{selectedUser.activity_summary.account_age_days} Tage</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Erkannte Muster</Text>
              {selectedUser.detected_patterns.map((pattern, index) => (
                <View key={index} style={styles.detailPattern}>
                  <AlertTriangle size={16} color={Colors.warning} />
                  <Text style={styles.detailPatternText}>{pattern}</Text>
                </View>
              ))}
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Nutzer sperren</Text>
              <TextInput
                style={styles.input}
                value={suspensionReason}
                onChangeText={setSuspensionReason}
                placeholder="Sperrgrund (erforderlich)..."
                placeholderTextColor={Colors.gray500}
                multiline
                numberOfLines={3}
              />
              <View style={styles.durationRow}>
                <Text style={styles.durationLabel}>Dauer:</Text>
                <TextInput
                  style={styles.durationInput}
                  value={suspensionDays}
                  onChangeText={setSuspensionDays}
                  keyboardType="number-pad"
                  placeholder="7"
                  placeholderTextColor={Colors.gray500}
                />
                <Text style={styles.durationLabel}>Tage</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.suspendButton]}
                onPress={handleSuspendUser}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Ban size={20} color={Colors.white} />
                    <Text style={styles.actionButtonText}>Nutzer sperren</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.investigatedButton]}
                onPress={() => {
                  handleMarkAsInvestigated(selectedUser.user_id);
                  setSelectedUser(null);
                }}
              >
                <CheckCircle size={20} color={Colors.white} />
                <Text style={styles.actionButtonText}>Als geprüft</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Analysiere verdächtige Aktivitäten...</Text>
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
        <Text style={styles.headerTitle}>Spam-Erkennung</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <ShieldAlert size={32} color={Colors.error} />
          <Text style={styles.statNumber}>{suspiciousUsers.length}</Text>
          <Text style={styles.statLabel}>Verdächtige Nutzer</Text>
        </View>
        <View style={styles.statCard}>
          <AlertTriangle size={32} color={Colors.warning} />
          <Text style={[styles.statNumber, { color: Colors.error }]}>
            {suspiciousUsers.filter(u => u.risk_level === 'critical' || u.risk_level === 'high').length}
          </Text>
          <Text style={styles.statLabel}>High-Risk</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {suspiciousUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CheckCircle size={64} color={Colors.success} />
            <Text style={styles.emptyTitle}>Keine verdächtigen Aktivitäten</Text>
            <Text style={styles.emptyText}>
              Alle Nutzer-Aktivitäten sind im normalen Bereich
            </Text>
          </View>
        ) : (
          <View style={styles.usersList}>
            {suspiciousUsers.map(renderUserCard)}
          </View>
        )}
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
  statsContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  statNumber: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  usersList: {
    padding: Spacing.md,
  },
  userCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  riskIndicator: {
    width: 4,
    height: 48,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  userIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  userEmail: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  riskBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  riskBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  spamScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  spamScoreLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  spamScoreValue: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  activityGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  activityItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  activityValue: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  activityLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  patternsContainer: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  patternsLabel: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
  },
  patternBadge: {
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  patternText: {
    fontSize: FontSizes.xs,
    color: Colors.error,
  },
  accountAge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  accountAgeText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  detailCard: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  detailHeaderInfo: {
    flex: 1,
  },
  detailUsername: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  detailEmail: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  detailSection: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  scoreBar: {
    height: 32,
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  scoreBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: BorderRadius.md,
  },
  scoreBarText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    zIndex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  detailLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },
  detailPattern: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
  },
  detailPatternText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.error,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  durationLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  durationInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    width: 60,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  suspendButton: {
    backgroundColor: Colors.error,
  },
  investigatedButton: {
    backgroundColor: Colors.success,
  },
  actionButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    marginTop: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
