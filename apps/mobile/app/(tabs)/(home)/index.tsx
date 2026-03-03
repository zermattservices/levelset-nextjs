/**
 * Home Tab
 * Dashboard with greeting, today's schedule card, and pull-to-refresh
 * Avatar bubble in top-left opens account modal
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Image as ExpoImage } from "expo-image";
import { useAuth } from "../../../src/context/AuthContext";
import { useLocation } from "../../../src/context/LocationContext";
import { useColors } from "../../../src/context/ThemeContext";
import { typography, fontWeights, fontSizes } from "../../../src/lib/fonts";
import { spacing, haptics } from "../../../src/lib/theme";
import { AppIcon } from "../../../src/components/ui";
import { TodayCard } from "../../../src/components/today-card";
import { fetchMyTodayAuth } from "../../../src/lib/api";
import type { MyTodayResponse } from "../../../src/lib/api";
import "../../../src/lib/i18n";

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fullName, profileImage, email, session, employeeId } = useAuth();
  const {
    selectedLocation,
    selectedLocationName,
    hasMultipleLocations,
    isLoading,
    locations,
  } = useLocation();

  const firstName = fullName?.split(" ")[0] || "there";
  const greeting = getGreeting(t);
  const singleLocation = !hasMultipleLocations && !!selectedLocation;

  // ---------- Today card state ----------
  const [todayData, setTodayData] = useState<MyTodayResponse | null>(null);
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayError, setTodayError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchToday = useCallback(async () => {
    const accessToken = session?.access_token;
    const locationId = selectedLocation?.id;
    if (!accessToken || !locationId || !employeeId) {
      setTodayLoading(false);
      return;
    }
    try {
      setTodayError(null);
      const data = await fetchMyTodayAuth(accessToken, locationId, employeeId);
      setTodayData(data);
    } catch (err: any) {
      if (err?.status === 403 || err?.status === 404) {
        // 403 = no SCHED_VIEW permission, 404 = endpoint not deployed yet
        setTodayData({ status: "not_scheduled" });
      } else {
        setTodayError(err?.message || "Failed to load");
      }
    } finally {
      setTodayLoading(false);
    }
  }, [session?.access_token, selectedLocation?.id, employeeId]);

  useEffect(() => {
    setTodayLoading(true);
    fetchToday();
  }, [fetchToday]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchToday();
    setRefreshing(false);
  }, [fetchToday]);

  // ---------- Helpers ----------
  const getInitials = (name: string | null | undefined) => {
    if (!name) return email?.charAt(0)?.toUpperCase() || "U";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Fixed header -- matches Levi/Schedule exactly */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing[4],
          paddingBottom: spacing[2],
          paddingTop: insets.top + spacing[1],
        }}
      >
        {/* Left -- avatar bubble */}
        <Pressable
          onPress={() => {
            haptics.light();
            router.push("/(tabs)/(home)/account");
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            overflow: "hidden",
          }}
        >
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={{ width: 36, height: 36, borderRadius: 18 }}
            />
          ) : (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: fontWeights.bold,
                  color: colors.onPrimary,
                }}
              >
                {getInitials(fullName)}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Center -- location selector */}
        {!isLoading && locations.length > 0 ? (
          <Pressable
            onPress={() => {
              if (!singleLocation) {
                haptics.light();
                router.push("/(tabs)/(home)/location-picker");
              }
            }}
            disabled={singleLocation}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing[2],
              flex: 1,
              paddingVertical: spacing[1],
            }}
          >
            {!singleLocation && (
              <AppIcon
                name="chevron.down"
                size={12}
                tintColor={colors.onSurfaceDisabled}
              />
            )}
            {selectedLocation?.image_url && (
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <ExpoImage
                  source={{ uri: selectedLocation.image_url }}
                  style={{ width: 18, height: 18 }}
                  contentFit="contain"
                  cachePolicy="disk"
                />
              </View>
            )}
            <Text
              style={{
                fontSize: fontSizes.lg,
                fontWeight: fontWeights.semibold,
                maxWidth: 200,
                color: colors.onSurface,
              }}
              numberOfLines={1}
            >
              {selectedLocationName || t("home.noLocation")}
            </Text>
          </Pressable>
        ) : (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing[2],
              flex: 1,
              paddingVertical: spacing[1],
            }}
          >
            <Text
              style={{
                fontSize: fontSizes.lg,
                fontWeight: fontWeights.semibold,
                maxWidth: 200,
                color: colors.onSurface,
              }}
            >
              Home
            </Text>
          </View>
        )}

        {/* Right spacer (matches avatar width for centering) */}
        <View style={{ width: 36, height: 36 }} />
      </View>

      {/* Scrollable content */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing[5],
          paddingBottom: spacing[5],
          gap: spacing[3],
        }}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Greeting -- left-aligned */}
        <Animated.View entering={FadeIn.delay(50).duration(400)}>
          <Text
            style={{
              ...typography.h2,
              fontWeight: fontWeights.semibold,
              letterSpacing: -0.3,
              color: colors.onSurfaceVariant,
            }}
          >
            {greeting},{" "}
            <Text
              style={{
                fontWeight: fontWeights.bold,
                color: colors.onBackground,
              }}
            >
              {firstName}
            </Text>
          </Text>
        </Animated.View>

        {/* Today's schedule card */}
        <TodayCard
          data={todayData}
          isLoading={todayLoading}
          error={todayError}
        />
      </ScrollView>
    </View>
  );
}

function getGreeting(t: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t("home.goodMorning");
  if (hour < 17) return t("home.goodAfternoon");
  return t("home.goodEvening");
}
