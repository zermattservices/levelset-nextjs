/**
 * OverviewTab Component
 * Dashboard-style overview for an employee showing
 * positional ratings, discipline points, pathway, and evaluations.
 */

import React, { useMemo, useState } from "react";
import { View, Text, Pressable, LayoutAnimation, UIManager, Platform } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Rocket, Gavel, GraduationCap, CalendarCheck, Star, Info, ChevronDown } from "lucide-react-native";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../lib/theme";
import { GlassCard, GlassDrawer } from "../glass";
import { AppIcon } from "../ui";
import { getRatingColor } from "../../lib/rating-colors";
import type { EmployeeProfileResponse } from "../../lib/api";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface OverviewTabProps {
  data: EmployeeProfileResponse;
}

// ---------------------------------------------------------------------------
// Discipline point color scale (mirrors dashboard DisciplineTable red gradient)
// ---------------------------------------------------------------------------

const RED_GRADIENT = [
  { bg: "#fecaca", color: "#991b1b" },   // red-200 / red-800 — lightest
  { bg: "#fca5a5", color: "#991b1b" },   // red-300 / red-800
  { bg: "#f87171", color: "#ffffff" },   // red-400 / white
  { bg: "#ef4444", color: "#ffffff" },   // red-500 / white
  { bg: "#dc2626", color: "#ffffff" },   // red-600 / white — darkest
];

function getPointsColor(
  points: number,
  rubric: EmployeeProfileResponse["disc_rubric"]
): { bg: string; color: string } {
  if (points === 0) {
    return { bg: "rgba(120,120,128,0.12)", color: "#8e8e93" };
  }

  if (!rubric || rubric.length === 0) {
    if (points <= 10) return RED_GRADIENT[0];
    if (points <= 30) return RED_GRADIENT[1];
    if (points <= 50) return RED_GRADIENT[2];
    if (points <= 75) return RED_GRADIENT[3];
    return RED_GRADIENT[4];
  }

  let actionIndex = -1;
  for (let i = rubric.length - 1; i >= 0; i--) {
    if (points >= rubric[i].points_threshold) {
      actionIndex = i;
      break;
    }
  }

  if (actionIndex < 0) return RED_GRADIENT[0];

  const gradientIndex = Math.round(
    (actionIndex / Math.max(rubric.length - 1, 1)) * (RED_GRADIENT.length - 1)
  );
  return RED_GRADIENT[gradientIndex];
}

// ---------------------------------------------------------------------------
// 0-100 scale color helper (maps rating thresholds to percentage scale)
// 1-3 thresholds → 0-100: green >= 87.5, yellow >= 37.5, red < 37.5
// ---------------------------------------------------------------------------

