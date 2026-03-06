/**
 * Day Detail Screen
 * Shows all shifts for a specific day with action menus.
 */

import React, { useMemo, useCallback } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { GlassCard } from "../../../src/components/glass";
import { AppIcon } from "../../../src/components/ui";
import { useColors } from "../../../src/context/ThemeContext";
import { typography, fontWeights } from "../../../src/lib/fonts";
import { spacing, borderRadius, haptics } from "../../../src/lib/theme";
import type { ScheduleShift } from "../../../src/context/ScheduleContext";

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

/** Calculate hours between two time strings */
function calculateHours(start: string, end: string, breakMinutes: number): string {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const netMinutes = Math.max(0, endMins - startMins - breakMinutes);
  const hours = netMinutes / 60;
  return hours % 1 === 0 ? `${hours.toFixed(0)}` : hours.toFixed(1);
}

/** Format "2026-02-20" → "Thursday, Feb 20" */
function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

// =============================================================================
// Component
// =============================================================================

export default function DayDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ date: string; shifts: string }>();

  const date = params.date ?? "";
  const shifts: ScheduleShift[] = useMemo(() => {
    try {
      return JSON.parse(params.shifts ?? "[]");
    } catch {
      return [];
    }
  }, [params.shifts]);

  const openActions = useCallback((shift: ScheduleShift) => {
    haptics.medium();
    router.push({
      pathname: "/(tabs)/(schedule)/shift-actions",
      params: {
        positionName: shift.position?.name ?? "Shift",
        startTime: shift.start_time,
        endTime: shift.end_time,
      },
    });
  }, [router]);

  const headerTitle = date ? formatFullDate(date) : "Day Detail";

  return (
    <>
      <Stack.Screen options={{ title: headerTitle, headerLargeTitle: false }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: spacing[4],
          paddingBottom: spacing[10],
          gap: spacing[3],
        }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {shifts.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              paddingVertical: spacing[10],
            }}
          >
            <Text style={{ fontSize: 48, marginBottom: spacing[4] }}>😴</Text>
            <Text
              style={{
                ...typography.h4,
                color: colors.onSurface,
                marginBottom: spacing[2],
              }}
            >
              Day Off
            </Text>
            <Text
              style={{
                ...typography.bodyMedium,
                color: colors.onSurfaceVariant,
                textAlign: "center",
              }}
            >
              No shifts scheduled for this day.
            </Text>
          </View>
        ) : (
          shifts.map((shift, index) => (
            <View key={shift.id}>
              <GlassCard>
                <View style={{ gap: spacing[2] }}>
                  {/* Header row: position name + menu button */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      selectable
                      style={{
                        ...typography.h4,
                        fontWeight: fontWeights.bold,
                        color: colors.onSurface,
                        flex: 1,
                      }}
                    >
                      {shift.position?.name ?? "Shift"}
                    </Text>
                    <Pressable
                      onPress={() => openActions(shift)}
                      hitSlop={12}
                      style={({ pressed }) => ({
                        width: 36,
                        height: 36,
                        borderRadius: borderRadius.full,
                        borderCurve: "continuous",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: pressed
                          ? colors.surfaceVariant
                          : "transparent",
                      })}
                    >
                      <AppIcon
                        name="ellipsis"
                        size={18}
                        tintColor={colors.onSurfaceVariant}
                      />
                    </Pressable>
                  </View>

                  {/* Time */}
                  <Text
                    selectable
                    style={{
                      ...typography.bodyLarge,
                      color: colors.onSurface,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                  </Text>

                  {/* Duration */}
                  <Text
                    style={{
                      ...typography.labelMedium,
                      color: colors.onSurfaceVariant,
                    }}
                  >
                    {calculateHours(
                      shift.start_time,
                      shift.end_time,
                      shift.break_minutes
                    )}{" "}
                    hours
                    {shift.break_minutes > 0 &&
                      ` (${shift.break_minutes} min break)`}
                  </Text>

                  {/* Notes */}
                  {shift.notes && (
                    <Text
                      selectable
                      style={{
                        ...typography.bodySmall,
                        color: colors.onSurfaceVariant,
                        fontStyle: "italic",
                        marginTop: spacing[1],
                      }}
                    >
                      {shift.notes}
                    </Text>
                  )}
                </View>
              </GlassCard>
            </View>
          ))
        )}
      </ScrollView>

    </>
  );
}
