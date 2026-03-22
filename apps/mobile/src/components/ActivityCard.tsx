/**
 * ActivityCard Component
 * Renders a card in the Recent Activities list, styled per event type.
 */

import React from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Rocket, Gavel, CalendarCheck, ArrowUpRight } from "lucide-react-native";
import { useColors } from "../context/ThemeContext";
import { typography, fontWeights, fontSizes } from "../lib/fonts";
import { spacing, borderRadius } from "../lib/theme";

const FOH_COLOR = "#006391";
const BOH_COLOR = "#ffcc5b";
import { GlassCard } from "./glass";
import type { RecentActivity, RatingThresholds } from "../lib/api";
import { getRatingColor } from "../lib/rating-colors";
import { formatRelativeDate } from "../lib/date-utils";

interface ActivityCardProps {
  activity: RecentActivity;
  locationId: string;
  thresholds?: RatingThresholds;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTypeConfig(
  type: RecentActivity["type"],
  colors: ReturnType<typeof useColors>
) {
  switch (type) {
    case "rating":
      return {
        color: colors.success,
        bgColor: colors.successTransparent,
        renderIcon: (size: number, color: string) => <Rocket size={size} color={color} strokeWidth={1.5} />,
      };
    case "infraction":
      return {
        color: colors.error,
        bgColor: colors.errorTransparent,
        renderIcon: (size: number, color: string) => <Gavel size={size} color={color} strokeWidth={1.5} />,
      };
    case "disc_action":
      return {
        color: colors.warning,
        bgColor: colors.warningTransparent,
        renderIcon: (size: number, color: string) => <Gavel size={size} color={color} strokeWidth={1.5} />,
      };
    case "evaluation":
      return {
        color: colors.primary,
        bgColor: colors.primaryTransparent,
        renderIcon: (size: number, color: string) => <CalendarCheck size={size} color={color} strokeWidth={1.5} />,
      };
  }
}

function getTypeLabel(
  type: RecentActivity["type"],
  t: (key: string) => string
) {
  switch (type) {
    case "rating":
      return t("recentActivities.rating");
    case "infraction":
      return t("recentActivities.infraction");
    case "disc_action":
      return t("recentActivities.discAction");
    case "evaluation":
      return "Evaluation";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActivityCard({ activity, locationId, thresholds }: ActivityCardProps) {
  const router = useRouter();
  const colors = useColors();
  const { t } = useTranslation();
  const config = getTypeConfig(activity.type, colors);

  const handlePress = () => {
    switch (activity.type) {
      case "rating":
        router.push({
          pathname: "/(tabs)/(home)/rating-detail",
          params: { ratingId: activity.id, locationId },
        });
        break;
      case "infraction":
        router.push({
          pathname: "/(tabs)/(home)/infraction-detail",
          params: { infractionId: activity.id, locationId },
        });
        break;
      case "disc_action":
        router.push({
          pathname: "/(tabs)/(home)/infraction-detail",
          params: { infractionId: activity.id, locationId, isDiscAction: "true" },
        });
        break;
      case "evaluation":
        if (activity.employee_id) {
          router.push({
            pathname: "/(tabs)/(home)/employee-overview",
            params: { employeeId: activity.employee_id, locationId },
          });
        }
        break;
    }
  };

  return (
    <GlassCard onPress={handlePress}>
      {/* Top row: type badge + outgoing tag + date */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing[2],
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[2],
              backgroundColor: config.bgColor,
              paddingHorizontal: spacing[2],
              paddingVertical: 3,
              borderRadius: borderRadius.sm,
              borderCurve: "continuous",
            }}
          >
            {config.renderIcon(12, config.color)}
            <Text
              style={{
                ...typography.labelSmall,
                fontWeight: fontWeights.semibold,
                color: config.color,
            }}
          >
            {getTypeLabel(activity.type, t)}
          </Text>
          </View>
          {activity.is_outgoing && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
                backgroundColor: colors.surfaceVariant,
                paddingHorizontal: spacing[2],
                paddingVertical: 3,
                borderRadius: borderRadius.sm,
                borderCurve: "continuous",
              }}
            >
              <ArrowUpRight size={10} color={colors.onSurfaceVariant} strokeWidth={2} />
              <Text
                style={{
                  ...typography.labelSmall,
                  fontWeight: fontWeights.semibold,
                  color: colors.onSurfaceVariant,
                }}
              >
                Outgoing
              </Text>
            </View>
          )}
        </View>
        <Text
          style={{
            ...typography.labelSmall,
            color: colors.onSurfaceDisabled,
          }}
        >
          {formatRelativeDate(activity.date)}
        </Text>
      </View>

