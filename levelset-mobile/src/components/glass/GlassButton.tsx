/**
 * GlassButton Component
 * A button with Liquid Glass effect on iOS, fallback on other platforms
 */

import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  ActivityIndicator,
} from "react-native";
import { useGlass, isGlassAvailable } from "../../hooks/useGlass";
import { colors } from "../../lib/colors";
import { spacing, borderRadius, haptics } from "../../lib/theme";
import { typography, fontWeights, fontSizes } from "../../lib/fonts";

export type GlassButtonVariant = "default" | "primary" | "danger" | "outline";
export type GlassButtonSize = "default" | "compact" | "small";

interface GlassButtonProps {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  variant?: GlassButtonVariant;
  size?: GlassButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function GlassButton({
  label,
  onPress,
  icon,
  variant = "default",
  size = "default",
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}: GlassButtonProps) {
  const { GlassView } = useGlass();
  const useGlassEffect = isGlassAvailable();

  const { containerStyle, labelStyle, tintColor } = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);

  const isDisabled = disabled || loading;

  const handlePress = () => {
    switch (variant) {
      case "primary":
        haptics.medium();
        break;
      case "danger":
        haptics.warning();
        break;
      case "outline":
        haptics.light();
        break;
      default:
        haptics.light();
        break;
    }
    onPress();
  };

  const buttonContent = (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? colors.onPrimary : colors.primary}
        />
      ) : (
        <>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text
            style={[
              styles.label,
              sizeStyles.label,
              labelStyle,
              isDisabled && styles.labelDisabled,
              textStyle,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </>
  );

  // Glass effect version (iOS with glass available)
  if (useGlassEffect && GlassView && variant === "default") {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={isDisabled}
        activeOpacity={0.7}
        style={[fullWidth && styles.fullWidth]}
      >
        <GlassView
          style={[
            styles.glassContainer,
            sizeStyles.container,
            isDisabled && styles.containerDisabled,
            style,
          ]}
          glassEffectStyle="regular"
          tintColor={tintColor}
          isInteractive
        >
          <View style={styles.contentRow}>{buttonContent}</View>
        </GlassView>
      </TouchableOpacity>
    );
  }

  // Fallback version (non-iOS, glass not available, or non-default variant)
  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[fullWidth && styles.fullWidth]}
    >
      <View
        style={[
          styles.fallbackContainer,
          sizeStyles.container,
          containerStyle,
          isDisabled && styles.containerDisabled,
          style,
        ]}
      >
        <View style={styles.contentRow}>{buttonContent}</View>
      </View>
    </TouchableOpacity>
  );
}

function getVariantStyles(variant: GlassButtonVariant) {
  switch (variant) {
    case "primary":
      return {
        containerStyle: {
          backgroundColor: colors.primary,
        } as ViewStyle,
        labelStyle: {
          color: colors.onPrimary,
        } as TextStyle,
        tintColor: colors.glassTint,
      };
    case "danger":
      return {
        containerStyle: {
          backgroundColor: colors.error,
        } as ViewStyle,
        labelStyle: {
          color: colors.onPrimary,
        } as TextStyle,
        tintColor: "rgba(239, 68, 68, 0.25)",
      };
    case "outline":
      return {
        containerStyle: {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: colors.primary,
        } as ViewStyle,
        labelStyle: {
          color: colors.primary,
        } as TextStyle,
        tintColor: colors.glassTintLight,
      };
    default:
      return {
        containerStyle: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.outline,
        } as ViewStyle,
        labelStyle: {
          color: colors.onSurface,
        } as TextStyle,
        tintColor: colors.glassTintLight,
      };
  }
}

function getSizeStyles(size: GlassButtonSize) {
  switch (size) {
    case "compact":
      return {
        container: {
          paddingVertical: spacing[2],
          paddingHorizontal: spacing[4],
        } as ViewStyle,
        label: {
          fontSize: fontSizes.sm,
        } as TextStyle,
      };
    case "small":
      return {
        container: {
          paddingVertical: spacing[2] - 2,
          paddingHorizontal: spacing[3],
        } as ViewStyle,
        label: {
          fontSize: fontSizes.xs,
        } as TextStyle,
      };
    default:
      return {
        container: {
          paddingVertical: spacing[3],
          paddingHorizontal: spacing[5],
        } as ViewStyle,
        label: {
          fontSize: fontSizes.base,
        } as TextStyle,
      };
  }
}

const styles = StyleSheet.create({
  glassContainer: {
    borderRadius: borderRadius.full,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  fallbackContainer: {
    borderRadius: borderRadius.full,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
  },
  iconContainer: {},
  label: {
    fontFamily: typography.button.fontFamily,
    fontWeight: fontWeights.semibold,
    textAlign: "center",
  },
  labelDisabled: {
    opacity: 0.5,
  },
  containerDisabled: {
    opacity: 0.6,
  },
  fullWidth: {
    width: "100%",
  },
});

export default GlassButton;
