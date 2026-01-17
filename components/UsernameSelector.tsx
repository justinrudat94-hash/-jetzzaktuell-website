import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants';
import { Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import { Check, X as XIcon, X as CloseIcon } from 'lucide-react-native';

interface UsernameSelectorProps {
  visible?: boolean;
  onClose?: () => void;
  currentUsername?: string;
  userId: string;
  onUsernameSet?: (username: string) => void;
  showLastChangedInfo?: boolean;
}

export function UsernameSelector({
  visible = true,
  onClose,
  currentUsername = '',
  userId,
  onUsernameSet,
  showLastChangedInfo = true,
}: UsernameSelectorProps) {
  const [username, setUsername] = useState(currentUsername);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChangedAt, setLastChangedAt] = useState<Date | null>(null);
  const [changeCount, setChangeCount] = useState(0);

  useEffect(() => {
    if (showLastChangedInfo) {
      loadUsernameInfo();
    }
  }, [userId]);

  useEffect(() => {
    if (username && username !== currentUsername) {
      const timer = setTimeout(() => {
        checkAvailability();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setAvailable(null);
    }
  }, [username]);

  const loadUsernameInfo = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('username_changed_at, username_change_count')
      .eq('id', userId)
      .single();

    if (data) {
      if (data.username_changed_at) {
        setLastChangedAt(new Date(data.username_changed_at));
      }
      setChangeCount(data.username_change_count || 0);
    }
  };

  const checkAvailability = async () => {
    if (!username || username.length < 3) {
      setAvailable(null);
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('is_username_available', {
        p_username: username,
      });

      if (rpcError) throw rpcError;
      setAvailable(data === true);
    } catch (err) {
      console.error('Error checking username:', err);
      setError('Fehler beim Prüfen des Benutzernamens');
    } finally {
      setChecking(false);
    }
  };

  const saveUsername = async () => {
    if (!available) return;

    setSaving(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('change_username', {
        p_user_id: userId,
        p_new_username: username,
      });

      if (rpcError) throw rpcError;

      if (data?.success) {
        onUsernameSet?.(username);
        await loadUsernameInfo();
        onClose?.();
      } else if (data?.error === 'username_taken') {
        setError('Dieser Benutzername ist bereits vergeben');
        setAvailable(false);
      } else if (data?.error === 'cooldown_active') {
        const canChangeAfter = new Date(data.can_change_after);
        setError(
          `Du kannst deinen Benutzernamen erst wieder am ${canChangeAfter.toLocaleDateString('de-DE')} ändern`
        );
      } else {
        throw new Error(data?.error || 'Fehler beim Speichern');
      }
    } catch (err) {
      console.error('Error saving username:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const validateUsername = (text: string) => {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
  };

  const canChange = () => {
    if (!lastChangedAt) return true;
    const daysSinceLastChange = Math.floor(
      (Date.now() - lastChangedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceLastChange >= 30;
  };

  const daysUntilCanChange = () => {
    if (!lastChangedAt) return 0;
    const daysSinceLastChange = Math.floor(
      (Date.now() - lastChangedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, 30 - daysSinceLastChange);
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Benutzername ändern</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <CloseIcon size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.label}>Benutzername</Text>
            <Text style={styles.hint}>
              Mindestens 3 Zeichen. Nur Buchstaben, Zahlen und Unterstriche.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.prefix}>@</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={validateUsername}
                placeholder="benutzername"
                placeholderTextColor={Colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!saving && canChange()}
                maxLength={30}
              />
              {checking && <ActivityIndicator size="small" color={Colors.primary} />}
              {available === true && !checking && (
                <Check size={20} color={Colors.success} style={styles.icon} />
              )}
              {available === false && !checking && (
                <XIcon size={20} color={Colors.error} style={styles.icon} />
              )}
            </View>

            {username.length > 0 && username.length < 3 && (
              <Text style={styles.warningText}>Mindestens 3 Zeichen erforderlich</Text>
            )}

            {available === true && username !== currentUsername && (
              <Text style={styles.successText}>✓ Benutzername verfügbar</Text>
            )}

            {available === false && (
              <Text style={styles.errorText}>Dieser Benutzername ist bereits vergeben</Text>
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            {showLastChangedInfo && lastChangedAt && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  {canChange() ? (
                    <>Du kannst deinen Benutzernamen jetzt ändern ({changeCount} Mal geändert)</>
                  ) : (
                    <>
                      Nächste Änderung möglich in {daysUntilCanChange()} Tagen ({changeCount} Mal
                      geändert)
                    </>
                  )}
                </Text>
              </View>
            )}

            {available && username !== currentUsername && canChange() && (
              <TouchableOpacity
                style={[styles.button, saving && styles.buttonDisabled]}
                onPress={saveUsername}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.buttonText}>Benutzernamen speichern</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  hint: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  prefix: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: Colors.textPrimary,
    padding: 0,
  },
  icon: {
    marginLeft: Spacing.sm,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Spacing.sm,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  successText: {
    color: Colors.success,
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  warningText: {
    color: Colors.warning,
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  infoBox: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.sm,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  modalContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
});
