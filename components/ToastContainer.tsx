import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useToast } from '../utils/toastContext';
import ToastNotification from './ToastNotification';
import { Spacing } from '../constants';

export default function ToastContainer() {
  const { toasts, hideToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map(toast => (
        <ToastNotification key={toast.id} toast={toast} onDismiss={hideToast} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? Spacing.lg : 50,
    left: 0,
    right: 0,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
});
