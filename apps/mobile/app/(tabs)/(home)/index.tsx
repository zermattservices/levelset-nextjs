/**
 * Home Tab
 * Dashboard with greeting, quick actions that open form sheets
 * Avatar bubble in top-left opens account modal
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Image as ExpoImage } from "expo-image";
import { useAuth } from "../../../src/context/AuthContext";
import { useForms } from "../../../src/context/FormsContext";
import { useLocation } from "../../../src/context/LocationContext";
import { useColors } from "../../../src/context/ThemeContext";
import { typography, fontWeights, fontSizes } from "../../../src/lib/fonts";
import { spacing, borderRadius, haptics } from "../../../src/lib/theme";
import { AppIcon } from "../../../src/components/ui";
import { GlassCard } from "../../../src/components/glass";
import "../../../src/lib/i18n";

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fullName, profileImage, email } = useAuth();
  const { lastSubmission, clearLastSubmission } = useForms();
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Fixed header — matches Levi/Schedule exactly */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[1] }]}>
        {/* Left — avatar bubble */}
        <Pressable
          onPress={() => {
            haptics.light();
            router.push("/(tabs)/(home)/account");
          }}
          style={styles.avatarBubble}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.onPrimary }]}>{getInitials(fullName)}</Text>
            </View>
          )}
        </Pressable>

        {/* Center — location selector */}
        {!isLoading && locations.length > 0 ? (
          <Pressable
            onPress={() => {
              if (!singleLocation) {
                haptics.light();
                router.push("/(tabs)/(home)/location-picker");
              }
            }}
            disabled={singleLocation}
            style={styles.locationSelector}
          >
            {!singleLocation && (
              <AppIcon name="chevron.down" size={12} tintColor={colors.onSurfaceDisabled} />
            )}
            {selectedLocation?.image_url && (
              <View style={styles.locationLogo}>
                <ExpoImage
                  source={{ uri: selectedLocation.image_url }}
                  style={styles.locationLogoImage}
                  contentFit="contain"
                  cachePolicy="disk"
                />
              </View>
            )}
            <Text style={[styles.locationName, { color: colors.onSurface }]} numberOfLines={1}>
              {selectedLocationName || t("home.noLocation")}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.locationSelector}>
            <Text style={[styles.locationName, { color: colors.onSurface }]}>Home</Text>
          </View>
        )}

        {/* Right spacer (matches avatar width for centering) */}
        <View style={styles.headerSpacer} />
      </View>

      {/* Scrollable content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting — left-aligned */}
        <Animated.View entering={FadeIn.delay(50).duration(400)}>
          <Text style={[styles.greeting, { color: colors.onSurfaceVariant }]}>
            {greeting}, <Text style={[styles.userName, { color: colors.onBackground }]}>{firstName}</Text>
          </Text>
        </Animated.View>

        {/* Success banner */}
      {lastSubmission && (
        <Animated.View entering={FadeInDown.duration(300)}>
          <Pressable
            onPress={() => {
              haptics.light();
              clearLastSubmission();
            }}
            style={[styles.successBanner, { backgroundColor: colors.successContainer, borderColor: colors.successTransparent }]}
          >
            <AppIcon name="checkmark.circle.fill" size={20} tintColor={colors.success} />
            <View style={styles.successInfo}>
              <Text selectable style={[styles.successTitle, { color: colors.success }]}>
                {t("home.submittedSuccess")}
              </Text>
              <Text selectable style={[styles.successDetails, { color: colors.onSurfaceVariant }]}>
                {lastSubmission.employeeName} •{" "}
                {lastSubmission.formType === "ratings"
                  ? t("forms.positionalRatings")
                  : t("forms.disciplineInfraction")}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      )}

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.actionsSection}>
        {/* Submit a Rating */}
        <GlassCard
          style={styles.actionCard}
          onPress={() => {
            haptics.light();
            router.push("/forms/ratings");
          }}
        >
          <View style={styles.actionContent}>
            <View style={[styles.iconBadge, { backgroundColor: colors.warningTransparent }]}>
              <AppIcon name="star.fill" size={22} tintColor={colors.warning} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: colors.onSurface }]}>{t("home.submitRating")}</Text>
              <Text style={[styles.actionDescription, { color: colors.onSurfaceVariant }]}>
                {t("home.submitRatingDesc")}
              </Text>
            </View>
            <AppIcon name="chevron.right" size={16} tintColor={colors.onSurfaceDisabled} />
          </View>
        </GlassCard>

        {/* Submit an Infraction */}
        <GlassCard
          style={styles.actionCard}
          onPress={() => {
            haptics.light();
            router.push("/forms/infractions");
          }}
        >
          <View style={styles.actionContent}>
            <View style={[styles.iconBadge, { backgroundColor: colors.errorTransparent }]}>
              <AppIcon name="exclamationmark.triangle" size={22} tintColor={colors.error} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: colors.onSurface }]}>{t("home.submitInfraction")}</Text>
              <Text style={[styles.actionDescription, { color: colors.onSurfaceVariant }]}>
                {t("home.submitInfractionDesc")}
              </Text>
            </View>
            <AppIcon name="chevron.right" size={16} tintColor={colors.onSurfaceDisabled} />
          </View>
        </GlassCard>

        {/* Manage Team */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <GlassCard style={styles.actionCard}>
            <View style={styles.actionContent}>
              <View style={[styles.iconBadge, { backgroundColor: colors.infoTransparent }]}>
                <AppIcon name="person.2" size={22} tintColor={colors.info} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={[styles.actionTitle, { color: colors.onSurface }]}>{t("home.manageTeam")}</Text>
                <Text style={[styles.actionDescription, { color: colors.onSurfaceVariant }]}>
                  {t("common.comingSoon")}
                </Text>
              </View>
              <AppIcon name="chevron.right" size={16} tintColor={colors.onSurfaceDisabled} />
            </View>
          </GlassCard>
        </Animated.View>
      </Animated.View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  avatarBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
  },
  locationSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    flex: 1,
    paddingVertical: spacing[1],
  },
  locationLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  locationLogoImage: {
    width: 18,
    height: 18,
  },
  locationName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    maxWidth: 200,
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[5],
    gap: spacing[3],
  },
  greeting: {
    ...typography.h2,
    fontWeight: fontWeights.semibold,
    letterSpacing: -0.3,
  },
  userName: {
    fontWeight: fontWeights.bold,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    padding: spacing[4],
    borderWidth: 1,
    gap: spacing[3],
  },
  successInfo: {
    flex: 1,
  },
  successTitle: {
    ...typography.labelMedium,
  },
  successDetails: {
    ...typography.bodySmall,
    marginTop: 1,
  },
  actionsSection: {
    gap: spacing[3],
  },
  actionCard: {
    marginBottom: 0,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    ...typography.bodyMedium,
    fontWeight: fontWeights.semibold,
    marginBottom: 2,
  },
  actionDescription: {
    ...typography.bodySmall,
  },
});
