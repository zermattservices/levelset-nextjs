/**
 * RecentActivities Component
 * Self-contained section that fetches and displays the last 5 activities
 * the employee received (ratings, infractions, disc_actions, reviews).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useColors } from "../context/ThemeContext";
import { typography, fontWeights } from "../lib/fonts";
import { spacing, borderRadius, haptics } from "../lib/theme";
import { GlassCard } from "./glass";
import { AppIcon } from "./ui";
import { ActivityCard } from "./ActivityCard";
import { fetchRecentActivitiesAuth } from "../lib/api";
import type { RecentActivity, RatingThresholds } from "../lib/api";
import { DEFAULT_THRESHOLDS } from "../lib/rating-colors";

interface RecentActivitiesProps {
  accessToken: string | null;
  locationId: string | null;
  employeeId: string | null;
  refreshKey?: number;
}

export function RecentActivities({
  accessToken,
  locationId,
  employeeId,
  refreshKey = 0,
}: RecentActivitiesProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [thresholds, setThresholds] = useState<RatingThresholds>(DEFAULT_THRESHOLDS);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  const prevRefreshKey = useRef(refreshKey);

  const fetchActivities = useCallback(async (skipCache = false) => {
    if (!accessToken || !locationId || !employeeId) {
      setInitialLoading(false);
      return;
    }

    // Only show skeleton on the very first load (no cached data yet)
    if (!hasLoaded.current) {
      setInitialLoading(true);
    }
    setError(null);

    try {
      const data = await fetchRecentActivitiesAuth(
        accessToken,
        locationId,
        employeeId,
        { skipCache }
      );
      // Show only the first 5 on the home page; full dataset is cached for All Activities
      setActivities(data.activities.slice(0, 5));
      if (data.thresholds) setThresholds(data.thresholds);
      hasLoaded.current = true;
    } catch (err: any) {
      console.error("Failed to fetch recent activities:", err);
      // Only show error if we have no data to display
      if (!hasLoaded.current) {
        setError(err.message || "Failed to load");
      }
    } finally {
      setInitialLoading(false);
    }
  }, [accessToken, locationId, employeeId]);

  useEffect(() => {
    const isRefresh = prevRefreshKey.current !== refreshKey;
    prevRefreshKey.current = refreshKey;
    fetchActivities(isRefresh);
  }, [fetchActivities, refreshKey]);

  // Don't render section at all if no auth context
  if (!accessToken || !locationId || !employeeId) {
    return null;
  }

  // Show skeleton only on initial load with no data
  const showSkeleton = initialLoading && activities.length === 0;

  return (
    <View style={{ gap: spacing[3] }}>
      {/* Section header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text
          style={{
            ...typography.h4,
            color: colors.onSurface,
          }}
        >
          {t("home.recentActivities")}
        </Text>
        {activities.length > 0 && (
          <Pressable
            onPress={() => {
              haptics.light();
              router.push("/(tabs)/(home)/all-activities");
            }}
          >
            <Text
              style={{
                ...typography.labelMedium,
                color: colors.primary,
              }}
            >
              See All
            </Text>
          </Pressable>
        )}
      </View>

      {/* Loading state */}
      {showSkeleton && <SkeletonCards colors={colors} />}

      {/* Error state */}
      {!showSkeleton && error && (
        <GlassCard>
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              gap: spacing[2],
              paddingVertical: spacing[3],
            }}
          >
            <AppIcon
              name="exclamationmark.circle"
              size={28}
              tintColor={colors.onSurfaceDisabled}
            />
            <Text
              selectable
              style={{
                ...typography.bodySmall,
                color: colors.onSurfaceDisabled,
                textAlign: "center",
              }}
            >
              Unable to load activities
            </Text>
          </View>
        </GlassCard>
      )}

      {/* Empty state */}
      {!showSkeleton && !error && hasLoaded.current && activities.length === 0 && (
        <GlassCard>
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              gap: spacing[2],
              paddingVertical: spacing[4],
            }}
          >
            <AppIcon
              name="clock.arrow.circlepath"
              size={32}
              tintColor={colors.onSurfaceDisabled}
            />
            <Text
              style={{
                ...typography.bodySmall,
                color: colors.onSurfaceDisabled,
                textAlign: "center",
              }}
            >
              {t("home.noActivities")}
            </Text>
            <Text
              style={{
                ...typography.labelSmall,
                color: colors.onSurfaceDisabled,
                textAlign: "center",
              }}
            >
              {t("home.noActivitiesDesc")}
            </Text>
          </View>
        </GlassCard>
      )}

      {/* Activity cards */}
      {!showSkeleton &&
        !error &&
        activities.map((activity, index) => (
          <Animated.View
            key={`${activity.type}-${activity.id}`}
            entering={FadeIn.delay(index * 60).duration(300)}
          >
            <ActivityCard activity={activity} locationId={locationId} thresholds={thresholds} />
          </Animated.View>
        ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loading
// ---------------------------------------------------------------------------

function SkeletonCards({
  colors,
}: {
  colors: ReturnType<typeof useColors>;
}) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse]);

  return (
    <View style={{ gap: spacing[3] }}>
      {[0, 1, 2].map((i) => (
        <GlassCard key={i}>
          <View style={{ gap: spacing[2] }}>
            {/* Top row: badge + date */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <SkeletonBone width={70} height={20} pulseOpacity={pulse} />
              <SkeletonBone width={50} height={14} pulseOpacity={pulse} />
            </View>
            {/* Primary text */}
            <SkeletonBone
              width={i === 0 ? 120 : i === 1 ? 100 : 140}
              height={16}
              pulseOpacity={pulse}
            />
            {/* Secondary text */}
            <SkeletonBone width={80} height={14} pulseOpacity={pulse} />
          </View>
        </GlassCard>
      ))}
    </View>
  );
}

function SkeletonBone({
  width,
  height,
  pulseOpacity,
}: {
  width: number;
  height: number;
  pulseOpacity: Animated.SharedValue<number>;
}) {
  const animStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: 4,
          borderCurve: "continuous",
          backgroundColor: "rgba(120,120,128,0.12)",
        },
        animStyle,
      ]}
    />
  );
}

export default RecentActivities;
