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
import { ArrowLeft, AlertCircle, CheckCircle, XCircle, Eye, Ban } from 'lucide-react-native';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants';
import {
  getAllReports,
  updateReportStatus,
  deleteReportedContent,
  Report,
  reportReasons,
} from '../../services/reportService';
import { useAuth } from '../../utils/authContext';
import { takeAdminAction } from '../../services/adminService';
import { supabase } from '../../lib/supabase';

const statusColors = {
  pending: Colors.warning,
  reviewed: Colors.info,
  action_taken: Colors.success,
  dismissed: Colors.textTertiary,
};

const statusLabels = {
  pending: 'Ausstehend',
  reviewed: 'Überprüft',
  action_taken: 'Maßnahme ergriffen',
  dismissed: 'Abgelehnt',
};

export default function AdminReportsPage() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!profile?.is_admin) {
      Alert.alert('Zugriff verweigert', 'Du hast keine Admin-Berechtigung');
      router.back();
      return;
    }

    loadReports();
  }, [profile]);

  const loadReports = async () => {
    setLoading(true);
    const data = await getAllReports();
    setReports(data);
    setLoading(false);
  };

  const handleUpdateStatus = async (
    reportId: string,
    status: 'reviewed' | 'action_taken' | 'dismissed'
  ) => {
    setProcessing(true);
    const result = await updateReportStatus(reportId, status, adminNotes);
    setProcessing(false);

    if (result.success) {
      Alert.alert('Erfolg', 'Meldung wurde aktualisiert');
      setSelectedReport(null);
      setAdminNotes('');
      loadReports();
    } else {
      Alert.alert('Fehler', result.error || 'Fehler beim Aktualisieren');
    }
  };

  const handleDeleteContent = async (report: Report) => {
    Alert.alert(
      'Inhalt löschen',
      'Möchtest du den gemeldeten Inhalt wirklich löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            const result = await deleteReportedContent(
              report.reported_entity_type,
              report.reported_entity_id
            );
            setProcessing(false);

            if (result.success) {
              await handleUpdateStatus(report.id, 'action_taken');
            } else {
              Alert.alert('Fehler', result.error || 'Fehler beim Löschen');
            }
          },
        },
      ]
    );
  };

  const handleSuspendUser = async (report: Report) => {
    Alert.alert(
      'Nutzer sperren',
      'Möchtest du den gemeldeten Nutzer für 7 Tage sperren?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Sperren',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              const { error } = await supabase
                .from('profiles')
                .update({
                  is_suspended: true,
                  suspended_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  suspension_reason: `Gemeldeter Inhalt: ${getReasonLabel(report.reason)}`,
                  violation_count: supabase.raw('violation_count + 1'),
                })
                .eq('id', report.reported_user_id);

              if (error) throw error;

              await supabase.from('admin_alerts').insert({
                alert_type: 'warning',
                title: 'Nutzer wegen Meldung gesperrt',
                message: `User wurde für 7 Tage gesperrt. Grund: ${getReasonLabel(report.reason)}`,
                severity: 3,
                related_content_type: 'user',
                related_content_id: report.reported_user_id,
              });

              await handleUpdateStatus(report.id, 'action_taken');
              Alert.alert('Erfolg', 'Nutzer wurde gesperrt');
            } catch (error) {
              console.error('Error suspending user:', error);
              Alert.alert('Fehler', 'Fehler beim Sperren des Nutzers');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const getReasonLabel = (reason: string) => {
    const found = reportReasons.find((r) => r.value === reason);
    return found?.label || reason;
  };

  const renderReportCard = (report: Report) => (
    <TouchableOpacity
      key={report.id}
      style={styles.reportCard}
      onPress={() => setSelectedReport(report)}
    >
      <View style={styles.reportHeader}>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[report.status] }]}>
          <Text style={styles.statusText}>{statusLabels[report.status]}</Text>
        </View>
        <Text style={styles.reportDate}>
          {new Date(report.created_at).toLocaleDateString('de-DE')}
        </Text>
      </View>

      <View style={styles.reportBody}>
        <View style={styles.reportRow}>
          <Text style={styles.reportLabel}>Typ:</Text>
          <Text style={styles.reportValue}>{report.reported_entity_type}</Text>
        </View>

        <View style={styles.reportRow}>
          <Text style={styles.reportLabel}>Grund:</Text>
          <Text style={styles.reportValue}>{getReasonLabel(report.reason_category)}</Text>
        </View>

        {report.ai_pre_checked && (
          <View style={styles.aiInfo}>
            <AlertCircle size={14} color={Colors.info} />
            <Text style={styles.aiInfoText}>
              KI-geprüft (Priorität: {report.priority_score})
            </Text>
          </View>
        )}

        {report.reason_text && (
          <Text style={styles.reasonText} numberOfLines={2}>
            {report.reason_text}
          </Text>
        )}
      </View>

      <View style={styles.reportFooter}>
        <Text style={styles.reportId}>ID: {report.reported_entity_id.substring(0, 8)}</Text>
        <Eye size={16} color={Colors.primary} />
      </View>
    </TouchableOpacity>
  );

  const renderReportDetail = () => {
    if (!selectedReport) return null;

    return (
      <View style={styles.detailOverlay}>
        <SafeAreaView style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setSelectedReport(null)}>
              <ArrowLeft size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.detailTitle}>Meldungs-Details</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Allgemeine Informationen</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <View
                  style={[styles.statusBadge, { backgroundColor: statusColors[selectedReport.status] }]}
                >
                  <Text style={styles.statusText}>{statusLabels[selectedReport.status]}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Typ:</Text>
                <Text style={styles.detailValue}>{selectedReport.reported_entity_type}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Entity ID:</Text>
                <Text style={styles.detailValue}>{selectedReport.reported_entity_id}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Grund:</Text>
                <Text style={styles.detailValue}>
                  {getReasonLabel(selectedReport.reason_category)}
                </Text>
              </View>
              {selectedReport.reason_text && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Beschreibung:</Text>
                  <Text style={styles.detailValue}>{selectedReport.reason_text}</Text>
                </View>
              )}
            </View>

            {selectedReport.ai_pre_checked && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>KI-Moderation</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vertrauenswert:</Text>
                  <Text style={styles.detailValue}>
                    {((selectedReport.ai_confidence || 0) * 100).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Priorität:</Text>
                  <Text style={styles.detailValue}>{selectedReport.priority_score}</Text>
                </View>
              </View>
            )}

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Admin-Notizen</Text>
              <TextInput
                style={styles.notesInput}
                multiline
                numberOfLines={4}
                placeholder="Notizen hinzufügen..."
                placeholderTextColor={Colors.textTertiary}
                value={adminNotes}
                onChangeText={setAdminNotes}
              />
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.reviewButton]}
                onPress={() => handleUpdateStatus(selectedReport.id, 'reviewed')}
                disabled={processing}
              >
                <CheckCircle size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Als überprüft markieren</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.dismissButton]}
                onPress={() => handleUpdateStatus(selectedReport.id, 'dismissed')}
                disabled={processing}
              >
                <XCircle size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Ablehnen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteContent(selectedReport)}
                disabled={processing}
              >
                <AlertCircle size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Inhalt löschen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: Colors.error }]}
                onPress={() => handleSuspendUser(selectedReport)}
                disabled={processing}
              >
                <Ban size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Nutzer sperren</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Lade Meldungen...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pendingReports = reports.filter((r) => r.status === 'pending');
  const reviewedReports = reports.filter((r) => r.status !== 'pending');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meldungen</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pendingReports.length}</Text>
            <Text style={styles.statLabel}>Ausstehend</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{reviewedReports.length}</Text>
            <Text style={styles.statLabel}>Bearbeitet</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{reports.length}</Text>
            <Text style={styles.statLabel}>Gesamt</Text>
          </View>
        </View>

        {pendingReports.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ausstehende Meldungen</Text>
            {pendingReports.map(renderReportCard)}
          </View>
        )}

        {reviewedReports.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bearbeitete Meldungen</Text>
            {reviewedReports.map(renderReportCard)}
          </View>
        )}

        {reports.length === 0 && (
          <View style={styles.emptyContainer}>
            <AlertCircle size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>Keine Meldungen vorhanden</Text>
          </View>
        )}
      </ScrollView>

      {renderReportDetail()}
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
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: '#fff',
  },
  reportDate: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  reportBody: {
    gap: Spacing.xs,
  },
  reportRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  reportLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
  },
  reportValue: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    flex: 1,
  },
  aiInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  aiInfoText: {
    fontSize: FontSizes.xs,
    color: Colors.info,
  },
  reasonText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reportId: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
  },
  detailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.gray200,
  },
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  detailContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  detailSection: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  detailSectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  detailLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
    width: 120,
  },
  detailValue: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    flex: 1,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actionButtons: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  reviewButton: {
    backgroundColor: Colors.success,
  },
  dismissButton: {
    backgroundColor: Colors.textTertiary,
  },
  deleteButton: {
    backgroundColor: Colors.error,
  },
  actionButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#fff',
  },
});
