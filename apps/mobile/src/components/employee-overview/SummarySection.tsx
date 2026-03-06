/**
 * SummarySection Component
 * Shows key metrics for the active tab — PE averages, discipline points, etc.
 */

import React from "react";
import { View, Text } from "react-native";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing } from "../../lib/theme";
import { GlassCard } from "../glass";
import { getRatingColor } from "../../lib/rating-colors";
import type { EmployeeProfileResponse } from "../../lib/api";

interface SummarySectionProps {
  activeTab: string;
  data: EmployeeProfileResponse | null;
  loading: boolean;
  dateRangeLabel?: string;
}

export function SummarySection({ activeTab, data, loading, dateRangeLabel }: SummarySectionProps) {
  const colors = useColors();

  if (!data || loading) return null;

  if (activeTab === "pe") {
    const avgRating = data.summary.avg_rating;
    const totalRatings = data.ratings.length;

    return (
      <View style={{ paddingHorizontal: spacing[5] + 50 }}>
        <GlassCard>
          <View style={{ gap: spacing[2] }}>
            <View style={{ flexDirection: "row" }}>
              {/* Avg Rating */}
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    ...typography.h2,
                    color: avgRating != null
                      ? getRatingColor(avgRating, data.thresholds ?? undefined)
                      : colors.onSurface,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {avgRating != null ? avgRating.toFixed(2) : "--"}
                  {avgRating != null && (
                    <Text
                      style={{
                        ...typography.h4,
                        color: colors.onSurfaceDisabled,
                      }}
                    >
                      /3
                    </Text>
                  )}
                </Text>
                <Text
                  style={{
                    ...typography.labelSmall,
                    color: colors.onSurfaceDisabled,
                    textAlign: "center",
                  }}
                >
                  Avg Rating
                </Text>
              </View>

              {/* Total Ratings */}
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    ...typography.h2,
                    color: colors.onSurface,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {totalRatings}
                </Text>
                <Text
                  style={{
                    ...typography.labelSmall,
                    color: colors.onSurfaceDisabled,
                    textAlign: "center",
                  }}
                >
                  Total Ratings
                </Text>
              </View>
            </View>

            {/* Date range label */}
            {dateRangeLabel && (
              <Text
                style={{
                  ...typography.labelSmall,
                  color: colors.onSurfaceDisabled,
                  textAlign: "center",
                  marginBottom: -spacing[2],
                }}
              >
                {dateRangeLabel}
              </Text>
            )}
          </View>
        </GlassCard>
      </View>
    );
  }

  if (activeTab === "discipline") {
    const totalPoints = data.summary.total_points;
    const infractionCount = data.summary.infraction_count;
    const actionCount = data.disc_actions.length;

    return (
      <View style={{ paddingHorizontal: spacing[5] }}>
        <GlassCard>
          <View style={{ flexDirection: "row" }}>
            {/* Total Points */}
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  ...typography.h2,
                  color: totalPoints > 0 ? colors.error : colors.onSurface,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {totalPoints}
              </Text>
              <Text
                style={{
                  ...typography.labelSmall,
                  color: colors.onSurfaceDisabled,
                  textAlign: "center",
                }}
              >
                Points
              </Text>
            </View>

            {/* Infractions */}
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  ...typography.h2,
                  color: colors.onSurface,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {infractionCount}
              </Text>
              <Text
                style={{
                  ...typography.labelSmall,
                  color: colors.onSurfaceDisabled,
                  textAlign: "center",
                }}
              >
                Infractions
              </Text>
            </View>

            {/* Actions */}
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  ...typography.h2,
                  color: colors.onSurface,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {actionCount}
              </Text>
              <Text
                style={{
                  ...typography.labelSmall,
                  color: colors.onSurfaceDisabled,
                  textAlign: "center",
                }}
              >
                Actions
              </Text>
            </View>
          </View>
        </GlassCard>
      </View>
    );
  }

  return null;
}

export default SummarySection;
