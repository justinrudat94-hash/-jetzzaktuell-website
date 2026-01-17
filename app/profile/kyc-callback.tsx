import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { useAuth } from '@/utils/authContext';
import { kycService } from '@/services/kycService';
import { Colors } from '@/constants/Colors';

export default function KYCCallbackScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'failed'>('loading');
  const [message, setMessage] = useState('Verifizierungsstatus wird überprüft...');

  useEffect(() => {
    checkVerificationStatus();
  }, [user]);

  const checkVerificationStatus = async () => {
    if (!user) {
      setStatus('failed');
      setMessage('Benutzer nicht angemeldet');
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const kycStatus = await kycService.checkKYCStatus(user.id);

      if (kycStatus?.status === 'verified') {
        setStatus('success');
        setMessage('Ihre Identität wurde erfolgreich verifiziert!');
      } else if (kycStatus?.status === 'pending') {
        setStatus('pending');
        setMessage('Ihre Verifizierung wird bearbeitet. Dies kann einige Minuten dauern.');
      } else if (kycStatus?.status === 'failed') {
        setStatus('failed');
        setMessage('Die Verifizierung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.');
      } else {
        setStatus('pending');
        setMessage('Verifizierung läuft. Bitte warten Sie einen Moment.');
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      setStatus('failed');
      setMessage('Fehler beim Überprüfen des Verifizierungsstatus');
    }
  };

  const handleContinue = () => {
    if (status === 'success') {
      router.replace('/profile/settings');
    } else if (status === 'failed') {
      router.replace('/profile/kyc-verification');
    } else {
      router.replace('/profile/settings');
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle size={80} color={Colors.success} />;
      case 'failed':
        return <XCircle size={80} color={Colors.error} />;
      case 'pending':
        return <AlertCircle size={80} color={Colors.warning} />;
      default:
        return <ActivityIndicator size={80} color={Colors.primary} />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'success':
        return 'Verifizierung erfolgreich!';
      case 'failed':
        return 'Verifizierung fehlgeschlagen';
      case 'pending':
        return 'Verifizierung läuft';
      default:
        return 'Wird überprüft...';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {getIcon()}
        </View>

        <Text style={styles.title}>{getTitle()}</Text>
        <Text style={styles.message}>{message}</Text>

        {status !== 'loading' && (
          <TouchableOpacity
            style={[
              styles.button,
              status === 'success' && styles.buttonSuccess,
              status === 'failed' && styles.buttonError,
            ]}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>
              {status === 'success' ? 'Weiter zum Profil' :
               status === 'failed' ? 'Erneut versuchen' :
               'Zurück zum Profil'}
            </Text>
          </TouchableOpacity>
        )}

        {status === 'loading' && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Bitte warten...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    maxWidth: 500,
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
    lineHeight: 24,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonSuccess: {
    backgroundColor: Colors.success,
  },
  buttonError: {
    backgroundColor: Colors.error,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
});
