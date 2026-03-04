/**
 * SetupHeader — date navigation + block dropdown for setup page.
 * Single row: back | < date > | block dropdown | hamburger
 * Calendar expands below header as collapsible section.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  Pressable, LayoutAnimation, UIManager,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../context/ThemeContext';
import { typography, fontWeights } from '../../lib/fonts';
import { spacing, borderRadius, haptics } from '../../lib/theme';
import { AppIcon } from '../ui';
import type { SetupBlock } from '../../lib/api';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

  const toggleCalendar = useCallback(() => {
    haptics.light();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowCalendar((v) => !v);
    setShowBlockDropdown(false);
  }, []);

  const toggleBlockDropdown = useCallback(() => {
    haptics.selection();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowBlockDropdown((v) => !v);
    setShowCalendar(false);
  }, []);

  const dateLabel = selectedDate.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const activeBlock = blocks[activeBlockIndex];
  const blockLabel = activeBlock
    ? `${formatTime12(activeBlock.block_time)} – ${formatTime12(activeBlock.end_time)}`
    : '';

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing[1] }]}>
      {/* Single header row: back | < date > | block | hamburger */}
      <View style={styles.headerRow}>
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
          <TouchableOpacity onPress={toggleCalendar} style={styles.dateButton}>
            <Text style={[styles.dateText, { color: colors.onSurface }]}>{dateLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => goDay(1)} hitSlop={12}>
            <AppIcon name="chevron.right" size={14} tintColor={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* Block selector */}
        {blocks.length > 0 && (
          <TouchableOpacity
            onPress={toggleBlockDropdown}
            style={[styles.blockPicker, { backgroundColor: colors.surfaceVariant }]}
          >
            <Text style={[styles.blockLabel, { color: colors.onSurface }]}>{blockLabel}</Text>
            <AppIcon
              name={showBlockDropdown ? 'chevron.up' : 'chevron.down'}
              size={10}
              tintColor={colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        )}

        {/* Hamburger menu button */}
        <TouchableOpacity
          onPress={() => { haptics.light(); onTogglePanel(); }}
          style={styles.iconButton}
          hitSlop={12}
        >
          <AppIcon name="line.3.horizontal" size={20} tintColor={colors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* Collapsible calendar section */}
      {showCalendar && (
        <View style={[styles.calendarSection, { borderTopColor: colors.outline }]}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="inline"
            accentColor={colors.primary}
            themeVariant="dark"
            onChange={(_, date) => {
              if (date) {
                onDateChange(date);
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setShowCalendar(false);
              }
            }}
            style={styles.calendar}
          />
          {/* Grab bar to swipe/tap to close */}
          <TouchableOpacity onPress={toggleCalendar} style={styles.grabBarContainer}>
            <View style={[styles.grabBar, { backgroundColor: colors.onSurfaceDisabled }]} />
          </TouchableOpacity>
        </View>
      )}

      {/* Collapsible block dropdown */}
      {showBlockDropdown && (
        <View style={[styles.blockDropdown, { borderTopColor: colors.outline }]}>
          {blocks.map((block, index) => {
            const isActive = index === activeBlockIndex;
            const label = `${formatTime12(block.block_time)} – ${formatTime12(block.end_time)}`;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  haptics.selection();
                  onBlockChange(index);
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setShowBlockDropdown(false);
                }}
                style={[
                  styles.blockItem,
                  isActive && { backgroundColor: colors.primaryTransparent },
                ]}
              >
                <Text style={[
                  styles.blockItemText,
                  { color: isActive ? colors.primary : colors.onSurface },
                  isActive && { fontWeight: fontWeights.semibold },
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[1],
    paddingBottom: spacing[2],
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
    paddingVertical: spacing[1],
  },
  dateText: {
    ...typography.labelLarge,
    fontWeight: fontWeights.semibold,
  },
  blockPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    borderCurve: 'continuous',
  },
  blockLabel: {
    fontSize: 12,
    fontWeight: fontWeights.medium,
  },
  calendarSection: {
    borderTopWidth: 1,
    paddingTop: spacing[2],
  },
  calendar: {
    alignSelf: 'center',
    width: '100%',
  },
  grabBarContainer: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  grabBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  blockDropdown: {
    borderTopWidth: 1,
    paddingVertical: spacing[1],
  },
  blockItem: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  blockItemText: {
    ...typography.bodySmall,
    fontWeight: fontWeights.medium,
  },
});
