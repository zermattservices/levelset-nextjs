/**
 * MyScheduleScreen
 * Displays the user's assigned shifts in a week view.
 * Shows "This Week" (today + remaining days) and "Next Week" (if published).
 * Collapsible week headers with individual glass cards per day.
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSchedule, type ScheduleShift } from "../../context/ScheduleContext";
import { GlassCard } from "../../components/glass";
import { AppIcon } from "../../components/ui";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../lib/theme";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// =============================================================================
// Helpers
// =============================================================================

/** Format "09:00:00" -> "9:00 AM" */
function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

/** Format "2026-02-20" -> "Thu" */
function formatDayShort(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

/** Format "2026-02-20" -> "Feb 20" */
function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Format week range like "Feb 15-21" */
function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T12:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()}-${end.getDate()}`;
  }
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
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

/** Count total shift days in a week */
function countShiftDays(shifts: ScheduleShift[]): number {
  const dates = new Set(shifts.map((s) => s.shift_date));
  return dates.size;
}

// =============================================================================
// Components
// =============================================================================

interface DayCardProps {
  date: string;
  shifts: ScheduleShift[];
  index: number;
  onPress: () => void;
}

function DayCard({ date, shifts, index, onPress }: DayCardProps) {
  const colors = useColors();
  const today = isToday(date);
  const hasShifts = shifts.length > 0;

  return (
    <Animated.View
      entering={FadeIn.delay(index * 50).duration(250)}
      style={{ paddingHorizontal: spacing[4], marginBottom: spacing[2] }}
    >
      <GlassCard
        onPress={onPress}
        style={today ? { borderWidth: 1, borderColor: colors.primary } : undefined}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* Day column */}
          <View style={{ width: 56, alignItems: "center", marginRight: spacing[3] }}>
            <Text
              style={{
                ...typography.labelSmall,
                fontWeight: fontWeights.semibold,
                color: today ? colors.primary : colors.onSurfaceVariant,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {formatDayShort(date)}
            </Text>
            <Text
              style={{
                ...typography.h3,
                fontWeight: today ? fontWeights.bold : fontWeights.semibold,
                color: today ? colors.primary : colors.onSurface,
                lineHeight: 28,
              }}
            >
              {new Date(date + "T12:00:00").getDate()}
            </Text>
            {today && (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.primary,
                  marginTop: 2,
                }}
              />
            )}
          </View>

          {/* Shifts detail */}
          <View style={{ flex: 1, gap: spacing[1] }}>
            {!hasShifts ? (
              <Text
                style={{
                  ...typography.bodySmall,
                  color: colors.onSurfaceDisabled,
                  fontStyle: "italic",
                }}
              >
                Off
              </Text>
            ) : (
              shifts.map((shift) => (
                <View key={shift.id} style={{ gap: 2 }}>
                  <Text
                    style={{
                      ...typography.bodyMedium,
                      fontWeight: fontWeights.semibold,
                      color: colors.onSurface,
                    }}
                  >
                    {shift.position?.name ?? "Shift"}
                  </Text>
                  <Text
                    style={{
                      ...typography.bodySmall,
                      color: colors.onSurfaceVariant,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                    {shift.break_minutes > 0 && (
                      `  ·  ${shift.break_minutes}min break`
                    )}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Chevron */}
          {hasShifts && (
            <View style={{ justifyContent: "center", paddingLeft: spacing[2] }}>
              <AppIcon
                name="chevron.right"
                size={14}
                tintColor={colors.onSurfaceDisabled}
              />
            </View>
          )}
        </View>
      </GlassCard>
    </Animated.View>
  );
}

interface WeekSectionProps {
  title: string;
  weekStart: string;
  shifts: ScheduleShift[];
  days: string[];
  startIndex: number;
  defaultExpanded: boolean;
  onDayPress: (date: string, shifts: ScheduleShift[]) => void;
}

function WeekSection({
  title,
  weekStart,
  shifts,
  days,
  startIndex,
  defaultExpanded,
  onDayPress,
}: WeekSectionProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const shiftsByDate = useMemo(() => groupShiftsByDate(shifts), [shifts]);
  const shiftDayCount = useMemo(() => countShiftDays(shifts), [shifts]);

  const toggleExpanded = () => {
    haptics.light();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <View style={{ marginBottom: spacing[3] }}>
      {/* Collapsible header */}
      <Pressable
        onPress={toggleExpanded}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
        }}
      >
        <AppIcon
          name={expanded ? "chevron.down" : "chevron.right"}
          size={12}
          tintColor={colors.onSurfaceVariant}
        />
        <Text
          style={{
            ...typography.labelLarge,
            fontWeight: fontWeights.bold,
            color: colors.onSurface,
            marginLeft: spacing[2],
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
        {shiftDayCount > 0 && (
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: 10,
              paddingHorizontal: 7,
              paddingVertical: 1,
              marginLeft: "auto",
            }}
          >
            <Text
              style={{
                ...typography.labelSmall,
                fontWeight: fontWeights.bold,
                color: "#FFFFFF",
              }}
            >
              {shiftDayCount} {shiftDayCount === 1 ? "day" : "days"}
            </Text>
          </View>
        )}
      </Pressable>

      {/* Day cards */}
      {expanded && days.map((date, idx) => {
        const dayShifts = shiftsByDate.get(date) || [];
        return (
          <DayCard
            key={date}
            date={date}
            shifts={dayShifts}
            index={startIndex + idx}
            onPress={() => onDayPress(date, dayShifts)}
          />
        );
      })}
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
        <Text style={{ fontSize: 48, marginBottom: spacing[4] }}>&#x26A0;&#xFE0F;</Text>
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
        paddingTop: spacing[1],
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
              <Text style={{ fontSize: 56, marginBottom: spacing[4] }}>&#x1F4C5;</Text>
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
              defaultExpanded={true}
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
              defaultExpanded={false}
              onDayPress={handleDayPress}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}