function getScoreColor100(
  value: number,
  thresholds?: EmployeeProfileResponse["thresholds"]
): string {
  // Convert 100-scale back to 1-3 scale: value/100 * 2 + 1
  const mapped = (value / 100) * 2 + 1;
  return getRatingColor(mapped, thresholds ?? undefined);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OverviewTab({ data }: OverviewTabProps) {
  const colors = useColors();

  const avgRating = data.summary.avg_rating;
  const totalPoints = data.summary.total_points;

  // Highest action threshold from rubric
  const maxThreshold = useMemo(() => {
    if (!data.disc_rubric || data.disc_rubric.length === 0) return null;
    return Math.max(...data.disc_rubric.map((r) => r.points_threshold));
  }, [data.disc_rubric]);

  // Last infraction (most recent by date — API returns desc)
  const lastInfraction = useMemo(() => {
    if (!data.infractions || data.infractions.length === 0) return null;
    return data.infractions[0];
  }, [data.infractions]);

  // Last rating (most recent by date — API returns desc)
  const lastRating = useMemo(() => {
    if (!data.ratings || data.ratings.length === 0) return null;
    return data.ratings[0];
  }, [data.ratings]);

  const pointsStyle = getPointsColor(totalPoints, data.disc_rubric);

  return (
    <View style={{ gap: spacing[3] }}>
      {/* ── Row 1: Positional Ratings + Discipline Points ── */}
      <View style={{ flexDirection: "row", gap: spacing[3] }}>
        {/* Left: Positional Ratings */}
        <View style={{ flex: 1 }}>
          <GlassCard>
            <View style={{ gap: spacing[3] }}>
              {/* Title row */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
                <Rocket size={16} color={colors.onSurfaceVariant} strokeWidth={1.5} />
                <Text
                  style={{
                    ...typography.labelMedium,
                    fontWeight: fontWeights.semibold,
                    color: colors.onSurfaceVariant,
                  }}
                >
                  Avg Rating
                </Text>
              </View>

              {/* Rating value */}
              <View style={{ alignItems: "center" }}>
                {avgRating != null ? (
                  <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                    <Text
                      style={{
                        fontFamily: typography.h2.fontFamily,
                        fontSize: 28,
                        fontWeight: fontWeights.bold,
                        color: getRatingColor(avgRating, data.thresholds ?? undefined),
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {avgRating.toFixed(2)}
                    </Text>
                    <Text
                      style={{
                        ...typography.bodySmall,
                        fontWeight: fontWeights.semibold,
                        color: colors.onSurfaceDisabled,
                      }}
                    >
                      /3
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={{
                      fontFamily: typography.h2.fontFamily,
                      fontSize: 28,
                      fontWeight: fontWeights.bold,
                      color: colors.onSurfaceDisabled,
                    }}
                  >
                    --
                  </Text>
                )}
              </View>

              {/* Last Rating (same structure as last infraction) */}
              {lastRating && (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: colors.outline,
                    paddingTop: spacing[2],
                    gap: 2,
                  }}
                >
                  <Text
                    style={{
                      ...typography.labelSmall,
                      color: colors.onSurfaceDisabled,
                    }}
                  >
                    Last Rating
                  </Text>
                  <Text
                    style={{
                      ...typography.bodySmall,
                      fontWeight: fontWeights.semibold,
                      color: colors.onSurface,
                    }}
                    numberOfLines={1}
                  >
                    {lastRating.position}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
                    <Text
                      style={{
                        ...typography.labelSmall,
                        color: colors.onSurfaceDisabled,
                      }}
                    >
                      {formatDate(lastRating.created_at)}
                    </Text>
                    {lastRating.rating_avg != null && (
                      <Text
                        style={{
                          ...typography.labelSmall,
                          fontWeight: fontWeights.bold,
                          color: getRatingColor(lastRating.rating_avg, data.thresholds ?? undefined),
                        }}
                      >
                        {lastRating.rating_avg.toFixed(1)}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          </GlassCard>
        </View>

        {/* Right: Discipline Points */}
        <View style={{ flex: 1 }}>
          <GlassCard>
            <View style={{ gap: spacing[3] }}>
              {/* Title row */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
                <Gavel size={16} color={colors.onSurfaceVariant} strokeWidth={1.5} />
                <Text
                  style={{
                    ...typography.labelMedium,
                    fontWeight: fontWeights.semibold,
                    color: colors.onSurfaceVariant,
                  }}
                  numberOfLines={1}
                >
                  Discipline Points
                </Text>
              </View>

              {/* Points value */}
              <View style={{ alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                  <Text
                    style={{
                      fontFamily: typography.h2.fontFamily,
                      fontSize: 28,
                      fontWeight: fontWeights.bold,
                      color: totalPoints > 0 ? pointsStyle.bg : colors.onSurface,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {totalPoints}
                  </Text>
                  {maxThreshold != null && (
                    <Text
                      style={{
                        ...typography.bodySmall,
                        fontWeight: fontWeights.semibold,
                        color: colors.onSurfaceDisabled,
                      }}
                    >
                      /{maxThreshold}
                    </Text>
                  )}
                </View>
              </View>

              {/* Last infraction (inside this card) */}
              {lastInfraction && (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: colors.outline,
                    paddingTop: spacing[2],
                    gap: 2,
                  }}
                >
                  <Text
                    style={{
                      ...typography.labelSmall,
                      color: colors.onSurfaceDisabled,
                    }}
                  >
                    Last Infraction
                  </Text>
                  <Text
                    style={{
                      ...typography.bodySmall,
                      fontWeight: fontWeights.semibold,
                      color: colors.onSurface,
                    }}
                    numberOfLines={1}
                  >
                    {lastInfraction.infraction}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
                    <Text
                      style={{
                        ...typography.labelSmall,
                        color: colors.onSurfaceDisabled,
                      }}
                    >
                      {formatDate(lastInfraction.infraction_date)}
                    </Text>
                    {lastInfraction.points != null && lastInfraction.points > 0 && (
                      <Text
                        style={{
                          ...typography.labelSmall,
                          fontWeight: fontWeights.bold,
                          color: "#dc2626",
                        }}
                      >
                        +{lastInfraction.points} pts
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          </GlassCard>
        </View>
      </View>

      {/* ── Row 2: Pathway + Evaluations ── */}
      <View style={{ flexDirection: "row", gap: spacing[3] }}>
        {/* Left: Pathway */}
        <View style={{ flex: 1 }}>
          <GlassCard>
            <View style={{ gap: spacing[3] }}>
              {/* Title row */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
                <GraduationCap size={16} color={colors.onSurfaceVariant} strokeWidth={1.5} />
                <Text
                  style={{
                    ...typography.labelMedium,
                    fontWeight: fontWeights.semibold,
                    color: colors.onSurfaceVariant,
                  }}
                >
                  Pathway
                </Text>
              </View>

              {/* Completion value */}
              <View style={{ alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                  <Text
                    style={{
                      fontFamily: typography.h2.fontFamily,
                      fontSize: 28,
                      fontWeight: fontWeights.bold,
                      color: getScoreColor100(83, data.thresholds),
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    83
                  </Text>
                  <Text
                    style={{
                      ...typography.bodySmall,
                      fontWeight: fontWeights.semibold,
                      color: colors.onSurfaceDisabled,
                    }}
                  >
                    %
                  </Text>
                </View>
              </View>

              {/* Last Plan Progress */}
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: colors.outline,
                  paddingTop: spacing[2],
                  gap: 2,
                }}
              >
                <Text
                  style={{
                    ...typography.labelSmall,
                    color: colors.onSurfaceDisabled,
                  }}
                >
                  Last Plan Progress
                </Text>
                <Text
                  style={{
                    ...typography.bodySmall,
                    fontWeight: fontWeights.semibold,
                    color: colors.onSurface,
                  }}
                  numberOfLines={1}
                >
                  FOH Leadership
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
                  <Text
                    style={{
                      ...typography.labelSmall,
                      color: colors.onSurfaceDisabled,
                    }}
                  >
                    Mar 18, 2026
                  </Text>
                  <Text
                    style={{
                      ...typography.labelSmall,
                      fontWeight: fontWeights.bold,
                      color: getScoreColor100(100, data.thresholds),
                    }}
                  >
                    100%
                  </Text>
                </View>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Right: Evaluations */}
        <View style={{ flex: 1 }}>
          <GlassCard>
            <View style={{ gap: spacing[3] }}>
              {/* Title row */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
                <CalendarCheck size={16} color={colors.onSurfaceVariant} strokeWidth={1.5} />
                <Text
                  style={{
                    ...typography.labelMedium,
                    fontWeight: fontWeights.semibold,
                    color: colors.onSurfaceVariant,
                  }}
                  numberOfLines={1}
                >
                  Evaluations
                </Text>
              </View>

              {/* Score value */}
              <View style={{ alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                  <Text
                    style={{
                      fontFamily: typography.h2.fontFamily,
                      fontSize: 28,
                      fontWeight: fontWeights.bold,
                      color: getScoreColor100(87.2, data.thresholds),
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    87.2
                  </Text>
                  <Text
                    style={{
                      ...typography.bodySmall,
                      fontWeight: fontWeights.semibold,
                      color: colors.onSurfaceDisabled,
                    }}
                  >
                    /100
                  </Text>
                </View>
              </View>

              {/* Last Eval */}
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: colors.outline,
                  paddingTop: spacing[2],
                  gap: 2,
                }}
              >
                <Text
                  style={{
                    ...typography.labelSmall,
                    color: colors.onSurfaceDisabled,
                  }}
                >
                  Last Evaluation
                </Text>
                <Text
                  style={{
                    ...typography.bodySmall,
                    fontWeight: fontWeights.semibold,
                    color: colors.onSurface,
                  }}
                  numberOfLines={1}
                >
                  By: Alexandra Chen
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
                  <Text
                    style={{
                      ...typography.labelSmall,
                      color: colors.onSurfaceDisabled,
                    }}
                  >
                    Mar 20, 2026
                  </Text>
                  <Text
                    style={{
                      ...typography.labelSmall,
                      fontWeight: fontWeights.bold,
                      color: getScoreColor100(92.7, data.thresholds),
                    }}
                  >
                    92.7
                  </Text>
                </View>
              </View>
            </View>
          </GlassCard>
        </View>
      </View>

      {/* ── Operational Excellence (expandable) ── */}
      <OECard data={data} />

      {/* Empty state when no data at all */}
      {data.ratings.length === 0 && data.infractions.length === 0 && data.disc_actions.length === 0 && (
        <GlassCard>
          <View style={{ alignItems: "center", gap: spacing[2], paddingVertical: spacing[4] }}>
            <AppIcon name="chart.bar" size={32} tintColor={colors.onSurfaceDisabled} />
            <Text
              style={{
                ...typography.bodyMedium,
                color: colors.onSurfaceDisabled,
                textAlign: "center",
              }}
            >
              No activity in the last 90 days
            </Text>
          </View>
        </GlassCard>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// OE Card — expandable with pillar scores + info modal
// ---------------------------------------------------------------------------

function OECard({ data }: { data: EmployeeProfileResponse }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);

  // Animated chevron rotation
  const rotation = useSharedValue(0);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const toggleExpand = () => {
    haptics.light();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    rotation.value = withTiming(expanded ? 0 : 180, { duration: 250 });
    setExpanded((prev) => !prev);
  };

  const oeScore = data.oe_overall;
  const pillars = data.oe_pillars ?? [];

  return (
    <>
      <GlassCard>
        <View style={{ gap: spacing[3] }}>
          {/* Title row */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
            <Star size={16} color={colors.onSurfaceVariant} strokeWidth={1.5} />
            <Text
              style={{
                ...typography.labelMedium,
                fontWeight: fontWeights.semibold,
                color: colors.onSurfaceVariant,
                flex: 1,
              }}
            >
              Operational Excellence
            </Text>
            {/* Info button */}
            {pillars.length > 0 && (
              <Pressable
                onPress={() => {
                  haptics.light();
                  setInfoVisible(true);
                }}
                hitSlop={8}
              >
                <Info size={18} color={colors.onSurfaceDisabled} strokeWidth={1.5} />
              </Pressable>
            )}
          </View>

          {/* OE overall score */}
          <View style={{ alignItems: "center" }}>
            {oeScore != null ? (
              <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                <Text
                  style={{
                    fontFamily: typography.h2.fontFamily,
                    fontSize: 28,
                    fontWeight: fontWeights.bold,
                    color: getScoreColor100(oeScore, data.thresholds),
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {oeScore.toFixed(1)}
                </Text>
                <Text
                  style={{
                    ...typography.bodySmall,
                    fontWeight: fontWeights.semibold,
                    color: colors.onSurfaceDisabled,
                  }}
                >
                  /100
                </Text>
              </View>
            ) : (
              <Text
                style={{
                  fontFamily: typography.h2.fontFamily,
                  fontSize: 28,
                  fontWeight: fontWeights.bold,
                  color: colors.onSurfaceDisabled,
                }}
              >
                --
              </Text>
            )}
          </View>

          {/* Expanded pillar scores */}
          {expanded && pillars.length > 0 && (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.outline,
                paddingTop: spacing[3],
                gap: spacing[2],
              }}
            >
              {pillars.map((pillar) => (
                <View
                  key={pillar.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flex: 1, marginRight: spacing[2] }}>
                    <Text
                      style={{
                        ...typography.bodySmall,
                        fontWeight: fontWeights.semibold,
                        color: colors.onSurface,
                      }}
                      numberOfLines={1}
                    >
                      {pillar.name}
                    </Text>
                    <Text
                      style={{
                        ...typography.labelSmall,
                        color: colors.onSurfaceDisabled,
                      }}
                    >
                      {pillar.weight}% weight
                    </Text>
                  </View>
                  {pillar.score != null ? (
                    <View
                      style={{
                        backgroundColor: getScoreColor100(pillar.score, data.thresholds),
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 8,
                        borderCurve: "continuous",
                        minWidth: 48,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: fontWeights.bold,
                          color: "#ffffff",
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {pillar.score.toFixed(1)}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={{
                        ...typography.bodySmall,
                        fontWeight: fontWeights.semibold,
                        color: colors.onSurfaceDisabled,
                      }}
                    >
                      --
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Expand/collapse caret */}
          {pillars.length > 0 && (
            <Pressable
              onPress={toggleExpand}
              style={{
                alignSelf: "center",
                paddingTop: spacing[1],
                paddingHorizontal: spacing[4],
                hitSlop: 8,
              }}
            >
              <Animated.View style={chevronStyle}>
                <ChevronDown size={20} color={colors.onSurfaceDisabled} strokeWidth={2} />
              </Animated.View>
            </Pressable>
          )}
        </View>
      </GlassCard>

      {/* Pillar Descriptions Modal */}
      <PillarDescriptionsDrawer
        visible={infoVisible}
        onClose={() => setInfoVisible(false)}
        pillars={pillars}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Pillar Descriptions Drawer (info modal)
// ---------------------------------------------------------------------------

function PillarDescriptionsDrawer({
  visible,
  onClose,
  pillars,
}: {
  visible: boolean;
  onClose: () => void;
  pillars: EmployeeProfileResponse["oe_pillars"];
}) {
  const colors = useColors();

  return (
    <GlassDrawer visible={visible} onClose={onClose} title="OE Pillar Descriptions">
      <View style={{ gap: spacing[4] }}>
        {/* Subtitle */}
        <Text
          style={{
            ...typography.bodySmall,
            color: colors.onSurfaceVariant,
            lineHeight: 20,
          }}
        >
          These pillars are used to calculate overall operational excellence
          scores. Each pillar has a weight that determines its contribution to
          the total score.
        </Text>

        {/* Pillar cards */}
        {pillars.map((pillar) => (
          <View
            key={pillar.id}
            style={{
              backgroundColor: colors.surfaceVariant,
              borderRadius: borderRadius.md,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: colors.outline,
              padding: spacing[4],
              gap: spacing[2],
            }}
          >
            {/* Header: name + weight badge */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  ...typography.labelLarge,
                  fontWeight: fontWeights.semibold,
                  color: colors.onSurface,
                  flex: 1,
                  marginRight: spacing[2],
                }}
              >
                {pillar.name}
              </Text>
              <View
                style={{
                  backgroundColor: colors.successTransparent ?? "rgba(36,158,107,0.12)",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <Text
                  style={{
                    ...typography.labelSmall,
                    fontWeight: fontWeights.semibold,
                    color: colors.success,
                  }}
                >
                  {pillar.weight}%
                </Text>
              </View>
            </View>

            {/* Description */}
            <Text
              style={{
                ...typography.bodySmall,
                color: colors.onSurfaceVariant,
                lineHeight: 20,
              }}
            >
              {pillar.description}
            </Text>
          </View>
        ))}
      </View>
    </GlassDrawer>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  try {
    // Handle both date-only (YYYY-MM-DD) and full ISO timestamps
    const date = dateStr.includes("T")
      ? new Date(dateStr)
      : new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default OverviewTab;
