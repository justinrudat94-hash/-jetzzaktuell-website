import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Download, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react-native';
import { useAuth } from '@/utils/authContext';
import * as ustService from '@/services/ustTrackingService';

export default function OssTaxReportsScreen() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [quarters, setQuarters] = useState<any[]>([]);
  const [currentQuarter, setCurrentQuarter] = useState<any>(null);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!profile?.is_admin) {
      router.replace('/admin');
      return;
    }

    loadData();
  }, [profile]);

  async function loadData() {
    setLoading(true);

    try {
      const [quartersRes, currentRes] = await Promise.all([
        ustService.getQuartersOverview(),
        ustService.getCurrentQuarter(),
      ]);

      if (quartersRes.success && quartersRes.quarters) {
        setQuarters(quartersRes.quarters);
      }

      if (currentRes.success && currentRes.quarter) {
        setCurrentQuarter(currentRes.quarter);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReport(year: number, quarter: number) {
    setGenerating(true);

    try {
      const result = await ustService.generateQuarterlyReport(year, quarter);

      if (result.success) {
        Alert.alert('Erfolg', `Quartalsbericht ${ustService.formatQuarterString(year, quarter)} wurde generiert.`);
        await loadData();
      } else {
        Alert.alert('Fehler', result.error || 'Fehler beim Generieren des Berichts');
      }
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Unbekannter Fehler');
    } finally {
      setGenerating(false);
    }
  }

  async function handleViewReport(year: number, quarter: number) {
    try {
      const result = await ustService.getQuarterlyReport(year, quarter);

      if (result.success && result.report) {
        setSelectedReport(result.report);
      } else {
        Alert.alert('Fehler', 'Bericht nicht gefunden');
      }
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Unbekannter Fehler');
    }
  }

  async function handleUpdateStatus(
    reportId: string,
    status: 'draft' | 'submitted' | 'paid'
  ) {
    try {
      const additionalData: any = {};

      if (status === 'submitted') {
        additionalData.submissionDate = new Date().toISOString();
      } else if (status === 'paid') {
        additionalData.paymentDate = new Date().toISOString();
      }

      const result = await ustService.updateReportStatus(reportId, status, additionalData);

      if (result.success) {
        Alert.alert('Erfolg', 'Status wurde aktualisiert');
        setSelectedReport(null);
        await loadData();
      } else {
        Alert.alert('Fehler', result.error || 'Fehler beim Aktualisieren');
      }
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Unbekannter Fehler');
    }
  }

  function getStatusColor(status?: string) {
    switch (status) {
      case 'draft':
        return '#F59E0B';
      case 'submitted':
        return '#3B82F6';
      case 'paid':
        return '#10B981';
      default:
        return '#6B7280';
    }
  }

  function getStatusIcon(status?: string) {
    switch (status) {
      case 'draft':
        return <Clock size={16} color="#F59E0B" />;
      case 'submitted':
        return <AlertCircle size={16} color="#3B82F6" />;
      case 'paid':
        return <CheckCircle size={16} color="#10B981" />;
      default:
        return null;
    }
  }

  function getStatusText(status?: string) {
    switch (status) {
      case 'draft':
        return 'Entwurf';
      case 'submitted':
        return 'Gemeldet';
      case 'paid':
        return 'Bezahlt';
      default:
        return 'Kein Bericht';
    }
  }

  function isOverdue(year: number, quarter: number) {
    return ustService.isOssOverdue(year, quarter);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (selectedReport) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedReport(null)}
          >
            <ArrowLeft size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Quartalsbericht {ustService.formatQuarterString(selectedReport.year, selectedReport.quarter)}
          </Text>
        </View>

        <View style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <View style={styles.statusBadge} style={{backgroundColor: getStatusColor(selectedReport.status) + '20'}}>
              {getStatusIcon(selectedReport.status)}
              <Text style={[styles.statusText, {color: getStatusColor(selectedReport.status)}]}>
                {getStatusText(selectedReport.status)}
              </Text>
            </View>
          </View>

          <View style={styles.reportSection}>
            <Text style={styles.sectionTitle}>Zusammenfassung</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Transaktionen:</Text>
              <Text style={styles.summaryValue}>{selectedReport.total_transactions}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Netto:</Text>
              <Text style={styles.summaryValue}>
                {ustService.formatEurAmount(selectedReport.total_net_amount)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>USt (19%):</Text>
              <Text style={styles.summaryValue}>
                {ustService.formatEurAmount(selectedReport.total_vat_amount)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryLabelBold}>Brutto:</Text>
              <Text style={styles.summaryValueBold}>
                {ustService.formatEurAmount(selectedReport.total_gross_amount)}
              </Text>
            </View>
          </View>

          {selectedReport.report_data?.by_country && (
            <View style={styles.reportSection}>
              <Text style={styles.sectionTitle}>Aufschlüsselung nach Land</Text>
              <View style={styles.countryTable}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { flex: 2 }]}>Land</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1 }]}>USt</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Anzahl</Text>
                  <Text style={[styles.tableHeaderText, { flex: 2 }]}>Netto</Text>
                  <Text style={[styles.tableHeaderText, { flex: 2 }]}>USt-Betrag</Text>
                  <Text style={[styles.tableHeaderText, { flex: 2 }]}>Brutto</Text>
                </View>
                {Object.entries(selectedReport.report_data.by_country)
                  .sort(([, a]: [string, any], [, b]: [string, any]) => b.gross_amount - a.gross_amount)
                  .map(([countryCode, data]: [string, any]) => (
                    <View key={countryCode} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 2 }]}>{data.country_name || countryCode}</Text>
                      <Text style={[styles.tableCell, { flex: 1 }]}>{data.vat_rate.toFixed(0)}%</Text>
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>{data.count}</Text>
                      <Text style={[styles.tableCell, { flex: 2 }]}>
                        {ustService.formatEurAmount(data.net_amount)}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 2 }]}>
                        {ustService.formatEurAmount(data.vat_amount)}
                      </Text>
                      <Text style={[styles.tableCellBold, { flex: 2 }]}>
                        {ustService.formatEurAmount(data.gross_amount)}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          )}

          {selectedReport.report_data?.by_type && (
            <View style={styles.reportSection}>
              <Text style={styles.sectionTitle}>Aufschlüsselung nach Transaktionstyp</Text>
              {Object.entries(selectedReport.report_data.by_type).map(([type, data]: [string, any]) => (
                <View key={type} style={styles.typeCard}>
                  <Text style={styles.typeName}>{getTransactionTypeName(type)}</Text>
                  <View style={styles.typeDetails}>
                    <Text style={styles.typeDetail}>Anzahl: {data.count}</Text>
                    <Text style={styles.typeDetail}>
                      Netto: {ustService.formatEurAmount(data.net_amount)}
                    </Text>
                    <Text style={styles.typeDetail}>
                      USt: {ustService.formatEurAmount(data.vat_amount)}
                    </Text>
                    <Text style={styles.typeDetailBold}>
                      Brutto: {ustService.formatEurAmount(data.gross_amount)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.reportSection}>
            <Text style={styles.sectionTitle}>Zeitraum</Text>
            <Text style={styles.reportText}>
              {new Date(selectedReport.report_data.period_start).toLocaleDateString('de-DE')} -{' '}
              {new Date(selectedReport.report_data.period_end).toLocaleDateString('de-DE')}
            </Text>
          </View>

          <View style={styles.reportSection}>
            <Text style={styles.sectionTitle}>Meldung & Zahlung</Text>
            {selectedReport.submission_date && (
              <Text style={styles.reportText}>
                Gemeldet am: {new Date(selectedReport.submission_date).toLocaleDateString('de-DE')}
              </Text>
            )}
            {selectedReport.payment_date && (
              <Text style={styles.reportText}>
                Bezahlt am: {new Date(selectedReport.payment_date).toLocaleDateString('de-DE')}
              </Text>
            )}
            {selectedReport.payment_reference && (
              <Text style={styles.reportText}>
                Referenz: {selectedReport.payment_reference}
              </Text>
            )}
            {!selectedReport.submission_date && (
              <Text style={styles.reportTextMuted}>Noch nicht gemeldet</Text>
            )}
          </View>

          <View style={styles.actionButtons}>
            {selectedReport.status === 'draft' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.submitButton]}
                onPress={() => handleUpdateStatus(selectedReport.id, 'submitted')}
              >
                <Text style={styles.actionButtonText}>Als "Gemeldet" markieren</Text>
              </TouchableOpacity>
            )}

            {selectedReport.status === 'submitted' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.paidButton]}
                onPress={() => handleUpdateStatus(selectedReport.id, 'paid')}
              >
                <Text style={styles.actionButtonText}>Als "Bezahlt" markieren</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>OSS-Umsatzsteuer-Meldungen</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
          <RefreshCw size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Non-Union OSS-Verfahren</Text>
        <Text style={styles.infoText}>
          Quartalsweise Meldung und Zahlung der Umsatzsteuer für digitale Dienstleistungen im deutschen Markt.
        </Text>
        <Text style={styles.infoText}>
          Frist: 30 Tage nach Quartalsende
        </Text>
        {currentQuarter && (
          <View style={styles.currentQuarter}>
            <Text style={styles.currentQuarterLabel}>Aktuelles Quartal:</Text>
            <Text style={styles.currentQuarterValue}>
              {ustService.formatQuarterString(currentQuarter.year, currentQuarter.quarter)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.quartersList}>
        <Text style={styles.sectionTitle}>Quartale</Text>

        {quarters.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Noch keine Transaktionen vorhanden</Text>
          </View>
        ) : (
          quarters.map((quarter) => {
            const overdue = !quarter.has_report && isOverdue(quarter.year, quarter.quarter);

            return (
              <View
                key={`${quarter.year}-${quarter.quarter}`}
                style={[styles.quarterCard, overdue && styles.quarterCardOverdue]}
              >
                <View style={styles.quarterHeader}>
                  <Text style={styles.quarterTitle}>
                    {ustService.formatQuarterString(quarter.year, quarter.quarter)}
                  </Text>
                  {overdue && (
                    <View style={styles.overdueBadge}>
                      <AlertCircle size={16} color="#EF4444" />
                      <Text style={styles.overdueText}>Überfällig</Text>
                    </View>
                  )}
                  {!overdue && quarter.has_report && (
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(quarter.report_status) + '20' },
                      ]}
                    >
                      {getStatusIcon(quarter.report_status)}
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(quarter.report_status) },
                        ]}
                      >
                        {getStatusText(quarter.report_status)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.quarterStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Transaktionen</Text>
                    <Text style={styles.statValue}>{quarter.transaction_count}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Netto</Text>
                    <Text style={styles.statValue}>
                      {ustService.formatEurAmount(quarter.total_net)}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>USt (19%)</Text>
                    <Text style={styles.statValue}>
                      {ustService.formatEurAmount(quarter.total_vat)}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Brutto</Text>
                    <Text style={styles.statValueBold}>
                      {ustService.formatEurAmount(quarter.total_gross)}
                    </Text>
                  </View>
                </View>

                <View style={styles.quarterActions}>
                  {!quarter.has_report ? (
                    <TouchableOpacity
                      style={styles.generateButton}
                      onPress={() => handleGenerateReport(quarter.year, quarter.quarter)}
                      disabled={generating}
                    >
                      {generating ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.generateButtonText}>Bericht generieren</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.viewButton}
                      onPress={() => handleViewReport(quarter.year, quarter.quarter)}
                    >
                      <Text style={styles.viewButtonText}>Bericht ansehen</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function getTransactionTypeName(type: string): string {
  switch (type) {
    case 'coin_purchase':
      return 'Coin-Käufe';
    case 'premium_subscription':
      return 'Premium-Abonnements';
    case 'ticket_purchase':
      return 'Ticket-Käufe';
    case 'boost_purchase':
      return 'Boost-Käufe';
    default:
      return type;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  infoCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 4,
  },
  currentQuarter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  currentQuarterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginRight: 8,
  },
  currentQuarterValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  quartersList: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  quarterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quarterCardOverdue: {
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  quarterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quarterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  overdueText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#EF4444',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  quarterStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  statValueBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  quarterActions: {
    marginTop: 12,
  },
  generateButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  viewButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  reportCard: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reportHeader: {
    marginBottom: 16,
  },
  reportSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  summaryTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summaryLabelBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  summaryValueBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  typeCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  typeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  typeDetails: {
    gap: 4,
  },
  typeDetail: {
    fontSize: 12,
    color: '#6B7280',
  },
  typeDetailBold: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginTop: 4,
  },
  reportText: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  reportTextMuted: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  actionButtons: {
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
  paidButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  countryTable: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'left',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableCell: {
    fontSize: 13,
    color: '#111827',
    textAlign: 'left',
  },
  tableCellBold: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'left',
  },
});
