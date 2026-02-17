/**
 * ShiftCard Component
 * Displays a single shift with time, area, and role information
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { GlassCard } from "../glass";
import { Shift } from "../../context/ScheduleContext";
import { colors } from "../../lib/colors";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius } from "../../lib/theme";

interface ShiftCardProps {
  shift: Shift;
  onPress?: () => void;
  index?: number;
}

export function ShiftCard({ shift, onPress, index }: ShiftCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return colors.success;
      case "cancelled":
        return colors.error;
      default:
        return colors.primary;
    }
  };

  return (
    <Animated.View entering={FadeIn.delay((index ?? 0) * 50)}>
      <GlassCard onPress={onPress} style={styles.card}>
        <View style={styles.header}>
          <Text selectable style={styles.date}>{formatDate(shift.date)}</Text>
          <View
            style={[
              styles.hoursBadge,
              { backgroundColor: getStatusColor(shift.status) + "20" },
            ]}
          >
            <Text
              style={[
                styles.hoursText,
                { color: getStatusColor(shift.status) },
              ]}
            >
              {shift.hours}h
            </Text>
          </View>
        </View>

        <Text selectable style={styles.time}>
          {shift.startTime} - {shift.endTime}
        </Text>

        {(shift.area || shift.role) && (
          <View style={styles.details}>
            {shift.area && <Text selectable style={styles.detail}>{shift.area}</Text>}
            {shift.area && shift.role && <Text style={styles.separator}>•</Text>}
            {shift.role && <Text selectable style={styles.detail}>{shift.role}</Text>}
          </View>
        )}

        {shift.status && shift.status !== "scheduled" && (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(shift.status) + "15" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(shift.status) },
              ]}
            >
              {shift.status.charAt(0).toUpperCase() + shift.status.slice(1)}
            </Text>
          </View>
        )}
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
    color: colors.onSurface,
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
    color: colors.onSurface,
    marginBottom: spacing[1],
  },
  details: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing[1],
  },
  detail: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  separator: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
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
