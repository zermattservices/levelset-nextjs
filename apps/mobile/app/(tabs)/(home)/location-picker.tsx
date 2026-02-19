/**
 * Location Picker Sheet
 * Native formSheet with liquid glass background on iOS 26+.
 * Replaces the old GlassModal-based location picker.
 */

import React from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLocation, type LocationRecord } from "../../../src/context/LocationContext";
import { useColors } from "../../../src/context/ThemeContext";
import { fontWeights, fontSizes } from "../../../src/lib/fonts";
import { typography } from "../../../src/lib/fonts";
import { spacing, borderRadius, haptics } from "../../../src/lib/theme";
import { AppIcon } from "../../../src/components/ui";
import "../../../src/lib/i18n";

export default function LocationPickerSheet() {
  const { t } = useTranslation();
  const colors = useColors();
  const router = useRouter();
  const { locations, selectedLocation, selectLocation } = useLocation();

  const handleSelect = (locationId: string) => {
    haptics.selection();
    selectLocation(locationId);
    router.back();
  };

  const renderLocationItem = ({ item }: { item: LocationRecord }) => {
    const isSelected = item.id === selectedLocation?.id;
    return (
      <Pressable
        onPress={() => handleSelect(item.id)}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[3],
            paddingVertical: spacing[3],
            paddingHorizontal: spacing[3],
            borderRadius: borderRadius.md,
            borderCurve: "continuous",
          },
          isSelected && { backgroundColor: colors.primaryTransparent },
        ]}
      >
        {item.image_url ? (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              backgroundColor: "#FFFFFF",
            }}
          >
            <Image
              source={{ uri: item.image_url }}
              style={{ width: 36, height: 36 }}
              contentFit="contain"
              cachePolicy="disk"
              recyclingKey={item.id}
            />
          </View>
        ) : (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              backgroundColor: colors.surfaceVariant,
            }}
          >
            <AppIcon name="mappin" size={20} tintColor={colors.onSurfaceVariant} />
          </View>
        )}
        <View style={{ flex: 1 }}>
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
    <View style={{ flex: 1, paddingTop: spacing[4] }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing[5],
          paddingBottom: spacing[3],
        }}
      >
        <Text style={[typography.h4, { color: colors.onSurface }]}>
          {t("location.changeLocation")}
        </Text>
        <Pressable
          onPress={() => {
            haptics.light();
            router.back();
          }}
          hitSlop={8}
          style={{ padding: spacing[1] }}
        >
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

      {/* Location list */}
      <FlatList
        data={locations}
        keyExtractor={(item) => item.id}
        renderItem={renderLocationItem}
        contentContainerStyle={{
          paddingHorizontal: spacing[4],
          paddingBottom: spacing[6],
          gap: spacing[1],
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
