import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  Calendar,
  User,
  MapPin,
  CreditCard,
} from 'lucide-react-native';
import { useAuth } from '@/utils/authContext';
import { kycService } from '@/services/kycService';
import { KYCStatus } from '@/types';
import { Colors } from '@/constants/Colors';

export default function KYCStatusScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [verificationDetails, setVerificationDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKYCData();
  }, [user]);

  const loadKYCData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [status, details] = await Promise.all([
        kycService.checkKYCStatus(user.id),
        kycService.getVerificationDetails(user.id),
      ]);
      setKycStatus(status);
      setVerificationDetails(details);
    } catch (err) {
      console.error('Error loading KYC data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (kycStatus?.status) {
      case 'verified':
        return <CheckCircle size={48} color={Colors.success} />;
      case 'failed':
        return <XCircle size={48} color={Colors.error} />;
      case 'pending':
        return <AlertCircle size={48} color={Colors.warning} />;
      default:
        return <Shield size={48} color="#ccc" />;
    }
  };

  const getStatusText = () => {
    switch (kycStatus?.status) {
      case 'verified':
        return 'Verifiziert';
      case 'failed':
        return 'Fehlgeschlagen';
      case 'pending':
        return 'In Bearbeitung';
      default:
        return 'Nicht gestartet';
    }
  };

  const getStatusColor = () => {
    switch (kycStatus?.status) {
      case 'verified':
        return Colors.success;
      case 'failed':
        return Colors.error;
      case 'pending':
        return Colors.warning;
      default:
        return '#ccc';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>KYC Status</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Status</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            {getStatusIcon()}
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusLabel}>Verifizierungsstatus</Text>
              <Text style={[styles.statusValue, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
          </View>

          {kycStatus?.verifiedAt && (
            <View style={styles.statusDetail}>
              <Calendar size={20} color="#666" />
              <Text style={styles.statusDetailText}>
                Verifiziert am: {formatDate(kycStatus.verifiedAt)}
              </Text>
            </View>
          )}

          {kycStatus?.lastAttempt && !kycStatus?.verifiedAt && (
            <View style={styles.statusDetail}>
              <Calendar size={20} color="#666" />
              <Text style={styles.statusDetailText}>
                Letzter Versuch: {formatDate(kycStatus.lastAttempt)}
              </Text>
            </View>
          )}
        </View>

        {kycStatus?.status === 'verified' && verificationDetails && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verifizierte Daten</Text>

            {verificationDetails.firstName && verificationDetails.lastName && (
              <View style={styles.detailRow}>
                <User size={20} color="#666" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>
                    {verificationDetails.firstName} {verificationDetails.lastName}
                  </Text>
                </View>
              </View>
            )}

            {verificationDetails.dob && (
              <View style={styles.detailRow}>
                <Calendar size={20} color="#666" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Geburtsdatum</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(verificationDetails.dob)}
                  </Text>
                </View>
              </View>
            )}

            {verificationDetails.address && (
              <View style={styles.detailRow}>
                <MapPin size={20} color="#666" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Adresse</Text>
                  <Text style={styles.detailValue}>
                    {verificationDetails.address.line1}
                    {verificationDetails.address.line2 && `\n${verificationDetails.address.line2}`}
                    {`\n${verificationDetails.address.postal_code} ${verificationDetails.address.city}`}
                    {`\n${verificationDetails.address.country}`}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Finanzinformationen</Text>

          <View style={styles.detailRow}>
            <CreditCard size={20} color="#666" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Lifetime-Einnahmen</Text>
              <Text style={styles.detailValue}>
                €{((kycStatus?.lifetimeEarnings || 0) / 100).toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Shield size={20} color="#666" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>KYC Erforderlich</Text>
              <Text style={styles.detailValue}>
                {kycStatus?.required ? 'Ja' : 'Nein'}
              </Text>
            </View>
          </View>
        </View>

        {kycStatus?.status !== 'verified' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              {kycStatus?.status === 'pending'
                ? 'Ihre Verifizierung wird bearbeitet. Dies kann einige Minuten dauern.'
                : kycStatus?.status === 'failed'
                ? 'Die Verifizierung ist fehlgeschlagen. Bitte versuchen Sie es erneut.'
                : 'Sie haben die Identitätsverifizierung noch nicht gestartet.'}
            </Text>
          </View>
        )}

        {kycStatus?.status !== 'verified' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/profile/kyc-verification')}
          >
            <Text style={styles.actionButtonText}>
              {kycStatus?.status === 'pending'
                ? 'Verifizierung fortsetzen'
                : kycStatus?.status === 'failed'
                ? 'Erneut versuchen'
                : 'Verifizierung starten'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    ...Platform.select({
      web: {
        paddingTop: 12,
      },
      default: {
        paddingTop: 50,
      },
    }),
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statusDetailText: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 22,
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
