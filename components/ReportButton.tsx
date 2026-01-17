import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Flag } from 'lucide-react-native';
import { Colors } from '../constants';
import { ReportMenu } from './ReportMenu';
import { EntityType } from '../services/reportService';

interface ReportButtonProps {
  entityType: EntityType;
  entityId: string;
  entityOwnerId?: string;
  entityTitle?: string;
  size?: number;
  color?: string;
  onReportSuccess?: () => void;
}

export function ReportButton({
  entityType,
  entityId,
  entityOwnerId,
  entityTitle,
  size = 20,
  color = Colors.textSecondary,
  onReportSuccess,
}: ReportButtonProps) {
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowReportMenu(true)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Flag size={size} color={color} />
        </Animated.View>
      </TouchableOpacity>

      <ReportMenu
        visible={showReportMenu}
        onClose={() => setShowReportMenu(false)}
        entityType={entityType}
        entityId={entityId}
        entityOwnerId={entityOwnerId}
        entityTitle={entityTitle}
        onReportSuccess={onReportSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 4,
  },
});
