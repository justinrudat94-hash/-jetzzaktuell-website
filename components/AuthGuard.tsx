import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../utils/authContext';
import { Colors } from '../constants';
import { Spacing } from '../constants';
import { Lock, X } from 'lucide-react-native';

interface AuthGuardProps {
  children: React.ReactNode;
  action: 'create' | 'participate' | 'like' | 'stream' | 'comment';
  onAuthenticated?: () => void;
}

const ACTION_MESSAGES = {
  create: {
    title: 'Event erstellen',
    description: 'Um Events zu erstellen, musst du registriert sein.',
  },
  participate: {
    title: 'An Event teilnehmen',
    description: 'Um an Events teilzunehmen, musst du registriert sein.',
  },
  like: {
    title: 'Event liken',
    description: 'Um Events zu liken, musst du registriert sein.',
  },
  stream: {
    title: 'Live-Stream ansehen',
    description: 'Um Live-Streams anzusehen, musst du registriert sein.',
  },
  comment: {
    title: 'Kommentieren',
    description: 'Um zu kommentieren, musst du registriert sein.',
  },
};

export function AuthGuard({ children, action, onAuthenticated }: AuthGuardProps) {
  const { user, isGuest } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = React.useState(false);

  const handlePress = () => {
    if (user && !isGuest) {
      onAuthenticated?.();
    } else {
      setShowModal(true);
    }
  };

  const handleRegister = () => {
    setShowModal(false);
    router.push('/auth/register');
  };

  const handleLogin = () => {
    setShowModal(false);
    router.push('/auth/login');
  };

  return (
    <>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowModal(false)}
                >
                  <X size={24} color={Colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.iconContainer}>
                  <Lock size={48} color={Colors.primary} />
                </View>

                <Text style={styles.modalTitle}>
                  {ACTION_MESSAGES[action].title}
                </Text>

                <Text style={styles.modalDescription}>
                  {ACTION_MESSAGES[action].description}
                </Text>

                <View style={styles.benefits}>
                  <Text style={styles.benefitsTitle}>
                    Mit einem Account kannst du:
                  </Text>
                  <Text style={styles.benefitItem}>✓ Events erstellen</Text>
                  <Text style={styles.benefitItem}>✓ An Events teilnehmen</Text>
                  <Text style={styles.benefitItem}>✓ Events liken & teilen</Text>
                  <Text style={styles.benefitItem}>✓ Live-Streams ansehen</Text>
                  <Text style={styles.benefitItem}>✓ Mit anderen connecten</Text>
                </View>

                <TouchableOpacity
                  style={styles.registerButton}
                  onPress={handleRegister}
                >
                  <Text style={styles.registerButtonText}>
                    Jetzt kostenlos registrieren
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleLogin}
                >
                  <Text style={styles.loginButtonText}>
                    Ich habe bereits einen Account
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.sm,
    zIndex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  benefits: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.xl,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  benefitItem: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  registerButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    paddingVertical: Spacing.md,
  },
  loginButtonText: {
    color: Colors.primary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
