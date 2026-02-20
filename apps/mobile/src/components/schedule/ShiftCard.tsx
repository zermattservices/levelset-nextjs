/**
 * ShiftCard Component
 * Displays a single shift with time, area, and role information
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { GlassCard } from "../glass";
import { type ScheduleShift } from "../../context/ScheduleContext";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius } from "../../lib/theme";

/** Format "09:00:00" → "9:00 AM" */
function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

interface ShiftCardProps {
  shift: ScheduleShift;
  onPress?: () => void;
  index?: number;
}

export function ShiftCard({ shift, onPress, index }: ShiftCardProps) {
  const colors = useColors();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Animated.View entering={FadeIn.delay((index ?? 0) * 50)}>
      <GlassCard onPress={onPress} style={styles.card}>
        <View style={styles.header}>
          <Text selectable style={[styles.date, { color: colors.onSurface }]}>{formatDate(shift.shift_date)}</Text>
          <View
            style={[
              styles.hoursBadge,
              { backgroundColor: colors.primary + "20" },
            ]}
          >
            <Text
              style={[
                styles.hoursText,
                { color: colors.primary },
              ]}
            >
              {shift.position?.name ?? "Shift"}
            </Text>
          </View>
        </View>

        <Text selectable style={[styles.time, { color: colors.onSurface }]}>
          {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
        </Text>
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[3],
    borderCurve: "continuous",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  date: {
    ...typography.h4,
  },
  hoursBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    borderCurve: "continuous",
  },
  hoursText: {
    ...typography.labelMedium,
    fontWeight: fontWeights.semibold,
  },
  time: {
    ...typography.bodyLarge,
    marginBottom: spacing[1],
  },
  details: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing[1],
  },
  detail: {
    ...typography.bodySmall,
  },
  separator: {
    ...typography.bodySmall,
    marginHorizontal: spacing[2],
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    borderCurve: "continuous",
    marginTop: spacing[2],
  },
  statusText: {
    ...typography.labelSmall,
    fontWeight: fontWeights.semibold,
  },
});

export default ShiftCard;
