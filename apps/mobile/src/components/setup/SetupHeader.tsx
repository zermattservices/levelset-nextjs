/**
 * SetupHeader — date navigation + block selector for setup page.
 * Single row: glass-back (fixed L) | < date block-selector > (centered) | glass-hamburger (fixed R)
 * Block selector opens a popover dropdown anchored directly below the button.
 * Calendar expands below header as collapsible section.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  Pressable, LayoutAnimation, UIManager, Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../context/ThemeContext';
import { useGlass } from '../../hooks/useGlass';
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
  const { GlassView } = useGlass();
  const [showCalendar, setShowCalendar] = useState(false);
  const [showBlockDropdown, setShowBlockDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ x: 0, y: 0, width: 0 });
  const blockPickerRef = useRef<View>(null);

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

  const openBlockDropdown = useCallback(() => {
    if (blocks.length === 0) return;
    haptics.selection();
    setShowCalendar(false);
    // Measure the button position to anchor the dropdown
    blockPickerRef.current?.measureInWindow((x, y, width, height) => {
      setDropdownPos({ x, y: y + height + 4, width: Math.max(width, 140) });
      setShowBlockDropdown(true);
    });
  }, [blocks]);

  const dateLabel = selectedDate.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const activeBlock = blocks[activeBlockIndex];
  const blockLabel = activeBlock ? formatTime12(activeBlock.block_time) : '';

  // Liquid glass icon button — matches rating page back button pattern
  const glassIconButton = (onPress: () => void, iconName: string) => {
    const inner = (
      <Pressable
        onPress={onPress}
        hitSlop={8}
        style={styles.glassButtonInner}
      >
        <AppIcon name={iconName} size={16} tintColor={colors.onSurface} />
      </Pressable>
    );

    if (GlassView) {
      return (
        <GlassView style={styles.glassButton} isInteractive>
          {inner}
        </GlassView>
      );
    }

    return (
      <Pressable
        onPress={onPress}
        hitSlop={8}
        style={[styles.glassButton, { backgroundColor: colors.surfaceDisabled }]}
      >
        <AppIcon name={iconName} size={16} tintColor={colors.onSurface} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing[1] }]}>
      {/* Header row: glass-back (fixed L) | centered date+block | glass-hamburger (fixed R) */}
      <View style={styles.headerRow}>
        {/* Back button — fixed left */}
        {glassIconButton(
          () => { haptics.light(); router.back(); },
          'chevron.left',
        )}

        {/* Center group: < date block-selector > */}
        <View style={styles.centerGroup}>
          <TouchableOpacity onPress={() => goDay(-1)} hitSlop={12}>
            <AppIcon name="chevron.left" size={14} tintColor={colors.onSurfaceVariant} />
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleCalendar} style={styles.dateButton}>
            <Text style={[styles.dateText, { color: colors.onSurface }]}>{dateLabel}</Text>
          </TouchableOpacity>

          {blocks.length > 0 && (
            <View ref={blockPickerRef} collapsable={false}>
              {GlassView ? (
                <GlassView style={styles.blockPickerGlass} isInteractive>
                  <Pressable onPress={openBlockDropdown} style={styles.blockPickerInner}>
                    <Text style={[styles.blockLabel, { color: colors.onSurface }]}>{blockLabel}</Text>
                    <AppIcon name="chevron.down" size={10} tintColor={colors.onSurfaceVariant} />
                  </Pressable>
                </GlassView>
              ) : (
                <Pressable
                  onPress={openBlockDropdown}
                  style={[styles.blockPickerGlass, { backgroundColor: colors.surfaceDisabled }]}
                >
                  <Text style={[styles.blockLabel, { color: colors.onSurface }]}>{blockLabel}</Text>
                  <AppIcon name="chevron.down" size={10} tintColor={colors.onSurfaceVariant} />
                </Pressable>
              )}
            </View>
          )}

          <TouchableOpacity onPress={() => goDay(1)} hitSlop={12}>
            <AppIcon name="chevron.right" size={14} tintColor={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* Hamburger menu button — fixed right */}
        {glassIconButton(
          () => { haptics.light(); onTogglePanel(); },
          'line.3.horizontal',
        )}
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

      {/* Block dropdown popover — anchored to the block picker button */}
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
          {(() => {
            const dropdownItems = blocks.map((block, index) => {
              const isActive = index === activeBlockIndex;
              const label = formatTime12(block.block_time);
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    haptics.selection();
                    onBlockChange(index);
                    setShowBlockDropdown(false);
                  }}
                  style={[
                    styles.dropdownItem,
                    isActive && { backgroundColor: colors.primaryTransparent },
                    index < blocks.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: 'rgba(128,128,128,0.2)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      { color: isActive ? colors.primary : colors.onSurface },
                      isActive && { fontWeight: fontWeights.semibold },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            });

            const menuPos = {
              top: dropdownPos.y,
              left: dropdownPos.x,
              minWidth: dropdownPos.width,
            };

            if (GlassView) {
              return (
                <GlassView style={[styles.dropdownMenu, menuPos]}>
                  {dropdownItems}
                </GlassView>
              );
            }

            return (
              <View
                style={[
                  styles.dropdownMenu,
                  menuPos,
                  { backgroundColor: colors.surface, borderColor: colors.outline, borderWidth: 1 },
                ]}
              >
                {dropdownItems}
              </View>
            );
          })()}
        </Pressable>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[2],
  },
  glassButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassButtonInner: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dateButton: {
    paddingVertical: spacing[1],
  },
  dateText: {
    ...typography.labelLarge,
    fontWeight: fontWeights.semibold,
  },
  blockPickerGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  blockPickerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  blockLabel: {
    ...typography.labelLarge,
    fontWeight: fontWeights.semibold,
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
  dropdownBackdrop: {
    flex: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
  },
  dropdownItem: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  dropdownItemText: {
    ...typography.bodySmall,
    fontWeight: fontWeights.medium,
  },
});
