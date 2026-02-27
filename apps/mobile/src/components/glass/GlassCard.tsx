/**
 * GlassCard Component
 * A card component with Liquid Glass effect on iOS, fallback on other platforms
 */

import React from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useGlass } from "../../hooks/useGlass";
import { useColors } from "../../context/ThemeContext";
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
  tintColor: _tintColor, // kept for API compat, not passed to GlassView
  disabled = false,
  variant = "default",
}: GlassCardProps) {
  const colors = useColors();
  const { GlassView } = useGlass();

  const variantStyles = getVariantStyles(variant, colors);

  const handlePress = onPress
    ? () => {
        haptics.light();
        onPress();
      }
    : undefined;

  // Glass effect version (iOS with glass available)
  if (GlassView) {
    return (
      <GlassView
        style={[styles.glassContainer, variantStyles.container, style]}
        isInteractive={!!onPress}
      >
        {handlePress ? (
          <Pressable
            onPress={handlePress}
            disabled={disabled}
            style={[styles.content, contentStyle]}
          >
            {children}
          </Pressable>
        ) : (
          <View style={[styles.content, contentStyle]}>{children}</View>
        )}
      </GlassView>
    );
  }

  // Fallback version (non-iOS or glass not available)
  const fallbackContent = (
    <View style={[styles.fallbackContainer, { backgroundColor: colors.surface, borderColor: colors.outline }, variantStyles.container, style]}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );

  if (handlePress) {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled}
      >
        {fallbackContent}
      </Pressable>
    );
  }

  return fallbackContent;
}

function getVariantStyles(variant: GlassCardVariant, colors: ReturnType<typeof useColors>) {
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
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    borderWidth: 1,
  },
  content: {
    padding: spacing[4],
  },
});

export default GlassCard;
