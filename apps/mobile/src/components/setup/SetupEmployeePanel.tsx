/**
 * SetupEmployeePanel — right-side sliding panel with FOH/BOH toggle,
 * search bar, and employee list for drag-and-drop assignment.
 */

import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, useWindowDimensions, Pressable,
} from 'react-native';
import ReAnimated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGlass } from '../../hooks/useGlass';
import { useColors } from '../../context/ThemeContext';
import { typography, fontWeights } from '../../lib/fonts';
import { spacing, borderRadius, haptics } from '../../lib/theme';
import { AppIcon } from '../ui';
import type { SetupEmployee, SetupAssignment } from '../../lib/api';

const FOH_COLOR = '#006391';
const BOH_COLOR = '#ffcc5b';
const PANEL_WIDTH_RATIO = 0.6;

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

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

interface SetupEmployeePanelProps {
  visible: boolean;
  onClose: () => void;
  employees: SetupEmployee[];
  assignments: SetupAssignment[];
  zone: 'FOH' | 'BOH';
  onZoneChange: (zone: 'FOH' | 'BOH') => void;
  activeBlockStart?: string;
  activeBlockEnd?: string;
}

export function SetupEmployeePanel({
  visible, onClose,
  employees, assignments,
  zone, onZoneChange,
  activeBlockStart, activeBlockEnd,
}: SetupEmployeePanelProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { GlassView } = useGlass();
  const { width: screenWidth } = useWindowDimensions();
  const panelWidth = screenWidth * PANEL_WIDTH_RATIO;
  const [search, setSearch] = useState('');

  const translateX = useSharedValue(panelWidth);

  React.useEffect(() => {
    translateX.value = visible
      ? withSpring(0, { damping: 28, stiffness: 300, mass: 0.8 })
      : withTiming(panelWidth, { duration: 200 });
  }, [visible, panelWidth]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Filter employees for this block's time range
  const blockEmployees = useMemo(() => {
    if (!activeBlockStart || !activeBlockEnd) return employees;
    const blockStartMin = parseTime(activeBlockStart);
    const blockEndMin = parseTime(activeBlockEnd);

    return employees.filter((emp) => {
      const shiftStart = parseTime(emp.shift.start_time);
      let shiftEnd = parseTime(emp.shift.end_time);
      if (shiftEnd <= shiftStart) shiftEnd += 24 * 60; // overnight
      return shiftStart < blockEndMin && shiftEnd > blockStartMin;
    });
  }, [employees, activeBlockStart, activeBlockEnd]);

  const assignedIds = useMemo(
    () => new Set(assignments.map((a) => a.employee_id)),
    [assignments]
  );

  const filtered = useMemo(() => {
    let list = blockEmployees;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.full_name.toLowerCase().includes(q));
    }
    // Sort: unassigned first, then by shift start, then name
    return [...list].sort((a, b) => {
      const aAssigned = assignedIds.has(a.id);
      const bAssigned = assignedIds.has(b.id);
      if (aAssigned && !bAssigned) return 1;
      if (!aAssigned && bAssigned) return -1;
      const aStart = parseTime(a.shift.start_time);
      const bStart = parseTime(b.shift.start_time);
      if (aStart !== bStart) return aStart - bStart;
      return a.full_name.localeCompare(b.full_name);
    });
  }, [blockEmployees, search, assignedIds]);

  const Container = GlassView || View;
  const containerBg = GlassView ? {} : { backgroundColor: colors.background };

  return (
    <>
      {/* Backdrop */}
      {visible && (
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={onClose}
        />
      )}

      {/* Panel */}
      <ReAnimated.View style={[styles.panel, { width: panelWidth, right: 0 }, panelStyle]}>
        <Container style={[styles.panelInner, containerBg, { paddingTop: insets.top + spacing[2] }]}>
          {/* FOH/BOH toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              onPress={() => { haptics.selection(); onZoneChange('FOH'); }}
              style={[
                styles.toggleBtn,
                zone === 'FOH' && { backgroundColor: FOH_COLOR },
                zone !== 'FOH' && { backgroundColor: colors.surfaceVariant },
              ]}
            >
              <Text style={[styles.toggleText, { color: zone === 'FOH' ? '#fff' : colors.onSurface }]}>
                {t('setup.foh')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { haptics.selection(); onZoneChange('BOH'); }}
              style={[
                styles.toggleBtn,
                zone === 'BOH' && { backgroundColor: BOH_COLOR },
                zone !== 'BOH' && { backgroundColor: colors.surfaceVariant },
              ]}
            >
              <Text style={[styles.toggleText, { color: zone === 'BOH' ? '#000' : colors.onSurface }]}>
                {t('setup.boh')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: colors.surfaceVariant, borderColor: colors.outline }]}>
            <AppIcon name="magnifyingglass" size={14} tintColor={colors.onSurfaceDisabled} />
            <TextInput
              style={[styles.searchInput, { color: colors.onSurface }]}
              placeholder={t('setup.searchEmployees')}
              placeholderTextColor={colors.onSurfaceDisabled}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Employee list */}
          <FlatList
            data={filtered}
            keyExtractor={(e) => e.id}
            contentContainerStyle={{ paddingBottom: spacing[10] + insets.bottom }}
            renderItem={({ item }) => {
              const isAssigned = assignedIds.has(item.id);
              const name = formatName(item.full_name);
              const shiftTime = `${formatTime12Short(item.shift.start_time)} – ${formatTime12Short(item.shift.end_time)}`;

              return (
                <View style={[styles.employeeCard, isAssigned && { opacity: 0.4 }]}>
                  <Text style={[styles.empName, { color: colors.onSurface }]} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={[styles.empShift, { color: colors.onSurfaceVariant }]}>
                    {shiftTime}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.onSurfaceDisabled }]}>
                {search ? t('setup.noResults') : t('setup.noEmployees')}
              </Text>
            }
          />
        </Container>
      </ReAnimated.View>
    </>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 100,
  },
  panelInner: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    marginBottom: spacing[3],
  },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderCurve: 'continuous',
  },
  toggleText: {
    ...typography.labelSmall,
    fontWeight: fontWeights.semibold,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginHorizontal: spacing[3],
    marginBottom: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySmall,
    padding: 0,
  },
  employeeCard: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  empName: {
    ...typography.bodySmall,
    fontWeight: fontWeights.medium,
  },
  empShift: {
    fontSize: 11,
    marginTop: 1,
  },
  emptyText: {
    ...typography.bodySmall,
    textAlign: 'center',
    padding: spacing[6],
  },
});
