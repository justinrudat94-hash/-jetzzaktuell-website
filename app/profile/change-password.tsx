import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Colors, Spacing,  FontSizes,  FontWeights,  BorderRadius } from '../../constants';
import { useRouter } from 'expo-router';
import { useAuth } from '../../utils/authContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react-native';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { updatePassword, user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'Aktuelles Passwort ist erforderlich';
    }

    if (!password) {
      newErrors.password = 'Neues Passwort ist erforderlich';
    } else if (password.length < 8) {
      newErrors.password = 'Passwort muss mindestens 8 Zeichen lang sein';
    }

    if (password === currentPassword) {
      newErrors.password = 'Neues Passwort muss sich vom alten unterscheiden';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwörter stimmen nicht überein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validate()) return;

    if (!user?.email) {
      setErrors({ general: 'Benutzer nicht gefunden' });
      return;
    }

    console.log('Verifying current password...');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        console.error('Current password verification failed:', signInError);
        setLoading(false);
        setErrors({ currentPassword: 'Aktuelles Passwort ist falsch' });
        return;
      }

      console.log('Current password verified, updating to new password...');
      const { error: updateError } = await updatePassword(password);

      setLoading(false);

      if (updateError) {
        console.error('Password update error:', updateError);
        setErrors({ general: 'Passwort konnte nicht geändert werden. Bitte versuche es erneut.' });
      } else {
        console.log('Password changed successfully');
        setSuccess(true);
        setTimeout(() => {
          router.back();
        }, 2000);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setLoading(false);
      setErrors({ general: 'Ein unerwarteter Fehler ist aufgetreten' });
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.iconCircle}>
            <CheckCircle size={48} color={Colors.success} />
          </View>

          <Text style={styles.successTitle}>Passwort geändert!</Text>
          <Text style={styles.successDescription}>
            Dein Passwort wurde erfolgreich geändert.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Passwort ändern</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Passwort ändern</Text>
        <Text style={styles.description}>
          Aus Sicherheitsgründen musst du zuerst dein aktuelles Passwort eingeben. Dein neues Passwort sollte mindestens 8 Zeichen lang sein.
        </Text>

        {errors.general && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errors.general}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Aktuelles Passwort</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.currentPassword && styles.inputError]}
                placeholder="Dein aktuelles Passwort"
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  setErrors(prev => ({ ...prev, currentPassword: '', general: '' }));
                }}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
                autoFocus
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff size={20} color={Colors.gray600} />
                ) : (
                  <Eye size={20} color={Colors.gray600} />
                )}
              </TouchableOpacity>
            </View>
            {errors.currentPassword && <Text style={styles.errorText}>{errors.currentPassword}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Neues Passwort</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                placeholder="Mindestens 8 Zeichen"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrors(prev => ({ ...prev, password: '', general: '' }));
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={20} color={Colors.gray600} />
                ) : (
                  <Eye size={20} color={Colors.gray600} />
                )}
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            <View style={styles.passwordRequirements}>
              <Text style={[
                styles.requirementText,
                password.length >= 8 && styles.requirementMet
              ]}>
                {password.length >= 8 ? '✓' : '○'} Mindestens 8 Zeichen
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Passwort bestätigen</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.confirmPassword && styles.inputError]}
                placeholder="Passwort wiederholen"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setErrors(prev => ({ ...prev, confirmPassword: '', general: '' }));
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color={Colors.gray600} />
                ) : (
                  <Eye size={20} color={Colors.gray600} />
                )}
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>
                Passwort speichern
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
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
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
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
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  errorBanner: {
    backgroundColor: Colors.errorLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  errorBannerText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    textAlign: 'center',
  },
  form: {
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gray800,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSizes.md,
    color: Colors.gray800,
    backgroundColor: Colors.white,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: FontSizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  passwordRequirements: {
    marginTop: Spacing.sm,
  },
  requirementText: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
  },
  requirementMet: {
    color: Colors.success,
    fontWeight: FontWeights.semibold,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  successTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.gray800,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 24,
  },
});
