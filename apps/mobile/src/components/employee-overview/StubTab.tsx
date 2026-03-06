/**
 * StubTab Component
 * Placeholder for tabs not yet implemented, showing "Coming Soon".
 */

import React from "react";
import { View, Text } from "react-native";
import { useColors } from "../../context/ThemeContext";
import { typography } from "../../lib/fonts";
import { spacing } from "../../lib/theme";
import { GlassCard } from "../glass";
import { AppIcon } from "../ui";

interface StubTabProps {
  icon: string;
  title: string;
}

export function StubTab({ icon, title }: StubTabProps) {
  const colors = useColors();

  return (
    <GlassCard>
      <View
        style={{
          paddingVertical: spacing[8],
          alignItems: "center",
        }}
      >
        <AppIcon name={icon} size={48} tintColor={colors.onSurfaceDisabled} />
        <Text
          style={{
            ...typography.h3,
            color: colors.onSurface,
            marginTop: spacing[3],
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            ...typography.bodyMedium,
            color: colors.onSurfaceDisabled,
            marginTop: spacing[1],
          }}
        >
          Coming Soon
        </Text>
      </View>
    </GlassCard>
  );
}

export default StubTab;
