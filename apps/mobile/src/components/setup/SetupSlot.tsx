/**
 * SetupSlot — a single drop target slot inside a position card
 */

import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../context/ThemeContext';
import { typography, fontWeights } from '../../lib/fonts';
import { spacing, borderRadius } from '../../lib/theme';
import { useDrag } from './DragContext';
import type { SetupAssignment } from '../../lib/api';

function formatTime12Short(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'p' : 'a';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  if (m === 0) return `${hour12}${period}`;
  return `${hour12}:${String(m).padStart(2, '0')}${period}`;
}

function formatName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

interface SetupSlotProps {
  positionId: string;
  slotIndex: number;
  isRequired: boolean;
  assignment?: SetupAssignment;
}

export function SetupSlot({ positionId, slotIndex, isRequired, assignment }: SetupSlotProps) {
  const colors = useColors();
  const { registerDropZone, unregisterDropZone, registerDropZoneView, unregisterDropZoneView, hoveredZoneKey } = useDrag();
  const viewRef = useRef<View>(null);
  const zoneKey = `slot-${positionId}-${slotIndex}`;
  const isHovered = hoveredZoneKey === zoneKey;

  const onLayout = useCallback(() => {
    viewRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        registerDropZone(zoneKey, { positionId, slotIndex, layout: { x, y, width, height } });
      }
    });
  }, [positionId, slotIndex, zoneKey, registerDropZone]);

  React.useEffect(() => {
    registerDropZoneView(zoneKey, { positionId, slotIndex, viewRef });
    return () => {
      unregisterDropZone(zoneKey);
      unregisterDropZoneView(zoneKey);
    };
  }, [zoneKey, positionId, slotIndex, registerDropZoneView, unregisterDropZone, unregisterDropZoneView]);

  const borderColor = isHovered ? colors.primary : isRequired ? colors.outline : colors.outlineVariant;
  const borderStyle = isRequired ? 'solid' as const : 'dashed' as const;

  if (assignment) {
    const name = formatName(assignment.employee?.full_name ?? 'Unknown');
    const shiftTime = assignment.shift
      ? `${formatTime12Short(assignment.shift.start_time)} – ${formatTime12Short(assignment.shift.end_time)}`
      : '';

    return (
      <View
        ref={viewRef}
        onLayout={onLayout}
        style={[
          styles.slot,
          { borderWidth: 1, borderColor, borderStyle, backgroundColor: isHovered ? colors.primaryContainer : colors.surfaceVariant },
        ]}
      >
        <Text style={[styles.employeeName, { color: colors.onSurface }]} numberOfLines={1}>{name}</Text>
        {shiftTime ? <Text style={[styles.shiftTime, { color: colors.onSurfaceVariant }]} numberOfLines={1}>{shiftTime}</Text> : null}
      </View>
    );
  }

  return (
    <View
      ref={viewRef}
      onLayout={onLayout}
      style={[
        styles.slot,
        styles.emptySlot,
        { borderWidth: 1, borderColor, borderStyle, backgroundColor: isHovered ? colors.primaryContainer : 'transparent' },
      ]}
    >
      <Text style={[styles.emptyLabel, { color: colors.onSurfaceDisabled }]}>—</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    borderRadius: borderRadius.sm,
    padding: spacing[1],
    marginTop: spacing[1],
    minHeight: 36,
    justifyContent: 'center',
  },
  emptySlot: {
    alignItems: 'center',
  },
  employeeName: {
    ...typography.bodySmall,
    fontWeight: fontWeights.medium,
    fontSize: 11,
  },
  shiftTime: {
    fontSize: 9,
    marginTop: 1,
  },
  emptyLabel: {
    fontSize: 11,
  },
});
