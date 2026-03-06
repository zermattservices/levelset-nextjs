/**
 * TodayCard Component
 * Shows the employee's schedule for a given day on the home screen.
 * Supports navigating ±7 days with smooth sliding transitions.
 * Footer "Go to the setup" link is always visible.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  LayoutChangeEvent,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useColors } from "../context/ThemeContext";
import { typography, fontWeights, fontSizes } from "../lib/fonts";
import { spacing, haptics } from "../lib/theme";
import { GlassCard } from "./glass";
import { AppIcon } from "./ui";
import { fetchMyTodayAuth } from "../lib/api";
import type {
  MyTodayResponse,
  TodayEntry,
  TodaySetupAssignment,
  TodayShift,
} from "../lib/api";

const FOH_COLOR = "#006391";
const BOH_COLOR = "#ffcc5b";
const MAX_DAYS_OFFSET = 7;
const SLIDE_DURATION = 250;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map((part) => parseInt(part, 10));
  return (h || 0) * 60 + (m || 0);
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return toYMD(d);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T12:00:00");
  const db = new Date(b + "T12:00:00");
  return Math.round((da.getTime() - db.getTime()) / 86400000);
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getDateLabel(dateStr: string, todayStr: string): string {
  const diff = daysBetween(dateStr, todayStr);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  const d = new Date(dateStr + "T12:00:00");
  return `${WEEKDAY_SHORT[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

function buildShiftTreeFromEntries(entries: TodayEntry[]): TodayShift[] {
  const sorted = [...entries].sort(
    (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );

  const shifts: TodayShift[] = sorted
    .filter((entry) => entry.type === "shift")
    .map((entry, idx) => ({
      id: `entry-shift-${idx}-${entry.start_time}-${entry.end_time}`,
      label: entry.label,
      start_time: entry.start_time,
      end_time: entry.end_time,
      zone: null,
      setup_assignments: [],
    }));

  const positions = sorted.filter((entry) => entry.type === "position");
  for (const position of positions) {
    const positionStart = timeToMinutes(position.start_time);
    const positionEnd = timeToMinutes(position.end_time);

    const parentShift = shifts.find((shift) => {
      const shiftStart = timeToMinutes(shift.start_time);
      const shiftEnd = timeToMinutes(shift.end_time);
      return positionStart >= shiftStart && positionEnd <= shiftEnd;
    });

    if (!parentShift) continue;

    parentShift.setup_assignments.push({
      id: `entry-pos-${position.label}-${position.start_time}-${position.end_time}`,
      label: position.label,
      start_time: position.start_time,
      end_time: position.end_time,
    });
  }

  for (const shift of shifts) {
    shift.setup_assignments.sort(
      (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
    );
  }

  return shifts;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TodayCardProps {
  accessToken: string | null;
  locationId: string | null;
  employeeId: string | null;
  refreshKey?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TodayCard({
  accessToken,
  locationId,
  employeeId,
  refreshKey,
}: TodayCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { height: viewportHeight, width: viewportWidth } =
    useWindowDimensions();

  const todayStr = useRef(toYMD(new Date())).current;
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Data per-date cache + in-flight promise dedup
  const cache = useRef<Record<string, { data: MyTodayResponse | null; error: string | null }>>({});
  const inflight = useRef<Record<string, Promise<void>>>({});
  const [currentData, setCurrentData] = useState<MyTodayResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prefetchedRef = useRef(false);

  // Slide animation
  const [contentWidth, setContentWidth] = useState(viewportWidth - spacing[5] * 2);
  const slideX = useSharedValue(0);
  const slideOpacity = useSharedValue(1);
  const isAnimating = useRef(false);

  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
    opacity: slideOpacity.value,
  }));

  // Fetch a single day (deduped, populates cache)
  const fetchSingleDay = useCallback(
    async (date: string, token: string, locId: string, empId: string) => {
      if (cache.current[date]) return;
      if (inflight.current[date]) {
        await inflight.current[date];
        return;
      }

      const promise = (async () => {
        try {
          const data = await fetchMyTodayAuth(token, locId, empId, date);
          cache.current[date] = { data, error: null };
        } catch (err: any) {
          if (err?.status === 403 || err?.status === 404) {
            cache.current[date] = {
              data: { status: "not_scheduled", date },
              error: null,
            };
          } else {
            cache.current[date] = {
              data: null,
              error: err?.message || "Failed to load",
            };
          }
        } finally {
          delete inflight.current[date];
        }
      })();

      inflight.current[date] = promise;
      await promise;
    },
    []
  );

  // Load the selected day into state from cache
  const loadDayIntoState = useCallback(
    async (date: string) => {
      if (!accessToken || !locationId || !employeeId) {
        setIsLoading(false);
        return;
      }

      const cached = cache.current[date];
      if (cached) {
        setCurrentData(cached.data);
        setError(cached.error);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      await fetchSingleDay(date, accessToken, locationId, employeeId);

      const result = cache.current[date];
      if (result) {
        setCurrentData(result.data);
        setError(result.error);
      }
      setIsLoading(false);
    },
    [accessToken, locationId, employeeId, fetchSingleDay]
  );

  // Load selected day when it changes
  useEffect(() => {
    loadDayIntoState(selectedDate);
  }, [selectedDate, loadDayIntoState]);

  // Prefetch entire ±7 day range in the background on mount
  useEffect(() => {
    if (!accessToken || !locationId || !employeeId) return;
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;

    const dates: string[] = [];
    for (let i = -MAX_DAYS_OFFSET; i <= MAX_DAYS_OFFSET; i++) {
      dates.push(addDays(todayStr, i));
    }

    // Fire all in parallel, no await — they fill the cache silently
    dates.forEach((d) => fetchSingleDay(d, accessToken, locationId, employeeId));
  }, [accessToken, locationId, employeeId, todayStr, fetchSingleDay]);

  // Pull-to-refresh: clear all cached days and re-fetch everything
  const lastRefreshKey = useRef(refreshKey);
  useEffect(() => {
    if (refreshKey === undefined || refreshKey === lastRefreshKey.current) return;
    lastRefreshKey.current = refreshKey;

    if (!accessToken || !locationId || !employeeId) return;

    // Wipe the entire cache and inflight map
    cache.current = {};
    inflight.current = {};
    prefetchedRef.current = false;

    // Re-fetch all ±7 days in the background
    const dates: string[] = [];
    for (let i = -MAX_DAYS_OFFSET; i <= MAX_DAYS_OFFSET; i++) {
      dates.push(addDays(todayStr, i));
    }
    dates.forEach((d) => fetchSingleDay(d, accessToken, locationId, employeeId));

    // Re-load the currently selected day into state
    loadDayIntoState(selectedDate);
  }, [refreshKey, accessToken, locationId, employeeId, todayStr, selectedDate, fetchSingleDay, loadDayIntoState]);

  const offset = daysBetween(selectedDate, todayStr);
  const canGoBack = offset > -MAX_DAYS_OFFSET;
  const canGoForward = offset < MAX_DAYS_OFFSET;

  const navigate = useCallback(
    (direction: -1 | 1) => {
      if (isAnimating.current) return;
      if (direction === -1 && !canGoBack) return;
      if (direction === 1 && !canGoForward) return;

      isAnimating.current = true;
      haptics.light();
      const nextDate = addDays(selectedDate, direction);
      const slideOut = -direction * contentWidth;

      slideX.value = withTiming(slideOut, {
        duration: SLIDE_DURATION / 2,
        easing: Easing.in(Easing.ease),
      });
      slideOpacity.value = withTiming(0, {
        duration: SLIDE_DURATION / 2,
      });

      setTimeout(() => {
        setSelectedDate(nextDate);

        slideX.value = direction * contentWidth * 0.3;
        slideOpacity.value = 0;

        slideX.value = withTiming(0, {
          duration: SLIDE_DURATION / 2,
          easing: Easing.out(Easing.ease),
        });
        slideOpacity.value = withTiming(1, {
          duration: SLIDE_DURATION / 2,
        });

        setTimeout(() => {
          isAnimating.current = false;
        }, SLIDE_DURATION / 2);
      }, SLIDE_DURATION / 2);
    },
    [selectedDate, canGoBack, canGoForward, contentWidth, slideX, slideOpacity]
  );

  const onContentLayout = useCallback((e: LayoutChangeEvent) => {
    setContentWidth(e.nativeEvent.layout.width);
  }, []);

  const dateLabel = getDateLabel(selectedDate, todayStr);

  // ── Content area ─────────────────────────────────────────────────────
  const renderContent = () => {
    if (isLoading) {
      return <SkeletonContent colors={colors} />;
    }

    if (error) {
      return (
        <View
          style={{
            padding: spacing[5],
            alignItems: "center",
            justifyContent: "center",
            gap: spacing[2],
            minHeight: 100,
          }}
        >
          <AppIcon
            name="exclamationmark.circle"
            size={28}
            tintColor={colors.onSurfaceDisabled}
          />
          <Text
            selectable
            style={{
              ...typography.bodySmall,
              color: colors.onSurfaceDisabled,
              textAlign: "center",
            }}
          >
            Unable to load schedule
          </Text>
        </View>
      );
    }

    if (currentData?.status === "time_off") {
      return (
        <View
          style={{
            padding: spacing[5],
            alignItems: "center",
            justifyContent: "center",
            gap: spacing[2],
            minHeight: 100,
          }}
        >
          <AppIcon
            name="sun.max.fill"
            size={32}
            tintColor={colors.warning}
          />
          <Text
            selectable
            style={{
              ...typography.labelLarge,
              fontWeight: fontWeights.semibold,
              color: colors.onSurface,
              textAlign: "center",
            }}
          >
            Enjoy your time off!
          </Text>
          {currentData.timeOffNote ? (
            <Text
              selectable
              style={{
                ...typography.bodySmall,
                color: colors.onSurfaceVariant,
                textAlign: "center",
              }}
            >
              {currentData.timeOffNote}
            </Text>
          ) : null}
        </View>
      );
    }

    if (!currentData || currentData.status === "not_scheduled") {
      return (
        <View
          style={{
            padding: spacing[5],
            alignItems: "center",
            justifyContent: "center",
            gap: spacing[2],
            minHeight: 100,
          }}
        >
          <AppIcon
            name="calendar.badge.minus"
            size={28}
            tintColor={colors.onSurfaceDisabled}
          />
          <Text
            selectable
            style={{
              ...typography.bodySmall,
              color: colors.onSurfaceDisabled,
              textAlign: "center",
            }}
          >
            Not scheduled{offset === 0 ? " today" : ""}
          </Text>
        </View>
      );
    }

    const entries = currentData.entries ?? [];
    const shifts =
      currentData.shifts && currentData.shifts.length > 0
        ? currentData.shifts
        : buildShiftTreeFromEntries(entries);

    return (
      <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[3] }}>
        {shifts.length > 0
          ? shifts.map((shift, idx) => (
              <React.Fragment key={`shift-${shift.id}-${idx}`}>
                <ShiftRow shift={shift} colors={colors} />
                {idx < shifts.length - 1 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: colors.outline,
                      marginVertical: spacing[3],
                    }}
                  />
                )}
              </React.Fragment>
            ))
          : entries.map((entry, idx) => (
              <React.Fragment key={`${entry.type}-${entry.label}-${idx}`}>
                <EntryRow entry={entry} colors={colors} />
                {idx < entries.length - 1 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: colors.outline,
                      marginVertical: spacing[3],
                    }}
                  />
                )}
              </React.Fragment>
            ))}
      </View>
    );
  };

  return (
    <GlassCard
      contentStyle={{ padding: 0 }}
    >
      {/* ── Header with date navigation ── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[3],
          borderBottomWidth: 1,
          borderBottomColor: colors.outline,
        }}
      >
        <Pressable
          onPress={() => navigate(-1)}
          disabled={!canGoBack}
          hitSlop={12}
          style={{
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            opacity: canGoBack ? 1 : 0.25,
          }}
        >
          <AppIcon
            name="chevron.left"
            size={16}
            tintColor={colors.onSurfaceVariant}
          />
        </Pressable>

        <Pressable
          onPress={() => {
            if (selectedDate !== todayStr) {
              haptics.light();
              setSelectedDate(todayStr);
              slideX.value = 0;
              slideOpacity.value = 1;
            }
          }}
          hitSlop={8}
        >
          <Text
            style={{
              fontSize: fontSizes.lg,
              fontWeight: fontWeights.semibold,
              color: colors.onSurface,
              textAlign: "center",
            }}
          >
            {dateLabel}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigate(1)}
          disabled={!canGoForward}
          hitSlop={12}
          style={{
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            opacity: canGoForward ? 1 : 0.25,
          }}
        >
          <AppIcon
            name="chevron.right"
            size={16}
            tintColor={colors.onSurfaceVariant}
          />
        </Pressable>
      </View>

      {/* ── Animated content area ── */}
      <ScrollView
        style={{ maxHeight: viewportHeight * 0.25, overflow: "hidden" }}
        onLayout={onContentLayout}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View style={animatedContentStyle}>
          {renderContent()}
        </Animated.View>
      </ScrollView>

      {/* Footer — setup link */}
      <Pressable
        onPress={() => {
          haptics.light();
          router.push("/(tabs)/(home)/todays-setup");
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          marginTop: spacing[3],
          borderTopWidth: 1,
          borderTopColor: colors.outline,
        }}
      >
        <Text
          style={{
            ...typography.labelMedium,
            color: colors.onSurfaceVariant,
          }}
        >
          Go to the setup
        </Text>
        <AppIcon
          name="chevron.right"
          size={14}
          tintColor={colors.onSurfaceVariant}
        />
      </Pressable>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// EntryRow — a single position or shift entry (legacy flat layout)
