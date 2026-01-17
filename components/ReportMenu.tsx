import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { X, Flag } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import { createReport, EntityType, ReportReason, canUserReport } from '../services/reportService';

interface ReportCategory {
  emoji: string;
  label: string;
  value: ReportReason;
}

const reportCategories: ReportCategory[] = [
  { emoji: '🚫', label: 'Unangemessener Inhalt', value: 'inappropriate_content' },
  { emoji: '💬', label: 'Belästigung / Beleidigung', value: 'harassment' },
  { emoji: '⚠️', label: 'Fake / Spam / Betrug', value: 'fake_spam' },
  { emoji: '👶', label: 'Jugendschutz / Minderjährige', value: 'minor_protection' },
  { emoji: '💰', label: 'Illegale oder gefährliche Angebote', value: 'illegal' },
  { emoji: '📄', label: 'Urheberrecht / Missbrauch', value: 'copyright' },
  { emoji: '⚙️', label: 'Technisches Problem / Fehler', value: 'technical' },
  { emoji: '❓', label: 'Sonstiges', value: 'other' },
];

interface ReportMenuProps {
  visible: boolean;
  onClose: () => void;
  entityType: EntityType;
  entityId: string;
  entityOwnerId?: string;
  entityTitle?: string;
  onReportSuccess?: () => void;
}

export function ReportMenu({
  visible,
  onClose,
  entityType,
  entityId,
  entityOwnerId,
  entityTitle,
  onReportSuccess,
}: ReportMenuProps) {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [additionalText, setAdditionalText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClose = () => {
    setSelectedCategory(null);
    setAdditionalText('');
    setShowSuccess(false);
    onClose();
  };

  const handleCategorySelect = async (category: ReportCategory) => {
    setSelectedCategory(category);

    if (category.value !== 'other') {
      await handleSubmit(category, '');
    }
  };

  const handleSubmit = async (category: ReportCategory, text: string) => {
    setIsSubmitting(true);

    const reportPermission = await canUserReport();
    if (!reportPermission.allowed) {
      alert(reportPermission.reason || 'Du kannst derzeit keine Meldungen erstellen');
      setIsSubmitting(false);
      return;
    }

    const result = await createReport({
      reportedEntityType: entityType,
      reportedEntityId: entityId,
      reportedUserId: entityOwnerId,
      reasonCategory: category.value,
      reasonText: text || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => {
        handleClose();
        onReportSuccess?.();
      }, 2000);
    } else {
      if (result.error?.includes('cooldown')) {
        alert('⏳ Bitte warte 30 Sekunden bevor du erneut meldest');
      } else if (result.error?.includes('bereits gemeldet')) {
        alert('ℹ️ Du hast diesen Inhalt bereits gemeldet');
      } else if (result.error?.includes('Limit')) {
        alert('⚠️ Tageslimit erreicht. Du kannst maximal 10 Meldungen pro Tag erstellen.');
      } else {
        alert('❌ Fehler: ' + (result.error || 'Unbekannter Fehler'));
      }
      handleClose();
    }
  };

  const handleOtherSubmit = () => {
    if (!additionalText.trim()) {
      alert('Bitte beschreibe kurz das Problem (max. 120 Zeichen)');
      return;
    }

    if (selectedCategory) {
      handleSubmit(selectedCategory, additionalText.trim());
    }
  };

  const getEntityTypeLabel = () => {
    switch (entityType) {
      case 'event':
        return 'Event';
      case 'profile':
        return 'Profil';
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.menuContainer} onPress={(e) => e.stopPropagation()}>
          {showSuccess ? (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Text style={styles.successEmoji}>✅</Text>
              </View>
              <Text style={styles.successTitle}>Danke für deine Meldung!</Text>
              <Text style={styles.successMessage}>
                Deine Meldung wurde anonym übermittelt. Unser System prüft sie automatisch mit KI.
              </Text>
            </View>
          ) : selectedCategory?.value === 'other' ? (
            <View style={styles.content}>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Flag size={20} color={Colors.error} />
                  <Text style={styles.headerTitle}>Sonstiges melden</Text>
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <X size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {entityTitle && (
                <View style={styles.entityInfo}>
                  <Text style={styles.entityInfoLabel}>{getEntityTypeLabel()}:</Text>
                  <Text style={styles.entityInfoText} numberOfLines={1}>
                    {entityTitle}
                  </Text>
                </View>
              )}

              <Text style={styles.inputLabel}>Beschreibe das Problem:</Text>
              <TextInput
                style={styles.textInput}
                multiline
                maxLength={120}
                placeholder="z.B. Fehlende Informationen, falscher Ort..."
                placeholderTextColor={Colors.textTertiary}
                value={additionalText}
                onChangeText={setAdditionalText}
                autoFocus
              />
              <Text style={styles.charCount}>{additionalText.length}/120</Text>

              <TouchableOpacity
                style={[styles.submitButton, !additionalText.trim() && styles.submitButtonDisabled]}
                onPress={handleOtherSubmit}
                disabled={!additionalText.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Meldung absenden</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.content}>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Flag size={20} color={Colors.error} />
                  <Text style={styles.headerTitle}>{getEntityTypeLabel()} melden</Text>
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <X size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {entityTitle && (
                <View style={styles.entityInfo}>
                  <Text style={styles.entityInfoLabel}>{getEntityTypeLabel()}:</Text>
                  <Text style={styles.entityInfoText} numberOfLines={1}>
                    {entityTitle}
                  </Text>
                </View>
              )}

              <Text style={styles.subtitle}>Was ist das Problem?</Text>

              <ScrollView style={styles.categoriesList} showsVerticalScrollIndicator={false}>
                {reportCategories.map((category) => (
                  <TouchableOpacity
                    key={category.value}
                    style={styles.categoryItem}
                    onPress={() => handleCategorySelect(category)}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                    <Text style={styles.categoryLabel}>{category.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {isSubmitting && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                </View>
              )}
            </View>
          )}
        </Pressable>
      </Pressable>
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
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  entityInfo: {
    backgroundColor: Colors.gray200Secondary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  entityInfoLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  entityInfoText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: FontWeights.medium,
  },
  subtitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  categoriesList: {
    maxHeight: 400,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray200Secondary,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryLabel: {
    fontSize: FontSizes.md,
    color: Colors.text,
    flex: 1,
  },
  inputLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  charCount: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  submitButton: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.textTertiary,
  },
  submitButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#fff',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  successContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: Spacing.lg,
  },
  successEmoji: {
    fontSize: 64,
  },
  successTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.success,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
