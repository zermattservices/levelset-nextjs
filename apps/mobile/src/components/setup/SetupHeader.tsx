/**
 * SetupHeader — date navigation + block dropdown picker for setup page.
 * Includes back button (left) and hamburger menu (right).
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  Modal, FlatList, Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showCalendar, setShowCalendar] = useState(false);
  const [showBlockDropdown, setShowBlockDropdown] = useState(false);

  const goDay = (delta: number) => {
    haptics.light();
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    onDateChange(d);
  };

  const dateLabel = selectedDate.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const activeBlock = blocks[activeBlockIndex];
  const blockLabel = activeBlock
    ? `${formatTime12(activeBlock.block_time)} – ${formatTime12(activeBlock.end_time)}`
    : 'No blocks';

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing[1], borderBottomColor: colors.outline }]}>
      {/* Top row: back button, centered date, hamburger button */}
      <View style={styles.topRow}>
        {/* Back button */}
        <TouchableOpacity
          onPress={() => { haptics.light(); router.back(); }}
          style={styles.iconButton}
          hitSlop={12}
        >
          <AppIcon name="chevron.left" size={20} tintColor={colors.onSurface} />
        </TouchableOpacity>

        {/* Centered date with carets */}
        <View style={styles.dateCenter}>
          <TouchableOpacity onPress={() => goDay(-1)} hitSlop={12}>
            <AppIcon name="chevron.left" size={14} tintColor={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { haptics.light(); setShowCalendar(true); }}
            style={styles.dateButton}
          >
            <Text style={[styles.dateText, { color: colors.onSurface }]}>{dateLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => goDay(1)} hitSlop={12}>
            <AppIcon name="chevron.right" size={14} tintColor={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* Hamburger menu button */}
        <TouchableOpacity
          onPress={() => { haptics.light(); onTogglePanel(); }}
          style={styles.iconButton}
          hitSlop={12}
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
              setShowBlockDropdown(true);
            }}
            style={[styles.blockPicker, { backgroundColor: colors.surfaceVariant, borderColor: colors.outline }]}
          >
            <Text style={[styles.blockLabel, { color: colors.onSurface }]}>{blockLabel}</Text>
            <AppIcon name="chevron.down" size={12} tintColor={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      )}

      {/* Calendar picker */}
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

      {/* Block dropdown modal */}
      <Modal
        visible={showBlockDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBlockDropdown(false)}
      >
        <Pressable
          style={styles.dropdownBackdrop}
          onPress={() => setShowBlockDropdown(false)}
        >
          <View style={[styles.dropdownContainer, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
            <FlatList
              data={blocks}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item, index }) => {
                const isActive = index === activeBlockIndex;
                const label = `${formatTime12(item.block_time)} – ${formatTime12(item.end_time)}`;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      haptics.selection();
                      onBlockChange(index);
                      setShowBlockDropdown(false);
                    }}
                    style={[
                      styles.dropdownItem,
                      isActive && { backgroundColor: colors.primaryTransparent },
                    ]}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      { color: isActive ? colors.primary : colors.onSurface },
                      isActive && { fontWeight: fontWeights.semibold },
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[2],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    padding: spacing[2],
  },
  dateCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
    justifyContent: 'center',
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
  blockRow: {
    flexDirection: 'row',
    justifyContent: 'center',
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
  dropdownBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dropdownContainer: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minWidth: 200,
    maxHeight: 300,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  dropdownItemText: {
    ...typography.bodySmall,
    fontWeight: fontWeights.medium,
  },
});
