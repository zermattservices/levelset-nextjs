/**
 * Location Picker Modal
 * Centered modal card with dimmed backdrop.
 * - Width matches home page cards (full width minus spacing[5] * 2)
 * - Height adapts to number of locations (auto-sizes up to a max)
 * - Search bar shown only for Levelset Admin users
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLocation, type LocationRecord } from "../../../src/context/LocationContext";
import { useAuth } from "../../../src/context/AuthContext";
import { useColors } from "../../../src/context/ThemeContext";
import { fontWeights, fontSizes, typography } from "../../../src/lib/fonts";
import { spacing, borderRadius, haptics } from "../../../src/lib/theme";
import { AppIcon } from "../../../src/components/ui";
import "../../../src/lib/i18n";

/** Approximate height per location row */
const ROW_HEIGHT = 64;
/** Header height (title + padding) */
const HEADER_HEIGHT = 60;
/** Search bar height when visible */
const SEARCH_HEIGHT = 52;
/** Bottom padding */
const BOTTOM_PADDING = 16;

export default function LocationPickerModal() {
  const { t } = useTranslation();
  const colors = useColors();
  const router = useRouter();
  const { role } = useAuth();
  const { locations, selectedLocation, selectLocation } = useLocation();
  const { height: screenHeight } = useWindowDimensions();
  const [search, setSearch] = useState("");

  const isAdmin = role === "Levelset Admin";

  const filteredLocations = useMemo(() => {
    if (!search.trim()) return locations;
    const q = search.toLowerCase();
    return locations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        (loc.location_number && loc.location_number.toLowerCase().includes(q))
    );
  }, [locations, search]);

  const handleSelect = (locationId: string) => {
    haptics.selection();
    selectLocation(locationId);
    router.back();
  };

  const dismiss = () => {
    haptics.light();
    router.back();
  };

  // Calculate card height based on content
  const searchBarSpace = isAdmin ? SEARCH_HEIGHT : 0;
  const contentHeight =
    HEADER_HEIGHT +
    searchBarSpace +
    filteredLocations.length * ROW_HEIGHT +
    BOTTOM_PADDING;
  // Max height = 70% of screen
  const maxHeight = screenHeight * 0.7;
  const cardHeight = Math.min(contentHeight, maxHeight);

  const renderLocationItem = ({ item }: { item: LocationRecord }) => {
    const isSelected = item.id === selectedLocation?.id;
    return (
      <Pressable
        onPress={() => handleSelect(item.id)}
        style={[
          styles.locationRow,
          isSelected && { backgroundColor: colors.primaryTransparent },
        ]}
      >
        {item.image_url ? (
          <View style={[styles.logoCircle, { backgroundColor: "#FFFFFF" }]}>
            <Image
              source={{ uri: item.image_url }}
              style={styles.logoImage}
              contentFit="contain"
              cachePolicy="disk"
              recyclingKey={item.id}
            />
          </View>
        ) : (
          <View style={[styles.logoCircle, { backgroundColor: colors.surfaceVariant }]}>
            <AppIcon name="mappin" size={20} tintColor={colors.onSurfaceVariant} />
          </View>
        )}
        <View style={styles.locationInfo}>
          <Text
            style={{
              fontSize: fontSizes.base,
              fontWeight: fontWeights.medium,
              color: colors.onSurface,
            }}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {item.location_number && (
            <Text
              style={{
                fontSize: fontSizes.sm,
                fontWeight: fontWeights.regular,
                color: colors.onSurfaceVariant,
                marginTop: 2,
              }}
            >
              #{item.location_number}
            </Text>
          )}
        </View>
        {isSelected && (
          <AppIcon name="checkmark.circle.fill" size={22} tintColor={colors.primary} />
        )}
      </Pressable>
    );
  };

  return (
    <Pressable style={styles.backdrop} onPress={dismiss}>
      {/* Card — stop press propagation so tapping inside doesn't dismiss */}
      <Pressable
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.outline,
            height: cardHeight,
          },
        ]}
        onPress={() => {}}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[typography.h4, { color: colors.onSurface }]}>
            {t("location.changeLocation")}
          </Text>
          <Pressable onPress={dismiss} hitSlop={8} style={styles.closeButton}>
            <Text
              style={{
                fontSize: fontSizes.base,
                fontWeight: fontWeights.medium,
                color: colors.primary,
              }}
            >
              {t("common.close") || "Close"}
            </Text>
          </Pressable>
        </View>

        {/* Search bar — Levelset Admin only */}
        {isAdmin && (
          <View style={styles.searchWrap}>
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.outline,
                },
              ]}
            >
              <AppIcon name="magnifyingglass" size={16} tintColor={colors.onSurfaceVariant} />
              <TextInput
                style={[styles.searchInput, { color: colors.onSurface }]}
                placeholder={t("location.searchLocations") || "Search locations..."}
                placeholderTextColor={colors.onSurfaceDisabled}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                  <AppIcon name="xmark.circle.fill" size={18} tintColor={colors.onSurfaceDisabled} />
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Location list */}
        <FlatList
          data={filteredLocations}
          keyExtractor={(item) => item.id}
          renderItem={renderLocationItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    paddingHorizontal: spacing[5],
  },
  card: {
    width: "100%",
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[3],
  },
  closeButton: {
    padding: spacing[1],
  },
  searchWrap: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    height: 40,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.regular,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[4],
    gap: spacing[1],
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: 36,
    height: 36,
  },
  locationInfo: {
    flex: 1,
  },
});
