/**
 * DiscActionCard — inline chat card for a discipline action.
 * Shows action type (e.g., "Written Warning"), date, and leader name.
 * Uses warning/orange accent to distinguish from infraction cards (red).
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { GlassCard } from "../../glass";
import { useColors } from "../../../context/ThemeContext";
import { fontFamilies, fontSizes, fontWeights } from "../../../lib/fonts";
import { spacing, borderRadius } from "../../../lib/theme";

interface DiscActionCardProps {
  payload: {
    id: string;
    action: string;
    date: string;
    employee_name?: string;
    leader_name?: string;
  };
}

function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return isoDate;
  }
}

export function DiscActionCard({ payload }: DiscActionCardProps) {
  const colors = useColors();

  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <GlassCard contentStyle={styles.cardContent}>
        <View style={styles.row}>
          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: colors.warningTransparent }]}>
            <Text style={[styles.iconText, { color: colors.warning }]}>⚠</Text>
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={[styles.actionType, { color: colors.onSurface }]} numberOfLines={1}>
              {payload.action}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.meta, { color: colors.onSurfaceVariant }]}>
                {formatDate(payload.date)}
              </Text>
              {payload.employee_name ? (
                <Text style={[styles.meta, { color: colors.onSurfaceDisabled }]} numberOfLines={1}>
                  {payload.employee_name}
                </Text>
              ) : null}
              {payload.leader_name ? (
                <Text style={[styles.meta, { color: colors.onSurfaceDisabled }]} numberOfLines={1}>
                  by {payload.leader_name}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Action badge */}
          <View style={[styles.actionBadge, { backgroundColor: colors.warningTransparent }]}>
            <Text style={[styles.actionBadgeText, { color: colors.warning }]}>
              Action
            </Text>
          </View>
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
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: fontSizes.base,
  },
  info: {
    flex: 1,
    gap: 1,
  },
  actionType: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  meta: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.xs,
  },
  actionBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  actionBadgeText: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
});

export default DiscActionCard;
