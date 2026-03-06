/**
 * Review Detail Screen (Stub)
 * Shows basic review info parsed from activity data.
 * Full review details will be added in a future release.
 */

import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useColors } from "../../../src/context/ThemeContext";
import { typography, fontWeights } from "../../../src/lib/fonts";
import { spacing, borderRadius } from "../../../src/lib/theme";
import { GlassCard } from "../../../src/components/glass";
import { AppIcon } from "../../../src/components/ui";
import type { RecentActivity } from "../../../src/lib/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReviewDetailScreen() {
  const { activityData } = useLocalSearchParams<{ activityData: string }>();
  const colors = useColors();
  const { t } = useTranslation();

  let activity: RecentActivity | null = null;
  try {
    activity = activityData ? JSON.parse(activityData) : null;
  } catch {
    activity = null;
  }

  if (!activity) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
          gap: spacing[2],
        }}
      >
        <AppIcon
          name="exclamationmark.circle"
          size={32}
          tintColor={colors.onSurfaceDisabled}
        />
        <Text
          selectable
          style={{ ...typography.bodySmall, color: colors.onSurfaceDisabled }}
        >
          Review not found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: spacing[5],
        gap: spacing[4],
        paddingBottom: spacing[10],
      }}
    >
      {/* Review Card */}
        <GlassCard>
          <View style={{ alignItems: "center", gap: spacing[3] }}>
            {/* Author */}
            <Text
              style={{
                ...typography.h3,
                color: colors.onSurface,
                textAlign: "center",
              }}
            >
              {activity.author_name || "Anonymous"}
            </Text>

            {/* Star rating */}
            {activity.review_rating != null && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing[1],
                }}
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <AppIcon
                    key={i}
                    name={i < activity!.review_rating! ? "star.fill" : "star"}
                    size={24}
                    tintColor={
                      i < activity!.review_rating!
                        ? colors.warning
                        : colors.onSurfaceDisabled
                    }
                  />
                ))}
              </View>
            )}

            {/* Date */}
            <Text
              style={{
                ...typography.bodySmall,
                color: colors.onSurfaceVariant,
              }}
            >
              {formatDate(activity.date)}
            </Text>
          </View>
        </GlassCard>

      {/* Review Text */}
      {activity.review_text_preview && (
          <GlassCard>
            <View style={{ gap: spacing[2] }}>
              <Text
                style={{
                  ...typography.labelLarge,
                  fontWeight: fontWeights.semibold,
                  color: colors.onSurface,
                }}
              >
                {t("recentActivities.review")}
              </Text>
              <Text
                selectable
                style={{
                  ...typography.bodyMedium,
                  color: colors.onSurfaceVariant,
                }}
              >
                {activity.review_text_preview}
              </Text>
            </View>
          </GlassCard>
      )}

      {/* Coming Soon */}
        <GlassCard>
          <View style={{ alignItems: "center", gap: spacing[3], paddingVertical: spacing[4] }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.infoTransparent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppIcon
                name="sparkles"
                size={28}
                tintColor={colors.info}
              />
            </View>
            <Text
              style={{
                ...typography.labelLarge,
                fontWeight: fontWeights.semibold,
                color: colors.onSurface,
                textAlign: "center",
              }}
            >
              {t("recentActivities.comingSoon")}
            </Text>
            <Text
              style={{
                ...typography.bodySmall,
                color: colors.onSurfaceDisabled,
                textAlign: "center",
                maxWidth: 260,
              }}
            >
              Full review details and response tools will be available in a future update.
            </Text>
          </View>
        </GlassCard>
    </ScrollView>
  );
}
