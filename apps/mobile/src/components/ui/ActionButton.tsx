/**
 * ActionButton (FAB)
 * Solid Levelset-green floating action button with white "+" icon.
 * Positioned by the parent — does NOT handle its own absolute positioning.
 * The "+" rotates to "×" when the menu is open.
 */

import React, { useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useColors } from "../../context/ThemeContext";
import { haptics } from "../../lib/theme";
import { AppIcon } from "./AppIcon";

// Match the native search button diameter (iOS 26 floating tab bar)
const FAB_SIZE = 60;

interface ActionButtonProps {
  onPress: () => void;
  isMenuOpen?: boolean;
}

export function ActionButton({ onPress, isMenuOpen = false }: ActionButtonProps) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withSpring(isMenuOpen ? 45 : 0, {
      damping: 15,
      stiffness: 200,
    });
  }, [isMenuOpen]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconRotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    haptics.medium();
    onPress();
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: FAB_SIZE / 2,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1.5,
          borderColor: "rgba(255, 255, 255, 0.35)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        }}
      >
        <Animated.View style={iconRotationStyle}>
          <AppIcon name="plus" size={24} tintColor="#FFFFFF" />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export { FAB_SIZE };
export default ActionButton;
