import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  onCancel,
  onDiscard,
  onSave,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Abbrechen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.discardButton]}
              onPress={onDiscard}
            >
              <Text style={styles.discardButtonText}>Verwerfen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={onSave}
            >
              <Text style={styles.saveButtonText}>Speichern</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  dialog: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  message: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.gray200,
  },
  cancelButtonText: {
    color: Colors.gray700,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  discardButton: {
    backgroundColor: '#fee',
  },
  discardButtonText: {
    color: '#c00',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    color: Colors.surface,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
});
