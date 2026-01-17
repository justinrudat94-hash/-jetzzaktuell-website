import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react-native';
import { Colors, Spacing } from '../constants';
import { Toast, ToastType } from '../utils/toastContext';

interface ToastNotificationProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const getToastConfig = (type: ToastType) => {
  switch (type) {
    case 'success':
      return {
        icon: CheckCircle,
        backgroundColor: '#d4edda',
        borderColor: '#28a745',
        textColor: '#155724',
        iconColor: '#28a745',
      };
    case 'error':
      return {
        icon: XCircle,
        backgroundColor: '#f8d7da',
        borderColor: '#dc3545',
        textColor: '#721c24',
        iconColor: '#dc3545',
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        backgroundColor: '#fff3cd',
        borderColor: '#ffc107',
        textColor: '#856404',
        iconColor: '#ffc107',
      };
    case 'info':
    default:
      return {
        icon: Info,
        backgroundColor: '#d1ecf1',
        borderColor: '#17a2b8',
        textColor: '#0c5460',
        iconColor: '#17a2b8',
      };
  }
};

export default function ToastNotification({ toast, onDismiss }: ToastNotificationProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const config = getToastConfig(toast.type);
  const Icon = config.icon;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(toast.id);
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.content}>
        <Icon size={22} color={config.iconColor} />
        <Text style={[styles.message, { color: config.textColor }]}>{toast.message}</Text>
      </View>
      <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
        <X size={18} color={config.textColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
});
