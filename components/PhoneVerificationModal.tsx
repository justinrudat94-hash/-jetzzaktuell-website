import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants';
import { Spacing } from '../constants';

interface PhoneVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onVerified: () => void;
  userId: string;
}

export function PhoneVerificationModal({
  visible,
  onClose,
  onVerified,
  userId,
}: PhoneVerificationModalProps) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      return '+49' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('49')) {
      return '+49' + cleaned;
    }
    return '+' + cleaned;
  };

  const sendVerificationCode = async () => {
    setError(null);
    setLoading(true);

    try {
      // SMS verification is currently disabled
      throw new Error('SMS-Verifizierung ist derzeit nicht verfügbar. Diese Funktion wird in Kürze wieder aktiviert.');
    } catch (err) {
      console.error('Error sending SMS:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Senden der SMS');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError(null);
    setLoading(true);

    try {
      if (verificationCode.length !== 6) {
        throw new Error('Bitte gib den 6-stelligen Code ein');
      }

      const formattedPhone = formatPhoneNumber(phoneNumber);

      const { data, error: rpcError } = await supabase.rpc('verify_phone_code', {
        p_user_id: userId,
        p_phone_number: formattedPhone,
        p_code: verificationCode,
      });

      if (rpcError) throw rpcError;

      if (data?.success) {
        onVerified();
        onClose();
      } else {
        throw new Error(data?.error || 'Ungültiger Code');
      }
    } catch (err) {
      console.error('Error verifying code:', err);
      setError(err instanceof Error ? err.message : 'Ungültiger Code');
      setVerificationCode('');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setVerificationCode('');
    await sendVerificationCode();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.modalContent}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.title}>
            {step === 'phone' ? 'Telefonnummer verifizieren' : 'Code eingeben'}
          </Text>

          {step === 'phone' ? (
            <>
              <Text style={styles.description}>
                Gib deine Handynummer ein. Du erhältst einen 6-stelligen Code per SMS.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="+49 123 456 7890"
                placeholderTextColor={Colors.textSecondary}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoFocus
                editable={!loading}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={sendVerificationCode}
                disabled={loading || !phoneNumber}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.buttonText}>Code senden</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.description}>
                Gib den 6-stelligen Code ein, den wir an {phoneNumber} gesendet haben.
              </Text>

              <TextInput
                style={styles.codeInput}
                placeholder="000000"
                placeholderTextColor={Colors.textSecondary}
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                editable={!loading}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              {remainingAttempts !== null && (
                <Text style={styles.attemptsText}>
                  {remainingAttempts} Versuche übrig
                </Text>
              )}

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={verifyCode}
                disabled={loading || verificationCode.length !== 6}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.buttonText}>Verifizieren</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={resendCode}
                disabled={countdown > 0 || loading}
              >
                <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
                  {countdown > 0
                    ? `Code erneut senden in ${countdown}s`
                    : 'Code erneut senden'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep('phone')}>
                <Text style={styles.changeNumberText}>Nummer ändern</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Abbrechen</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: Spacing.md,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    textAlign: 'center',
    lineHeight: 22,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.sm,
    padding: Spacing.md,
    fontSize: 18,
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  codeInput: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.sm,
    padding: Spacing.md,
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
    letterSpacing: 8,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Spacing.sm,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  resendButton: {
    padding: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  resendText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  resendDisabled: {
    color: Colors.textSecondary,
  },
  changeNumberText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  attemptsText: {
    color: Colors.warning,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  error: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  cancelButton: {
    padding: Spacing.sm,
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
});
