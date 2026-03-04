/**
 * SetupBoard — main orchestrator for the mobile setup page.
 *
 * Layout follows the Levi sliding menu pattern:
 * - Employee panel sits BEHIND main content on the RIGHT side
 * - Main content panel slides LEFT with rounded corners to reveal it
 * - Pan gesture on content panel to open/close
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ActivityIndicator, StyleSheet,
  useWindowDimensions, Pressable,
} from 'react-native';
import ReAnimated, {
  useSharedValue, useAnimatedStyle, withSpring, interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
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

// Match Levi menu spring config
const SPRING_CONFIG = {
  damping: 28,
  stiffness: 280,
  mass: 0.8,
};

const PANEL_RADIUS = 64;

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function SetupBoardInner() {
  const colors = useColors();
  const { session } = useAuth();
  const { selectedLocationId } = useLocation();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const DRAWER_WIDTH = SCREEN_WIDTH * 0.5;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [zone, setZone] = useState<'FOH' | 'BOH'>('FOH');
  const [blocks, setBlocks] = useState<SetupBlock[]>([]);
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [positions, setPositions] = useState<SetupPosition[]>([]);
  const [employees, setEmployees] = useState<SetupEmployee[]>([]);
  const [assignments, setAssignments] = useState<SetupAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelVisible, setPanelVisible] = useState(false);

  // Sliding menu animation (0 = closed, 1 = open)
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(panelVisible ? 1 : 0, SPRING_CONFIG);
  }, [panelVisible]);

  // Pan gesture for content panel — swipe left to open, right to close
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      'worklet';
      if (panelVisible) {
        // Panel is open — swipe right to close (positive translationX)
        const raw = 1 + (e.translationX / DRAWER_WIDTH);
        progress.value = Math.max(0, Math.min(1, raw));
      } else {
        // Panel is closed — swipe left to open (negative translationX)
        const raw = -e.translationX / DRAWER_WIDTH;
        progress.value = Math.max(0, Math.min(1, raw));
      }
    })
    .onEnd((e) => {
      'worklet';
      const snapThreshold = 0.4;
      const velocityThreshold = 500;
      let shouldOpen: boolean;

      if (panelVisible) {
        shouldOpen = progress.value > snapThreshold && e.velocityX < velocityThreshold;
      } else {
        shouldOpen = progress.value > snapThreshold || e.velocityX < -velocityThreshold;
      }

      progress.value = withSpring(shouldOpen ? 1 : 0, SPRING_CONFIG);
      runOnJS(setPanelVisible)(shouldOpen);
    });

  // Content panel animation — slides LEFT to reveal right-side drawer
  const contentAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 1], [0, -DRAWER_WIDTH]);
    const radius = interpolate(progress.value, [0, 1], [0, PANEL_RADIUS]);
    return {
      transform: [{ translateX }],
      borderRadius: radius,
    };
  });

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

  // Zone change
  const handleZoneChange = useCallback((newZone: 'FOH' | 'BOH') => {
    setZone(newZone);
  }, []);

  const handleTogglePanel = useCallback(() => {
    haptics.light();
    setPanelVisible((v) => !v);
  }, []);

  const handleOverlayPress = useCallback(() => {
    haptics.light();
    setPanelVisible(false);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.surfaceVariant }]}>
      {/* Sidebar layer (sits BEHIND, always mounted, on the RIGHT) */}
      <View style={[styles.sidebarContainer, { width: DRAWER_WIDTH, right: 0 }]}>
        <SetupEmployeePanel
          employees={employees}
          assignments={assignments}
          zone={zone}
          onZoneChange={handleZoneChange}
          activeBlockStart={activeBlock?.block_time}
          activeBlockEnd={activeBlock?.end_time}
        />
      </View>

      {/* Main content panel (slides LEFT to reveal right-side sidebar) */}
      <GestureDetector gesture={panGesture}>
        <ReAnimated.View
          style={[
            styles.contentPanel,
            { backgroundColor: colors.background },
            contentAnimatedStyle,
          ]}
        >
          <SetupHeader
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            blocks={blocks}
            activeBlockIndex={activeBlockIndex}
            onBlockChange={setActiveBlockIndex}
            onTogglePanel={handleTogglePanel}
          />

          <SetupPositionGrid
            activeBlock={activeBlock}
            positions={positions}
            assignments={assignments}
          />

          {/* Tap overlay to close when menu open */}
          {panelVisible && (
            <Pressable
              style={styles.tapOverlay}
              onPress={handleOverlayPress}
            />
          )}

          <DragOverlay />
        </ReAnimated.View>
      </GestureDetector>
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
  root: {
    flex: 1,
  },
  sidebarContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  contentPanel: {
    flex: 1,
    overflow: 'hidden',
    borderCurve: 'continuous',
    // Shadow on the left edge of content when sliding
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
});
