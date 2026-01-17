import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { AlertCircle, X } from 'lucide-react-native';
import { kycService } from '@/services/kycService';
import { KYCStatus } from '@/types';
import { Colors } from '@/constants/Colors';
import KYCVerificationModal from './KYCVerificationModal';
import { useAuth } from '@/utils/authContext';

interface KYCRequiredBannerProps {
  onDismiss?: () => void;
}

export default function KYCRequiredBanner({ onDismiss }: KYCRequiredBannerProps) {
  const { user } = useAuth();
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [visible, setVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const loadKYCStatus = useCallback(async () => {
    if (!user) return;

    try {
      const status = await kycService.checkKYCStatus(user.id);
      setKycStatus(status);

      if (status && kycService.shouldShowKYCBanner(status) && !dismissed) {
        setVisible(true);
      }
    } catch (error) {
      console.error('Error loading KYC status:', error);
    }
  }, [user, dismissed]);

  useEffect(() => {
    loadKYCStatus();
  }, [loadKYCStatus]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    onDismiss?.();
  };

  const handleVerify = () => {
    setModalVisible(true);
  };

  const getDaysRemaining = (): number | null => {
    if (!kycStatus?.lastAttempt) return 7;

    const lastAttemptDate = new Date(kycStatus.lastAttempt);
    const daysSinceAttempt = (Date.now() - lastAttemptDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysRemaining = Math.max(0, 7 - Math.floor(daysSinceAttempt));

    return daysRemaining;
  };

  const getBannerText = () => {
    const daysRemaining = getDaysRemaining();

    if (kycStatus?.status === 'failed') {
      return {
        title: 'Verifizierung fehlgeschlagen',
        message: 'Bitte versuchen Sie die Identitätsverifizierung erneut.',
        urgency: 'high',
      };
    }

    if (kycStatus?.status === 'pending') {
      return {
        title: 'Verifizierung läuft',
        message: 'Ihre Identitätsverifizierung wird bearbeitet.',
        urgency: 'medium',
      };
    }

    if (daysRemaining !== null && daysRemaining <= 2) {
      return {
        title: 'Dringend: Verifizierung erforderlich',
        message: `Noch ${daysRemaining} Tag${daysRemaining === 1 ? '' : 'e'} bis zur Kontosperrung.`,
        urgency: 'high',
      };
    }

    return {
      title: 'Identitätsverifizierung erforderlich',
      message: 'Bitte verifizieren Sie Ihre Identität innerhalb von 7 Tagen.',
      urgency: 'medium',
    };
  };

  if (!visible || !kycStatus || kycStatus.status === 'verified') {
    return null;
  }

  const bannerContent = getBannerText();
  const isHighUrgency = bannerContent.urgency === 'high';

  return (
    <>
      <View style={[styles.banner, isHighUrgency && styles.bannerUrgent]}>
        <View style={styles.iconContainer}>
          <AlertCircle
            size={24}
            color={isHighUrgency ? Colors.error : Colors.warning}
          />
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, isHighUrgency && styles.titleUrgent]}>
            {bannerContent.title}
          </Text>
          <Text style={styles.message}>
            {bannerContent.message}
          </Text>

          <TouchableOpacity
            style={[styles.button, isHighUrgency && styles.buttonUrgent]}
            onPress={handleVerify}
          >
            <Text style={styles.buttonText}>
              {kycStatus.status === 'pending' ? 'Status prüfen' : 'Jetzt verifizieren'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleDismiss}
        >
          <X size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <KYCVerificationModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          loadKYCStatus();
        }}
        kycStatus={kycStatus}
        onVerificationStarted={() => {
          loadKYCStatus();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fff8e1',
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  bannerUrgent: {
    backgroundColor: '#ffebee',
    borderLeftColor: Colors.error,
  },
  iconContainer: {
    paddingTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  titleUrgent: {
    color: Colors.error,
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  button: {
    backgroundColor: Colors.warning,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  buttonUrgent: {
    backgroundColor: Colors.error,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
});
