/**
 * SetupEmployeePanel — Levi-style sliding drawer on the RIGHT side.
 * The sidebar sits BEHIND the main content. The main content slides LEFT
 * with rounded corners to reveal the employee list.
 *
 * This component renders the sidebar content only. The parent (SetupBoard)
 * handles the content panel animation via the `progress` shared value.
 */

import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useGlass } from '../../hooks/useGlass';
import { useColors } from '../../context/ThemeContext';
import { typography, fontWeights } from '../../lib/fonts';
import { spacing, borderRadius, haptics } from '../../lib/theme';
import { AppIcon } from '../ui';
import { DraggableEmployee } from './DraggableEmployee';
import type { SetupEmployee, SetupAssignment } from '../../lib/api';

const FOH_COLOR = '#006391';
const BOH_COLOR = '#ffcc5b';

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

interface SetupEmployeePanelProps {
  employees: SetupEmployee[];
  assignments: SetupAssignment[];
  zone: 'FOH' | 'BOH';
  onZoneChange: (zone: 'FOH' | 'BOH') => void;
  onAssign: (employeeId: string, shiftId: string, positionId: string) => void;
  onDragStart?: () => void;
  activeBlockStart?: string;
  activeBlockEnd?: string;
}

export function SetupEmployeePanel({
  employees, assignments,
  zone, onZoneChange, onAssign, onDragStart,
  activeBlockStart, activeBlockEnd,
}: SetupEmployeePanelProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { GlassView } = useGlass();
  const [search, setSearch] = useState('');

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

  // FOH/BOH toggle button content
  const toggleContent = (
    <View style={styles.toggleRow}>
      <TouchableOpacity
        onPress={() => { haptics.selection(); onZoneChange('FOH'); }}
        style={[
          styles.toggleBtn,
          zone === 'FOH' && { backgroundColor: FOH_COLOR },
          zone !== 'FOH' && { backgroundColor: 'transparent' },
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
          zone !== 'BOH' && { backgroundColor: 'transparent' },
        ]}
      >
        <Text style={[styles.toggleText, { color: zone === 'BOH' ? '#000' : colors.onSurface }]}>
          {t('setup.boh')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing[4],
        },
      ]}
    >
      {/* Title - matching Levi menu style */}
      <Text style={[styles.title, { color: colors.onSurface }]}>
        {t('setup.employees')}
      </Text>

      {/* FOH/BOH toggle — liquid glass style */}
      <View style={styles.toggleContainer}>
        {GlassView ? (
          <GlassView isInteractive style={styles.glassToggle}>
            {toggleContent}
          </GlassView>
        ) : (
          <View style={[styles.fallbackToggle, { backgroundColor: colors.surfaceVariant }]}>
            {toggleContent}
          </View>
        )}
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

          return (
            <DraggableEmployee
              employee={item}
              isAssigned={isAssigned}
              onDragStart={onDragStart}
              onDragEnd={(dropZone) => {
                if (dropZone && !isAssigned) {
                  onAssign(item.id, item.shift.id, dropZone.positionId);
                }
              }}
            />
          );
        }}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.onSurfaceDisabled }]}>
            {search ? t('setup.noResults') : t('setup.noEmployees')}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing[5],
  },
  title: {
    ...typography.h1,
    marginBottom: spacing[6],
  },
  toggleContainer: {
    marginBottom: spacing[3],
  },
  glassToggle: {
    borderRadius: borderRadius.full,
  },
  fallbackToggle: {
    borderRadius: borderRadius.full,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing[1],
    padding: spacing[1],
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
  emptyText: {
    ...typography.bodySmall,
    textAlign: 'center',
    padding: spacing[6],
  },
});
