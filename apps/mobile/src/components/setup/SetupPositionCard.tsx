/**
 * SetupPositionCard — a single position column with header + slots
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../context/ThemeContext';
import { typography, fontWeights } from '../../lib/fonts';
import { spacing, borderRadius } from '../../lib/theme';
import { SetupSlot } from './SetupSlot';
import type { SetupAssignment } from '../../lib/api';

interface SlotData {
  index: number;
  is_required: boolean;
  assignment?: SetupAssignment;
}

interface SetupPositionCardProps {
  positionId: string;
  positionName: string;
  slots: SlotData[];
}

export function SetupPositionCard({ positionId, positionName, slots }: SetupPositionCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
      <Text style={[styles.header, { color: colors.onSurface }]} numberOfLines={1}>
        {positionName}
      </Text>
      {slots.map((slot) => (
        <SetupSlot
          key={`${positionId}-${slot.index}`}
          positionId={positionId}
          slotIndex={slot.index}
          isRequired={slot.is_required}
          assignment={slot.assignment}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
    padding: spacing[2],
    marginBottom: spacing[2],
  },
  header: {
    ...typography.labelSmall,
    fontWeight: fontWeights.bold,
    marginBottom: spacing[1],
    textTransform: 'uppercase',
    textAlign: 'center',
    fontSize: 10,
  },
});
