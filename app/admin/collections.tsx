import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/utils/authContext';
import { router } from 'expo-router';
import { FileDown, CheckCircle, XCircle, AlertTriangle } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants';

interface CollectionCase {
  id: string;
  user_id: string;
  subscription_id: string;
  status: string;
  principal_amount: number;
  late_fees: number;
  interest_amount: number;
  collection_fees: number;
  total_amount: number;
  data_complete: boolean;
  missing_data: string[];
  collection_agency_name: string | null;
  collection_reference_number: string | null;
  created_at: string;
  profiles: {
    email: string;
    first_name: string;
    last_name: string;
    billing_data_complete: boolean;
  };
}

export default function CollectionsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'open' | 'forwarded'>('open');
  const [openCases, setOpenCases] = useState<CollectionCase[]>([]);
  const [forwardedCases, setForwardedCases] = useState<CollectionCase[]>([]);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [agencyName, setAgencyName] = useState('');
  const [exporting, setExporting] = useState(false);

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

    loadCollectionCases();
  };

  const loadCollectionCases = async () => {
    try {
      setLoading(true);

      // Load open cases
      const { data: openData, error: openError } = await supabase
        .from('collection_cases')
        .select(`
          *,
          profiles!inner(
            email,
            first_name,
            last_name,
            billing_data_complete
          )
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: true });

      if (openError) throw openError;

      // Load forwarded cases
      const { data: forwardedData, error: forwardedError } = await supabase
        .from('collection_cases')
        .select(`
          *,
          profiles!inner(
            email,
            first_name,
            last_name,
            billing_data_complete
          )
        `)
        .eq('status', 'forwarded')
        .order('forwarded_to_collection_at', { ascending: false });

      if (forwardedError) throw forwardedError;

      setOpenCases(openData || []);
      setForwardedCases(forwardedData || []);
    } catch (error) {
      console.error('Error loading collection cases:', error);
      Alert.alert('Fehler', 'Fälle konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const toggleCaseSelection = (caseId: string) => {
    setSelectedCases(prev =>
      prev.includes(caseId)
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    );
  };

  const exportToCollection = async () => {
    if (selectedCases.length === 0) {
      Alert.alert('Keine Auswahl', 'Bitte wählen Sie mindestens einen Fall aus');
      return;
    }

    if (!agencyName.trim()) {
      Alert.alert('Inkassobüro fehlt', 'Bitte geben Sie den Namen des Inkassobüros ein');
      return;
    }

    setExporting(true);

    try {
      // Calculate total amount
      const totalAmount = openCases
        .filter(c => selectedCases.includes(c.id))
        .reduce((sum, c) => sum + c.total_amount, 0);

      // Create export record
      const { data: exportData, error: exportError } = await supabase
        .from('collection_exports')
        .insert({
          case_ids: selectedCases,
          export_file_url: `exports/collection_${Date.now()}.zip`, // Placeholder
          file_name: `Inkasso_Export_${new Date().toISOString().split('T')[0]}.zip`,
          collection_agency_name: agencyName,
          exported_by: user!.id,
          total_cases: selectedCases.length,
          total_amount: totalAmount,
        })
        .select()
        .single();

      if (exportError) throw exportError;

      // Update cases to forwarded status
      const { error: updateError } = await supabase
        .from('collection_cases')
        .update({
          status: 'forwarded',
          forwarded_to_collection_at: new Date().toISOString(),
          collection_agency_name: agencyName,
        })
        .in('id', selectedCases);

      if (updateError) throw updateError;

      Alert.alert(
        'Export erfolgreich',
        `${selectedCases.length} Fälle wurden an ${agencyName} übergeben.\n\nGesamtbetrag: ${(totalAmount / 100).toFixed(2)} €`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedCases([]);
              setAgencyName('');
              loadCollectionCases();
            }
          }
        ]
      );

      // TODO: Generate actual ZIP file with all documents
      // This would call an edge function to generate the export package

    } catch (error) {
      console.error('Error exporting to collection:', error);
      Alert.alert('Fehler', 'Export fehlgeschlagen');
    } finally {
      setExporting(false);
    }
  };

  const formatAmount = (cents: number) => {
    return `${(cents / 100).toFixed(2)} €`;
  };

  const renderCaseCard = (caseItem: CollectionCase, isSelectable: boolean = false) => {
    const isSelected = selectedCases.includes(caseItem.id);

    return (
      <TouchableOpacity
        key={caseItem.id}
        style={[
          styles.caseCard,
          isSelected && styles.caseCardSelected,
          !caseItem.data_complete && styles.caseCardIncomplete,
        ]}
        onPress={() => isSelectable && toggleCaseSelection(caseItem.id)}
        disabled={!isSelectable || !caseItem.data_complete}
      >
        <View style={styles.caseHeader}>
          <View style={styles.caseHeaderLeft}>
            <Text style={styles.caseName}>
              {caseItem.profiles.first_name} {caseItem.profiles.last_name}
            </Text>
            <Text style={styles.caseEmail}>{caseItem.profiles.email}</Text>
          </View>
          <View style={styles.caseHeaderRight}>
            {!caseItem.data_complete && (
              <AlertTriangle size={20} color={Colors.warning} />
            )}
            {isSelected && (
              <CheckCircle size={20} color={Colors.success} />
            )}
          </View>
        </View>

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

        {!caseItem.data_complete && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Unvollständige Daten: {caseItem.missing_data.join(', ')}
            </Text>
          </View>
        )}

        {caseItem.collection_agency_name && (
          <View style={styles.agencyBox}>
            <Text style={styles.agencyLabel}>Inkassobüro:</Text>
            <Text style={styles.agencyName}>{caseItem.collection_agency_name}</Text>
            {caseItem.collection_reference_number && (
              <Text style={styles.agencyRef}>Aktenzeichen: {caseItem.collection_reference_number}</Text>
            )}
          </View>
        )}

        <Text style={styles.caseDate}>
          Erstellt: {new Date(caseItem.created_at).toLocaleDateString('de-DE')}
        </Text>
      </TouchableOpacity>
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
        <Text style={styles.title}>Inkasso-Verwaltung</Text>
        <Text style={styles.subtitle}>
          Verwaltung von Forderungen und Export an Inkassobüros
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'open' && styles.tabActive]}
          onPress={() => setActiveTab('open')}
        >
          <Text style={[styles.tabText, activeTab === 'open' && styles.tabTextActive]}>
            Offene Fälle ({openCases.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'forwarded' && styles.tabActive]}
          onPress={() => setActiveTab('forwarded')}
        >
          <Text style={[styles.tabText, activeTab === 'forwarded' && styles.tabTextActive]}>
            An Inkasso übergeben ({forwardedCases.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'open' ? (
          <>
            {/* Export Section */}
            {openCases.length > 0 && (
              <View style={styles.exportSection}>
                <Text style={styles.exportTitle}>Export an Inkassobüro</Text>
                <TextInput
                  style={styles.agencyInput}
                  placeholder="Name des Inkassobüros"
                  value={agencyName}
                  onChangeText={setAgencyName}
                />
                <TouchableOpacity
                  style={[
                    styles.exportButton,
                    (selectedCases.length === 0 || !agencyName.trim() || exporting) && styles.exportButtonDisabled
                  ]}
                  onPress={exportToCollection}
                  disabled={selectedCases.length === 0 || !agencyName.trim() || exporting}
                >
                  <FileDown size={20} color="#fff" />
                  <Text style={styles.exportButtonText}>
                    {exporting ? 'Exportiere...' : `${selectedCases.length} Fall/Fälle exportieren`}
                  </Text>
                </TouchableOpacity>
                {selectedCases.length > 0 && (
                  <Text style={styles.exportInfo}>
                    Gesamtbetrag: {formatAmount(
                      openCases
                        .filter(c => selectedCases.includes(c.id))
                        .reduce((sum, c) => sum + c.total_amount, 0)
                    )}
                  </Text>
                )}
              </View>
            )}

            {/* Open Cases */}
            {openCases.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Keine offenen Inkasso-Fälle</Text>
              </View>
            ) : (
              <View style={styles.casesList}>
                {openCases.map(caseItem => renderCaseCard(caseItem, true))}
              </View>
            )}
          </>
        ) : (
          <>
            {/* Forwarded Cases */}
            {forwardedCases.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Keine an Inkasso übergebenen Fälle</Text>
              </View>
            ) : (
              <View style={styles.casesList}>
                {forwardedCases.map(caseItem => renderCaseCard(caseItem, false))}
              </View>
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    padding: Spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  exportSection: {
    backgroundColor: '#fff',
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  agencyInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    fontSize: 14,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: 8,
    gap: Spacing.sm,
  },
  exportButtonDisabled: {
    backgroundColor: '#ccc',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  exportInfo: {
    marginTop: Spacing.sm,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  casesList: {
    padding: Spacing.md,
  },
  caseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  caseCardSelected: {
    borderColor: Colors.primary,
  },
  caseCardIncomplete: {
    borderColor: Colors.warning,
    opacity: 0.7,
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
  caseHeaderRight: {
    marginLeft: Spacing.sm,
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
  warningBox: {
    backgroundColor: '#fff3cd',
    padding: Spacing.sm,
    borderRadius: 6,
    marginBottom: Spacing.sm,
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
  },
  agencyBox: {
    backgroundColor: '#e8f5e9',
    padding: Spacing.sm,
    borderRadius: 6,
    marginBottom: Spacing.sm,
  },
  agencyLabel: {
    fontSize: 12,
    color: '#2e7d32',
    marginBottom: 2,
  },
  agencyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1b5e20',
  },
  agencyRef: {
    fontSize: 12,
    color: '#2e7d32',
    marginTop: 4,
  },
  caseDate: {
    fontSize: 12,
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