// ---------------------------------------------------------------------------

function EntryRow({
  entry,
  colors,
}: {
  entry: TodayEntry;
  colors: ReturnType<typeof useColors>;
}) {
  const dotColor = entry.type === "position" ? colors.primary : colors.info;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[3],
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          borderCurve: "continuous",
          backgroundColor: dotColor,
        }}
      />
      <Text
        selectable
        style={{
          ...typography.bodyMedium,
          fontWeight: fontWeights.medium,
          color: colors.onSurface,
          flex: 1,
        }}
        numberOfLines={1}
      >
        {entry.label}
      </Text>
      <Text
        selectable
        style={{
          ...typography.bodySmall,
          color: colors.onSurfaceVariant,
          fontVariant: ["tabular-nums"],
        }}
      >
        {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
      </Text>
    </View>
  );
}

function ShiftRow({
  shift,
  colors,
}: {
  shift: TodayShift;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ gap: spacing[2] }}>
      <ShiftHeaderRow shift={shift} colors={colors} />
      {shift.setup_assignments.length > 0 ? (
        <View
          style={{
            marginLeft: spacing[5],
            borderLeftWidth: 1,
            borderLeftColor: colors.outline,
            paddingLeft: spacing[3],
            gap: spacing[2],
          }}
        >
          {shift.setup_assignments.map((assignment) => (
            <SetupAssignmentRow
              key={`setup-${assignment.id}`}
              assignment={assignment}
              colors={colors}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ShiftHeaderRow({
  shift,
  colors,
}: {
  shift: TodayShift;
  colors: ReturnType<typeof useColors>;
}) {
  const { i18n } = useTranslation();
  const isEs = i18n.language === "es";
  const zone = shift.zone ?? null;
  const zoneIsFoh = zone === "FOH";
  const shiftLabel = isEs ? (shift.label_es || shift.label) : shift.label;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[3],
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing[2],
          flex: 1,
        }}
      >
        <Text
          selectable
          style={{
            ...typography.bodyMedium,
            fontWeight: fontWeights.medium,
            color: colors.onSurface,
          }}
          numberOfLines={1}
        >
          {shiftLabel}
        </Text>
        {zone && (
          <View
            style={{
              paddingHorizontal: 8,
              height: 24,
              borderRadius: 999,
              borderWidth: 0,
              backgroundColor: zoneIsFoh ? FOH_COLOR : BOH_COLOR,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                ...typography.bodySmall,
                fontWeight: fontWeights.semibold,
                color: "#ffffff",
                fontSize: 11,
              }}
            >
              {zone}
            </Text>
          </View>
        )}
      </View>

      <Text
        selectable
        style={{
          ...typography.bodySmall,
          fontWeight: fontWeights.medium,
          color: colors.onSurfaceVariant,
          fontVariant: ["tabular-nums"],
        }}
      >
        {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
      </Text>
    </View>
  );
}

function SetupAssignmentRow({
  assignment,
  colors,
}: {
  assignment: TodaySetupAssignment;
  colors: ReturnType<typeof useColors>;
}) {
  const { i18n } = useTranslation();
  const isEs = i18n.language === "es";
  const assignmentLabel = isEs ? (assignment.label_es || assignment.label) : assignment.label;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[3],
      }}
    >
      <Text
        selectable
        style={{
          ...typography.bodySmall,
          fontWeight: fontWeights.regular,
          color: colors.onSurface,
          flex: 1,
        }}
        numberOfLines={1}
      >
        {assignmentLabel}
      </Text>
      <Text
        selectable
        style={{
          ...typography.bodySmall,
          color: colors.onSurfaceVariant,
          fontVariant: ["tabular-nums"],
          fontWeight: fontWeights.regular,
        }}
      >
        {formatTime(assignment.start_time)} – {formatTime(assignment.end_time)}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loading
// ---------------------------------------------------------------------------

function SkeletonBone({
  width,
  height,
  borderRadius: br = 4,
  style,
  pulseOpacity,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
  pulseOpacity: Animated.SharedValue<number>;
}) {
  const animStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: br,
          borderCurve: "continuous",
          backgroundColor: "rgba(120,120,128,0.12)",
        },
        animStyle,
        style,
      ]}
    />
  );
}

