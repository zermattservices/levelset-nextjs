/**
 * DraggableEmployee — wraps employee card in gesture handler
 * Long-press to initiate drag, pan to move, release to drop.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useColors } from '../../context/ThemeContext';
import { typography, fontWeights } from '../../lib/fonts';
import { spacing } from '../../lib/theme';
import { useDrag, DragItem } from './DragContext';
import { haptics } from '../../lib/theme';

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

interface DraggableEmployeeProps {
  employee: {
    id: string;
    full_name: string;
    shift: { id: string; start_time: string; end_time: string };
  };
  isAssigned: boolean;
  onDragStart?: () => void;
  onDragEnd?: (dropZone: { positionId: string; slotIndex: number } | null) => void;
}

export function DraggableEmployee({ employee, isAssigned, onDragStart, onDragEnd }: DraggableEmployeeProps) {
  const colors = useColors();
  const { setActiveDrag, dragX, dragY, hitTest, setHoveredZoneKey } = useDrag();

  const startDrag = () => {
    haptics.medium();
    const item: DragItem = {
      employeeId: employee.id,
      employeeName: employee.full_name,
      shiftId: employee.shift.id,
      shiftStartTime: employee.shift.start_time,
      shiftEndTime: employee.shift.end_time,
    };
    setActiveDrag(item);
    onDragStart?.();
  };

  const updateHover = (x: number, y: number) => {
    const zone = hitTest(x, y);
    setHoveredZoneKey(zone ? `slot-${zone.positionId}-${zone.slotIndex}` : null);
  };

  const endDrag = (x: number, y: number) => {
    const zone = hitTest(x, y);
    setActiveDrag(null);
    setHoveredZoneKey(null);
    if (zone) {
      haptics.light();
      onDragEnd?.(zone);
    } else {
      onDragEnd?.(null);
    }
  };

  const longPress = Gesture.LongPress()
    .minDuration(300)
    .onStart((e) => {
      'worklet';
      dragX.value = e.absoluteX;
      dragY.value = e.absoluteY;
      runOnJS(startDrag)();
    });

  const pan = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((_e, state) => {
      state.activate();
    })
    .onUpdate((e) => {
      'worklet';
      dragX.value = e.absoluteX;
      dragY.value = e.absoluteY;
      runOnJS(updateHover)(e.absoluteX, e.absoluteY);
    })
    .onEnd((e) => {
      'worklet';
      runOnJS(endDrag)(e.absoluteX, e.absoluteY);
    });

  const composed = Gesture.Simultaneous(longPress, pan);

  const name = formatName(employee.full_name);
  const shiftTime = `${formatTime12Short(employee.shift.start_time)} – ${formatTime12Short(employee.shift.end_time)}`;

  return (
    <GestureDetector gesture={composed}>
      <View style={[styles.card, isAssigned && { opacity: 0.4 }]}>
        <Text style={[styles.name, { color: colors.onSurface }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.shift, { color: colors.onSurfaceVariant }]}>
          {shiftTime}
        </Text>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  name: {
    ...typography.bodySmall,
    fontWeight: fontWeights.medium,
  },
  shift: {
    fontSize: 11,
    marginTop: 1,
  },
});
