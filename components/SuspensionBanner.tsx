import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants';
import { checkUserSuspension } from '../services/reportService';
import { useAuth } from '../utils/authContext';

export function SuspensionBanner() {
  const { user } = useAuth();
  const [suspension, setSuspension] = useState<{
    suspended: boolean;
    reason?: string;
    suspended_until?: string;
    days_remaining?: number;
  } | null>(null);

  useEffect(() => {
    if (user) {
      loadSuspensionStatus();
    }
  }, [user]);

  const loadSuspensionStatus = async () => {
    const status = await checkUserSuspension();
    if (status.suspended) {
      setSuspension(status);
    } else {
      setSuspension(null);
    }
  };

  if (!suspension || !suspension.suspended) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <AlertCircle size={24} color={Colors.error} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Account vorübergehend gesperrt</Text>
        <Text style={styles.message}>{suspension.reason}</Text>
        {suspension.suspended_until && (
          <Text style={styles.until}>
            Bis: {formatDate(suspension.suspended_until)}
            {suspension.days_remaining !== undefined && ` (${Math.ceil(suspension.days_remaining)} Tage)`}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: `${Colors.error}15`,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  iconContainer: {
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.error,
    marginBottom: Spacing.xs,
  },
  message: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  until: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
});
