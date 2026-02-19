/**
 * EmployeeListCard — ranked or filtered list of employees.
 * Shows title, numbered rows with avatar, name, and optional metric.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { GlassCard } from "../../glass";
import { useColors } from "../../../context/ThemeContext";
import { fontFamilies, fontSizes, fontWeights } from "../../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../../lib/theme";

interface EmployeeListItem {
  employee_id: string;
  name: string;
  role: string;
  rank?: number;
  metric_label?: string;
  metric_value?: number;
}

interface EmployeeListCardProps {
  payload: {
    title?: string;
    employees: EmployeeListItem[];
  };
}

function getMetricColor(value: number, colors: ReturnType<typeof useColors>) {
  if (value >= 2.5) return colors.success;
  if (value >= 2.0) return colors.warning;
  return colors.error;
}

export function EmployeeListCard({ payload }: EmployeeListCardProps) {
  const colors = useColors();
  const { title, employees } = payload;

  if (!employees || employees.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <GlassCard contentStyle={styles.cardContent}>
        {title && (
          <Text style={[styles.title, { color: colors.onSurfaceVariant }]}>{title}</Text>
        )}

        {employees.map((emp, index) => {
          const initial = emp.name.charAt(0).toUpperCase();
          const isLast = index === employees.length - 1;
          // Determine if metric looks like a rating (0-3 range) vs points
          const isRatingMetric = emp.metric_value !== undefined && emp.metric_value <= 3.0;

          return (
            <View
              key={emp.employee_id || `emp-${index}`}
              style={[
                styles.row,
                !isLast && { borderBottomWidth: 1, borderBottomColor: colors.outline },
              ]}
            >
              {/* Rank number */}
              {emp.rank !== undefined && (
                <Text style={[styles.rank, { color: colors.onSurfaceDisabled }]}>
                  {emp.rank}
                </Text>
              )}

              {/* Avatar */}
              <View style={[styles.avatar, { backgroundColor: colors.primaryTransparent }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{initial}</Text>
              </View>

              {/* Name + Role */}
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.onSurface }]} numberOfLines={1}>
                  {emp.name}
                </Text>
                <Text style={[styles.role, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                  {emp.role}
                </Text>
              </View>

              {/* Metric */}
              {emp.metric_value !== undefined && (
                <View style={styles.metricWrap}>
                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color: isRatingMetric
                          ? getMetricColor(emp.metric_value, colors)
                          : colors.error,
                      },
                    ]}
                  >
                    {emp.metric_value.toFixed(2)}
                  </Text>
                  {emp.metric_label && (
                    <Text style={[styles.metricLabel, { color: colors.onSurfaceDisabled }]}>
                      {emp.metric_label}
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  title: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingVertical: spacing[2],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[3],
  },
  rank: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    width: 20,
    textAlign: "center",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  info: {
    flex: 1,
    gap: 1,
  },
  name: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
  },
  role: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.xs,
  },
  metricWrap: {
    alignItems: "flex-end",
  },
  metricValue: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
  },
  metricLabel: {
    fontFamily: fontFamilies.body,
    fontSize: 10,
    marginTop: -1,
  },
});

export default EmployeeListCard;
