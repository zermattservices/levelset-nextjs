/**
 * LocationSelector
 * Centered location selector for the home screen.
 * Shows current location name with logo (if available) and a caret;
 * tapping opens a native formSheet with liquid glass background.
 */

import React from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLocation } from "../../context/LocationContext";
import { useColors } from "../../context/ThemeContext";
import { fontWeights, fontSizes } from "../../lib/fonts";
import { spacing, haptics } from "../../lib/theme";
import { AppIcon } from "./AppIcon";
import "../../lib/i18n";

export function LocationSelector() {
  const { t } = useTranslation();
  const colors = useColors();
  const router = useRouter();
  const {
    selectedLocation,
    selectedLocationName,
    hasMultipleLocations,
    isLoading,
    locations,
  } = useLocation();

  // Don't render anything while loading or if no locations exist
  if (isLoading || locations.length === 0) return null;

  return (
    <Pressable
      onPress={() => {
        if (hasMultipleLocations || !selectedLocation) {
          haptics.light();
          router.push("/(tabs)/(home)/location-picker");
        }
      }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing[2],
        paddingVertical: spacing[1],
      }}
      disabled={!hasMultipleLocations && !!selectedLocation}
    >
      {hasMultipleLocations && (
        <AppIcon name="chevron.down" size={12} tintColor={colors.onSurfaceDisabled} />
      )}

      {/* Inline logo for selected location */}
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
          <Image
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
          maxWidth: 260,
          color: colors.onSurface,
        }}
        numberOfLines={1}
      >
        {selectedLocationName || t("home.noLocation")}
      </Text>
    </Pressable>
  );
}
