/**
 * SetupBoard — main orchestrator for the mobile setup page.
 * Manages state, data fetching, drag-and-drop flow, and composition.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useColors } from '../../context/ThemeContext';
import { spacing } from '../../lib/theme';
import { haptics } from '../../lib/theme';
import { DragProvider } from './DragContext';
import { SetupHeader } from './SetupHeader';
import { SetupPositionGrid } from './SetupPositionGrid';
import { SetupEmployeePanel } from './SetupEmployeePanel';
import { DragOverlay } from './DragOverlay';
import {
  fetchSetupBoardAuth,
  invalidateSetupCache,
  setupAssignAuth,
  setupUnassignAuth,
  type SetupBlock,
  type SetupPosition,
  type SetupEmployee,
  type SetupAssignment,
} from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function SetupBoardInner() {
  const colors = useColors();
  const { session } = useAuth();
  const { selectedLocationId } = useLocation();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [zone, setZone] = useState<'FOH' | 'BOH'>('FOH');
  const [blocks, setBlocks] = useState<SetupBlock[]>([]);
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [positions, setPositions] = useState<SetupPosition[]>([]);
  const [employees, setEmployees] = useState<SetupEmployee[]>([]);
  const [assignments, setAssignments] = useState<SetupAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelVisible, setPanelVisible] = useState(false);

  const dateStr = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  const activeBlock = blocks[activeBlockIndex] ?? null;

  // Auto-select block containing "now"
  useEffect(() => {
    if (blocks.length === 0) {
      setActiveBlockIndex(0);
      return;
    }
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let best = 0;
    for (let i = 0; i < blocks.length; i++) {
      const start = parseTime(blocks[i].block_time);
      const end = parseTime(blocks[i].end_time);
      if (nowMin >= start && nowMin < end) { best = i; break; }
      if (start <= nowMin) best = i;
    }
    setActiveBlockIndex(best);
  }, [blocks]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!session?.access_token || !selectedLocationId) return;
    setLoading(true);
    try {
      invalidateSetupCache(selectedLocationId, dateStr, zone);
      const data = await fetchSetupBoardAuth(
        session.access_token, selectedLocationId, dateStr, zone
      );
      setBlocks(data.blocks);
      setPositions(data.positions);
      setEmployees(data.employees);
      setAssignments(data.assignments);
    } catch (err) {
      console.error('Failed to fetch setup data:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, selectedLocationId, dateStr, zone]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Assign handler
  const handleAssign = useCallback(async (
    employeeId: string, shiftId: string, positionId: string
  ) => {
    if (!session?.access_token || !selectedLocationId || !activeBlock) return;
    try {
      const { assignment } = await setupAssignAuth(
        session.access_token, selectedLocationId, {
          shift_id: shiftId,
          employee_id: employeeId,
          position_id: positionId,
          assignment_date: dateStr,
          start_time: activeBlock.block_time,
          end_time: activeBlock.end_time,
        }
      );
      // Optimistic update
      setAssignments((prev) => [...prev, assignment]);
    } catch (err) {
      console.error('Assign failed:', err);
      haptics.error();
    }
  }, [session?.access_token, selectedLocationId, activeBlock, dateStr]);

  // Unassign handler
  const handleUnassign = useCallback(async (assignmentId: string) => {
    if (!session?.access_token || !selectedLocationId) return;
    try {
      await setupUnassignAuth(session.access_token, selectedLocationId, assignmentId);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    } catch (err) {
      console.error('Unassign failed:', err);
      haptics.error();
    }
  }, [session?.access_token, selectedLocationId]);

  // Zone change refetches data
  const handleZoneChange = useCallback((newZone: 'FOH' | 'BOH') => {
    setZone(newZone);
    setPanelVisible(true);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SetupHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        blocks={blocks}
        activeBlockIndex={activeBlockIndex}
        onBlockChange={setActiveBlockIndex}
        onTogglePanel={() => setPanelVisible((v) => !v)}
      />

      <SetupPositionGrid
        activeBlock={activeBlock}
        positions={positions}
        assignments={assignments}
      />

      <SetupEmployeePanel
        visible={panelVisible}
        onClose={() => setPanelVisible(false)}
        employees={employees}
        assignments={assignments}
        zone={zone}
        onZoneChange={handleZoneChange}
        activeBlockStart={activeBlock?.block_time}
        activeBlockEnd={activeBlock?.end_time}
      />

      <DragOverlay />
    </View>
  );
}

export function SetupBoard() {
  return (
    <DragProvider>
      <SetupBoardInner />
    </DragProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
