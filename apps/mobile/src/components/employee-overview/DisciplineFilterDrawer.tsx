/**
 * DisciplineFilterDrawer Component
 * Bottom drawer for filtering discipline records by type, name, and date range.
 */

import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing } from "../../lib/theme";
import { GlassDrawer, GlassButton } from "../glass";
import { haptics } from "../../lib/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DisciplineFilterState {
  type: "both" | "infraction" | "action";
  infractionName: string | null;
  actionName: string | null;
  dateRange: "7d" | "30d" | "90d" | "custom";
  customStartDate?: string;
  customEndDate?: string;
}

interface DisciplineFilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  filters: DisciplineFilterState;
  onApply: (filters: DisciplineFilterState) => void;
  onClear: () => void;
  infractionNames: string[];
  actionNames: string[];
}

export const DEFAULT_DISCIPLINE_FILTERS: DisciplineFilterState = {
  type: "both",
  infractionName: null,
  actionName: null,
  dateRange: "90d",
};

// ---------------------------------------------------------------------------
// Pill Component
// ---------------------------------------------------------------------------

function Pill({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
    >
      <View
        style={[
          {
            paddingVertical: spacing[1] + 2,
            paddingHorizontal: spacing[3],
            borderRadius: 9999,
            borderCurve: "continuous",
          },
          active
            ? { backgroundColor: colors.primary }
            : {
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.outline,
              },
        ]}
      >
        <Text
          style={{
            ...typography.labelMedium,
            fontWeight: fontWeights.medium,
            color: active ? colors.onPrimary : colors.onSurface,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Section Label
// ---------------------------------------------------------------------------

function SectionLabel({
  text,
  colors,
}: {
  text: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Text
      style={{
        ...typography.labelMedium,
        fontWeight: fontWeights.semibold,
        color: colors.onSurfaceVariant,
      }}
    >
      {text}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DisciplineFilterDrawer({
  visible,
  onClose,
  filters,
  onApply,
  onClear,
  infractionNames,
  actionNames,
}: DisciplineFilterDrawerProps) {
  const colors = useColors();
  const [local, setLocal] = useState<DisciplineFilterState>(filters);

  // Reset local state when drawer becomes visible
  useEffect(() => {
    if (visible) {
      setLocal(filters);
    }
  }, [visible]);

  const showInfractionPicker =
    local.type === "infraction" || local.type === "both";
  const showActionPicker = local.type === "action" || local.type === "both";

  return (
    <GlassDrawer
      visible={visible}
      onClose={onClose}
      title="Filters"
      footer={
        <View style={{ flexDirection: "row", gap: spacing[3] }}>
          <View style={{ flex: 1 }}>
            <GlassButton
              variant="outline"
              label="Clear Filters"
              onPress={() => {
                onClear();
                onClose();
              }}
              fullWidth
            />
          </View>
          <View style={{ flex: 1 }}>
            <GlassButton
              variant="primary"
              label="Done"
              onPress={() => {
                onApply(local);
                onClose();
              }}
              fullWidth
            />
          </View>
        </View>
      }
    >
      <View style={{ gap: spacing[5] }}>
        {/* Type selector */}
        <View style={{ gap: spacing[2] }}>
          <SectionLabel text="Type" colors={colors} />
          <View style={{ flexDirection: "row", gap: spacing[2] }}>
            {(["both", "infraction", "action"] as const).map((t) => (
              <Pill
                key={t}
                label={
                  t === "both"
                    ? "Both"
                    : t === "infraction"
                      ? "Infractions"
                      : "Actions"
                }
                active={local.type === t}
                onPress={() =>
                  setLocal((prev) => ({
                    ...prev,
                    type: t,
                    // Clear sub-type filters when switching type
                    ...(t === "action" ? { infractionName: null } : {}),
                    ...(t === "infraction" ? { actionName: null } : {}),
                  }))
                }
                colors={colors}
              />
            ))}
          </View>
        </View>

        {/* Infraction name picker */}
        {showInfractionPicker && infractionNames.length > 0 && (
          <View style={{ gap: spacing[2] }}>
            <SectionLabel text="Infraction" colors={colors} />
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}
            >
              <Pill
                label="All"
                active={local.infractionName === null}
                onPress={() =>
                  setLocal((prev) => ({ ...prev, infractionName: null }))
                }
                colors={colors}
              />
              {infractionNames.map((name) => (
                <Pill
                  key={name}
                  label={name}
                  active={local.infractionName === name}
                  onPress={() =>
                    setLocal((prev) => ({
                      ...prev,
                      infractionName: prev.infractionName === name ? null : name,
                    }))
                  }
                  colors={colors}
                />
              ))}
            </View>
          </View>
        )}

        {/* Action name picker */}
        {showActionPicker && actionNames.length > 0 && (
          <View style={{ gap: spacing[2] }}>
            <SectionLabel text="Action" colors={colors} />
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}
            >
              <Pill
                label="All"
                active={local.actionName === null}
                onPress={() =>
                  setLocal((prev) => ({ ...prev, actionName: null }))
                }
                colors={colors}
              />
              {actionNames.map((name) => (
                <Pill
                  key={name}
                  label={name}
                  active={local.actionName === name}
                  onPress={() =>
                    setLocal((prev) => ({
                      ...prev,
                      actionName: prev.actionName === name ? null : name,
                    }))
                  }
                  colors={colors}
                />
              ))}
            </View>
          </View>
        )}

        {/* Date range section */}
        <View style={{ gap: spacing[2] }}>
          <SectionLabel text="Date Range" colors={colors} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
            {(
              [
                { key: "7d", label: "Last Week" },
                { key: "30d", label: "30d" },
                { key: "90d", label: "90d" },
                { key: "custom", label: "Custom" },
              ] as const
            ).map(({ key, label }) => (
              <Pill
                key={key}
                label={label}
                active={local.dateRange === key}
                onPress={() =>
                  setLocal((prev) => ({ ...prev, dateRange: key }))
                }
                colors={colors}
              />
            ))}
          </View>

          {/* Custom date inputs */}
          {local.dateRange === "custom" && (
            <View style={{ flexDirection: "row", gap: spacing[3], marginTop: spacing[1] }}>
              <View style={{ flex: 1, gap: spacing[1] }}>
                <Text
                  style={{
                    ...typography.labelSmall,
                    color: colors.onSurfaceVariant,
                  }}
                >
                  Start
                </Text>
                <TextInput
                  value={local.customStartDate || ""}
                  onChangeText={(text) =>
                    setLocal((prev) => ({ ...prev, customStartDate: text }))
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.onSurfaceDisabled}
                  style={{
                    ...typography.bodyMedium,
                    color: colors.onSurface,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.outline,
                    borderRadius: 12,
                    borderCurve: "continuous",
                    paddingVertical: spacing[2],
                    paddingHorizontal: spacing[3],
                  }}
                />
              </View>
              <View style={{ flex: 1, gap: spacing[1] }}>
                <Text
                  style={{
                    ...typography.labelSmall,
                    color: colors.onSurfaceVariant,
                  }}
                >
                  End
                </Text>
                <TextInput
                  value={local.customEndDate || ""}
                  onChangeText={(text) =>
                    setLocal((prev) => ({ ...prev, customEndDate: text }))
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.onSurfaceDisabled}
                  style={{
                    ...typography.bodyMedium,
                    color: colors.onSurface,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.outline,
                    borderRadius: 12,
                    borderCurve: "continuous",
                    paddingVertical: spacing[2],
                    paddingHorizontal: spacing[3],
                  }}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </GlassDrawer>
  );
}

export default DisciplineFilterDrawer;
