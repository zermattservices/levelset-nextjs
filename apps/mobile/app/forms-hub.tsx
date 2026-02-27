/**
 * Forms Hub
 * Full-screen page accessible from the FAB "View all Forms" action.
 * Has a location selector at top, manila folder tabs for Forms and Submissions.
 */

import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useColors } from "../src/context/ThemeContext";
import { useLocation } from "../src/context/LocationContext";
import { useGlass, isGlassAvailable } from "../src/hooks/useGlass";
import { FolderTabs } from "../src/components/ui/FolderTabs";
import { FormsList } from "../src/components/forms/FormsList";
import { SubmissionsList } from "../src/components/forms/SubmissionsList";
import { SubmissionsFilter } from "../src/components/forms/SubmissionsFilter";
import { AppIcon } from "../src/components/ui/AppIcon";
import { typography, fontWeights, fontSizes } from "../src/lib/fonts";
import { spacing, borderRadius, haptics } from "../src/lib/theme";
import { SubmissionsFilters } from "../src/lib/api";

export default function FormsHubScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { GlassView } = useGlass();
  const glassAvail = isGlassAvailable();
  const {
    selectedLocation,
    selectedLocationName,
    hasMultipleLocations,
    isLoading,
    locations,
  } = useLocation();

  const [activeTab, setActiveTab] = useState("forms");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SubmissionsFilters>({});

  const singleLocation = !hasMultipleLocations && !!selectedLocation;

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handleApplyFilters = useCallback((newFilters: SubmissionsFilters) => {
    setFilters(newFilters);
    setShowFilters(false);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setShowFilters(false);
  }, []);

  const filterButton = (
    <Pressable
      onPress={() => {
        haptics.light();
        setShowFilters((prev) => !prev);
      }}
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: activeFilterCount > 0 ? colors.primaryTransparent : colors.surfaceVariant,
      }}
    >
      <AppIcon
        name="line.3.horizontal.decrease.circle"
        size={16}
        tintColor={activeFilterCount > 0 ? colors.primary : colors.onSurfaceVariant}
      />
      {activeFilterCount > 0 && (
        <View
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: colors.onPrimary, fontSize: 9, fontWeight: fontWeights.bold }}>
            {activeFilterCount}
          </Text>
        </View>
      )}
    </Pressable>
  );

  const tabs = [
    { key: "forms", label: "Forms" },
    {
      key: "submissions",
      label: "Submissions",
      badge: activeTab === "submissions" ? filterButton : undefined,
    },
  ];

  const backButton = (
    <Pressable
      onPress={() => {
        haptics.light();
        router.back();
      }}
      hitSlop={12}
      style={styles.headerButtonPressable}
    >
      <AppIcon
        name="chevron.left"
        size={18}
        tintColor={colors.onSurfaceVariant}
      />
    </Pressable>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[1] }]}>
        {/* Left — back button with glass circle */}
        {glassAvail && GlassView ? (
          <GlassView isInteractive style={styles.headerButton}>
            {backButton}
          </GlassView>
        ) : (
          <View
            style={[
              styles.headerButton,
              { backgroundColor: colors.surfaceVariant },
            ]}
          >
            {backButton}
          </View>
        )}

        {/* Center — location selector */}
        {!isLoading && locations.length > 0 ? (
          <Pressable
            onPress={() => {
              if (!singleLocation) {
                haptics.light();
                // Navigate to the home location picker since forms-hub is a standalone route
                router.push("/(tabs)/(home)/location-picker");
              }
            }}
            disabled={singleLocation}
            style={styles.locationSelector}
          >
            {!singleLocation && (
              <AppIcon
                name="chevron.down"
                size={12}
                tintColor={colors.onSurfaceDisabled}
              />
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
            <Text
              style={[styles.locationName, { color: colors.onSurface }]}
              numberOfLines={1}
            >
              {selectedLocationName || "Forms"}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.locationSelector}>
            <Text style={[styles.locationName, { color: colors.onSurface }]}>
              Forms
            </Text>
          </View>
        )}

        {/* Right spacer (matches back button width for centering) */}
        <View style={styles.headerButtonSpacer} />
      </View>

      {/* Manila folder tabs */}
      <FolderTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Filter panel (slides in between tabs and list) */}
      {activeTab === "submissions" && showFilters && (
        <SubmissionsFilter
          filters={filters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />
      )}

      {/* Content area — connected to active tab */}
      <View style={[styles.contentContainer, { backgroundColor: colors.surface }]}>
        {activeTab === "forms" ? (
          <FormsList />
        ) : (
          <SubmissionsList
            filters={filters}
            onFilterPress={() => setShowFilters((prev) => !prev)}
            activeFilterCount={activeFilterCount}
          />
        )}
      </View>
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
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerButtonPressable: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonSpacer: {
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
  contentContainer: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
});
