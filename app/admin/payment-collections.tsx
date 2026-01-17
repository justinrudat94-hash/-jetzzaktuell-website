import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/utils/authContext';
import { useRouter } from 'expo-router';
import { collectionService, CollectionCase } from '@/services/collectionService';
import { Package, FileCheck, AlertCircle, Download } from 'lucide-react-native';

export default function PaymentCollections() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'open' | 'forwarded'>('open');
  const [openCases, setOpenCases] = useState<CollectionCase[]>([]);
  const [forwardedCases, setForwardedCases] = useState<CollectionCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.is_admin) {
      router.replace('/');
      return;
    }
    loadCases();
  }, [user]);

  const loadCases = async () => {
    setLoading(true);
    try {
      const [open, forwarded] = await Promise.all([
        collectionService.getOpenCases(),
        collectionService.getForwardedCases(),
      ]);
      setOpenCases(open);
      setForwardedCases(forwarded);
    } catch (error) {
      console.error('Error loading cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCaseSelection = (caseId: string) => {
    const newSelected = new Set(selectedCases);
    if (newSelected.has(caseId)) {
      newSelected.delete(caseId);
    } else {
      newSelected.add(caseId);
    }
    setSelectedCases(newSelected);
  };

  const handleExportSelected = async () => {
    if (selectedCases.size === 0) {
      alert('Bitte wählen Sie mindestens einen Fall aus.');
      return;
    }

    alert(
      `Export-Funktion: ${selectedCases.size} Fälle werden exportiert.\n\nImplementierung erfolgt in Edge Function 'export-to-collection-agency'.`
    );
  };

  const renderCaseCard = (collectionCase: CollectionCase, isForwarded: boolean = false) => {
    const isSelected = selectedCases.has(collectionCase.id);
    const completeness = collectionService.getDataCompletenessPercentage(collectionCase);

    return (
      <TouchableOpacity
        key={collectionCase.id}
        style={[styles.caseCard, isSelected && styles.caseCardSelected]}
        onPress={() => !isForwarded && toggleCaseSelection(collectionCase.id)}
        disabled={isForwarded}
      >
        <View style={styles.caseHeader}>
          <View style={styles.caseInfo}>
            <Text style={styles.caseTitle}>
              Fall #{collectionCase.id.slice(0, 8)}
            </Text>
            <Text style={styles.caseAmount}>
              {collectionService.formatAmount(collectionCase.total_amount)}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              completeness === 100 ? styles.badgeSuccess : styles.badgeWarning,
            ]}
          >
            <Text style={styles.badgeText}>{completeness}% Daten</Text>
          </View>
        </View>

        <View style={styles.caseDetails}>
          <Text style={styles.detailLabel}>Hauptforderung:</Text>
          <Text style={styles.detailValue}>
            {collectionService.formatAmount(collectionCase.principal_amount)}
          </Text>
        </View>

        <View style={styles.caseDetails}>
          <Text style={styles.detailLabel}>Mahngebühren:</Text>
          <Text style={styles.detailValue}>
            {collectionService.formatAmount(collectionCase.late_fees)}
          </Text>
        </View>

        <View style={styles.caseDetails}>
          <Text style={styles.detailLabel}>Zinsen:</Text>
          <Text style={styles.detailValue}>
            {collectionService.formatAmount(collectionCase.interest_amount)}
          </Text>
        </View>

        {isForwarded && collectionCase.collection_agency_name && (
          <View style={styles.agencyInfo}>
            <Text style={styles.agencyLabel}>Inkassobüro:</Text>
            <Text style={styles.agencyName}>{collectionCase.collection_agency_name}</Text>
            {collectionCase.collection_reference_number && (
              <Text style={styles.referenceNumber}>
                Aktenzeichen: {collectionCase.collection_reference_number}
              </Text>
            )}
          </View>
        )}

        {collectionCase.missing_data.length > 0 && !isForwarded && (
          <View style={styles.missingData}>
            <AlertCircle size={14} color="#dc2626" />
            <Text style={styles.missingDataText}>
              Fehlende Daten: {collectionCase.missing_data.join(', ')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Lade Inkassofälle...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inkasso-Management</Text>
        <Text style={styles.subtitle}>
          Manuelle Übergabe von Mahnfällen an Inkassobüros
        </Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'open' && styles.tabActive]}
          onPress={() => setActiveTab('open')}
        >
          <Package
            size={20}
            color={activeTab === 'open' ? '#007AFF' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'open' && styles.tabTextActive]}>
            Offene Fälle ({openCases.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'forwarded' && styles.tabActive]}
          onPress={() => setActiveTab('forwarded')}
        >
          <FileCheck
            size={20}
            color={activeTab === 'forwarded' ? '#007AFF' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'forwarded' && styles.tabTextActive]}>
            Übergeben ({forwardedCases.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'open' && selectedCases.size > 0 && (
        <View style={styles.actionBar}>
          <Text style={styles.actionBarText}>
            {selectedCases.size} Fälle ausgewählt
          </Text>
          <TouchableOpacity style={styles.exportButton} onPress={handleExportSelected}>
            <Download size={16} color="#fff" />
            <Text style={styles.exportButtonText}>Export & Übergeben</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === 'open' ? (
          <>
            {openCases.length === 0 ? (
              <View style={styles.emptyState}>
                <Package size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>Keine offenen Inkassofälle</Text>
              </View>
            ) : (
              openCases.map((c) => renderCaseCard(c, false))
            )}
          </>
        ) : (
          <>
            {forwardedCases.length === 0 ? (
              <View style={styles.emptyState}>
                <FileCheck size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>
                  Noch keine Fälle an Inkasso übergeben
                </Text>
              </View>
            ) : (
              forwardedCases.map((c) => renderCaseCard(c, true))
            )}
          </>
        )}
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  actionBarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  caseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  caseCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#eff6ff',
  },
  caseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  caseInfo: {
    flex: 1,
  },
  caseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  caseAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc2626',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeSuccess: {
    backgroundColor: '#d1fae5',
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  caseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  agencyInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  agencyLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  agencyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  referenceNumber: {
    fontSize: 12,
    color: '#666',
  },
  missingData: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#fee2e2',
    gap: 6,
  },
  missingDataText: {
    fontSize: 12,
    color: '#dc2626',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
});