function SkeletonContent({
  colors,
}: {
  colors: ReturnType<typeof useColors>;
}) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse]);

  const ASSIGNMENT_WIDTHS = [100, 80, 110, 70, 90];

  return (
    <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[3] }}>
      {/* Shift header skeleton */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing[3],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[2],
            flex: 1,
          }}
        >
          <SkeletonBone width={90} height={16} pulseOpacity={pulse} />
          <SkeletonBone
            width={40}
            height={24}
            borderRadius={999}
            pulseOpacity={pulse}
          />
        </View>
        <SkeletonBone width={110} height={14} pulseOpacity={pulse} />
      </View>

      {/* Setup assignments skeleton */}
      <View
        style={{
          marginTop: spacing[2],
          marginLeft: spacing[5],
          borderLeftWidth: 1,
          borderLeftColor: colors.outline,
          paddingLeft: spacing[3],
          gap: spacing[2],
        }}
      >
        {ASSIGNMENT_WIDTHS.map((w, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[3],
            }}
          >
            <SkeletonBone
              width={w}
              height={13}
              pulseOpacity={pulse}
              style={{ flex: 0 }}
            />
            <View style={{ flex: 1 }} />
            <SkeletonBone width={95} height={13} pulseOpacity={pulse} />
          </View>
        ))}
      </View>

      {/* Bottom spacing to match real content */}
      <View style={{ height: spacing[1] }} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export default TodayCard;
