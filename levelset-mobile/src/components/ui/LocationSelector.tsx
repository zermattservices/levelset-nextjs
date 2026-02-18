/**
 * LocationSelector
 * Dropdown for switching between accessible locations.
 * Shows current location name with a chevron; tapping opens a picker sheet.
 * Used in the Account modal and optionally on the home screen header.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  FlatList,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useLocation, type LocationRecord } from "../../context/LocationContext";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../lib/theme";
import { AppIcon } from "./AppIcon";
import { GlassCard } from "../glass";
import { GlassModal } from "../glass/GlassModal";
import "../../lib/i18n";

interface LocationSelectorProps {
  /** Compact mode shows just icon + name inline (for headers) */
  compact?: boolean;
}

export function LocationSelector({ compact = false }: LocationSelectorProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const {
    locations,
    selectedLocation,
    selectedLocationName,
    hasMultipleLocations,
    selectLocation,
  } = useLocation();

  const [pickerVisible, setPickerVisible] = useState(false);

  if (locations.length === 0) return null;

  const handleSelect = (locationId: string) => {
    haptics.selection();
    selectLocation(locationId);
    setPickerVisible(false);
  };

  const renderLocationItem = ({ item }: { item: LocationRecord }) => {
    const isSelected = item.id === selectedLocation?.id;
    return (
      <Pressable
        onPress={() => handleSelect(item.id)}
        style={[
          styles.locationItem,
          { borderBottomColor: colors.outline },
          isSelected && { backgroundColor: colors.primaryTransparent },
        ]}
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.locationImage} />
        ) : (
          <View style={[styles.locationImageFallback, { backgroundColor: colors.surfaceVariant }]}>
            <AppIcon name="mappin" size={16} tintColor={colors.onSurfaceVariant} />
          </View>
        )}
        <View style={styles.locationInfo}>
          <Text
            style={[styles.locationName, { color: colors.onSurface }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {item.location_number && (
            <Text style={[styles.locationNumber, { color: colors.onSurfaceVariant }]}>
              #{item.location_number}
            </Text>
          )}
        </View>
        {isSelected && (
          <AppIcon name="checkmark.circle.fill" size={20} tintColor={colors.primary} />
        )}
      </Pressable>
    );
  };

  // Compact: inline row for headers
  if (compact) {
    return (
      <Pressable
        onPress={() => {
          if (hasMultipleLocations) {
            haptics.light();
            setPickerVisible(true);
          }
        }}
        style={styles.compactRow}
        disabled={!hasMultipleLocations}
      >
        <AppIcon name="mappin" size={14} tintColor={colors.onSurfaceVariant} />
        <Text
          style={[styles.compactName, { color: colors.onSurfaceVariant }]}
          numberOfLines={1}
        >
          {selectedLocationName || t("home.noLocation")}
        </Text>
        {hasMultipleLocations && (
          <AppIcon name="chevron.down" size={10} tintColor={colors.onSurfaceDisabled} />
        )}

        <GlassModal
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          title={t("location.changeLocation")}
        >
          <FlatList
            data={locations}
            keyExtractor={(item) => item.id}
            renderItem={renderLocationItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </GlassModal>
      </Pressable>
    );
  }

  // Full: card row for Account modal
  return (
    <>
      <GlassCard
        onPress={
          hasMultipleLocations
            ? () => {
                haptics.light();
                setPickerVisible(true);
              }
            : undefined
        }
      >
        <View style={styles.fullRow}>
          {selectedLocation?.image_url ? (
            <Image source={{ uri: selectedLocation.image_url }} style={styles.locationImage} />
          ) : (
            <View style={[styles.locationImageFallback, { backgroundColor: colors.surfaceVariant }]}>
              <AppIcon name="mappin" size={18} tintColor={colors.onSurfaceVariant} />
            </View>
          )}
          <View style={styles.locationInfo}>
            <Text style={[styles.fullName, { color: colors.onSurface }]} numberOfLines={1}>
              {selectedLocationName || t("home.noLocation")}
            </Text>
            {hasMultipleLocations && (
              <Text style={[styles.changeText, { color: colors.primary }]}>
                {t("location.changeLocation")}
              </Text>
            )}
          </View>
          {hasMultipleLocations && (
            <AppIcon name="chevron.right" size={14} tintColor={colors.onSurfaceDisabled} />
          )}
        </View>
      </GlassCard>

      <GlassModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title={t("location.changeLocation")}
      >
        <FlatList
          data={locations}
          keyExtractor={(item) => item.id}
          renderItem={renderLocationItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </GlassModal>
    </>
  );
}

const styles = StyleSheet.create({
  // Compact mode
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  compactName: {
    ...typography.bodySmall,
    maxWidth: 180,
  },

  // Full mode
  fullRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  fullName: {
    ...typography.bodyMedium,
    fontWeight: fontWeights.semibold,
  },
  changeText: {
    ...typography.bodySmall,
    marginTop: 2,
  },

  // Location image
  locationImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderCurve: "continuous",
  },
  locationImageFallback: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },

  // Shared
  locationInfo: {
    flex: 1,
  },

  // Picker list
  listContent: {
    paddingBottom: spacing[4],
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  locationName: {
    ...typography.bodyMedium,
    fontWeight: fontWeights.medium,
  },
  locationNumber: {
    ...typography.bodySmall,
    marginTop: 1,
  },
});
