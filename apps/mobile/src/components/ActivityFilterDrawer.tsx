/**
 * ActivityFilterDrawer — Filter drawer for All Activities screen.
 * Based on PEFilterDrawer pattern: GlassDrawer with pill filters.
 */

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { GlassDrawer } from "./glass/GlassDrawer";
import { GlassButton } from "./glass/GlassButton";
import { AppIcon } from "./ui";
import { useColors } from "../context/ThemeContext";
import { typography, fontWeights } from "../lib/fonts";
import { spacing, borderRadius, haptics } from "../lib/theme";

export interface ActivityFilterState {
  direction: "all" | "incoming" | "outgoing";
  activityType: "all" | "rating" | "infraction" | "disc_action" | "evaluation";
  dateRange: "30d" | "90d" | "custom";
  customStartDate?: string;
  customEndDate?: string;
}

export const DEFAULT_ACTIVITY_FILTERS: ActivityFilterState = {
  direction: "all",
  activityType: "all",
  dateRange: "90d",
};

interface ActivityFilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  filters: ActivityFilterState;
  onApply: (filters: ActivityFilterState) => void;
  onClear: () => void;
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateISO(str: string | undefined): Date {
  if (!str) return new Date();
  const parts = str.split("-");
  if (parts.length !== 3) return new Date();
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

export function ActivityFilterDrawer({
  visible,
  onClose,
  filters,
  onApply,
  onClear,
}: ActivityFilterDrawerProps) {
  const colors = useColors();
  const [local, setLocal] = useState<ActivityFilterState>(filters);
  const [showAndroidStart, setShowAndroidStart] = useState(false);
  const [showAndroidEnd, setShowAndroidEnd] = useState(false);

  useEffect(() => {
    if (visible) setLocal(filters);
  }, [visible, filters]);

  const handleStartDateChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === "android") setShowAndroidStart(false);
      if (event.type === "set" && selectedDate) {
        setLocal((prev) => ({ ...prev, customStartDate: formatDateISO(selectedDate) }));
      }
    },
    []
  );

  const handleEndDateChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === "android") setShowAndroidEnd(false);
      if (event.type === "set" && selectedDate) {
        setLocal((prev) => ({ ...prev, customEndDate: formatDateISO(selectedDate) }));
      }
    },
    []
  );

  const Pill = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={{
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[2],
        borderRadius: 9999,
        backgroundColor: active ? colors.primary : colors.surface,
        borderWidth: active ? 0 : 1,
        borderColor: colors.outline,
      }}
    >
      <Text
        style={{
          ...typography.labelSmall,
          fontWeight: fontWeights.semibold,
          color: active ? "#FFFFFF" : colors.onSurface,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ gap: spacing[2] }}>
      <Text
        style={{
          ...typography.labelMedium,
          fontWeight: fontWeights.semibold,
          color: colors.onSurfaceVariant,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {title}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
        {children}
      </View>
    </View>
  );

  const startDate = parseDateISO(local.customStartDate);
  const endDate = parseDateISO(local.customEndDate);

  const footer = (
    <View style={{ flexDirection: "row", gap: spacing[3] }}>
      <View style={{ flex: 1 }}>
        <GlassButton variant="outline" label="Clear Filters" fullWidth onPress={onClear} />
      </View>
      <View style={{ flex: 1 }}>
        <GlassButton variant="primary" label="Done" fullWidth onPress={() => onApply(local)} />
      </View>
    </View>
  );

  return (
    <GlassDrawer visible={visible} onClose={onClose} title="Filters" footer={footer} scrollable>
      <View style={{ gap: spacing[5] }}>
        {/* Direction */}
        <Section title="Direction">
          <Pill label="All" active={local.direction === "all"} onPress={() => setLocal({ ...local, direction: "all" })} />
          <Pill label="Incoming" active={local.direction === "incoming"} onPress={() => setLocal({ ...local, direction: "incoming" })} />
          <Pill label="Outgoing" active={local.direction === "outgoing"} onPress={() => setLocal({ ...local, direction: "outgoing" })} />
        </Section>

        {/* Activity Type */}
        <Section title="Activity Type">
          <Pill label="All" active={local.activityType === "all"} onPress={() => setLocal({ ...local, activityType: "all" })} />
          <Pill label="Rating" active={local.activityType === "rating"} onPress={() => setLocal({ ...local, activityType: "rating" })} />
          <Pill label="Infraction" active={local.activityType === "infraction"} onPress={() => setLocal({ ...local, activityType: "infraction" })} />
          <Pill label="Action" active={local.activityType === "disc_action"} onPress={() => setLocal({ ...local, activityType: "disc_action" })} />
          <Pill label="Evaluation" active={local.activityType === "evaluation"} onPress={() => setLocal({ ...local, activityType: "evaluation" })} />
        </Section>

        {/* Date Range */}
        <Section title="Date Range">
          <Pill label="30 Days" active={local.dateRange === "30d"} onPress={() => setLocal({ ...local, dateRange: "30d" })} />
          <Pill label="90 Days" active={local.dateRange === "90d"} onPress={() => setLocal({ ...local, dateRange: "90d" })} />
          <Pill label="Custom" active={local.dateRange === "custom"} onPress={() => setLocal({ ...local, dateRange: "custom" })} />
        </Section>

        {local.dateRange === "custom" && (
          <View style={{ flexDirection: "row", gap: spacing[3] }}>
            {/* Start Date */}
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.labelSmall, color: colors.onSurfaceVariant, marginBottom: spacing[1] }}>
                Start Date
              </Text>
              {Platform.OS === "ios" ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: colors.outline,
                    borderRadius: borderRadius.md,
                    paddingHorizontal: spacing[3],
                    paddingVertical: 6,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing[2],
                  }}
                >
                  <AppIcon name="calendar" size={16} tintColor={colors.onSurfaceVariant} />
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="compact"
                    onChange={handleStartDateChange}
                    maximumDate={new Date()}
                    style={{ flex: 1 }}
                  />
                </View>
              ) : (
                <>
                  <Pressable
                    onPress={() => setShowAndroidStart(true)}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.outline,
                      borderRadius: borderRadius.md,
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[2],
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing[2],
                    }}
                  >
                    <AppIcon name="calendar" size={16} tintColor={colors.onSurfaceVariant} />
                    <Text style={{ ...typography.bodySmall, color: local.customStartDate ? colors.onSurface : colors.onSurfaceDisabled }}>
                      {local.customStartDate ? format(startDate, "MMM d, yyyy") : "Select date"}
                    </Text>
                  </Pressable>
                  {showAndroidStart && (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display="default"
                      onChange={handleStartDateChange}
                      maximumDate={new Date()}
                    />
                  )}
                </>
              )}
            </View>

            {/* End Date */}
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.labelSmall, color: colors.onSurfaceVariant, marginBottom: spacing[1] }}>
                End Date
              </Text>
              {Platform.OS === "ios" ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: colors.outline,
                    borderRadius: borderRadius.md,
                    paddingHorizontal: spacing[3],
                    paddingVertical: 6,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing[2],
                  }}
                >
                  <AppIcon name="calendar" size={16} tintColor={colors.onSurfaceVariant} />
                  <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="compact"
                    onChange={handleEndDateChange}
                    maximumDate={new Date()}
                    style={{ flex: 1 }}
                  />
                </View>
              ) : (
                <>
                  <Pressable
                    onPress={() => setShowAndroidEnd(true)}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.outline,
                      borderRadius: borderRadius.md,
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[2],
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing[2],
                    }}
                  >
                    <AppIcon name="calendar" size={16} tintColor={colors.onSurfaceVariant} />
                    <Text style={{ ...typography.bodySmall, color: local.customEndDate ? colors.onSurface : colors.onSurfaceDisabled }}>
                      {local.customEndDate ? format(endDate, "MMM d, yyyy") : "Select date"}
                    </Text>
                  </Pressable>
                  {showAndroidEnd && (
                    <DateTimePicker
                      value={endDate}
                      mode="date"
                      display="default"
                      onChange={handleEndDateChange}
                      maximumDate={new Date()}
                    />
                  )}
                </>
              )}
            </View>
          </View>
        )}
      </View>
    </GlassDrawer>
  );
}
