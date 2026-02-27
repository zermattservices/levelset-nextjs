/**
 * ComingSoonScreen
 * Placeholder screen for features not yet available to the user.
 * Used for team member views and unbuilt features.
 */

import React from "react";
import { View, Text } from "react-native";
import { useColors } from "../../context/ThemeContext";
import { typography } from "../../lib/fonts";
import { spacing } from "../../lib/theme";
import { AppIcon } from "../ui/AppIcon";

interface ComingSoonScreenProps {
  title?: string;
  subtitle?: string;
}

export function ComingSoonScreen({
  title = "Coming Soon",
  subtitle = "This feature is being built for you",
}: ComingSoonScreenProps) {
  const colors = useColors();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing[8],
        gap: spacing[4],
      }}
    >
      <AppIcon name="sparkles" size={64} tintColor={colors.onSurfaceDisabled} />
      <Text
        style={[
          typography.h2,
          { color: colors.onSurface, textAlign: "center" },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          typography.bodyMedium,
          { color: colors.onSurfaceVariant, textAlign: "center" },
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}

export default ComingSoonScreen;
