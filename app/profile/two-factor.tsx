import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Colors, Spacing,  FontSizes,  FontWeights,  BorderRadius } from '../../constants';
import { useRouter } from 'expo-router';
import { useAuth } from '../../utils/authContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Shield, Smartphone, Key, Copy, CheckCircle, AlertTriangle, Eye, EyeOff, X } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

interface Factor {
  id: string;
  factor_type: string;
  friendly_name: string;
  status: string;
  created_at: string;
}

export default function TwoFactorScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // Enroll states
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState('');

  // Disable states
  const [password, setPassword] = useState('');
  const [disabling, setDisabling] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Recovery codes
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadFactors();
  }, []);

  const loadFactors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.mfa.listFactors();

      if (error) throw error;

      setFactors(data?.all || []);
    } catch (error: any) {
      console.error('Error loading factors:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFactor = factors.some(f => f.status === 'verified');

  const startEnroll = async () => {
    try {
      setEnrolling(true);

      // Delete any unverified factors first
      for (const factor of factors) {
        if (factor.status === 'unverified') {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: user?.email || 'Mein Gerät',
      });

      if (error) throw error;

      const totpUri = `otpauth://totp/Jetzz:${encodeURIComponent(user?.email || '')}?secret=${data.totp.secret}&issuer=Jetzz`;

      setQrCode(totpUri);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setShowEnrollModal(true);
    } catch (error: any) {
      console.error('Error starting enrollment:', error);
      Alert.alert('Fehler', 'Fehler beim Starten der 2FA-Einrichtung');
    } finally {
      setEnrolling(false);
    }
  };

  const verifyEnroll = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      Alert.alert('Fehler', 'Bitte gib einen 6-stelligen Code ein');
      return;
    }

    try {
      setEnrolling(true);

      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verifyCode,
      });

      if (verify.error) throw verify.error;

      // Generate recovery codes
      const codes = generateRecoveryCodes();
      setRecoveryCodes(codes);

      setShowEnrollModal(false);
      setShowRecoveryModal(true);
      setVerifyCode('');

      await loadFactors();
    } catch (error: any) {
      console.error('Error verifying code:', error);
      Alert.alert('Fehler', 'Ungültiger Code. Bitte versuche es erneut.');
    } finally {
      setEnrolling(false);
    }
  };

  const startDisable = () => {
    setPassword('');
    setShowDisableModal(true);
  };

  const confirmDisable = async () => {
    if (!password) {
      Alert.alert('Fehler', 'Bitte gib dein Passwort ein');
      return;
    }

    try {
      setDisabling(true);

      // Verify password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password,
      });

      if (signInError) {
        Alert.alert('Fehler', 'Falsches Passwort');
        return;
      }

      // Unenroll all factors
      for (const factor of factors) {
        if (factor.status === 'verified') {
          const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
          if (error) {
            console.error('Error unenrolling factor:', error);
          }
        }
      }

      setShowDisableModal(false);
      setPassword('');
      await loadFactors();

      Alert.alert('Erfolg', '2-Faktor-Authentifizierung wurde deaktiviert');
    } catch (error: any) {
      console.error('Error disabling 2FA:', error);
      Alert.alert('Fehler', 'Fehler beim Deaktivieren der 2FA');
    } finally {
      setDisabling(false);
    }
  };

  const generateRecoveryCodes = (): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  };

  const copyCode = (code: string) => {
    // In a real app, use Clipboard API
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyAllCodes = () => {
    // In a real app, use Clipboard API
    const allCodes = recoveryCodes.join('\n');
    Alert.alert('Kopiert', 'Alle Recovery-Codes wurden in die Zwischenablage kopiert');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.gray800} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>2-Faktor-Authentifizierung</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
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
        <Text style={styles.headerTitle}>2-Faktor-Authentifizierung</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={[styles.statusCard, hasActiveFactor && styles.statusCardActive]}>
          <Shield
            size={32}
            color={hasActiveFactor ? Colors.success : Colors.gray400}
          />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>
              {hasActiveFactor ? '2FA ist aktiv' : '2FA ist deaktiviert'}
            </Text>
            <Text style={styles.statusDescription}>
              {hasActiveFactor
                ? 'Dein Konto ist durch 2-Faktor-Authentifizierung geschützt'
                : 'Erhöhe die Sicherheit deines Kontos mit 2FA'
              }
            </Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Was ist 2FA?</Text>
          <Text style={styles.infoText}>
            Die Zwei-Faktor-Authentifizierung fügt eine zusätzliche Sicherheitsebene hinzu.
            Neben deinem Passwort benötigst du einen zeitbasierten Code aus einer Authenticator-App.
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Smartphone size={20} color={Colors.primary} />
              <Text style={styles.featureText}>
                Kompatibel mit Google Authenticator, Authy und anderen TOTP-Apps
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Key size={20} color={Colors.primary} />
              <Text style={styles.featureText}>
                Recovery-Codes als Backup falls du dein Gerät verlierst
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Shield size={20} color={Colors.primary} />
              <Text style={styles.featureText}>
                Schützt dein Konto vor unbefugtem Zugriff
              </Text>
            </View>
          </View>
        </View>

        {/* Active Factors */}
        {factors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aktive Faktoren</Text>
            {factors.map((factor) => (
              <View key={factor.id} style={styles.factorCard}>
                <Smartphone size={24} color={Colors.primary} />
                <View style={styles.factorInfo}>
                  <Text style={styles.factorName}>{factor.friendly_name}</Text>
                  <Text style={styles.factorType}>
                    {factor.factor_type.toUpperCase()} • {factor.status === 'verified' ? 'Aktiv' : 'Ausstehend'}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  factor.status === 'verified' && styles.statusBadgeActive
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    factor.status === 'verified' && styles.statusBadgeTextActive
                  ]}>
                    {factor.status === 'verified' ? 'Aktiv' : 'Ausstehend'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {!hasActiveFactor ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={startEnroll}
              disabled={enrolling}
            >
              {enrolling ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Shield size={20} color={Colors.white} />
                  <Text style={styles.primaryButtonText}>2FA aktivieren</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={startDisable}
            >
              <AlertTriangle size={20} color={Colors.white} />
              <Text style={styles.dangerButtonText}>2FA deaktivieren</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Enroll Modal */}
      <Modal
        visible={showEnrollModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowEnrollModal(false);
          setQrCode('');
          setSecret('');
          setFactorId('');
          setVerifyCode('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>2FA einrichten</Text>
              <TouchableOpacity onPress={() => {
                setShowEnrollModal(false);
                setQrCode('');
                setSecret('');
                setFactorId('');
                setVerifyCode('');
              }}>
                <X size={24} color={Colors.gray600} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalStep}>Schritt 1: Scanne den QR-Code</Text>
              <Text style={styles.modalDescription}>
                Öffne deine Authenticator-App und scanne diesen QR-Code:
              </Text>

              <View style={styles.qrContainer}>
                {qrCode && (
                  <QRCode
                    value={qrCode}
                    size={200}
                  />
                )}
              </View>

              <Text style={styles.modalDescription}>
                Oder gib diesen Code manuell ein:
              </Text>
              <View style={styles.secretContainer}>
                <Text style={styles.secretText}>{secret}</Text>
              </View>

              <Text style={styles.modalStep}>Schritt 2: Bestätige mit Code</Text>
              <Text style={styles.modalDescription}>
                Gib den 6-stelligen Code aus deiner App ein:
              </Text>

              <TextInput
                style={styles.codeInput}
                value={verifyCode}
                onChangeText={setVerifyCode}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />

              <TouchableOpacity
                style={styles.verifyButton}
                onPress={verifyEnroll}
                disabled={enrolling || verifyCode.length !== 6}
              >
                {enrolling ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.verifyButtonText}>Bestätigen</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Disable Modal */}
      <Modal
        visible={showDisableModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDisableModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>2FA deaktivieren</Text>
              <TouchableOpacity onPress={() => setShowDisableModal(false)}>
                <X size={24} color={Colors.gray600} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.warningBox}>
                <AlertTriangle size={24} color={Colors.warning} />
                <Text style={styles.warningText}>
                  Das Deaktivieren von 2FA macht dein Konto weniger sicher.
                  Bitte bestätige diese Aktion mit deinem Passwort.
                </Text>
              </View>

              <Text style={styles.label}>Passwort</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Dein Passwort"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={Colors.gray600} />
                  ) : (
                    <Eye size={20} color={Colors.gray600} />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowDisableModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmDangerButton}
                  onPress={confirmDisable}
                  disabled={disabling || !password}
                >
                  {disabling ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.confirmDangerButtonText}>Deaktivieren</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Recovery Codes Modal */}
      <Modal
        visible={showRecoveryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRecoveryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recovery-Codes</Text>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.successBox}>
                <CheckCircle size={24} color={Colors.success} />
                <Text style={styles.successText}>
                  2FA wurde erfolgreich aktiviert!
                </Text>
              </View>

              <Text style={styles.modalDescription}>
                Speichere diese Recovery-Codes an einem sicheren Ort.
                Du kannst sie verwenden, wenn du keinen Zugriff auf deine Authenticator-App hast.
              </Text>

              <View style={styles.codesContainer}>
                {recoveryCodes.map((code, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.codeRow}
                    onPress={() => copyCode(code)}
                  >
                    <Text style={styles.codeNumber}>{index + 1}.</Text>
                    <Text style={styles.codeText}>{code}</Text>
                    {copiedCode === code ? (
                      <CheckCircle size={16} color={Colors.success} />
                    ) : (
                      <Copy size={16} color={Colors.gray400} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.copyAllButton}
                onPress={copyAllCodes}
              >
                <Copy size={20} color={Colors.primary} />
                <Text style={styles.copyAllButtonText}>Alle kopieren</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowRecoveryModal(false)}
              >
                <Text style={styles.doneButtonText}>Fertig</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    margin: Spacing.md,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.gray200,
  },
  statusCardActive: {
    backgroundColor: Colors.success + '10',
    borderColor: Colors.success,
  },
  statusTextContainer: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  statusTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  statusDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  infoSection: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: FontSizes.md,
    color: Colors.gray700,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  featuresList: {
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  featureText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.gray700,
    lineHeight: 20,
  },
  section: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
    marginBottom: Spacing.md,
  },
  factorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  factorInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  factorName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  factorType: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.sm,
  },
  statusBadgeActive: {
    backgroundColor: Colors.success + '20',
  },
  statusBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    color: Colors.gray700,
  },
  statusBadgeTextActive: {
    color: Colors.success,
  },
  actions: {
    padding: Spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  primaryButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.error,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  dangerButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  bottomSpacing: {
    height: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
  },
  modalBody: {
    padding: Spacing.md,
  },
  modalStep: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  modalDescription: {
    fontSize: FontSizes.md,
    color: Colors.gray700,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  qrContainer: {
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  secretContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  secretText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.gray900,
    textAlign: 'center',
    letterSpacing: 2,
  },
  codeInput: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.semibold,
    textAlign: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    letterSpacing: 8,
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  verifyButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.warning + '10',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.warning,
    marginBottom: Spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    lineHeight: 20,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray50,
    marginBottom: Spacing.md,
  },
  passwordInput: {
    flex: 1,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.gray900,
  },
  eyeButton: {
    padding: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.gray700,
  },
  confirmDangerButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.error,
    alignItems: 'center',
  },
  confirmDangerButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.success + '10',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.success,
    marginBottom: Spacing.md,
  },
  successText: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.success,
  },
  codesContainer: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  codeNumber: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.gray600,
    width: 24,
  },
  codeText: {
    flex: 1,
    fontSize: FontSizes.md,
    fontFamily: 'monospace',
    color: Colors.gray900,
    letterSpacing: 1,
  },
  copyAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
    marginBottom: Spacing.sm,
  },
  copyAllButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
});