      {/* Primary + secondary content */}
      {activity.type === "rating" && <RatingContent activity={activity} thresholds={thresholds} />}
      {activity.type === "infraction" && (
        <InfractionContent activity={activity} />
      )}
      {activity.type === "disc_action" && (
        <DiscActionContent activity={activity} />
      )}
      {activity.type === "evaluation" && <EvaluationContent activity={activity} />}
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Type-specific content
// ---------------------------------------------------------------------------

function RatingContent({ activity, thresholds }: { activity: RecentActivity; thresholds?: RatingThresholds }) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const positionLabel = isEs ? (activity.position_es || activity.position) : activity.position;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* Left: position + rater */}
      <View style={{ gap: 2, flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
          <Text
            style={{
              ...typography.labelLarge,
              fontWeight: fontWeights.semibold,
              color: colors.onSurface,
            }}
            numberOfLines={1}
          >
            {positionLabel}
          </Text>
          {activity.zone && (
            <View
              style={{
                paddingHorizontal: 6,
                height: 18,
                borderRadius: 999,
                backgroundColor:
                  activity.zone === "FOH" ? FOH_COLOR : BOH_COLOR,
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
                {activity.zone}
              </Text>
            </View>
          )}
        </View>
        <Text
          style={{ ...typography.bodySmall, color: colors.onSurfaceDisabled }}
          numberOfLines={1}
        >
          {activity.is_outgoing
            ? `Rated by You · ${activity.recipient_name || ""}`
            : activity.rater_name
              ? t("recentActivities.ratedBy", { name: activity.rater_name })
              : ""}
        </Text>
      </View>

      {/* Right: score tag */}
      {activity.rating_avg != null && (
        <View
          style={{
            backgroundColor: getRatingColor(activity.rating_avg, thresholds),
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
            {activity.rating_avg.toFixed(1)}
          </Text>
        </View>
      )}
    </View>
  );
}

function InfractionContent({ activity }: { activity: RecentActivity }) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const isEs = i18n.language === 'es';

  const PENALTY_RED = "#dc2626";
  const pointsColor =
    activity.points != null && activity.points > 0
      ? PENALTY_RED
      : colors.onSurfaceVariant;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* Left: infraction name + submitter */}
      <View style={{ gap: 2, flex: 1 }}>
        <Text
          style={{
            ...typography.labelLarge,
            fontWeight: fontWeights.semibold,
            color: colors.onSurface,
          }}
          numberOfLines={1}
        >
          {isEs ? (activity.infraction_name_es || activity.infraction_name) : activity.infraction_name}
        </Text>
        <Text
          style={{ ...typography.bodySmall, color: colors.onSurfaceDisabled }}
          numberOfLines={1}
        >
          {activity.is_outgoing
            ? `Submitted by You · ${activity.recipient_name || ""}`
            : activity.leader_name
              ? `Submitted by ${activity.leader_name}`
              : ""}
        </Text>
      </View>

      {/* Right: points tag */}
      {activity.points != null && (
        <View
          style={{
            backgroundColor: pointsColor,
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
            {activity.points > 0 ? "+" : ""}
            {activity.points}
          </Text>
        </View>
      )}
    </View>
  );
}

function DiscActionContent({ activity }: { activity: RecentActivity }) {
  const colors = useColors();
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';

  return (
    <View style={{ gap: 2 }}>
      <Text
        style={{
          ...typography.labelLarge,
          fontWeight: fontWeights.semibold,
          color: colors.onSurface,
        }}
      >
        {isEs ? (activity.action_type_es || activity.action_type) : activity.action_type}
      </Text>
      <Text
        style={{ ...typography.bodySmall, color: colors.onSurfaceDisabled }}
      >
        {activity.is_outgoing
          ? `Submitted by You · ${activity.recipient_name || ""}`
          : activity.leader_name
            ? `Submitted by ${activity.leader_name}`
            : ""}
      </Text>
    </View>
  );
}

function formatCadenceLabel(cadence: string | null | undefined): string {
  switch (cadence) {
    case "monthly": return "Monthly";
    case "quarterly": return "Quarterly";
    case "semi_annual": return "Semi-Annual";
    case "annual": return "Annual";
    default: return "";
  }
}

function getEvalScoreColor(score: number): string {
  if (score >= 80) return "#16A34A";
  if (score >= 60) return "#FACC15";
  return "#D23230";
}

function EvaluationContent({ activity }: { activity: RecentActivity }) {
  const colors = useColors();
  const { i18n } = useTranslation();
  const isEs = i18n.language === "es";

  const title = isEs
    ? (activity.evaluation_name_es || activity.evaluation_name || "Evaluation")
    : (activity.evaluation_name || "Evaluation");

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* Left: title + role tag + evaluator name */}
      <View style={{ gap: 2, flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
          <Text
            style={{
              ...typography.labelLarge,
              fontWeight: fontWeights.semibold,
              color: colors.onSurface,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {activity.employee_role && (
            <RoleBadge
              role={activity.employee_role}
              colorKey={activity.employee_role_color}
            />
          )}
        </View>
        <Text
          style={{ ...typography.bodySmall, color: colors.onSurfaceDisabled }}
          numberOfLines={1}
        >
          {activity.is_outgoing
            ? `Submitted by You · ${activity.recipient_name || ""}`
            : activity.evaluator_name
              ? `Rated by ${activity.evaluator_name}`
              : ""}
        </Text>
      </View>

      {/* Right: score badge */}
      {activity.evaluation_score != null && (
        <View
          style={{
            backgroundColor: getEvalScoreColor(activity.evaluation_score),
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
            borderCurve: "continuous",
            marginLeft: spacing[3],
          }}
        >
          <Text
            style={{
              fontFamily: typography.h2.fontFamily,
              fontSize: 18,
              fontWeight: fontWeights.bold,
              color: "#ffffff",
              fontVariant: ["tabular-nums"],
            }}
          >
            {Math.round(activity.evaluation_score)}%
          </Text>
        </View>
      )}
    </View>
  );
}

/** Role badge matching dashboard RolePill styling */
function RoleBadge({ role, colorKey }: { role: string; colorKey?: string | null }) {
  // Use dashboard role color system
  const bg = colorKey ? getRoleBadgeColor(colorKey).bg : "#E5E7EB";
  const text = colorKey ? getRoleBadgeColor(colorKey).text : "#374151";

  return (
    <View
      style={{
        paddingHorizontal: 6,
        height: 18,
        borderRadius: 999,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: fontWeights.semibold,
          color: text,
        }}
      >
        {role}
      </Text>
    </View>
  );
}

/** Map dashboard role color keys to bg/text colors */
function getRoleBadgeColor(colorKey: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    green: { bg: "#DCFCE7", text: "#166534" },
    blue: { bg: "#DBEAFE", text: "#1E40AF" },
    red: { bg: "#FEE2E2", text: "#991B1B" },
    amber: { bg: "#FEF3C7", text: "#92400E" },
    purple: { bg: "#F3E8FF", text: "#6B21A8" },
    teal: { bg: "#CCFBF1", text: "#115E59" },
    pink: { bg: "#FCE7F3", text: "#9D174D" },
    grey: { bg: "#F3F4F6", text: "#374151" },
    black: { bg: "#1F2937", text: "#F9FAFB" },
    indigo: { bg: "#E0E7FF", text: "#3730A3" },
  };
  return map[colorKey] || map.grey;
}
