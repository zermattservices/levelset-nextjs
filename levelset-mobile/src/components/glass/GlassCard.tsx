/**
 * GlassCard Component
 * A card component with Liquid Glass effect on iOS, fallback on other platforms
 */

import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useGlass, isGlassAvailable } from "../../hooks/useGlass";
import { colors } from "../../lib/colors";
import { spacing, borderRadius, haptics } from "../../lib/theme";

export type GlassCardVariant = "default" | "elevated" | "outlined";

interface GlassCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  tintColor?: string;
  disabled?: boolean;
  variant?: GlassCardVariant;
}

export function GlassCard({
  children,
  onPress,
  style,
  contentStyle,
  tintColor = colors.glassTintLight,
  disabled = false,
  variant = "default",
}: GlassCardProps) {
  const { GlassView } = useGlass();
  const useGlassEffect = isGlassAvailable();

  const variantStyles = getVariantStyles(variant);

  const handlePress = onPress
    ? () => {
        haptics.light();
        onPress();
      }
    : undefined;

  // Glass effect version (iOS with glass available)
  if (useGlassEffect && GlassView) {
    const glassContent = (
      <GlassView
        style={[styles.glassContainer, variantStyles.container, style]}
        glassEffectStyle="regular"
        tintColor={tintColor}
        isInteractive={!!onPress}
      >
        <View style={[styles.content, contentStyle]}>{children}</View>
      </GlassView>
    );

    if (handlePress) {
      return (
        <TouchableOpacity
          onPress={handlePress}
          disabled={disabled}
          activeOpacity={0.8}
        >
          {glassContent}
        </TouchableOpacity>
      );
    }

    return glassContent;
  }

  // Fallback version (non-iOS or glass not available)
  const fallbackContent = (
    <View style={[styles.fallbackContainer, variantStyles.container, style]}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );

  if (handlePress) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        {fallbackContent}
      </TouchableOpacity>
    );
  }

  return fallbackContent;
}

function getVariantStyles(variant: GlassCardVariant) {
  switch (variant) {
    case "elevated":
      return {
        container: {
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
        },
      };
    case "outlined":
      return {
        container: {
          borderWidth: 1,
          borderColor: colors.outline,
        },
      };
    default:
      return {
        container: {},
      };
  }
}

const styles = StyleSheet.create({
  glassContainer: {
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  fallbackContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.outline,
  },
  content: {
    padding: spacing[4],
  },
});

export default GlassCard;
