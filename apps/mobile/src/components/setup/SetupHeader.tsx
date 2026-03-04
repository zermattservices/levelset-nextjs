/**
 * SetupHeader — date navigation + block picker for setup page
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useColors } from '../../context/ThemeContext';
import { typography, fontWeights } from '../../lib/fonts';
import { spacing, borderRadius, haptics } from '../../lib/theme';
import { AppIcon } from '../ui';
import type { SetupBlock } from '../../lib/api';

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'p' : 'a';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  if (m === 0) return `${hour12}${period}`;
  return `${hour12}:${String(m).padStart(2, '0')}${period}`;
}

interface SetupHeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  blocks: SetupBlock[];
  activeBlockIndex: number;
  onBlockChange: (index: number) => void;
  onTogglePanel: () => void;
}

export function SetupHeader({
  selectedDate, onDateChange,
  blocks, activeBlockIndex, onBlockChange,
  onTogglePanel,
}: SetupHeaderProps) {
  const colors = useColors();
  const [showCalendar, setShowCalendar] = useState(false);

  const goDay = (delta: number) => {
    haptics.light();
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    onDateChange(d);
  };

  const dateLabel = selectedDate.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
  const activeBlock = blocks[activeBlockIndex];
  const blockLabel = activeBlock
    ? `${formatTime12(activeBlock.block_time)} – ${formatTime12(activeBlock.end_time)}`
    : 'No blocks';

  return (
    <View style={[styles.container, { borderBottomColor: colors.outline }]}>
      {/* Date row */}
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={() => goDay(-1)} hitSlop={12}>
          <AppIcon name="chevron.left" size={18} tintColor={colors.onSurface} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { haptics.light(); setShowCalendar(true); }}
          style={styles.dateButton}
        >
          <Text style={[styles.dateText, { color: colors.onSurface }]}>{dateLabel}</Text>
          <AppIcon name="calendar" size={16} tintColor={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => goDay(1)} hitSlop={12}>
          <AppIcon name="chevron.right" size={18} tintColor={colors.onSurface} />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        {/* Menu button to open employee panel */}
        <TouchableOpacity
          onPress={() => { haptics.light(); onTogglePanel(); }}
          style={styles.menuButton}
        >
          <AppIcon name="line.3.horizontal" size={20} tintColor={colors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* Block picker row */}
      {blocks.length > 0 && (
        <View style={styles.blockRow}>
          <TouchableOpacity
            onPress={() => {
              haptics.selection();
              const next = (activeBlockIndex + 1) % blocks.length;
              onBlockChange(next);
            }}
            style={[styles.blockPicker, { backgroundColor: colors.surfaceVariant, borderColor: colors.outline }]}
          >
            <Text style={[styles.blockLabel, { color: colors.onSurface }]}>{blockLabel}</Text>
            <AppIcon name="chevron.up.chevron.down" size={12} tintColor={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={[styles.blockCount, { color: colors.onSurfaceVariant }]}>
            {activeBlockIndex + 1} of {blocks.length}
          </Text>
        </View>
      )}

      {/* Calendar modal */}
      {showCalendar && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_, date) => {
            setShowCalendar(false);
            if (date) onDateChange(date);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dateText: {
    ...typography.labelLarge,
    fontWeight: fontWeights.semibold,
  },
  menuButton: {
    padding: spacing[2],
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  blockPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  blockLabel: {
    ...typography.bodySmall,
    fontWeight: fontWeights.medium,
  },
  blockCount: {
    ...typography.bodySmall,
  },
});
