/**
 * PositionCard Component
 * Displays a position with its average rating, styled as a pressable glass card.
 */

import React from "react";
import { View, Text } from "react-native";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing } from "../../lib/theme";
import { GlassCard } from "../glass";
import { getRatingColor } from "../../lib/rating-colors";
import type { RatingThresholds } from "../../lib/api";

const FOH_COLOR = "#006391";
const BOH_COLOR = "#ffcc5b";

interface PositionCardProps {
  position: string;
  average: number;
  ratingCount: number;
  zone?: string | null;
  thresholds?: RatingThresholds;
  onPress: () => void;
}

export function PositionCard({
  position,
  average,
  ratingCount,
  zone,
  thresholds,
  onPress,
}: PositionCardProps) {
  const colors = useColors();

  return (
    <GlassCard onPress={onPress}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left side — position name + zone badge + rating count */}
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
            <Text
              style={{
                ...typography.labelLarge,
                fontWeight: fontWeights.semibold,
                color: colors.onSurface,
              }}
              numberOfLines={1}
            >
              {position}
            </Text>
            {zone && (
              <View
                style={{
                  paddingHorizontal: 6,
                  height: 18,
                  borderRadius: 999,
                  backgroundColor: zone === "FOH" ? FOH_COLOR : BOH_COLOR,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: fontWeights.semibold,
                    color: "#ffffff",
                  }}
                >
                  {zone}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={{
              ...typography.bodySmall,
              color: colors.onSurfaceDisabled,
            }}
          >
            {ratingCount} ratings (last 90d)
          </Text>
        </View>

        {/* Right side — color-coded average tag */}
        <View
          style={{
            backgroundColor: getRatingColor(average, thresholds),
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 10,
            borderCurve: "continuous",
            marginLeft: spacing[3],
          }}
        >
          <Text
            style={{
              fontFamily: typography.h2.fontFamily,
              fontSize: 22,
              fontWeight: fontWeights.bold,
              color: "#ffffff",
              fontVariant: ["tabular-nums"],
            }}
          >
            {average.toFixed(1)}
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

export default PositionCard;
