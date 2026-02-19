/**
 * RatingSummaryCard — shows a rating average for a position with color coding.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { GlassCard } from "../../glass";
import { AppIcon } from "../../ui";
import { useColors } from "../../../context/ThemeContext";
import { fontFamilies, fontSizes, fontWeights } from "../../../lib/fonts";
import { spacing, borderRadius } from "../../../lib/theme";

interface RatingSummaryCardProps {
  payload: {
    employee_id?: string;
    employee_name?: string;
    position: string;
    rating_avg: number;
    rating_count: number;
    trend?: "improving" | "declining" | "stable";
  };
}

function getRatingColor(avg: number, colors: ReturnType<typeof useColors>) {
  if (avg >= 2.5) return { bg: colors.successTransparent, text: colors.success, label: "Green" };
  if (avg >= 2.0) return { bg: colors.warningTransparent, text: colors.warning, label: "Yellow" };
  return { bg: colors.errorTransparent, text: colors.error, label: "Red" };
}

function getTrendIcon(trend: string): { name: string; color: string } | null {
  switch (trend) {
    case "improving":
      return { name: "arrow.up.right", color: "success" };
    case "declining":
      return { name: "arrow.down.right", color: "error" };
    case "stable":
      return { name: "arrow.right", color: "onSurfaceDisabled" };
    default:
      return null;
  }
}

export function RatingSummaryCard({ payload }: RatingSummaryCardProps) {
  const colors = useColors();
  const ratingColor = getRatingColor(payload.rating_avg, colors);
  const trendInfo = payload.trend ? getTrendIcon(payload.trend) : null;

  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <GlassCard contentStyle={styles.cardContent}>
        <View style={styles.row}>
          {/* Position name */}
          <View style={styles.positionWrap}>
            <Text style={[styles.position, { color: colors.onSurface }]}>
              {payload.position}
            </Text>
            <Text style={[styles.count, { color: colors.onSurfaceDisabled }]}>
              {payload.rating_count} rating{payload.rating_count !== 1 ? "s" : ""}
            </Text>
          </View>

          {/* Rating + trend */}
          <View style={styles.ratingWrap}>
            <View style={[styles.ratingBadge, { backgroundColor: ratingColor.bg }]}>
              <Text style={[styles.ratingValue, { color: ratingColor.text }]}>
                {payload.rating_avg.toFixed(2)}
              </Text>
            </View>
            {trendInfo && (
              <AppIcon
                name={trendInfo.name}
                size={14}
                tintColor={(colors as any)[trendInfo.color] || colors.onSurfaceDisabled}
              />
            )}
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
    justifyContent: "space-between",
  },
  positionWrap: {
    flex: 1,
    gap: 1,
  },
  position: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
  count: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.xs,
  },
  ratingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  ratingBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  ratingValue: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
  },
});

export default RatingSummaryCard;
