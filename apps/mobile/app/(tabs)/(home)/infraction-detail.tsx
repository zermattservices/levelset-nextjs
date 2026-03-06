/**
 * Infraction Detail Screen
 * Shows complete infraction details including employee name, points tag,
 * date, leader, notes, signatures, and current total points.
 */

import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../src/context/AuthContext";
import { useColors } from "../../../src/context/ThemeContext";
import { typography, fontWeights } from "../../../src/lib/fonts";
import { spacing, borderRadius } from "../../../src/lib/theme";
import { GlassCard } from "../../../src/components/glass";
import { AppIcon } from "../../../src/components/ui";
import { fetchInfractionDetailAuth } from "../../../src/lib/api";
import type { InfractionDetailData } from "../../../src/lib/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PENALTY_RED = "#dc2626";

function formatFullTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }) + " at " + date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getPointsColor(
  points: number,
  colors: ReturnType<typeof useColors>
): string {
  if (points <= 0) return colors.success;
  if (points <= 3) return colors.warning;
  return colors.error;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InfractionDetailScreen() {
  const { infractionId, locationId } = useLocalSearchParams<{
    infractionId: string;
    locationId: string;
  }>();
  const { session } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<InfractionDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token || !locationId || !infractionId) return;

    let cancelled = false;

    (async () => {
      try {
        const result = await fetchInfractionDetailAuth(
          session.access_token,
          locationId,
          infractionId
        );
        if (!cancelled) setData(result);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, locationId, infractionId]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !data) {
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
          {error || "Infraction not found"}
        </Text>
      </View>
    );
  }

  const { infraction, total_points } = data;

  const pointsColor =
    infraction.points > 0
      ? PENALTY_RED
      : colors.onSurfaceVariant;

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
      {/* Main Infraction Card */}
      <GlassCard>
        <View style={{ gap: spacing[4] }}>
          {/* Header row: info left, points tag right */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            {/* Left: employee name, infraction type, timestamp, leader */}
            <View style={{ gap: spacing[1], flex: 1, marginRight: spacing[3] }}>
              {infraction.employee_name && (
                <Text
                  style={{
                    ...typography.h3,
                    color: colors.onSurface,
                  }}
                  numberOfLines={1}
                >
                  {infraction.employee_name}
                </Text>
              )}
              <Text
                style={{
                  ...typography.labelLarge,
                  fontWeight: fontWeights.semibold,
                  color: colors.onSurface,
                }}
                numberOfLines={2}
              >
                {i18n.language === "es" ? (infraction.infraction_es || infraction.infraction) : infraction.infraction}
              </Text>
              <Text
                style={{
                  ...typography.bodySmall,
                  color: colors.onSurfaceVariant,
                }}
              >
                {formatFullTimestamp(infraction.created_at)}
              </Text>
              {infraction.leader_name && (
                <Text
                  style={{
                    ...typography.labelSmall,
                    color: colors.onSurfaceDisabled,
                  }}
                >
                  {t("recentActivities.leader")}: {infraction.leader_name}
                </Text>
              )}
            </View>

            {/* Right: points tag (same style as home page cards) */}
            <View
              style={{
                backgroundColor: pointsColor,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 10,
                borderCurve: "continuous",
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
                {infraction.points > 0 ? "+" : ""}
                {infraction.points} pts
              </Text>
            </View>
          </View>

          {/* Notes (inline in the same card) */}
          {infraction.notes && (
            <>
              <View style={{ height: 1, backgroundColor: colors.outline }} />
              <View style={{ gap: spacing[2] }}>
                <Text
                  style={{
                    ...typography.labelLarge,
                    fontWeight: fontWeights.semibold,
                    color: colors.onSurface,
                  }}
                >
                  {t("recentActivities.notes")}
                </Text>
                <Text
                  selectable
                  style={{
                    ...typography.bodyMedium,
                    color: colors.onSurfaceVariant,
                  }}
                >
                  {infraction.notes}
                </Text>
              </View>
            </>
          )}

          {/* Signatures (inline in the same card) */}
          {(infraction.team_member_signature || infraction.leader_signature) && (
            <>
              <View style={{ height: 1, backgroundColor: colors.outline }} />
              <View style={{ gap: spacing[4] }}>
                {infraction.team_member_signature && (
                  <View style={{ gap: spacing[2] }}>
                    <Text
                      style={{
                        ...typography.labelLarge,
                        fontWeight: fontWeights.semibold,
                        color: colors.onSurface,
                      }}
                    >
                      {t("recentActivities.teamMemberSignature")}
                    </Text>
                    <View
                      style={{
                        backgroundColor: colors.surfaceDisabled,
                        borderRadius: borderRadius.md,
                        borderCurve: "continuous",
                        padding: spacing[3],
                        alignItems: "center",
                      }}
                    >
                      <Image
                        source={{ uri: infraction.team_member_signature }}
                        style={{ width: "100%", height: 80 }}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                )}
                {infraction.team_member_signature && infraction.leader_signature && (
                  <View style={{ height: 1, backgroundColor: colors.outline }} />
                )}
                {infraction.leader_signature && (
                  <View style={{ gap: spacing[2] }}>
                    <Text
                      style={{
                        ...typography.labelLarge,
                        fontWeight: fontWeights.semibold,
                        color: colors.onSurface,
                      }}
                    >
                      {t("recentActivities.leaderSignature")}
                    </Text>
                    <View
                      style={{
                        backgroundColor: colors.surfaceDisabled,
                        borderRadius: borderRadius.md,
                        borderCurve: "continuous",
                        padding: spacing[3],
                        alignItems: "center",
                      }}
                    >
                      <Image
                        source={{ uri: infraction.leader_signature }}
                        style={{ width: "100%", height: 80 }}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </GlassCard>

      {/* Total Points Card — taps to employee overview */}
      <GlassCard
        onPress={() => {
          if (infraction.employee_id) {
            router.push({
              pathname: "/(tabs)/(home)/employee-overview",
              params: { employeeId: infraction.employee_id, locationId },
            });
          }
        }}
      >
        <View style={{ alignItems: "center", gap: spacing[2] }}>
          <Text
            style={{
              ...typography.labelLarge,
              fontWeight: fontWeights.semibold,
              color: colors.onSurface,
            }}
          >
            {t("recentActivities.currentPointTotal")}
          </Text>
          <Text
            style={{
              fontFamily: typography.h1.fontFamily,
              fontSize: 48,
              fontWeight: fontWeights.bold,
              color: getPointsColor(total_points, colors),
              fontVariant: ["tabular-nums"],
            }}
          >
            {total_points}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
            <Text
              style={{
                ...typography.labelSmall,
                color: colors.onSurfaceDisabled,
              }}
            >
              See all discipline records
            </Text>
            <AppIcon name="chevron.right" size={10} tintColor={colors.onSurfaceDisabled} />
          </View>
        </View>
      </GlassCard>
    </ScrollView>
  );
}
