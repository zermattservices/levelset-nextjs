/**
 * MyScheduleScreen
 * Displays the user's assigned shifts in a week view.
 * Shows "This Week" (today + remaining days) and "Next Week" (if published).
 */

import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSchedule, type ScheduleShift } from "../../context/ScheduleContext";
import { GlassCard } from "../../components/glass";
import { AppIcon } from "../../components/ui";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../lib/theme";

// =============================================================================
// Helpers
// =============================================================================

/** Format "09:00:00" → "9:00 AM" */
function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

/** Format "2026-02-20" → "Thu, Feb 20" */
function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00"); // noon to avoid TZ issues
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Format week range like "Feb 15–21" */
function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T12:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()}–${end.getDate()}`;
  }
  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
}

/** Check if a date string is today */
function isToday(dateStr: string): boolean {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  return dateStr === todayStr;
}

/** Get remaining days of the week starting from today */
function getRemainingDays(weekStart: string): string[] {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const days: string[] = [];
  const start = new Date(weekStart + "T12:00:00");

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    if (dateStr >= todayStr) {
      days.push(dateStr);
    }
  }
  return days;
}

/** Get all 7 days of a week */
function getAllDays(weekStart: string): string[] {
  const days: string[] = [];
  const start = new Date(weekStart + "T12:00:00");
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

/** Group shifts by date */
function groupShiftsByDate(shifts: ScheduleShift[]): Map<string, ScheduleShift[]> {
  const map = new Map<string, ScheduleShift[]>();
  for (const shift of shifts) {
    const existing = map.get(shift.shift_date) || [];
    existing.push(shift);
    map.set(shift.shift_date, existing);
  }
  return map;
}

// =============================================================================
// Components
// =============================================================================

interface DayRowProps {
  date: string;
  shifts: ScheduleShift[];
  index: number;
  onPress: () => void;
}

function DayRow({ date, shifts, index, onPress }: DayRowProps) {
  const colors = useColors();
  const today = isToday(date);

  return (
    <Animated.View entering={FadeIn.delay(index * 40).duration(300)}>
      <Pressable
        onPress={() => {
          haptics.light();
          onPress();
        }}
        style={({ pressed }) => [
          {
            flexDirection: "row",
            paddingVertical: spacing[3],
            paddingHorizontal: spacing[4],
            backgroundColor: pressed ? colors.surfaceVariant : "transparent",
            borderLeftWidth: today ? 3 : 0,
            borderLeftColor: today ? colors.primary : "transparent",
            marginLeft: today ? 0 : 3, // compensate for border
          },
        ]}
      >
        {/* Day label column */}
        <View style={{ width: 110, justifyContent: "flex-start", paddingTop: 2 }}>
          {today && (
            <Text
              style={{
                ...typography.labelSmall,
                fontWeight: fontWeights.semibold,
                color: colors.primary,
                marginBottom: 2,
              }}
            >
              Today
            </Text>
          )}
          <Text
            selectable
            style={{
              ...typography.labelLarge,
              fontWeight: today ? fontWeights.bold : fontWeights.medium,
              color: today ? colors.onSurface : colors.onSurfaceVariant,
            }}
          >
            {formatDayLabel(date)}
          </Text>
        </View>

        {/* Shifts column */}
        <View style={{ flex: 1, gap: spacing[1] }}>
          {shifts.length === 0 ? (
            <Text
              style={{
                ...typography.bodySmall,
                color: colors.onSurfaceDisabled,
                fontStyle: "italic",
                paddingTop: 2,
              }}
            >
              No shifts scheduled
            </Text>
          ) : (
            shifts.map((shift) => (
              <View
                key={shift.id}
                style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}
              >
                <Text
                  selectable
                  style={{
                    ...typography.bodyMedium,
                    fontWeight: fontWeights.semibold,
                    color: colors.onSurface,
                    minWidth: 80,
                  }}
                >
                  {shift.position?.name ?? "Shift"}
                </Text>
                <Text
                  selectable
                  style={{
                    ...typography.bodySmall,
                    color: colors.onSurfaceVariant,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Chevron */}
        <View style={{ justifyContent: "center", paddingLeft: spacing[2] }}>
          <AppIcon
            name="chevron.right"
            size={14}
            tintColor={colors.onSurfaceDisabled}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

interface WeekSectionProps {
  title: string;
  weekStart: string;
  shifts: ScheduleShift[];
  days: string[];
  startIndex: number;
  onDayPress: (date: string, shifts: ScheduleShift[]) => void;
}

function WeekSection({
  title,
  weekStart,
  shifts,
  days,
  startIndex,
  onDayPress,
}: WeekSectionProps) {
  const colors = useColors();
  const shiftsByDate = useMemo(() => groupShiftsByDate(shifts), [shifts]);

  return (
    <View style={{ marginBottom: spacing[4] }}>
      {/* Section header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[2],
          marginBottom: spacing[1],
        }}
      >
        <Text
          style={{
            ...typography.labelLarge,
            fontWeight: fontWeights.semibold,
            color: colors.onSurfaceVariant,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            ...typography.labelMedium,
            color: colors.onSurfaceDisabled,
            marginLeft: spacing[2],
          }}
        >
          {formatWeekRange(weekStart)}
        </Text>
      </View>

      {/* Day rows */}
      <GlassCard contentStyle={{ padding: 0 }}>
        {days.map((date, idx) => {
          const dayShifts = shiftsByDate.get(date) || [];
          const isLast = idx === days.length - 1;
          return (
            <View key={date}>
              <DayRow
                date={date}
                shifts={dayShifts}
                index={startIndex + idx}
                onPress={() => onDayPress(date, dayShifts)}
              />
              {!isLast && (
                <View
                  style={{
                    height: 1,
                    backgroundColor: colors.outline,
                    marginLeft: spacing[4],
                    opacity: 0.5,
                  }}
                />
              )}
            </View>
          );
        })}
      </GlassCard>
    </View>
  );
}

// =============================================================================
// Main Screen
// =============================================================================

export default function MyScheduleScreen() {
  const colors = useColors();
  const router = useRouter();
  const { thisWeek, nextWeek, isLoading, error, refreshSchedule } =
    useSchedule();

  const onRefresh = useCallback(() => {
    refreshSchedule();
  }, [refreshSchedule]);

  const handleDayPress = useCallback(
    (date: string, shifts: ScheduleShift[]) => {
      router.push({
        pathname: "/(tabs)/(schedule)/day-detail",
        params: {
          date,
          shifts: JSON.stringify(shifts),
        },
      });
    },
    [router]
  );

  const thisWeekDays = useMemo(
    () => (thisWeek ? getRemainingDays(thisWeek.weekStart) : []),
    [thisWeek]
  );

  const nextWeekDays = useMemo(
    () => (nextWeek ? getAllDays(nextWeek.weekStart) : []),
    [nextWeek]
  );

  const hasAnyShifts =
    (thisWeek?.shifts?.length ?? 0) > 0 || (nextWeek?.shifts?.length ?? 0) > 0;

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: spacing[6],
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ fontSize: 48, marginBottom: spacing[4] }}>⚠️</Text>
        <Text
          style={{
            ...typography.h4,
            color: colors.error,
            marginBottom: spacing[2],
          }}
        >
          Something went wrong
        </Text>
        <Text
          style={{
            ...typography.bodyMedium,
            color: colors.onSurfaceVariant,
            textAlign: "center",
          }}
        >
          {error}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: spacing[3],
        paddingBottom: spacing[10],
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {!isLoading && !hasAnyShifts && thisWeekDays.length === 0 ? (
        <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[6] }}>
          <GlassCard>
            <View
              style={{
                alignItems: "center",
                paddingVertical: spacing[10],
              }}
            >
              <Text style={{ fontSize: 56, marginBottom: spacing[4] }}>📅</Text>
              <Text
                style={{
                  ...typography.h3,
                  color: colors.onSurface,
                  marginBottom: spacing[2],
                }}
              >
                No Upcoming Shifts
              </Text>
              <Text
                style={{
                  ...typography.bodyMedium,
                  color: colors.onSurfaceVariant,
                  textAlign: "center",
                  marginBottom: spacing[4],
                }}
              >
                Your schedule will appear here once it's available.
              </Text>
              <Text
                style={{
                  ...typography.bodySmall,
                  color: colors.onSurfaceDisabled,
                  textAlign: "center",
                }}
              >
                Pull down to refresh
              </Text>
            </View>
          </GlassCard>
        </View>
      ) : (
        <>
          {thisWeek && thisWeekDays.length > 0 && (
            <WeekSection
              title="This Week"
              weekStart={thisWeek.weekStart}
              shifts={thisWeek.shifts}
              days={thisWeekDays}
              startIndex={0}
              onDayPress={handleDayPress}
            />
          )}

          {nextWeek && nextWeekDays.length > 0 && (
            <WeekSection
              title="Next Week"
              weekStart={nextWeek.weekStart}
              shifts={nextWeek.shifts}
              days={nextWeekDays}
              startIndex={thisWeekDays.length}
              onDayPress={handleDayPress}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}
