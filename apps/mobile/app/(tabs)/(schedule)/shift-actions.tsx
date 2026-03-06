/**
 * Shift Actions — formSheet modal
 * Shows actions (Get Shift Covered, Call Out) for a selected shift.
 * Presented as a native iOS form sheet matching the account modal style.
 */

import React, { useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useGlass } from "../../../src/hooks/useGlass";
import { useColors } from "../../../src/context/ThemeContext";
import { AppIcon } from "../../../src/components/ui";
import { typography, fontWeights } from "../../../src/lib/fonts";
import { spacing, borderRadius, haptics } from "../../../src/lib/theme";

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

export default function ShiftActionsModal() {
  const router = useRouter();
  const colors = useColors();
  const { GlassView } = useGlass();
  const params = useLocalSearchParams<{
    positionName: string;
    startTime: string;
    endTime: string;
  }>();

  const positionName = params.positionName ?? "Shift";
  const startTime = params.startTime ?? "";
  const endTime = params.endTime ?? "";
  const subtitle = startTime
    ? `${formatTime(startTime)} – ${formatTime(endTime)}`
    : "";

  const handleAction = useCallback((action: string) => {
    Alert.alert(
      "Coming Soon",
      `The "${action}" feature will be available soon.`
    );
  }, []);

  const closeButton = (
    <Pressable
      onPress={() => {
        haptics.light();
        router.dismiss();
      }}
      style={styles.closeHit}
    >
      {GlassView ? (
        <GlassView style={[styles.closeGlass, { borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" }]} isInteractive>
          <AppIcon name="xmark" size={12} tintColor={colors.onSurfaceVariant} />
        </GlassView>
      ) : (
        <View
          style={[
            styles.closeFallback,
            { backgroundColor: colors.surfaceVariant, borderWidth: 1, borderColor: colors.outline },
          ]}
        >
          <AppIcon name="xmark" size={12} tintColor={colors.onSurfaceVariant} />
        </View>
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[styles.title, { color: colors.onSurface }]}
          numberOfLines={1}
        >
          {positionName}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            {subtitle}
          </Text>
        ) : null}
        {closeButton}
      </View>

      {/* Actions */}
      <View style={{ gap: spacing[2], paddingHorizontal: spacing[5] }}>
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
    </View>
  );
}

function ActionRow({
  icon,
  title,
  description,
  destructive,
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  destructive?: boolean;
  onPress: () => void;
}) {
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
          backgroundColor: destructive
            ? colors.errorTransparent
            : colors.primaryTransparent,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing[4] + 4,
    paddingBottom: spacing[4],
  },
  header: {
    alignItems: "center",
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[2],
    gap: 2,
  },
  title: {
    ...typography.h4,
    fontWeight: fontWeights.semibold,
    textAlign: "center",
  },
  subtitle: {
    ...typography.bodySmall,
    textAlign: "center",
  },
  closeHit: {
    position: "absolute",
    right: spacing[5],
    top: 0,
    padding: spacing[1],
  },
  closeGlass: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderCurve: "continuous",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  closeFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
});
