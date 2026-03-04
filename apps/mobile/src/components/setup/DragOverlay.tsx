/**
 * DragOverlay — floating card that follows the finger during drag
 */

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import ReAnimated, { useAnimatedStyle } from 'react-native-reanimated';
import { useColors } from '../../context/ThemeContext';
import { typography, fontWeights } from '../../lib/fonts';
import { spacing, borderRadius } from '../../lib/theme';
import { useDrag } from './DragContext';

export function DragOverlay() {
  const colors = useColors();
  const { activeDrag, dragX, dragY } = useDrag();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value - 50 },
      { translateY: dragY.value - 20 },
    ],
  }));

  if (!activeDrag) return null;

  const parts = activeDrag.employeeName.trim().split(/\s+/);
  const shortName = parts.length > 1
    ? `${parts[0]} ${parts[parts.length - 1][0]}.`
    : activeDrag.employeeName;

  return (
    <ReAnimated.View
      style={[styles.overlay, { backgroundColor: colors.primary }, animatedStyle]}
      pointerEvents="none"
    >
      <Text style={styles.name} numberOfLines={1}>{shortName}</Text>
    </ReAnimated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    zIndex: 9999,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.sm,
    borderCurve: 'continuous',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  name: {
    ...typography.labelSmall,
    fontWeight: fontWeights.semibold,
    color: '#fff',
  },
});
