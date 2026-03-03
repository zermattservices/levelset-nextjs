/**
 * Today's Setup — stub screen
 * Will show the full daily setup view for the location.
 */

import React from "react";
import { Text, ScrollView } from "react-native";
import { Stack } from "expo-router/stack";
import { useColors } from "../../../src/context/ThemeContext";
import { typography } from "../../../src/lib/fonts";
import { spacing } from "../../../src/lib/theme";
import { AppIcon } from "../../../src/components/ui";

export default function TodaysSetupScreen() {
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ title: "Today's Setup", headerShown: true }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: spacing[5],
          gap: spacing[3],
        }}
        style={{ backgroundColor: colors.background }}
      >
        <AppIcon
          name="rectangle.grid.1x2"
          size={44}
          tintColor={colors.onSurfaceDisabled}
        />
        <Text
          style={{
            ...typography.h4,
            color: colors.onSurfaceVariant,
          }}
        >
          Coming Soon
        </Text>
        <Text
          style={{
            ...typography.bodySmall,
            color: colors.onSurfaceDisabled,
            textAlign: "center",
          }}
        >
          Full daily setup view will be available here.
        </Text>
      </ScrollView>
    </>
  );
}
