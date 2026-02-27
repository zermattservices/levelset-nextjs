/**
 * SubmissionsFilter
 * Liquid glass filter panel that appears between the folder tabs and submissions list.
 * Allows filtering by form type, date range, employee, and submitter.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutUp,
} from "react-native-reanimated";
import { useColors } from "../../context/ThemeContext";
import { useGlass } from "../../hooks/useGlass";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../lib/theme";
import { GlassButton } from "../glass/GlassButton";
import { SubmissionsFilters } from "../../lib/api";

interface SubmissionsFilterProps {
  filters: SubmissionsFilters;
  onApply: (filters: SubmissionsFilters) => void;
  onClear: () => void;
}

const FORM_TYPE_OPTIONS = [
  { key: "", label: "All" },
  { key: "ratings", label: "Ratings" },
  { key: "infractions", label: "Infractions" },
  { key: "disc_actions", label: "Actions" },
];

export function SubmissionsFilter({
  filters,
  onApply,
  onClear,
}: SubmissionsFilterProps) {
  const colors = useColors();
  const { GlassView } = useGlass();

  const [localFilters, setLocalFilters] = useState<SubmissionsFilters>({
    ...filters,
  });

  const handleFormTypeChange = useCallback((type: string) => {
    haptics.selection();
    setLocalFilters((prev) => ({
      ...prev,
      form_type: type || undefined,
    }));
  }, []);

  const handleApply = useCallback(() => {
    haptics.light();
    onApply(localFilters);
  }, [localFilters, onApply]);

  const handleClear = useCallback(() => {
    haptics.light();
    setLocalFilters({});
    onClear();
  }, [onClear]);

  const hasAnyFilter = Object.values(localFilters).some(Boolean);

  const content = (
    <Animated.View
      entering={SlideInUp.duration(250)}
      exiting={SlideOutUp.duration(200)}
    >
      <View
        style={{
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          gap: spacing[3],
        }}
      >
        {/* Form Type Chips */}
        <View style={{ gap: spacing[2] }}>
          <Text
            style={[
              typography.labelMedium,
              { color: colors.onSurfaceVariant },
            ]}
          >
            Form Type
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing[2] }}
          >
            {FORM_TYPE_OPTIONS.map((option) => {
              const isActive =
                (option.key === "" && !localFilters.form_type) ||
                localFilters.form_type === option.key;

              return (
                <Pressable
                  key={option.key}
                  onPress={() => handleFormTypeChange(option.key)}
                  style={{
                    paddingHorizontal: spacing[4],
                    paddingVertical: spacing[2],
                    borderRadius: borderRadius.full,
                    borderCurve: "continuous",
                    backgroundColor: isActive
                      ? colors.primary
                      : colors.surfaceVariant,
                    borderWidth: 1,
                    borderColor: isActive
                      ? colors.primary
                      : colors.outline,
                  }}
                >
                  <Text
                    style={[
                      typography.labelMedium,
                      {
                        color: isActive
                          ? colors.onPrimary
                          : colors.onSurfaceVariant,
                        fontWeight: isActive
                          ? fontWeights.semibold
                          : fontWeights.regular,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Action buttons */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: spacing[3],
          }}
        >
          {hasAnyFilter && (
            <Pressable onPress={handleClear}>
              <Text
                style={[
                  typography.labelMedium,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                Clear
              </Text>
            </Pressable>
          )}
          <GlassButton
            label="Apply"
            variant="primary"
            size="compact"
            onPress={handleApply}
          />
        </View>
      </View>
    </Animated.View>
  );

  if (GlassView) {
    return (
      <GlassView
        style={{
          marginHorizontal: spacing[4],
          borderRadius: borderRadius.md,
          borderCurve: "continuous",
          overflow: "hidden",
          marginBottom: spacing[1],
        }}
      >
        {content}
      </GlassView>
    );
  }

  return (
    <View
      style={{
        marginHorizontal: spacing[4],
        borderRadius: borderRadius.md,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.outline,
        marginBottom: spacing[1],
      }}
    >
      {content}
    </View>
  );
}

export default SubmissionsFilter;
