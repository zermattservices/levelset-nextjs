/**
 * EmployeeCard — inline chat card for a single employee.
 * Shows avatar initial, name, role, and optional rating/points badges.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { GlassCard } from "../../glass";
import { useColors } from "../../../context/ThemeContext";
import { typography, fontWeights, fontFamilies, fontSizes } from "../../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../../lib/theme";

interface EmployeeCardProps {
  payload: {
    employee_id: string;
    name: string;
    role: string;
    hire_date?: string;
    certified_status?: string;
    rating_avg?: number;
    rating_position?: string;
    current_points?: number;
    is_leader?: boolean;
    is_trainer?: boolean;
  };
}

function getRatingColor(avg: number, colors: ReturnType<typeof useColors>) {
  if (avg >= 2.5) return { bg: colors.successTransparent, text: colors.success };
  if (avg >= 2.0) return { bg: colors.warningTransparent, text: colors.warning };
  return { bg: colors.errorTransparent, text: colors.error };
}

export function EmployeeCard({ payload }: EmployeeCardProps) {
  const colors = useColors();
  const initial = payload.name.charAt(0).toUpperCase();
  const hasRating = payload.rating_avg !== undefined && payload.rating_avg !== null;
  const hasPoints = payload.current_points !== undefined && payload.current_points > 0;

  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <GlassCard
        onPress={() => haptics.light()}
        contentStyle={styles.cardContent}
      >
        <View style={styles.row}>
          {/* Avatar */}
          <View style={[styles.avatar, { backgroundColor: colors.primaryTransparent }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>{initial}</Text>
          </View>

          {/* Name + Role */}
          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.onSurface }]} numberOfLines={1}>
              {payload.name}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.role, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                {payload.role}
              </Text>
              {payload.is_leader && (
                <View style={[styles.badge, { backgroundColor: colors.primaryTransparent }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>Leader</Text>
                </View>
              )}
              {payload.is_trainer && (
                <View style={[styles.badge, { backgroundColor: colors.infoTransparent }]}>
                  <Text style={[styles.badgeText, { color: colors.info }]}>Trainer</Text>
                </View>
              )}
            </View>
          </View>

          {/* Rating badge */}
          {hasRating && (
            <View
              style={[
                styles.ratingBadge,
                { backgroundColor: getRatingColor(payload.rating_avg!, colors).bg },
              ]}
            >
              <Text
                style={[
                  styles.ratingText,
                  { color: getRatingColor(payload.rating_avg!, colors).text },
                ]}
              >
                {payload.rating_avg!.toFixed(2)}
              </Text>
              {payload.rating_position && (
                <Text
                  style={[styles.ratingLabel, { color: getRatingColor(payload.rating_avg!, colors).text }]}
                  numberOfLines={1}
                >
                  {payload.rating_position}
                </Text>
              )}
            </View>
          )}

          {/* Points badge */}
          {hasPoints && !hasRating && (
            <View style={[styles.pointsBadge, { backgroundColor: colors.errorTransparent }]}>
              <Text style={[styles.pointsText, { color: colors.error }]}>
                {payload.current_points} pts
              </Text>
            </View>
          )}
        </View>
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  role: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.sm,
  },
  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
  },
  ratingBadge: {
    alignItems: "center",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    minWidth: 48,
  },
  ratingText: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
  },
  ratingLabel: {
    fontFamily: fontFamilies.body,
    fontSize: 10,
    fontWeight: fontWeights.medium,
    marginTop: -1,
  },
  pointsBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  pointsText: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
});

export default EmployeeCard;
