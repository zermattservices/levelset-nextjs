/**
 * SetupBoard — main orchestrator for the mobile setup page.
 *
 * Layout follows the Levi sliding menu pattern:
 * - Employee panel sits BEHIND main content on the RIGHT side
 * - Main content panel slides LEFT with rounded corners to reveal it
 * - Pan gesture on content panel to open/close
 *
 * Data strategy: prefetch current + previous week for both FOH & BOH
 * on mount so that toggling date/zone is instant with no reloads.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, ActivityIndicator, StyleSheet,
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
  setupAssignAuth,
  setupUnassignAuth,
  type SetupBlock,
  type SetupPosition,
  type SetupEmployee,
  type SetupAssignment,
  type SetupBoardResponse,
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

// ── Assignment filtering helpers (copied from dashboard setup-assignments.ts) ──
// These replicate the exact server-side filtering the dashboard API does when
// fetching assignments per-block. The mobile API returns ALL assignments for the
// date, so we filter client-side using the identical logic.

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function minutesToTime(minutes: number): string {
  const normalizedMinutes = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h = Math.floor(normalizedMinutes / 60);
  const m = normalizedMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function resolveAssignmentWindow(
  requestedStartTime: string,
  requestedEndTime: string,
  shiftStartTime: string,
  shiftEndTime: string,
): { startTime: string; endTime: string } | null {
  const blockStart = parseTimeToMinutes(requestedStartTime);
  const blockEnd = parseTimeToMinutes(requestedEndTime);
  const shiftStart = parseTimeToMinutes(shiftStartTime);
  const shiftEnd = parseTimeToMinutes(shiftEndTime);
  const start = Math.max(blockStart, shiftStart);
  const end = Math.min(blockEnd, shiftEnd);
  if (end <= start) return null;
  return { startTime: minutesToTime(start), endTime: minutesToTime(end) };
}

function hasStrictOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return parseTimeToMinutes(startA) < parseTimeToMinutes(endB)
    && parseTimeToMinutes(endA) > parseTimeToMinutes(startB);
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Generate date strings for current + previous week (14 days total) */
function getPrefetchDates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  // Previous 7 days + today + next 6 days = cover current & prev week
  for (let i = -7; i <= 6; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(formatDateStr(d));
  }
  return dates;
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [panelVisible, setPanelVisible] = useState(false);

  // Local cache: key = "date:zone" → SetupBoardResponse
  const localCache = useRef<Map<string, SetupBoardResponse>>(new Map());
  const prefetchStarted = useRef(false);
  // Tracks desired block start time across zone changes so we can match the
  // closest block instead of resetting to "now". null = use auto-select "now".
  const desiredBlockStart = useRef<string | null>(null);

  const dateStr = useMemo(() => formatDateStr(selectedDate), [selectedDate]);

  // ── Prefetch current + previous week on mount ──
  useEffect(() => {
    if (!session?.access_token || !selectedLocationId || prefetchStarted.current) return;
    prefetchStarted.current = true;

    const dates = getPrefetchDates();
    const zones: ('FOH' | 'BOH')[] = ['FOH', 'BOH'];
    const todayStr = formatDateStr(new Date());

    // Fetch today's data for the default zone first (blocking)
    (async () => {
      try {
        const data = await fetchSetupBoardAuth(
          session.access_token, selectedLocationId, todayStr, 'FOH'
        );
        localCache.current.set(`${todayStr}:FOH`, data);
        // Apply to state immediately
        setBlocks(data.blocks);
        setPositions(data.positions);
        setEmployees(data.employees);
        setAssignments(data.assignments);
      } catch (err) {
        console.error('Failed to fetch initial setup data:', err);
      } finally {
        setInitialLoading(false);
      }

      // Background prefetch remaining combinations
      for (const z of zones) {
        for (const d of dates) {
          const key = `${d}:${z}`;
          if (localCache.current.has(key)) continue;
          try {
            const data = await fetchSetupBoardAuth(
              session.access_token, selectedLocationId, d, z
            );
            localCache.current.set(key, data);
          } catch {
            // Silently skip failures for background prefetch
          }
        }
      }
    })();
  }, [session?.access_token, selectedLocationId]);

  // ── Apply cached data when date or zone changes ──
  useEffect(() => {
    if (initialLoading) return;
    const key = `${dateStr}:${zone}`;
    const cached = localCache.current.get(key);
    if (cached) {
      setBlocks(cached.blocks);
      setPositions(cached.positions);
      setEmployees(cached.employees);
      setAssignments(cached.assignments);
    } else {
      // Cache miss — fetch on demand (for dates outside prefetch window)
      if (!session?.access_token || !selectedLocationId) return;
      (async () => {
        try {
          const data = await fetchSetupBoardAuth(
            session.access_token, selectedLocationId, dateStr, zone
          );
          localCache.current.set(key, data);
          setBlocks(data.blocks);
          setPositions(data.positions);
          setEmployees(data.employees);
          setAssignments(data.assignments);
        } catch (err) {
          console.error('Failed to fetch setup data:', err);
        }
      })();
    }
  }, [dateStr, zone, initialLoading, session?.access_token, selectedLocationId]);

  const activeBlock = blocks[activeBlockIndex] ?? null;

  // ── Filter assignments to the active block ──
  // Replicates the exact 3-step filtering from the dashboard's
  // setup-assignments.ts GET handler (lines 68-111):
  //   1. Half-open overlap (matches DB .gt/.lt)
  //   2. Clamp to shift window (resolveAssignmentWindow)
  //   3. Re-check strict overlap after clamping (hasStrictOverlap)
  const blockAssignments = useMemo(() => {
    if (!activeBlock) return [];
    const blockStart = activeBlock.block_time;
    const blockEnd = activeBlock.end_time;

    return assignments
      // Step 1: half-open overlap (matches DB filter .gt('end_time', start_time).lt('start_time', end_time))
      .filter((a) =>
        parseTimeToMinutes(a.end_time) > parseTimeToMinutes(blockStart) &&
        parseTimeToMinutes(a.start_time) < parseTimeToMinutes(blockEnd)
      )
      // Step 2+3: clamp to shift window, re-check strict overlap
      .map((assignment) => {
        const shiftStart = assignment.shift?.start_time;
        const shiftEnd = assignment.shift?.end_time;
        if (!shiftStart || !shiftEnd) return assignment;

        const clamped = resolveAssignmentWindow(
          assignment.start_time, assignment.end_time,
          shiftStart, shiftEnd,
        );
        if (!clamped) return null;

        return { ...assignment, start_time: clamped.startTime, end_time: clamped.endTime };
      })
      .filter((a): a is SetupAssignment => {
        if (!a) return false;
        return hasStrictOverlap(a.start_time, a.end_time, blockStart, blockEnd);
      });
  }, [assignments, activeBlock]);

  // Auto-select block: match desired start time (from zone toggle) or pick "now"
  useEffect(() => {
    if (blocks.length === 0) {
      setActiveBlockIndex(0);
      return;
    }

    const target = desiredBlockStart.current;
    if (target) {
      // Zone toggle: find closest block >= the previously selected start time
      desiredBlockStart.current = null;
      const targetMin = parseTime(target);
      let best = 0;
      let found = false;
      for (let i = 0; i < blocks.length; i++) {
        const start = parseTime(blocks[i].block_time);
        if (start === targetMin) { best = i; found = true; break; }
        if (start > targetMin && !found) { best = i; found = true; break; }
      }
      // If no block >= target, pick the last block
      if (!found) best = blocks.length - 1;
      setActiveBlockIndex(best);
    } else {
      // Initial load / date change: auto-select block containing "now"
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
    }
  }, [blocks]);

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
        const raw = 1 + (e.translationX / DRAWER_WIDTH);
        progress.value = Math.max(0, Math.min(1, raw));
      } else {
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

  // Assign handler — also update local cache
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
      setAssignments((prev) => {
        const updated = [...prev, assignment];
        // Update local cache too
        const key = `${dateStr}:${zone}`;
        const cached = localCache.current.get(key);
        if (cached) localCache.current.set(key, { ...cached, assignments: updated });
        return updated;
      });
    } catch (err) {
      console.error('Assign failed:', err);
      haptics.error();
    }
  }, [session?.access_token, selectedLocationId, activeBlock, dateStr, zone]);

  // Unassign handler — also update local cache
  const handleUnassign = useCallback(async (assignmentId: string) => {
    if (!session?.access_token || !selectedLocationId) return;
    try {
      await setupUnassignAuth(session.access_token, selectedLocationId, assignmentId);
      setAssignments((prev) => {
        const updated = prev.filter((a) => a.id !== assignmentId);
        const key = `${dateStr}:${zone}`;
        const cached = localCache.current.get(key);
        if (cached) localCache.current.set(key, { ...cached, assignments: updated });
        return updated;
      });
    } catch (err) {
      console.error('Unassign failed:', err);
      haptics.error();
    }
  }, [session?.access_token, selectedLocationId, dateStr, zone]);

  // Zone change — save current block start time so we can match it in the new zone
  const handleZoneChange = useCallback((newZone: 'FOH' | 'BOH') => {
    const currentBlock = blocks[activeBlockIndex];
    if (currentBlock) {
      desiredBlockStart.current = currentBlock.block_time;
    }
    setZone(newZone);
  }, [blocks, activeBlockIndex]);

  const handleTogglePanel = useCallback(() => {
    haptics.light();
    setPanelVisible((v) => !v);
  }, []);

  const handleOverlayPress = useCallback(() => {
    haptics.light();
    setPanelVisible(false);
  }, []);

  if (initialLoading) {
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
          assignments={blockAssignments}
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
            assignments={blockAssignments}
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
