/**
 * Forms Tab
 * Main forms screen with form selection cards and route-based navigation
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useForms } from "../../../src/context/FormsContext";
import { useLocation } from "../../../src/context/LocationContext";
import { useColors } from "../../../src/context/ThemeContext";
import { typography, fontWeights, fontSizes } from "../../../src/lib/fonts";
import { spacing, borderRadius, haptics } from "../../../src/lib/theme";
import { GlassCard } from "../../../src/components/glass";
import { AppIcon } from "../../../src/components/ui";

import "../../../src/lib/i18n";

export default function FormsTab() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lastSubmission, clearLastSubmission } = useForms();
  const {
    selectedLocation,
    selectedLocationName,
    hasMultipleLocations,
    isLoading,
    locations,
  } = useLocation();

  const singleLocation = !hasMultipleLocations && !!selectedLocation;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Fixed header — identical to Levi/Schedule/Home */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[1] }]}>
        {/* Left spacer */}
        <View style={styles.headerSpacer} />

        {/* Center — location selector */}
        {!isLoading && locations.length > 0 ? (
          <Pressable
            onPress={() => {
              if (!singleLocation) {
                haptics.light();
                router.push("/(tabs)/(iforms)/location-picker");
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
                <Image
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
            <Text style={[styles.locationName, { color: colors.onSurface }]}>Forms</Text>
          </View>
        )}

        {/* Right spacer */}
        <View style={styles.headerSpacer} />
      </View>

      {/* Scrollable content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          Submit team evaluations and documentation
        </Text>

        {/* Success Message */}
        {lastSubmission && (
          <GlassCard
            style={[styles.successCard, { backgroundColor: colors.successContainer, borderColor: colors.success }]}
            onPress={clearLastSubmission}
          >
            <View style={styles.successContent}>
              <AppIcon name="checkmark.circle.fill" size={20} tintColor={colors.success} />
              <View style={styles.successInfo}>
                <Text style={[styles.successTitle, { color: colors.success }]}>
                  {t("forms.submitSuccess")}
                </Text>
                <Text style={[styles.successDetails, { color: colors.onSurfaceVariant }]}>
                  {lastSubmission.employeeName} •{" "}
                  {lastSubmission.formType === "ratings"
                    ? t("forms.positionalRatings")
                    : t("forms.disciplineInfraction")}
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Positional Ratings Card */}
        <Animated.View entering={FadeIn.delay(0)}>
          <GlassCard
            onPress={() => {
              haptics.light();
              router.push("/forms/ratings");
            }}
          >
            <View style={styles.formCardContent}>
              <View style={[styles.iconContainer, { backgroundColor: colors.warningTransparent }]}>
                <AppIcon name="star.fill" size={24} tintColor={colors.primary} />
              </View>
              <View style={styles.formInfo}>
                <Text style={[styles.formTitle, { color: colors.onSurface }]}>{t("forms.positionalRatings")}</Text>
                <Text style={[styles.formDescription, { color: colors.onSurfaceVariant }]}>
                  Record Big 5 competency scores for team members
                </Text>
              </View>
              <AppIcon name="chevron.right" size={14} tintColor={colors.onSurfaceDisabled} />
            </View>
          </GlassCard>
        </Animated.View>

        {/* Discipline Infractions Card */}
        <Animated.View entering={FadeIn.delay(80)}>
          <GlassCard
            onPress={() => {
              haptics.light();
              router.push("/forms/infractions");
            }}
          >
            <View style={styles.formCardContent}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primaryTransparent }]}>
                <AppIcon name="doc.text.fill" size={24} tintColor={colors.primary} />
              </View>
              <View style={styles.formInfo}>
                <Text style={[styles.formTitle, { color: colors.onSurface }]}>
                  {t("forms.disciplineInfraction")}
                </Text>
                <Text style={[styles.formDescription, { color: colors.onSurfaceVariant }]}>
                  Log infractions and capture acknowledgements
                </Text>
              </View>
              <AppIcon name="chevron.right" size={14} tintColor={colors.onSurfaceDisabled} />
            </View>
          </GlassCard>
        </Animated.View>

        {/* Info */}
        <Text style={[styles.infoText, { color: colors.onSurfaceDisabled }]}>
          Forms will be submitted to the Levelset system. Make sure you have
          an internet connection before submitting.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  headerSpacer: {
    width: 36,
    height: 36,
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
  scrollContent: {
    padding: spacing[4],
    gap: spacing[3],
  },
  subtitle: {
    ...typography.bodyMedium,
  },
  successCard: {
    borderWidth: 1,
  },
  successContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  successInfo: {
    flex: 1,
  },
  successTitle: {
    ...typography.labelLarge,
    marginBottom: 2,
  },
  successDetails: {
    ...typography.bodySmall,
  },
  formCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  formInfo: {
    flex: 1,
  },
  formTitle: {
    ...typography.h4,
    marginBottom: spacing[1],
  },
  formDescription: {
    ...typography.bodySmall,
  },
  infoText: {
    ...typography.bodySmall,
    textAlign: "center",
    paddingHorizontal: spacing[2],
    marginTop: spacing[2],
  },
});
