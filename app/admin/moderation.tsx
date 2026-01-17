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
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react-native';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants';
import {
  getModerationQueue,
  approveModerationItem,
  rejectModerationItem,
} from '../../services/adminService';
import { useAuth } from '../../utils/authContext';

interface ModerationItem {
  id: string;
  content_type: string;
  content_id: string;
  user_id: string;
  risk_level: string;
  flagged_categories: string[];
  status: string;
  original_content: string;
  created_at: string;
}

const riskColors = {
  safe: Colors.success,
  low: Colors.info,
  medium: Colors.warning,
  high: Colors.error,
  critical: '#8B0000',
};

const riskLabels = {
  safe: 'Sicher',
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
  critical: 'Kritisch',
};

const contentTypeLabels = {
  event: 'Event',
  profile: 'Profil',
  chat: 'Chat',
  comment: 'Kommentar',
};

export default function ModerationQueuePage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    setLoading(true);
    const data = await getModerationQueue();
    setItems(data);
    setLoading(false);
  };

  const handleApprove = async (itemId: string) => {
    Alert.alert(
      'Inhalt freigeben',
      'Möchtest du diesen Inhalt freigeben?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Freigeben',
          onPress: async () => {
            setProcessing(true);
            const result = await approveModerationItem(itemId, adminNotes);
            setProcessing(false);

            if (result.success) {
              Alert.alert('Erfolg', 'Inhalt wurde freigegeben');
              setSelectedItem(null);
              setAdminNotes('');
              loadQueue();
            } else {
              Alert.alert('Fehler', 'Fehler beim Freigeben');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (itemId: string) => {
    Alert.alert(
      'Inhalt ablehnen & löschen',
      'Dieser Inhalt wird gelöscht und der Nutzer erhält einen Verstoß. Fortfahren?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Ablehnen',
          style: 'destructive',
          onPress: async () => {
            if (!adminNotes.trim()) {
              Alert.alert('Fehler', 'Bitte gib einen Grund für die Ablehnung an');
              return;
            }

            setProcessing(true);
            const result = await rejectModerationItem(itemId, adminNotes);
            setProcessing(false);

            if (result.success) {
              Alert.alert('Erfolg', 'Inhalt wurde abgelehnt und gelöscht');
              setSelectedItem(null);
              setAdminNotes('');
              loadQueue();
            } else {
              Alert.alert('Fehler', 'Fehler beim Ablehnen');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Lade Moderations-Queue...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedItem) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              setSelectedItem(null);
              setAdminNotes('');
            }}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inhalt überprüfen</Text>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Content-Typ:</Text>
              <Text style={styles.detailValue}>
                {contentTypeLabels[selectedItem.content_type as keyof typeof contentTypeLabels] || selectedItem.content_type}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Risiko-Level:</Text>
              <View
                style={[
                  styles.riskBadge,
                  { backgroundColor: riskColors[selectedItem.risk_level as keyof typeof riskColors] },
                ]}
              >
                <Text style={styles.riskBadgeText}>
                  {riskLabels[selectedItem.risk_level as keyof typeof riskLabels] || selectedItem.risk_level}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Kategorien:</Text>
              <View style={styles.categoriesContainer}>
                {selectedItem.flagged_categories.map((cat, index) => (
                  <View key={index} style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{cat}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Erstellt:</Text>
              <Text style={styles.detailValue}>
                {new Date(selectedItem.created_at).toLocaleString('de-DE')}
              </Text>
            </View>

            <View style={styles.contentBox}>
              <Text style={styles.contentLabel}>Originaler Inhalt:</Text>
              <Text style={styles.contentText}>{selectedItem.original_content}</Text>
            </View>

            <View style={styles.notesInput}>
              <Text style={styles.notesLabel}>Admin-Notizen:</Text>
              <TextInput
                style={styles.textArea}
                value={adminNotes}
                onChangeText={setAdminNotes}
                placeholder="Grund für Entscheidung (erforderlich bei Ablehnung)..."
                placeholderTextColor={Colors.gray500}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleApprove(selectedItem.id)}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <CheckCircle size={20} color={Colors.white} />
                    <Text style={styles.actionButtonText}>Freigeben</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleReject(selectedItem.id)}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <XCircle size={20} color={Colors.white} />
                    <Text style={styles.actionButtonText}>Ablehnen</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Moderations-Queue</Text>
        <TouchableOpacity onPress={loadQueue} style={styles.refreshButton}>
          <Text style={styles.refreshText}>Aktualisieren</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{items.length}</Text>
          <Text style={styles.statLabel}>Zu überprüfen</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: Colors.error }]}>
            {items.filter((i) => i.risk_level === 'high' || i.risk_level === 'critical').length}
          </Text>
          <Text style={styles.statLabel}>Hohe Priorität</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CheckCircle size={64} color={Colors.success} />
            <Text style={styles.emptyTitle}>Alles erledigt!</Text>
            <Text style={styles.emptyText}>
              Keine Inhalte zur Überprüfung vorhanden
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.queueItem}
              onPress={() => setSelectedItem(item)}
            >
              <View style={styles.queueItemHeader}>
                <View
                  style={[
                    styles.riskIndicator,
                    { backgroundColor: riskColors[item.risk_level as keyof typeof riskColors] },
                  ]}
                />
                <View style={styles.queueItemInfo}>
                  <Text style={styles.queueItemType}>
                    {contentTypeLabels[item.content_type as keyof typeof contentTypeLabels] || item.content_type}
                  </Text>
                  <Text style={styles.queueItemDate}>
                    {new Date(item.created_at).toLocaleDateString('de-DE')} •{' '}
                    {new Date(item.created_at).toLocaleTimeString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <View
                  style={[
                    styles.riskBadge,
                    { backgroundColor: riskColors[item.risk_level as keyof typeof riskColors] },
                  ]}
                >
                  <Text style={styles.riskBadgeText}>
                    {riskLabels[item.risk_level as keyof typeof riskLabels]}
                  </Text>
                </View>
              </View>

              <Text style={styles.queueItemContent} numberOfLines={2}>
                {item.original_content}
              </Text>

              <View style={styles.queueItemFooter}>
                {item.flagged_categories.slice(0, 3).map((cat, index) => (
                  <View key={index} style={styles.categoryBadgeSmall}>
                    <Text style={styles.categoryTextSmall}>{cat}</Text>
                  </View>
                ))}
                <Eye size={16} color={Colors.primary} style={{ marginLeft: 'auto' }} />
              </View>
            </TouchableOpacity>
          ))
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.md,
  },
  refreshButton: {
    padding: Spacing.xs,
  },
  refreshText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
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
  statBox: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  content: {
    flex: 1,
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
  queueItem: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  queueItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  riskIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  queueItemInfo: {
    flex: 1,
  },
  queueItemType: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },
  queueItemDate: {
    fontSize: FontSizes.sm,
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
  queueItemContent: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  queueItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  categoryBadgeSmall: {
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  categoryTextSmall: {
    fontSize: FontSizes.xs,
    color: Colors.error,
  },
  detailCard: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  detailRow: {
    gap: Spacing.xs,
  },
  detailLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  categoryBadge: {
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    fontWeight: FontWeights.medium,
  },
  contentBox: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  contentLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  contentText: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  notesInput: {
    gap: Spacing.xs,
  },
  notesLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
  },
  textArea: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
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
  approveButton: {
    backgroundColor: Colors.success,
  },
  rejectButton: {
    backgroundColor: Colors.error,
  },
  actionButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
});
