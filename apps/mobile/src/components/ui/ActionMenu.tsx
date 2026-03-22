/**
 * ActionMenu
 * Glass popup menu that replaces the FAB position when opened.
 * No Modal, no backdrop darkening. Menu grows from the button location
 * with the close (×) button anchored at the bottom-right where the "+" was.
 */

import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useGlass } from "../../hooks/useGlass";
import { useColors } from "../../context/ThemeContext";
import { spacing, borderRadius, haptics } from "../../lib/theme";
import { typography } from "../../lib/fonts";
import { AppIcon } from "./AppIcon";

const MENU_WIDTH = 220;

export interface ActionMenuItem {
  icon: string | React.ReactNode;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  badge?: string;
}

interface ActionMenuProps {
  visible: boolean;
  onClose: () => void;
  items: ActionMenuItem[];
}

export function ActionMenu({ visible, onClose, items }: ActionMenuProps) {
  const colors = useColors();
  const { GlassView } = useGlass();

  const scaleAnim = useSharedValue(0.5);
  const opacityAnim = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacityAnim.value = withTiming(1, { duration: 180 });
      scaleAnim.value = withSpring(1, {
        damping: 22,
        stiffness: 300,
        mass: 0.8,
      });
    } else {
      opacityAnim.value = withTiming(0, { duration: 120 });
      scaleAnim.value = withTiming(0.5, { duration: 120 });
    }
  }, [visible]);

  // Never apply opacity to a GlassView ancestor — it permanently breaks
  // the glass effect on iOS 26. Scale-only on the outer wrapper; opacity
  // is applied to the menu content children instead.
  const menuAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const contentFadeStyle = useAnimatedStyle(() => ({
    opacity: opacityAnim.value,
  }));

  if (!visible) return null;

  const menuContent = (
    <Animated.View style={[styles.menuItems, contentFadeStyle]}>
      {items.map((item, index) => (
        <Pressable
          key={index}
          onPress={() => {
            if (!item.disabled && item.onPress) {
              haptics.light();
              onClose();
              item.onPress();
            }
          }}
          disabled={item.disabled}
          style={({ pressed }) => [
            styles.menuItem,
            item.disabled && { opacity: 0.5 },
            pressed && !item.disabled && { opacity: 0.7 },
            index < items.length - 1 && {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.outline,
            },
          ]}
        >
          {!item.disabled && (
            typeof item.icon === "string" ? (
              <AppIcon
                name={item.icon}
                size={20}
                tintColor={colors.primary}
              />
            ) : (
              item.icon
            )
          )}
          <View style={styles.menuItemTextContainer}>
            <Text
              style={[
                styles.menuItemLabel,
                {
                  color: item.disabled
                    ? colors.onSurfaceDisabled
                    : colors.onSurface,
                },
              ]}
            >
              {item.label}
            </Text>
            {item.badge && (
              <Text
                style={[
                  styles.menuItemBadge,
                  { color: colors.onSurfaceDisabled },
                ]}
              >
                {item.badge}
              </Text>
            )}
          </View>
        </Pressable>
      ))}
    </Animated.View>
  );

  return (
    <Animated.View
      style={[
        styles.menuContainer,
        { width: MENU_WIDTH },
        menuAnimStyle,
      ]}
    >
      {GlassView ? (
        <GlassView
          style={{
            borderRadius: borderRadius.lg,
            borderCurve: "continuous",
            overflow: "hidden",
          }}
        >
          {menuContent}
        </GlassView>
      ) : (
        <View
          style={{
            borderRadius: borderRadius.lg,
            borderCurve: "continuous",
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.outline,
          }}
        >
          {menuContent}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  menuContainer: {
    // Scale from bottom-right corner where FAB sits
    transformOrigin: "bottom right",
  },
  menuItems: {
    paddingVertical: spacing[1],
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
    minHeight: 48,
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuItemLabel: {
    ...typography.labelLarge,
  },
  menuItemBadge: {
    ...typography.bodySmall,
    marginTop: 2,
  },
});

export default ActionMenu;
