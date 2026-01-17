import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { AlertCircle, CheckCircle, XCircle, Shield } from 'lucide-react-native';
import { kycService } from '@/services/kycService';
import { KYCStatus } from '@/types';
import { Colors } from '@/constants/Colors';

interface KYCVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  kycStatus: KYCStatus | null;
  onVerificationStarted?: () => void;
}

export default function KYCVerificationModal({
  visible,
  onClose,
  kycStatus,
  onVerificationStarted,
}: KYCVerificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartVerification = async () => {
    try {
      setLoading(true);
      setError(null);

      const session = await kycService.createVerificationSession();

      if (session && session.verification_url) {
        const supported = await Linking.canOpenURL(session.verification_url);
        if (supported) {
          await Linking.openURL(session.verification_url);
          onVerificationStarted?.();
          onClose();
        } else {
          setError('Konnte den Verifizierungslink nicht öffnen');
        }
      }
    } catch (err: any) {
      console.error('Error starting verification:', err);
      setError(err.message || 'Fehler beim Starten der Verifizierung');
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
        return <Shield size={48} color={Colors.primary} />;
    }
  };

  const getStatusText = () => {
    switch (kycStatus?.status) {
      case 'verified':
        return {
          title: 'Verifizierung abgeschlossen',
          description: 'Ihre Identität wurde erfolgreich verifiziert.',
        };
      case 'failed':
        return {
          title: 'Verifizierung fehlgeschlagen',
          description: 'Die Verifizierung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.',
        };
      case 'pending':
        return {
          title: 'Verifizierung läuft',
          description: 'Ihre Verifizierung wird bearbeitet. Dies kann einige Minuten dauern.',
        };
      default:
        return {
          title: 'Identitätsverifizierung erforderlich',
          description: 'Um fortzufahren, müssen Sie Ihre Identität verifizieren. Dies ist eine einmalige Anforderung.',
        };
    }
  };

  const statusText = getStatusText();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
            <View style={styles.iconContainer}>
              {getStatusIcon()}
            </View>

            <Text style={styles.title}>{statusText.title}</Text>
            <Text style={styles.description}>{statusText.description}</Text>

            {kycStatus?.status !== 'verified' && (
              <>
                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>Warum ist dies erforderlich?</Text>
                  <Text style={styles.infoText}>
                    Gemäß gesetzlichen Vorschriften müssen wir die Identität von Nutzern verifizieren, die:
                  </Text>
                  <Text style={styles.bulletPoint}>• Mehr als €1.000 Lifetime-Einnahmen haben</Text>
                  <Text style={styles.bulletPoint}>• Kostenpflichtige Events erstellen</Text>
                  <Text style={styles.bulletPoint}>• Auszahlungen beantragen</Text>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>Was wird benötigt?</Text>
                  <Text style={styles.bulletPoint}>• Gültiger Personalausweis, Reisepass oder Führerschein</Text>
                  <Text style={styles.bulletPoint}>• Selfie für Identitätsabgleich</Text>
                  <Text style={styles.bulletPoint}>• 5-10 Minuten Zeit</Text>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>Datenschutz</Text>
                  <Text style={styles.infoText}>
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
          </ScrollView>

          <View style={styles.actions}>
            {kycStatus?.status === 'verified' ? (
              <TouchableOpacity
                style={styles.buttonPrimary}
                onPress={onClose}
              >
                <Text style={styles.buttonTextPrimary}>Schließen</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.buttonPrimary, loading && styles.buttonDisabled]}
                  onPress={handleStartVerification}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonTextPrimary}>
                      {kycStatus?.status === 'pending' ? 'Verifizierung fortsetzen' : 'Verifizierung starten'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.buttonSecondary}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={styles.buttonTextSecondary}>Später</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  scrollView: {
    maxHeight: '80%',
  },
  content: {
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
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
  infoBox: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  infoText: {
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
    marginTop: 16,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  actions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
