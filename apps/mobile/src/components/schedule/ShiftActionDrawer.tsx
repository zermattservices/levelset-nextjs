/**
 * ShiftActionDrawer Component
 * A liquid glass bottom drawer with actions for a specific shift.
 * Uses GlassDrawer for the glass effect with fallback.
 */

import React, { useCallback } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { GlassDrawer } from "../glass/GlassDrawer";
import { AppIcon } from "../ui";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../lib/theme";

interface ShiftInfo {
  positionName: string;
  startTime: string;
  endTime: string;
}

interface ShiftActionDrawerProps {
  visible: boolean;
  onClose: () => void;
  shift: ShiftInfo | null;
}

/** Format "09:00:00" → "9:00 AM" */
function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

interface ActionRowProps {
  icon: string;
  title: string;
  description: string;
  destructive?: boolean;
  onPress: () => void;
}

function ActionRow({ icon, title, description, destructive, onPress }: ActionRowProps) {
  const colors = useColors();
  const tintColor = destructive ? colors.error : colors.primary;

  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
        backgroundColor: pressed ? colors.surfaceVariant : "transparent",
        borderRadius: borderRadius.md,
        borderCurve: "continuous",
        gap: spacing[3],
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: borderRadius.md,
          borderCurve: "continuous",
          backgroundColor: destructive ? colors.errorTransparent : colors.primaryTransparent,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AppIcon name={icon} size={20} tintColor={tintColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            ...typography.labelLarge,
            fontWeight: fontWeights.semibold,
            color: destructive ? colors.error : colors.onSurface,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            ...typography.bodySmall,
            color: colors.onSurfaceVariant,
            marginTop: 2,
          }}
        >
          {description}
        </Text>
      </View>
      <AppIcon
        name="chevron.right"
        size={14}
        tintColor={colors.onSurfaceDisabled}
      />
    </Pressable>
  );
}

export function ShiftActionDrawer({
  visible,
  onClose,
  shift,
}: ShiftActionDrawerProps) {
  const handleAction = useCallback((action: string) => {
    Alert.alert("Coming Soon", `The "${action}" feature will be available soon.`);
  }, []);

  if (!shift) return null;

  const title = `${shift.positionName} · ${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`;

  return (
    <GlassDrawer
      visible={visible}
      onClose={onClose}
      title={title}
      scrollable={false}
    >
      <View style={{ gap: spacing[1] }}>
        <ActionRow
          icon="person.2.fill"
          title="Get Shift Covered"
          description="Request another team member to cover this shift"
          onPress={() => handleAction("Get Shift Covered")}
        />
        <ActionRow
          icon="phone.arrow.up.right"
          title="Call Out"
          description="Notify your manager you can't make this shift"
          onPress={() => handleAction("Call Out")}
        />
      </View>
    </GlassDrawer>
  );
}

export default ShiftActionDrawer;
