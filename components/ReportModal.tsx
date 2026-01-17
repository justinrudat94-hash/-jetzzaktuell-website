import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Colors } from '../constants';
import { Spacing } from '../constants';
import { createReport, reportReasons, EntityType, ReportReason, canUserReport } from '../services/reportService';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  entityType: EntityType;
  entityId: string;
  entityOwnerId?: string;
  entityTitle?: string;
}

export function ReportModal({
  visible,
  onClose,
  entityType,
  entityId,
  entityOwnerId,
  entityTitle,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [additionalText, setAdditionalText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Fehler', 'Bitte wähle einen Grund für die Meldung aus');
      return;
    }

    if (selectedReason === 'other' && !additionalText.trim()) {
      Alert.alert('Fehler', 'Bitte beschreibe das Problem');
      return;
    }

    const reportPermission = await canUserReport();
    if (!reportPermission.allowed) {
      Alert.alert('Melden nicht möglich', reportPermission.reason || 'Du kannst derzeit keine Meldungen erstellen');
      return;
    }

    setIsSubmitting(true);

    const result = await createReport({
      reportedEntityType: entityType,
      reportedEntityId: entityId,
      reportedUserId: entityOwnerId,
      reasonCategory: selectedReason,
      reasonText: additionalText.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      Alert.alert(
        'Meldung gesendet',
        'Danke für deine Meldung. Wir werden den Inhalt überprüfen.',
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedReason(null);
              setAdditionalText('');
              onClose();
            },
          },
        ]
      );
    } else {
      Alert.alert('Fehler', result.error || 'Die Meldung konnte nicht gesendet werden');
    }
  };

  const getEntityTypeLabel = () => {
    switch (entityType) {
      case 'profile':
        return 'Profil';
      case 'event':
        return 'Event';
      case 'livestream':
        return 'Livestream';
      case 'comment':
        return 'Kommentar';
      case 'message':
        return 'Nachricht';
      default:
        return 'Inhalt';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{getEntityTypeLabel()} melden</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {entityTitle && (
            <View style={styles.entityInfo}>
              <Text style={styles.entityInfoText}>"{entityTitle}"</Text>
            </View>
          )}

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Grund der Meldung</Text>

            {reportReasons.map((reason) => (
              <TouchableOpacity
                key={reason.value}
                style={[
                  styles.reasonButton,
                  selectedReason === reason.value && styles.reasonButtonSelected,
                ]}
                onPress={() => setSelectedReason(reason.value)}
              >
                <View style={styles.radioButton}>
                  {selectedReason === reason.value && <View style={styles.radioButtonInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.reasonText,
                      selectedReason === reason.value && styles.reasonTextSelected,
                    ]}
                  >
                    {reason.label}
                  </Text>
                  <Text
                    style={[
                      styles.reasonDescription,
                      selectedReason === reason.value && styles.reasonDescriptionSelected,
                    ]}
                  >
                    {reason.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {(selectedReason === 'other' || selectedReason) && (
              <View style={styles.textInputContainer}>
                <Text style={styles.textInputLabel}>
                  {selectedReason === 'other'
                    ? 'Bitte beschreibe das Problem *'
                    : 'Zusätzliche Informationen (optional)'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  multiline
                  numberOfLines={4}
                  placeholder="Beschreibe hier das Problem..."
                  placeholderTextColor={Colors.textTertiary}
                  value={additionalText}
                  onChangeText={setAdditionalText}
                  maxLength={500}
                />
                <Text style={styles.charCount}>{additionalText.length}/500</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Abbrechen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, (!selectedReason || isSubmitting) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!selectedReason || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Melden</Text>
              )}
            </TouchableOpacity>
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
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  entityInfo: {
    padding: Spacing.md,
    backgroundColor: Colors.gray200Secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  entityInfoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  content: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  reasonButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  reasonButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: Spacing.md,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  reasonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  reasonTextSelected: {
    color: Colors.primary,
  },
  reasonDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  reasonDescriptionSelected: {
    color: Colors.primary,
    opacity: 0.8,
  },
  textInputContainer: {
    marginTop: Spacing.lg,
  },
  textInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: 15,
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  submitButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.error,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.textTertiary,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
