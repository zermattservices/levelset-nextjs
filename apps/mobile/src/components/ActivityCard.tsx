/**
 * ActivityCard Component
 * Renders a card in the Recent Activities list, styled per event type.
 */

import React from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Rocket, Gavel } from "lucide-react-native";
import { useColors } from "../context/ThemeContext";
import { typography, fontWeights, fontSizes } from "../lib/fonts";
import { spacing, borderRadius } from "../lib/theme";

const FOH_COLOR = "#006391";
const BOH_COLOR = "#ffcc5b";
import { GlassCard } from "./glass";
import { AppIcon } from "./ui";
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
    case "review":
      return {
        color: colors.info,
        bgColor: colors.infoTransparent,
        renderIcon: (size: number, color: string) => <AppIcon name="star.bubble.fill" size={size} tintColor={color} />,
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
    case "review":
      return t("recentActivities.review");
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
      case "review":
        router.push({
          pathname: "/(tabs)/(home)/review-detail",
          params: { activityData: JSON.stringify(activity) },
        });
        break;
    }
  };

  return (
    <GlassCard onPress={handlePress}>
      {/* Top row: type badge + date */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing[2],
        }}
      >
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
      {activity.type === "review" && <ReviewContent activity={activity} />}
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
        {activity.rater_name && (
          <Text
            style={{ ...typography.bodySmall, color: colors.onSurfaceDisabled }}
            numberOfLines={1}
          >
            {t("recentActivities.ratedBy", { name: activity.rater_name })}
          </Text>
        )}
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

  // Dashboard uses red (#dc2626) for penalties (positive pts), no green — system only tracks penalties
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
      {/* Left: infraction name + leader */}
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
        {activity.leader_name && (
          <Text
            style={{ ...typography.bodySmall, color: colors.onSurfaceDisabled }}
            numberOfLines={1}
          >
            {activity.leader_name}
          </Text>
        )}
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
      {activity.leader_name && (
        <Text
          style={{ ...typography.bodySmall, color: colors.onSurfaceDisabled }}
        >
          {activity.leader_name}
        </Text>
      )}
    </View>
  );
}

function ReviewContent({ activity }: { activity: RecentActivity }) {
  const colors = useColors();

  return (
    <View style={{ gap: 2 }}>
      <Text
        style={{
          ...typography.labelLarge,
          fontWeight: fontWeights.semibold,
          color: colors.onSurface,
        }}
      >
        {activity.author_name || "Anonymous"}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
        {activity.review_rating != null &&
          Array.from({ length: 5 }, (_, i) => (
            <AppIcon
              key={i}
              name={i < activity.review_rating! ? "star.fill" : "star"}
              size={12}
              tintColor={
                i < activity.review_rating!
                  ? colors.warning
                  : colors.onSurfaceDisabled
              }
            />
          ))}
      </View>
      {activity.review_text_preview && (
        <Text
          numberOfLines={1}
          style={{ ...typography.bodySmall, color: colors.onSurfaceVariant }}
        >
          {activity.review_text_preview}
        </Text>
      )}
    </View>
  );
}
