/**
 * InfractionCard — inline chat card for a single infraction.
 * Shows infraction type, date, points, and leader name.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { GlassCard } from "../../glass";
import { useColors } from "../../../context/ThemeContext";
import { fontFamilies, fontSizes, fontWeights } from "../../../lib/fonts";
import { spacing, borderRadius } from "../../../lib/theme";

interface InfractionCardProps {
  payload: {
    id: string;
    employee_name?: string;
    infraction: string;
    date: string;
    points: number;
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

export function InfractionCard({ payload }: InfractionCardProps) {
  const colors = useColors();

  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <GlassCard contentStyle={styles.cardContent}>
        <View style={styles.row}>
          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: colors.errorTransparent }]}>
            <Text style={styles.iconText}>!</Text>
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={[styles.infractionType, { color: colors.onSurface }]} numberOfLines={1}>
              {payload.infraction}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.meta, { color: colors.onSurfaceVariant }]}>
                {formatDate(payload.date)}
              </Text>
              {payload.leader_name ? (
                <Text style={[styles.meta, { color: colors.onSurfaceDisabled }]} numberOfLines={1}>
                  by {payload.leader_name}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Points */}
          <View style={[styles.pointsBadge, { backgroundColor: colors.errorTransparent }]}>
            <Text style={[styles.pointsText, { color: colors.error }]}>
              {payload.points}pt{payload.points !== 1 ? "s" : ""}
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
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: "#EF4444",
  },
  info: {
    flex: 1,
    gap: 1,
  },
  infractionType: {
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

export default InfractionCard;
