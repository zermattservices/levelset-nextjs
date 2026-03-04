/**
 * SetupPositionGrid — 3-column grid of position cards with slots
 */

import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../context/ThemeContext';
import { typography } from '../../lib/fonts';
import { spacing } from '../../lib/theme';
import { SetupPositionCard } from './SetupPositionCard';
import type { SetupBlock, SetupPosition, SetupAssignment } from '../../lib/api';

interface SetupPositionGridProps {
  activeBlock: SetupBlock | null;
  positions: SetupPosition[];
  assignments: SetupAssignment[];
}

const COL_COUNT = 3;
const GAP = spacing[2];

export function SetupPositionGrid({ activeBlock, positions, assignments }: SetupPositionGridProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const cardWidth = (width - spacing[4] * 2 - GAP * (COL_COUNT - 1)) / COL_COUNT;

  const positionSlots = useMemo(() => {
    if (!activeBlock) return [];

    return positions
      .filter((pos) => pos.id in activeBlock.positions)
      .map((pos) => {
        const blockPos = activeBlock.positions[pos.id];
        const slotCount = blockPos?.slot_count ?? 0;
        const isRequired = blockPos?.is_required ?? true;

        // Find assignments for this position (match dashboard: filter by position_id only)
        const posAssignments = assignments.filter(
          (a) => a.position_id === pos.id
        );

        const minSlots = Math.max(slotCount, 1);
        const effectiveSlotCount = Math.max(minSlots, posAssignments.length + 1);

        const slots = Array.from({ length: effectiveSlotCount }, (_, i) => ({
          index: i,
          is_required: i < slotCount ? isRequired : false,
          assignment: posAssignments[i] ?? undefined,
        }));

        return { positionId: pos.id, positionName: pos.name, slots };
      });
  }, [activeBlock, positions, assignments]);

  if (!activeBlock || positionSlots.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[typography.bodySmall, { color: colors.onSurfaceDisabled }]}>
          {t('setup.noBlocks')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
      {positionSlots.map((ps) => (
        <View key={ps.positionId} style={{ width: cardWidth }}>
          <SetupPositionCard
            positionId={ps.positionId}
            positionName={ps.positionName}
            slots={ps.slots}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing[4],
    gap: GAP,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
  },
});
