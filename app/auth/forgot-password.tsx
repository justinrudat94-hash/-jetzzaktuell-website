import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, Spacing } from '../../constants';
import { useRouter } from 'expo-router';
import { useAuth } from '../../utils/authContext';
import { X, Mail } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!email.trim()) {
      setError('E-Mail ist erforderlich');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Ungültige E-Mail-Adresse');
      return false;
    }
    setError('');
    return true;
  };

  const handleResetPassword = async () => {
    if (!validate()) return;

    setLoading(true);
    const { error: resetError } = await resetPassword(email);
    setLoading(false);

    if (resetError) {
      Alert.alert('Fehler', 'Es gab ein Problem beim Senden der E-Mail. Bitte versuche es erneut.');
    } else {
      setEmailSent(true);
    }
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Passwort zurücksetzen</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <View style={styles.successContainer}>
            <View style={styles.iconCircle}>
              <Mail size={48} color={Colors.primary} />
            </View>

            <Text style={styles.successTitle}>E-Mail versendet! 📧</Text>
            <Text style={styles.successDescription}>
              Wir haben dir einen Link zum Zurücksetzen deines Passworts an{' '}
              <Text style={styles.emailText}>{email}</Text> gesendet.
            </Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Was jetzt?</Text>
              <Text style={styles.infoText}>
                1. Öffne dein E-Mail-Postfach{'\n'}
                2. Klicke auf den Link in der E-Mail{'\n'}
                3. Setze dein neues Passwort
              </Text>
            </View>

            <Text style={styles.helperText}>
              Keine E-Mail erhalten? Überprüfe deinen Spam-Ordner oder{' '}
              <Text
                style={styles.link}
                onPress={() => setEmailSent(false)}
              >
                versuche es erneut
              </Text>
            </Text>

            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={() => router.push('/auth/login')}
            >
              <Text style={styles.backToLoginText}>
                Zurück zur Anmeldung
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Passwort zurücksetzen</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Passwort vergessen?</Text>
        <Text style={styles.description}>
          Kein Problem! Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.
        </Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-Mail</Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              placeholder="deine@email.de"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                Reset-Link senden
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => router.back()}
        >
          <Text style={styles.backLinkText}>
            Zurück zur Anmeldung
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxl,
    lineHeight: 24,
  },
  form: {
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backLink: {
    alignItems: 'center',
  },
  backLinkText: {
    fontSize: 14,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  emailText: {
    fontWeight: '600',
    color: Colors.primary,
  },
  infoBox: {
    backgroundColor: '#F5F5F5',
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.xl,
    width: '100%',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  helperText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  link: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  backToLoginButton: {
    paddingVertical: Spacing.md,
  },
  backToLoginText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
});
