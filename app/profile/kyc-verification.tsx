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
import { Shield, CheckCircle, XCircle, AlertCircle, ChevronLeft } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/utils/authContext';
import { kycService } from '@/services/kycService';
import { KYCStatus } from '@/types';
import { Colors } from '@/constants/Colors';

export default function KYCVerificationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingVerification, setStartingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadKYCStatus();
  }, [user]);

  const loadKYCStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const status = await kycService.checkKYCStatus(user.id);
      setKycStatus(status);
    } catch (err) {
      console.error('Error loading KYC status:', err);
      setError('Fehler beim Laden des Status');
    } finally {
      setLoading(false);
    }
  };

  const handleStartVerification = async () => {
    try {
      setStartingVerification(true);
      setError(null);

      const session = await kycService.createVerificationSession();

      if (session && session.verification_url) {
        await WebBrowser.openBrowserAsync(session.verification_url);
        await loadKYCStatus();
      }
    } catch (err: any) {
      console.error('Error starting verification:', err);
      setError(err.message || 'Fehler beim Starten der Verifizierung');
    } finally {
      setStartingVerification(false);
    }
  };

  const getStatusIcon = () => {
    switch (kycStatus?.status) {
      case 'verified':
        return <CheckCircle size={64} color={Colors.success} />;
      case 'failed':
        return <XCircle size={64} color={Colors.error} />;
      case 'pending':
        return <AlertCircle size={64} color={Colors.warning} />;
      default:
        return <Shield size={64} color={Colors.primary} />;
    }
  };

  const getStatusText = () => {
    switch (kycStatus?.status) {
      case 'verified':
        return {
          title: 'Verifizierung abgeschlossen',
          description: 'Ihre Identität wurde erfolgreich verifiziert.',
          action: null,
        };
      case 'failed':
        return {
          title: 'Verifizierung fehlgeschlagen',
          description: 'Die Verifizierung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.',
          action: 'Erneut versuchen',
        };
      case 'pending':
        return {
          title: 'Verifizierung läuft',
          description: 'Ihre Verifizierung wird bearbeitet. Dies kann einige Minuten dauern.',
          action: 'Status aktualisieren',
        };
      default:
        return {
          title: 'Identitätsverifizierung',
          description: 'Verifizieren Sie Ihre Identität, um fortzufahren.',
          action: 'Verifizierung starten',
        };
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>KYC Verifizierung</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  const statusText = getStatusText();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Verifizierung</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.iconContainer}>
          {getStatusIcon()}
        </View>

        <Text style={styles.title}>{statusText.title}</Text>
        <Text style={styles.description}>{statusText.description}</Text>

        {kycStatus?.lifetimeEarnings !== undefined && (
          <View style={styles.earningsBox}>
            <Text style={styles.earningsLabel}>Lifetime-Einnahmen:</Text>
            <Text style={styles.earningsValue}>
              €{(kycStatus.lifetimeEarnings / 100).toFixed(2)}
            </Text>
          </View>
        )}

        {kycStatus?.status !== 'verified' && (
          <>
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Warum ist dies erforderlich?</Text>
              <Text style={styles.sectionText}>
                Gemäß gesetzlichen Vorschriften müssen wir die Identität von Nutzern verifizieren, die:
              </Text>
              <Text style={styles.bulletPoint}>• Mehr als €1.000 Lifetime-Einnahmen haben</Text>
              <Text style={styles.bulletPoint}>• Kostenpflichtige Events erstellen</Text>
              <Text style={styles.bulletPoint}>• Auszahlungen beantragen</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Was wird benötigt?</Text>
              <Text style={styles.bulletPoint}>• Gültiger Personalausweis, Reisepass oder Führerschein</Text>
              <Text style={styles.bulletPoint}>• Selfie für Identitätsabgleich</Text>
              <Text style={styles.bulletPoint}>• 5-10 Minuten Zeit</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Datenschutz</Text>
              <Text style={styles.sectionText}>
                Ihre Daten werden sicher über Stripe Identity verarbeitet und nur für die Verifizierung verwendet.
              </Text>
            </View>
          </>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {statusText.action && (
          <TouchableOpacity
            style={[styles.actionButton, startingVerification && styles.buttonDisabled]}
            onPress={kycStatus?.status === 'pending' ? loadKYCStatus : handleStartVerification}
            disabled={startingVerification}
          >
            {startingVerification ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>{statusText.action}</Text>
            )}
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
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
    lineHeight: 24,
  },
  earningsBox: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 16,
    color: '#666',
  },
  earningsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 8,
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
