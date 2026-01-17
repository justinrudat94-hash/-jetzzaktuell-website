import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { CheckCircle, AlertCircle, Info, Clock } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
}

export function Toast({ visible, message, type = 'info', duration = 3000, onHide }: ToastProps) {
  const [translateY] = React.useState(new Animated.Value(-100));
  const [opacity] = React.useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
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

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.();
    });
  };

  const getToastStyle = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: Colors.success,
          icon: CheckCircle,
        };
      case 'error':
        return {
          backgroundColor: Colors.error,
          icon: AlertCircle,
        };
      case 'warning':
        return {
          backgroundColor: Colors.warning,
          icon: Clock,
        };
      default:
        return {
          backgroundColor: Colors.info,
          icon: Info,
        };
    }
  };

  const toastStyle = getToastStyle();
  const Icon = toastStyle.icon;

  if (!visible && opacity._value === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: toastStyle.backgroundColor },
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Icon size={20} color="#fff" />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = React.createContext<ToastContextValue>({
  showToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toastState, setToastState] = React.useState<{
    visible: boolean;
    message: string;
    type: ToastType;
    duration: number;
  }>({
    visible: false,
    message: '',
    type: 'info',
    duration: 3000,
  });

  const showToast = (message: string, type: ToastType = 'info', duration: number = 3000) => {
    setToastState({
      visible: true,
      message,
      type,
      duration,
    });
  };

  const hideToast = () => {
    setToastState((prev) => ({ ...prev, visible: false }));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        visible={toastState.visible}
        message={toastState.message}
        type={toastState.type}
        duration={toastState.duration}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999,
  },
  message: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: '#fff',
    flex: 1,
  },
});
