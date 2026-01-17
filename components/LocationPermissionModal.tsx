import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { MapPin, X, Settings } from 'lucide-react-native';

interface LocationPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onRequestPermission: () => void;
  onOpenSettings?: () => void;
}

export default function LocationPermissionModal({
  visible,
  onClose,
  onRequestPermission,
  onOpenSettings,
}: LocationPermissionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <MapPin size={48} color="#8B5CF6" />
            </View>

            <Text style={styles.title}>Standort aktivieren</Text>
            <Text style={styles.description}>
              Um Events in deiner Nähe zu finden und dir die besten Empfehlungen zu geben, 
              benötigen wir Zugriff auf deinen Standort.
            </Text>

            <View style={styles.benefits}>
              <View style={styles.benefit}>
                <Text style={styles.benefitIcon}>📍</Text>
                <Text style={styles.benefitText}>Events in deiner Nähe finden</Text>
              </View>
              <View style={styles.benefit}>
                <Text style={styles.benefitIcon}>🎯</Text>
                <Text style={styles.benefitText}>Personalisierte Empfehlungen</Text>
              </View>
              <View style={styles.benefit}>
                <Text style={styles.benefitIcon}>🗺️</Text>
                <Text style={styles.benefitText}>Navigation zu Events</Text>
              </View>
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onRequestPermission}
              >
                <Text style={styles.primaryButtonText}>Standort aktivieren</Text>
              </TouchableOpacity>

              {onOpenSettings && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onOpenSettings}
                >
                  <Settings size={20} color="#8B5CF6" />
                  <Text style={styles.secondaryButtonText}>Einstellungen öffnen</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.skipButton}
                onPress={onClose}
              >
                <Text style={styles.skipButtonText}>Später</Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  benefits: {
    width: '100%',
    marginBottom: 32,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
  },
  benefitText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});