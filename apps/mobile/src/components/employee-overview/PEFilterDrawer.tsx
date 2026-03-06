/**
 * PEFilterDrawer Component
 * Bottom drawer for filtering PE ratings by position, rater, zone, and date range.
 */

import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../lib/theme";
import { GlassDrawer, GlassButton } from "../glass";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PEFilterState {
  position: string | null;
  rater: string | null;
  zone: "FOH" | "BOH" | null;
  dateRange: "30d" | "90d" | "custom";
  customStartDate?: string;
  customEndDate?: string;
}

interface PEFilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  filters: PEFilterState;
  onApply: (filters: PEFilterState) => void;
  onClear: () => void;
  positions: string[];
  raters: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PEFilterDrawer({
  visible,
  onClose,
  filters,
  onApply,
  onClear,
  positions,
  raters,
}: PEFilterDrawerProps) {
  const colors = useColors();
  const [localFilters, setLocalFilters] = useState<PEFilterState>(filters);

  // Reset local state when drawer opens
  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
    }
  }, [visible]);

  // ---------------------------------------------------------------------------
  // Pill helper
  // ---------------------------------------------------------------------------

  const renderPill = (
    label: string,
    isActive: boolean,
    onPress: () => void
  ) => (
    <Pressable
      key={label}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={{
        paddingVertical: spacing[1] + 2,
        paddingHorizontal: spacing[3],
        borderRadius: 9999,
        borderCurve: "continuous" as const,
        backgroundColor: isActive ? colors.primary : colors.surface,
        borderWidth: isActive ? 0 : 1,
        borderColor: isActive ? undefined : colors.outline,
      }}
    >
      <Text
        style={{
          ...typography.labelSmall,
          fontWeight: fontWeights.semibold,
          color: isActive ? colors.onPrimary : colors.onSurface,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );

  // ---------------------------------------------------------------------------
  // Section label helper
  // ---------------------------------------------------------------------------

  const renderSectionLabel = (label: string) => (
    <Text
      style={{
        ...typography.labelMedium,
        fontWeight: fontWeights.semibold,
        color: colors.onSurfaceVariant,
      }}
    >
      {label}
    </Text>
  );

  // ---------------------------------------------------------------------------
  // Footer
  // ---------------------------------------------------------------------------

  const footer = (
    <View style={{ flexDirection: "row", gap: spacing[3] }}>
      <View style={{ flex: 1 }}>
        <GlassButton variant="outline" label="Clear Filters" fullWidth onPress={onClear} />
      </View>
      <View style={{ flex: 1 }}>
        <GlassButton
          variant="primary"
          label="Done"
          fullWidth
          onPress={() => onApply(localFilters)}
        />
      </View>
    </View>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <GlassDrawer
      visible={visible}
      onClose={onClose}
      title="Filters"
      footer={footer}
      scrollable
    >
      <View style={{ gap: spacing[5] }}>
        {/* Position picker */}
        <View style={{ gap: spacing[2] }}>
          {renderSectionLabel("Position")}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
            {renderPill("All", localFilters.position === null, () =>
              setLocalFilters((prev) => ({ ...prev, position: null }))
            )}
            {positions.map((pos) =>
              renderPill(pos, localFilters.position === pos, () =>
                setLocalFilters((prev) => ({ ...prev, position: pos }))
              )
            )}
          </View>
        </View>

        {/* Rater picker */}
        <View style={{ gap: spacing[2] }}>
          {renderSectionLabel("Rater")}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
            {renderPill("All", localFilters.rater === null, () =>
              setLocalFilters((prev) => ({ ...prev, rater: null }))
            )}
            {raters.map((rater) =>
              renderPill(rater, localFilters.rater === rater, () =>
                setLocalFilters((prev) => ({ ...prev, rater }))
              )
            )}
          </View>
        </View>

        {/* Zone toggle */}
        <View style={{ gap: spacing[2] }}>
          {renderSectionLabel("Zone")}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
            {renderPill("All", localFilters.zone === null, () =>
              setLocalFilters((prev) => ({ ...prev, zone: null }))
            )}
            {renderPill("FOH", localFilters.zone === "FOH", () =>
              setLocalFilters((prev) => ({ ...prev, zone: "FOH" }))
            )}
            {renderPill("BOH", localFilters.zone === "BOH", () =>
              setLocalFilters((prev) => ({ ...prev, zone: "BOH" }))
            )}
          </View>
        </View>

        {/* Date range */}
        <View style={{ gap: spacing[2] }}>
          {renderSectionLabel("Date Range")}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
            {renderPill("30d", localFilters.dateRange === "30d", () =>
              setLocalFilters((prev) => ({ ...prev, dateRange: "30d" }))
            )}
            {renderPill("90d", localFilters.dateRange === "90d", () =>
              setLocalFilters((prev) => ({ ...prev, dateRange: "90d" }))
            )}
            {renderPill("Custom", localFilters.dateRange === "custom", () =>
              setLocalFilters((prev) => ({ ...prev, dateRange: "custom" }))
            )}
          </View>

          {/* Custom date inputs */}
          {localFilters.dateRange === "custom" && (
            <View style={{ flexDirection: "row", gap: spacing[3], marginTop: spacing[2] }}>
              <View style={{ flex: 1, gap: spacing[1] }}>
                <Text
                  style={{
                    ...typography.labelSmall,
                    fontWeight: fontWeights.semibold,
                    color: colors.onSurfaceVariant,
                  }}
                >
                  Start
                </Text>
                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.outline,
                    borderRadius: borderRadius.md,
                    borderCurve: "continuous" as const,
                  }}
                >
                  <TextInput
                    value={localFilters.customStartDate || ""}
                    onChangeText={(text) =>
                      setLocalFilters((prev) => ({ ...prev, customStartDate: text }))
                    }
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.onSurfaceDisabled}
                    style={{
                      ...typography.bodyMedium,
                      color: colors.onSurface,
                      paddingVertical: spacing[2],
                      paddingHorizontal: spacing[3],
                    }}
                  />
                </View>
              </View>
              <View style={{ flex: 1, gap: spacing[1] }}>
                <Text
                  style={{
                    ...typography.labelSmall,
                    fontWeight: fontWeights.semibold,
                    color: colors.onSurfaceVariant,
                  }}
                >
                  End
                </Text>
                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.outline,
                    borderRadius: borderRadius.md,
                    borderCurve: "continuous" as const,
                  }}
                >
                  <TextInput
                    value={localFilters.customEndDate || ""}
                    onChangeText={(text) =>
                      setLocalFilters((prev) => ({ ...prev, customEndDate: text }))
                    }
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.onSurfaceDisabled}
                    style={{
                      ...typography.bodyMedium,
                      color: colors.onSurface,
                      paddingVertical: spacing[2],
                      paddingHorizontal: spacing[3],
                    }}
                  />
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </GlassDrawer>
  );
}

export default PEFilterDrawer;
